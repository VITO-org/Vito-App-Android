# Landing de Vito

Sitio público de presentación de Vito. Es una página estática: **HTML + CSS + JS
vanilla, sin build step y sin dependencias npm**.

Se publica en **Firebase Hosting** mediante GitHub Actions, desde la rama de
larga vida `landing`. La configuración de hosting vive en `firebase.json`
(`public: "landing"`) y el deploy en `.github/workflows/deploy-landing.yml`.

## Estructura

```
landing/
├── index.html          # Página completa (una sola página con anclas)
├── styles.css          # Identidad visual y responsive
├── script.js           # Menú móvil, novedades y animaciones
├── config.js           # Fallback de releases y config del CTA
├── releases.json       # Versión actual + historial (fuente de "Novedades")
├── favicon.svg
└── assets/             # Derivados optimizados de src/assets/icons/
```

### Sobre los assets

Los PNG de `assets/` son **derivados redimensionados** de los originales en
`src/assets/icons/` (por ejemplo `VITO-Completo.png` → `vito-avatar-480.png`).
Se generaron para no servir imágenes de ~1 MB en la landing. Los originales
siguen siendo la fuente de verdad: si cambia la identidad visual, regenerá los
derivados antes de tocar el HTML.

| Derivado | Origen | Uso |
|---|---|---|
| `vito-avatar-96.png` | `VITO-Completo.png` | Nav, footer y cabecera del chat |
| `vito-avatar-480.png` | `VITO-Completo.png` | Hero |
| `vito-peek-1200.png` | `VITO-borde-inferior.png` | CTA final |
| `*-96.png` | `ic-*.png` | Iconos de signos y capacidades |

> **Vittito es Vito**: el asistente no tiene un personaje aparte. La sección
> Vittito es un mockup de conversación y usa `vito-avatar-96.png` en la cabecera
> del chat. No hay asset propio de Vittito.

## Ver la landing en local

Cualquier servidor estático sirve. Por ejemplo:

```powershell
# Desde la raíz del repo
npx --yes serve landing
# o
python -m http.server 4173 --directory landing
```

Luego abrí `http://localhost:3000` (serve) o `http://localhost:4173`.

> Abrir `index.html` con doble clic también funciona, pero el navegador bloquea
> `fetch()` sobre `file://`. En ese caso `script.js` usa el fallback de
> `config.js` y las novedades se ven igual.

## Publicar en Firebase Hosting (una sola vez)

### 1. Crear el proyecto y el sitio

1. En [console.firebase.google.com](https://console.firebase.google.com) creá el
   proyecto (o usá uno existente).
2. **Build → Hosting → Comenzar**. Se crea el sitio default
   `<project-id>.web.app`. Si la consola no lo crea, desde la CLI:

   ```powershell
   npx --yes firebase-tools login
   npx --yes firebase-tools hosting:sites:create <project-id> --project <project-id>
   ```

3. Anotá el **Project ID** (⚙️ Project settings → General). No es el nombre
   visible del proyecto.

> "Agregar app" (Apple/Android/Web) **no** crea un sitio de hosting: registra una
> app para usar los SDKs de Firebase. Para una landing estática no hace falta.

### 2. Service account para GitHub Actions

1. [console.cloud.google.com](https://console.cloud.google.com) → el mismo
   proyecto → **IAM & Admin → Service Accounts → Create service account**.
2. Nombre `github-actions-hosting`, rol **Firebase Hosting Admin**.
3. **Keys → Add key → Create new key → JSON** y descargá el archivo.

### 3. Cargar secret y variable

En **Settings → Secrets and variables → Actions**:

| Tipo | Nombre | Valor |
|---|---|---|
| Secret | `FIREBASE_SERVICE_ACCOUNT` | JSON completo de la service account |
| Variable | `FIREBASE_PROJECT_ID` | Project ID (`vito-xxxxx`) |

El Project ID no es secreto; va como variable para no hardcodearlo en el
workflow.

### 4. Primer deploy

Push a `landing`. El workflow `Deploy Landing (Firebase)` publica el contenido
de `landing/` en el canal `live` del sitio default.

> `vercel.json` y el proyecto de Vercel se mantienen como respaldo hasta
> verificar el primer deploy en Firebase. Una vez confirmado, se eliminan.

### Dominio y metadatos

El sitio queda en `https://vito-oficial.web.app` (target `landing` de
`.firebaserc`, proyecto `vito-39dda`).
Actualizá `canonical`, `og:url`, `og:image` y `twitter:image` en
`landing/index.html` con esa URL. Para un dominio propio: **Hosting → Add
custom domain** y seguí los registros DNS que indique Firebase (SSL incluido).

## Actualizar por release

La landing se actualiza **en la rama `landing`**, no en `dev`.

1. Actualizá `landing/releases.json` con la versión y las novedades.
2. Actualizá `releasesFallback` en `landing/config.js` con los mismos datos
   (es el respaldo cuando no hay servidor).
3. Commit y push a `landing`.

```powershell
git checkout landing
git pull origin landing

# editar landing/releases.json y landing/config.js

git add landing/releases.json landing/config.js
git commit -m "docs(landing): novedades de la vX.Y.Z"
git push origin landing
```

El push dispara `Deploy Landing (Firebase)` y publica en el canal `live`.

### Sincronizar con la app

Cuando una release se cierra en `dev` o en `main`, traé esos cambios a la
landing:

```powershell
git checkout landing
git merge --no-ff dev
git push origin landing
```

Si solo querés las novedades (sin arrastrar código de la app), editá
`releases.json` a mano y evitá el merge.

## Acceso anticipado (pendiente)

Hoy la landing **no ofrece descarga**: el CTA es un botón deshabilitado
("Próximamente en Play Store") y no hay enlaces al repositorio ni al APK.
Motivo: la app sigue en beta cerrada y las bases de datos son de prueba.

Cuando quieras abrir el acceso de a poco, la alternativa planificada es una
**lista de espera**. Pasos:

1. Crear un formulario (Google Forms, Tally o Formspree) que pida nombre,
   email y modelo de teléfono.
2. Agregar la URL en `config.js`:

   ```js
   waitlistUrl: 'https://forms.gle/...',
   ```

3. En `index.html`, reemplazar el botón deshabilitado por un enlace:

   ```html
   <a class="btn btn-primary" data-waitlist href="#">Quiero probarla</a>
   ```

4. En `script.js`, dentro del bloque "CTA de disponibilidad", hidratar el
   enlace:

   ```js
   if (config.waitlistUrl) {
     document.querySelectorAll('[data-waitlist]').forEach(function (link) {
       link.setAttribute('href', config.waitlistUrl);
       link.setAttribute('rel', 'noopener');
     });
   }
   ```

5. Ajustar el copy: "Muy pronto en Android" → "Acceso anticipado", y la nota
   del hero a "Beta cerrada · acceso por invitación".
6. Invitar de a uno y compartir el APK por **link privado** (release de GitHub
   marcada como *pre-release*). No volver a enlazar el APK desde la landing.

Cuando la app esté en Play Store, el último paso es reemplazar `waitlistUrl`
por `storeUrl` y apuntar el botón ahí. Si la lista de espera no se implementa,
alcanza con cambiar el botón deshabilitado por un enlace directo a la ficha
de Play Store.

## Pull requests

Un PR hacia `landing` que toque `landing/**` o `firebase.json` crea un **canal
de preview** de Firebase (expira a los 7 días) y comenta la URL en el PR. Los PR
desde forks se omiten porque no reciben secrets.

## Límites de Firebase Hosting a tener en cuenta

- **Plan Spark (gratis)**: 10 GB de storage y 360 MB/día de transferencia,
  **por proyecto** (no por sitio). Alcanza para ~12.000 visitas/mes de esta
  landing.
- Si se supera la transferencia, los sitios se deshabilitan hasta el mes
  siguiente.
- Dominios propios con SSL y hasta 36 sitios por proyecto, sin tarjeta.
- Los deploys son estáticos: no consumen build minutes.

## Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| El workflow falla en "Verificar configuración" | Falta `FIREBASE_SERVICE_ACCOUNT` o `FIREBASE_PROJECT_ID` | Cargarlos en Settings → Secrets and variables → Actions |
| El deploy publica una página 404 | `public` mal configurado en `firebase.json` | Debe ser `"landing"` |
| Firebase responde "site not found" | El sitio default no existe todavía | `firebase hosting:sites:create <project-id> --project <project-id>` |
| El workflow no se dispara | El push no tocó `landing/**` ni `firebase.json` | Verificar `paths` del workflow |
| `fetch('releases.json')` falla en local | `file://` bloquea fetch | Usar un servidor estático (ver arriba) |
