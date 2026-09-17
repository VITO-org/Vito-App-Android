/**
 * HU-34 Fase A — Tests del motor de reglas (función pura, sin mocks nativos).
 */
import {getSuggestions, RulesSuggestionProvider} from '../rulesEngine';
import type {HealthSummary} from '../../../types/health';

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
