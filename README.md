# Vito Health Connect

App Android nativa en Kotlin para leer datos locales de Health Connect y mostrarlos en pantalla.

## Que lee

- Pasos del dia.
- Distancia del dia.
- Calorias totales quemadas del dia.
- Sesiones de sueno registradas del dia.
- Frecuencia cardiaca promedio del dia.
- Cantidad de sesiones de ejercicio del dia.

## Como funciona

Health Connect se lee localmente en el telefono con el SDK nativo:

1. La app verifica si Health Connect esta disponible.
2. Pide permisos runtime al usuario.
3. Usa `HealthConnectClient`.
4. Usa `aggregate()` para datos acumulativos como pasos, distancia y calorias.
5. Usa `readRecords()` para registros como sueno, frecuencia cardiaca y ejercicios.
6. Renderiza el resumen en la pantalla principal.

## Requisitos

- Android Studio con Android SDK instalado.
- Dispositivo Android con Health Connect disponible.
- Datos ya sincronizados en Health Connect desde una app fuente, por ejemplo Google Fit, Samsung Health, Fitbit u otra compatible.

## Ejecutar

1. Abrir esta carpeta del proyecto en Android Studio.
2. Sincronizar Gradle.
3. Ejecutar en un telefono Android real.
4. Tocar `Conectar Health Connect`.
5. Conceder los permisos solicitados.
6. Tocar `Actualizar datos`.

## Archivos principales

- `app/src/main/AndroidManifest.xml`: declara permisos de Health Connect.
- `app/src/main/java/com/vito/healthconnect/MainActivity.kt`: contiene el flujo de permisos, lectura y UI.
- `app/build.gradle.kts`: declara `androidx.health.connect:connect-client`.

## Nota para Play Store

Si se publica la app, Google Play exige declarar el uso de cada tipo de dato de Health Connect y justificar el caso de uso. En desarrollo local alcanza con los permisos del manifest y la autorizacion del usuario en el telefono.
