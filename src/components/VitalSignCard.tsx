import React from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
import {colors, spacing, fontSize, shadows} from '../theme';
import AppIcon, {type AppIconName} from './AppIcon';
import FlechaIcon from './FlechaIcon';

interface VitalSignCardProps {
  label: string;
  value: string;
  unit?: string;
  icon: string;        // emoji placeholder (fallback)
  iconName?: AppIconName; // icono PNG (reemplaza al emoji)
  iconSize?: number;   // tamaño del icono PNG (default: 24)
  iconBgColor: string; // color de fondo del icono
  trend?: 'up' | 'down' | 'stable';
  /** CA-05: Mensaje alternativo cuando no hay datos (ej: "Sin datos recientes"). */
  noDataMessage?: string;
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
  iconName,
  iconSize = 24,
  iconBgColor,
  trend,
  noDataMessage,
  onPress,
}) => {
  const trendColor = trend === 'up' ? colors.success : trend === 'down' ? colors.danger : colors.textSecondary;
  const hasNoData = value === '--' && noDataMessage;

  const content = (
    <>
      {/* Fila superior: icono + flecha de tendencia */}
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, {backgroundColor: iconBgColor + '20'}]}>
          {iconName ? (
            <AppIcon name={iconName} size={iconSize} />
          ) : (
            <Text style={[styles.icon, {color: iconBgColor}]}>{icon}</Text>
          )}
        </View>
        {trend && (
          <FlechaIcon
            direction={trend === 'up' ? 'up' : trend === 'down' ? 'down' : 'right'}
            size={14}
            color={trendColor}
            style={{opacity: 0.65}}
          />
        )}
      </View>

      {/* Valor */}
      {hasNoData ? (
        <Text style={styles.noData}>{noDataMessage}</Text>
      ) : (
        <>
          <Text style={styles.value}>{value}</Text>
          {unit && <Text style={styles.unit}>{unit}</Text>}
        </>
      )}

      {/* Label */}
      <Text style={styles.label}>{label}</Text>
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
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
  label: {
    fontSize: fontSize.metricLabel,
    color: colors.textSecondary,
    marginTop: 6,
  },
  noData: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});

export default VitalSignCard;
