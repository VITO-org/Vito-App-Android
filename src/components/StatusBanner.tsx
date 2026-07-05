import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, fontSize} from '../theme';

interface StatusBannerProps {
  status: string;
  isError?: boolean;
  isWarning?: boolean;
}

/**
 * Banner that shows Health Connect status messages.
 * Background color changes based on type:
 * - default: subtle gray
 * - error: light red
 * - warning: light yellow
 */
export const StatusBanner: React.FC<StatusBannerProps> = ({
  status,
  isError = false,
  isWarning = false,
}) => {
  const bgColor = isError
    ? '#FEE2E2'
    : isWarning
      ? '#FEF3C7'
      : '#F3F4F6';

  const textColor = isError
    ? '#DC2626'
    : isWarning
      ? '#D97706'
      : colors.textSecondary;

  return (
    <View style={[styles.banner, {backgroundColor: bgColor}]}>
      <Text style={[styles.text, {color: textColor}]}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  text: {
    fontSize: fontSize.caption,
    textAlign: 'center',
  },
});
