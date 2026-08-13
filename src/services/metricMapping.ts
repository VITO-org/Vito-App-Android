import type { DatosRelojInsert } from './supabase/models';

// Mapeo de alias conocidos (de dispositivos o SDKs) -> metric_key usados en validation_rules
const ALIAS_MAP: Record<string, string> = {
  // frecuencia cardíaca
  heart_rate: 'frec_cardiaca_bpm',
  heartRate: 'frec_cardiaca_bpm',
  hr_bpm: 'frec_cardiaca_bpm',
  hr: 'frec_cardiaca_bpm',

  // presión arterial
  systolic: 'bp_sistolica',
  diastolic: 'bp_diastolica',
  bp_systolic: 'bp_sistolica',
  bp_diastolic: 'bp_diastolica',

  // spo2
  spo2: 'spo2_pct',
  oxygen_saturation: 'spo2_pct',

  // temperatura
  temp_c: 'temperatura',
  temperature: 'temperatura',

  // pasos, sueño, estrés
  steps: 'actividad_pasos',
  step_count: 'actividad_pasos',
  sleep_hours: 'horas_sueno',
  sleep_minutes: 'horas_sueno',
  stress_level: 'nivel_estres',

  // antropométricos
  weight: 'peso_kg',
  weight_kg: 'peso_kg',
  height: 'altura_cm',
  height_cm: 'altura_cm',
};

export function mapMetricKeys(dato: DatosRelojInsert): DatosRelojInsert {
  const out: any = {};
  for (const [k, v] of Object.entries(dato)) {
    // preserve metadata fields as-is
    if (['id', 'id_usuario', 'recorded_at', 'sospechoso', 'created_at', 'updated_at'].includes(k)) {
      out[k] = v;
      continue;
    }
    const target = ALIAS_MAP[k] ?? k;
    // if multiple aliases map to same target, later ones will override; acceptable for normalization
    out[target] = v;
  }
  return out as DatosRelojInsert;
}

export function mapMetricKeysBatch(datos: DatosRelojInsert[]): DatosRelojInsert[] {
  return datos.map(d => mapMetricKeys(d));
}

export default { mapMetricKeys, mapMetricKeysBatch };
