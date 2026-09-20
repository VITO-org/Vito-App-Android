/**
 * HU-34 Fase A + SCRUM-202 — Tests del motor de reglas (función pura, sin mocks nativos).
 */
import {getSuggestions, RulesSuggestionProvider} from '../rulesEngine';
import type {HealthSummary} from '../../../types/health';
import type {TendenciasSalud} from '../supabaseMapper';
import type {AlertType} from '../../alerts/types';

function baseSummary(over: Partial<HealthSummary> = {}): HealthSummary {
  return {
    steps: 8000,
    distanceMeters: 5000,
    caloriesKcal: 400,
    sleepMinutes: 480,
    averageBpm: 72,
    exerciseSessions: 0,
    bloodPressureSystolic: 118,
    bloodPressureDiastolic: 76,
    spo2Percent: 98,
    bodyTemperatureCelsius: 36.6,
    ...over,
  };
}

function baseTendencias(over: Partial<TendenciasSalud> = {}): TendenciasSalud {
  return {
    avgPasos14d: 8000,
    avgPasos3d: 8000,
    avgSueno14dMin: 480,
    avgSueno3dMin: 480,
    avgFc14d: 72,
    avgSpo214d: 98,
    deudaSuenoMin: 0,
    tendenciaPasos: 1.0,
    ...over,
  };
}

// ══════════════════════════════════════════════════════════════════
// Tests base (sin cambios, compatibles con Fase A)
// ══════════════════════════════════════════════════════════════════

describe('rulesEngine HU-34 Fase A', () => {
  it('caso normal: sin anomalías no genera sugerencias', () => {
    expect(getSuggestions({summary: baseSummary()})).toEqual([]);
  });

  it('summary null: devuelve vacío', () => {
    expect(getSuggestions({summary: null})).toEqual([]);
  });

  it('casos límite: valores justo en el borde no disparan', () => {
    const s = getSuggestions({
      summary: baseSummary({
        averageBpm: 100,
        bloodPressureSystolic: 129,
        bloodPressureDiastolic: 84,
        spo2Percent: 95,
        bodyTemperatureCelsius: 37.5,
        steps: 5000,
        sleepMinutes: 360,
      }),
    });
    expect(s).toEqual([]);
  });

  it('anómalos: FC alta + SpO2 baja + pasos bajos generan 3 sugerencias', () => {
    const s = getSuggestions({
      summary: baseSummary({averageBpm: 112, spo2Percent: 93, steps: 1200}),
    });
    const ids = s.map(x => x.id);
    expect(ids).toContain('fc-alta');
    expect(ids).toContain('spo2-baja');
    expect(ids).toContain('pasos-bajos');
  });

  it('PA alta dispara con sistólica o diastólica', () => {
    expect(getSuggestions({summary: baseSummary({bloodPressureSystolic: 135})}).map(x => x.id)).toContain('pa-alta');
    expect(
      getSuggestions({summary: baseSummary({bloodPressureSystolic: 118, bloodPressureDiastolic: 90})}).map(x => x.id),
    ).toContain('pa-alta');
  });

  it('temperatura alta y baja disparan Media fuera de rango', () => {
    const alta = getSuggestions({summary: baseSummary({bodyTemperatureCelsius: 38.2})});
    expect(alta.map(x => x.id)).toContain('temp-alta');
    expect(alta.find(x => x.id === 'temp-alta')?.prioridad).toBe('Media');

    const baja = getSuggestions({summary: baseSummary({bodyTemperatureCelsius: 35.4})});
    expect(baja.map(x => x.id)).toContain('temp-baja');
  });

  it('sueño corto dispara Media', () => {
    const s = getSuggestions({summary: baseSummary({sleepMinutes: 300})});
    expect(s.map(x => x.id)).toContain('sueno-corto');
  });

  it('ordenamiento: Alta > Media > Baja, fueraDeRango primero, id estable', () => {
    const s = getSuggestions({
      summary: baseSummary({
        averageBpm: 115, // Alta fueraDeRango (fc-alta)
        bodyTemperatureCelsius: 38.1, // Media fueraDeRango (temp-alta)
        steps: 1000, // Baja no-rango (pasos-bajos)
        sleepMinutes: 300, // Media no-rango (sueno-corto)
      }),
    });
    const ids = s.map(x => x.id);
    // Alta primero
    expect(ids[0]).toBe('fc-alta');
    // Luego Media: fueraDeRango (temp-alta) antes que no-rango (sueno-corto)
    expect(ids.indexOf('temp-alta')).toBeLessThan(ids.indexOf('sueno-corto'));
    // Baja al final
    expect(ids[ids.length - 1]).toBe('pasos-bajos');
  });

  it('cada sugerencia trae motivo y acciones no vacías', () => {
    const s = getSuggestions({
      summary: baseSummary({averageBpm: 45, spo2Percent: 90, steps: 500, sleepMinutes: 200}),
    });
    expect(s.length).toBeGreaterThan(0);
    for (const sug of s) {
      expect(sug.motivo.length).toBeGreaterThan(0);
      expect(sug.acciones.length).toBeGreaterThan(0);
      expect(['Alta', 'Media', 'Baja']).toContain(sug.prioridad);
    }
  });

  it('RulesSuggestionProvider delega a la función pura', () => {
    const p = new RulesSuggestionProvider();
    const viaProvider = p.getSuggestions({summary: baseSummary({averageBpm: 120})});
    const directa = getSuggestions({summary: baseSummary({averageBpm: 120})});
    expect(viaProvider).toEqual(directa);
  });
});

// ══════════════════════════════════════════════════════════════════
// Tests SCRUM-202: supresión por alerta activa
// ══════════════════════════════════════════════════════════════════

describe('rulesEngine SCRUM-202: supresión por alerta', () => {
  it('fc-alta suprimida si alerta taquicardia activa', () => {
    const s = getSuggestions({
      summary: baseSummary({averageBpm: 112}),
      alertasActivas: ['taquicardia'],
    });
    expect(s.map(x => x.id)).not.toContain('fc-alta');
  });

  it('fc-baja suprimida si alerta bradicardia activa', () => {
    const s = getSuggestions({
      summary: baseSummary({averageBpm: 50}),
      alertasActivas: ['bradicardia'],
    });
    expect(s.map(x => x.id)).not.toContain('fc-baja');
  });

  it('pa-alta suprimida si alerta hipertensión activa', () => {
    const s = getSuggestions({
      summary: baseSummary({bloodPressureSystolic: 140}),
      alertasActivas: ['hipertension'],
    });
    expect(s.map(x => x.id)).not.toContain('pa-alta');
  });

  it('spo2-baja suprimida si alerta hipoxia activa', () => {
    const s = getSuggestions({
      summary: baseSummary({spo2Percent: 88}),
      alertasActivas: ['hipoxia'],
    });
    expect(s.map(x => x.id)).not.toContain('spo2-baja');
  });

  it('sin alertas activas, sugerencias vitales siguen presentes', () => {
    const s = getSuggestions({
      summary: baseSummary({averageBpm: 112, spo2Percent: 93}),
      alertasActivas: [],
    });
    expect(s.map(x => x.id)).toContain('fc-alta');
    expect(s.map(x => x.id)).toContain('spo2-baja');
  });

  it('temp-alta NO se suprime (no tiene alerta dedicada)', () => {
    const s = getSuggestions({
      summary: baseSummary({bodyTemperatureCelsius: 38.5}),
      alertasActivas: ['hipoxia'],
    });
    expect(s.map(x => x.id)).toContain('temp-alta');
  });
});

// ══════════════════════════════════════════════════════════════════
// Tests SCRUM-202: reglas de bienestar (tendencias 14d)
// ══════════════════════════════════════════════════════════════════

describe('rulesEngine SCRUM-202: bienestar', () => {
  it('pasos en caída vs media 14d genera sugerencia (por tendencia)', () => {
    // steps 6000 > umbral absoluto 5000 → NO dispara la regla base
    // pero tendencia 0.5 < 0.7 → dispara la regla de bienestar
    const s = getSuggestions({
      summary: baseSummary({steps: 6000}),
      tendencias: baseTendencias({avgPasos14d: 12000, avgPasos3d: 6000, tendenciaPasos: 0.5}),
    });
    expect(s.map(x => x.id)).toContain('pasos-bajos');
    expect(s.find(x => x.id === 'pasos-bajos')?.titulo).toContain('bajando');
  });

  it('sin tendencias, usa umbral absoluto de pasos', () => {
    const s = getSuggestions({
      summary: baseSummary({steps: 2000}),
    });
    expect(s.map(x => x.id)).toContain('pasos-bajos');
    expect(s.find(x => x.id === 'pasos-bajos')?.titulo).toContain('Movete');
  });

  it('deuda de sueño genera sugerencia', () => {
    const s = getSuggestions({
      summary: baseSummary({sleepMinutes: 300}),
      tendencias: baseTendencias({
        avgSueno14dMin: 480,
        avgSueno3dMin: 300,
        deudaSuenoMin: 180, // 3h de deuda
      }),
    });
    expect(s.map(x => x.id)).toContain('sueno-corto');
  });

  it('sin tendencias, usa umbral absoluto de sueño', () => {
    const s = getSuggestions({
      summary: baseSummary({sleepMinutes: 300}),
    });
    expect(s.map(x => x.id)).toContain('sueno-corto');
    expect(s.find(x => x.id === 'sueno-corto')?.titulo).toContain('Dormiste poco');
  });

  it('pasos con tendencia normal NO genera sugerencia de tendencia', () => {
    // steps 6000 > umbral absoluto 5000, tendencia 0.94 > 0.7 → ninguna sugerencia
    const s = getSuggestions({
      summary: baseSummary({steps: 6000}),
      tendencias: baseTendencias({avgPasos14d: 8000, avgPasos3d: 7500, tendenciaPasos: 0.94}),
    });
    expect(s.map(x => x.id)).not.toContain('pasos-bajos');
  });
});

// ══════════════════════════════════════════════════════════════════
// Tests SCRUM-202: recuperación post-alerta
// ══════════════════════════════════════════════════════════════════

describe('rulesEngine SCRUM-202: recuperación', () => {
  it('recuperación post-alerta aparece cuando hay alerta activa + FC normal + tendencias', () => {
    const s = getSuggestions({
      summary: baseSummary({averageBpm: 72}),
      tendencias: baseTendencias({avgFc14d: 72}),
      alertasActivas: ['taquicardia'],
    });
    expect(s.map(x => x.id)).toContain('recuperacion-post-alerta');
    expect(s.find(x => x.id === 'recuperacion-post-alerta')?.prioridad).toBe('Alta');
  });

  it('recuperación NO aparece sin alertas activas', () => {
    const s = getSuggestions({
      summary: baseSummary({averageBpm: 72}),
      tendencias: baseTendencias({avgFc14d: 72}),
      alertasActivas: [],
    });
    expect(s.map(x => x.id)).not.toContain('recuperacion-post-alerta');
  });

  it('recuperación NO aparece sin tendencias', () => {
    const s = getSuggestions({
      summary: baseSummary({averageBpm: 72}),
      tendencias: null,
      alertasActivas: ['taquicardia'],
    });
    expect(s.map(x => x.id)).not.toContain('recuperacion-post-alerta');
  });
});
