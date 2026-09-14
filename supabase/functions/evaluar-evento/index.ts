// ─────────────────────────────────────────────────────────────
// Supabase Edge Function: evaluar-evento
// HU-BUG-PUSH-SERVER-01 — server-side push via Expo Push API.
//
// Flujo: INSERT datos_reloj -> TRIGGER pg_net trg_datos_reloj_evaluar_evento
//   -> POST /functions/v1/evaluar-evento {record} -> evalúa umbrales
//   (réplica fiel de src/services/alerts/detector.ts + types.ts, sin
//   cambiar lógica) -> INSERT alerta -> fan-out push Expo ->
//   INSERT notificacion_entrega.
//
// Invariantes:
// - Un fallo de Expo/trigger JAMÁS revierte la alerta (try/catch por
//   dispositivo + Promise.allSettled).
// - Una alerta = N filas de entrega (una por dispositivo activo).
// - Secrets (service_role) sólo vía env (supabase secrets / Vault),
//   nunca hardcodeados. Sólo staging hasta QA verde.
// ─────────────────────────────────────────────────────────────

// Declaración mínima del runtime Deno para que `tsc --noEmit` pase
// sin necesitar @types/deno instalado.
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

// @ts-ignore — import remoto Deno (esm.sh), no resoluble por tsc local.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Umbrales (réplica de src/services/alerts/types.ts) ───
// SpO2: DEFAULT_SPO2_THRESHOLDS { warningPercent: 90, criticalPercent: 85 }
// HR:   DEFAULT_HR_THRESHOLDS { tachyWarning: 100, tachyCritical: 120,
//         bradyWarning: 50, bradyCritical: 40 }
// BP:   DEFAULT_BP_THRESHOLDS { sistolicaWarning: 140, sistolicaCritical: 160,
//         diastolicaWarning: 90, diastolicaCritical: 100,
//         sistolicaLowWarning: 90, sistolicaLowCritical: 80,
//         diastolicaLowWarning: 60, diastolicaLowCritical: 50 }
const SPO2_WARNING = 90;
const SPO2_CRITICAL = 85;
const TACHY_WARNING = 100;
const TACHY_CRITICAL = 120;
const BRADY_WARNING = 50;
const BRADY_CRITICAL = 40;
const SIST_WARNING = 140;
const SIST_CRITICAL = 160;
const DIAST_WARNING = 90;
const DIAST_CRITICAL = 100;
const SIST_LOW_WARNING = 90;
const SIST_LOW_CRITICAL = 80;
const DIAST_LOW_WARNING = 60;
const DIAST_LOW_CRITICAL = 50;

// ─── Quiet-hours defaults ───
const QUIET_DEFAULT_INICIO = "23:00:00";
const QUIET_DEFAULT_FIN = "07:00:00";
// Timezone local del usuario para comparar la ventana TIME (sin tz).
// La edge corre en UTC: convierte now UTC -> America/Argentina/Buenos_Aires
// antes de comparar con horario_silencioso_inicio/fin.
const USER_TIMEZONE = "America/Argentina/Buenos_Aires";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type Severidad = "critica" | "advertencia";
type TipoAlerta = "hipoxia" | "hipertension" | "hipotension" | "taquicardia" | "bradicardia";

interface DatosRelojRecord {
  id?: string;
  id_usuario: string;
  spo2_pct?: number | null;
  frec_cardiaca_bpm?: number | null;
  bp_sistolica?: number | null;
  bp_diastolica?: number | null;
  origen?: string | null;
  recorded_at?: string | null;
}

interface AlertaCandidata {
  tipo: TipoAlerta;
  severidad: Severidad;
  titulo: string;
  mensaje: string;
  datos: Record<string, unknown>;
}

interface Dispositivo {
  id: string;
  fcm_token: string;
}

interface Preferencia {
  push_habilitado: boolean | null;
  horario_silencioso_inicio: string | null;
  horario_silencioso_fin: string | null;
}

// ─── Evaluación de umbrales (réplica detector.ts) ───

function evalSpo2(spo2: number): Severidad | null {
  if (spo2 < SPO2_CRITICAL) return "critica";
  if (spo2 < SPO2_WARNING) return "advertencia";
  return null;
}

function evalHr(bpm: number): { tipo: TipoAlerta; severidad: Severidad; umbral: number } | null {
  if (bpm >= TACHY_CRITICAL) return { tipo: "taquicardia", severidad: "critica", umbral: TACHY_CRITICAL };
  if (bpm > TACHY_WARNING) return { tipo: "taquicardia", severidad: "advertencia", umbral: TACHY_WARNING };
  if (bpm <= BRADY_CRITICAL) return { tipo: "bradicardia", severidad: "critica", umbral: BRADY_CRITICAL };
  if (bpm < BRADY_WARNING) return { tipo: "bradicardia", severidad: "advertencia", umbral: BRADY_WARNING };
  return null;
}

function clasificaBpAlto(valor: number, warning: number, critical: number): Severidad | null {
  if (valor >= critical) return "critica";
  if (valor >= warning) return "advertencia";
  return null;
}

function clasificaBpBajo(valor: number, warning: number, critical: number): Severidad | null {
  if (valor <= critical) return "critica";
  if (valor <= warning) return "advertencia";
  return null;
}

function rangoSev(a: Severidad | null, b: Severidad | null): Severidad | null {
  if (a === "critica" || b === "critica") return "critica";
  if (a === "advertencia" || b === "advertencia") return "advertencia";
  return null;
}

function evaluarRegistro(record: DatosRelojRecord): AlertaCandidata | null {
  const origen = record.origen ?? "wearable";

  // SpO2 — hipoxia (prioridad 1, igual que engine local)
  if (record.spo2_pct !== null && record.spo2_pct !== undefined) {
    const sev = evalSpo2(Number(record.spo2_pct));
    if (sev) {
      const umbral = sev === "critica" ? SPO2_CRITICAL : SPO2_WARNING;
      return {
        tipo: "hipoxia",
        severidad: sev,
        titulo: sev === "critica" ? "Alerta crítica: SpO₂ muy baja" : "Alerta: SpO₂ baja",
        mensaje:
          sev === "critica"
            ? `Saturación de oxígeno en ${record.spo2_pct}% (umbral crítico: ${umbral}%). Seek immediate medical attention.`
            : `Saturación de oxígeno en ${record.spo2_pct}% (umbral de alerta: ${umbral}%). Monitor closely.`,
        datos: {
          valor_registrado: Number(record.spo2_pct),
          umbral_configurado: umbral,
          dispositivo_origen: origen,
          escalada: false,
        },
      };
    }
  }

  // Frecuencia cardíaca — taquicardia / bradicardia
  if (record.frec_cardiaca_bpm !== null && record.frec_cardiaca_bpm !== undefined) {
    const r = evalHr(Number(record.frec_cardiaca_bpm));
    if (r) {
      const isTachy = r.tipo === "taquicardia";
      const titulo = `${r.severidad === "critica" ? "Alerta critica" : "Alerta"}: Frecuencia cardiaca ${isTachy ? "alta (taquicardia)" : "baja (bradicardia)"}`;
      return {
        tipo: r.tipo,
        severidad: r.severidad,
        titulo,
        mensaje: `FC ${record.frec_cardiaca_bpm} lpm (limites: ${BRADY_WARNING}-${TACHY_WARNING} lpm, umbral: ${r.umbral} lpm).`,
        datos: {
          valor_registrado: Number(record.frec_cardiaca_bpm),
          umbral_configurado: r.umbral,
          dispositivo_origen: origen,
          escalada: false,
        },
      };
    }
  }

  // Presión arterial — hiper / hipo (sistólica y diastólica independientes,
  // severidad global = max de ambas, igual que evaluateBp CA-05)
  if (
    record.bp_sistolica !== null &&
    record.bp_sistolica !== undefined &&
    record.bp_diastolica !== null &&
    record.bp_diastolica !== undefined
  ) {
    const sist = Number(record.bp_sistolica);
    const diast = Number(record.bp_diastolica);
    const sistSev =
      clasificaBpAlto(sist, SIST_WARNING, SIST_CRITICAL) ??
      clasificaBpBajo(sist, SIST_LOW_WARNING, SIST_LOW_CRITICAL);
    const diastSev =
      clasificaBpAlto(diast, DIAST_WARNING, DIAST_CRITICAL) ??
      clasificaBpBajo(diast, DIAST_LOW_WARNING, DIAST_LOW_CRITICAL);
    const sev = rangoSev(sistSev, diastSev);
    if (sev) {
      const esHiper = sist >= SIST_WARNING || diast >= DIAST_WARNING;
      const tipo: TipoAlerta = esHiper ? "hipertension" : "hipotension";
      const label = esHiper ? "Presion arterial alta" : "Presion arterial baja";
      const isCombined = sistSev !== null && diastSev !== null;
      return {
        tipo,
        severidad: sev,
        titulo: `${sev === "critica" ? "Alerta critica" : "Alerta"}: ${label}${isCombined ? " (combinada)" : ""}`,
        mensaje: `Presion ${sist}/${diast} mmHg (rango normal: sist ${SIST_LOW_WARNING}-${SIST_WARNING}, diast ${DIAST_LOW_WARNING}-${DIAST_WARNING}).`,
        datos: {
          bp_sistolica: sist,
          bp_diastolica: diast,
          is_combined: isCombined,
          contexto: "normal",
          dispositivo_origen: origen,
          escalada: false,
        },
      };
    }
  }

  return null;
}

// ─── Quiet-hours ───

function aSegundos(hhmmss: string): number {
  const partes = hhmmss.split(":").map(Number);
  const h = partes[0] ?? 0;
  const m = partes[1] ?? 0;
  const s = partes[2] ?? 0;
  return h * 3600 + m * 60 + s;
}

/** Ventana con wrap de medianoche: inicio<=fin ? dentro : (now>=inicio OR now<fin). */
export function estaEnVentana(nowLocal: string, inicio: string, fin: string): boolean {
  const now = aSegundos(nowLocal);
  const ini = aSegundos(inicio);
  const finS = aSegundos(fin);
  if (ini <= finS) return now >= ini && now < finS;
  return now >= ini || now < finS;
}

/**
 * Hora local HH:MM:SS en America/Argentina/Buenos_Aires a partir de now UTC.
 * TIME de preferencia_notificacion no tiene tz: la edge convierte UTC->local
 * con Intl antes de comparar.
 */
function ahoraLocalEnTimezone(now: Date, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return fmt.format(now);
}

function debeSuprimir(pref: Preferencia | null, severidad: Severidad, now: Date): boolean {
  // Críticas bypasean quiet-hours siempre.
  if (severidad === "critica") return false;
  const pushHabilitado = pref?.push_habilitado ?? true;
  if (pushHabilitado === false) return true;
  const inicio = pref?.horario_silencioso_inicio ?? QUIET_DEFAULT_INICIO;
  const fin = pref?.horario_silencioso_fin ?? QUIET_DEFAULT_FIN;
  const nowLocal = ahoraLocalEnTimezone(now, USER_TIMEZONE);
  return estaEnVentana(nowLocal, inicio, fin);
}

// ─── Handler ───

Deno.serve(async (req: Request): Promise<Response> => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
  const EXPO_ACCESS_TOKEN = Deno.env.get("EXPO_ACCESS_TOKEN");

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return Response.json({ error: "missing SUPABASE_URL / SERVICE_ROLE_KEY (supabase secrets set)" }, { status: 500 });
  }

  let body: { record?: DatosRelojRecord };
  try {
    body = (await req.json()) as { record?: DatosRelojRecord };
  } catch (_e) {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const record = body.record;
  if (!record || !record.id_usuario) {
    return Response.json({ error: "missing record.id_usuario" }, { status: 400 });
  }

  // @ts-ignore — cliente tipado vía esm.sh en runtime Deno.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Evaluar umbrales (réplica engine local, sin cambios de lógica).
  const candidata = evaluarRegistro(record);
  if (!candidata) {
    return Response.json({ ok: true, alert: null });
  }

  // 2) INSERT alerta (commitea antes del fan-out: un fallo posterior jamás la revierte).
  const { data: alerta, error: errAlerta } = await admin
    .from("alerta")
    .insert({
      id_usuario: record.id_usuario,
      id_dato_reloj: record.id ?? null,
      id_prediccion_riesgo: null,
      tipo: candidata.tipo,
      severidad: candidata.severidad,
      titulo: candidata.titulo,
      mensaje: candidata.mensaje,
      datos: candidata.datos,
    })
    .select("id,tipo,severidad,titulo,mensaje")
    .single();

  if (errAlerta || !alerta) {
    return Response.json({ error: "insert alerta failed", detail: String(errAlerta?.message ?? errAlerta) }, { status: 500 });
  }

  const alertId: string = (alerta as { id: string }).id;
  const severidad: Severidad = (alerta as { severidad: Severidad }).severidad;
  const tipo: TipoAlerta = (alerta as { tipo: TipoAlerta }).tipo;

  // 3) SELECT dispositivo activo + preferencia (defaults si faltan).
  let dispositivos: Dispositivo[] = [];
  try {
    const { data } = await admin
      .from("dispositivo_usuario")
      .select("id,fcm_token")
      .eq("id_usuario", record.id_usuario)
      .eq("activo", true)
      .like("fcm_token", "ExponentPushToken%");
    dispositivos = ((data ?? []) as Dispositivo[]).filter((d) => d.fcm_token);
  } catch (_e) {
    dispositivos = [];
  }

  let pref: Preferencia | null = null;
  try {
    const { data } = await admin
      .from("preferencia_notificacion")
      .select("push_habilitado,horario_silencioso_inicio,horario_silencioso_fin")
      .eq("id_usuario", record.id_usuario)
      .maybeSingle();
    pref = (data as Preferencia | null) ?? null;
  } catch (_e) {
    pref = null;
  }

  const now = new Date();
  const suprimida = debeSuprimir(pref, severidad, now);

  // 4) Suprimida por quiet-hours / push deshabilitado: NO llamar a Expo,
  //    registrar entrega trazable y salir.
  if (suprimida) {
    try {
      const filas = dispositivos.length > 0 ? dispositivos : [{ id: null as unknown as string, fcm_token: "" }];
      await Promise.allSettled(
        filas.map((d) =>
          admin.from("notificacion_entrega").insert({
            id_alerta: alertId,
            id_dispositivo: (d as Dispositivo).id ?? null,
            id_usuario: record.id_usuario,
            estado: "enviada",
            enviado_en: now.toISOString(),
            error_mensaje: "suprimida_quiet_hours",
          }),
        ),
      );
    } catch (_e) {
      // best-effort: la alerta ya existe, no fallar el webhook
    }
    return Response.json({ ok: true, alert: alerta, suppressed: true, reason: "suprimida_quiet_hours" });
  }

  if (dispositivos.length === 0) {
    return Response.json({ ok: true, alert: alerta, pushed: 0, reason: "sin_dispositivos_activos" });
  }

  // 5) Fan-out Expo: POST por dispositivo, Promise.allSettled, try/catch
  //    individual. Nunca revierte la alerta.
  const titulo = (alerta as { titulo: string }).titulo;
  const mensaje = (alerta as { mensaje: string }).mensaje;

  const resultados = await Promise.allSettled(
    dispositivos.map(async (d) => {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };
        if (EXPO_ACCESS_TOKEN) headers["Authorization"] = `Bearer ${EXPO_ACCESS_TOKEN}`;

        const res = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({
            to: d.fcm_token,
            title: titulo,
            body: mensaje,
            sound: "default",
            priority: severidad === "critica" ? "high" : "default",
            data: {
              alertId,
              alertType: tipo,
              severity: severidad,
              screen: "AlertDetail",
            },
          }),
        });

        const ticket = (await res.json().catch(() => ({}))) as {
          data?: { status?: string; id?: string; message?: string; details?: { error?: string } };
        };
        const t = ticket?.data;
        const ticketId: string | null = typeof t?.id === "string" ? (t as { id: string }).id : null;
        const expoError: string | undefined = t?.details?.error ?? (t?.status === "error" ? t?.message : undefined);

        if (expoError === "DeviceNotRegistered") {
          await admin.from("notificacion_entrega").insert({
            id_alerta: alertId,
            id_dispositivo: d.id,
            id_usuario: record.id_usuario,
            estado: "fallida",
            enviado_en: now.toISOString(),
            error_mensaje: "DeviceNotRegistered: token revocado",
          });
          return { dispositivo: d.id, estado: "fallida" };
        }

        await admin.from("notificacion_entrega").insert({
          id_alerta: alertId,
          id_dispositivo: d.id,
          id_usuario: record.id_usuario,
          estado: expoError ? "fallida" : "enviada",
          enviado_en: now.toISOString(),
          error_mensaje: expoError ?? ticketId,
        });
        return { dispositivo: d.id, estado: expoError ? "fallida" : "enviada" };
      } catch (e) {
        try {
          await admin.from("notificacion_entrega").insert({
            id_alerta: alertId,
            id_dispositivo: d.id,
            id_usuario: record.id_usuario,
            estado: "fallida",
            enviado_en: now.toISOString(),
            error_mensaje: String((e as Error)?.message ?? e).slice(0, 500),
          });
        } catch (_e2) {
          // best-effort
        }
        return { dispositivo: d.id, estado: "fallida" };
      }
    }),
  );

  const enviadas = resultados.filter(
    (r) => r.status === "fulfilled" && (r.value as { estado: string }).estado === "enviada",
  ).length;

  return Response.json({ ok: true, alert: alerta, pushed: enviadas, total: dispositivos.length });
});
