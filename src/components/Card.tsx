import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import {colors, spacing, shadows} from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Card reutilizable — fondo blanco, bordes muy redondeados, sombra suave.
 * Es el contenedor base de todas las tarjetas de VITO.
 */
const Card: React.FC<CardProps> = ({children, style}) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.cardBorderRadius,
    padding: spacing.cardPadding,
    marginBottom: spacing.cardMarginBottom,
    ...shadows.card,
  },
});

export default Card;
