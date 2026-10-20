---
schema_version: 1
doc_type: spec
title: Endurecer el dashboard de alertas publicado y recuperar su capacidad de QA
  (rama test)
created_at: '2026-10-19T23:11:35.728404Z'
updated_at: '2026-10-19T23:11:35.728404Z'
tags:
- spec
- panel-admin
- vito-alert-dashboard
- github-pages
- seguridad
- rls
- supabase
- alertas
- qa
- rama-test
status: draft
links: []
vault_scope: local
fingerprint: d929994718eee944c9be796825fc6bd8a1c45c9341c05971096c801f147d32bd
verification_hooks:
- name: dashboard-build
  command: npm --prefix vito-alert-dashboard install --no-audit --no-fund && npm --prefix
    vito-alert-dashboard run build && test -f vito-alert-dashboard/dist/index.html
  required: true
  success_criteria: exit code 0 y vito-alert-dashboard/dist/index.html generado
  timeout_seconds: 600
- name: env-del-dashboard-no-versionado
  command: test -z "$(git ls-files vito-alert-dashboard/.env)"
  required: true
  success_criteria: 'exit code 0: el .env con la credencial real no está versionado'
  timeout_seconds: 60
- name: dashboard-sin-credencial-hardcodeada
  command: '! grep -rnE "sb_publishable_|eyJhbGciOiJIUzI1NiIs" vito-alert-dashboard/src
    vito-alert-dashboard/index.html vito-alert-dashboard/vite.config.js'
  required: true
  success_criteria: 'exit code 0: sin coincidencias de publishable key ni JWT en el
    código fuente del dashboard'
  timeout_seconds: 60
- name: workflow-inyecta-credentials-desde-secrets
  command: grep -q "VITE_SUPABASE_ANON_KEY" .github/workflows/deploy-panel.yml &&
    grep -q "secrets\." .github/workflows/deploy-panel.yml
  required: true
  success_criteria: 'exit code 0: el workflow de Pages toma las credenciales de secrets
    de GitHub Actions'
  timeout_seconds: 60
goal: 'Cerrar la exposición de la página de administración de alertas que ya está
  publicada en GitHub Pages (vito-alert-dashboard/, rama `test`, deploy de 5227e5a)
  — credencial de Supabase versionada en el repo, RLS deshabilitado en `datos_reloj`
  y policies `anon ... USING (true)` sobre datos de pacientes — y, en la misma sesión,
  portar al dashboard publicado las capacidades de QA que tenía el `panel-admin/`
  legacy: delivery log (`notificacion_entrega`), editor de horario silencioso (`preferencia_notificacion`),
  filtros por tipo/severidad/estado y deep-link esperado. Dejar la página pública
  operable solo con acceso autorizado, con runbook de deploy y reversión, y con la
  credencial real fuera del repositorio.'
files_in_scope:
- vito-alert-dashboard/src/main.jsx
- vito-alert-dashboard/src/styles.css
- vito-alert-dashboard/src/supabase.js
- vito-alert-dashboard/index.html
- vito-alert-dashboard/package.json
- vito-alert-dashboard/vite.config.js
- vito-alert-dashboard/.env.example
- vito-alert-dashboard/.gitignore
- vito-alert-dashboard/README.md
- .github/workflows/deploy-panel.yml
- supabase/migrations/2026XXXXXX_rls_panel_alertas_dashboard.sql
- panel-admin/supabase-setup.sql
- .cortex/vault/runbooks/RB-panel-alertas-publicacion-y-reversion.md
- CHANGELOG.md
constraints:
- El trabajo ocurre sobre la rama `test`, que es la que publica el dashboard. No mezclar
  con `fix/ui-fixes-dia` ni `dev` salvo cherry-pick puntual de archivos del dashboard;
  `test` no tiene `src/utils/alertas.ts`, `EstadoGeneralCard.tsx` ni el rediseño de
  `InicioScreen.tsx`, así que el dashboard queda sobre un baseline viejo de la app
  y no debe asumir APIs que no existen en esa rama.
- 'El dashboard es tooling de QA: no se toca el motor de alertas de la app (`src/services/alerts/*`),
  ni los umbrales, ni las HUs de la app móvil. Un cambio de schema o de motor requiere
  OK explícito y spec propia.'
- Las Edge Functions de producción (`evaluar-evento`, `enviar-info`) no se modifican
  salvo bug bloqueante con OK explícito; el dashboard se limita a invocarlas.
- 'La rotación de la publishable key y todo cambio de RLS/policies se ejecutan en
  el dashboard de Supabase por el usuario: el agente no tiene acceso a ese panel.
  Cada paso manual se documenta como steps ejecutables, con el SQL o la instrucción
  exacta, y se marca como claim verificado solo con confirmación del usuario.'
- 'El `.env` con la credencial real no vuelve al árbol: el build del CI genera un
  `.env` efímero en el runner a partir de secrets. El `.gitignore` del dashboard debe
  seguir ignorando `.env` y `.env.*` salvo `.env.example`.'
- 'El `package.json` del dashboard es independiente del root React Native: las dependencias
  de Vite/React/lucide-react no se agregan al root y no se corre `npm install` del
  root como paso del build del panel.'
- 'Versionado: semver `vX.Y.Z` sin prefijos, `CHANGELOG.md` con la sección de la versión
  antes de taguear, y no borrar ni re-apuntar los tags ya publicados `v1.0.0` y `v1.1.0`
  (DEC-2026-09-11). La release v1.2.0 está en curso en otra sesión abierta: esta sesión
  no taguea ni publica release de la app.'
- 'Vocabulario canónico a usar en specs, notas y comentarios: alerta, datos_reloj,
  notificacion_entrega, preferencia_notificacion, horario silencioso (quiet-hours),
  delivery log, deep-link, perfil_usuario, publishable key. El `CONTEXT.md` del proyecto
  tiene la tabla de términos vacía: como parte de la sesión se propone completarla
  con estos términos.'
- 'El gate de acceso (CA-04) debe ser reversible y documentado: si depende de un proxy
  o servicio externo, el runbook describe cómo volver al estado abierto de forma controlada,
  para no dejar el panel inaccesible durante el QA.'
acceptance_criteria:
- '[CA-01] `git ls-files vito-alert-dashboard/.env` no devuelve nada: el archivo con
  la credencial real no está versionado en la rama `test`, y `vito-alert-dashboard/.env.example`
  documenta las tres variables con `VITE_PROFILES_TABLE=perfil_usuario` (nombre real
  de la tabla).'
- '[CA-02] `.github/workflows/deploy-panel.yml` construye con las credenciales inyectadas
  desde secrets de GitHub Actions (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_PROFILES_TABLE)
  y no depende de ningún `.env` presente en el repositorio.'
- '[CA-03] La publishable key anterior (la que estaba commiteada en `vito-alert-dashboard/.env`)
  está rotada en el proyecto de Supabase y el dashboard publica sigue operando con
  la nueva: verificado con una generación de alerta real contra un usuario de prueba
  y con la fila resultante visible en el historial.'
- '[CA-04] El panel público no sirve la aplicación ni datos a un visitante anónimo:
  sin credencial de acceso, la URL responde 401/403 o renderiza una pantalla de acceso
  previa. El mecanismo queda documentado en el README del dashboard.'
- '[CA-05] `datos_reloj` tiene RLS habilitado con una policy INSERT acotada (`WITH
  CHECK` sobre origen y usuarios permitidos) en lugar de RLS deshabilitado; el insert
  del dashboard sigue funcionando y la app móvil (rol autenticado) continúa sincronizando
  sin regresión.'
- '[CA-06] Las policies `anon ... USING (true)` sobre `alerta`, `perfil_usuario`,
  `notificacion_entrega` y `preferencia_notificacion` fueron cerradas o acotadas a
  los usuarios del panel, y el dashboard sigue mostrando lo que necesita para operar.'
- '[CA-07] La vista pública no expone nombres y apellidos completos de personas: el
  enmascarado está aplicado en la UI o el acceso a esos datos está restringido por
  el gate de CA-04.'
- '[CA-08] El dashboard publicado incluye vista de delivery log sobre `notificacion_entrega`
  con estado, `error_mensaje`, `enviado_en`, `id_alerta` y relación con la alerta
  (tipo/severidad/título), filtrable por usuario y por alertId, distinguiendo enviada,
  fallida y suprimida por horario silencioso.'
- '[CA-09] El dashboard publicado incluye el editor de horario silencioso sobre `preferencia_notificacion`
  con presets 23–07, 22–06 y 00–06 más inicio/fin custom, y el upsert se verifica
  leyendo la fila persistida para el usuario elegido.'
- '[CA-10] El historial de alertas se puede filtrar por tipo, severidad y estado,
  y el elemento de navegación "Historial" deja de ser un `div` inerte (es navegable
  o se elimina del markup, con decisión explícita documentada).'
- '[CA-11] El dashboard muestra el deep-link esperado por tipo de alerta, consistente
  con `destinoPorTipoAlerta` de `src/context/NotificationsProvider.tsx` (hipoxia →
  saturacion_oxigeno; hipertensión/hipotensión → presion_sistolica; taquicardia/bradicardia
  → frecuencia_cardiaca).'
- '[CA-12] El bundle publicado en `origin/gh-pages` (`assets/index-*.js`) no contiene
  la credencial rotada previa y la URL pública carga y opera correctamente después
  del deploy.'
- '[CA-13] El README del dashboard documenta ejecución local, variables requeridas,
  flujo de deploy (rama `test` → GitHub Pages) y la advertencia de uso exclusivo para
  QA (no es un panel de producción).'
- '[CA-14] Existe un runbook de reversión con: volver al commit anterior de `gh-pages`,
  revertir las policies de RLS y restaurar el acceso, y la lista de pasos manuales
  que el usuario debe ejecutar en el dashboard de Supabase.'
- '[CA-15] La spec queda fulfilled con cada CA marcada y su evidencia (commit, salida
  de comando o captura); las CA no verificables en el repo (rotación de key y policies)
  quedan registradas como pasos manuales ejecutados por el usuario con su OK explícito,
  no como claims verificadas.'
---

## Goal

Cerrar la exposición de la página de administración de alertas que ya está publicada en GitHub Pages (vito-alert-dashboard/, rama `test`, deploy de 5227e5a) — credencial de Supabase versionada en el repo, RLS deshabilitado en `datos_reloj` y policies `anon ... USING (true)` sobre datos de pacientes — y, en la misma sesión, portar al dashboard publicado las capacidades de QA que tenía el `panel-admin/` legacy: delivery log (`notificacion_entrega`), editor de horario silencioso (`preferencia_notificacion`), filtros por tipo/severidad/estado y deep-link esperado. Dejar la página pública operable solo con acceso autorizado, con runbook de deploy y reversión, y con la credencial real fuera del repositorio.

## Requirements

- R1 — Credenciales fuera del repositorio: dejar de versionar `vito-alert-dashboard/.env`, construir el `.env` efímero en el runner de CI a partir de secrets de GitHub Actions (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_PROFILES_TABLE), y dejar `.env.example` como plantilla documentada con `VITE_PROFILES_TABLE=perfil_usuario`. Documentar explícitamente que la publishable key queda embebida en el bundle por diseño (es una clave pública) y que la frontera real de seguridad es el par RLS + gate de acceso.
- R2 — Rotar la publishable key: la clave que estuvo commiteada en `vito-alert-dashboard/.env` (y por lo tanto en el historial de `origin/test`) se considera filtrada. La rotación en el panel de Supabase la ejecuta el usuario con OK explícito; el agente prepara el procedimiento, la verificación y el mensaje de通信 al equipo, y valida que el dashboard siga operando con la clave nueva. La limpieza del historial de git (git filter-repo / BFG) se evalúa como tarea separada porque reescribe historia compartida.
- R3 — Gate de acceso al panel público: la URL de GitHub Pages no debe quedar servida a cualquier visitante anónimo. Implementar un mecanismo reversible y documentado (token de acceso embebido + pantalla previa, o despliegue detrás de un proxy con autenticación básica / Cloudflare Access / host con auth) y su runbook de activación y reversión.
- R4 — Modelo de autorización en base de datos: re-activar RLS en `datos_reloj` y reemplazar el RLS deshabilitado por una policy de INSERT acotada con `WITH CHECK` (origen de dashboard y lista de usuarios permitidos), cerrando o acotando las policies `anon ... USING (true)` sobre `alerta`, `perfil_usuario`, `notificacion_entrega` y `preferencia_notificacion`. La migración queda versionada en `supabase/migrations/` y el cambio se ejecuta en el dashboard de Supabase por el usuario. Debe verificar que la app móvil (rol autenticado) sigue sincronizando sin regresión.
- R5 — Enmascarado de PII: la vista pública del panel no debe mostrar nombres y apellidos completos de personas del equipo. Aplicar enmascarado (iniciales o alias) o restringir ese bloque detrás del gate de acceso de R3, con decisión explícita y documentada.
- R6 — Portar el delivery log al dashboard publicado: vista de `notificacion_entrega` con estado, `error_mensaje`, `enviado_en`, `id_alerta` y la relación con la alerta (tipo, severidad, título); filtros por usuario y por alertId; y distinción visual entre enviada, fallida y suprimida por horario silencioso.
- R7 — Portar el editor de horario silencioso al dashboard publicado: lectura y escritura de `preferencia_notificacion` con upsert por `id_usuario`, presets 23–07, 22–06 y 00–06, más inicio/fin custom, con feedback de resultado.
- R8 — Filtros y navegación del historial: filtrar las alertas por tipo, severidad y estado; reemplazar el límite fijo de 12 registros por un listado paginado o acotado con indicador de总量; y resolver el elemento de navegación "Historial", hoy un `div` inerte en el markup, para que sea navegable o se elimine con decisión documentada.
- R9 — Deep-link esperado por tipo de alerta: mostrar, junto a cada alerta, el destino que la app usaría, replicando la lógica de `destinoPorTipoAlerta` de `src/context/NotificationsProvider.tsx` (hipoxia → saturacion_oxigeno; hipertensión e hipotensión → presion_sistolica; taquicardia y bradicardia → frecuencia_cardiaca), sin duplicar la tabla de umbrales en el dashboard.
- R10 — Corregir la desalineación de configuración: `.env.example` declara `VITE_PROFILES_TABLE=perfiles` mientras la tabla real del proyecto es `perfil_usuario`. Verificar qué valor usa el deploy actual, corregir la plantilla y dejar el dashboard funcionando con la tabla correcta.
- R11 — Verificación del artefacto publicado: tras cada deploy, comprobar que el bundle servido en `origin/gh-pages` no contiene la credencial previa, que carga y opera la app, y que las variables de entorno se inyectaron correctamente. Incorporar el paso de verificación de "la key vieja no está" al procedimiento de deploy documentado.
- R12 — Documentación y runbook: actualizar el README del dashboard (ejecución local, variables requeridas, flujo de deploy desde la rama `test`, advertencia de uso exclusivo para QA) y crear el runbook de publicación y reversión con los pasos manuales en Supabase, la reversión de Pages a un commit anterior y el procedimiento de desactivación del gate de acceso.
- R13 — Depuración del legacy: definir explícitamente el destino de `panel-admin/` (HTML/CSS/JS vanilla, presente en `test` y en `fix/ui-fixes-dia`) una vez que el dashboard publicado cubra su capacidad: mantenerlo como fallback local, deprecarlo con un puntero al dashboard, o eliminarlo. Actualizar `panel-admin/supabase-setup.sql` para que deje de documentar como procedimiento válido el RLS deshabilitado y las policies `anon` con `USING (true)`, sustituyéndolo por el modelo de autorización de R4.
- R14 — Trazabilidad de sesión: registrar en la nota de sesión los pasos manuales ejecutados por el usuario (rotación de key, policies) como pasos explícitos con su evidencia, distinguir claims verificados de no verificados, y proponer el ADR que documente el modelo de acceso al panel publicado (RLS + gate + publishable key) y el destino del `panel-admin/` legacy.

## Files in Scope

- `vito-alert-dashboard/src/main.jsx`
- `vito-alert-dashboard/src/styles.css`
- `vito-alert-dashboard/src/supabase.js`
- `vito-alert-dashboard/index.html`
- `vito-alert-dashboard/package.json`
- `vito-alert-dashboard/vite.config.js`
- `vito-alert-dashboard/.env.example`
- `vito-alert-dashboard/.gitignore`
- `vito-alert-dashboard/README.md`
- `.github/workflows/deploy-panel.yml`
- `supabase/migrations/2026XXXXXX_rls_panel_alertas_dashboard.sql`
- `panel-admin/supabase-setup.sql`
- `.cortex/vault/runbooks/RB-panel-alertas-publicacion-y-reversion.md`
- `CHANGELOG.md`

## Constraints

- El trabajo ocurre sobre la rama `test`, que es la que publica el dashboard. No mezclar con `fix/ui-fixes-dia` ni `dev` salvo cherry-pick puntual de archivos del dashboard; `test` no tiene `src/utils/alertas.ts`, `EstadoGeneralCard.tsx` ni el rediseño de `InicioScreen.tsx`, así que el dashboard queda sobre un baseline viejo de la app y no debe asumir APIs que no existen en esa rama.
- El dashboard es tooling de QA: no se toca el motor de alertas de la app (`src/services/alerts/*`), ni los umbrales, ni las HUs de la app móvil. Un cambio de schema o de motor requiere OK explícito y spec propia.
- Las Edge Functions de producción (`evaluar-evento`, `enviar-info`) no se modifican salvo bug bloqueante con OK explícito; el dashboard se limita a invocarlas.
- La rotación de la publishable key y todo cambio de RLS/policies se ejecutan en el dashboard de Supabase por el usuario: el agente no tiene acceso a ese panel. Cada paso manual se documenta como steps ejecutables, con el SQL o la instrucción exacta, y se marca como claim verificado solo con confirmación del usuario.
- El `.env` con la credencial real no vuelve al árbol: el build del CI genera un `.env` efímero en el runner a partir de secrets. El `.gitignore` del dashboard debe seguir ignorando `.env` y `.env.*` salvo `.env.example`.
- El `package.json` del dashboard es independiente del root React Native: las dependencias de Vite/React/lucide-react no se agregan al root y no se corre `npm install` del root como paso del build del panel.
- Versionado: semver `vX.Y.Z` sin prefijos, `CHANGELOG.md` con la sección de la versión antes de taguear, y no borrar ni re-apuntar los tags ya publicados `v1.0.0` y `v1.1.0` (DEC-2026-09-11). La release v1.2.0 está en curso en otra sesión abierta: esta sesión no taguea ni publica release de la app.
- Vocabulario canónico a usar en specs, notas y comentarios: alerta, datos_reloj, notificacion_entrega, preferencia_notificacion, horario silencioso (quiet-hours), delivery log, deep-link, perfil_usuario, publishable key. El `CONTEXT.md` del proyecto tiene la tabla de términos vacía: como parte de la sesión se propone completarla con estos términos.
- El gate de acceso (CA-04) debe ser reversible y documentado: si depende de un proxy o servicio externo, el runbook describe cómo volver al estado abierto de forma controlada, para no dejar el panel inaccesible durante el QA.

## Acceptance Criteria

- [ ] [CA-01] `git ls-files vito-alert-dashboard/.env` no devuelve nada: el archivo con la credencial real no está versionado en la rama `test`, y `vito-alert-dashboard/.env.example` documenta las tres variables con `VITE_PROFILES_TABLE=perfil_usuario` (nombre real de la tabla).
- [ ] [CA-02] `.github/workflows/deploy-panel.yml` construye con las credenciales inyectadas desde secrets de GitHub Actions (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_PROFILES_TABLE) y no depende de ningún `.env` presente en el repositorio.
- [ ] [CA-03] La publishable key anterior (la que estaba commiteada en `vito-alert-dashboard/.env`) está rotada en el proyecto de Supabase y el dashboard publica sigue operando con la nueva: verificado con una generación de alerta real contra un usuario de prueba y con la fila resultante visible en el historial.
- [ ] [CA-04] El panel público no sirve la aplicación ni datos a un visitante anónimo: sin credencial de acceso, la URL responde 401/403 o renderiza una pantalla de acceso previa. El mecanismo queda documentado en el README del dashboard.
- [ ] [CA-05] `datos_reloj` tiene RLS habilitado con una policy INSERT acotada (`WITH CHECK` sobre origen y usuarios permitidos) en lugar de RLS deshabilitado; el insert del dashboard sigue funcionando y la app móvil (rol autenticado) continúa sincronizando sin regresión.
- [ ] [CA-06] Las policies `anon ... USING (true)` sobre `alerta`, `perfil_usuario`, `notificacion_entrega` y `preferencia_notificacion` fueron cerradas o acotadas a los usuarios del panel, y el dashboard sigue mostrando lo que necesita para operar.
- [ ] [CA-07] La vista pública no expone nombres y apellidos completos de personas: el enmascarado está aplicado en la UI o el acceso a esos datos está restringido por el gate de CA-04.
- [ ] [CA-08] El dashboard publicado incluye vista de delivery log sobre `notificacion_entrega` con estado, `error_mensaje`, `enviado_en`, `id_alerta` y relación con la alerta (tipo/severidad/título), filtrable por usuario y por alertId, distinguiendo enviada, fallida y suprimida por horario silencioso.
- [ ] [CA-09] El dashboard publicado incluye el editor de horario silencioso sobre `preferencia_notificacion` con presets 23–07, 22–06 y 00–06 más inicio/fin custom, y el upsert se verifica leyendo la fila persistida para el usuario elegido.
- [ ] [CA-10] El historial de alertas se puede filtrar por tipo, severidad y estado, y el elemento de navegación "Historial" deja de ser un `div` inerte (es navegable o se elimina del markup, con decisión explícita documentada).
- [ ] [CA-11] El dashboard muestra el deep-link esperado por tipo de alerta, consistente con `destinoPorTipoAlerta` de `src/context/NotificationsProvider.tsx` (hipoxia → saturacion_oxigeno; hipertensión/hipotensión → presion_sistolica; taquicardia/bradicardia → frecuencia_cardiaca).
- [ ] [CA-12] El bundle publicado en `origin/gh-pages` (`assets/index-*.js`) no contiene la credencial rotada previa y la URL pública carga y opera correctamente después del deploy.
- [ ] [CA-13] El README del dashboard documenta ejecución local, variables requeridas, flujo de deploy (rama `test` → GitHub Pages) y la advertencia de uso exclusivo para QA (no es un panel de producción).
- [ ] [CA-14] Existe un runbook de reversión con: volver al commit anterior de `gh-pages`, revertir las policies de RLS y restaurar el acceso, y la lista de pasos manuales que el usuario debe ejecutar en el dashboard de Supabase.
- [ ] [CA-15] La spec queda fulfilled con cada CA marcada y su evidencia (commit, salida de comando o captura); las CA no verificables en el repo (rotación de key y policies) quedan registradas como pasos manuales ejecutados por el usuario con su OK explícito, no como claims verificadas.

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### dashboard-build
```bash
npm --prefix vito-alert-dashboard install --no-audit --no-fund && npm --prefix vito-alert-dashboard run build && test -f vito-alert-dashboard/dist/index.html
```

Success: exit code 0 y vito-alert-dashboard/dist/index.html generado · Timeout: 600s
### env-del-dashboard-no-versionado
```bash
test -z "$(git ls-files vito-alert-dashboard/.env)"
```

Success: exit code 0: el .env con la credencial real no está versionado · Timeout: 60s
### dashboard-sin-credencial-hardcodeada
```bash
! grep -rnE "sb_publishable_|eyJhbGciOiJIUzI1NiIs" vito-alert-dashboard/src vito-alert-dashboard/index.html vito-alert-dashboard/vite.config.js
```

Success: exit code 0: sin coincidencias de publishable key ni JWT en el código fuente del dashboard · Timeout: 60s
### workflow-inyecta-credentials-desde-secrets
```bash
grep -q "VITE_SUPABASE_ANON_KEY" .github/workflows/deploy-panel.yml && grep -q "secrets\." .github/workflows/deploy-panel.yml
```

Success: exit code 0: el workflow de Pages toma las credenciales de secrets de GitHub Actions · Timeout: 60s
