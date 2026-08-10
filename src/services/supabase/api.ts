import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './client';
import { normalizeVital } from '../vitals';
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
  OrigenDato,
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
// RAW REST (bypass de supabase-js en React Native)
// ═══════════════════════════════════════════
// Los writes del query builder de @supabase/supabase-js cuelgan la promesa
// en React Native (issues #1620/#1693: la promise nunca se resuelve aunque el
// server responde — los GETs funcionan, pero upsert/insert + .select() no).
// Mitigación: llamar directo al REST de PostgREST con fetch + JWT (mismo
// header `apikey` que supabase-js + `Authorization: Bearer`).

const REST_BASE = `${SUPABASE_URL}/rest/v1`;

interface RawRestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  prefer?: string;
  query?: string; // query string sin el "?" inicial (p. ej. "id=eq.123")
  accessToken?: string | null;
}

/**
 * Token de sesión para el header `Authorization: Bearer`.
 * Se usa el parámetro explícito si viene, o se resuelve de la sesión
 * persistida (AsyncStorage) vía supabase-js — que en auth sí funciona.
 */
async function resolveAccessToken(accessToken?: string | null): Promise<string> {
  if (accessToken) return accessToken;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No hay sesión activa para operar sobre Supabase');
  return token;
}

/**
 * Fetch directo al REST de PostgREST.
 * Lanza un Error con las props { message, status, code } como supabase-js,
 * para no romper los catchs existentes (ver CompleteProfileScreen).
 */
async function rawRestFetch<T>(
  tablePath: string,
  options: RawRestOptions = {},
): Promise<T> {
  const { method = 'GET', body, prefer, query = '', accessToken } = options;
  const token = await resolveAccessToken(accessToken);

  const url = `${REST_BASE}/${tablePath}${query ? `?${query}` : ''}`;
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let code: string | undefined;
    try {
      const errBody = (await res.json()) as { message?: string; code?: string };
      if (errBody.message) message = errBody.message;
      if (errBody.code) code = errBody.code;
    } catch {
      // cuerpo no JSON → mensaje genérico
    }
    const err = new Error(message) as Error & { status?: number; code?: string };
    err.status = res.status;
    if (code) err.code = code;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

// ═══════════════════════════════════════════
// PERFIL DE USUARIO
// ═══════════════════════════════════════════

export async function getProfile(
  userId: string,
  accessToken?: string | null,
): Promise<PerfilUsuario | null> {
  if (accessToken) {
    const rows = await rawRestFetch<PerfilUsuario[]>('perfil_usuario', {
      query: `select=*&id_usuario=eq.${userId}&limit=1`,
      accessToken,
    });
    return rows[0] ?? null;
  }
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
  accessToken?: string | null,
): Promise<PerfilUsuario> {
  const rows = await rawRestFetch<PerfilUsuario[]>('perfil_usuario', {
    method: 'POST',
    body: profile,
    prefer: 'resolution=merge-duplicates,return=representation',
    query: 'on_conflict=id_usuario',
    accessToken,
  });
  const row = rows[0];
  if (!row) throw new Error('No se pudo guardar el perfil');
  return row;
}

// ═══════════════════════════════════════════
// DATOS RELOJ (smartwatch — cada 30 seg)
// ═══════════════════════════════════════════

export async function insertDatosReloj(
  dato: DatosRelojInsert,
  accessToken?: string | null,
): Promise<DatosReloj> {
  const safeDato = { ...dato, sospechoso: dato.sospechoso ?? false, origen: dato.origen ?? 'wearable' }; /* [documentación manual] se pasan los datos crudos y la función devuelve los datos normalizados */
  const rows = await rawRestFetch<DatosReloj[]>('datos_reloj', {
    method: 'POST',
    body: safeDato,
    prefer: 'return=representation',
    accessToken,
  });
  const row = rows[0];
  if (!row) throw new Error('No se pudo insertar el dato');
  return row;
}

export async function insertDatosRelojBatch(
  datos: DatosRelojInsert[],
  accessToken?: string | null,
): Promise<DatosReloj[]> {
  const safeDatos = datos.map(dato => ({ ...dato, sospechoso: dato.sospechoso ?? false, origen: dato.origen ?? 'wearable' }));
  const rows = await rawRestFetch<DatosReloj[]>('datos_reloj', {
    method: 'POST',
    body: safeDatos,
    prefer: 'return=representation',
    accessToken,
  });
  return rows ?? [];
}

export async function getDatosReloj(
  userId: string,
  options?: { from?: string; to?: string; limit?: number; origen?: OrigenDato },
): Promise<DatosReloj[]> {
  let query = supabase
    .from('datos_reloj')
    .select('*')
    .eq('id_usuario', userId)
    .order('recorded_at', { ascending: false });

  if (options?.origen) query = query.eq('origen', options.origen);
  if (options?.from) query = query.gte('recorded_at', options.from);
  if (options?.to) query = query.lte('recorded_at', options.to);
  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data as DatosReloj[]) ?? [];
}

/**
 * Marca un registro (manual) como reemplazado por otro (wearable) tras un conflicto (HU-25 CA-03).
 * Se usa para auditar el versionado de origen: reemplazado_por apunta al id del ganador.
 */
export async function markDatosRelojReemplazado(
  id: string,
  reemplazadoPor: string,
  accessToken?: string | null,
): Promise<void> {
  await rawRestFetch<null>('datos_reloj', {
    method: 'PATCH',
    body: { reemplazado_por: reemplazadoPor },
    prefer: 'return=minimal',
    query: `id=eq.${id}`,
    accessToken,
  });
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
  accessToken?: string | null,
): Promise<BaselineClinico> {
  const rows = await rawRestFetch<BaselineClinico[]>('baseline_clinico', {
    method: 'POST',
    body: baseline,
    prefer: 'resolution=merge-duplicates,return=representation',
    query: 'on_conflict=id_usuario',
    accessToken,
  });
  const row = rows[0];
  if (!row) throw new Error('No se pudo guardar el baseline clínico');
  return row;
}

// ═══════════════════════════════════════════
// FACTORES DE RIESGO CARDÍACO (ML)
// ═══════════════════════════════════════════

export async function upsertFactoresRiesgoCardiaco(
  factores: FactoresRiesgoCardiacoInsert,
  accessToken?: string | null,
): Promise<FactoresRiesgoCardiaco> {
  const rows = await rawRestFetch<FactoresRiesgoCardiaco[]>('factores_riesgo_cardiaco', {
    method: 'POST',
    body: factores,
    prefer: 'resolution=merge-duplicates,return=representation',
    query: 'on_conflict=id_usuario',
    accessToken,
  });
  const row = rows[0];
  if (!row) throw new Error('No se pudieron guardar los factores de riesgo');
  return row;
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
  accessToken?: string | null,
): Promise<SintomasUsuario> {
  const rows = await rawRestFetch<SintomasUsuario[]>('sintomas_usuario', {
    method: 'POST',
    body: sintoma,
    prefer: 'return=representation',
    accessToken,
  });
  const row = rows[0];
  if (!row) throw new Error('No se pudo registrar el síntoma');
  return row;
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
  accessToken?: string | null,
): Promise<void> {
  await rawRestFetch<null>('sintomas_usuario', {
    method: 'DELETE',
    prefer: 'return=minimal',
    query: `id_usuario=eq.${idUsuario}&recorded_at=eq.${encodeURIComponent(recordedAt)}`,
    accessToken,
  });
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
 *
 * @deprecated Desde HU-25 usar `syncWearableToBackend()` de `src/services/healthSync.ts`
 * (unifica normalización + dedupe + resolución de conflictos con prioridad wearable > manual).
 * Se mantiene para compatibilidad; el registro se marca con origen 'wearable'.
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
    bp_sistolica: null,
    bp_diastolica: null,
    frec_cardiaca_bpm: hr.value,
    spo2_pct: null,
    temperatura: null,
    nivel_estres: null,
    actividad_pasos: summary.steps,
    horas_sueno: summary.sleepMinutes > 0 ? summary.sleepMinutes / 60 : null,
    recorded_at: now,
    sospechoso: hr.sospechoso,
    origen: 'wearable',
  };

  return insertDatosReloj(dato);
}
