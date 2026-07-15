# Guía de Desarrollo para el Equipo (Vito Health Connect)

Esta guía explica cómo desarrollar en la aplicación y ver los cambios **en vivo en tu teléfono o emulador** sin necesidad de compilar la app localmente (es decir, **sin instalar Android Studio, Gradle, ni descargar gigabytes de SDKs**).

---

## 🛠️ Prerrequisitos en tu PC

Solo necesitás dos cosas instaladas en tu computadora:
1. **Node.js** (Versión 22.x recomendada).
2. Un editor de código (como **VS Code**).

---

## 📱 Paso 1: Descargar el APK desde GitHub Actions

Nuestra app usa módulos nativos personalizados para comunicarse con Google Health Connect, por lo que compilamos una APK de desarrollo desde la nube:

1. Entrá al repositorio del proyecto en **GitHub**.
2. Ir a la pestaña **Actions** (en la parte superior).
3. Seleccioná el workflow **"Build Android Dev Client"** a la izquierda.
4. Hacé clic en la última ejecución exitosa (marcada con un check verde ✅).
5. Desplazate hacia abajo hasta la sección **Artifacts** y descargá el archivo **`VitoHealth-DevClient`** (es un `.zip` de ~30MB).
6. Descomprimí el zip para obtener el archivo `app-debug.apk`.
7. Transferí e instalá este APK en tu teléfono Android.

> **Nota:** Android te advertirá que proviene de una fuente desconocida. Aceptá la instalación.

---

## 💻 Paso 2: Iniciar el Servidor de Desarrollo

1. Cloná este repositorio y ejecutá:
   ```bash
   npm install
   ```
2. Iniciá el servidor de desarrollo:
   ```bash
   npm start
   ```
   (Esto muestra un **código QR** en la terminal).

---

## 🔗 Paso 3: Conectar la App en Vivo

### Opción A: Por Wi-Fi (ambos en la misma red)
1. Abrí la app **Vito Health Connect** en tu celular.
2. Escaneá el código QR que muestra la terminal de tu PC.
3. ¡Listo! Los cambios en TypeScript/JS se ven al instante (Fast Refresh).

### Opción B: Por cable USB
1. Conectá el teléfono por USB con **depuración USB activada**.
2. Ejecutá:
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```
3. Abrí la app y conectá a `localhost:8081`.

---

## ⚠️ ¿Cuándo descargar un nuevo APK?

El 95% del tiempo **NO necesitás** un APK nuevo. Los cambios en pantallas, estilos, lógica, API de Supabase se ven al instante.

Solo descargá un nuevo APK si:
1. Alguien modificó archivos en `android/` (código Kotlin/Java nativo).
2. Se instaló una librería nueva con dependencias nativas.
