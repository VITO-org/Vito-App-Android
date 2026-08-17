// ──────────────────────────────────────────────
// HU-95: Exportación de históricos de datos de paciente
// Formatos ML-compatible: CSV, JSON estructado
// ──────────────────────────────────────────────

import { supabase } from './supabase/client';
import type {
  DatosReloj,
  SintomasUsuario,
  BaselineClinico,
  FactoresRiesgoCardiaco,
  PromedioSemanalML,
} from './supabase/models';

// ─── Tipos de exportación ───

export type ExportFormat = 'csv' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  from?: string;  // ISO date
  to?: string;    // ISO date
}

export interface ExportRow {
  recorded_at: string;
  source: string;
  feature: string;
  value: number | string | boolean | null;
  unit: string | null;
  metadata: Record<string, unknown>;
}

export interface ExportResult {
  data: string;
  format: ExportFormat;
  rowCount: number;
  sizeBytes: number;
  generatedAt: string;
}

// ─── Constantes ───

const MAX_EXPORT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// ─── Funciones de fetch ───

async function fetchDatosReloj(
  userId: string,
  from?: string,
  to?: string,
): Promise<DatosReloj[]> {
  let query = supabase
    .from('datos_reloj')
    .select('*')
    .eq('id_usuario', userId)
    .order('recorded_at', { ascending: true });

  if (from) query = query.gte('recorded_at', from);
  if (to) query = query.lte('recorded_at', to);

  const { data, error } = await query;
  if (error) throw error;
  return (data as DatosReloj[]) ?? [];
}

async function fetchSintomasUsuario(
  userId: string,
  from?: string,
  to?: string,
): Promise<SintomasUsuario[]> {
  let query = supabase
    .from('sintomas_usuario')
    .select('*')
    .eq('id_usuario', userId)
    .order('recorded_at', { ascending: true });

  if (from) query = query.gte('recorded_at', from);
  if (to) query = query.lte('recorded_at', to);

  const { data, error } = await query;
  if (error) throw error;
  return (data as SintomasUsuario[]) ?? [];
}

async function fetchBaseline(userId: string): Promise<BaselineClinico | null> {
  const { data, error } = await supabase
    .from('baseline_clinico')
    .select('*')
    .eq('id_usuario', userId)
    .maybeSingle();
  if (error) throw error;
  return data as BaselineClinico | null;
}

async function fetchFactoresRiesgo(
  userId: string,
): Promise<FactoresRiesgoCardiaco | null> {
  const { data, error } = await supabase
    .from('factores_riesgo_cardiaco')
    .select('*')
    .eq('id_usuario', userId)
    .maybeSingle();
  if (error) throw error;
  return data as FactoresRiesgoCardiaco | null;
}

async function fetchPromediosSemanales(
  userId: string,
): Promise<PromedioSemanalML[]> {
  const { data, error } = await supabase
    .from('promedio_semanal_ml')
    .select('*')
    .eq('id_usuario', userId)
    .order('semana_inicio', { ascending: true });
  if (error) throw error;
  return (data as PromedioSemanalML[]) ?? [];
}

// ─── Transformación a ExportRow ───

function datosRelojToRows(data: DatosReloj[]): ExportRow[] {
  const rows: ExportRow[] = [];

  for (const d of data) {
    const ts = d.recorded_at ?? '';
    const meta = { id: d.id, sospechoso: d.sospechoso };

    if (d.frec_cardiaca_bpm != null) {
      rows.push({ recorded_at: ts, source: 'datos_reloj', feature: 'frecuencia_cardiaca', value: d.frec_cardiaca_bpm, unit: 'lpm', metadata: meta });
    }
    if (d.bp_sistolica != null) {
      rows.push({ recorded_at: ts, source: 'datos_reloj', feature: 'presion_sistolica', value: d.bp_sistolica, unit: 'mmHg', metadata: meta });
    }
    if (d.bp_diastolica != null) {
      rows.push({ recorded_at: ts, source: 'datos_reloj', feature: 'presion_diastolica', value: d.bp_diastolica, unit: 'mmHg', metadata: meta });
    }
    if (d.spo2_pct != null) {
      rows.push({ recorded_at: ts, source: 'datos_reloj', feature: 'saturacion_oxigeno', value: d.spo2_pct, unit: '%', metadata: meta });
    }
    if (d.temperatura != null) {
      rows.push({ recorded_at: ts, source: 'datos_reloj', feature: 'temperatura', value: d.temperatura, unit: '°C', metadata: meta });
    }
    if (d.nivel_estres != null) {
      rows.push({ recorded_at: ts, source: 'datos_reloj', feature: 'nivel_estres', value: d.nivel_estres, unit: null, metadata: meta });
    }
    if (d.actividad_pasos != null) {
      rows.push({ recorded_at: ts, source: 'datos_reloj', feature: 'actividad_pasos', value: d.actividad_pasos, unit: 'pasos', metadata: meta });
    }
    if (d.horas_sueno != null) {
      rows.push({ recorded_at: ts, source: 'datos_reloj', feature: 'horas_sueno', value: d.horas_sueno, unit: 'hrs', metadata: meta });
    }
  }

  return rows;
}

function sintomasToRows(data: SintomasUsuario[]): ExportRow[] {
  return data.map(s => ({
    recorded_at: s.recorded_at ?? '',
    source: 'sintomas_usuario',
    feature: `sintoma_${s.categoria}`,
    value: s.intensidad ?? s.descripcion ?? null,
    unit: s.intensidad != null ? 'intensidad_1_5' : null,
    metadata: {
      id_sintomas: s.id_sintomas,
      descripcion: s.descripcion,
      origen: s.origen,
      fecha: s.fecha,
      hora: s.hora,
    },
  }));
}

function baselineToRows(baseline: BaselineClinico | null): ExportRow[] {
  if (!baseline) return [];

  const ts = baseline.updated_at ?? '';
  const meta = { id: baseline.id, source: 'baseline_clinico' };
  const rows: ExportRow[] = [];

  if (baseline.hr_min != null) rows.push({ recorded_at: ts, source: 'baseline_clinico', feature: 'hr_min', value: baseline.hr_min, unit: 'lpm', metadata: meta });
  if (baseline.hr_max != null) rows.push({ recorded_at: ts, source: 'baseline_clinico', feature: 'hr_max', value: baseline.hr_max, unit: 'lpm', metadata: meta });
  if (baseline.bp_sist_min != null) rows.push({ recorded_at: ts, source: 'baseline_clinico', feature: 'bp_sist_min', value: baseline.bp_sist_min, unit: 'mmHg', metadata: meta });
  if (baseline.bp_sist_max != null) rows.push({ recorded_at: ts, source: 'baseline_clinico', feature: 'bp_sist_max', value: baseline.bp_sist_max, unit: 'mmHg', metadata: meta });
  if (baseline.bp_diast_min != null) rows.push({ recorded_at: ts, source: 'baseline_clinico', feature: 'bp_diast_min', value: baseline.bp_diast_min, unit: 'mmHg', metadata: meta });
  if (baseline.bp_diast_max != null) rows.push({ recorded_at: ts, source: 'baseline_clinico', feature: 'bp_diast_max', value: baseline.bp_diast_max, unit: 'mmHg', metadata: meta });
  if (baseline.spo2_min != null) rows.push({ recorded_at: ts, source: 'baseline_clinico', feature: 'spo2_min', value: baseline.spo2_min, unit: '%', metadata: meta });
  if (baseline.temp_min != null) rows.push({ recorded_at: ts, source: 'baseline_clinico', feature: 'temp_min', value: baseline.temp_min, unit: '°C', metadata: meta });
  if (baseline.temp_max != null) rows.push({ recorded_at: ts, source: 'baseline_clinico', feature: 'temp_max', value: baseline.temp_max, unit: '°C', metadata: meta });

  return rows;
}

function factoresRiesgoToRows(factores: FactoresRiesgoCardiaco | null): ExportRow[] {
  if (!factores) return [];

  const ts = factores.updated_at ?? '';
  const meta = { source: 'factores_riesgo_cardiaco' };
  const rows: ExportRow[] = [];

  if (factores.diabetes != null) rows.push({ recorded_at: ts, source: 'factores_riesgo', feature: 'diabetes', value: factores.diabetes, unit: null, metadata: meta });
  if (factores.antecedentes_familiares != null) rows.push({ recorded_at: ts, source: 'factores_riesgo', feature: 'antecedentes_familiares', value: factores.antecedentes_familiares, unit: null, metadata: meta });
  if (factores.fumador != null) rows.push({ recorded_at: ts, source: 'factores_riesgo', feature: 'fumador', value: factores.fumador, unit: null, metadata: meta });
  if (factores.obesidad != null) rows.push({ recorded_at: ts, source: 'factores_riesgo', feature: 'obesidad', value: factores.obesidad, unit: null, metadata: meta });
  if (factores.consumo_alcohol != null) rows.push({ recorded_at: ts, source: 'factores_riesgo', feature: 'consumo_alcohol', value: factores.consumo_alcohol, unit: null, metadata: meta });
  if (factores.tipo_dieta != null) rows.push({ recorded_at: ts, source: 'factores_riesgo', feature: 'tipo_dieta', value: factores.tipo_dieta, unit: null, metadata: meta });
  if (factores.problemas_cardiacos_previos != null) rows.push({ recorded_at: ts, source: 'factores_riesgo', feature: 'problemas_cardiacos_previos', value: factores.problemas_cardiacos_previos, unit: null, metadata: meta });
  if (factores.uso_medicacion != null) rows.push({ recorded_at: ts, source: 'factores_riesgo', feature: 'uso_medicacion', value: factores.uso_medicacion, unit: null, metadata: meta });

  return rows;
}

function promediosSemanalesToRows(data: PromedioSemanalML[]): ExportRow[] {
  const rows: ExportRow[] = [];

  for (const p of data) {
    const ts = p.semana_inicio ?? '';
    const meta = { id: p.id, total_lecturas: p.total_lecturas };

    if (p.frec_cardiaca_prom != null) rows.push({ recorded_at: ts, source: 'promedio_semanal', feature: 'frec_cardiaca_prom', value: p.frec_cardiaca_prom, unit: 'lpm', metadata: meta });
    if (p.bp_sistolica_prom != null) rows.push({ recorded_at: ts, source: 'promedio_semanal', feature: 'bp_sistolica_prom', value: p.bp_sistolica_prom, unit: 'mmHg', metadata: meta });
    if (p.bp_diastolica_prom != null) rows.push({ recorded_at: ts, source: 'promedio_semanal', feature: 'bp_diastolica_prom', value: p.bp_diastolica_prom, unit: 'mmHg', metadata: meta });
    if (p.spo2_prom != null) rows.push({ recorded_at: ts, source: 'promedio_semanal', feature: 'spo2_prom', value: p.spo2_prom, unit: '%', metadata: meta });
    if (p.nivel_estres_prom != null) rows.push({ recorded_at: ts, source: 'promedio_semanal', feature: 'nivel_estres_prom', value: p.nivel_estres_prom, unit: null, metadata: meta });
    if (p.pasos_diarios_prom != null) rows.push({ recorded_at: ts, source: 'promedio_semanal', feature: 'pasos_diarios_prom', value: p.pasos_diarios_prom, unit: 'pasos', metadata: meta });
    if (p.horas_sueno_prom != null) rows.push({ recorded_at: ts, source: 'promedio_semanal', feature: 'horas_sueno_prom', value: p.horas_sueno_prom, unit: 'hrs', metadata: meta });
  }

  return rows;
}

// ─── Deduplicación y orden cronológico ───

function deduplicateAndSort(rows: ExportRow[]): ExportRow[] {
  const seen = new Set<string>();

  const unique = rows.filter(row => {
    const key = `${row.recorded_at}|${row.source}|${row.feature}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.sort((a, b) => {
    if (a.recorded_at < b.recorded_at) return -1;
    if (a.recorded_at > b.recorded_at) return 1;
    if (a.source < b.source) return -1;
    if (a.source > b.source) return 1;
    return a.feature.localeCompare(b.feature);
  });
}

// ─── Conversión a CSV ───

function toCSV(rows: ExportRow[]): string {
  const headers = ['recorded_at', 'source', 'feature', 'value', 'unit'];
  const lines = [headers.join(',')];

  for (const row of rows) {
    const escaped = (val: string) => `"${val.replace(/"/g, '""')}"`;
    lines.push([
      escaped(row.recorded_at),
      escaped(row.source),
      escaped(row.feature),
      row.value != null ? String(row.value) : '',
      row.unit != null ? escaped(row.unit) : '',
    ].join(','));
  }

  return lines.join('\n');
}

// ─── Conversión a JSON estructado ───

function toJSON(rows: ExportRow[]): string {
  const structured = {
    metadata: {
      exportedAt: new Date().toISOString(),
      rowCount: rows.length,
      format: 'vito_ml_v1',
    },
    timeseries: rows.map(row => ({
      t: row.recorded_at,
      src: row.source,
      feat: row.feature,
      val: row.value,
      unit: row.unit,
    })),
  };

  return JSON.stringify(structured, null, 2);
}

// ─── Validación de tamaño ───

function validateSize(content: string): void {
  const bytes = new TextEncoder().encode(content).length;
  if (bytes > MAX_EXPORT_SIZE_BYTES) {
    throw new Error(
      `El archivo exportado excede el límite de 10MB ` +
      `(${(bytes / 1024 / 1024).toFixed(2)} MB). ` +
      `Intenta filtrar por rango de fechas.`
    );
  }
}

// ─── Función principal de exportación ───

export async function exportPatientData(
  userId: string,
  options: ExportOptions,
): Promise<ExportResult> {
  // 1. Fetch all data sources in parallel
  const [datosReloj, sintomas, baseline, factores, promedios] = await Promise.all([
    fetchDatosReloj(userId, options.from, options.to),
    fetchSintomasUsuario(userId, options.from, options.to),
    fetchBaseline(userId),
    fetchFactoresRiesgo(userId),
    fetchPromediosSemanales(userId),
  ]);

  // 2. Transform to unified ExportRow format
  const allRows: ExportRow[] = [
    ...datosRelojToRows(datosReloj),
    ...sintomasToRows(sintomas),
    ...baselineToRows(baseline),
    ...factoresRiesgoToRows(factores),
    ...promediosSemanalesToRows(promedios),
  ];

  // 3. Deduplicate and sort chronologically
  const cleanRows = deduplicateAndSort(allRows);

  // 4. Convert to requested format
  let data: string;
  if (options.format === 'csv') {
    data = toCSV(cleanRows);
  } else {
    data = toJSON(cleanRows);
  }

  // 5. Validate size
  validateSize(data);

  return {
    data,
    format: options.format,
    rowCount: cleanRows.length,
    sizeBytes: new TextEncoder().encode(data).length,
    generatedAt: new Date().toISOString(),
  };
}
