import React from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
import {colors, spacing, fontSize} from '../theme';
import {type AppIconName} from './AppIcon';
import SignoIcon from './SignoIcon';
import FlechaIcon from './FlechaIcon';

interface VitalSignCardProps {
  label: string;
  value: string;
  unit?: string;
  icon: string;        // emoji placeholder (fallback)
  iconName?: AppIconName; // icono PNG (reemplaza al emoji)
  iconSize?: number;   // tamaño del icono PNG (default: 36)
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
  // Se conserva por compatibilidad con llamadores (prop declarada pero sin uso visual).
  iconBgColor: _iconBgColor,
  trend,
  noDataMessage,
  onPress,
}) => {
  const trendColor = trend === 'up' ? colors.success : trend === 'down' ? colors.danger : colors.textSecondary;
  const hasNoData = value === '--' && noDataMessage;

  const content = (
    <>
      {/* Fila superior: icono + título + flecha de tendencia a la derecha */}
      <View style={styles.topRow}>
        <View style={styles.titleGroup}>
          <SignoIcon name={iconName} emoji={icon} style={styles.icon} />
          <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">{label}</Text>
        </View>
        {trend && (
          <FlechaIcon
            direction={trend === 'up' ? 'up' : trend === 'down' ? 'down' : 'right'}
            size={14}
            color={trendColor}
            style={{opacity: 0.65, marginRight: -4}}
          />
        )}
      </View>

      {/* Valor + unidad en la misma línea: nunca número pelado (distancia 35 sin km) */}
      {hasNoData ? (
        <Text style={styles.noData}>{noDataMessage}</Text>
      ) : (
        <View style={styles.valueRow}>
          <Text style={styles.value}>{value}</Text>
          {unit ? <Text style={styles.valueUnit}> {unit}</Text> : null}
        </View>
      )}
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
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 30,
  },
  titleGroup: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 36,
  },
  valueUnit: {
    fontSize: fontSize.caption,
    fontWeight: '400',
    color: colors.textSecondary,
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
