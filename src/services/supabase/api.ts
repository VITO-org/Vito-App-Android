import { supabase } from './client';
import { normalizeVital } from '../vitals';
import { validateDatosReloj, validateDatosRelojBatch, ValidationError } from '../validation';
import { mapMetricKeys, mapMetricKeysBatch } from '../metricMapping';
import type {
  PerfilUsuario,
  BaselineClinico,
  DatosReloj,
  DatosRelojInsert,
  FactoresRiesgoCardiaco,
  FactoresRiesgoCardiacoInsert,
  PromedioSemanalML,
  PrediccionRiesgo,
  Sintoma,
  SintomasUsuario,
  SintomasUsuarioInsert,
  CatSintoma,
  RolUsuario,
} from './models';

// ═══════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════

/**
 * Registro con email + contraseña.
 * Supabase Auth crea el usuario automáticamente en auth.users.
 * Además inserta un registro en la tabla pública `usuario` con el rol.
 */
export async function signUp(email: string, password: string, rol: RolUsuario = 'paciente') {
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
  if (authError) throw authError;
  if (!authData.user) throw new Error('No se pudo crear el usuario');

  // Insertar metadata del usuario en la tabla pública
  const { error: dbError } = await supabase
    .from('usuario')
    .insert({ id: authData.user.id, email, rol, es_activo: true });
  if (dbError) throw dbError;

  return authData;
}

/**
 * Inicio de sesión con email + contraseña.
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Inicio de sesión con Google (OAuth).
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: 'com.vito.healthconnect.rn://auth/callback' },
  });
  if (error) throw error;
  return data;
}

/**
 * Cerrar sesión.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Obtener la sesión actual.
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

// ═══════════════════════════════════════════
// PERFIL DE USUARIO
// ═══════════════════════════════════════════

export async function getProfile(userId: string): Promise<PerfilUsuario | null> {
  const { data, error } = await supabase
    .from('perfil_usuario')
    .select('*')
    .eq('id_usuario', userId)
    .maybeSingle();
  if (error) throw error;
  return data as PerfilUsuario | null;
}

export async function upsertProfile(
  profile: Partial<PerfilUsuario> & { id_usuario: string },
): Promise<PerfilUsuario> {
  const { data, error } = await supabase
    .from('perfil_usuario')
    .upsert(profile, { onConflict: 'id_usuario' })
    .select()
    .single();
  if (error) throw error;
  return data as PerfilUsuario;
}

// ═══════════════════════════════════════════
// DATOS RELOJ (smartwatch — cada 30 seg)
// ═══════════════════════════════════════════

export async function insertDatosReloj(dato: DatosRelojInsert): Promise<DatosReloj> {
  const datoWithSospechoso = { ...dato, sospechoso: dato.sospechoso ?? false };
  // Normalizar claves de métricas de distintos dispositivos a metric_key canonicos
  const normalized = mapMetricKeys(datoWithSospechoso);
  // Validar rangos clínicos antes de persistir (CA-01)
  try {
    await validateDatosReloj(normalized);
    // Insert válido
    const { data, error } = await supabase
      .from('datos_reloj')
      .insert(normalized)
      .select()
      .single();
    if (error) throw error;
    return data as DatosReloj;
  } catch (err) {
    if (err instanceof ValidationError) {
      // Insertar igualmente como sospechoso y registrar intento
      const suspicious = { ...normalized, sospechoso: true };
      const { data: inserted, error: insertErr } = await supabase
        .from('datos_reloj')
        .insert(suspicious)
        .select()
        .single();
      if (insertErr) throw insertErr;

      const attempt = {
        id_usuario: normalized.id_usuario ?? null,
        datos_reloj_id: (inserted as any)?.id ?? null,
        payload: normalized,
        errors: err.errors,
        source: 'ingest-api',
        recorded_at: normalized.recorded_at ?? new Date().toISOString(),
      };
      // registrar intento (no bloquear al usuario si falla el log)
      try {
        await supabase.from('validation_attempts').insert(attempt);
      } catch (logErr) {
        console.warn('validation_attempts insert failed', logErr);
      }

      return inserted as DatosReloj;
    }
    throw err;
  }
}

export async function insertDatosRelojBatch(datos: DatosRelojInsert[]): Promise<DatosReloj[]> {
  const safeDatos = datos.map(dato => ({ ...dato, sospechoso: dato.sospechoso ?? false }));
  const normalizedBatch = mapMetricKeysBatch(safeDatos);
  // Validar cada registro y separar válidos / inválidos para registrar intentos
  const validRecords: DatosRelojInsert[] = [];
  const invalidRecords: { record: DatosRelojInsert; errors: string[] }[] = [];

  for (const r of normalizedBatch) {
    try {
      await validateDatosReloj(r);
      validRecords.push(r);
    } catch (e) {
      if (e instanceof ValidationError) {
        invalidRecords.push({ record: r, errors: e.errors });
      } else {
        throw e;
      }
    }
  }

  const insertedResults: DatosReloj[] = [];

  // Insertar válidos
  if (validRecords.length > 0) {
    const { data: goodData, error: goodErr } = await supabase
      .from('datos_reloj')
      .insert(validRecords)
      .select();
    if (goodErr) throw goodErr;
    insertedResults.push(...((goodData as DatosReloj[]) ?? []));
  }

  // Insertar inválidos como sospechosos y registrar attempts
  if (invalidRecords.length > 0) {
    const suspicious = invalidRecords.map(ir => ({ ...ir.record, sospechoso: true }));
    const { data: badData, error: badErr } = await supabase
      .from('datos_reloj')
      .insert(suspicious)
      .select();
    if (badErr) throw badErr;
    const insertedBad = (badData as DatosReloj[]) ?? [];
    insertedResults.push(...insertedBad);

    // Crear attempts vinculando ids insertados
    const attempts = insertedBad.map((ins, idx) => ({
      id_usuario: ins.id_usuario ?? null,
      datos_reloj_id: ins.id ?? null,
      payload: invalidRecords[idx].record,
      errors: invalidRecords[idx].errors,
      source: 'ingest-api',
      recorded_at: ins.recorded_at ?? new Date().toISOString(),
    }));

    try {
      await supabase.from('validation_attempts').insert(attempts);
    } catch (logErr) {
      console.warn('validation_attempts batch insert failed', logErr);
    }
  }

  return insertedResults;
}

export async function getDatosReloj(
  userId: string,
  options?: { from?: string; to?: string; limit?: number; includeSuspicious?: boolean },
): Promise<DatosReloj[]> {
  let query = supabase
    .from('datos_reloj')
    .select('*')
    .eq('id_usuario', userId)
    .order('recorded_at', { ascending: false });

  // Por defecto excluimos registros marcados como sospechosos
  if (!options?.includeSuspicious) query = query.eq('sospechoso', false);

  if (options?.from) query = query.gte('recorded_at', options.from);
  if (options?.to) query = query.lte('recorded_at', options.to);
  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data as DatosReloj[]) ?? [];
}

// ═══════════════════════════════════════════
// BASELINE CLÍNICO
// ═══════════════════════════════════════════

export async function getBaseline(userId: string): Promise<BaselineClinico | null> {
  const { data, error } = await supabase
    .from('baseline_clinico')
    .select('*')
    .eq('id_usuario', userId)
    .maybeSingle();
  if (error) throw error;
  return data as BaselineClinico | null;
}

export async function upsertBaseline(
  baseline: Partial<BaselineClinico> & { id_usuario: string },
): Promise<BaselineClinico> {
  const { data, error } = await supabase
    .from('baseline_clinico')
    .upsert(baseline, { onConflict: 'id_usuario' })
    .select()
    .single();
  if (error) throw error;
  return data as BaselineClinico;
}

// ═══════════════════════════════════════════
// FACTORES DE RIESGO CARDÍACO (ML)
// ═══════════════════════════════════════════

export async function upsertFactoresRiesgoCardiaco(
  factores: FactoresRiesgoCardiacoInsert,
): Promise<FactoresRiesgoCardiaco> {
  const { data, error } = await supabase
    .from('factores_riesgo_cardiaco')
    .upsert(factores, { onConflict: 'id_usuario' })
    .select()
    .single();
  if (error) throw error;
  return data as FactoresRiesgoCardiaco;
}

export async function getFactoresRiesgoCardiaco(
  userId: string,
): Promise<FactoresRiesgoCardiaco | null> {
  const { data, error } = await supabase
    .from('factores_riesgo_cardiaco')
    .select('*')
    .eq('id_usuario', userId)
    .maybeSingle();
  if (error) throw error;
  return data as FactoresRiesgoCardiaco | null;
}

// ═══════════════════════════════════════════
// SÍNTOMAS (catálogo controlado)
// ═══════════════════════════════════════════

export async function getSintomasCatalogo(
  options?: { categoria?: CatSintoma },
): Promise<Sintoma[]> {
  let query = supabase
    .from('sintomas')
    .select('*')
    .eq('activo', true)
    .order('categoria')
    .order('nombre');

  if (options?.categoria) query = query.eq('categoria', options.categoria);

  const { data, error } = await query;
  if (error) throw error;
  return (data as Sintoma[]) ?? [];
}

// ═══════════════════════════════════════════
// SÍNTOMAS USUARIO (registro del paciente)
// ═══════════════════════════════════════════

export async function insertSintomaUsuario(
  sintoma: SintomasUsuarioInsert,
): Promise<SintomasUsuario> {
  const { data, error } = await supabase
    .from('sintomas_usuario')
    .insert(sintoma)
    .select()
    .single();
  if (error) throw error;
  return data as SintomasUsuario;
}

export async function getSintomasUsuario(
  userId: string,
  options?: { from?: string; to?: string; limit?: number; categoria?: CatSintoma },
): Promise<SintomasUsuario[]> {
  let query = supabase
    .from('sintomas_usuario')
    .select('*')
    .eq('id_usuario', userId)
    .order('recorded_at', { ascending: false });

  if (options?.categoria) query = query.eq('categoria', options.categoria);
  if (options?.from) query = query.gte('recorded_at', options.from);
  if (options?.to) query = query.lte('recorded_at', options.to);
  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data as SintomasUsuario[]) ?? [];
}

export async function deleteSintomaUsuario(
  idUsuario: string,
  recordedAt: string,
): Promise<void> {
  const { error } = await supabase
    .from('sintomas_usuario')
    .delete()
    .eq('id_usuario', idUsuario)
    .eq('recorded_at', recordedAt);
  if (error) throw error;
}

// ═══════════════════════════════════════════
// PREDICCIÓN DE RIESGO (resultado ML)
// ═══════════════════════════════════════════

export async function getUltimaPrediccionRiesgo(
  userId: string,
): Promise<PrediccionRiesgo | null> {
  const { data, error } = await supabase
    .from('prediccion_riesgo')
    .select('*')
    .eq('id_usuario', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as PrediccionRiesgo | null;
}

export async function getHistorialPredicciones(
  userId: string,
  options?: { limit?: number },
): Promise<PrediccionRiesgo[]> {
  let query = supabase
    .from('prediccion_riesgo')
    .select('*')
    .eq('id_usuario', userId)
    .order('created_at', { ascending: false });

  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data as PrediccionRiesgo[]) ?? [];
}

// ═══════════════════════════════════════════
// PROMEDIO SEMANAL ML (solo lectura — lo llena pipeline Python)
// ═══════════════════════════════════════════

export async function getPromedioSemanalML(
  userId: string,
  options?: { limit?: number },
): Promise<PromedioSemanalML[]> {
  let query = supabase
    .from('promedio_semanal_ml')
    .select('*')
    .eq('id_usuario', userId)
    .order('semana_inicio', { ascending: false });

  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data as PromedioSemanalML[]) ?? [];
}

// ═══════════════════════════════════════════
// SINCRONIZACIÓN HEALTH CONNECT → SUPABASE
// ═══════════════════════════════════════════

/**
 * Convierte el resumen de Health Connect en un registro de datos_reloj.
 */
export async function syncHealthSummaryToSupabase(
  userId: string,
  summary: {
    steps: number;
    distanceMeters: number;
    caloriesKcal: number;
    sleepMinutes: number;
    averageBpm: number | null;
    exerciseSessions: number;
  },
): Promise<DatosReloj> {
  const now = new Date().toISOString();
  const hr = normalizeVital('frecuencia_cardiaca', summary.averageBpm);

  const dato: DatosRelojInsert = {
    id_usuario: userId,
    frec_cardiaca_bpm: hr.value,
    actividad_pasos: summary.steps,
    horas_sueno: summary.sleepMinutes > 0 ? summary.sleepMinutes / 60 : null,
    recorded_at: now,
    sospechoso: hr.sospechoso,
  };

  return insertDatosReloj(dato);
}
