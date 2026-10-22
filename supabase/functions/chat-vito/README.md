# `chat-vito` — proxy del chat (Edge Function)

Proxy entre la app y el webhook del agente (n8n / Railway).

La app manda su **JWT de Supabase**; la función lo valida con `auth.getUser`,
toma el `userId` **del token** (nunca del body) y reenvía al webhook con el
header secreto. El secreto vive en Supabase, no en el APK.

```
App ──(Bearer <access_token>)──> chat-vito ──(header secreto)──> webhook del agente
```

## Secrets

| Nombre                   | Valor                                                      |
| ------------------------ | ---------------------------------------------------------- |
| `CHAT_WEBHOOK_URL`       | `https://primary-production-7732.up.railway.app/webhook/chat-agent` |
| `CHAT_AUTH_HEADER_NAME`  | mismo valor que `EXPO_PUBLIC_CHAT_AUTH_HEADER_NAME` del `.env` local |
| `CHAT_AUTH_HEADER_VALUE` | mismo valor que `EXPO_PUBLIC_CHAT_AUTH_HEADER_VALUE` del `.env` local |

`SUPABASE_URL` y `SUPABASE_ANON_KEY` los inyecta el runtime; no hay que setearlos.

`verify_jwt` queda en el **default (`true`)**: la función además valida el token
por su cuenta, así que un request sin sesión válida devuelve `401`.

## Deploy

Proyecto: `rkgbedehkfpiylaubjbo` (`Vito-App-Android`).

```powershell
# 1. Login (abre el navegador; una sola vez por máquina)
npx supabase login

# 2. Linkear el proyecto (crea supabase/.temp/project-ref, que está gitignoreado)
npx supabase link --project-ref rkgbedehkfpiylaubjbo

# 3. Cargar los secrets (entre comillas simples: sin interpolación)
npx supabase secrets set "CHAT_WEBHOOK_URL=https://primary-production-7732.up.railway.app/webhook/chat-agent"
npx supabase secrets set "CHAT_AUTH_HEADER_NAME=<valor de EXPO_PUBLIC_CHAT_AUTH_HEADER_NAME>"
npx supabase secrets set "CHAT_AUTH_HEADER_VALUE=<valor de EXPO_PUBLIC_CHAT_AUTH_HEADER_VALUE>"

# 4. Deploy (--use-api evita necesitar Docker)
npx supabase functions deploy chat-vito --use-api
```

Sin `supabase login` previo se puede usar un token del dashboard
(Settings → Access Tokens):

```powershell
$env:SUPABASE_ACCESS_TOKEN = "sbp_..."
```

## Verificar

```powershell
npx supabase functions list            # chat-vito ACTIVE
npx supabase secrets list              # los 3 nombres (hashes, no valores)
```

Prueba rápida sin sesión de usuario — debe devolver `401`:

```powershell
curl.exe -i -X POST "https://rkgbedehkfpiylaubjbo.supabase.co/functions/v1/chat-vito" -H "Content-Type: application/json" -d '{\"message\":\"hola\"}'
```

## Activar el transporte `proxy` en la app

El default es `direct` (la app llama al webhook con el header del `.env`). Para
usar el proxy, **después** del deploy:

1. `.env` local: `EXPO_PUBLIC_CHAT_TRANSPORT=proxy`
2. Los 4 workflows con `env:` (`ci-pr-dev`, `ci-pr-main`, `release`,
   `build-android-dev`): `EXPO_PUBLIC_CHAT_TRANSPORT: proxy`
3. Rebuild del APK (la variable se inlinea en el bundle).

## Logs

```powershell
npx supabase functions logs chat-vito
```

Con `EXPO_PUBLIC_CHAT_TRANSPORT=proxy`, los errores del chat en la app pasan a
venir de acá: `401` token inválido, `500` secrets faltantes, `502` webhook
inaccesible.

## Notas

- `enviar-whatsapp` es la otra función del proyecto; `chat-vito` se deploya
  aparte. No usar `--prune` salvo que quieras borrar del proyecto las
  funciones que no existan también en local.
- `supabase/config.toml` no tiene bloque `[functions.chat-vito]` a propósito:
  así `verify_jwt` queda en el default. Si en el futuro se agrega, no poner
  `verify_jwt = false`.
