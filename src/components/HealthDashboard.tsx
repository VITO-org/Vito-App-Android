import React from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import {useHealth} from '../context/HealthProvider';
import {MetricCard} from './MetricCard';
import {StatusBanner} from './StatusBanner';
import {PermissionButton} from './PermissionButton';
import {colors, fontSize, spacing} from '../theme';
import {openHealthConnectStore} from '../services/VitoHealthNative';

/**
 * Formats sleep minutes into "Xh Ym" format.
 */
function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Main dashboard screen showing all health metrics.
 */
export const HealthDashboard: React.FC = () => {
  const {
    summary,
    hcStatus,
    loading,
    error,
    errorSeverity,
    permissionsGranted,
    requestPermissionsAndLoad,
    refreshData,
  } = useHealth();

  // Derive status message
  const getStatusMessage = (): {
    text: string;
    isError?: boolean;
    isWarning?: boolean;
  } => {
    if (error) {
      return {
        text: error,
        isError: errorSeverity === 'error',
        isWarning: errorSeverity === 'warning',
      };
    }
    if (!hcStatus) {
      return {text: 'Verificando Health Connect...'};
    }
    switch (hcStatus) {
      case 'unavailable':
        return {text: 'Health Connect no compatible o no instalado.', isError: true};
      case 'update_required':
        return {text: 'Health Connect requiere actualización.', isWarning: true};
      case 'available':
        if (permissionsGranted && summary) {
          return {text: 'Datos actualizados correctamente.'};
        }
        return {text: 'Health Connect listo. Presiona "Conectar" para autorizar.'};
      default:
        return {text: ''};
    }
  };

  const status = getStatusMessage();
  const needsPermission = hcStatus === 'available' && !permissionsGranted;
  const isUnavailable = hcStatus === 'unavailable';
  const needsUpdate = hcStatus === 'update_required';

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}>
      <Text style={styles.title}>Vito Health</Text>

      <StatusBanner
        status={status.text}
        isError={status.isError}
        isWarning={status.isWarning}
      />

      {needsPermission && (
        <PermissionButton
          title="Conectar Health Connect"
          onPress={requestPermissionsAndLoad}
          loading={loading}
        />
      )}

      {permissionsGranted && (
        <PermissionButton
          title="Actualizar ahora"
          onPress={refreshData}
          loading={loading}
        />
      )}

      {needsUpdate && (
        <PermissionButton
          title="Abrir Play Store"
          onPress={openHealthConnectStore}
        />
      )}

      {summary && (
        <View style={styles.metricsContainer}>
          <MetricCard
            label="Pasos hoy"
            value={summary.steps.toLocaleString('es-ES')}
          />
          <MetricCard
            label="Distancia"
            value={`${(summary.distanceMeters / 1000).toFixed(2)} km`}
          />
          <MetricCard
            label="Calorías activas/totales"
            value={`${summary.caloriesKcal.toFixed(0)} kcal`}
          />
          <MetricCard
            label="Sueño hoy"
            value={formatMinutes(summary.sleepMinutes)}
          />
          <MetricCard
            label="Pulso medio"
            value={
              summary.averageBpm !== null
                ? `${summary.averageBpm.toFixed(0)} bpm`
                : 'Sin datos'
            }
          />
          <MetricCard
            label="Ejercicios"
            value={summary.exerciseSessions.toString()}
          />
        </View>
      )}

      {!summary && !loading && !needsPermission && hcStatus === 'available' && (
        <Text style={styles.emptyText}>
          Presiona "Conectar Health Connect" para comenzar.
        </Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.screenPaddingTop,
    paddingBottom: spacing.screenPaddingBottom,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  metricsContainer: {
    marginTop: 30,
  },
  emptyText: {
    marginTop: 40,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 16,
  },
});
