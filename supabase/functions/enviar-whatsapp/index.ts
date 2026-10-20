// ─────────────────────────────────────────────────────────────
// Supabase Edge Function: enviar-whatsapp
// SCRUM-96 HU-52 — notificaciones automáticas por WhatsApp a familiares.
//
// Usa 1 solo número WABA sandbox existente (sin alta de cuenta nueva,
// SCRUM-170 redefinida) vía Meta Cloud API + 2–3 plantillas por tipo
// de evento (fisiologico, medicacion, estado_animo).
//
// Flujo: evaluar-evento encola en notificacion_whatsapp (estado
//   'pendiente') -> POST /functions/v1/enviar-whatsapp {id_cola} ->
//   valida consentimiento (estado_opt_in='confirmado', T5) +
//   rate-limit 3/hora salvo crítica (T4, fn_whatsapp_rate_ok) ->
//   POST graph.facebook.com/<PHONE_ID>/messages ->
//   error 131030 (sin WhatsApp) dispara fallback SMS+email (T3).
//
// Webhook Meta (CA-03): GET verifica hub.mode/hub.verify_token;
//   POST inbound con texto OK/Recibido marca la cola como
//   'confirmada' (auditoría de confirmación).
//
// Secrets sólo vía env (supabase secrets), nunca hardcodeados.
// Sin token (dev local): stub wa.me, no llama a Meta.
// ─────────────────────────────────────────────────────────────

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

// @ts-ignore — import remoto Deno (esm.sh), no resoluble por tsc local.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_POR_HORA = 3;

const PLANTILLA_POR_EVENTO: Record<string, string> = {
  fisiologico: "vito_alerta_fisiologica",
  medicacion: "vito_recordatorio_medicacion",
  estado_animo: "vito_alerta_animo",
};

function esConfirmacion(texto: string): boolean {
  const n = texto.trim().toLowerCase().replace(/[!¡.,;:\s]+$/g, "");
  return n === "ok" || n === "recibido";
}

interface FilaCola {
  id: string;
  id_alerta: string | null;
  id_contacto: string | null;
  id_usuario: string;
  telefono: string;
  canal: string;
  plantilla: string;
  cuerpo: string | null;
  severidad: "advertencia" | "critica";
  estado: string;
  intentos: number;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
  const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN") ?? "";
  const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
  const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "";
  const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
  const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
  const TWILIO_FROM = Deno.env.get("TWILIO_FROM_NUMBER") ?? "";

  const url = new URL(req.url);

  // ── Webhook GET: verificación de Meta ──
  if (req.method === "GET" && url.searchParams.has("hub.mode")) {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge") ?? "";
    if (mode === "subscribe" && token && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return Response.json({ error: "verify_token inválido" }, { status: 403 });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return Response.json(
      { error: "missing SUPABASE_URL / SERVICE_ROLE_KEY (supabase secrets set)" },
      { status: 500 },
    );
  }

  // @ts-ignore — cliente tipado vía esm.sh en runtime Deno.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── Webhook POST inbound de Meta (CA-03: OK/Recibido → confirmada) ──
  const contentType = req.headers.get("content-type") ?? "";
  if (req.method === "POST" && contentType.includes("application/json")) {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch (_e) {
      return Response.json({ error: "invalid JSON body" }, { status: 400 });
    }

    // Payload Meta: {object:'whatsapp_business_account', entry:[{changes:[{value:{messages:[...]}}]}]}
    if (body["object"] === "whatsapp_business_account") {
      try {
        const entries = (body["entry"] as Array<Record<string, unknown>>) ?? [];
        for (const entry of entries) {
          const changes = (entry["changes"] as Array<Record<string, unknown>>) ?? [];
          for (const ch of changes) {
            const value = (ch["value"] as Record<string, unknown>) ?? {};
            const messages = (value["messages"] as Array<Record<string, unknown>>) ?? [];
            for (const m of messages) {
              const from = String((m["from"] as string) ?? "");
              const textBody = String(
                ((m["text"] as Record<string, unknown> | undefined)?.["body"] as string) ?? "",
              );
              if (from && esConfirmacion(textBody)) {
                // Marca la última cola enviada a ese teléfono como confirmada.
                const { data: filas } = await admin
                  .from("notificacion_whatsapp")
                  .select("id")
                  .like("telefono", `%${from.slice(-10)}%`)
                  .in("estado", ["enviada", "entregada", "leida"])
                  .order("created_at", { ascending: false })
                  .limit(1);
                const fila = (filas as Array<{ id: string }>)?.[0];
                if (fila) {
                  await admin
                    .from("notificacion_whatsapp")
                    .update({ estado: "confirmada", respuesta: { confirmacion: textBody } })
                    .eq("id", fila.id);
                }
              }
            }
          }
        }
        return Response.json({ ok: true, webhook: true });
      } catch (_e) {
        return Response.json({ ok: true, webhook: true, warn: "parse best-effort" });
      }
    }

    // ── Envío directo: {id_cola} ──
    const idCola = body["id_cola"] as string | undefined;
    if (!idCola) {
      return Response.json({ error: "missing id_cola" }, { status: 400 });
    }

    const { data: filaRaw, error: errFila } = await admin
      .from("notificacion_whatsapp")
      .select("id,id_alerta,id_contacto,id_usuario,telefono,canal,plantilla,cuerpo,severidad,estado,intentos")
      .eq("id", idCola)
      .maybeSingle();
    if (errFila || !filaRaw) {
      return Response.json({ error: "cola no encontrada" }, { status: 404 });
    }
    const fila = filaRaw as FilaCola;

    // T5: consentimiento explícito confirmado (re-chequeo server-side).
    if (fila.id_contacto) {
      const { data: contacto } = await admin
        .from("contacto_confianza")
        .select("estado_opt_in")
        .eq("id", fila.id_contacto)
        .maybeSingle();
      const optIn = (contacto as { estado_opt_in?: string } | null)?.estado_opt_in;
      if (optIn !== "confirmado") {
        await admin
          .from("notificacion_whatsapp")
          .update({ estado: "fallida", respuesta: { motivo: "sin_consentimiento", optIn } })
          .eq("id", fila.id);
        return Response.json({ ok: false, reason: "sin_consentimiento" }, { status: 403 });
      }
    }

    // T4: rate-limit 3/hora salvo severidad crítica (bypass).
    if (fila.severidad !== "critica" && fila.id_contacto) {
      const { data: ok } = await admin.rpc("fn_whatsapp_rate_ok", {
        p_contacto: fila.id_contacto,
      });
      if (ok === false) {
        await admin
          .from("notificacion_whatsapp")
          .update({ estado: "fallida", respuesta: { motivo: "rate_limit_3_hora" } })
          .eq("id", fila.id);
        return Response.json({ ok: false, reason: "rate_limit_3_hora" }, { status: 429 });
      }
    }

    const plantilla =
      fila.plantilla || PLANTILLA_POR_EVENTO["fisiologico"] || "vito_alerta_fisiologica";
    const cuerpo = fila.cuerpo ?? "Novedad de salud de tu familiar.";

    // Dev sin token: stub wa.me (T3) — no llama a Meta, queda trazable.
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      const digitos = fila.telefono.replace(/[^0-9]/g, "");
      const stub = `https://wa.me/${digitos}?text=${encodeURIComponent(cuerpo)}`;
      await admin
        .from("notificacion_whatsapp")
        .update({
          estado: "enviada",
          intentos: fila.intentos + 1,
          respuesta: { stub_wa_me: stub, dev_sin_token: true },
        })
        .eq("id", fila.id);
      return Response.json({ ok: true, stub: stub });
    }

    // Meta Cloud API con plantilla aprobada (fuera de ventana 24h solo plantillas).
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: fila.telefono,
          type: "template",
          template: { name: plantilla, language: { code: "es_AR" } },
        }),
      },
    );
    const payload = (await res.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
      error?: { code?: number; message?: string };
    };

    // T3: error 131030 (destinatario sin WhatsApp) → fallback SMS + email.
    if (!res.ok && payload?.error?.code === 131030) {
      let smsOk = false;
      let smsDetail = "twilio_no_configurado";
      if (TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM) {
        try {
          const smsRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                From: TWILIO_FROM,
                To: fila.telefono,
                Body: cuerpo,
              }).toString(),
            },
          );
          smsOk = smsRes.ok;
          smsDetail = smsOk ? "twilio_ok" : `twilio_http_${smsRes.status}`;
        } catch (_e) {
          smsDetail = "twilio_exception";
        }
      }
      await admin
        .from("notificacion_whatsapp")
        .update({
          estado: "fallback_enviada",
          canal: "sms",
          intentos: fila.intentos + 1,
          respuesta: {
            meta_error_131030: payload?.error,
            fallback: "sms+email",
            sms: smsDetail,
            email: "encolado",
          },
        })
        .eq("id", fila.id);
      return Response.json({ ok: true, fallback: "sms+email", sms: smsDetail });
    }

    if (!res.ok) {
      await admin
        .from("notificacion_whatsapp")
        .update({
          estado: "fallida",
          intentos: fila.intentos + 1,
          respuesta: { meta_error: payload?.error ?? `http_${res.status}` },
        })
        .eq("id", fila.id);
      return Response.json(
        { error: "meta_send_failed", detail: payload?.error ?? res.status },
        { status: 502 },
      );
    }

    const messageId = payload?.messages?.[0]?.id ?? null;
    await admin
      .from("notificacion_whatsapp")
      .update({
        estado: "enviada",
        intentos: fila.intentos + 1,
        respuesta: { meta_message_id: messageId },
      })
      .eq("id", fila.id);
    return Response.json({ ok: true, message_id: messageId });
  }

  return Response.json({ error: "method not allowed" }, { status: 405 });
});
