/**
 * Tests del motor de sincronización HU-25 (SCRUM-79).
 *
 * Cubre los 3 escenarios del Definition of Done:
 *  (a) sincronización sin conflictos,
 *  (b) con conflicto (wearable > manual),
 *  (c) fuente desconectada (la escritura/lectura falla → no crashea en el
 *      llamador; el motor propaga el error para que HealthProvider lo capte).
 * Además: dedupe de lecturas idénticas y userId null.
 */
import {
  syncWearableToBackend,
  buildDatosRelojInsert,
} from "../src/services/healthSync";
import type { HealthSyncDeps } from "../src/services/healthSync";
import type {
  DatosReloj,
  DatosRelojInsert,
} from "../src/services/supabase/models";
import type { HealthSummary } from "../src/types/health";

const SUMMARY: HealthSummary = {
  steps: 5000,
  distanceMeters: 3200,
  caloriesKcal: 210,
  sleepMinutes: 420,
  averageBpm: 72,
  exerciseSessions: 1,
  bloodPressureSystolic: 118,
  bloodPressureDiastolic: 76,
  spo2Percent: 97,
  bodyTemperatureCelsius: 36.5,
};

interface DepsHarness {
  deps: HealthSyncDeps;
  inserted: DatosRelojInsert[];
  replaced: Array<{ id: string; reemplazadoPor: string }>;
}

function makeDeps(overrides: Partial<HealthSyncDeps> = {}): DepsHarness {
  const inserted: DatosRelojInsert[] = [];
  const replaced: Array<{ id: string; reemplazadoPor: string }> = [];
  const deps: HealthSyncDeps = {
    insertDatosReloj: async (dato) => {
      inserted.push(dato);
      return { id: "w-1", ...dato } as DatosReloj;
    },
    getDatosRelojInWindow: async () => [],
    markDatosRelojReemplazado: async (id, reemplazadoPor) => {
      replaced.push({ id, reemplazadoPor });
    },
    ...overrides,
  };
  return { deps, inserted, replaced };
}

describe("syncWearableToBackend — HU-25 sincronización de datos de salud", () => {
  const now = new Date("2026-08-08T12:00:00.000Z");

  test("(a) sincronización sin conflictos: inserta con origen wearable", async () => {
    const { deps, inserted } = makeDeps();

    const result = await syncWearableToBackend("u1", SUMMARY, deps, now);

    expect(result.status).toBe("inserted");
    expect(result.conflictResolved).toBe(false);
    expect(result.manualReplaced).toEqual([]);
    expect(inserted).toHaveLength(1);
    expect(inserted[0].origen).toBe("wearable");
    expect(inserted[0].recorded_at).toBe(now.toISOString());
    expect(inserted[0].frec_cardiaca_bpm).toBe(72);
  });

  test("(b) conflicto wearable vs manual: gana wearable y el manual queda reemplazado", async () => {
    const manual: DatosReloj = {
      id: "m-1",
      id_usuario: "u1",
      bp_sistolica: 120,
      bp_diastolica: 80,
      frec_cardiaca_bpm: 80,
      spo2_pct: 96,
      temperatura: 36.7,
      nivel_estres: null,
      actividad_pasos: 100,
      horas_sueno: 7,
      recorded_at: new Date(now.getTime() - 60_000).toISOString(),
      sospechoso: false,
      origen: "manual",
      reemplazado_por: null,
    };
    const { deps, inserted, replaced } = makeDeps({
      getDatosRelojInWindow: async () => [manual],
    });

    const result = await syncWearableToBackend("u1", SUMMARY, deps, now);

    expect(result.status).toBe("inserted");
    expect(result.conflictResolved).toBe(true);
    expect(result.manualReplaced).toEqual(["m-1"]);
    expect(inserted[0].origen).toBe("wearable");
    expect(replaced).toEqual([{ id: "m-1", reemplazadoPor: "w-1" }]);
  });

  test("(c) fuente desconectada: el error se propaga para que el llamador no crashee", async () => {
    const { deps } = makeDeps({
      getDatosRelojInWindow: async () => {
        throw new Error("network down");
      },
    });

    await expect(
      syncWearableToBackend("u1", SUMMARY, deps, now)
    ).rejects.toThrow("network down");
  });

  test("dedupe: lectura wearable idéntica en la ventana no se inserta de nuevo", async () => {
    const identica = buildDatosRelojInsert("u1", SUMMARY, now);
    const existente = {
      ...identica,
      id: "w-0",
      reemplazado_por: null,
    } as DatosReloj;
    const { deps, inserted } = makeDeps({
      getDatosRelojInWindow: async () => [existente],
    });

    const result = await syncWearableToBackend("u1", SUMMARY, deps, now);

    expect(result.status).toBe("deduplicated");
    expect(result.conflictResolved).toBe(false);
    expect(inserted).toHaveLength(0);
  });

  test("userId null → no_user sin tocar dependencias", async () => {
    const { deps, inserted } = makeDeps();

    const result = await syncWearableToBackend(null, SUMMARY, deps, now);

    expect(result.status).toBe("no_user");
    expect(result.conflictResolved).toBe(false);
    expect(inserted).toHaveLength(0);
  });
});
