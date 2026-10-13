import React from 'react';
import {Text, type StyleProp, type TextStyle} from 'react-native';
import AppIcon, {type AppIconName} from './AppIcon';

interface SignoIconProps {
  name?: AppIconName;
  emoji?: string;
  size?: number;
  /** Estilo extra solo para el fallback emoji (preserva los styles.icon de cada pantalla). El PNG no lleva estilo, como hoy. */
  style?: StyleProp<TextStyle>;
}

/**
 * Icono de signo vital centralizado — única fuente de verdad del tamaño.
 * Regla: `temperatura` → 28, resto → `size ?? 30` (mismos tamaños que hoy).
 * Con `name` renderiza el PNG; sin él, el emoji fallback al mismo tamaño.
 */
const SignoIcon: React.FC<SignoIconProps> = ({name, emoji, size, style}) => {
  if (name) {
    return <AppIcon name={name} size={name === 'temperatura' ? 28 : (size ?? 30)} />;
  }
  return <Text style={[{fontSize: size ?? 30}, style]}>{emoji}</Text>;
};

export default SignoIcon;
