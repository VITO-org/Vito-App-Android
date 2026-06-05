import React, {useState} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity} from 'react-native';
import Card from '../components/Card';
import {colors, spacing, fontSize} from '../theme';

type TabId = 'todas' | 'no-leidas' | 'resueltas';

interface Alerta {
  id: string;
  icon: string;
  title: string;
  time: string;
  description: string;
  severity: 'danger' | 'warning' | 'success';
  read: boolean;
}

const MOCK_ALERTAS: Alerta[] = [
  {
    id: '1',
    icon: '❤️',
    title: 'Frecuencia cardíaca alta',
    time: 'Hoy 09:41',
    description: 'Tu frecuencia cardíaca superó el límite establecido.',
    severity: 'danger',
    read: false,
  },
  {
    id: '2',
    icon: '💊',
    title: 'Medicación omitida',
    time: 'Ayer 21:00',
    description: 'Recordá tomar tu medicación para la presión arterial.',
    severity: 'warning',
    read: false,
  },
  {
    id: '3',
    icon: '📍',
    title: 'Zona segura',
    time: 'Ayer 18:30',
    description: 'Juan salió de la zona segura.',
    severity: 'success',
    read: true,
  },
];

const TABS: {id: TabId; label: string}[] = [
  {id: 'todas', label: 'Todas'},
  {id: 'no-leidas', label: 'No leídas'},
  {id: 'resueltas', label: 'Resueltas'},
];

const SEVERITY_COLORS: Record<Alerta['severity'], {bg: string; dot: string}> = {
  danger: {bg: colors.dangerLight, dot: colors.danger},
  warning: {bg: colors.warningLight, dot: colors.warning},
  success: {bg: colors.successLight, dot: colors.success},
};

const AlertasScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('todas');

  const filtered = MOCK_ALERTAS.filter(a => {
    if (activeTab === 'no-leidas') return !a.read;
    if (activeTab === 'resueltas') return a.read;
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
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {filtered.map(alerta => {
          const sev = SEVERITY_COLORS[alerta.severity];
          return (
            <Card key={alerta.id} style={[styles.alertCard, {borderLeftColor: sev.dot, borderLeftWidth: 3}]}>
              <View style={styles.alertRow}>
                <View style={styles.alertIcon}>
                  <Text style={styles.alertEmoji}>{alerta.icon}</Text>
                </View>
                <View style={styles.alertBody}>
                  <Text style={styles.alertTitle}>{alerta.title}</Text>
                  <Text style={styles.alertTime}>{alerta.time}</Text>
                  <Text style={styles.alertDesc}>{alerta.description}</Text>
                </View>
                {!alerta.read && <View style={[styles.unreadDot, {backgroundColor: sev.dot}]} />}
              </View>
            </Card>
          );
        })}

        {/* Botón inferior */}
        <TouchableOpacity style={styles.historyButton}>
          <Text style={styles.historyText}>Ver historial completo</Text>
        </TouchableOpacity>

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
    backgroundColor: colors.background,
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
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },

  // ── Botón ──
  historyButton: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  historyText: {
    fontSize: fontSize.body,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default AlertasScreen;
