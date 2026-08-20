// ──────────────────────────────────────────────
// Tipos de datos del dominio VITO
// Versión HU-92: datos orientados a ML
// ──────────────────────────────────────────────

// ─── ENUMS ───
export type RolUsuario = 'paciente' | 'familiar' | 'medico';
export type SexoBiologico = 'M' | 'F' | 'otro';
export type TipoPatologia = 'ninguna' | 'diabetes' | 'hipertension' | 'alzheimer' | 'otra';
export type CatSintoma = 'fisico' | 'emocional';
export type OrigenSintoma = 'chat_ia' | 'manual';
/** Origen de un registro de datos_reloj (HU-25 CA-02/CA-03). */
export type OrigenDato = 'wearable' | 'manual';
export type FuenteDato = 'manual' | 'dispositivo' | 'integracion';

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

// ─── TABLA: perfil_usuario (con patologia, peso_kg, altura_cm) ───
export interface PerfilUsuario {
  id: string;
  id_usuario: string;
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
  peso_kg: number | null;
  altura_cm: number | null;
  patologia: TipoPatologia | null;
  patologia_descripcion: string | null;
  /** Intervalo de sincronización automática en minutos (HU-25 CA-01). NULL => default 10 min en la app. */
  intervalo_sync_min?: number | null;
}
export type PerfilUsuarioInsert = Omit<PerfilUsuario, 'id'> & { id?: string };

// ─── TABLA: datos_reloj (cada 30 seg desde smartwatch) ───
export interface DatosReloj {
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
  sospechoso: boolean | null;
  /** Origen de dato: 'wearable' | 'manual' (HU-25, versionado/auditoría). Nullable para no romper lecturas previas a la migración. */
  origen?: OrigenDato | null;
  /** id del registro wearable que ganó el conflicto y reemplazó a este (CA-03). */
  reemplazado_por?: string | null;
}
export type DatosRelojInsert = {
  id?: string;
  id_usuario: string;
  bp_sistolica?: number | null;
  bp_diastolica?: number | null;
  frec_cardiaca_bpm?: number | null;
  spo2_pct?: number | null;
  temperatura?: number | null;
  nivel_estres?: number | null;
  actividad_pasos?: number | null;
  horas_sueno?: number | null;
  recorded_at?: string | null;
  sospechoso?: boolean | null;
};

// ─── TABLA: dato_salud_ml (series de tiempo normalizado para ML) ───
export interface DatoSaludML {
  id: string;
  id_usuario: string;
  tipo_metrica: string;
  valor: number;
  unidad: string;
  fuente: FuenteDato;
  recorded_at: string;
  created_at: string;
}
export type DatoSaludMLInsert = Omit<DatoSaludML, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

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

// ─── TABLA: sintomas (catálogo controlado) ───
export interface Sintoma {
  id_sintomas: string;
  nombre: string;
  descripcion: string | null;
  categoria: CatSintoma;
  icono: string | null;
  activo: boolean;
  created_at: string | null;
}
export type SintomaInsert = Omit<Sintoma, 'id_sintomas' | 'created_at'> & {
  id_sintomas?: string;
  created_at?: string;
};

// ─── TABLA: sintomas_usuario (registro del paciente) ───
export interface SintomasUsuario {
  id_usuario: string;
  id_sintomas: string | null;
  descripcion: string | null;
  categoria: CatSintoma;
  intensidad: number | null;
  fecha: string | null;
  hora: string | null;
  origen: OrigenSintoma;
  recorded_at: string | null;
}
export type SintomasUsuarioInsert = Omit<SintomasUsuario, 'recorded_at'> & {
  recorded_at?: string;
};

// ─── TABLA: factores_riesgo_cardiaco (formulario opcional ML) ───
export interface FactoresRiesgoCardiaco {
  id_usuario: string;
  diabetes: boolean | null;
  antecedentes_familiares: boolean | null;
  fumador: boolean | null;
  obesidad: boolean | null;
  consumo_alcohol: boolean | null;
  tipo_dieta: 'saludable' | 'normal' | 'no saludable' | null;
  problemas_cardiacos_previos: boolean | null;
  uso_medicacion: boolean | null;
  updated_at: string | null;
}
export type FactoresRiesgoCardiacoInsert = Omit<FactoresRiesgoCardiaco, 'updated_at'> & {
  updated_at?: string;
};

// ─── TABLA: promedio_semanal_ml (features para ML) ───
export interface PromedioSemanalML {
  id: string;
  id_usuario: string;
  semana_inicio: string;
  bp_sistolica_prom: number | null;
  bp_diastolica_prom: number | null;
  frec_cardiaca_prom: number | null;
  spo2_prom: number | null;
  nivel_estres_prom: number | null;
  pasos_diarios_prom: number | null;
  horas_sueno_prom: number | null;
  total_lecturas: number | null;
  created_at: string | null;
}
export type PromedioSemanalMLInsert = Omit<PromedioSemanalML, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// ─── TABLA: prediccion_riesgo (resultados del modelo ML) ───
export interface PrediccionRiesgo {
  id: string;
  id_usuario: string;
  riesgo: 'bajo' | 'medio' | 'alto';
  score: number | null;
  modelo_version: string | null;
  factores_mas_influyentes: Record<string, number> | null;
  datos_entrada: string | null;
  created_at: string | null;
}
export type PrediccionRiesgoInsert = Omit<PrediccionRiesgo, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// ─── TABLA: alerta (HU-41 — Sistema de Alertas Inteligentes) ───
export type TipoAlerta = 'hipoxia';
export type SeveridadAlerta = 'INFO' | 'advertencia' | 'critica';

/**
 * Datos flexibles almacenados en el jsonb `datos` de cada alerta.
 * Permite guardar contexto extra sin cambiar el schema de la tabla.
 * Extiende Record<string, unknown> para ser compatible con AlertRecord.datos.
 */
export interface AlertaDatos extends Record<string, unknown> {
  /** SpO₂ value that triggered the alert (percentage). */
  valor_registrado?: number;
  /** Threshold that was exceeded (percentage). */
  umbral_configurado?: number;
  /** Device or source that produced the reading. */
  dispositivo_origen?: string;
  /** Whether the alert was escalated (time-based). */
  escalada?: boolean;
  /** ISO timestamp when the alert was escalated. */
  escalated_at?: string;
  /** Contact to whom the alert was escalated. */
  escalated_to?: string;
}

export interface Alerta {
  id: string;
  id_usuario: string;
  id_dato_reloj: string | null;
  id_prediccion_riesgo: string | null;
  tipo: TipoAlerta;
  severidad: SeveridadAlerta;
  titulo: string;
  mensaje: string;
  datos: AlertaDatos | null;
  leida_en: string | null;
  created_at: string;
  expira_en: string | null;
}
export type AlertaInsert = Omit<Alerta, 'id' | 'created_at'> & { id?: string; created_at?: string };

// ─── TABLA: dispositivo_usuario (tokens FCM para push) ───
export interface DispositivoUsuario {
  id: string;
  id_usuario: string;
  fcm_token: string;
  plataforma: string;
  activo: boolean;
  last_seen_at: string | null;
  created_at: string;
}
export type DispositivoUsuarioInsert = Omit<DispositivoUsuario, 'id' | 'created_at'> & { id?: string; created_at?: string };

// ─── TABLA: preferencia_notificacion ───
export interface PreferenciaNotificacion {
  id_usuario: string;
  push_habilitado: boolean | null;
  alertas_criticas: boolean | null;
  alertas_info: boolean | null;
  updated_at: string | null;
}
export type PreferenciaNotificacionInsert = Omit<PreferenciaNotificacion, 'updated_at'> & { updated_at?: string };

// ─── TABLA: notificacion_entrega (Fase 2 — registro de entregas push) ───
export interface NotificacionEntrega {
  id: string;
  id_alerta: string | null;
  id_dispositivo: string | null;
  estado: string;
  enviado_en: string | null;
  error_mensaje: string | null;
  created_at: string | null;
}
export type NotificacionEntregaInsert = Omit<NotificacionEntrega, 'id' | 'created_at'> & { id?: string; created_at?: string };

// ─── Application-level types ───

export interface HealthSummaryForSync {
  steps: number;
  distanceMeters: number;
  caloriesKcal: number;
  sleepMinutes: number;
  averageBpm: number | null;
  exerciseSessions: number;
}
