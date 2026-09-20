/**
 * HU-34 Fase A — Tipos del motor de sugerencias de Vittito.
 *
 * Fase A: motor de reglas local (sin IA ni red).
 * Fase C (futura): LlmSuggestionProvider reutiliza esta interfaz sin tocar UI.
 */
import type {HealthSummary} from '../../types/health';
import type {TendenciasSalud} from './supabaseMapper';
import type {AlertType} from '../alerts/types';

/** Prioridad de sugerencia — orden Alta > Media > Baja. */
export type PrioridadSugerencia = 'Alta' | 'Media' | 'Baja';

/** Sugerencia de salud personalizada de Vittito. */
export interface Suggestion {
  /** ID estable (para orden determinista y persistencia seen/done). */
  id: string;
  /** Emoji representativo (patrón VitalSignCard). */
  icon: string;
  /** Título corto para la tarjeta. */
  titulo: string;
  /** Prioridad para ordenamiento y etiqueta. */
  prioridad: PrioridadSugerencia;
  /** Descripción ampliada (modal detalle). */
  descripcion: string;
  /** Motivo: qué dato la disparó (modal detalle). */
  motivo: string;
  /** Acciones concretas recomendadas (modal detalle). */
  acciones: string[];
  /** True si está asociada a un signo vital fuera de rango (desempate R2). */
  fueraDeRango: boolean;
  /** SCRUM-202: fecha/hora del dato que disparó la sugerencia (ISO string). */
  recordedAt?: string;
}

/** Input del motor — wrapper sobre HealthSummary (puede ser null sin datos). */
export interface SuggestionInput {
  summary: HealthSummary | null;
  /** SCRUM-202: tendencias 14d para reglas de bienestar (opcional, sin trends = solo reglas base). */
  tendencias?: TendenciasSalud | null;
  /** SCRUM-202: tipos de alerta activa para suprimir sugerencias duplicadas. */
  alertasActivas?: AlertType[];
  /** SCRUM-202: fecha/hora del dato más reciente (ISO string). Se propaga a cada sugerencia. */
  recordedAt?: string;
}

/**
 * Interfaz SuggestionProvider (R3).
 * RulesSuggestionProvider la implementa en fase A;
 * LlmSuggestionProvider futura (fase C) la reutiliza sin tocar UI.
 */
export interface SuggestionProvider {
  getSuggestions(input: SuggestionInput): Suggestion[];
}
