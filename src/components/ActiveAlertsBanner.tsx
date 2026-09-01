import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {colors, spacing, fontSize} from '../theme';
import type {Alerta} from '../services/supabase/models';

interface ActiveAlertsBannerProps {
  alerts: Alerta[];
  onAlertPress?: (alert: Alerta) => void;
  onDismiss?: (alertId: string) => void;
  onSeeAll?: () => void;
}

/**
 * Map Supabase severidad to UI severity color key.
 */
function severityToColorKey(severidad: Alerta['severidad']): 'danger' | 'warning' | 'info' {
  if (severidad === 'critica') return 'danger';
  if (severidad === 'advertencia') return 'warning';
  return 'info';
}

/**
 * Get the appropriate icon for the alert type.
 */
function alertIcon(tipo: Alerta['tipo']): string {
  switch (tipo) {
    case 'hipoxia': return '\uD83E\uDEC1'; // 🫁
    case 'hipertension': return '\u26A0\uFE0F'; // ⚠️
    case 'hipotension': return '\u2B07\uFE0F'; // ⬇️
    case 'taquicardia': return '\u2764\uFE0F'; // ❤️
    case 'bradicardia': return '\uD83E\uDDE0'; // 🧠
    default: return '\uD83D\uDD14'; // 🔔
  }
}

/**
 * Format ISO timestamp to a human-readable string.
 */
function formatAlertTime(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours}h`;
  return date.toLocaleDateString('es-AR', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
}

const SEVERITY_COLORS: Record<'danger' | 'warning' | 'info', {bg: string; dot: string; text: string}> = {
  danger: {bg: colors.dangerLight, dot: colors.danger, text: colors.danger},
  warning: {bg: colors.warningLight, dot: colors.warning, text: colors.warning},
  info: {bg: colors.surface, dot: colors.textSecondary, text: colors.textSecondary},
};

/**
 * ActiveAlertsBanner — Muestra alertas activas en el dashboard principal.
 *
 * Características:
 * - Solo muestra alertas no leídas (activas)
 * - Las alertas críticas NO se pueden descartar
 * - Las alertas no críticas SÍ se pueden descartar
 * - Se ocupa completamente si no hay alertas activas
 */
const ActiveAlertsBanner: React.FC<ActiveAlertsBannerProps> = ({
  alerts,
  onAlertPress,
  onDismiss,
  onSeeAll,
}) => {
  // Filtrar solo alertas no leídas (activas)
  const activeAlerts = alerts.filter(a => a.leida_en === null);

  // No mostrar nada si no hay alertas activas
  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alertas activas</Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll}>
            <Text style={styles.seeAll}>Ver todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {activeAlerts.map(alert => {
        const colorKey = severityToColorKey(alert.severidad);
        const sev = SEVERITY_COLORS[colorKey];
        const isCritical = alert.severidad === 'critica';

        return (
          <View key={alert.id} style={[styles.alertCard, {borderLeftColor: sev.dot}]}>
            <TouchableOpacity
              style={styles.alertContent}
              onPress={() => onAlertPress?.(alert)}
              disabled={!onAlertPress}>
              <View style={[styles.alertIcon, {backgroundColor: sev.bg}]}>
                <Text style={styles.alertEmoji}>{alertIcon(alert.tipo)}</Text>
              </View>
              <View style={styles.alertBody}>
                <Text style={styles.alertTitle}>{alert.titulo}</Text>
                <Text style={styles.alertTime}>{formatAlertTime(alert.created_at)}</Text>
                {alert.mensaje ? (
                  <Text style={[styles.alertDesc, {color: sev.text}]} numberOfLines={2}>
                    {alert.mensaje}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>

            {/* Botón de descarte solo para alertas no críticas */}
            {!isCritical && onDismiss && (
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={() => onDismiss(alert.id)}>
                <Text style={styles.dismissButtonText}>✕</Text>
              </TouchableOpacity>
            )}

            {/* Indicador de alerta crítica (no descartable) */}
            {isCritical && (
              <View style={styles.criticalBadge}>
                <Text style={styles.criticalBadgeText}>Crítica</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.cardMarginBottom,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.gridGap,
  },
  title: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  seeAll: {
    fontSize: fontSize.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderLeftWidth: 3,
    padding: spacing.cardPadding,
    marginBottom: spacing.gridGap,
    ...({
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    } as any),
  },
  alertContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.gridGap,
  },
  alertEmoji: {
    fontSize: 16,
  },
  alertBody: {
    flex: 1,
  },
  alertTitle: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  alertTime: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  alertDesc: {
    fontSize: fontSize.caption,
    marginTop: 4,
    lineHeight: 18,
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.gridGap,
  },
  dismissButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  criticalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.dangerLight,
    marginLeft: spacing.gridGap,
  },
  criticalBadgeText: {
    fontSize: fontSize.badge,
    color: colors.danger,
    fontWeight: '600',
  },
});

export default ActiveAlertsBanner;
