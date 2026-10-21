import type { DatoSaludMLInsert, DatosReloj, DatosRelojInsert, FuenteDato } from './supabase/models';

export interface MetricReloj {
  columna: keyof DatosReloj;
  tipo_metrica: string;
  unidad: string;
}

export const DATOS_RELOJ_METRICAS: MetricReloj[] = [
  { columna: 'bp_sistolica', tipo_metrica: 'bp_sistolica', unidad: 'mmHg' },
  { columna: 'bp_diastolica', tipo_metrica: 'bp_diastolica', unidad: 'mmHg' },
  { columna: 'frec_cardiaca_bpm', tipo_metrica: 'frec_cardiaca_bpm', unidad: 'lpm' },
  { columna: 'spo2_pct', tipo_metrica: 'spo2_pct', unidad: '%' },
  { columna: 'temperatura', tipo_metrica: 'temperatura', unidad: '°C' },
  { columna: 'nivel_estres', tipo_metrica: 'nivel_estres', unidad: 'nivel' },
  { columna: 'actividad_pasos', tipo_metrica: 'actividad_pasos', unidad: 'pasos' },
  { columna: 'horas_sueno', tipo_metrica: 'horas_sueno', unidad: 'horas' },
];

export function expandDatosRelojToDatoSaludML(
  dato: DatosRelojInsert,
  fuente: FuenteDato,
): DatoSaludMLInsert[] {
  const recordedAt = dato.recorded_at ?? new Date().toISOString();

  return DATOS_RELOJ_METRICAS.filter(metric => dato[metric.columna] != null).map(metric => ({
    id_usuario: dato.id_usuario,
    tipo_metrica: metric.tipo_metrica,
    valor: Number(dato[metric.columna]),
    unidad: metric.unidad,
    fuente,
    recorded_at: recordedAt,
  }));
}