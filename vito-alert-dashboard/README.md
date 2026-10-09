# VITO Alert Dashboard

Dashboard de pruebas de VITO, hecho con React y Vite.

## Ejecutar

1. Copiar `.env.example` a `.env` y completar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
2. Ejecutar `npm install`.
3. Ejecutar `npm run dev`.

Se integra con tablas de Supabase y la Edge Function `enviar-info`. Esta función debe existir en Supabase para enviar mensajes INFO. El archivo `.env` está excluido del repositorio.
