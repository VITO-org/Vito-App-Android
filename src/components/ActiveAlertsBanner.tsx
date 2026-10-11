import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {colors, spacing, fontSize} from '../theme';
import type {Alerta} from '../services/supabase/models';
import {severityToColorKey, severityLabel, alertIcon, formatAlertTime, SEVERITY_COLORS} from '../utils/alertas';

interface ActiveAlertsBannerProps {
  alerts: Alerta[];
  onAlertPress?: (alert: Alerta) => void;
  onDismiss?: (alertId: string) => void;
  onSeeAll?: () => void;
}

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
  const [expanded, setExpanded] = useState(true);

  // Filtrar solo alertas no leídas (activas)
  const activeAlerts = alerts.filter(a => a.leida_en === null);

  // No mostrar nada si no hay alertas activas
  if (activeAlerts.length === 0) {
    return null;
  }

  // Severidad máxima del grupo: danger > warning > info
  const hasCritical = activeAlerts.some(a => a.severidad === 'critica');
  const hasWarning = activeAlerts.some(a => a.severidad === 'advertencia');
  const maxKey = hasCritical ? 'danger' : hasWarning ? 'warning' : 'info';
  const maxSev = SEVERITY_COLORS[maxKey];
  const pillLabel =
    maxKey === 'danger'
      ? (severityLabel('critica') ?? 'Alertas')
      : maxKey === 'warning'
        ? (severityLabel('advertencia') ?? 'Alertas')
        : 'Alertas';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alertas activas</Text>

      <View style={[styles.card, {borderLeftColor: maxSev.dot}]}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => setExpanded(prev => !prev)}
          activeOpacity={0.7}>
          <View style={[styles.maxPill, {backgroundColor: maxSev.dot}]}>
            <Text style={styles.pillHeart}>❤</Text>
            <Text style={styles.pillText}>{pillLabel}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.countText}>{`${activeAlerts.length} activa(s)`}</Text>
            <Text style={styles.chevron}>{expanded ? '⌃' : '⌄'}</Text>
          </View>
        </TouchableOpacity>

        {expanded &&
          activeAlerts.map(alert => {
            const colorKey = severityToColorKey(alert.severidad);
            const sev = SEVERITY_COLORS[colorKey];
            const isCritical = alert.severidad === 'critica';
            const tiempo = formatAlertTime(alert.created_at);

            return (
              <View key={alert.id} style={styles.row}>
                <TouchableOpacity
                  style={styles.rowContent}
                  onPress={() => onAlertPress?.(alert)}
                  disabled={!onAlertPress}>
                  <View style={[styles.alertIcon, {backgroundColor: sev.bg}]}>
                    <Text style={styles.alertEmoji}>{alertIcon(alert.tipo)}</Text>
                  </View>
                  <View style={styles.alertBody}>
                    <Text style={styles.alertTitle} numberOfLines={2}>
                      {alert.titulo}
                    </Text>
                    <Text style={styles.alertSubtitle} numberOfLines={2}>
                      {alert.mensaje ? `${alert.mensaje} • ${tiempo}` : tiempo}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Descarte solo para alertas no críticas */}
                {!isCritical && onDismiss && (
                  <TouchableOpacity
                    style={styles.dismissButton}
                    onPress={() => onDismiss(alert.id)}>
                    <Text style={styles.dismissButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.cardMarginBottom,
  },
  title: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.gridGap,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderLeftWidth: 3,
    padding: spacing.cardPadding,
    ...({
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    } as any),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  maxPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  pillHeart: {
    fontSize: 11,
    color: '#FFFFFF',
    marginRight: 5,
  },
  pillText: {
    fontSize: fontSize.badge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginRight: 6,
  },
  chevron: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.gridGap,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontWeight: '700',
    color: colors.textPrimary,
  },
  alertSubtitle: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
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
});

export default ActiveAlertsBanner;
