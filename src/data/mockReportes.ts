export type TipoSignoVital =
  | 'frecuencia_cardiaca'
  | 'presion_sistolica'
  | 'presion_diastolica'
  | 'saturacion_oxigeno'
  | 'temperatura';

export type VistaReporte = 'daily' | 'weekly' | 'monthly';

export interface MockRegistro {
  label: string;
  value: number;
  isAbnormal: boolean;
  timestamp: Date;
}

export interface NormalRange {
  min: number;
  max: number;
}

export const NORMAL_RANGES: Record<TipoSignoVital, NormalRange> = {
  frecuencia_cardiaca: {min: 60, max: 100},
  presion_sistolica: {min: 90, max: 120},
  presion_diastolica: {min: 60, max: 80},
  saturacion_oxigeno: {min: 95, max: 100},
  temperatura: {min: 36.0, max: 37.5},
};

const ABS_MIN_MAX: Record<TipoSignoVital, {min: number; max: number}> = {
  frecuencia_cardiaca: {min: 55, max: 120},
  presion_sistolica: {min: 85, max: 140},
  presion_diastolica: {min: 55, max: 95},
  saturacion_oxigeno: {min: 88, max: 100},
  temperatura: {min: 35.5, max: 39.0},
};

const DAY_ABBREVIATIONS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function generarValor(
  normalMin: number,
  normalMax: number,
  absMin: number,
  absMax: number,
  tipo: TipoSignoVital,
): number {
  const isNormal = Math.random() < 0.8;
  let raw: number;
  if (isNormal) {
    raw = normalMin + Math.random() * (normalMax - normalMin);
  } else if (Math.random() < 0.5) {
    raw = absMin + Math.random() * (normalMin - absMin);
  } else {
    raw = normalMax + Math.random() * (absMax - normalMax);
  }
  return tipo === 'temperatura' ? parseFloat(raw.toFixed(1)) : Math.round(raw);
}

export function generarDatosDiarios(
  tipoSigno: TipoSignoVital,
  fechaInicio: Date,
  cantidadHoras: number = 8,
): MockRegistro[] {
  const r = NORMAL_RANGES[tipoSigno];
  const abs = ABS_MIN_MAX[tipoSigno];
  const resultados: MockRegistro[] = [];

  for (let i = 0; i < cantidadHoras; i++) {
    const value = generarValor(r.min, r.max, abs.min, abs.max, tipoSigno);
    const date = new Date(fechaInicio);
    date.setHours(date.getHours() + i);
    resultados.push({
      label: `${String(date.getHours()).padStart(2, '0')}:00`,
      value,
      isAbnormal: value < r.min || value > r.max,
      timestamp: new Date(date),
    });
  }
  return resultados;
}

export function generarDatosSemanales(
  tipoSigno: TipoSignoVital,
  fechaInicio: Date,
  cantidadDias: number = 7,
): MockRegistro[] {
  const r = NORMAL_RANGES[tipoSigno];
  const abs = ABS_MIN_MAX[tipoSigno];
  const resultados: MockRegistro[] = [];

  for (let i = 0; i < cantidadDias; i++) {
    const value = generarValor(r.min, r.max, abs.min, abs.max, tipoSigno);
    const date = new Date(fechaInicio);
    date.setDate(date.getDate() + i);
    resultados.push({
      label: DAY_ABBREVIATIONS[date.getDay()],
      value,
      isAbnormal: value < r.min || value > r.max,
      timestamp: new Date(date),
    });
  }
  return resultados;
}

export function generarDatosMensuales(
  tipoSigno: TipoSignoVital,
  _fechaInicio: Date,
  cantidadSemanas: number = 4,
): MockRegistro[] {
  const r = NORMAL_RANGES[tipoSigno];
  const abs = ABS_MIN_MAX[tipoSigno];
  const resultados: MockRegistro[] = [];

  for (let i = 0; i < cantidadSemanas; i++) {
    const value = generarValor(r.min, r.max, abs.min, abs.max, tipoSigno);
    resultados.push({
      label: `Sem ${i + 1}`,
      value,
      isAbnormal: value < r.min || value > r.max,
      timestamp: new Date(),
    });
  }
  return resultados;
}
