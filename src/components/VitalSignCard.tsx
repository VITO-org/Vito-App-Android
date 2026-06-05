import React from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
import {colors, spacing, fontSize, shadows} from '../theme';

interface VitalSignCardProps {
  label: string;
  value: string;
  unit?: string;
  icon: string;        // emoji placeholder
  iconBgColor: string; // color de fondo del icono
  trend?: 'up' | 'down' | 'stable';
  onPress?: () => void;
}

/**
 * Tarjeta de signo vital — usada en el grid del dashboard.
 * Muestra ícono, valor grande y etiqueta, con indicador de tendencia.
 */
const VitalSignCard: React.FC<VitalSignCardProps> = ({
  label,
  value,
  unit,
  icon,
  iconBgColor,
  trend,
  onPress,
}) => {
  const trendColor = trend === 'up' ? colors.success : trend === 'down' ? colors.danger : colors.textSecondary;

  const content = (
    <>
      {/* Icono */}
      <View style={[styles.iconContainer, {backgroundColor: iconBgColor + '20'}]}>
        <Text style={[styles.icon, {color: iconBgColor}]}>{icon}</Text>
      </View>

      {/* Valor */}
      <Text style={styles.value}>{value}</Text>
      {unit && <Text style={styles.unit}>{unit}</Text>}

      {/* Label + tendencia */}
      <View style={styles.bottomRow}>
        <Text style={styles.label}>{label}</Text>
        {trend && (
          <Text style={[styles.trend, {color: trendColor}]}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </Text>
        )}
      </View>
    </>
  );

  if (onPress) {
    return <Pressable onPress={onPress} style={styles.card}>{content}</Pressable>;
  }
  return <View style={styles.card}>{content}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.cardBorderRadius,
    padding: 16,
    width: '48%',
    marginBottom: spacing.gridGap,
    ...shadows.card,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 20,
  },
  value: {
    fontSize: fontSize.metricValue,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 36,
  },
  unit: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  label: {
    fontSize: fontSize.metricLabel,
    color: colors.textSecondary,
    flex: 1,
  },
  trend: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default VitalSignCard;
