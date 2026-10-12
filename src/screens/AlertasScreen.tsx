import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Card from '../components/Card';
import {colors, spacing, fontSize} from '../theme';
import {severityToColorKey, severityLabel, alertIcon, formatAlertTime, SEVERITY_COLORS, cleanAlertTitle} from '../utils/alertas';
import {useHealth} from '../context/HealthProvider';
import type {Alerta} from '../services/supabase/models';

type TabId = 'todas' | 'no-leidas' | 'leidas';

const TABS: {id: TabId; label: string}[] = [
  {id: 'todas', label: 'Todas'},
  {id: 'no-leidas', label: 'No leídas'},
  {id: 'leidas', label: 'Leídas'},
];

/**
 * Check if an alert has been read (leida_en IS NOT NULL).
 */
function isAlertRead(alert: Alerta): boolean {
  return alert.leida_en !== null;
}

/**
 * Build a description line for the alert using titulo + mensaje + datos (CA-03).
 */
function alertDescription(alert: Alerta): string {
  const parts: string[] = [];

  // Use the alert's titulo and mensaje
  if (alert.mensaje) {
    parts.push(alert.mensaje);
  }

  // Add escalation info from datos jsonb
  if (alert.datos && typeof alert.datos === 'object') {
    const datos = alert.datos as Record<string, unknown>;
    if (datos.escalada === true) {
      parts.push('Escalada al responsable de guardia');
    }
  }

  return parts.join(' · ');
}

/**
 * Mapeo tipo de alerta → params de DetalleSigno (replicado de InicioScreen,
 * ya que `destinoPorTipoAlerta` NO está exportado en
 * `../context/NotificationsProvider` — es una función local privada allí).
 * Mismos valores que usa InicioScreen para hipoxia/hipertension/hipotension/
 * taquicardia/bradicardia.
 */
function destinoPorTipoAlerta(alertType: Alerta['tipo']): {
  tipoSigno: string;
  label: string;
  unit: string;
  icon: string;
} {
  switch (alertType) {
    case 'hipoxia':
      return {tipoSigno: 'saturacion_oxigeno', label: 'Saturación de oxígeno', unit: '%', icon: '🩸'};
    case 'hipertension':
    case 'hipotension':
      return {tipoSigno: 'presion_sistolica', label: 'Presión arterial', unit: 'mmHg', icon: '❤️'};
    case 'taquicardia':
    case 'bradicardia':
    default:
      return {tipoSigno: 'frecuencia_cardiaca', label: 'Frecuencia cardíaca', unit: 'lpm', icon: '💓'};
  }
}

const AlertasScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('todas');
  const [refreshing, setRefreshing] = useState(false);
  const {activeAlerts, refreshAlerts, confirmAlert} = useHealth();
  const navigation = useNavigation<any>();

  useEffect(() => {
    refreshAlerts();
  }, [refreshAlerts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAlerts();
    setRefreshing(false);
  }, [refreshAlerts]);

  const unreadCount = activeAlerts.filter(a => a.leida_en === null).length;
  const filtered = activeAlerts.filter(a => {
    const read = isAlertRead(a);
    if (activeTab === 'no-leidas') return !read;
    if (activeTab === 'leidas') return read;
    return true;
  });

  return (
    <View style={styles.screen}>
      {/* Header */}
      <Text style={styles.title}>Alertas</Text>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map(tab => {
          const label = tab.id === 'no-leidas' ? `No leídas (${unreadCount})` : tab.label;
          return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
          );
        })}
      </View>

      {/* Lista */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }>
        {filtered.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'todas'
                ? 'No hay alertas activas'
                : activeTab === 'no-leidas'
                ? 'No hay alertas sin leer'
                : 'No hay alertas leídas'}
            </Text>
          </View>
        )}

        {filtered.map(alert => {
          const colorKey = severityToColorKey(alert.severidad);
          const sev = SEVERITY_COLORS[colorKey];
          const read = isAlertRead(alert);

          return (
            <Card key={alert.id} style={styles.alertCard as any}>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('DetalleSigno', {
                    ...destinoPorTipoAlerta(alert.tipo),
                    alertId: alert.id,
                    alertType: alert.tipo,
                    severity: alert.severidad,
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`Ver gráficos de ${cleanAlertTitle(alert.titulo)}`}
                activeOpacity={0.7}>
              <View style={[styles.alertRow, {borderLeftColor: sev.dot, borderLeftWidth: 3, paddingLeft: 12}]}>
                <View style={[styles.alertIcon, {backgroundColor: sev.bg}]}>
                  <Text style={styles.alertEmoji}>{alertIcon(alert.tipo)}</Text>
                </View>
                <View style={styles.alertBody}>
                  <Text style={styles.alertTitle}>{cleanAlertTitle(alert.titulo)}</Text>
                  <Text style={styles.alertTime}>{formatAlertTime(alert.created_at)}</Text>
                  <Text style={styles.alertDesc}>{alertDescription(alert)}</Text>
                  {alert.datos && typeof alert.datos === 'object' && (alert.datos as Record<string, unknown>).escalada === true && (
                    <Text style={styles.escalatedBadge}>⬆ Escalada</Text>
                  )}
                  {severityLabel(alert.severidad) && (
                    <Text style={[styles.severityBadgeText, {color: sev.text}]}>
                      {severityLabel(alert.severidad)}
                    </Text>
                  )}
                </View>
                {!read && <View style={[styles.unreadDot, {backgroundColor: sev.dot}]} />}
              </View>
              </TouchableOpacity>
              {!read && (
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => confirmAlert(alert.id)}>
                  <Text style={styles.confirmButtonText}>Marcar como leída</Text>
                </TouchableOpacity>
              )}
            </Card>
          );
        })}

        <View style={{height: 24}} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.screenPaddingTop,
    paddingBottom: 16,
  },

  // ── Tabs ──
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPaddingHorizontal,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  // ── Lista ──
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
  },
  alertCard: {
    padding: 16,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertEmoji: {
    fontSize: 18,
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
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  escalatedBadge: {
    fontSize: fontSize.caption,
    color: colors.danger,
    fontWeight: '600',
    marginTop: 4,
  },
  severityBadgeText: {
    fontSize: fontSize.badge,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },

  // ── Confirm button ──
  confirmButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmButtonText: {
    fontSize: fontSize.caption,
    color: colors.primary,
    fontWeight: '600',
  },

  // ── Empty state ──
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 48,
  },
  emptyText: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
  },
});

export default AlertasScreen;
