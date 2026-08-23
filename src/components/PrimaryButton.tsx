import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import {colors, spacing, fontSize} from '../theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
}

/**
 * Botón principal VITO — verde oscuro, bordes tipo píldora.
 * Variant="secondary" → borde verde con fondo blanco.
 */
const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  loading = false,
  variant = 'primary',
  style,
}) => {
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={loading}
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#FFFFFF' : colors.primary} />
      ) : (
        <Text style={[styles.text, isPrimary ? styles.textPrimary : styles.textSecondary]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: spacing.buttonBorderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primary: {
    backgroundColor: colors.primaryDark,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  text: {
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  textPrimary: {
    color: '#FFFFFF',
  },
  textSecondary: {
    color: colors.primary,
  },
});

export default PrimaryButton;
