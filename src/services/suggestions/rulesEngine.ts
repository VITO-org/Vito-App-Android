/**
 * HU-34 Fase A — Motor de reglas local (función pura sincrónica).
 *
 * Sin red, sin AsyncStorage adentro: testeable en jest sin mocks nativos.
 * Umbrales por defecto PENDIENTES DE VALIDACIÓN CLÍNICA.
 */
import type {HealthSummary} from '../../types/health';
import type {Suggestion, SuggestionInput, SuggestionProvider, PrioridadSugerencia} from './types';

/**
 * Umbrales por defecto — pendientes de validación clínica.
 * Documentados aquí para revisión médica futura (fase B/C).
 */
export const UMBRALES_SUGERENCIAS = {
  fcAlta: 100,
  fcBaja: 60,
  paSistolicaAlta: 130,
  paDiastolicaAlta: 85,
  spo2Baja: 95,
  tempAlta: 37.5,
  tempBaja: 36.0,
  pasosBajos: 5000,
  suenoBajoMin: 360, // 6h
} as const;

const RANK: Record<PrioridadSugerencia, number> = {Alta: 0, Media: 1, Baja: 2};

/**
 * Evalúa el HealthSummary y devuelve sugerencias tipadas.
 * Función pura: mismo input → mismo output, sin efectos laterales.
 */
export function getSuggestions(input: SuggestionInput): Suggestion[] {
  const summary: HealthSummary | null = input?.summary ?? null;
  if (!summary) return [];

  const out: Suggestion[] = [];
  const U = UMBRALES_SUGERENCIAS;

  // ── FC alta ──
  if (summary.averageBpm != null && summary.averageBpm > U.fcAlta) {
    out.push({
      id: 'fc-alta',
      icon: '💓',
      titulo: 'Frecuencia cardíaca elevada',
      prioridad: 'Alta',
      descripcion:
        'Tu frecuencia cardíaca promedio está por encima del rango habitual. Conviene bajar el ritmo y observar cómo evoluciona.',
      motivo: `Promedio ${Math.round(summary.averageBpm)} lpm (umbral > ${U.fcAlta} lpm)`,
      acciones: [
        'Evitá esfuerzos intensos por hoy',
        'Hidratate y descansá unos minutos',
        'Si persiste o hay síntomas, consultá a tu médico',
      ],
      fueraDeRango: true,
    });
  }

  // ── FC baja ──
  if (summary.averageBpm != null && summary.averageBpm < U.fcBaja) {
    out.push({
      id: 'fc-baja',
      icon: '💓',
      titulo: 'Frecuencia cardíaca baja',
      prioridad: 'Alta',
      descripcion:
        'Tu frecuencia cardíaca promedio está por debajo del rango habitual. Prestá atención a mareos o cansancio.',
      motivo: `Promedio ${Math.round(summary.averageBpm)} lpm (umbral < ${U.fcBaja} lpm)`,
      acciones: [
        'Evitá cambios bruscos de postura',
        'Si hay mareos o desmayo, buscá atención médica',
        'Registrá el episodio en tus síntomas',
      ],
      fueraDeRango: true,
    });
  }

  // ── Presión arterial ──
  if (
    (summary.bloodPressureSystolic != null && summary.bloodPressureSystolic >= U.paSistolicaAlta) ||
    (summary.bloodPressureDiastolic != null && summary.bloodPressureDiastolic >= U.paDiastolicaAlta)
  ) {
    const sis = summary.bloodPressureSystolic != null ? Math.round(summary.bloodPressureSystolic) : '--';
    const dia = summary.bloodPressureDiastolic != null ? Math.round(summary.bloodPressureDiastolic) : '--';
    out.push({
      id: 'pa-alta',
      icon: '❤️',
      titulo: 'Presión arterial elevada',
      prioridad: 'Alta',
      descripcion:
        'Tu presión arterial está por encima del rango de referencia. Reducí la sal y el estrés, y volvé a medirla en reposo.',
      motivo: `Registro ${sis}/${dia} mmHg (umbral ≥ ${U.paSistolicaAlta}/${U.paDiastolicaAlta})`,
      acciones: [
        'Reposá 5 minutos y volvé a medir',
        'Evitá café y sal en exceso hoy',
        'Si supera 140/90 o hay síntomas, consultá a tu médico',
      ],
      fueraDeRango: true,
    });
  }

  // ── SpO2 baja ──
  if (summary.spo2Percent != null && summary.spo2Percent < U.spo2Baja) {
    out.push({
      id: 'spo2-baja',
      icon: '🩸',
      titulo: 'Oxigenación baja',
      prioridad: 'Alta',
      descripcion:
        'Tu saturación de oxígeno está por debajo del nivel esperado. Ventilá el ambiente y respirá profundo.',
      motivo: `SpO₂ ${Math.round(summary.spo2Percent)}% (umbral < ${U.spo2Baja}%)`,
      acciones: [
        'Sentate y hacé respiraciones lentas y profundas',
        'Ventilá el ambiente',
        'Si baja de 92% o hay falta de aire, buscá atención médica',
      ],
      fueraDeRango: true,
    });
  }

  // ── Temperatura ──
  if (summary.bodyTemperatureCelsius != null && summary.bodyTemperatureCelsius > U.tempAlta) {
    out.push({
      id: 'temp-alta',
      icon: '🌡️',
      titulo: 'Temperatura elevada',
      prioridad: 'Media',
      descripcion:
        'Tu temperatura corporal está algo elevada. Descansá e hidratate, y controlala en unas horas.',
      motivo: `${summary.bodyTemperatureCelsius.toFixed(1)}°C (umbral > ${U.tempAlta}°C)`,
      acciones: ['Descansá e hidratate', 'Volvé a medir en 2–3 horas', 'Si supera 38°C o hay síntomas, consultá'],
      fueraDeRango: true,
    });
  } else if (summary.bodyTemperatureCelsius != null && summary.bodyTemperatureCelsius < U.tempBaja) {
    out.push({
      id: 'temp-baja',
      icon: '🌡️',
      titulo: 'Temperatura baja',
      prioridad: 'Media',
      descripcion: 'Tu temperatura corporal está algo baja. Abrigate y evitá el frío.',
      motivo: `${summary.bodyTemperatureCelsius.toFixed(1)}°C (umbral < ${U.tempBaja}°C)`,
      acciones: ['Abrígate y evitá ambientes fríos', 'Tomá algo tibio', 'Si persiste, consultá'],
      fueraDeRango: true,
    });
  }

  // ── Pasos bajos ──
  if (summary.steps != null && summary.steps < U.pasosBajos) {
    out.push({
      id: 'pasos-bajos',
      icon: '👣',
      titulo: 'Movete un poco más',
      prioridad: 'Baja',
      descripcion:
        'Hoy caminaste menos de lo recomendado. Una caminata corta ayuda a tu corazón y tu ánimo.',
      motivo: `${Math.round(summary.steps).toLocaleString('es-ES')} pasos (meta ≥ ${U.pasosBajos.toLocaleString('es-ES')})`,
      acciones: ['Salí a caminar 15–20 minutos', 'Subí escaleras en vez del ascensor', 'Movéte cada hora'],
      fueraDeRango: false,
    });
  }

  // ── Sueño corto ──
  if (summary.sleepMinutes != null && summary.sleepMinutes < U.suenoBajoMin) {
    const hs = (summary.sleepMinutes / 60).toFixed(1);
    out.push({
      id: 'sueno-corto',
      icon: '😴',
      titulo: 'Dormiste poco',
      prioridad: 'Media',
      descripcion:
        'Dormir menos de 6 horas afecta tu presión y tu energía. Hoy priorizá un buen descanso.',
      motivo: `${hs} h de sueño (recomendado ≥ 6 h)`,
      acciones: [
        'Acostate más temprano esta noche',
        'Evitá pantallas 1 hora antes de dormir',
        'Evitá cafeína después del mediodía',
      ],
      fueraDeRango: false,
    });
  }

  // ── R2 Ordenamiento: Alta > Media > Baja; desempate fueraDeRango primero; id estable ──
  out.sort((a, b) => {
    const byPrio = RANK[a.prioridad] - RANK[b.prioridad];
    if (byPrio !== 0) return byPrio;
    if (a.fueraDeRango !== b.fueraDeRango) return a.fueraDeRango ? -1 : 1;
    return a.id.localeCompare(b.id);
  });

  return out;
}

/** Provider fase A — envuelve la función pura para inyección futura (fase C LLM). */
export class RulesSuggestionProvider implements SuggestionProvider {
  getSuggestions(input: SuggestionInput): Suggestion[] {
    return getSuggestions(input);
  }
}
