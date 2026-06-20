import { supabase } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  PerfilUsuario,
  BaselineClinico,
  DatosReloj,
  DatosRelojInsert,
  FactoresRiesgoCardiaco,
  FactoresRiesgoCardiacoInsert,
  PromedioSemanalML,
  PrediccionRiesgo,
  SintomasUsuario,
  SintomasUsuarioInsert,
  CatSintoma,
  RolUsuario,
} from './models';

// ═══════════════════════════════════════════
// RAW FETCH HELPER (bypass @supabase/supabase-js bug con Hermes)
// ═══════════════════════════════════════════

const SUPABASE_URL = 'https://rkgbedehkfpiylaubjbo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrZ2JlZGVoa2ZwaXlsYXViamJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjE1NzYsImV4cCI6MjA5MTMzNzU3Nn0.8f9CewFjP6dtTbxAvmj5nCNn8JipXJpQWHjM7k_oeQo';

/**
 * Obtener el access_token del cliente Supabase.
 */
async function getAccessToken(): Promise<string | null> {
  const keys = [
    'sb-rkgbedehkfpiylaubjbo.supabase.co-auth-token',
    'sb-rkgbedehkfpiylaubjbo-auth-token',
  ];
  for (const key of keys) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed[0] ?? parsed?.access_token ?? null;
      }
    } catch {}
  }
  return null;
}

/**
 * Raw fetch a la Data API de Supabase (PostgREST).
 * NO usa @supabase/supabase-js — evita el bug que cuelga requests.
 */
async function rawSupabaseFetch<T>(
  table: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    query?: string;
    body?: unknown;
    prefer?: string;
    accessToken?: string | null;
  } = {},
): Promise<{ data: T | null; error: Error | null }> {
  try {
    let token = options.accessToken ?? null;
    if (!token) token = await getAccessToken();
    if (!token) return { data: null, error: new Error('No hay token de sesión') };

    const url = `${SUPABASE_URL}/rest/v1/${table}${options.query ?? ''}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY,
    };
    if (options.prefer) headers['Prefer'] = options.prefer;
    if (options.body) headers['Content-Type'] = 'application/json';

    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(tid);

    if (res.status === 204) return { data: null, error: null };

    const text = await res.text();
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const j = JSON.parse(text);
        msg = j.message ?? j.error ?? msg;
      } catch {}
      return { data: null, error: new Error(msg) };
    }

    const result = text ? (JSON.parse(text) as T) : null;
    return { data: result, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

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
// PERFIL DE USUARIO (usa raw fetch para evitar bug de la librería)
// ═══════════════════════════════════════════

export async function getProfile(
  userId: string,
  accessToken?: string | null,
): Promise<PerfilUsuario | null> {
  const { data, error } = await rawSupabaseFetch<PerfilUsuario[]>(
    'perfil_usuario',
    { query: `?user_id=eq.${userId}`, accessToken },
  );
  if (error) throw error;
  return (data ?? [])[0] ?? null;
}

export async function upsertProfile(
  profile: Partial<PerfilUsuario> & { user_id: string },
  accessToken?: string | null,
): Promise<PerfilUsuario> {
  const { data, error } = await rawSupabaseFetch<PerfilUsuario>(
    'perfil_usuario',
    {
      method: 'POST',
      query: '?on_conflict=user_id',
      body: profile,
      prefer: 'resolution=merge-duplicates,return=representation',
      accessToken,
    },
  );
  if (error) throw error;
  if (Array.isArray(data)) return (data as PerfilUsuario[])[0];
  if (data) return data as PerfilUsuario;
  throw new Error('No se pudo guardar el perfil');
}

// ═══════════════════════════════════════════
// DATOS RELOJ (smartwatch — cada 30 seg)
// ═══════════════════════════════════════════

export async function insertDatosReloj(dato: DatosRelojInsert): Promise<DatosReloj> {
  const { data, error } = await supabase
    .from('datos_reloj')
    .insert(dato)
    .select()
    .single();
  if (error) throw error;
  return data as DatosReloj;
}

export async function insertDatosRelojBatch(datos: DatosRelojInsert[]): Promise<DatosReloj[]> {
  const { data, error } = await supabase
    .from('datos_reloj')
    .insert(datos)
    .select();
  if (error) throw error;
  return (data as DatosReloj[]) ?? [];
}

export async function getDatosReloj(
  userId: string,
  options?: { from?: string; to?: string; limit?: number },
): Promise<DatosReloj[]> {
  let query = supabase
    .from('datos_reloj')
    .select('*')
    .eq('id_usuario', userId)
    .order('recorded_at', { ascending: false });

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
// SÍNTOMAS USUARIO (texto libre, sin catálogo)
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

  const dato: DatosRelojInsert = {
    id_usuario: userId,
    frec_cardiaca_bpm: summary.averageBpm,
    actividad_pasos: summary.steps,
    horas_sueno: summary.sleepMinutes > 0 ? summary.sleepMinutes / 60 : null,
    recorded_at: now,
  };

  return insertDatosReloj(dato);
}
