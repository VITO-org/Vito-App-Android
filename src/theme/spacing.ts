/**
 * Spacing, border-radius y sizing — diseño limpio con mucho espacio en blanco.
 *
 * Inspirado en diseño mobile de alta fidelidad: cards redondeadas (18-24px),
 * padding amplio, sombras suaves tipo tarjeta flotante.
 */

export const spacing = {
  // ── Screen ──────────────────────────────────────────────
  screenPaddingHorizontal: 24,
  screenPaddingTop: 60,
  screenPaddingBottom: 24,

  // ── Cards ───────────────────────────────────────────────
  cardPadding: 20,
  cardMarginBottom: 16,
  cardBorderRadius: 20,

  // ── Elementos ───────────────────────────────────────────
  buttonBorderRadius: 28,
  badgeBorderRadius: 12,
  avatarSize: 48,
  iconSize: 24,

  // ── Grid ────────────────────────────────────────────────
  gridGap: 12,
} as const;

export const fontSize = {
  /** Título de pantalla — 26px */
  title: 26,
  /** Subtítulo — 16px */
  subtitle: 16,
  /** Cuerpo — 14px */
  body: 14,
  /** Etiqueta pequeña — 12px */
  caption: 12,
  /** Valor de signo vital — 32px grande */
  metricValue: 32,
  /** Etiqueta de signo vital — 13px */
  metricLabel: 13,
  /** Badge de alerta — 11px */
  badge: 11,
} as const;

export const shadows = {
  /** Sombra suave tipo tarjeta flotante */
  card: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  /** Sombra para botón central (más pronunciada) */
  centerButton: {
    shadowColor: '#2FAF7A',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
} as const;
