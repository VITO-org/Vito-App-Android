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
  DatosPrediccionRiesgo,
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
  /** Datos declarados por el usuario en DatosPrediccionScreen (tabla
   *  datos_prediccion_riesgo). Fuente de verdad primaria para las features
   *  que Vito no recolecta de forma nativa (BMI declarado, presión manual,
   *  colesterol, diabetes, tabaquismo, alcohol). */
  datos?: DatosPrediccionRiesgo | null;
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
 * Función de validación PREVIA a la evaluación (CA-03).
 *
 * Determina qué features del contrato v2 faltan para evaluar con datos reales
 * del usuario, sin imputar en silencio:
 *
 * - age / sex_male: se toman del perfil (el formulario dedicado NO los pide).
 * - bmi: del BMI declarado en `datos` o, si no, de peso/altura del perfil
 *   (campos que el registro ya pide como opcionales).
 * - bp_sistolica / bp_diastolica / cholesterol_ord / diabetes / smoking /
 *   alcohol / active: SOLO de `datos` (tabla datos_prediccion_riesgo) — son
 *   las features que Vito no recolecta de forma nativa o que el usuario
 *   declara en el formulario dedicado (CA-02/CA-05).
 *
 * Devuelve la lista de features faltantes (vacía = se puede evaluar).
 */
export function camposFaltantesPrediccion(entrada: EntradaPrediccion): FeatureName[] {
  const faltantes: FeatureName[] = [];
  const { profile, datos } = entrada;

  // ── Perfil ─────────────────────────────────────────────────
  if (edadDesdeFechaNac(profile.fecha_nac) === null) faltantes.push('age');
  if (profile.sexo === null || profile.sexo === undefined) faltantes.push('sex_male');

  // ── BMI: declarado en datos, o peso/altura del perfil ──────
  const peso = datos?.peso_kg ?? profile.peso_kg;
  const altura = datos?.altura_cm ?? profile.altura_cm;
  const bmiValido =
    peso != null &&
    altura != null &&
    altura > 0 &&
    peso / Math.pow(altura / 100, 2) >= 15 &&
    peso / Math.pow(altura / 100, 2) <= 50;
  if (!bmiValido) faltantes.push('bmi');

  // ── Campos del formulario dedicado (tabla datos_prediccion_riesgo) ──
  if (datos?.bp_sistolica == null) faltantes.push('bp_sistolica');
  if (datos?.bp_diastolica == null) faltantes.push('bp_diastolica');
  if (datos?.cholesterol_ord == null) faltantes.push('cholesterol_ord');
  if (datos?.diabetes == null) faltantes.push('diabetes');
  if (datos?.smoking == null) faltantes.push('smoking');
  if (datos?.alcohol == null) faltantes.push('alcohol');
  if (datos?.active == null) faltantes.push('active');

  return faltantes;
}

/**
 * Arma el payload de features para la Edge Function.
 *
 * Precedencia de fuentes por feature (datos declarados > nativas > defaults):
 * - age/sex_male → perfil (registro).
 * - bmi → datos_prediccion_riesgo (BMI declarado) > perfil.
 * - bp → datos_prediccion_riesgo (presión manual) > promedio semanal.
 * - cholesterol_ord → datos_prediccion_riesgo > default (1=normal).
 * - diabetes/smoking/alcohol → datos_prediccion_riesgo > factores_riesgo_cardiaco.
 * - active → datos_prediccion_riesgo (declarado) > promedio semanal (≥5000
 *   pasos) > default conservador.
 *
 * Los faltantes se rellenan con DEFAULTS y se reportan en `imputados` como red
 * de seguridad (por ejemplo fila parcial). El flujo normal valida ANTES con
 * camposFaltantesPrediccion() para que la UI no impute en silencio (CA-03).
 */
export function buildPredictionPayload(
  entrada: EntradaPrediccion,
): PayloadPrediccion {
  const { profile, factores, promedio, datos } = entrada;
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

  // ── BMI: BMI declarado (datos) > peso/altura del perfil ───
  const pesoDeclarado = datos?.peso_kg ?? profile.peso_kg;
  const alturaDeclarada = datos?.altura_cm ?? profile.altura_cm;
  let bmi: number | null = null;
  if (pesoDeclarado != null && alturaDeclarada != null && alturaDeclarada > 0) {
    const calc = pesoDeclarado / Math.pow(alturaDeclarada / 100, 2);
    bmi = calc >= 15 && calc <= 50 ? calc : null;
  }
  setValor('bmi', bmi);

  // ── Presión: manual declarada (datos) > promedio semanal ──
  const bpSis = datos?.bp_sistolica ?? promedio?.bp_sistolica_prom ?? null;
  const bpDia = datos?.bp_diastolica ?? promedio?.bp_diastolica_prom ?? null;
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
  // active: (1) declarado en datos_prediccion_riesgo (formulario) — prioridad;
  // (2) derivado del wearable si el promedio semanal tiene >= 5000 pasos/día;
  // (3) default conservador (asumido activo).
  const activeDeclarado = datos?.active;
  const activeWearable = pasos != null && Number(pasos) >= 5000 ? 1 : 0;
  setValor(
    'active',
    activeDeclarado != null ? (activeDeclarado ? 1 : 0) : pasos != null ? activeWearable : null,
  );

  // ── Colesterol: declarado (datos) > default (1=normal) ────
  const chol = datos?.cholesterol_ord;
  setValor('cholesterol_ord', chol === 1 || chol === 2 || chol === 3 ? chol : null);

  // ── Factores booleanos: declarados (datos) > factores_riesgo_cardiaco ──
  const boolFactor = (v: boolean | null | undefined): number | null =>
    v === null || v === undefined ? null : v ? 1 : 0;

  const diabetes = datos?.diabetes ?? factores?.diabetes;
  const smoking = datos?.smoking ?? factores?.fumador;
  const alcohol = datos?.alcohol ?? factores?.consumo_alcohol;
  setValor('diabetes', boolFactor(diabetes));
  setValor('smoking', boolFactor(smoking));
  setValor('alcohol', boolFactor(alcohol));

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