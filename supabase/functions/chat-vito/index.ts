// ─────────────────────────────────────────────────────────────────────────────
// Supabase Edge Function: chat-vito
// HU-99 / SCRUM-51 — proxy del chat de VITO hacia el agente (Railway / n8n).
//
// PROBLEMA QUE RESUELVE
//   La app móvil tenía que llamar directo al webhook del agente con un header
//   de autenticación. Ese valor venía de una variable EXPO_PUBLIC_*, que se
//   INLINEA como literal en el bundle JS: viaja dentro del APK y cualquiera
//   puede extraerlo. No es un secreto, solo una barrera baja.
//
//   Esta función es el proxy: la app manda su JWT de Supabase y el secreto
//   queda acá, en el servidor, cargado desde `supabase secrets`.
//
// FLUJO
//   App ──(Bearer <access_token>)──> chat-vito
//        ├─ valida el JWT contra Supabase (auth.getUser)
//        ├─ toma el userId DEL TOKEN (nunca del body: evita suplantación)
//        ├─ arma {userId, conversationId, type:'text', text} (formato de n8n)
//        └─ POST al webhook con el header secreto → devuelve el cuerpo tal cual
//
// SECRETS (nunca hardcodeados, ver `supabase secrets set`)
//   CHAT_WEBHOOK_URL        → https://<host>/webhook/chat-agent
//   CHAT_AUTH_HEADER_NAME  → nombre del header (ej: x-api-key)
//   CHAT_AUTH_HEADER_VALUE → valor del header
//
// SUPABASE_URL y SUPABASE_ANON_KEY los inyecta el runtime de Edge Functions.
// ─────────────────────────────────────────────────────────────────────────────

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

// @ts-ignore — import remoto Deno (esm.sh), no resoluble por tsc local.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  // ── Preflight CORS ────────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método no permitido" }, 405);
  }

  // ── 1. Autenticación: el JWT de Supabase ─────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return jsonResponse({ error: "Falta el token de autenticación" }, 401);
  }
  const token = authHeader.slice(7).trim();

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonResponse({ error: "Configuración de Supabase incompleta" }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) {
    return jsonResponse({ error: "Token inválido o vencido" }, 401);
  }

  // ── 2. Payload ────────────────────────────────────────────────────────────
  let body: Record<string, unknown> | null = null;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = null;
  }

  const message =
    typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return jsonResponse({ error: "El mensaje no puede estar vacío" }, 400);
  }

  const conversationId =
    typeof body?.conversationId === "string" && body.conversationId.trim()
      ? body.conversationId.trim()
      : user.id;

  // ── 3. Secretos del webhook ──────────────────────────────────────────────
  const CHAT_WEBHOOK_URL = Deno.env.get("CHAT_WEBHOOK_URL") ?? "";
  const CHAT_AUTH_HEADER_NAME = Deno.env.get("CHAT_AUTH_HEADER_NAME") ?? "";
  const CHAT_AUTH_HEADER_VALUE = Deno.env.get("CHAT_AUTH_HEADER_VALUE") ?? "";

  if (!CHAT_WEBHOOK_URL || !CHAT_AUTH_HEADER_NAME || !CHAT_AUTH_HEADER_VALUE) {
    console.error("[chat-vito] Faltan los secrets CHAT_WEBHOOK_URL / CHAT_AUTH_HEADER_*");
    return jsonResponse({ error: "El chat no está configurado en el servidor" }, 500);
  }

  // ── 4. Proxy hacia el agente ──────────────────────────────────────────────
  let upstream: Response;
  try {
    upstream = await fetch(CHAT_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [CHAT_AUTH_HEADER_NAME]: CHAT_AUTH_HEADER_VALUE,
      },
      body: JSON.stringify({
        // El userId SIEMPRE viene del token validado, nunca del body.
        userId: user.id,
        conversationId,
        type: "text",
        text: message,
      }),
    });
  } catch (error) {
    console.error("[chat-vito] Fallo al llamar al webhook:", error);
    return jsonResponse({ error: "No se pudo contactar al agente" }, 502);
  }

  const raw = await upstream.text();

  if (!upstream.ok) {
    console.error(`[chat-vito] El agente respondió ${upstream.status}`);
    return jsonResponse(
      { error: `El agente respondió con estado ${upstream.status}` },
      upstream.status,
    );
  }

  // Se devuelve el cuerpo tal cual para que el parseo lo haga la app con la
  // misma lógica que usaba contra el webhook directo.
  return new Response(raw, {
    status: upstream.status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": upstream.headers.get("content-type") ?? "text/plain",
    },
  });
});
