# vito-app-android

Health Dashboard

Aplicacion Android nativa pensada para celulares que lee datos de `Health Connect` y muestra un dashboard simple con:

- pasos del dia
- distancia recorrida
- calorias activas

## Stack

- Kotlin
- Jetpack Compose
- Material 3
- Health Connect SDK

## Estructura principal

- `app/src/main/java/com/example/healthdashboard/MainActivity.kt`: punto de entrada y solicitud de permisos.
- `app/src/main/java/com/example/healthdashboard/health/HealthConnectManager.kt`: disponibilidad del SDK y permisos.
- `app/src/main/java/com/example/healthdashboard/data/HealthDashboardRepository.kt`: lectura agregada de datos diarios.
- `app/src/main/java/com/example/healthdashboard/ui/HealthDashboardApp.kt`: dashboard y estados de UI.

## Como abrirlo

1. Abre esta carpeta en Android Studio.
2. Deja que Gradle sincronice dependencias.
3. Si el IDE lo pide, genera el Gradle Wrapper desde Android Studio o con `gradle wrapper`.
4. Ejecuta la app en un dispositivo Android 9+.

## Requisitos del dispositivo

- Android 9 o superior para usar Health Connect.
- En Android 13 o inferior, el usuario debe tener instalada la app `Health Connect`.
- En Android 14 o superior, Health Connect ya viene integrado en el sistema.

## Flujo actual

1. La app valida si `Health Connect` esta disponible.
2. Si hace falta, ofrece instalar o actualizar el proveedor.
3. Solicita permisos de lectura para pasos, distancia y calorias activas.
4. Lee los datos agregados del dia y los presenta en tarjetas.

## Siguientes mejoras recomendadas

- agregar rangos de tiempo: semana, mes, personalizado
- sumar mas metricas: frecuencia cardiaca, sueno, entrenamientos
- guardar preferencias locales
- agregar graficos
- conectar autenticacion y backend si quieres historico en la nube
