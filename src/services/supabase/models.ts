// ──────────────────────────────────────────────
// Tipos de datos del dominio VITO
// Generado desde SupabaseModels.kt (branch conexion-supabase)
// ──────────────────────────────────────────────

// ─── ENUMS ───
export type RolUsuario = 'paciente' | 'familiar' | 'medico';
export type SexoBiologico = 'M' | 'F' | 'otro';
export type OptInStatus = 'pendiente' | 'activo' | 'rechazado';
export type CanalNotif = 'app' | 'whatsapp' | 'email';
export type FuenteDato = 'manual' | 'wearable' | 'api';
export type TipoMetrica = 'FREC_CARDIACA' | 'BP_SISTOLICA' | 'BP_DIASTOLICA' | 'SPO2' | 'TEMPERATURA';

// ─── TABLA: usuario ───
export interface Usuario {
  id: string;
  email: string;
  contraseña_hash: string | null;
  google_id: string | null;
  rol: RolUsuario;
  es_activo: boolean;
  created_at: string | null;
  updated_at: string | null;
}
export type UsuarioInsert = Omit<Usuario, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// ─── TABLA: perfil_usuario ───
export interface PerfilUsuario {
  id: string;
  user_id: string;
  nombre: string | null;
  apellido: string | null;
  dni: string | null;
  fecha_nac: string | null;
  sexo: SexoBiologico | null;
  genero: string | null;
  nacionalidad: string | null;
  telefono: string | null;
  direccion: string | null;
  avatar_url: string | null;
}
export type PerfilUsuarioInsert = Omit<PerfilUsuario, 'id'> & { id?: string };

// ─── TABLA: signo_vital ───
export interface SignoVital {
  id: string;
  id_usuario: string;
  tipo_metrica: TipoMetrica;
  valor: number;
  unidad: string | null;
  fuente: FuenteDato;
  id_dispositivo: string | null;
  is_outlier: boolean;
  recorded_at: string | null;
}
export type SignoVitalInsert = Omit<SignoVital, 'id'> & { id?: string };

// ─── TABLA: baseline_clinico ───
export interface BaselineClinico {
  id: string;
  id_usuario: string;
  hr_min: number | null;
  hr_max: number | null;
  bp_sist_min: number | null;
  bp_sist_max: number | null;
  bp_diast_min: number | null;
  bp_diast_max: number | null;
  spo2_min: number | null;
  temp_min: number | null;
  temp_max: number | null;
  updated_at: string | null;
}
export type BaselineClinicoInsert = Omit<BaselineClinico, 'id'> & { id?: string };

// ─── TABLA: datos_clinicos_config ───
export interface DatosClinicosConfig {
  id: string;
  id_usuario: string;
  peso_kg: number | null;
  altura_cm: number | null;
  bp_sistolica: number | null;
  bp_diastolica: number | null;
  frec_cardiaca_bpm: number | null;
  spo2_pct: number | null;
  temperatura: number | null;
  recorded_at: string | null;
}
export type DatosClinicosConfigInsert = Omit<DatosClinicosConfig, 'id'> & { id?: string };

// ─── TABLA: contacto_confianza ───
export interface ContactoConfianza {
  id: string;
  paciente_id: string;
  nombre: string;
  rol: string | null;
  telefono: string | null;
  email: string | null;
  es_primario: boolean;
  opt_in_status: OptInStatus;
  opt_in_expires_at: string | null;
  not_psicologica: boolean;
  not_mood: boolean;
  not_canal: CanalNotif;
}
export type ContactoConfianzaInsert = Omit<ContactoConfianza, 'id'> & { id?: string };

// ─── TABLA: patologia ───
export interface Patologia {
  id: string;
  nombre: string;
  codigo: string | null;
  descripcion: string | null;
  module_key: string | null;
}

// ─── TABLA: catalogo_sintoma ───
export interface CatalogoSintoma {
  id: string;
  name: string;
  categoria: string | null;
  id_patologia: string | null;
}

// ─── TABLA: sintoma_records ───
export interface SintomaRecord {
  id: string;
  id_usuario: string;
  id_sintoma: string;
  intensidad: number | null;
  descripcion: string | null;
  recorded_at: string | null;
}

// ─── TABLA: datos_reloj (lecturas de wearable) ───
export interface DatoReloj {
  id: string;
  id_usuario: string;
  bp_sistolica: number | null;
  bp_diastolica: number | null;
  frec_cardiaca_bpm: number | null;
  spo2_pct: number | null;
  temperatura: number | null;
  nivel_estres: number | null;
  actividad_pasos: number | null;
  horas_sueno: number | null;
  recorded_at: string | null;
}
export type DatoRelojInsert = Omit<DatoReloj, 'id'> & { id?: string };

// ─── Application-level types ───

export interface HealthSummaryForSync {
  steps: number;
  distanceMeters: number;
  caloriesKcal: number;
  sleepMinutes: number;
  averageBpm: number | null;
  exerciseSessions: number;
}

export interface SignoVitalInput {
  idUsuario: string;
  tipoMetrica: TipoMetrica;
  valor: number;
  unidad?: string;
  fuente?: FuenteDato;
  idDispositivo?: string;
}
