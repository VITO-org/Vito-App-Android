-- ============================================
-- Trigger: datos_reloj -> Edge Function evaluar-evento
-- HU-BUG-PUSH-SERVER-01 / Session 2026-09-10
-- Idempotente: seguro re-ejecutar con `supabase db push`.
--
-- Configuración de secretos (NO hardcodear service_role):
--   supabase secrets set SUPABASE_URL=https://<ref>.supabase.co
--   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role>
--   supabase secrets set EDGE_EVALUAR_URL=https://<ref>.supabase.co/functions/v1/evaluar-evento
-- La función lee URL/secreto de vault.decrypted_secrets con fallback a
-- current_setting('app.*'); si faltan, hace NOTICE y no rompe el INSERT.
-- Deploy edge: supabase functions deploy evaluar-evento --no-verify-jwt
--   (el trigger ya firma con service_role en el header Authorization).
-- Sólo staging hasta QA verde; prod requiere aprobación explícita.
-- ============================================

-- pg_net provee net.http_post (idempotente).
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Función puente idempotente (CREATE OR REPLACE => re-ejecutable).
CREATE OR REPLACE FUNCTION public.notify_evaluar_evento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault
AS $$
DECLARE
  edge_url text;
  svc_key text;
  req_id bigint;
BEGIN
  -- 1) Resolver URL de la edge: vault > setting > defecto vacío.
  BEGIN
    SELECT decrypted_secret INTO edge_url
    FROM vault.decrypted_secrets
    WHERE name = 'edge_evaluar_url'
    LIMIT 1;
  EXCEPTION WHEN undefined_table THEN
    edge_url := NULL;
  END;
  IF edge_url IS NULL OR edge_url = '' THEN
    BEGIN
      edge_url := current_setting('app.edge_evaluar_url', true);
    EXCEPTION WHEN OTHERS THEN
      edge_url := NULL;
    END;
  END;

  -- 2) Resolver service_role: vault > setting.
  BEGIN
    SELECT decrypted_secret INTO svc_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;
  EXCEPTION WHEN undefined_table THEN
    svc_key := NULL;
  END;
  IF svc_key IS NULL OR svc_key = '' THEN
    BEGIN
      svc_key := current_setting('app.service_role_key', true);
    EXCEPTION WHEN OTHERS THEN
      svc_key := NULL;
    END;
  END;

  -- 3) Sin config: NOTICE y deja pasar el INSERT (el push queda pendiente
  --    de QA/manual; jamás se revierte datos_reloj).
  IF edge_url IS NULL OR edge_url = '' OR svc_key IS NULL OR svc_key = '' THEN
    RAISE NOTICE 'trg_datos_reloj_evaluar_evento: sin edge_evaluar_url/service_role_key (supabase secrets set); INSERT pasa sin fan-out';
    RETURN NEW;
  END IF;

  -- 4) Llamada async vía pg_net; el fallo de red no revierte el INSERT.
  BEGIN
    SELECT net.http_post(
      url := edge_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || svc_key
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    ) INTO req_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'trg_datos_reloj_evaluar_evento: net.http_post falló (%)', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Trigger idempotente: DROP IF EXISTS + CREATE.
DROP TRIGGER IF EXISTS trg_datos_reloj_evaluar_evento ON datos_reloj;

CREATE TRIGGER trg_datos_reloj_evaluar_evento
  AFTER INSERT ON datos_reloj
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_evaluar_evento();

-- Verificación (staging):
-- SELECT * FROM pg_trigger WHERE tgname = 'trg_datos_reloj_evaluar_evento';
-- Esperado: 1 fila (tgenabled = O).
-- QA: INSERT SpO2 82 en datos_reloj -> fila en alerta + push + notificacion_entrega.
