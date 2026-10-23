# VITO Alert Dashboard

Panel de administración de alertas para QA: genera datos de prueba que
disparan el flujo real de alertas y push de VITO Health Connect, y permite
inspeccionar el delivery log y el horario silencioso.

> ⚠️ **Uso exclusivo para QA.** No es un panel de producción: escribe datos
> de prueba en el historial de signos vitales de los usuarios de prueba y
> dispara notificaciones push reales a sus teléfonos.

## Publicación

El dashboard se publica en GitHub Pages desde la rama `test`:

| Pieza | Dónde |
|---|---|
| URL pública | `https://vito-org.github.io/Vito-App-Android/` |
| Código | `vito-alert-dashboard/` (rama `test`) |
| Deploy | `.github/workflows/deploy-panel.yml` (push a `test`) |
| Artefacto | rama `gh-pages` (`origin/gh-pages`) |

El deploy corre en cada push a `test` que toque `vito-alert-dashboard/**`
o el propio workflow.

## Acceso: el gate `panel-acceso`

La publishable key de Supabase que viaja en el bundle es una clave
**pública**: cualquiera que abra la página puede leerla. Por eso el panel
no accede a las tablas con ella.

Todo el acceso a datos pasa por la Edge Function **`panel-acceso`**:

```
navegador ──(passcode)──▶ panel-acceso ──(service_role)──▶ tablas
                              │
                              └─ valida contra el secret PANEL_PASSCODE
                                 y devuelve un token HMAC con vencimiento
```

- El **passcode** se valida contra `PANEL_PASSCODE`, un secret de Supabase:
  nunca está en el bundle.
- El **token de sesión** (HMAC-SHA256, 8 h) viaja en `sessionStorage`.
- La **allowlist de usuarios** vive en el servidor (`PANEL_USUARIOS`): el
  cliente no decide a quién puede tocar el panel.
- El **rol `anon`** no tiene acceso a datos de pacientes: el RLS aplica
  policies finas por `auth.uid()`.

Acciones disponibles: `validar_acceso`, `listar_perfiles`, `listar_alertas`,
`listar_entregas`, `insertar_dato_prueba`, `obtener_horario_silencioso`,
`upsert_horario_silencioso`, `enviar_info`.

## Ejecutar en local

```bash
cd vito-alert-dashboard
npm install
cp .env.example .env      # completar VITE_SUPABASE_ANON_KEY
npm run dev
```

La Edge Function tiene que estar deployada y con `PANEL_PASSCODE` seteado
en el proyecto, si no el panel responde que no está autorizado.

### Variables de entorno

| Variable | Para qué | ¿Va en el bundle? |
|---|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase | Sí (público) |
| `VITE_SUPABASE_ANON_KEY` | Publishable key (cliente) | Sí (público) |
| `VITE_PROFILES_TABLE` | Tabla de perfiles (`perfil_usuario`) | Sí (público) |

`VITE_*` se inlinea en el bundle al compilar: **no son secretos**. El
`.env` no se versiona (está en `.gitignore`); en CI se genera en el runner
a partir de secrets de GitHub Actions.

Secrets de GitHub Actions (repo `VITO-org/Vito-App-Android`):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PROFILES_TABLE`.

## Qué se puede hacer

- **Generar alerta de prueba**: elige usuario, tipo (hipoxia,
  taquicardia, bradicardia, hipertensión, hipotensión) y severidad. Los
  valores los elige el servidor y se insertan en `datos_reloj`; el trigger
  `trg_datos_reloj_evaluar_evento` dispara la Edge Function
  `evaluar-evento`, que genera la alerta y el push.
- **Enviar INFO**: mensaje informativo al usuario vía la Edge Function
  `enviar-info` (se reenvía desde el servidor con `service_role`).
- **Historial de alertas** con filtros por tipo, severidad y estado
  (leída / no leída).
- **Delivery log** (`notificacion_entrega`): estado, error y alerta
  asociada, con filtro por usuario y por AlertId. Distingue `enviada`,
  `recibida`, `leída`, `fallida` y `suprimida_quiet_hours`.
- **Horario silencioso** (`preferencia_notificacion`): presets 23–07, 22–06
  y 00–06, o ventana custom.
- **Deep-link esperado** por tipo de alerta, replicando
  `destinoPorTipoAlerta` de la app.

## Estructura

```
vito-alert-dashboard/
├── index.html
├── vite.config.js        # base relativa: se sirve desde la subruta de Pages
├── .env.example
├── src/
│   ├── main.jsx          # UI (pantalla de acceso, generar, historial)
│   ├── panelApi.js       # cliente del gate (token, invocación, errores)
│   ├── panelConstants.js # catálogos + destinoPorTipoAlerta
│   ├── styles.css
│   └── supabase.js       # cliente de Supabase (sólo para invocar la función)
└── package.json
```

## Notas de operación

- La lista de usuarios que puede operar el panel es una **allowlist del
  servidor** (`PANEL_USUARIOS`). Para cambiarla: editar la Edge Function o
  setear el secret.
- El deploy verifica que el bundle publicado contenga **exactamente** la
  credencial configurada en secrets, y falla si hay más de una (típico de
  una key vieja commiteada).
- Runbook de publicación, rollback y verificación:
  `.cortex/vault/runbooks/RB-panel-alertas-publicacion-y-reversion.md`
