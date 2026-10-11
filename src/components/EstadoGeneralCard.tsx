import React, {useState} from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import {colors, spacing, fontSize, shadows} from '../theme';
import {getEstadoGeneral, type EstadoGeneral} from '../utils/estadoGeneral';
import {
  cleanAlertTitle,
  getAlertValue,
  SEVERITY_COLORS,
} from '../utils/alertas';
import type {Alerta} from '../services/supabase/models';
import type {HealthSummary} from '../types/health';

export interface EstadoGeneralCardProps {
  alerts: Alerta[];
  summary: HealthSummary | null;
  lastSync: Date | null;
  onAlertPress?: (alert: Alerta) => void;
  onReview?: () => void;
}

// ── Paleta semáforo ─────────────────────────────────────────────────
//  verde  → bien      (#2FAF7A / fondo #E6F4EC)
//  rojo   → critico   (#C62828 / fondo #FDECEC)
//  ámbar  → advertencia (#D97706 / fondo #FFF4E0)
//  gris   → sin-datos (#6B7280 / fondo #EEF2EF)

interface EstadoVisual {
  /** Color principal (texto del badge, punto, escudo) */
  color: string;
  /** Fondo del punto y del botón "Revisar" */
  bg: string;
  /** Emoji o símbolo del ícono principal */
  icon: string;
  /** Tipo de ícono a renderizar */
  iconType: 'check' | 'bang' | 'clock';
}

const VISUAL: Record<EstadoGeneral, EstadoVisual> = {
  bien: {
    color: colors.success,          // verde
    bg:    '#E6F4EC',
    icon:  '✓',
    iconType: 'check',
  },
  revisar: {
    color: colors.critical,         // rojo #C62828
    bg:    '#FDECEC',
    icon:  '!',
    iconType: 'bang',
  },
  'requiere-atencion': {
    color: colors.warningStrong,    // ámbar #D97706
    bg:    '#FFF4E0',
    icon:  '!',
    iconType: 'bang',
  },
  'sin-datos': {
    color: colors.textSecondary,    // gris
    bg:    '#EEF2EF',
    icon:  '∟',
    iconType: 'clock',
  },
};

function coloresPorSeveridad(severidad: Alerta['severidad']) {
  if (severidad === 'critica') return SEVERITY_COLORS.danger;
  if (severidad === 'advertencia') return SEVERITY_COLORS.warning;
  return SEVERITY_COLORS.info;
}

/**
 * EstadoGeneralCard — tarjeta de estado general del dashboard.
 *
 * Implementa la misma lógica de EstadoGeneralCard.jsx (colapsable,
 * chips de resumen, lista desplegable) con 3 estados semáforo:
 *   🟢 Verde   — sin alertas activas
 *   🟡 Ámbar   — hay advertencias
 *   🔴 Rojo    — hay alertas críticas
 *
 * El título y el subtítulo se generan dinámicamente desde las alertas
 * reales (tipo y cantidad), nunca con texto inventado.
 */
const EstadoGeneralCard: React.FC<EstadoGeneralCardProps> = ({
  alerts,
  summary,
  lastSync,
  onAlertPress,
  onReview,
}) => {
  const resultado = getEstadoGeneral({activeAlerts: alerts, summary, lastSync});
  const visual    = VISUAL[resultado.estado];
  const hasAlerts = alerts.length > 0;
  const alertZoneBg = resultado.estado === 'revisar' ? '#FFF7F7' : colors.surface;
  const [expanded, setExpanded] = useState(false);

  // ── Render del ícono de estado ───────────────────────────────────
  const StatusIcon = () => {
    if (visual.iconType === 'check') {
      return (
        <View style={[styles.statusCircle, {backgroundColor: visual.color}]}>
          <Text style={styles.statusIconText}>✓</Text>
        </View>
      );
    }
    if (visual.iconType === 'bang') {
      return (
        <View style={[styles.statusCircle, {backgroundColor: visual.color}]}>
          <Text style={styles.bangIconText}>!</Text>
        </View>
      );
    }
    // clock (sin-datos)
    return (
      <View style={[styles.statusCircle, {backgroundColor: visual.bg}]}>
        <View style={styles.clockRing}>
          <Text style={[styles.clockHandsText, {color: visual.color}]}>∟</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.card, {backgroundColor: visual.bg}]}>
      {/*
       * ── Cabecera ────────────────────────────────────────────────────
       * Si hay alertas → navega directamente a la pantalla Alertas.
       * Si no → muestra el estado pero sin interacción.
       */}
      <Pressable
        onPress={hasAlerts ? onReview : undefined}
        accessibilityRole={hasAlerts ? 'button' : 'text'}
        accessibilityLabel={`Estado general: ${resultado.badgeLabel}. ${resultado.mensaje}`}
        style={({pressed}) => [
          styles.header,
          hasAlerts && pressed && styles.headerPressed,
        ]}>

        {/* Textos a la izquierda */}
        <View style={styles.headerText}>
          <Text style={styles.sectionLabel}>Estado general</Text>
          <Text style={[styles.badgeLabel, {color: visual.color}]}>
            {resultado.badgeLabel}
          </Text>
          <Text style={styles.mensaje}>{resultado.mensaje}</Text>
        </View>

        {/* Ícono de estado a la derecha */}
        <StatusIcon />
      </Pressable>

      {/* Última actualización */}
      {lastSync != null && (
        <Text style={styles.syncText}>
          Última actualización:{' '}
          {lastSync.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
          })}{' '}
          h
        </Text>
      )}

      {/*
       * ── Fila "Ver alertas" desplegable ──────────────────────────────
       * Tap alterna la lista expandida; ya no navega a Alertas.
       */}
      {hasAlerts && (
        <View style={[styles.alertZone, {backgroundColor: alertZoneBg}]}>
          <Pressable
            onPress={() => setExpanded(v => !v)}
            style={({pressed}) => [
              styles.verAlertasRow,
              {borderTopColor: colors.border},
              pressed && styles.verAlertasPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Ocultar alertas' : 'Ver alertas'}
            accessibilityState={{expanded}}>
            <Text style={[styles.verAlertasText, {color: visual.color}]}>
              Ver alertas
            </Text>
            <Text style={[styles.verAlertasChevron, {color: visual.color}]}>
              {expanded ? '⌃' : '⌄'}
            </Text>
          </Pressable>
          {expanded && (
            <View style={styles.alertList}>
              {alerts.map((a, index) => {
                const sev = coloresPorSeveridad(a.severidad);
                const value = getAlertValue(a);
                return (
                  <Pressable
                    key={a.id}
                    onPress={onAlertPress ? () => onAlertPress(a) : undefined}
                    accessibilityRole="button"
                    accessibilityLabel={`Alerta ${cleanAlertTitle(a.titulo)}${value ? `: ${value}` : ''}`}
                    style={({pressed}) => [
                      styles.alertRow,
                      index > 0 && {
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: colors.border,
                      },
                      pressed && styles.verAlertasPressed,
                    ]}>
                    <Text style={styles.alertTitle}>
                      {cleanAlertTitle(a.titulo)}
                    </Text>
                    {value !== '' && (
                      <Text style={[styles.alertValue, {color: sev.text}]}>
                        {value}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// ── Estilos ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.cardBorderRadius,
    padding: spacing.cardPadding,
    marginBottom: spacing.cardMarginBottom,
    ...shadows.card,
  },

  // Cabecera
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerPressed: {
    opacity: 0.75,
  },

  // Ícono de estado (círculo izquierdo)
  statusCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInnerCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
  },
  bangIconText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
  },
  clockRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockHandsText: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: -2,
    marginLeft: 3,
  },

  // Textos izquierda
  headerText: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  badgeLabel: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 1,
  },
  mensaje: {
    fontSize: fontSize.metricLabel,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Flecha de navegación (reemplaza al chevron de expandir)
  navArrow: {
    fontSize: 26,
    fontWeight: '300',
    paddingHorizontal: 4,
    marginLeft: 2,
  },

  // Última actualización
  syncText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 8,
  },

  // Zona desplegable "Ver alertas" — fondo más claro que la card, ancho completo
  alertZone: {
    marginTop: 12,
    marginHorizontal: -spacing.cardPadding,
    paddingHorizontal: spacing.cardPadding,
    marginBottom: -spacing.cardPadding,
    paddingBottom: spacing.cardPadding,
    borderBottomLeftRadius: spacing.cardBorderRadius,
    borderBottomRightRadius: spacing.cardBorderRadius,
  },
  // Fila "Ver alertas" — siempre visible al pie cuando hay alertas
  verAlertasRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 0,
    paddingTop: 12,
    borderTopWidth: 1,
    backgroundColor: 'transparent',
  },
  verAlertasPressed: {
    opacity: 0.7,
  },
  verAlertasText: {
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  verAlertasChevron: {
    fontSize: 22,
    fontWeight: '300',
  },
  alertList: {
    marginTop: 8,
  },
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  alertTitle: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginRight: 12,
  },
  alertValue: {
    fontSize: fontSize.body,
    fontWeight: '700',
  },
});

export default EstadoGeneralCard;
