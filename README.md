# Vito

> Aplicación móvil de salud que convierte los datos de **Google Health Connect** en
> seguimiento claro, alertas útiles y acompañamiento diario.

Vito acompaña a personas que quieren entender qué pasa con su cuerpo sin depender de
una consulta para cada dato. La app lee las métricas que el teléfono ya registra
—pasos, sueño, pulso, oxigenación, presión, temperatura— las ordena en un panel
comprensible, detecta tendencias y avisa cuando algo se sale de rango. Un asistente
conversacional, **Vittito**, explica esos números en lenguaje cotidiano y deriva a un
profesional cuando corresponde.

Nació como la app nativa original (Kotlin + Health Connect) y hoy es una app
**React Native + TypeScript** con backend **Supabase**, que conserva la integración
nativa con Health Connect a través de un módulo propio.

---

## ¿Qué problema resuelve?

Los datos de salud están fragmentados: el reloj mide, el teléfono acumula y el usuario
no ve nada. Vito toma esa información, la normaliza a unidades canónicas y la presenta
en un solo lugar, con contexto y sin jerga clínica.

- **Para el usuario:** entender su día, su semana y sus tendencias, y saber cuándo
  consultar.
- **Para el equipo de salud:** historial ordenado, alertas y contactos de confianza.
- **Para el proyecto:** una base extensible para sumar IA predictiva y nuevos
  dispositivos (Wear OS, básculas, tensiómetros).

## ¿Qué se puede hacer hoy?

| Capacidad | Qué incluye |
|---|---|
| **Panel del día** | Resumen de los signos vitales registrados hoy, con estado general y accesos rápidos |
| **Todos los signos** | Vista completa de cada signo con su última medición y tendencia |
| **Detalle y gráficos** | Serie temporal por signo, con rangos y tooltip al tocar un punto |
| **Historial** | Consulta de mediciones anteriores por fecha |
| **Alertas** | Detección de valores fuera de rango y aviso al usuario |
| **Síntomas** | Registro de síntomas para contextualizar las mediciones |
| **Contactos de confianza** | Personas a notificar ante una alerta relevante |
| **Vittito** | Asistente conversacional que explica los datos y da recomendaciones generales |
| **Perfil y configuración** | Datos personales, perfil clínico y preferencias |
| **Panel de administración** | Consola web para operación y soporte (`panel-admin/`) |

> Vito **no diagnostica ni receta**. Describe tendencias, explica alertas y siempre
> deriva a un profesional de la salud.

## Cómo funciona

**En el teléfono.** Un módulo nativo en Kotlin lee Health Connect y devuelve un resumen
tipado al JavaScript. Ese resumen entra a un `React Context`, se cachea y alimenta las
pantallas. La app convive con la versión nativa original porque usa un `applicationId`
distinto (`com.vito.healthconnect.rn` frente a `com.vito.healthconnect`).

**En el backend.** Supabase concentra autenticación, base de datos y reglas de acceso
(RLS). Un trigger evalúa cada medición que llega a `datos_reloj` y dispara la función
`evaluar-evento`, que decide si corresponde generar una alerta. Las notificaciones
salen por Edge Functions (`enviar-whatsapp`).

**En la capa de IA.** Un motor de reglas calcula umbrales personalizados a partir del
baseline de cada usuario; encima, Vittito interpreta el contexto conversacional. El
prompt canónico del asistente vive en [`docs/ai/vittito-system-prompt.md`](docs/ai/vittito-system-prompt.md)
y se despliega como workflow de n8n (`ChatVito`).

## Signos vitales y métricas

| Métrica leída de Health Connect | Origen | Unidad mostrada |
|---|---|---|
| Pasos | `StepsRecord.COUNT_TOTAL` | pasos |
| Distancia | `DistanceRecord.DISTANCE_TOTAL` | km |
| Calorías | `TotalCaloriesBurnedRecord.ENERGY_TOTAL` | kcal |
| Sueño | `SleepSessionRecord` | h y min |
| Pulso medio | `HeartRateRecord.samples` | lpm |
| Ejercicios | `ExerciseSessionRecord` | sesiones |

Unidades canónicas del dominio: frecuencia cardíaca en **lpm**, presión arterial en
**mmHg**, saturación de oxígeno en **%** y temperatura en **°C**. Todas las mediciones
se guardan en UTC (`TIMESTAMPTZ` + `toISOString()`), así que el historial no se rompe
al cambiar de zona horaria.

## Stack

| Capa | Tecnología |
|---|---|
| App | React Native 0.85 · React 19 · TypeScript 5.8 (strict) |
| Navegación | React Navigation v7 (tabs + stack) |
| Integración nativa | Kotlin 1.9 · Health Connect SDK · módulo RN propio |
| Backend | Supabase (Postgres, Auth, RLS, Edge Functions) |
| Gráficos | `react-native-gifted-charts` + SVG |
| IA | Motor de reglas propio + Vittito (n8n + LLM) |
| Build | Gradle 9.3 · AGP 8.13 · Android SDK 35 |
| Panel web | HTML/CSS/JS sobre la API de Supabase |

## Empezar a desarrollar

Requisitos: **Node ≥ 22.11**, **JDK 17**, **Android SDK 35** y un teléfono o emulador
con Android 14+.

```powershell
npm install
npx react-native start          # Metro, en una terminal
npx react-native run-android    # build + install, en otra
```

Al abrir la app, tocá **Conectar Health Connect** y habilitá los permisos de lectura.
Si ya tenés el entorno armado y solo querés levantarlo por WiFi, seguí
[`docs/DEV-SETUP.md`](docs/DEV-SETUP.md). Si es tu primera vez y preferís no instalar
Android Studio, usá [`docs/INSTRUCCIONES_EQUIPO.md`](docs/INSTRUCCIONES_EQUIPO.md)
(APK de desarrollo desde GitHub Actions).

## Mapa del repositorio

- `src/` — pantallas, componentes, contexto de salud, servicios de Supabase, alertas y gráficos.
- `android/` — proyecto Android y el módulo nativo de Health Connect (Kotlin).
- `supabase/` — migraciones, políticas y Edge Functions (`evaluar-evento`, `enviar-whatsapp`).
- `panel-admin/` — consola web de administración.
- `ml-trainer/` — experimentos y entrenamiento de modelos.
- `scripts/` — automatizaciones de release, Jira y notificaciones.
- `docs/` — toda la documentación del proyecto (índice en [`docs/README.md`](docs/README.md)).
- `.cortex/` — vault de conocimiento: historias de usuario, specs, ADRs y notas de sesión.

## Documentación

Todo lo documental vive en [`docs/`](docs/README.md). Los puntos de entrada más útiles:

| Si buscás… | Andá a |
|---|---|
| Cómo está construida la app | [`docs/arquitectura.md`](docs/arquitectura.md) |
| Levantar el entorno en debug | [`docs/DEV-SETUP.md`](docs/DEV-SETUP.md) |
| Setup sin Android Studio | [`docs/INSTRUCCIONES_EQUIPO.md`](docs/INSTRUCCIONES_EQUIPO.md) |
| Conectar Cortex con Jira | [`docs/CONFIG-JIRA-CORTEX.md`](docs/CONFIG-JIRA-CORTEX.md) |
| Prompt y workflow de Vittito | [`docs/ai/`](docs/ai/) |

## Estado del proyecto

Versión actual **1.2.2**. El historial de cambios está en [`CHANGELOG.md`](CHANGELOG.md).

- ✅ Monitoreo de 6 métricas vía Health Connect y panel del día
- ✅ Historial, gráficos por signo y alertas
- ✅ Autenticación, perfil clínico y contactos de confianza
- ✅ Asistente Vittito y motor de reglas con baseline personal
- 🚧 IA predictiva, Wear OS y nuevas fuentes de datos

Las historias de usuario, con sus criterios de aceptación, viven en el vault:
[`.cortex/vault/hu/`](.cortex/vault/hu/). Las specs técnicas y las decisiones de
arquitectura están en [`.cortex/vault/specs/`](.cortex/vault/specs/).

## Equipo

| Persona | Rol |
|---|---|
| Flor Gonzalez | Mobile / frontend |
| Emma | Mobile / backend |
| Cristian | Mobile / integraciones |
| Flor Galarza | Mobile / datos |
| Nico | Mobile / QA |

## Recursos

- [React Native 0.85](https://reactnative.dev/docs/0.85/getting-started)
- [Health Connect](https://developer.android.com/health-connect)
- [Permisos de Health Connect](https://developer.android.com/health-connect/design/health-connect-permissions)
- [Native Modules (New Architecture)](https://reactnative.dev/docs/the-new-architecture/pillars-turbomodules)
- [Supabase](https://supabase.com/docs)
