import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import {colors, fontSize, spacing} from '../theme';

/** Default daily step goal. */
export const DEFAULT_STEP_GOAL = 10000;

interface ActivityProgressCardProps {
  steps: number;
  goal?: number;
  lastSyncDate?: Date | null;
}

/**
 * CA-03: Indicador de actividad física como círculo de progreso
 * con porcentaje del objetivo diario cumplido.
 *
 * Muestra un anillo SVG con el porcentaje de pasos alcanzados
 * respecto al objetivo diario.
 */
export const ActivityProgressCard: React.FC<ActivityProgressCardProps> = ({
  steps,
  goal = DEFAULT_STEP_GOAL,
  lastSyncDate,
}) => {
  const percent = Math.min(Math.round((steps / goal) * 100), 100);
  const radius = 42;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const progressColor = percent >= 100
    ? colors.success
    : percent >= 50
      ? colors.primary
      : colors.warning;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {/* Círculo de progreso SVG */}
        <View style={styles.circleContainer}>
          <Svg width={100} height={100} viewBox="0 0 100 100">
            {/* Background circle */}
            <Circle
              cx="50"
              cy="50"
              r={radius}
              stroke={colors.border || '#E5E7EB'}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress arc */}
            <Circle
              cx="50"
              cy="50"
              r={radius}
              stroke={progressColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 50 50)"
            />
          </Svg>
          {/* Center text */}
          <View style={styles.circleCenter}>
            <Text style={styles.percentText}>{percent}%</Text>
          </View>
        </View>

        {/* Info text */}
        <View style={styles.info}>
          <Text style={styles.title}>Actividad física</Text>
          <Text style={styles.stepsValue}>
            {steps.toLocaleString('es-ES')} pasos
          </Text>
          <Text style={styles.goalText}>
            Objetivo: {goal.toLocaleString('es-ES')}
          </Text>
          {lastSyncDate && (
            <Text style={styles.lastSync}>
              Último registro: {lastSyncDate.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.cardBorderRadius,
    padding: 16,
    marginBottom: spacing.gridGap,
    ...({elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.1, shadowRadius: 4} as any),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  info: {
    marginLeft: 16,
    flex: 1,
  },
  title: {
    fontSize: fontSize.metricLabel,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  stepsValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  goalText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  lastSync: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
  },
});
