import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, fontSize, spacing} from '../theme';

/**
 * Historial — placeholder con diseño VITO.
 * La funcionalidad real se implementa en HU-32 (Sprint 8).
 */
const HistorialScreen: React.FC = () => {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Historial</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Próximamente</Text>
        <Text style={styles.cardText}>
          Aquí podrás ver el historial detallado de tus signos vitales con
          gráficos por día, semana, mes y año.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.screenPaddingTop,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.cardBorderRadius,
    padding: spacing.cardPadding,
  },
  cardTitle: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  cardText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

export default HistorialScreen;
