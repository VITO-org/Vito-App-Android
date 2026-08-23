import React from 'react';
import {View, StyleSheet} from 'react-native';
import AppIcon from './AppIcon';
import {colors} from '../theme';

export type StatusType = 'ok' | 'error' | 'alerta';

interface StatusIndicatorProps {
  status: StatusType;
  size?: number;
}

const STATUS_CONFIG: Record<StatusType, {iconName: 'check' | 'error' | 'alerta'; color: string}> = {
  ok: {iconName: 'check', color: colors.success},
  error: {iconName: 'error', color: colors.danger},
  alerta: {iconName: 'alerta', color: colors.warning},
};

/**
 * Indicador visual de estado: ok (check verde), error (equis roja),
 * alerta (triángulo ámbar).
 */
const StatusIndicator: React.FC<StatusIndicatorProps> = ({status, size = 20}) => {
  const config = STATUS_CONFIG[status];

  return (
    <View style={[styles.container, {width: size, height: size}]}>
      <AppIcon name={config.iconName} size={size} style={{tintColor: config.color}} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default StatusIndicator;
