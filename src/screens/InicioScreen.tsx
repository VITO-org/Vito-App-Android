import React from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useHealth} from '../context/HealthProvider';
import Card from '../components/Card';
import VitalSignCard from '../components/VitalSignCard';
import VITOMascot from '../components/VITOMascot';
import {colors, spacing, fontSize} from '../theme';
import {TipoSignoVital} from '../data/mockReportes';

type RootStackParamList = {
  MainTabs: undefined;
  DetalleSigno: {
    tipoSigno: string;
    label: string;
    unit: string;
    icon: string;
  };
};

/**
 * Dashboard principal — pantalla de inicio de VITO.
 *
 * Diseño:
 * - Saludo superior + notificaciones
 * - Card "Estado general" con badge verde "Bien"
 * - Grid 2 columnas de signos vitales con íconos, valores y tendencias
 * - Última actividad (medicación)
 */
const InicioScreen: React.FC = () => {
  const {summary, loading} = useHealth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Mock: datos para el dashboard (reemplazar con datos reales cuando existan)
  const mockVitals: {
    id: TipoSignoVital;
    label: string;
    value: string;
    unit?: string;
    icon: string;
    iconBgColor: string;
    trend?: 'up' | 'down' | 'stable';
  }[] = [
    {id: 'frecuencia_cardiaca', label: 'Frecuencia cardíaca', value: '72', unit: 'lpm', icon: '❤️', iconBgColor: colors.heartRed, trend: 'up' as const},
    {id: 'presion_sistolica', label: 'Presión arterial', value: '120/80', unit: 'mmHg', icon: '🫀', iconBgColor: colors.danger, trend: 'stable' as const},
    {id: 'saturacion_oxigeno', label: 'Oxigenación', value: '98', unit: '%', icon: '💧', iconBgColor: colors.oxygenBlue, trend: 'up' as const},
    {id: 'temperatura', label: 'Temperatura', value: '36.6', unit: '°C', icon: '🌡️', iconBgColor: colors.tempRed, trend: 'down' as const},
  ];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* ── Header: saludo + notificaciones ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <VITOMascot size={40} showAntenna={false} />
          <View style={styles.headerText}>
            <Text style={styles.greeting}>¡Hola, Juan!</Text>
            <Text style={styles.subtitle}>Todo está bajo control</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notifButton}>
          <Text style={styles.notifIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* ── Card Estado General ── */}
      <Card>
        <View style={styles.statusRow}>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>Estado general</Text>
            <Text style={styles.statusText}>Tus signos vitales están estables</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Bien</Text>
          </View>
        </View>
      </Card>

      {/* ── Signos Vitales ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Signos vitales</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>Ver todos</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.vitalsGrid}>
        {mockVitals.map((v, i) => (
          <VitalSignCard
            key={i}
            {...v}
            onPress={() => navigation.navigate('DetalleSigno', {
              tipoSigno: v.id,
              label: v.label,
              unit: v.unit || '',
              icon: v.icon,
            })}
          />
        ))}
      </View>

      {/* ── Health Connect data ── */}
      {summary && (
        <Card style={styles.hcCard}>
          <Text style={styles.hcTitle}>Health Connect</Text>
          <Text style={styles.hcText}>
            Pasos: {(summary.steps ?? 0).toLocaleString('es-ES')} |{' '}
            Calorías: {(summary.caloriesKcal ?? 0).toFixed(0)} kcal
          </Text>
        </Card>
      )}

      {loading && (
        <Card>
          <Text style={styles.hcText}>Cargando datos de Health Connect...</Text>
        </Card>
      )}

      {/* ── Última Actividad ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Última actividad</Text>
      </View>

      <Card>
        <View style={styles.activityRow}>
          <View style={styles.activityInfo}>
            <Text style={styles.activityTitle}>Medicación registrada</Text>
            <Text style={styles.activityTime}>Hoy 08:30</Text>
          </View>
          <View style={styles.activityCheck}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
        </View>
      </Card>

      <View style={{height: 24}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.screenPaddingTop,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {},
  greeting: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.subtitle,
    color: colors.textSecondary,
    marginTop: 2,
  },
  notifButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifIcon: {
    fontSize: 20,
  },

  // ── Estado General ──
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
    marginRight: 12,
  },
  statusTitle: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statusText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  badge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: spacing.badgeBorderRadius,
  },
  badgeText: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.success,
  },

  // ── Signos Vitales ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  seeAll: {
    fontSize: fontSize.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  // ── Health Connect ──
  hcCard: {
    marginTop: 4,
  },
  hcTitle: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  hcText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },

  // ── Última Actividad ──
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityInfo: {},
  activityTitle: {
    fontSize: fontSize.body,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  activityTime: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activityCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '700',
  },
});

export default InicioScreen;
