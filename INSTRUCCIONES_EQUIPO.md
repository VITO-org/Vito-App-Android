# Guía de Desarrollo para el Equipo (Vito Health Connect)

Esta guía explica cómo desarrollar en la aplicación y ver los cambios **en vivo en tu teléfono o emulador** sin necesidad de compilar la app localmente (es decir, **sin instalar Android Studio, Gradle, ni descargar gigabytes de SDKs**).

---

## 🛠️ Prerrequisitos en tu PC

Solo necesitás dos cosas instaladas en tu computadora:
1. **Node.js** (Versión 22.x recomendada).
2. Un editor de código (como **VS Code**).

---

## 📱 Paso 1: Instalar la App de Desarrollo (Dev Client) en tu celular

Dado que nuestra app usa módulos nativos personalizados para comunicarse con Google Health Connect, no podemos usar la app genérica "Expo Go" de la Play Store. En su lugar, usamos una versión personalizada compilada en la nube:

1. Entrá al repositorio del proyecto en **GitHub**.
2. Ir a la pestaña **Actions** (en la parte superior).
3. Seleccioná el workflow **"Build Android Dev Client"** a la izquierda.
4. Hacé clic en la última ejecución exitosa del workflow (marcada con un check verde ✅).
5. Desplazate hacia abajo hasta la sección **Artifacts** y descargá el archivo **`VitoHealth-DevClient`** (es un archivo `.zip` que pesa aprox. 30MB).
6. Descomprimí el zip para obtener el archivo `app-debug.apk`.
7. Transferí e instalá este APK en tu teléfono Android (o arrastralo dentro de tu emulador de Android si desarrollás en PC).

> **Nota:** Al ser una app de desarrollo propia, Android te advertirá que proviene de una fuente desconocida. Aceptá la instalación para continuar.

---

## 💻 Paso 2: Iniciar el Servidor de Desarrollo en tu PC

1. Cloná este repositorio en tu PC.
2. Abrí la terminal en la carpeta del proyecto y ejecutá:
   ```bash
   npm install
   ```
3. Iniciá el servidor de desarrollo de Metro ejecutando:
   ```bash
   npm start
   ```
   *(Esto levantará el servidor y mostrará un **código QR** en tu terminal).*

---

## 🔗 Paso 3: Conectar la App y Ver Cambios en Vivo

### Opción A: Por Wi-Fi (Ambos dispositivos en la misma red)
1. Asegurate de que tu PC y tu teléfono Android estén conectados a la **misma red Wi-Fi**.
2. Abrí la aplicación **Vito Health Connect** recién instalada en tu celular.
3. Tocá la opción para **escanear el código QR** y escaneá el código QR que se muestra en la terminal de tu PC.
4. La app comenzará a descargar el "bundle" de desarrollo y se abrirá.
5. ¡Listo! Cualquier cambio que guardes en los archivos TypeScript/JavaScript de tu PC se verá reflejado inmediatamente en tu celular (Fast Refresh).

### Opción B: Por Cable USB (Si el Wi-Fi tiene restricciones o no conecta)
1. Conectá el teléfono a tu PC mediante cable USB con la **depuración USB activada** (en Opciones de Desarrollador del teléfono).
2. En la terminal de tu PC, ejecutá:
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```
3. Iniciá el servidor con `npm start`.
4. Abrí la app en el teléfono. En el menú de desarrollo de Expo (que aparece al agitar el teléfono o desde la pantalla inicial), seleccioná conectar a `localhost:8081`.

---

## ⚠️ ¿Cuándo es necesario descargar una nueva APK?

**El 95% del tiempo NO vas a necesitar descargar una nueva APK.** Podés programar pantallas, estilos, llamadas a la API de Supabase, lógica de negocio y ver los cambios instantáneamente.

Solo vas a necesitar descargar un nuevo APK desde GitHub Actions si:
1. Alguien modifica archivos dentro de la carpeta `android/` (código Kotlin/Java nativo).
2. Se instala una librería nueva en el `package.json` que contiene dependencias nativas (como un nuevo plugin de hardware o sensores).
