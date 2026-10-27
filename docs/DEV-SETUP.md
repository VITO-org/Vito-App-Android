# 🛠️ Guía: Correr VITO en modo debug (WiFi)

> Setup ya realizado en esta PC. Seguir estos pasos cada vez que quieras desarrollar en vivo.

---

## ✅ Requisitos previos (ya configurados)

| Qué | Dónde |
|-----|-------|
| `adb` | `C:\Android\Sdk\platform-tools\adb.exe` |
| Node.js | v24+ (en PATH) |
| Metro bundler IP hardcodeada | `android/app/src/debug/res/values/strings.xml` |
| PC en red local | IP: `192.168.0.83` |
| Teléfono ya emparejado | Xiaomi 24090RA29G |

---

## 📋 Pasos cada vez que quieras desarrollar

### 1. Estar en la rama correcta

```powershell
cd C:\Vito-App-Android
git checkout dev
```

---

### 2. Conectar el teléfono por WiFi

En el teléfono:
- Ajustes → Opciones de desarrollador → **Depuración inalámbrica** → activar
- Anotar el **puerto** que aparece en la pantalla principal (cambia cada vez que lo activás)

En la PC:
```powershell
C:\Android\Sdk\platform-tools\adb.exe connect 192.168.0.67:<PUERTO>
```

> ⚠️ El puerto cambia cada vez que activás la Depuración inalámbrica.  
> Ejemplo: `adb connect 192.168.0.67:33945`

Verificar que se conectó:
```powershell
C:\Android\Sdk\platform-tools\adb.exe devices
```
Deberías ver algo como:
```
192.168.0.67:33945     device
```

---

### 3. Iniciar el Metro Bundler

Abrir una terminal nueva y dejarla corriendo **todo el tiempo que estés desarrollando**:

```powershell
cd C:\Vito-App-Android
node node_modules/@react-native-community/cli/build/bin.js start
```

Esperar hasta ver el logo de Metro y el mensaje `http://localhost:8081`.

---

### 4. Abrir la app en el teléfono

Abrir la app VITO manualmente desde el teléfono tocando el ícono.

La app se conecta automáticamente al Metro Bundler en `192.168.0.83:8081` gracias a la configuración en `android/app/src/debug/res/values/strings.xml`.

---

### 5. ¡Listo! Desarrollo en vivo 🚀

Cualquier cambio que guardes en VS Code se refleja automáticamente en el teléfono (Fast Refresh).

---

## 🔧 Solución de problemas

### ❌ "Unable to load script" (pantalla roja)

El teléfono no puede conectarse a Metro. Verificar:

1. ¿Metro está corriendo? (ver paso 3)
2. ¿El teléfono y la PC están en la misma red WiFi?
3. Correr este comando y abrir la app de nuevo:
```powershell
C:\Android\Sdk\platform-tools\adb.exe connect 192.168.0.67:<PUERTO>
```

### ❌ "Fast Refresh disconnected" (banner azul)

```powershell
C:\Android\Sdk\platform-tools\adb.exe -s 192.168.0.67:<PUERTO> reverse tcp:8081 tcp:8081
```
Luego sacudir el teléfono → **Reload**.

### ❌ El dispositivo no aparece en `adb devices`

El puerto de depuración inalámbrica cambió. Ir al teléfono:
- Ajustes → Opciones de desarrollador → Depuración inalámbrica
- Ver el nuevo puerto y reconectar con `adb connect 192.168.0.67:<NUEVO_PUERTO>`

### ❌ Si el emparejamiento venció (nuevo dispositivo / nueva PC)

En el teléfono:
- Ajustes → Opciones de desarrollador → Depuración inalámbrica
- Tocar **"Vincular dispositivo con código de vinculación"**
- Anotar la IP:puerto de vinculación y el código de 6 dígitos

En la PC:
```powershell
C:\Android\Sdk\platform-tools\adb.exe pair 192.168.0.67:<PUERTO_VINCULACION> <CODIGO>
```
Luego conectar normalmente con el paso 2.

---

## 📁 Archivos clave

| Archivo | Para qué sirve |
|---------|---------------|
| `android/app/src/debug/res/values/strings.xml` | IP del Metro Bundler hardcodeada |
| `node_modules/@react-native-community/cli/build/bin.js` | Metro Bundler |
| `C:\Android\Sdk\platform-tools\adb.exe` | Herramienta de conexión Android |
