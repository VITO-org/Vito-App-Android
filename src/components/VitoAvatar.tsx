import React from 'react';
import {View, Image, StyleSheet} from 'react-native';
import {colors} from '../theme';

interface VitoAvatarProps {
  size?: number;
}

const AVATAR_SIZE_MULTIPLIER = 1.1;  // contenedor un 10% más grande que la imagen
const IMAGE_SIZE_MULTIPLIER = 1.0;   // imagen ocupa el 100% del contenedor

/**
 * Avatar circular reutilizable con la imagen de VITO.
 *
 * Contenedor blanco con borde verde, imagen centrada adentro.
 * Único punto de definición — usalo en todas las pantallas
 * donde se muestre el avatar del usuario.
 */
const VitoAvatar: React.FC<VitoAvatarProps> = ({size = 72}) => {
  const containerSize = Math.round(size * AVATAR_SIZE_MULTIPLIER);
  const imageSize = Math.round(containerSize * IMAGE_SIZE_MULTIPLIER);

  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
        },
      ]}>
      <Image
        source={require('../assets/icons/VITO-Completo.png')}
        style={{width: imageSize, height: imageSize}}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});

export default VitoAvatar;
