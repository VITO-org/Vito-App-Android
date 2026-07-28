export type ClinicaVital =
  | 'frecuencia_cardiaca'
  | 'presion_sistolica'
  | 'presion_diastolica'
  | 'saturacion_oxigeno'
  | 'temperatura';

export interface NormalRange {
  min: number;
  max: number;
}

export interface FisiologicRange {
  min: number;
  max: number;
}

export const CANONICAL_UNITS: Record<ClinicaVital, string> = {
  frecuencia_cardiaca: 'lpm',
  presion_sistolica: 'mmHg',
  presion_diastolica: 'mmHg',
  saturacion_oxigeno: '%',
  temperatura: '°C',
};

export const NORMAL_RANGES: Record<ClinicaVital, NormalRange> = {
  frecuencia_cardiaca: { min: 60, max: 100 },
  presion_sistolica: { min: 90, max: 120 },
  presion_diastolica: { min: 60, max: 80 },
  saturacion_oxigeno: { min: 95, max: 100 },
  temperatura: { min: 36.0, max: 37.5 },
};

export const PHYSIOLOGIC_RANGES: Record<ClinicaVital, FisiologicRange> = {
  frecuencia_cardiaca: { min: 55, max: 120 },
  presion_sistolica: { min: 85, max: 140 },
  presion_diastolica: { min: 55, max: 95 },
  saturacion_oxigeno: { min: 88, max: 100 },
  temperatura: { min: 35.5, max: 39.0 },
};

export interface NormalizedVitalResult {
  value: number | null;
  unidad: string;
  fueraDeRango: boolean;
  sospechoso: boolean;
}

function roundValue(tipo: ClinicaVital, value: number): number {
  return tipo === 'temperatura' ? parseFloat(value.toFixed(1)) : Math.round(value);
}

export function normalizeVital(
  tipo: ClinicaVital,
  value: number | null,
  unit?: string,
): NormalizedVitalResult {
  if (value == null) {
    return { value: null, unidad: CANONICAL_UNITS[tipo], fueraDeRango: false, sospechoso: false };
  }

  let normalized = value;

  switch (tipo) {
    case 'temperatura':
      if (unit === '°F' || unit?.toLowerCase?.() === 'f') {
        normalized = (value - 32) * (5 / 9);
      }
      break;
    case 'saturacion_oxigeno':
      if (unit === 'fracción' || unit === 'fraction') {
        normalized = value * 100;
      }
      break;
    default:
      break;
  }

  normalized = roundValue(tipo, normalized);
  const normal = NORMAL_RANGES[tipo];
  const physio = PHYSIOLOGIC_RANGES[tipo];
  const fueraDeRango = normalized < normal.min || normalized > normal.max;
  const sospechoso = normalized < physio.min || normalized > physio.max;

  return {
    value: normalized,
    unidad: CANONICAL_UNITS[tipo],
    fueraDeRango,
    sospechoso,
  };
}
