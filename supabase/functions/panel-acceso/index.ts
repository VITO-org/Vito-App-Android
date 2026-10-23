// ─────────────────────────────────────────────────────────────
// Supabase Edge Function: panel-acceso
// Gate de acceso del panel QA de alertas (dashboard publicado en Pages).
//
// Por qué existe: la publishable key de Supabase es PÚBLICA (Vite la
// inlinea en el bundle y cualquiera que abra la página la lee). Por eso
// la frontera de seguridad NO puede ser la key: tiene que ser (a) el RLS
// de la base y (b) este gate, que valida un passcode contra un secret
// del servidor y recién ahí ejecuta operaciones privilegiadas con
// service_role.
//
// Flujo: el operador tipea el passcode -> la función lo contrasta con
//   el secret PANEL_PASSCODE (nunca en el bundle) -> devuelve un token
//   firmado (HMAC-SHA256, con vencimiento) -> el panel lo reenvía en
//   cada llamada -> la función ejecuta la acción pedida con service_role.
//
// La allowlist de usuarios vive ACÁ (servidor), no en el bundle: el
// cliente no decide a quién puede tocar el panel.
//
// Deploy: supabase functions deploy panel-acceso --no-verify-jwt
// Secret:  supabase secrets set PANEL_PASSCODE=<passcode largo>
// ─────────────────────────────────────────────────────────────

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

// @ts-ignore — import remoto Deno (esm.sh), no resoluble por tsc local.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Configuración ───

/** TTL del token de sesión del panel (8 h: una jornada de QA). */
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

/** Origenes permitidos para CORS (el panel publicado + dev local). */
const ORIGENES_PERMITIDOS = [
  "https://vito-org.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

/**
 * Allowlist de usuarios que el panel puede tocar. Es la frontera real:
 * aunque alguien tenga la publishable key, sólo puede operar sobre estas
 * 4 cuentas de prueba. Se puede overridear con PANEL_USUARIOS (CSV).
 */
const USUARIOS_POR_DEFECTO = [
  "ee6b8389-f546-4339-9853-1e3f13487004",
  "d11f3190-6d35-4b6e-b9c9-f75f55716b8b",
  "276e9db2-f382-44fd-93c4-5c7226a0019e",
  "dbeff0c5-468f-48d8-9363-85fb5ba2b951",
];

/** Tipos de alerta que el panel puede generar y sus valores de prueba. */
const VALORES_PRUEBA: Record<
  string,
  Record<string, { spo2_pct?: number; frec_cardiaca_bpm?: number; bp_sistolica?: number; bp_diastolica?: number }>
> = {
  hipoxia: { critica: { spo2_pct: 82 }, advertencia: { spo2_pct: 88 } },
  taquicardia: { critica: { frec_cardiaca_bpm: 125 }, advertencia: { frec_cardiaca_bpm: 110 } },
  bradicardia: { critica: { frec_cardiaca_bpm: 38 }, advertencia: { frec_cardiaca_bpm: 45 } },
  hypertension: { critica: { bp_sistolica: 165, bp_diastolica: 105 }, advertencia: { bp_sistolica: 145, bp_diastolica: 95 } },
  hipotension: { critica: { bp_sistolica: 75, bp_diastolica: 45 }, advertencia: { bp_sistolica: 85, bp_diastolica: 55 } },
};

// ─── Utilidades ───

function usuariosPermitidos(): string[] {
  const csv = Deno.env.get("PANEL_USUARIOS");
  if (csv) {
    const ids = csv.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length > 0) return ids;
  }
  return USUARIOS_POR_DEFECTO;
}

function origenPermitido(req: Request): string {
  const origin = req.headers.get("origin") ?? "";
  if (ORIGENES_PERMITIDOS.includes(origin)) return origin;
  return ORIGENES_PERMITIDOS[0];
}

function cors(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origenPermitido(req),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: cors(req) });
}

/** Comparación en tiempo constante (evita fuga por timing). */
function equalsConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(secret: string, mensaje: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const firma = await crypto.subtle.sign("HMAC", key, enc.encode(mensaje));
  return Array.from(new Uint8Array(firma))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function nonceAleatorio(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Token de sesión ───

interface TokenSesion {
  expiraEn: number;
  nonce: string;
  firma: string;
}

async function emitirToken(secret: string): Promise<{ token: string; expira_en: string }> {
  const expiraEn = Date.now() + TOKEN_TTL_MS;
  const nonce = nonceAleatorio();
  const firma = await hmacHex(secret, `${expiraEn}.${nonce}`);
  return { token: `${expiraEn}.${nonce}.${firma}`, expira_en: new Date(expiraEn).toISOString() };
}

async function verificarToken(secret: string, token: string): Promise<boolean> {
  const partes = token.split(".");
  if (partes.length !== 3) return false;
  const [expiraEnStr, nonce, firma] = partes;
  const expiraEn = Number(expiraEnStr);
  if (!Number.isFinite(expiraEn) || Date.now() > expiraEn) return false;
  const esperada = await hmacHex(secret, `${expiraEn}.${nonce}`);
  return equalsConstantTime(esperada, firma);
}

// ─── Anti brute-force (best-effort, en memoria de la instancia) ───

const intentosFallidos = new Map<string, { count: number; hasta: number }>();
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 5 * 60 * 1000;

function registrarFallo(clave: string): void {
  const ahora = Date.now();
  const registro = intentosFallidos.get(clave);
  if (!registro || registro.hasta < ahora) {
    intentosFallidos.set(clave, { count: 1, hasta: ahora + BLOQUEO_MS });
    return;
  }
  registro.count += 1;
  intentosFallidos.set(clave, registro);
}

function estaBloqueado(clave: string): boolean {
  const registro = intentosFallidos.get(clave);
  if (!registro) return false;
  if (registro.hasta < Date.now()) {
    intentosFallidos.delete(clave);
    return false;
  }
  return registro.count >= MAX_INTENTOS;
}

function limpiarFallos(clave: string): void {
  intentosFallidos.delete(clave);
}

// ─── Acciones ───

type Accion =
  | "validar_acceso"
  | "listar_perfiles"
  | "listar_alertas"
  | "listar_entregas"
  | "insertar_dato_prueba"
  | "upsert_horario_silencioso"
  | "obtener_horario_silencioso"
  | "enviar_info";

interface Body {
  accion?: Accion;
  passcode?: string;
  token?: string;
  payload?: Record<string, unknown>;
}

function texto(v: unknown, campo: string): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) throw new Error(`Falta ${campo}`);
  return s;
}

function numero(v: unknown, campo: string): number {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${campo} inválido`);
  return n;
}

async function ejecutar(
  accion: Accion,
  payload: Record<string, unknown>,
  admin: ReturnType<typeof createClient>,
  permitidos: string[],
): Promise<unknown> {
  switch (accion) {
    // ── Perfiles de la allowlist (nombres y apellidos: sólo los 4 de QA) ──
    case "listar_perfiles": {
      const { data, error } = await admin
        .from("perfil_usuario")
        .select("id_usuario,nombre,apellido")
        .in("id_usuario", permitidos)
        .order("nombre", { ascending: true });
      if (error) throw new Error(error.message);
      return { perfiles: data ?? [] };
    }

    // ── Historial de alertas con filtros ──
    case "listar_alertas": {
      const usuario = typeof payload.usuario === "string" ? payload.usuario : null;
      const tipo = typeof payload.tipo === "string" && payload.tipo ? payload.tipo : null;
      const severidad = typeof payload.severidad === "string" && payload.severidad ? payload.severidad : null;
      const estado = typeof payload.estado === "string" && payload.estado ? payload.estado : null;
      const desde = typeof payload.desde === "string" && payload.desde ? payload.desde : null;
      const hasta = typeof payload.hasta === "string" && payload.hasta ? payload.hasta : null;
      const limite = Math.min(numero(payload.limite ?? 50, "limite"), 200);

      // intersecta: el usuario pedido tiene que estar en la allowlist
      const usuarios = usuario ? [usuario] : permitidos;

      let q = admin
        .from("alerta")
        .select("id,id_usuario,tipo,severidad,titulo,mensaje,created_at,leida_en")
        .in("id_usuario", usuarios)
        .order("created_at", { ascending: false })
        .limit(limite);

      if (tipo) q = q.eq("tipo", tipo);
      if (severidad) q = q.eq("severidad", severidad);
      if (desde) q = q.gte("created_at", desde);
      if (hasta) q = q.lte("created_at", hasta);

      const { data, error } = await q;
      if (error) throw new Error(error.message);

      let alertas = data ?? [];
      // 'estado' es derivado (leída / no leída) y el filtro se aplica acá.
      if (estado === "leida") alertas = alertas.filter((a) => Boolean((a as { leida_en: string | null }).leida_en));
      if (estado === "no_leida") alertas = alertas.filter((a) => !(a as { leida_en: string | null }).leida_en);

      return { alertas, total: alertas.length };
    }

    // ── Delivery log (notificacion_entrega) ──
    case "listar_entregas": {
      const usuario = typeof payload.usuario === "string" ? payload.usuario : null;
      const alertId = typeof payload.alertId === "string" && payload.alertId ? payload.alertId : null;
      const limite = Math.min(numero(payload.limite ?? 50, "limite"), 200);

      const usuarios = usuario ? [usuario] : permitidos;

      let q = admin
        .from("notificacion_entrega")
        .select("id,id_alerta,id_dispositivo,id_usuario,estado,enviado_en,recibida_en,leida_en,error_mensaje,alerta(tipo,severidad,titulo)")
        .in("id_usuario", usuarios)
        .order("enviado_en", { ascending: false })
        .limit(limite);

      if (alertId) q = q.eq("id_alerta", alertId);

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return { entregas: data ?? [], total: (data ?? []).length };
    }

    // ── Inyección del dato de prueba (origen dashboard_manual) ──
    case "insertar_dato_prueba": {
      const idUsuario = texto(payload.id_usuario, "id_usuario");
      if (!permitidos.includes(idUsuario)) throw new Error("Usuario fuera de la allowlist del panel");
      const tipo = texto(payload.tipo, "tipo");
      const severidad = texto(payload.severidad, "severidad");
      if (severidad !== "critica" && severidad !== "advertencia") throw new Error("Severidad inválida");

      const valores = VALORES_PRUEBA[tipo];
      if (!valores) throw new Error(`El tipo "${tipo}" no puede generarse desde datos_reloj`);

      const registro = {
        id_usuario: idUsuario,
        spo2_pct: null,
        frec_cardiaca_bpm: null,
        bp_sistolica: null,
        bp_diastolica: null,
        temperatura: null,
        nivel_estres: null,
        actividad_pasos: null,
        horas_sueno: null,
        origen: "dashboard_manual",
        recorded_at: new Date().toISOString(),
        ...valores[severidad],
      };

      const { data, error } = await admin.from("datos_reloj").insert(registro).select("id,recorded_at").single();
      if (error) throw new Error(error.message);
      return { dato: data, tipo, severidad };
    }

    // ── Horario silencioso (preferencia_notificacion) ──
    case "obtener_horario_silencioso": {
      const idUsuario = texto(payload.id_usuario, "id_usuario");
      if (!permitidos.includes(idUsuario)) throw new Error("Usuario fuera de la allowlist del panel");
      const { data, error } = await admin
        .from("preferencia_notificacion")
        .select("id_usuario,horario_silencioso_inicio,horario_silencioso_fin,push_habilitado,updated_at")
        .eq("id_usuario", idUsuario)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { preferencia: data ?? null };
    }

    case "upsert_horario_silencioso": {
      const idUsuario = texto(payload.id_usuario, "id_usuario");
      if (!permitidos.includes(idUsuario)) throw new Error("Usuario fuera de la allowlist del panel");
      const inicio = texto(payload.inicio, "inicio");
      const fin = texto(payload.fin, "fin");
      const hhmm = (s: string) => (/^\d{2}:\d{2}$/.test(s) ? `${s}:00` : s);

      const { data, error } = await admin
        .from("preferencia_notificacion")
        .upsert(
          {
            id_usuario: idUsuario,
            horario_silencioso_inicio: hhmm(inicio),
            horario_silencioso_fin: hhmm(fin),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id_usuario" },
        )
        .select("id_usuario,horario_silencioso_inicio,horario_silencioso_fin,updated_at")
        .single();
      if (error) throw new Error(error.message);
      return { preferencia: data };
    }

    // ── INFO: reenvía a la Edge Function enviar-info con service_role ──
    case "enviar_info": {
      const idUsuario = texto(payload.id_usuario, "id_usuario");
      if (!permitidos.includes(idUsuario)) throw new Error("Usuario fuera de la allowlist del panel");
      const titulo = texto(payload.titulo, "titulo");
      const mensaje = texto(payload.mensaje, "mensaje");

      const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
      const res = await fetch(`${SUPABASE_URL}/functions/v1/enviar-info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? ""}`,
        },
        body: JSON.stringify({ tipo: "info", id_usuario: idUsuario, titulo, mensaje }),
      });
      const cuerpo = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((cuerpo as { error?: string }).error ?? `enviar-info respondió ${res.status}`);
      return { info: cuerpo };
    }

    default:
      throw new Error(`Acción desconocida: ${String(accion)}`);
  }
}

// ─── Handler ───

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Método no permitido" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
  const PASSCODE = Deno.env.get("PANEL_PASSCODE") ?? "";

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json(req, { error: "Falta SUPABASE_URL / SERVICE_ROLE_KEY (supabase secrets set)" }, 500);
  }
  if (!PASSCODE) {
    return json(req, { error: "Falta PANEL_PASSCODE (supabase secrets set PANEL_PASSCODE=...)" }, 500);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch (_e) {
    return json(req, { error: "Body JSON inválido" }, 400);
  }

  const accion = body.accion;
  if (!accion) return json(req, { error: "Falta accion" }, 400);

  const permitidos = usuariosPermitidos();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";

  // ── 1) Validación de acceso: compara el passcode con el secret ──
  if (accion === "validar_acceso") {
    if (estaBloqueado(ip)) {
      return json(req, { error: "Demasiados intentos fallidos. Probá de nuevo en unos minutos." }, 429);
    }
    const passcode = typeof body.passcode === "string" ? body.passcode : "";
    if (!equalsConstantTime(passcode, PASSCODE)) {
      registrarFallo(ip);
      return json(req, { error: "Passcode incorrecto" }, 401);
    }
    limpiarFallos(ip);
    const { token, expira_en } = await emitirToken(PASSCODE);
    return json(req, { ok: true, token, expira_en, usuarios: permitidos.length });
  }

  // ── 2) Resto de acciones: exigen token de sesión válido ──
  const token = typeof body.token === "string" ? body.token : "";
  if (!token || !(await verificarToken(PASSCODE, token))) {
    return json(req, { error: "No autorizado: sesión del panel inválida o vencida" }, 401);
  }

  // @ts-ignore — cliente tipado vía esm.sh en runtime Deno.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const resultado = await ejecutar(accion, body.payload ?? {}, admin, permitidos);
    return json(req, { ok: true, ...(resultado as Record<string, unknown>) });
  } catch (e) {
    return json(req, { error: (e as Error)?.message ?? "Error inesperado" }, 400);
  }
});
