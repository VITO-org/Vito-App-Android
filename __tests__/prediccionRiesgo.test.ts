import {
  buildPredictionPayload,
  FEATURE_ORDER,
  mapearRiesgo,
  MODELO_VERSION,
} from '../src/services/prediccionRiesgo';
import type { PerfilUsuario } from '../src/services/supabase/models';

/**
 * Tests del servicio puro de predicción de riesgo cardiovascular.
 * No dependen de Supabase: solo mapeo de datos → vector de features.
 */

function makeProfile(overrides: Partial<PerfilUsuario> = {}): PerfilUsuario {
  return {
    id: 'p1',
    id_usuario: 'u1',
    nombre: 'Ana',
    apellido: 'Pérez',
    dni: null,
    fecha_nac: '1990-05-15',
    sexo: 'F',
    genero: 'femenino',
    nacionalidad: null,
    telefono: null,
    direccion: null,
    avatar_url: null,
    peso_kg: 65,
    altura_cm: 165,
    patologia: null,
    patologia_descripcion: null,
    intervalo_sync_min: null,
    ...overrides,
  };
}

const idx = {
  age: FEATURE_ORDER.indexOf('age'),
  sex_male: FEATURE_ORDER.indexOf('sex_male'),
  bmi: FEATURE_ORDER.indexOf('bmi'),
  bp_sistolica: FEATURE_ORDER.indexOf('bp_sistolica'),
  bp_diastolica: FEATURE_ORDER.indexOf('bp_diastolica'),
  cholesterol_ord: FEATURE_ORDER.indexOf('cholesterol_ord'),
  diabetes: FEATURE_ORDER.indexOf('diabetes'),
  smoking: FEATURE_ORDER.indexOf('smoking'),
  alcohol: FEATURE_ORDER.indexOf('alcohol'),
  active: FEATURE_ORDER.indexOf('active'),
};

describe('buildPredictionPayload', () => {
  test('el vector respeta FEATURE_ORDER (10 features del contrato v2)', () => {
    const payload = buildPredictionPayload({ profile: makeProfile() });
    expect(payload.vector).toHaveLength(FEATURE_ORDER.length);
    expect(FEATURE_ORDER).toHaveLength(10);
    expect(payload.modelo_version).toBe(MODELO_VERSION);
  });

  test('perfil completo produce BMI y edad válidos (sin imputar esos campos)', () => {
    const payload = buildPredictionPayload({ profile: makeProfile() });
    const age = payload.vector[idx.age];
    expect(age).toBeGreaterThanOrEqual(30);
    expect(age).toBeLessThanOrEqual(39);
    expect(payload.vector[idx.bmi]).toBeCloseTo(65 / 1.65 ** 2, 1); // ≈ 23.88
    expect(payload.presentes).toContain('age');
    expect(payload.presentes).toContain('bmi');
  });

  test('sin fecha de nacimiento se imputa edad con default 45', () => {
    const payload = buildPredictionPayload({ profile: makeProfile({ fecha_nac: null }) });
    expect(payload.vector[idx.age]).toBe(45);
    expect(payload.imputados).toContain('age');
  });

  test('BMI fuera del rango fisiológico (15-50) se imputa (el modelo no lo vio)', () => {
    const payload = buildPredictionPayload({
      profile: makeProfile({ peso_kg: 300, altura_cm: 160 }), // BMI ≈ 117
    });
    expect(payload.vector[idx.bmi]).toBe(25);
    expect(payload.imputados).toContain('bmi');
  });

  test('factores de riesgo booleanos se mapean a 0/1; null → imputado 0', () => {
    const payload = buildPredictionPayload({
      profile: makeProfile(),
      factores: {
        id_usuario: 'u1',
        diabetes: true,
        antecedentes_familiares: null,
        fumador: true,
        obesidad: null,
        consumo_alcohol: false,
        tipo_dieta: null,
        problemas_cardiacos_previos: null,
        uso_medicacion: null,
        updated_at: null,
      },
    });
    expect(payload.vector[idx.diabetes]).toBe(1);
    expect(payload.vector[idx.smoking]).toBe(1);
    expect(payload.vector[idx.alcohol]).toBe(0);
    expect(payload.presentes).toContain('diabetes');
  });

  test('promedio semanal se mapea a presión sistólica/diastólica', () => {
    const payload = buildPredictionPayload({
      profile: makeProfile({ sexo: 'M' }),
      promedio: {
        id: 'm1',
        id_usuario: 'u1',
        semana_inicio: '2026-09-01',
        bp_sistolica_prom: 138,
        bp_diastolica_prom: 88,
        frec_cardiaca_prom: 92,
        spo2_prom: 97.5,
        nivel_estres_prom: 7,
        pasos_diarios_prom: 6000,
        horas_sueno_prom: 6.5,
        total_lecturas: 120,
        created_at: null,
      },
    });
    expect(payload.vector[idx.bp_sistolica]).toBe(138);
    expect(payload.vector[idx.bp_diastolica]).toBe(88);
    expect(payload.presentes).toContain('bp_sistolica');
    expect(payload.presentes).toContain('bp_diastolica');
  });

  test('presión fuera de rango fisiológico se imputa (mismo filtro que entrena)', () => {
    const payload = buildPredictionPayload({
      profile: makeProfile(),
      promedio: {
        id: 'm1',
        id_usuario: 'u1',
        semana_inicio: '2026-09-01',
        bp_sistolica_prom: 210,
        bp_diastolica_prom: 130,
        frec_cardiaca_prom: null,
        spo2_prom: null,
        nivel_estres_prom: null,
        pasos_diarios_prom: null,
        horas_sueno_prom: null,
        total_lecturas: null,
        created_at: null,
      },
    });
    expect(payload.vector[idx.bp_sistolica]).toBe(120);
    expect(payload.vector[idx.bp_diastolica]).toBe(80);
    expect(payload.imputados).toContain('bp_sistolica');
    expect(payload.imputados).toContain('bp_diastolica');
  });

  test('active: >=5000 pasos → 1, <5000 o sin datos → imputado/default (1)', () => {
    const activo = buildPredictionPayload({
      profile: makeProfile(),
      promedio: {
        id: 'm1', id_usuario: 'u1', semana_inicio: '2026-09-01',
        bp_sistolica_prom: null, bp_diastolica_prom: null,
        frec_cardiaca_prom: null, spo2_prom: null, nivel_estres_prom: null,
        pasos_diarios_prom: 8000, horas_sueno_prom: null,
        total_lecturas: null, created_at: null,
      },
    });
    expect(activo.vector[idx.active]).toBe(1);
    expect(activo.presentes).toContain('active');

    const inactivo = buildPredictionPayload({
      profile: makeProfile(),
      promedio: {
        id: 'm2', id_usuario: 'u1', semana_inicio: '2026-09-01',
        bp_sistolica_prom: null, bp_diastolica_prom: null,
        frec_cardiaca_prom: null, spo2_prom: null, nivel_estres_prom: null,
        pasos_diarios_prom: 1200, horas_sueno_prom: null,
        total_lecturas: null, created_at: null,
      },
    });
    expect(inactivo.vector[idx.active]).toBe(0);

    const sinPasos = buildPredictionPayload({ profile: makeProfile() });
    expect(sinPasos.vector[idx.active]).toBe(1);
    expect(sinPasos.imputados).toContain('active');
  });

  test('cholesterol_ord: Vito no lo recolecta → siempre imputado (1 = normal)', () => {
    const payload = buildPredictionPayload({ profile: makeProfile() });
    expect(payload.vector[idx.cholesterol_ord]).toBe(1);
    expect(payload.imputados).toContain('cholesterol_ord');
  });

  test('sexo M → sex_male=1, sexo F/otro → 0', () => {
    const m = buildPredictionPayload({ profile: makeProfile({ sexo: 'M' }) });
    const f = buildPredictionPayload({ profile: makeProfile({ sexo: 'F' }) });
    const otro = buildPredictionPayload({ profile: makeProfile({ sexo: 'otro' }) });
    expect(m.vector[idx.sex_male]).toBe(1);
    expect(f.vector[idx.sex_male]).toBe(0);
    expect(otro.vector[idx.sex_male]).toBe(0);
  });

  test('todas las salidas son números finitos (prevenir NaN en el modelo)', () => {
    const payload = buildPredictionPayload({
      profile: makeProfile({ peso_kg: 1000, altura_cm: 0, fecha_nac: '1800-01-01' }),
    });
    payload.vector.forEach((v) => {
      expect(Number.isFinite(v)).toBe(true);
    });
  });
});

describe('mapearRiesgo (espejo Edge Function)', () => {
  test('umbrales: <33 bajo, 33-65 medio, >=66 alto', () => {
    expect(mapearRiesgo(10)).toBe('bajo');
    expect(mapearRiesgo(32.99)).toBe('bajo');
    expect(mapearRiesgo(33)).toBe('medio');
    expect(mapearRiesgo(50)).toBe('medio');
    expect(mapearRiesgo(65.99)).toBe('medio');
    expect(mapearRiesgo(66)).toBe('alto');
    expect(mapearRiesgo(100)).toBe('alto');
  });
});