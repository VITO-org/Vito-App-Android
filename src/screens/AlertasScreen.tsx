import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl} from 'react-native';
import Card from '../components/Card';
import {colors, spacing, fontSize} from '../theme';
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

const SEVERITY_COLORS: Record<'danger' | 'warning' | 'info', {bg: string; dot: string}> = {
  danger: {bg: colors.dangerLight, dot: colors.danger},
  warning: {bg: colors.warningLight, dot: colors.warning},
  info: {bg: colors.surface, dot: colors.textSecondary},
};

const AlertasScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('todas');
  const [refreshing, setRefreshing] = useState(false);
  const {activeAlerts, refreshAlerts, confirmAlert} = useHealth();

  useEffect(() => {
    refreshAlerts();
  }, [refreshAlerts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAlerts();
    setRefreshing(false);
  }, [refreshAlerts]);

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
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
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
              <View style={[styles.alertRow, {borderLeftColor: sev.dot, borderLeftWidth: 3, paddingLeft: 12}]}>
                <View style={[styles.alertIcon, {backgroundColor: sev.bg}]}>
                  <Text style={styles.alertEmoji}>{alertIcon(alert.tipo)}</Text>
                </View>
                <View style={styles.alertBody}>
                  <Text style={styles.alertTitle}>{alert.titulo}</Text>
                  <Text style={styles.alertTime}>{formatAlertTime(alert.created_at)}</Text>
                  <Text style={styles.alertDesc}>{alertDescription(alert)}</Text>
                  {alert.datos && typeof alert.datos === 'object' && (alert.datos as Record<string, unknown>).escalada === true && (
                    <Text style={styles.escalatedBadge}>⬆ Escalada</Text>
                  )}
                </View>
                {!read && <View style={[styles.unreadDot, {backgroundColor: sev.dot}]} />}
              </View>
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
