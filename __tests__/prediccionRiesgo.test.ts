import {
  buildPredictionPayload,
  camposFaltantesPrediccion,
  FEATURE_ORDER,
  mapearRiesgo,
  MODELO_VERSION,
} from '../src/services/prediccionRiesgo';
import type { PerfilUsuario, DatosPrediccionRiesgo } from '../src/services/supabase/models';

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

/** Fila declarada COMPLETA en datos_prediccion_riesgo (formulario dedicado). */
function makeDatosCompletos(overrides: Partial<DatosPrediccionRiesgo> = {}): DatosPrediccionRiesgo {
  return {
    id_usuario: 'u1',
    peso_kg: 72,
    altura_cm: 173,
    bp_sistolica: 118,
    bp_diastolica: 76,
    cholesterol_ord: 2,
    diabetes: false,
    smoking: false,
    alcohol: true,
    active: true,
    updated_at: '2026-09-11T00:00:00Z',
    ...overrides,
  };
}

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

describe('camposFaltantesPrediccion', () => {
  test('faltan todos: fila null + perfil sin peso/altura → bmi + bp + chol + bools + active faltantes', () => {
    const faltantes = camposFaltantesPrediccion({
      profile: makeProfile({ peso_kg: null, altura_cm: null }),
    });
    // age/sex_ok, pero bmi (peso/altura null) + bp + chol + diabetes + smoking + alcohol + active
    expect(faltantes).toContain('bmi');
    expect(faltantes).toContain('bp_sistolica');
    expect(faltantes).toContain('bp_diastolica');
    expect(faltantes).toContain('cholesterol_ord');
    expect(faltantes).toContain('diabetes');
    expect(faltantes).toContain('smoking');
    expect(faltantes).toContain('alcohol');
    expect(faltantes).toContain('active');
    expect(faltantes).not.toContain('age');     // perfil tiene fecha_nac
    expect(faltantes).not.toContain('sex_male'); // perfil tiene sexo
  });

  test('faltan algunos: solo cholesterol y diabetes faltantes', () => {
    const faltantes = camposFaltantesPrediccion({
      profile: makeProfile(),
      datos: makeDatosCompletos({ cholesterol_ord: null, diabetes: null }),
    });
    expect(faltantes).toEqual(['cholesterol_ord', 'diabetes']);
  });

  test('todos presentes: fila completa + perfil completo → vacío', () => {
    const faltantes = camposFaltantesPrediccion({
      profile: makeProfile(),
      datos: makeDatosCompletos(),
    });
    expect(faltantes).toEqual([]);
  });

  test('solo colesterol faltante', () => {
    const faltantes = camposFaltantesPrediccion({
      profile: makeProfile(),
      datos: makeDatosCompletos({ cholesterol_ord: null }),
    });
    expect(faltantes).toEqual(['cholesterol_ord']);
  });

  test('active null en la fila → active es faltante (formulario dedicado)', () => {
    const faltantes = camposFaltantesPrediccion({
      profile: makeProfile(),
      datos: makeDatosCompletos({ active: null }),
    });
    expect(faltantes).toContain('active');
  });

  test('perfil sin fecha_nac ni sexo → age y sex_male faltan', () => {
    const faltantes = camposFaltantesPrediccion({
      profile: makeProfile({ fecha_nac: null, sexo: null }),
      datos: makeDatosCompletos(),
    });
    expect(faltantes).toContain('age');
    expect(faltantes).toContain('sex_male');
  });

  test('BMI inválido con datos declarados (peso=300, altura=160) → bmi faltante', () => {
    const faltantes = camposFaltantesPrediccion({
      profile: makeProfile(),
      datos: makeDatosCompletos({ peso_kg: 300, altura_cm: 160 }),
    });
    expect(faltantes).toContain('bmi');
  });
});

describe('buildPredictionPayload con datos declarados (tabla nueva)', () => {
  test('fila completa → usa valores declarados, imputados=[] (sin cholesterol default)', () => {
    const payload = buildPredictionPayload({
      profile: makeProfile(),
      datos: makeDatosCompletos(),
    });
    // BMI: 72 / (173/100)² ≈ 24.08
    expect(payload.vector[idx.bmi]).toBeCloseTo(72 / (173 / 100) ** 2, 1);
    expect(payload.vector[idx.bp_sistolica]).toBe(118);
    expect(payload.vector[idx.bp_diastolica]).toBe(76);
    expect(payload.vector[idx.cholesterol_ord]).toBe(2);
    expect(payload.vector[idx.diabetes]).toBe(0);
    expect(payload.vector[idx.smoking]).toBe(0);
    expect(payload.vector[idx.alcohol]).toBe(1);
    expect(payload.imputados).not.toContain('cholesterol_ord');
    expect(payload.imputados).not.toContain('bp_sistolica');
    expect(payload.imputados).not.toContain('diabetes');
  });

  test('fila null → cholesterol imputado 1 (default), bools vía factores si existen', () => {
    const payload = buildPredictionPayload({
      profile: makeProfile(),
      datos: null,
      factores: {
        id_usuario: 'u1', diabetes: true, antecedentes_familiares: null,
        fumador: false, obesidad: null, consumo_alcohol: false,
        tipo_dieta: null, problemas_cardiacos_previos: null,
        uso_medicacion: null, updated_at: null,
      },
    });
    expect(payload.vector[idx.cholesterol_ord]).toBe(1);
    expect(payload.imputados).toContain('cholesterol_ord');
    // diabetes → factores (legacy), dato no es null → 1
    expect(payload.vector[idx.diabetes]).toBe(1);
    expect(payload.presentes).toContain('diabetes');
  });

  test('datos declarados tienen precedencia sobre factores legacy para booleanos', () => {
    const payload = buildPredictionPayload({
      profile: makeProfile(),
      datos: makeDatosCompletos({ diabetes: true, smoking: true, alcohol: false }),
      factores: {
        id_usuario: 'u1', diabetes: false, antecedentes_familiares: null,
        fumador: false, obesidad: null, consumo_alcohol: true,
        tipo_dieta: null, problemas_cardiacos_previos: null,
        uso_medicacion: null, updated_at: null,
      },
    });
    expect(payload.vector[idx.diabetes]).toBe(1);   // datos = true
    expect(payload.vector[idx.smoking]).toBe(1);    // datos = true
    expect(payload.vector[idx.alcohol]).toBe(0);    // datos = false
  });

  test('presión declarada tiene precedencia sobre promedio semanal', () => {
    const payload = buildPredictionPayload({
      profile: makeProfile(),
      datos: makeDatosCompletos({ bp_sistolica: 135, bp_diastolica: 85 }),
      promedio: {
        id: 'm1', id_usuario: 'u1', semana_inicio: '2026-09-01',
        bp_sistolica_prom: 110, bp_diastolica_prom: 70,
        frec_cardiaca_prom: null, spo2_prom: null, nivel_estres_prom: null,
        pasos_diarios_prom: null, horas_sueno_prom: null,
        total_lecturas: null, created_at: null,
      },
    });
    expect(payload.vector[idx.bp_sistolica]).toBe(135); // datos > promedio
    expect(payload.vector[idx.bp_diastolica]).toBe(85);
  });

  test('BMI del perfil se usa si datos no tiene peso/altura', () => {
    const payload = buildPredictionPayload({
      profile: makeProfile({ peso_kg: 65, altura_cm: 165 }),
      datos: makeDatosCompletos({ peso_kg: undefined as unknown as number, altura_cm: undefined as unknown as number }),
    });
    expect(payload.vector[idx.bmi]).toBeCloseTo(65 / (165 / 100) ** 2, 1);
  });

  test('active declarado (datos) tiene precedencia sobre el wearable', () => {
    const activoDeclarado = buildPredictionPayload({
      profile: makeProfile(),
      datos: makeDatosCompletos({ active: true }),
      promedio: {
        id: 'm1', id_usuario: 'u1', semana_inicio: '2026-09-01',
        bp_sistolica_prom: null, bp_diastolica_prom: null,
        frec_cardiaca_prom: null, spo2_prom: null, nivel_estres_prom: null,
        pasos_diarios_prom: 1200, horas_sueno_prom: null, // wearable dice inactivo
        total_lecturas: null, created_at: null,
      },
    });
    expect(activoDeclarado.vector[idx.active]).toBe(1); // declarado true gana
    expect(activoDeclarado.presentes).toContain('active');

    const inactivoDeclarado = buildPredictionPayload({
      profile: makeProfile(),
      datos: makeDatosCompletos({ active: false }),
      promedio: {
        id: 'm2', id_usuario: 'u1', semana_inicio: '2026-09-01',
        bp_sistolica_prom: null, bp_diastolica_prom: null,
        frec_cardiaca_prom: null, spo2_prom: null, nivel_estres_prom: null,
        pasos_diarios_prom: 8000, horas_sueno_prom: null, // wearable dice activo
        total_lecturas: null, created_at: null,
      },
    });
    expect(inactivoDeclarado.vector[idx.active]).toBe(0); // declarado false gana
  });

  test('active null en datos → cae al wearable (>=5000 pasos = 1)', () => {
    const payload = buildPredictionPayload({
      profile: makeProfile(),
      datos: makeDatosCompletos({ active: null }),
      promedio: {
        id: 'm1', id_usuario: 'u1', semana_inicio: '2026-09-01',
        bp_sistolica_prom: null, bp_diastolica_prom: null,
        frec_cardiaca_prom: null, spo2_prom: null, nivel_estres_prom: null,
        pasos_diarios_prom: 6000, horas_sueno_prom: null,
        total_lecturas: null, created_at: null,
      },
    });
    expect(payload.vector[idx.active]).toBe(1);
  });
});