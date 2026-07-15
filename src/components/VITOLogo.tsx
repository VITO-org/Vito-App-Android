import React from 'react';
import {Image, StyleSheet} from 'react-native';

interface VITOLogoProps {
  size?: number;
  marginBottom?: number;
}

const VITOLogo: React.FC<VITOLogoProps> = ({size = 200, marginBottom = 4}) => {
  const height = Math.round(size * 0.56);
  return (
    <Image
      source={require('../assets/icons/VITO-borde-inferior.png')}
      style={[styles.image, {width: size, height, marginBottom}]}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({
  image: {
    alignSelf: 'center',
  },
});

export default VITOLogo;
