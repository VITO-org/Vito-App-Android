/**
 * HU-34 Fase A — Tipos del motor de sugerencias de Vittito.
 *
 * Fase A: motor de reglas local (sin IA ni red).
 * Fase C (futura): LlmSuggestionProvider reutiliza esta interfaz sin tocar UI.
 */
import type {HealthSummary} from '../../types/health';

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
}

/** Input del motor — wrapper sobre HealthSummary (puede ser null sin datos). */
export interface SuggestionInput {
  summary: HealthSummary | null;
}

/**
 * Interfaz SuggestionProvider (R3).
 * RulesSuggestionProvider la implementa en fase A;
 * LlmSuggestionProvider futura (fase C) la reutiliza sin tocar UI.
 */
export interface SuggestionProvider {
  getSuggestions(input: SuggestionInput): Suggestion[];
}
