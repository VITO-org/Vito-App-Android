import { supabase } from './client';
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
  RolUsuario,
  TipoMetrica,
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
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as PerfilUsuario | null;
}

export async function upsertProfile(
  profile: Partial<PerfilUsuario> & { user_id: string },
): Promise<PerfilUsuario> {
  const { data, error } = await supabase
    .from('perfil_usuario')
    .upsert(profile, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return data as PerfilUsuario;
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
