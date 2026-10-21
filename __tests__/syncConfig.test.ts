/**
 * Tests de la pantalla de Configuración HU-25 (SCRUM-79).
 *
 * Cubre el helper puro `resolveSyncIntervalMin` (intervalo configurable CA-01):
 *  (a) default cuando el perfil no tiene valor,
 *  (b) clamp al mínimo de 60s (modo casi-tiempo-real),
 *  (c) valor válido del perfil respetado.
 */
import { resolveSyncIntervalMin } from "../src/services/healthSync";
import {
  DEFAULT_SYNC_INTERVAL_MIN,
  MIN_SYNC_INTERVAL_MS,
} from "../src/services/healthSync";

const MIN_MINUTOS = Math.ceil(MIN_SYNC_INTERVAL_MS / 60_000); // 1

describe("resolveSyncIntervalMin — HU-25 intervalo configurable (CA-01)", () => {
  test("(a) perfil sin valor → default 10 min", () => {
    expect(resolveSyncIntervalMin(null)).toBe(DEFAULT_SYNC_INTERVAL_MIN);
    expect(resolveSyncIntervalMin(undefined)).toBe(DEFAULT_SYNC_INTERVAL_MIN);
    expect(resolveSyncIntervalMin(0)).toBe(DEFAULT_SYNC_INTERVAL_MIN);
    expect(resolveSyncIntervalMin(-5)).toBe(DEFAULT_SYNC_INTERVAL_MIN);
  });

  test("(b) valor menor al mínimo soportado → clamp a 60s", () => {
    expect(resolveSyncIntervalMin(0)).toBeGreaterThanOrEqual(MIN_MINUTOS);
    expect(resolveSyncIntervalMin(1)).toBeGreaterThanOrEqual(MIN_MINUTOS);
    // Ningún resultado puede estar por debajo del mínimo de 60s
    expect(resolveSyncIntervalMin(1)).toBe(MIN_MINUTOS);
  });

  test("(c) valor válido del perfil → respetado", () => {
    expect(resolveSyncIntervalMin(30)).toBe(30);
    expect(resolveSyncIntervalMin(5)).toBe(5);
    expect(resolveSyncIntervalMin(60)).toBe(60);
  });

  test("fallback custom se usa cuando el perfil no define valor", () => {
    expect(resolveSyncIntervalMin(null, 25)).toBe(25);
    expect(resolveSyncIntervalMin(undefined, 25)).toBe(25);
  });
});
