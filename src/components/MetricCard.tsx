import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, fontSize, spacing} from '../theme';

interface MetricCardProps {
  label: string;
  value: string;
}

/**
 * Card that displays a single health metric (label + value).
 * Replica el diseño de metricCard() en la app nativa.
 */
export const MetricCard: React.FC<MetricCardProps> = ({label, value}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: spacing.cardPadding,
    marginBottom: spacing.cardMarginBottom,
    borderRadius: 12,
    // Sombra para replicar dialog_holo_light_frame
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  label: {
    fontSize: fontSize.metricLabel,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: fontSize.metricValue,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
});
