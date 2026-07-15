/**
 * Paleta cromática VITO — identidad visual verde, blanca y minimalista.
 *
 * Basada en el diseño de referencia: app de salud profesional,
 * amigable, moderna y confiable.
 */

export const colors = {
  // ── Verdes ──────────────────────────────────────────────
  /** Verde oscuro principal — títulos, botones primarios */
  primaryDark: '#063B3B',
  /** Verde petróleo — acentos secundarios */
  primaryTeal: '#0B6466',
  /** Verde principal — botones, estado activo */
  primary: '#2FAF7A',
  /** Verde suave — badges, detalles */
  primarySoft: '#7BC99A',
  /** Verde muy claro — fondos de pantalla */
  background: '#EAF8EF',
  /** Alternativa fondo más claro */
  backgroundLight: '#F3FBF6',

  // ── Neutros ─────────────────────────────────────────────
  /** Blanco puro — cards, superficies */
  surface: '#FFFFFF',
  /** Gris texto principal */
  textPrimary: '#202124',
  /** Gris secundario */
  textSecondary: '#6B7280',
  /** Borde sutil */
  border: '#E5E7EB',

  // ── Semáforo de alertas ─────────────────────────────────
  /** Rojo alerta crítica */
  danger: '#EF4444',
  /** Rojo fondo muy claro */
  dangerLight: '#FEF2F2',
  /** Naranja advertencia */
  warning: '#F59E0B',
  /** Naranja fondo muy claro */
  warningLight: '#FFFBEB',
  /** Verde éxito / seguro */
  success: '#2FAF7A',
  /** Verde fondo muy claro */
  successLight: '#F0FDF4',

  // ── Iconografía ─────────────────────────────────────────
  /** Rojo para icono de corazón / frecuencia cardíaca */
  heartRed: '#EF4444',
  /** Azul para oxigenación */
  oxygenBlue: '#3B82F6',
  /** Rojo para temperatura */
  tempRed: '#EF4444',
} as const;

export type ColorKey = keyof typeof colors;
