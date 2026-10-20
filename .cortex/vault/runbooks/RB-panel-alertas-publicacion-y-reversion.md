---
schema_version: 1
doc_type: runbook
title: Publicación y reversión del dashboard de alertas (panel QA)
created_at: '2026-10-20T00:00:00.000000Z'
updated_at: '2026-10-20T00:00:00.000000Z'
tags:
- runbook
- panel-admin
- vito-alert-dashboard
- github-pages
- seguridad
- rls
status: draft
links:
- 2026-10-19_endurecer-el-dashboard-de-alertas-publicado-y-recuperar-su-capacidad-de-qa-rama-test
vault_scope: local
---

# RB — Publicación y reversión del dashboard de alertas (panel QA)

Runbook operativo para publicar y revertir el panel QA de alertas
(`vito-alert-dashboard/`, rama `test` → GitHub Pages).

## 0. Estado al 2026-10-20 (verificado)

| Dato | Valor |
|---|---|
| URL pública | `https://vito-org.github.io/Vito-App-Android/` |
| Rama de código | `test` (HEAD `5227e5a` — "deploy a Pages con .env del repo (demo)") |
| Rama publicada | `origin/gh-pages` (`beba335`, deploy de `5227e5a`) |
| Workflow | `.github/workflows/deploy-panel.yml` (push a `test`) |
| Proyecto Supabase | `rkgbedehkfpiylaubjbo` (el mismo que usa la app) |
| Credencial en el bundle | `sb_publishable_…` inlineada por Vite |

### Exposición verificada (con la publishable key pública, 2026-10-20)

`GET /rest/v1/<tabla>?select=*` con la anon key devolvió **HTTP 200 con
filas** en las seis tablas:

| Tabla | Contenido expuesto | Impacto |
|---|---|---|
| `datos_reloj` | historial de signos vitales | Inyección de datos falsos → push críticos a pacientes |
| `alerta` | alertas clínicas (título, mensaje, usuario) | Fuga de PHI |
| `perfil_usuario` | nombre, apellido, dni, teléfono, dirección, fecha de nacimiento | Fuga de PII |
| `notificacion_entrega` | delivery log | Fuga de metadatos |
| `preferencia_notificacion` | preferencias y horario silencioso | Silenciar alertas de un paciente |
| `dispositivo_usuario` | **tokens FCM** | Desviar los push de un paciente |

Causa raíz: el panel usaba la anon key contra las tablas, el repo
versionaba la credencial y el script `panel-admin/supabase-setup.sql`
dejaba el RLS de `datos_reloj` deshabilitado con policies `anon` de
`USING (true)`.

> El **INSERT** anónimo en `datos_reloj` no se ejecutó (habría disparado
> un push real a un paciente). Es una inferencia del modelo de Postgres
> (RLS deshabilitado + `USING (true)` en las lecturas), no una prueba.

## 1. Modelo de acceso vigente

```
navegador ──(publishable key, pública)──▶ panel-acceso
                                              │  valida passcode vs secret
                                              │  token HMAC 8h
                                              ▼
                                           service_role ──▶ tablas
```

- La publishable key **no es** la frontera: es pública por diseño.
- La frontera real es el **gate** (`panel-acceso` + `PANEL_PASSCODE`) y el
  **RLS** con policies por `auth.uid()`.
- La allowlist de usuarios vive en el servidor (`PANEL_USUARIOS`).

## 2. Publicación (orden obligatorio)

Cada paso depende del anterior. Si uno falla, **no seguir**: el siguiente
deja el panel o la app sin funcionar.

### Paso 1 — Deploy de la Edge Function del gate

```bash
supabase functions deploy panel-acceso --no-verify-jwt
supabase secrets set PANEL_PASSCODE="<passcode largo y aleatorio>"
```

> `--no-verify-jwt` es necesario: el panel invoca la función con la
> publishable key (no con un JWT de usuario). La autorización la hace el
> passcode contra el secret.

Si se quiere cambiar la allowlist de usuarios:

```bash
supabase secrets set PANEL_USUARIOS="uuid1,uuid2,uuid3,uuid4"
```

### Paso 2 — Migración RLS parte 1 (segura)

```bash
supabase db push            # o pegar el archivo en el SQL Editor
# supabase/migrations/20261020000000_rls_panel_alertas_parte1_segura.sql
```

Crea las policies `*_own` por `auth.uid()` (aditivas) y **cierra la
lectura anónima de `perfil_usuario`** (PII). No rompe la app: la app
lee su perfil con el access token de sesión.

### Paso 3 — Mergear el fix de autenticación de la app y verificar

Archivos: `src/context/HealthProvider.tsx`,
`src/context/NotificationsProvider.tsx`, `src/services/supabase/api.ts`.

Verificar en un dispositivo real, con usuario de prueba:

- [ ] login y carga del perfil (nombre, intervalo de sync)
- [ ] sync de Health Connect (aparece una lectura en el dashboard)
- [ ] generación de alerta local (motor local) y su push
- [ ] marcar alerta como leída
- [ ] registrar el token FCM (push llega)
- [ ] editar horario silencioso y verificar que se persiste

### Paso 4 — Migración RLS parte 2 (lock-down)

```bash
# supabase/migrations/20261020000100_rls_panel_alertas_parte2_lockdown.sql
```

Habilita RLS en `datos_reloj` y `dispositivo_usuario` y cierra las
policies `anon` de `alerta`, `notificacion_entrega` y
`preferencia_notificacion`.

**Sólo aplicar si el paso 3 quedó en verde.** Esta migración es la que
cierra la lectura anónima de datos de pacientes.

### Paso 5 — Rotar la publishable key

En Supabase → Project Settings → API Keys → rotar la publishable key.
La key commiteada en `vito-alert-dashboard/.env` (historial de `origin/test`)
quedaConsiderada filtrada: borrarla del árbol no alcanza, hay que rotarla.

Después:

```bash
gh secret set VITE_SUPABASE_ANON_KEY --repo VITO-org/Vito-App-Android
```

### Paso 6 — Mergear a `test` y dejar que Pages despliegue

```bash
git checkout test
git merge feat/panel-alertas-endurecimiento
git push origin test
```

El workflow dispara solo. Verificar:

- [ ] el job `build-deploy` terminó en verde
- [ ] la URL pública carga y pide passcode
- [ ] el bundle servido contiene **exactamente** la credencial nueva
      (el workflow ya falla solo si hay más de una o si no coincide)

## 3. Verificación post-publicación

```bash
# 1. La anon key ya NO lee datos de pacientes (esperado: [] o 401/403)
for t in datos_reloj alerta perfil_usuario notificacion_entrega \
         preferencia_notificacion dispositivo_usuario; do
  echo "== $t"
  curl -s "$SUPABASE_URL/rest/v1/$t?select=*&limit=1" \
    -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"; echo
done

# 2. No quedan policies anon
# SELECT tablename, policyname, cmd, roles FROM pg_policies
# WHERE 'anon' = ANY(roles);

# 3. El bundle publicado tiene una sola credencial
git fetch origin gh-pages
git show origin/gh-pages:index.html          # referencia al bundle
git show origin/gh-pages:assets/index-*.js | grep -oE 'sb_publishable_[A-Za-z0-9_-]{10,}' | sort -u
```

## 4. Reversión

### 4.1 Revertir el deploy de Pages

```bash
git log --oneline origin/gh-pages | head -5      # commits publicados
git push origin <commit-anterior>:gh-pages --force
```

O, desde GitHub: Settings → Pages → "Deploy from a branch" → elegir el
commit anterior.

### 4.2 Revertir las policies (dejar el acceso anónimo como estaba)

```bash
# supabase/migrations/20261020000100_rls_panel_alertas_parte2_lockdown.sql
# tiene la sección ROLLBACK con el SQL exacto.
```

Ojo: revertir el lock-down reabre la fuga descrita en la sección 0.
 Sólo es válido para QA controlled y por el tiempo mínimo.

### 4.3 Desactivar el gate (dejar el panel sin passcode)

```bash
supabase secrets delete PANEL_PASSCODE
```

Con el secret ausente, `panel-acceso` responde 500 y el panel no opera.
Es el modo "fail closed" por defecto: preferible a dejarlo abierto.

### 4.4 Revertir el fix de autenticación de la app

`git revert` del commit correspondiente. **Ojo**: sin el fix, la parte 2
deja de ser aplicable (la app volvería a operar con la anon key y el RLS
la bloquearía).

## 5. Pendientes conocidos

- **Historial de git**: la publishable key vieja sigue en el historial de
  `origin/test` (`git log --all -- vito-alert-dashboard/.env`). La
  rotación (paso 5) la neutraliza; el scrub del historial (`git
  filter-repo` / BFG) reescribe historia compartida y quedó fuera de
  esta sesión.
- **Lockfile del dashboard**: `vito-alert-dashboard/package-lock.json` no
  está versionado, así que el build de CI no es reproducible
  (`npm install` en vez de `npm ci`).
- **Tabla `perfiles`**: el `.env` desplegado apuntaba a `perfiles`, que
  no existe (la real es `perfil_usuario`). Corregido en `.env.example`
  y en el secret de Actions.
- **`enviar-info`**: la Edge Function que el panel usa para los mensajes
  INFO no está versionada en el repo (sólo `evaluar-evento` lo está).
  Conviene versionarla.
- **Rate limit del gate**: el bloqueo por intentos fallidos es best-effort
  (en memoria de la instancia). Para un panel abierto a internet conviene
  un límite en el borde (Cloudflare Access / WAF).
