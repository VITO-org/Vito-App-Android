import React from 'react';
import {Image, ImageStyle, StyleProp} from 'react-native';

/**
 * Mapa de iconos locales (PNG desde Flaticon, estilo Mavadee Fill).
 *
 * Para agregar un icono nuevo:
 *   1. Descargar PNG 256px desde Flaticon
 *   2. Guardar en src/assets/icons/ como ic-{nombre}.png
 *   3. Agregar la entrada acá abajo
 */
const ICON_MAP: Record<string, ReturnType<typeof require>> = {
  'inicio': require('../assets/icons/ic-inicio.png'),
  'historial': require('../assets/icons/ic-historial.png'),
  'alertas': require('../assets/icons/ic-alertas.png'),
  'perfil': require('../assets/icons/ic-perfil.png'),
  'recargar': require('../assets/icons/ic-recargar.png'),
} as const;

export type AppIconName = keyof typeof ICON_MAP;

interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string; // los PNG no se colorean, se deja para futura migración a SVG
  style?: StyleProp<ImageStyle>;
}

/**
 * Icono de aplicación que renderiza PNG locales desde Flaticon.
 * Compatible con tabBarIcon, botones y cualquier lugar donde se usen iconos.
 */
const AppIcon: React.FC<AppIconProps> = ({name, size = 24, style}) => {
  const source = ICON_MAP[name];
  if (!source) return null;

  return (
    <Image
      source={source}
      style={[
        {width: size, height: size, resizeMode: 'contain'},
        style,
      ]}
    />
  );
};

export default AppIcon;
