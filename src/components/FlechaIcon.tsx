import React from 'react';
import {ImageStyle, StyleProp} from 'react-native';
import AppIcon from './AppIcon';

export type FlechaDirection = 'up' | 'down' | 'left' | 'right';

interface FlechaIconProps {
  direction?: FlechaDirection;
  size?: number;
  color?: string;
  style?: StyleProp<ImageStyle>;
}

const ROTATION: Record<FlechaDirection, string> = {
  right: '0deg',
  down: '90deg',
  left: '180deg',
  up: '270deg',
};

/**
 * Icono de flecha reutilizable.
 * Soporta 4 direcciones rotando un mismo PNG.
 */
const FlechaIcon: React.FC<FlechaIconProps> = ({
  direction = 'right',
  size = 14,
  color,
  style,
}) => {
  return (
    <AppIcon
      name="flecha"
      size={size}
      style={[
        {transform: [{rotate: ROTATION[direction]}]},
        color ? {tintColor: color} : undefined,
        style,
      ]}
    />
  );
};

export default FlechaIcon;
