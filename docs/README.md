# Documentación de Vito

Índice de la documentación que acompaña al código de `vito-app-android`.
La raíz del repositorio queda reservada para el código y la configuración de
tooling (Metro, Gradle, EAS, Jest, ESLint, TypeScript); todo lo documental vive
acá.

## Documentos

| Documento | Qué contiene | Para quién |
|---|---|---|
| [arquitectura.md](./arquitectura.md) | Stack, arquitectura híbrida React Native + módulos nativos, flujo de datos y modelo de datos | Devs nuevos y revisores técnicos |
| [DEV-SETUP.md](./DEV-SETUP.md) | Correr la app en modo debug por WiFi (Metro, ADB, IP local) | Devs con el entorno ya configurado |
| [INSTRUCCIONES_EQUIPO.md](./INSTRUCCIONES_EQUIPO.md) | Setup sin Android Studio: APK desde GitHub Actions + Metro | Todo el equipo |
| [CONFIG-JIRA-CORTEX.md](./CONFIG-JIRA-CORTEX.md) | Crear el token de Jira y exportar las variables de entorno | Quien integre Cortex con Jira |
| [DOC-FIX-CORTEX-OPENCODE.md](./DOC-FIX-CORTEX-OPENCODE.md) | Reporte técnico del bug de Cortex en OpenCode free tier | Mantenedores de Cortex |

## Inteligencia artificial (`docs/ai/`)

Material del asistente conversacional **Vittito**.

| Archivo | Qué contiene |
|---|---|
| [vittito-system-prompt.md](./ai/vittito-system-prompt.md) | **Fuente canónica** del system prompt de Vittito |
| [ChatVito.json](./ai/ChatVito.json) | Export del workflow de n8n (`ChatVito`) |

> ⚠️ `ChatVito.json` **embebe una copia** del prompt en el nodo
> `Knowledge Base Agent`. Si cambiás el prompt, actualizá primero
> `vittito-system-prompt.md` y después regenerá el export de n8n, para que las
> dos versiones no diverjan.

## Documentos que siguen en la raíz

`README.md` (entrada del repo) y `CHANGELOG.md` (historial de releases) se
mantienen en la raíz a propósito, porque son los puntos de entrada que esperan
GitHub y el equipo.
