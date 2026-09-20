/**
 * HU-34 Fase A — Motor de reglas local (función pura sincrónica).
 *
 * Sin red, sin AsyncStorage adentro: testeable en jest sin mocks nativos.
 * Umbrales por defecto PENDIENTES DE VALIDACIÓN CLÍNICA.
 *
 * SCRUM-202: extensión para diferenciar alertas vs sugerencias.
 * - Suprime sugerencias duplicadas si hay alerta activa del mismo vital.
 * - Agrega reglas de bienestar: tendencia pasos, tendencia sueño, racha.
 * - Agrega reglas de recuperación: post-alerta + HRV bajo.
 */
import type {HealthSummary} from '../../types/health';
import type {Suggestion, SuggestionInput, SuggestionProvider, PrioridadSugerencia} from './types';
import type {TendenciasSalud} from './supabaseMapper';
import type {AlertType} from '../alerts/types';

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

/**
 * Umbrales de bienestar (SCRUM-202) — comparan contra tendencias 14d.
 */
export const UMBRALES_BIENESTAR = {
  /** Umbral absoluto de pasos (fallback si no hay tendencias). */
  pasosBajosAbs: 5000,
  /** Caída de pasos vs 14d que dispara sugerencia (0.7 = 30% menos). */
  pasosCaida: 0.7,
  /** Umbral absoluto de sueño (fallback si no hay tendencias). */
  suenoBajoAbs: 360,
  /** Deuda de sueño acumulada que dispara sugerencia (en minutos). */
  suenoDeuda: 300,
  /** Días consecutivos de sueño bajo para "racha". */
  rachaDias: 3,
  /** Días mínimos de datos 3d para evaluar tendencia. */
  minDias3d: 2,
} as const;

const RANK: Record<PrioridadSugerencia, number> = {Alta: 0, Media: 1, Baja: 2};

// ══════════════════════════════════════════════════════════════════
// Mapeo alerta → sugerencia (SCRUM-202: supresión)
// ══════════════════════════════════════════════════════════════════

/** Si hay alerta activa de este tipo, suprimir la sugerencia correspondiente. */
const ALERTA_TO_SUPPRESS: Partial<Record<AlertType, string[]>> = {
  taquicardia: ['fc-alta'],
  bradicardia: ['fc-baja'],
  hipertension: ['pa-alta'],
  hipoxia: ['spo2-baja'],
};

// ══════════════════════════════════════════════════════════════════
// Función principal
// ══════════════════════════════════════════════════════════════════

/**
 * Evalúa el HealthSummary y devuelve sugerencias tipadas.
 * Función pura: mismo input → mismo output, sin efectos laterales.
 *
 * SCRUM-202: acepta tendencias y alertas activas para supresión y
 * reglas de bienestar / recuperación.
 */
export function getSuggestions(input: SuggestionInput): Suggestion[] {
  const summary: HealthSummary | null = input?.summary ?? null;
  const tendencias: TendenciasSalud | null = input?.tendencias ?? null;
  const alertasActivas: AlertType[] = input?.alertasActivas ?? [];
  if (!summary) return [];

  const out: Suggestion[] = [];
  const U = UMBRALES_SUGERENCIAS;
  const B = UMBRALES_BIENESTAR;

  // ── Conjunto de IDs suprimidos por alertas activas ──
  const suppressed = new Set<string>();
  for (const tipo of alertasActivas) {
    const ids = ALERTA_TO_SUPPRESS[tipo];
    if (ids) ids.forEach(id => suppressed.add(id));
  }

  // ── FC alta (suprime si taquicardia activa) ──
  if (summary.averageBpm != null && summary.averageBpm > U.fcAlta && !suppressed.has('fc-alta')) {
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

  // ── FC baja (suprime si bradicardia activa) ──
  if (summary.averageBpm != null && summary.averageBpm < U.fcBaja && !suppressed.has('fc-baja')) {
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

  // ── Presión arterial (suprime si hipertensión activa) ──
  if (
    !suppressed.has('pa-alta') &&
    ((summary.bloodPressureSystolic != null && summary.bloodPressureSystolic >= U.paSistolicaAlta) ||
    (summary.bloodPressureDiastolic != null && summary.bloodPressureDiastolic >= U.paDiastolicaAlta))
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

  // ── SpO2 baja (suprime si hipoxia activa) ──
  if (summary.spo2Percent != null && summary.spo2Percent < U.spo2Baja && !suppressed.has('spo2-baja')) {
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

  // ── Temperatura (sin supresión, no tiene alerta dedicada) ──
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

  // ── Pasos bajos (umbral absoluto, fallback sin tendencias) ──
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

  // ── Sueño corto (umbral absoluto, fallback sin tendencias) ──
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

  // ══════════════════════════════════════════════════════════════════
  // REGLAS DE BIENESTAR (SCRUM-202) — solo si hay tendencias 14d
  // ══════════════════════════════════════════════════════════════════

  if (tendencias) {
    // ── R-B1: Pasos en caída vs tu media ──
    if (
      tendencias.avgPasos3d > 0 &&
      tendencias.tendenciaPasos < B.pasosCaida &&
      !out.some(s => s.id === 'pasos-bajos')
    ) {
      const pct = Math.round((1 - tendencias.tendenciaPasos) * 100);
      out.push({
        id: 'pasos-bajos',
        icon: '👣',
        titulo: 'Venis bajando de actividad',
        prioridad: 'Baja',
        descripcion:
          'Tu promedio de pasos de los últimos 3 días está por debajo de tu media habitual. Una caminata corta ayuda.',
        motivo: `Promedio 3d: ${tendencias.avgPasos3d.toLocaleString('es-ES')} vs tu media 14d: ${tendencias.avgPasos14d.toLocaleString('es-ES')} (${pct}% menos)`,
        acciones: ['Salí a caminar 15–20 minutos', 'Subí escaleras en vez del ascensor', 'Movéte cada hora'],
        fueraDeRango: false,
      });
    }

    // ── R-B2: Sueño con deuda acumulada ──
    if (
      tendencias.deudaSuenoMin >= B.suenoDeuda &&
      !out.some(s => s.id === 'sueno-corto')
    ) {
      const deudaH = (tendencias.deudaSuenoMin / 60).toFixed(1);
      const hs3d = (tendencias.avgSueno3dMin / 60).toFixed(1);
      const hs14d = (tendencias.avgSueno14dMin / 60).toFixed(1);
      out.push({
        id: 'sueno-corto',
        icon: '😴',
        titulo: 'Acumulás deuda de sueño',
        prioridad: 'Media',
        descripcion:
          'Dormiste menos que tu promedio varios días seguidos. Tu cuerpo necesita recuperar.',
        motivo: `${hs3d} h últimos 3d vs ${hs14d} h tu media (deuda: ${deudaH} h)`,
        acciones: [
          'Acostate 30 minutos antes esta noche',
          'Evitá pantallas 1 hora antes de dormir',
          'Evitá cafeína después del mediodía',
        ],
        fueraDeRango: false,
      });
    }

    // ── R-B3: Racha de sueño bajo ──
    if (
      tendencias.avgSueno3dMin > 0 &&
      tendencias.avgSueno3dMin < UMBRALES_SUGERENCIAS.suenoBajoMin &&
      !out.some(s => s.id === 'sueno-corto')
    ) {
      const hs3d = (tendencias.avgSueno3dMin / 60).toFixed(1);
      out.push({
        id: 'sueno-corto',
        icon: '😴',
        titulo: 'Dormiste poco varios días',
        prioridad: 'Media',
        descripcion:
          'Tu promedio de sueño de los últimos 3 días está por debajo de 6 horas. Intentá recuperar esta noche.',
        motivo: `Promedio 3d: ${hs3d} h (recomendado ≥ 6 h)`,
        acciones: [
          'Acostate más temprano esta noche',
          'Evitá pantallas antes de dormir',
          'Mantené horario constante',
        ],
        fueraDeRango: false,
      });
    }

    // ── R-R1: Recuperación post-alerta ──
    if (
      alertasActivas.length > 0 &&
      tendencias.avgFc14d != null &&
      tendencias.avgFc14d >= 60 &&
      tendencias.avgFc14d <= 100 &&
      summary.averageBpm != null &&
      summary.averageBpm >= 60 &&
      summary.averageBpm <= 100
    ) {
      out.push({
        id: 'recuperacion-post-alerta',
        icon: '💚',
        titulo: 'Ayer fue intenso, hoy recuperate',
        prioridad: 'Alta',
        descripcion:
          'Tuviste una alerta reciente pero tus signos volvieron a la normalidad. Es buen momento para descansar y recuperar.',
        motivo: `FC actual: ${Math.round(summary.averageBpm)} lpm (tu media 14d: ${Math.round(tendencias.avgFc14d)} lpm)`,
        acciones: [
          'Hoy priorizá actividades suaves',
          'Mantené buena hidratación',
          'Si volvés a sentir síntomas, consultá',
        ],
        fueraDeRango: false,
      });
    }
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
