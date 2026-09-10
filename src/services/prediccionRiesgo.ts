/**
 * Servicio puro de predicción de riesgo cardiovascular.
 *
 * Responsabilidad: armar el vector de features que consume la Edge Function
 * `prediccion-riesgo` (Supabase), mapeando los datos que Vito recolecta
 * (perfil + factores_riesgo_cardiaco + promedio_semanal_ml) al orden exacto
 * de columnas con el que se entrenó el modelo ONNX (FEATURE_ORDER).
 *
 * CONTRATO v2 (10 features) — definido junto a ml-trainer/src/label_data.py.
 * Alineado con el dataset Kaggle Cardiovascular (70k): features que ese
 * dataset soporta Y que Vito puede proveer. FC/estrés/sueño/dieta quedan
 * fuera del modelo v1 (deuda documentada en metadata.json).
 *
 * Disclaimer: el modelo se entrena sobre un dataset poblacional público. El
 * resultado es informativo/educativo y NO constituye diagnóstico médico.
 */

import type {
  FactoresRiesgoCardiaco,
  PerfilUsuario,
  PromedioSemanalML,
} from './supabase/models';

/** Orden EXACTO de features usado en el entrenamiento (ml-trainer FEATURE_ORDER v2). */
export const FEATURE_ORDER = [
  'age',
  'sex_male',
  'bmi',
  'bp_sistolica',
  'bp_diastolica',
  'cholesterol_ord',
  'diabetes',
  'smoking',
  'alcohol',
  'active',
] as const;

export type FeatureName = (typeof FEATURE_ORDER)[number];

/** Versión del modelo que este contrato de features entiende (sync con ml-trainer). */
export const MODELO_VERSION = 'v1.0.0';

/** Defaults de imputación cuando Vito no recolecta la feature. */
const DEFAULTS: Record<FeatureName, number> = {
  age: 45,
  sex_male: 1,
  bmi: 25,
  bp_sistolica: 120,
  bp_diastolica: 80,
  cholesterol_ord: 1, // 1=normal, 2=above, 3=well above (no recolectado → normal)
  diabetes: 0,
  smoking: 0,
  alcohol: 0,
  active: 1, // asumido activo si no hay datos de pasos (conservador)
};

export interface EntradaPrediccion {
  profile: PerfilUsuario;
  factores?: FactoresRiesgoCardiaco | null;
  /** Último promedio semanal disponible (la app decide cuál pasar). */
  promedio?: PromedioSemanalML | null;
}

export interface PayloadPrediccion {
  /** Vector de features en orden FEATURE_ORDER. */
  vector: number[];
  /** Features que no estaban disponibles y se imputaron con default. */
  imputados: FeatureName[];
  /** Features presentes con valor real del usuario. */
  presentes: FeatureName[];
  modelo_version: string;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Edad calculada a partir de fecha_nac (ISO yyyy-mm-dd). null → default. */
function edadDesdeFechaNac(fechaNac: string | null): number | null {
  if (!fechaNac) return null;
  const nac = new Date(fechaNac);
  if (Number.isNaN(nac.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad -= 1;
  return edad >= 0 && edad <= 120 ? edad : null;
}

/**
 * Arma el payload de features para la Edge Function.
 *
 * - Los datos presentes del usuario se usan tal cual (mismos rangos
 *   fisiológicos que la limpieza del entrenamiento: ap_hi 80-200, ap_lo
 *   50-140, BMI 15-50).
 * - Los datos ausentes (null/undefined) se imputan con DEFAULTS y se reportan
 *   en `imputados` para que la UI muestre que hubo supuestos.
 * - Booleans null → 0 (asumido negativo, reportado como imputado).
 */
export function buildPredictionPayload(
  entrada: EntradaPrediccion,
): PayloadPrediccion {
  const { profile, factores, promedio } = entrada;
  const imputados: FeatureName[] = [];
  const presentes: FeatureName[] = [];

  const valores = new Map<FeatureName, number>();

  const setValor = (name: FeatureName, v: number | null | undefined) => {
    if (v !== null && v !== undefined && Number.isFinite(v)) {
      valores.set(name, clamp(Math.round(v * 100) / 100, 0, 1000));
      presentes.push(name);
    } else {
      valores.set(name, DEFAULTS[name]);
      imputados.push(name);
    }
  };

  // ── Perfil ────────────────────────────────────────────────
  const edad = edadDesdeFechaNac(profile.fecha_nac);
  setValor('age', edad);
  setValor('sex_male', profile.sexo === 'M' ? 1 : 0);

  // BMI = peso[kg] / (altura[m])² — mismo rango fisiológico que el
  // entrenamiento (15-50). Fuera de rango → imputado (el modelo no lo vio).
  let bmi: number | null = null;
  if (profile.peso_kg != null && profile.altura_cm != null && profile.altura_cm > 0) {
    const calc = profile.peso_kg / Math.pow(profile.altura_cm / 100, 2);
    bmi = calc >= 15 && calc <= 50 ? calc : null;
  }
  setValor('bmi', bmi);

  // ── Promedio semanal ML ───────────────────────────────────
  const bpSis = promedio?.bp_sistolica_prom ?? null;
  const bpDia = promedio?.bp_diastolica_prom ?? null;
  // Rango fisiológico del entrenamiento: ap_hi 80-200, ap_lo 50-140, sis > dia.
  const bpSisValido =
    bpSis != null &&
    Number(bpSis) >= 80 &&
    Number(bpSis) <= 200 &&
    bpDia != null &&
    Number(bpDia) >= 50 &&
    Number(bpDia) <= 140 &&
    Number(bpSis) > Number(bpDia);
  setValor('bp_sistolica', bpSisValido ? Number(bpSis) : null);
  setValor('bp_diastolica', bpSisValido ? Number(bpDia) : null);

  const pasos = promedio?.pasos_diarios_prom ?? null;
  // active (binario): pasa=1 si el promedio semanal tiene >= 5000 pasos/día.
  const active = pasos != null && Number(pasos) >= 5000 ? 1 : 0;
  setValor('active', pasos != null ? active : null);

  // ── Factores de riesgo (formulario opcional) ──────────────
  const boolFactor = (v: boolean | null | undefined): number | null =>
    v === null || v === undefined ? null : v ? 1 : 0;

  setValor('diabetes', boolFactor(factores?.diabetes));
  setValor('smoking', boolFactor(factores?.fumador));
  setValor('alcohol', boolFactor(factores?.consumo_alcohol));

  // Features que Vito no recolecta → siempre default, reportadas
  const siempreImputadas: FeatureName[] = ['cholesterol_ord'];
  for (const name of siempreImputadas) {
    valores.set(name, DEFAULTS[name]);
    imputados.push(name);
  }

  const vector = FEATURE_ORDER.map(
    (name) => valores.get(name) ?? DEFAULTS[name],
  );

  return { vector, imputados, presentes, modelo_version: MODELO_VERSION };
}

/**
 * Mapea el score 0-100 de la respuesta de la Edge Function a la etiqueta de
 * riesgo con los mismos umbrales que usa la tabla prediccion_riesgo.
 * (Función espejo de la que usa la Edge Function en Deno: 33/66.)
 */
export function mapearRiesgo(score: number): 'bajo' | 'medio' | 'alto' {
  if (score >= 66) return 'alto';
  if (score >= 33) return 'medio';
  return 'bajo';
}