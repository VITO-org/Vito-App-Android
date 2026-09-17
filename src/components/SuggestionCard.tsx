/**
 * HU-34 Fase A — Tarjeta de sugerencia de Vittito.
 * Patrón VitalSignCard: funcional + StyleSheet, reutiliza theme.
 */
import React from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
import {colors, spacing, fontSize, shadows} from '../theme';
import type {Suggestion} from '../services/suggestions/types';

interface Props {
  suggestion: Suggestion;
  seen: boolean;
  onPress: () => void;
}

function badgeStyle(prioridad: Suggestion['prioridad']) {
  if (prioridad === 'Alta') return {bg: colors.dangerLight, fg: colors.danger};
  if (prioridad === 'Media') return {bg: colors.warningLight, fg: colors.warning};
  return {bg: colors.successLight, fg: colors.success};
}

const SuggestionCard: React.FC<Props> = ({suggestion, seen, onPress}) => {
  const badge = badgeStyle(suggestion.prioridad);
  return (
    <Pressable onPress={onPress} style={[styles.card, seen && styles.seen]} accessibilityRole="button">
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>{suggestion.icon}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {suggestion.titulo}
        </Text>
        <View style={[styles.badge, {backgroundColor: badge.bg}]}>
          <Text style={[styles.badgeText, {color: badge.fg}]}>{suggestion.prioridad}</Text>
        </View>
      </View>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: spacing.cardBorderRadius,
    padding: spacing.cardPadding,
    marginBottom: spacing.gridGap,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  seen: {
    opacity: 0.65,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 22,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: spacing.badgeBorderRadius,
    marginTop: 6,
  },
  badgeText: {
    fontSize: fontSize.badge,
    fontWeight: '700',
  },
  arrow: {
    fontSize: 24,
    color: colors.textSecondary,
    marginLeft: 8,
  },
});

export default SuggestionCard;
