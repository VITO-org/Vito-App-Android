# Landing de Vito

Sitio público de presentación de Vito. Es una página estática: **HTML + CSS + JS
vanilla, sin build step y sin dependencias npm**.

Se publica en **Vercel** mediante GitHub Actions, desde la rama de larga vida
`landing`. La rama a deployar está declarada en
`.github/workflows/deploy-landing.yml`, así que no depende del selector de ramas
del dashboard.

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

## Publicar en Vercel (una sola vez)

### 1. Crear y pushear la rama

Vercel **no puede seleccionar una rama que no existe en el remoto**. Este es el
motivo más común del problema "no puedo elegir la rama que quiero deployar".

```powershell
git checkout -b landing
git push -u origin landing
```

### 2. Verificar el acceso de la GitHub App

En GitHub: **Settings → Applications → Vercel → Repository Access**.
El repositorio `VITO-org/Vito-App-Android` tiene que estar en la lista. Si no
está, Vercel no ve ni las ramas ni los commits.

### 3. Crear el proyecto en Vercel

1. **Add New → Project → Import Git Repository** y elegí el repo.
2. Configuración del proyecto:
   - **Root Directory**: raíz del repositorio (dejar vacío / `./`).
   - **Framework Preset**: `Other`.
   - **Build Command**: vacío.
   - **Output Directory**: `landing`.
   - **Install Command**: vacío.
3. Deploy inicial (puede hacerse desde el dashboard; el workflow lo reemplaza
   después).

> ¿Por qué la raíz y no `landing/`? Porque `vercel.json` vive en la raíz y
> declara `outputDirectory: "landing"`. Si se configura `landing/` como Root
> Directory, Vercel ignora ese `vercel.json` y busca otro dentro de la carpeta.

### 4. Obtener los IDs del proyecto

```powershell
npx vercel link
```

Eso crea `.vercel/project.json` (ignorado por git) con `orgId` y `projectId`.
También están en **Project Settings → General**.

### 5. Cargar los secrets en GitHub

En **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Dónde se obtiene |
|---|---|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens → Create |
| `VERCEL_ORG_ID` | `orgId` de `.vercel/project.json` o Team Settings |
| `VERCEL_PROJECT_ID` | `projectId` de `.vercel/project.json` |

Nunca commitees estos valores.

### 6. (Opcional) Production Branch en el dashboard
El workflow ya fuerza `--prod` cuando la rama es `landing`, pero para que el
dashboard muestre el entorno correcto:

**Settings → Environments → Production → Branch Tracking** → `landing`.

Si el desplegable no muestra la rama, es porque el paso 1 no se hizo o la
GitHub App no tiene acceso al repo.

### 7. Dominio y metadatos

El HTML asume `https://vito-landing.vercel.app/` en `<link rel="canonical">`,
`og:url`, `og:image` y `twitter:image`. Cuando definas el dominio real (o el
nombre del proyecto en Vercel), actualizá esas cuatro URLs en
`landing/index.html`. Un canonical incorrecto perjudica el SEO.

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

El push dispara `Deploy Landing (Vercel)` y publica en producción.

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

Un PR hacia `landing` que toque `landing/**` o `vercel.json` genera un
**Preview Deployment** y comenta la URL en el PR. Los PR desde forks se omiten
porque no reciben secrets.

## Límites de Vercel a tener en cuenta

- **Hobby**: 200 proyectos, 100 deployments por día, **1 deployment
  concurrente**. Los builds en exceso se encolan, no fallan.
- Un sitio estático sin framework **no consume minutos de build**.
- Hobby es para uso personal/no comercial.

## Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| La rama no aparece en Vercel | No existe en el remoto | `git push -u origin landing` |
| El workflow falla en `vercel pull` | Falta un secret o el token expiró | Regenerar `VERCEL_TOKEN` y los IDs |
| El deploy publica una página 404 | Output Directory mal configurado | Debe ser `landing` con Root Directory en la raíz |
| El workflow no se dispara | El push no tocó `landing/**` ni `vercel.json` | Verificar `paths` del workflow |
| `fetch('releases.json')` falla en local | `file://` bloquea fetch | Usar un servidor estático (ver arriba) |
