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
  'pasos': require('../assets/icons/ic-pasos.png'),
  'calorias': require('../assets/icons/ic-calorias.png'),
  'distancia': require('../assets/icons/ic-distancia.png'),
  'sueno': require('../assets/icons/ic-sueno.png'),
  'check': require('../assets/icons/ic-check.png'),
  'error': require('../assets/icons/ic-error.png'),
  'alerta': require('../assets/icons/ic-alerta.png'),
  'frecuencia-cardiaca': require('../assets/icons/ic-frecuencia-cardiaca.png'),
  'presion-arterial': require('../assets/icons/ic-presion-arterial.png'),
  'oxigenacion': require('../assets/icons/ic-oxigenacion.png'),
  'temperatura': require('../assets/icons/ic-temperatura.png'),
  'flecha': require('../assets/icons/ic-flecha.png'),
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
