import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import {colors, spacing, fontSize, shadows} from '../theme';
import type {Alerta} from '../services/supabase/models';
import {
  severityToColorKey,
  alertIcon,
  formatAlertTime,
  formatAlertClockTime,
  SEVERITY_COLORS,
  cleanAlertTitle,
  getUmbralOnlyLabel,
  getAlertValue,
} from '../utils/alertas';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ActiveAlertsBannerProps {
  alerts: Alerta[];
  onAlertPress?: (alert: Alerta) => void;
  onDismiss?: (alertId: string) => void;
  onSeeAll?: () => void;
}

/**
 * ActiveAlertsBanner — Muestra la sección de alertas activas o advertencias
 * en la parte superior del dashboard principal según el mockup.
 *
 * Características:
 * - Solo se muestra cuando hay alertas no leídas (activas)
 * - Cabecera roja ("Alertas activas") si hay críticas, o ámbar ("Advertencia") si solo hay advertencias
 * - Desplegable con LayoutAnimation y chips de resumen cuando se colapsa (como EstadoGeneralCard.jsx)
 * - Las alertas críticas NO se pueden descartar (HU-37)
 * - Las alertas no críticas SÍ se pueden descartar
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

  const headerConfig =
    maxKey === 'danger'
      ? {
          bg: colors.critical,
          textColor: '#FFFFFF',
          borderColor: colors.critical,
          title: 'Alertas activas',
          icon: '⚠️',
        }
      : maxKey === 'warning'
        ? {
            bg: '#FFF4E0',
            textColor: colors.warningStrong,
            borderColor: '#FDE68A',
            title: 'Advertencia',
            icon: '⚠️',
          }
        : {
            bg: colors.backgroundLight,
            textColor: colors.textPrimary,
            borderColor: colors.border,
            title: 'Alertas activas',
            icon: '🔔',
          };

  const countLabel =
    activeAlerts.length === 1 ? '1 alerta' : `${activeAlerts.length} alertas`;

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.card, {borderColor: headerConfig.borderColor}]}>
        {/* Cabecera coloreada tipo mockup */}
        <TouchableOpacity
          style={[styles.cardHeader, {backgroundColor: headerConfig.bg}]}
          onPress={toggleExpanded}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{expanded}}
          accessibilityLabel={`${headerConfig.title}: ${countLabel}`}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerIcon}>{headerConfig.icon}</Text>
            <Text style={[styles.headerTitle, {color: headerConfig.textColor}]}>
              {headerConfig.title}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerRight}
            onPress={onSeeAll ?? toggleExpanded}
            activeOpacity={0.7}>
            <Text style={[styles.countText, {color: headerConfig.textColor}]}>
              {countLabel}
            </Text>
            <Text style={[styles.headerChevron, {color: headerConfig.textColor}]}>
              {expanded ? '›' : '⌄'}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Resumen en chips si el usuario colapsa la tarjeta (estilo EstadoGeneralCard.jsx) */}
        {!expanded && (
          <View style={styles.chipsRow}>
            {activeAlerts.map(alert => {
              const colorKey = severityToColorKey(alert.severidad);
              const sev = SEVERITY_COLORS[colorKey];
              const val = getAlertValue(alert);
              return (
                <TouchableOpacity
                  key={alert.id}
                  style={[styles.chip, {backgroundColor: sev.bg}]}
                  onPress={() => onAlertPress?.(alert)}
                  disabled={!onAlertPress}>
                  <Text style={styles.chipIcon}>{alertIcon(alert.tipo)}</Text>
                  <Text style={[styles.chipValue, {color: sev.text}]}>
                    {val !== '' ? val : cleanAlertTitle(alert.titulo)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Lista desplegada con el detalle de cada alerta */}
        {expanded && (
          <View style={styles.rowsContainer}>
            {activeAlerts.map((alert, idx) => {
              const colorKey = severityToColorKey(alert.severidad);
              const sev = SEVERITY_COLORS[colorKey];
              const isCritical = alert.severidad === 'critica';
              const clockTime =
                formatAlertClockTime(alert.created_at) ||
                formatAlertTime(alert.created_at);
              const umbralOnly = getUmbralOnlyLabel(alert);
              const valorDestacado = getAlertValue(alert);
              const detailParts = [umbralOnly, clockTime].filter(Boolean);
              const detailLine =
                detailParts.length > 0
                  ? detailParts.join(' · ')
                  : valorDestacado === '' && alert.mensaje
                    ? `${alert.mensaje}${clockTime ? ` · ${clockTime}` : ''}`
                    : clockTime;

              return (
                <View
                  key={alert.id}
                  style={[
                    styles.row,
                    idx === activeAlerts.length - 1 && styles.rowLast,
                  ]}>
                  <TouchableOpacity
                    style={styles.rowContent}
                    onPress={() => onAlertPress?.(alert)}
                    disabled={!onAlertPress}
                    accessibilityRole="button"
                    accessibilityLabel={`${cleanAlertTitle(alert.titulo)}${
                      valorDestacado ? `, ${valorDestacado}` : ''
                    }`}>
                    <View
                      style={[
                        styles.alertIconCircle,
                        {backgroundColor: sev.bg},
                      ]}>
                      {alert.tipo === 'hipoxia' ? (
                        <View
                          style={[
                            styles.o2Badge,
                            {backgroundColor: sev.dot},
                          ]}>
                          <Text style={styles.o2BadgeText}>O₂</Text>
                        </View>
                      ) : (
                        <Text style={styles.alertEmoji}>
                          {alertIcon(alert.tipo)}
                        </Text>
                      )}
                    </View>

                    <View style={styles.alertBody}>
                      <Text style={styles.alertTitle} numberOfLines={2}>
                        {cleanAlertTitle(alert.titulo)}
                      </Text>

                      {valorDestacado !== '' ? (
                        <Text style={[styles.alertValue, {color: sev.text}]}>
                          {valorDestacado}
                        </Text>
                      ) : alert.mensaje ? (
                        <Text
                          style={[styles.alertValueSmall, {color: sev.text}]}
                          numberOfLines={1}>
                          {alert.mensaje}
                        </Text>
                      ) : null}

                      {detailLine ? (
                        <Text style={styles.alertUmbral} numberOfLines={1}>
                          {detailLine}
                        </Text>
                      ) : null}
                    </View>

                    <Text style={styles.rowChevron}>›</Text>
                  </TouchableOpacity>

                  {/* Descarte solo para alertas no críticas (HU-37) */}
                  {!isCritical && onDismiss && (
                    <TouchableOpacity
                      style={styles.dismissButton}
                      onPress={() => onDismiss(alert.id)}
                      accessibilityLabel="Descartar alerta">
                      <Text style={styles.dismissButtonText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.cardMarginBottom,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.cardBorderRadius,
    borderWidth: 1.5,
    overflow: 'hidden',
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 15,
  },
  headerTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countText: {
    fontSize: fontSize.caption,
    fontWeight: '600',
  },
  headerChevron: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  chipValue: {
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  rowsContainer: {
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertEmoji: {
    fontSize: 18,
  },
  o2Badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  o2BadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  alertBody: {
    flex: 1,
    paddingRight: 8,
  },
  alertTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  alertValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  alertValueSmall: {
    fontSize: fontSize.body,
    fontWeight: '700',
    marginTop: 2,
  },
  alertUmbral: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rowChevron: {
    fontSize: 22,
    color: colors.textSecondary,
    paddingHorizontal: 4,
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  dismissButtonText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});

export default ActiveAlertsBanner;

