import React, {useEffect, useCallback, useState} from 'react';
import {View, Text, FlatList, StyleSheet, TouchableOpacity, Dimensions} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useHealth} from '../context/HealthProvider';
import {useSupabase} from '../context/SupabaseProvider';
import Card from '../components/Card';
import VitalSignCard from '../components/VitalSignCard';
import PrimaryButton from '../components/PrimaryButton';
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
 * Muestra datos reales de Health Connect cuando están disponibles,
 * con fallback a datos mock cuando no.
 */
const InicioScreen: React.FC = () => {
  const {
    summary,
    loading,
    error,
    errorSeverity,
    hcStatus,
    permissionsGranted,
    lastSync,
    requestPermissionsAndLoad,
    refreshData,
  } = useHealth();
  const {session, profile} = useSupabase();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } finally {
      setRefreshing(false);
    }
  }, [refreshData]);

  const userName = profile?.nombre
    ? profile.nombre
    : session?.user?.email?.split('@')[0] ?? 'Usuario';

  // Gestión automática de Health Connect:
  // - Si HC disponible y sin permisos → solicitar permisos + cargar datos
  // - Si HC disponible y permisos concedidos pero sin datos → cargar datos
  useEffect(() => {
    if (hcStatus === 'available' && !loading && !error) {
      if (!permissionsGranted) {
        requestPermissionsAndLoad();
      } else if (!summary) {
        refreshData();
      }
    }
  }, [hcStatus, permissionsGranted, loading, error, summary, requestPermissionsAndLoad, refreshData]);

  // Construir vitals desde datos reales o mock
  const vitals: {
    id: TipoSignoVital;
    label: string;
    value: string;
    unit?: string;
    icon: string;
    iconBgColor: string;
    trend?: 'up' | 'down' | 'stable';
  }[] = [];

  if (summary) {
    // Frecuencia cardíaca
    if (summary.averageBpm != null) {
      vitals.push({
        id: 'frecuencia_cardiaca',
        label: 'Frecuencia cardíaca',
        value: String(Math.round(summary.averageBpm)),
        unit: 'lpm',
        icon: '❤️',
        iconBgColor: colors.heartRed,
        trend: summary.averageBpm > 100 ? 'up' : summary.averageBpm < 60 ? 'down' : 'stable',
      });
    }
    // Presión arterial (siempre visible, con --/-- cuando no hay datos)
    vitals.push({
      id: 'presion_sistolica',
      label: 'Presión arterial',
      value: (summary.bloodPressureSystolic != null && summary.bloodPressureDiastolic != null)
        ? `${Math.round(summary.bloodPressureSystolic)}/${Math.round(summary.bloodPressureDiastolic)}`
        : '--/--',
      unit: 'mmHg',
      icon: '🫀',
      iconBgColor: colors.danger,
      trend: summary.bloodPressureSystolic != null && summary.bloodPressureSystolic > 130 ? 'up' : 'stable',
    });
    // Oxigenación
    if (summary.spo2Percent != null) {
      vitals.push({
        id: 'saturacion_oxigeno',
        label: 'Oxigenación',
        value: String(Math.round(summary.spo2Percent)),
        unit: '%',
        icon: '💧',
        iconBgColor: colors.oxygenBlue,
        trend: summary.spo2Percent >= 95 ? 'stable' : 'down',
      });
    }
    // Temperatura
    if (summary.bodyTemperatureCelsius != null) {
      vitals.push({
        id: 'temperatura',
        label: 'Temperatura',
        value: summary.bodyTemperatureCelsius.toFixed(1),
        unit: '°C',
        icon: '🌡️',
        iconBgColor: colors.tempRed,
        trend: summary.bodyTemperatureCelsius > 37.5 ? 'up' : summary.bodyTemperatureCelsius < 36.0 ? 'down' : 'stable',
      });
    }
  }

  // Fallback a datos mock si no hay datos reales
  if (vitals.length === 0) {
    vitals.push(
      {id: 'frecuencia_cardiaca', label: 'Frecuencia cardíaca', value: '--', unit: 'lpm', icon: '❤️', iconBgColor: colors.heartRed, trend: 'stable'},
      {id: 'presion_sistolica', label: 'Presión arterial', value: '--/--', unit: 'mmHg', icon: '🫀', iconBgColor: colors.danger, trend: 'stable'},
      {id: 'saturacion_oxigeno', label: 'Oxigenación', value: '--', unit: '%', icon: '💧', iconBgColor: colors.oxygenBlue, trend: 'stable'},
      {id: 'temperatura', label: 'Temperatura', value: '--', unit: '°C', icon: '🌡️', iconBgColor: colors.tempRed, trend: 'stable'},
    );
  }

  return (
    <FlatList
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshing={refreshing}
      onRefresh={onRefresh}
      data={[{}]}
      keyExtractor={() => 'content'}
      renderItem={() => (
      <>
      {/* ── Header: saludo + notificaciones ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <VITOMascot size={40} showAntenna={false} />
          <View style={styles.headerText}>
            <Text style={styles.greeting}>¡Hola, {userName}!</Text>
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

      {/* ── Estado Health Connect ── */}
      {hcStatus === 'unavailable' && (
        <Card style={styles.warningCard}>
          <Text style={styles.warningTitle}>Health Connect no disponible</Text>
          <Text style={styles.warningText}>
            Instalá Google Health Connect desde Play Store para ver tus datos reales.
          </Text>
        </Card>
      )}

      {hcStatus === 'update_required' && (
        <Card style={styles.warningCard}>
          <Text style={styles.warningTitle}>Health Connect desactualizado</Text>
          <Text style={styles.warningText}>
            Actualizá Health Connect desde Play Store.
          </Text>
        </Card>
      )}

      {error && (
        <Card style={[styles.warningCard, errorSeverity === 'error' && styles.errorCard]}>
          <Text style={styles.warningTitle}>
            {errorSeverity === 'error' ? 'Error' : 'Aviso'}
          </Text>
          <Text style={styles.warningText}>{error}</Text>
          {hcStatus === 'available' && !loading && (
            <PrimaryButton
              variant="secondary"
              title="Conceder permisos"
              onPress={requestPermissionsAndLoad}
              style={{marginTop: 8}}
            />
          )}
        </Card>
      )}

      {/* ── Signos Vitales ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Signos vitales</Text>
        <View style={styles.sectionActions}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={refreshData}
            disabled={loading}>
            <Text style={[styles.refreshIcon, loading && styles.refreshIconLoading]}>
              ↻
            </Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.seeAll}>Ver todos</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.vitalsGrid}>
        {vitals.map((v, i) => (
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
          <Text style={styles.hcTitle}>Health Connect — Resumen del día</Text>
          <Text style={styles.hcText}>
            👣 Pasos: {(summary.steps ?? 0).toLocaleString('es-ES')}
          </Text>
          <Text style={styles.hcText}>
            🔥 Calorías: {(summary.caloriesKcal ?? 0).toFixed(0)} kcal
          </Text>
          <Text style={styles.hcText}>
            📏 Distancia: {(summary.distanceMeters ?? 0).toFixed(0)} m
          </Text>
          {summary.sleepMinutes > 0 && (
            <Text style={styles.hcText}>
              😴 Sueño: {summary.sleepMinutes} min
            </Text>
          )}
          {summary.exerciseSessions > 0 && (
            <Text style={styles.hcText}>
              🏃 Ejercicios: {summary.exerciseSessions} sesiones
            </Text>
          )}
        </Card>
      )}

      {loading && (
        <Card>
          <Text style={styles.hcText}>Cargando datos de Health Connect...</Text>
        </Card>
      )}

      {!permissionsGranted && hcStatus === 'available' && !loading && !error && (
        <Card>
          <Text style={styles.hcText}>Conectá con Health Connect para ver tus datos reales.</Text>
          <PrimaryButton
            title="Conectar Health Connect"
            onPress={requestPermissionsAndLoad}
            style={{marginTop: 8}}
          />
        </Card>
      )}

      {/* ── Última Actividad ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Última actividad</Text>
      </View>

      {(() => {
        if (!lastSync) {
          return (
            <Card>
              <View style={styles.activityRow}>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>Sin actividad registrada</Text>
                  <Text style={styles.activityTime}>
                    {loading
                      ? 'Cargando datos...'
                      : 'Conectá Health Connect para ver tu actividad'}
                  </Text>
                </View>
              </View>
            </Card>
          );
        }

        const items: {title: string; detail: string}[] = [
          {
            title: 'Sincronización Health Connect',
            detail: lastSync.toLocaleDateString('es-ES', {
              weekday: 'long',
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
        ];

        if (summary) {
          if (summary.steps > 0) {
            items.push({
              title: '👣 Pasos registrados',
              detail: `${summary.steps.toLocaleString('es-ES')} pasos`,
            });
          }
          if (summary.caloriesKcal > 0) {
            items.push({
              title: '🔥 Calorías quemadas',
              detail: `${summary.caloriesKcal.toFixed(0)} kcal`,
            });
          }
          if (summary.distanceMeters > 0) {
            items.push({
              title: '📏 Distancia recorrida',
              detail: `${(summary.distanceMeters / 1000).toFixed(2)} km`,
            });
          }
          if (summary.sleepMinutes > 0) {
            items.push({
              title: '😴 Sueño registrado',
              detail: `${Math.floor(summary.sleepMinutes / 60)}h ${summary.sleepMinutes % 60}m`,
            });
          }
          if (summary.averageBpm != null) {
            items.push({
              title: '❤️ Frecuencia cardíaca',
              detail: `${Math.round(summary.averageBpm)} lpm promedio`,
            });
          }
        }

        return (
          <Card>
            {items.map((item, i) => (
              <View
                key={i}
                style={[styles.activityRow, i === items.length - 1 && styles.activityRowLast]}>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>{item.title}</Text>
                  <Text style={styles.activityTime}>{item.detail}</Text>
                </View>
                {i === 0 && (
                  <View style={styles.activityCheck}>
                    <Text style={styles.checkIcon}>✓</Text>
                  </View>
                )}
              </View>
            ))}
          </Card>
        );
      })()}

      <View style={{height: 24}} />
      </>
    )}
  />
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
    paddingBottom: 100,
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
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  refreshIcon: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: '700',
  },
  refreshIconLoading: {
    opacity: 0.5,
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

  // ── Warning / Error ──
  warningCard: {
    backgroundColor: colors.warningLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  errorCard: {
    backgroundColor: colors.dangerLight,
    borderLeftColor: colors.danger,
  },
  warningTitle: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  warningText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
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
    marginVertical: 1,
  },

  // ── Última Actividad ──
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  activityRowLast: {
    borderBottomWidth: 0,
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
