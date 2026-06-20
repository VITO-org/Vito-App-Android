import { supabase } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Usuario,
  PerfilUsuario,
  SignoVital,
  SignoVitalInsert,
  BaselineClinico,
  DatosClinicosConfig,
  ContactoConfianza,
  ContactoConfianzaInsert,
  Patologia,
  CatalogoSintoma,
  SintomaRecord,
  DatoReloj,
  DatoRelojInsert,
  RolUsuario,
  TipoMetrica,
} from './models';

// ═══════════════════════════════════════════
// RAW FETCH HELPER (bypass @supabase/supabase-js bug con Hermes)
// ═══════════════════════════════════════════

const SUPABASE_URL = 'https://rkgbedehkfpiylaubjbo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrZ2JlZGVoa2ZwaXlsYXViamJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjE1NzYsImV4cCI6MjA5MTMzNzU3Nn0.8f9CewFjP6dtTbxAvmj5nCNn8JipXJpQWHjM7k_oeQo';

/**
 * Obtener el access_token del cliente Supabase.
 * NOTA: No funciona reliablemente con @supabase/supabase-js v2.107.0 + Hermes.
 * Los callers deberían pasar el token desde el contexto React cuando sea posible.
 */
async function getAccessToken(): Promise<string | null> {
  // La key que usa @supabase/supabase-js internamente
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
    query?: string; // ej: "?id=eq.xxx"
    body?: unknown;
    prefer?: string;
    select?: string;
    accessToken?: string | null; // Pasar desde el contexto React para evitar llamar a getAccessToken()
  } = {},
): Promise<{ data: T | null; error: Error | null }> {
  try {
    // Usar token pasado directamente, o intentar obtenerlo de AsyncStorage
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

    // Timeout de 15s
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(tid);

    // 204 No Content
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
// PERFIL DE USUARIO
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
// SIGNOS VITALES
// ═══════════════════════════════════════════

export async function insertSignoVital(signo: SignoVitalInsert): Promise<SignoVital> {
  const { data, error } = await supabase
    .from('signo_vital')
    .insert(signo)
    .select()
    .single();
  if (error) throw error;
  return data as SignoVital;
}

export async function insertSignosVitalesBatch(signos: SignoVitalInsert[]): Promise<SignoVital[]> {
  const { data, error } = await supabase
    .from('signo_vital')
    .insert(signos)
    .select();
  if (error) throw error;
  return (data as SignoVital[]) ?? [];
}

export async function getSignosVitales(
  userId: string,
  options?: { tipoMetrica?: TipoMetrica; from?: string; to?: string; limit?: number },
): Promise<SignoVital[]> {
  let query = supabase
    .from('signo_vital')
    .select('*')
    .eq('id_usuario', userId)
    .order('recorded_at', { ascending: false });

  if (options?.tipoMetrica) query = query.eq('tipo_metrica', options.tipoMetrica);
  if (options?.from) query = query.gte('recorded_at', options.from);
  if (options?.to) query = query.lte('recorded_at', options.to);
  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data as SignoVital[]) ?? [];
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
// CONFIGURACIÓN CLÍNICA
// ═══════════════════════════════════════════

export async function getDatosClinicosConfig(userId: string): Promise<DatosClinicosConfig | null> {
  const { data, error } = await supabase
    .from('datos_clinicos_config')
    .select('*')
    .eq('id_usuario', userId)
    .maybeSingle();
  if (error) throw error;
  return data as DatosClinicosConfig | null;
}

export async function upsertDatosClinicosConfig(
  config: Partial<DatosClinicosConfig> & { id_usuario: string },
): Promise<DatosClinicosConfig> {
  const { data, error } = await supabase
    .from('datos_clinicos_config')
    .upsert(config, { onConflict: 'id_usuario' })
    .select()
    .single();
  if (error) throw error;
  return data as DatosClinicosConfig;
}

// ═══════════════════════════════════════════
// CONTACTOS DE CONFIANZA
// ═══════════════════════════════════════════

export async function getContactos(pacienteId: string): Promise<ContactoConfianza[]> {
  const { data, error } = await supabase
    .from('contacto_confianza')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('es_primario', { ascending: false });
  if (error) throw error;
  return (data as ContactoConfianza[]) ?? [];
}

export async function createContacto(
  contacto: ContactoConfianzaInsert,
): Promise<ContactoConfianza> {
  const { data, error } = await supabase
    .from('contacto_confianza')
    .insert(contacto)
    .select()
    .single();
  if (error) throw error;
  return data as ContactoConfianza;
}

export async function updateContacto(
  id: string,
  changes: Partial<ContactoConfianza>,
): Promise<ContactoConfianza> {
  const { data, error } = await supabase
    .from('contacto_confianza')
    .update(changes)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ContactoConfianza;
}

export async function deleteContacto(id: string): Promise<void> {
  const { error } = await supabase.from('contacto_confianza').delete().eq('id', id);
  if (error) throw error;
}

// ═══════════════════════════════════════════
// PATOLOGÍAS Y SÍNTOMAS
// ═══════════════════════════════════════════

export async function getPatologias(): Promise<Patologia[]> {
  const { data, error } = await supabase.from('patologia').select('*').order('nombre');
  if (error) throw error;
  return (data as Patologia[]) ?? [];
}

export async function getCatalogoSintomas(patologiaId?: string): Promise<CatalogoSintoma[]> {
  let query = supabase.from('catalogo_sintoma').select('*').order('name');
  if (patologiaId) query = query.eq('id_patologia', patologiaId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as CatalogoSintoma[]) ?? [];
}

export async function insertSintomaRecord(record: {
  id_usuario: string;
  id_sintoma: string;
  intensidad?: number;
  descripcion?: string;
}): Promise<SintomaRecord> {
  const { data, error } = await supabase
    .from('sintoma_records')
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data as SintomaRecord;
}

export async function getSintomaRecords(
  userId: string,
  options?: { from?: string; to?: string; limit?: number },
): Promise<SintomaRecord[]> {
  let query = supabase
    .from('sintoma_records')
    .select('*')
    .eq('id_usuario', userId)
    .order('recorded_at', { ascending: false });

  if (options?.from) query = query.gte('recorded_at', options.from);
  if (options?.to) query = query.lte('recorded_at', options.to);
  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data as SintomaRecord[]) ?? [];
}

// ═══════════════════════════════════════════
// PATOLOGÍAS DEL PACIENTE
// ═══════════════════════════════════════════

export async function addPatologiaPaciente(
  idUsuario: string,
  idPatologia: string,
  fechaDiagnosticado?: string,
) {
  const { data, error } = await supabase
    .from('patologia_paciente')
    .insert({
      id_usuario: idUsuario,
      id_patologia: idPatologia,
      fecha_diagnosticado: fechaDiagnosticado ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getPatologiasPaciente(userId: string) {
  const { data, error } = await supabase
    .from('patologia_paciente')
    .select('*, patologia(*)')
    .eq('id_usuario', userId);
  if (error) throw error;
  return data;
}

// ═══════════════════════════════════════════
// SINCRONIZACIÓN HEALTH CONNECT → SUPABASE
// ═══════════════════════════════════════════

/**
 * Convierte el resumen de Health Connect en signos vitales y los inserta.
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
): Promise<SignoVital[]> {
  const now = new Date().toISOString();
  const signos: SignoVitalInsert[] = [];

  if (summary.averageBpm != null) {
    signos.push({
      id_usuario: userId,
      tipo_metrica: 'FREC_CARDIACA',
      valor: summary.averageBpm,
      unidad: 'bpm',
      fuente: 'wearable',
      id_dispositivo: null,
      is_outlier: false,
      recorded_at: now,
    });
  }

  if (signos.length === 0) return [];
  return insertSignosVitalesBatch(signos);
}

// ═══════════════════════════════════════════
// DATOS_RELOJ (lecturas de wearable)
// ═══════════════════════════════════════════

/**
 * Insertar una lectura del reloj/wearable.
 */
export async function insertDatoReloj(dato: DatoRelojInsert): Promise<DatoReloj> {
  const { data, error } = await supabase
    .from('datos_reloj')
    .insert(dato)
    .select()
    .single();
  if (error) throw error;
  return data as DatoReloj;
}

/**
 * Insertar un lote de lecturas del wearable (ej. al sincronizar).
 */
export async function insertDatosRelojBatch(datos: DatoRelojInsert[]): Promise<DatoReloj[]> {
  const { data, error } = await supabase
    .from('datos_reloj')
    .insert(datos)
    .select();
  if (error) throw error;
  return (data as DatoReloj[]) ?? [];
}

/**
 * Obtener lecturas del reloj para un usuario, ordenadas por fecha descendente.
 */
export async function getDatosReloj(
  userId: string,
  options?: {
    from?: string;
    to?: string;
    limit?: number;
    latest?: boolean;
  },
): Promise<DatoReloj[]> {
  let query = supabase
    .from('datos_reloj')
    .select('*')
    .eq('id_usuario', userId)
    .order('recorded_at', { ascending: false });

  if (options?.from) query = query.gte('recorded_at', options.from);
  if (options?.to) query = query.lte('recorded_at', options.to);
  if (options?.latest) query = query.limit(1);
  else if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data as DatoReloj[]) ?? [];
}

/**
 * Eliminar una lectura del reloj por ID.
 */
export async function deleteDatoReloj(id: string): Promise<void> {
  const { error } = await supabase.from('datos_reloj').delete().eq('id', id);
  if (error) throw error;
}
