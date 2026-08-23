import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors} from '../theme';

interface VITOMascotProps {
  size?: number;
  showAntenna?: boolean;
}

/**
 * Mascota VITO — robot amigable tipo asistente de salud.
 *
 * Cabeza redondeada tipo pantalla, carita simple con ojos expresivos,
 * antena con hojita en la cabeza. Transmite cercanía y asistencia.
 *
 * Implementado con Views puras (sin SVG) para cero dependencias extra.
 */
const VITOMascot: React.FC<VITOMascotProps> = ({size = 80, showAntenna = true}) => {
  const scale = size / 80;

  return (
    <View style={[styles.wrapper, {width: size, height: size}]}>
      {/* Antena con hojita */}
      {showAntenna && (
        <View style={[styles.antennaContainer, {top: -14 * scale}]}>
          <View style={[styles.antennaLine, {height: 16 * scale}]} />
          <View style={[styles.leaf, {width: 12 * scale, height: 10 * scale, borderRadius: 6 * scale}]} />
        </View>
      )}

      {/* Cabeza */}
      <View style={[styles.head, {borderRadius: size * 0.35, backgroundColor: colors.surface}]}>
        {/* Pantalla / frente */}
        <View style={[styles.screen, {borderRadius: size * 0.2, margin: 6 * scale}]}>
          {/* Ojos */}
          <View style={styles.eyesRow}>
            <View style={[styles.eye, {backgroundColor: colors.primaryDark}]} />
            <View style={[styles.eye, {backgroundColor: colors.primaryDark}]} />
          </View>
          {/* Sonrisa */}
          <View style={styles.smileRow}>
            <View style={[styles.smile, {borderBottomColor: colors.primary}]} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Antena ──
  antennaContainer: {
    position: 'absolute',
    top: -14,
    alignItems: 'center',
    zIndex: 10,
  },
  antennaLine: {
    width: 2,
    backgroundColor: colors.primary,
  },
  leaf: {
    backgroundColor: colors.primary,
    marginTop: -2,
  },
  // ── Cabeza ──
  head: {
    flex: 1,
    width: '100%',
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screen: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  // ── Ojos ──
  eyesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  eye: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // ── Sonrisa ──
  smileRow: {
    marginTop: 4,
    alignItems: 'center',
  },
  smile: {
    width: 14,
    height: 7,
    borderBottomWidth: 2.5,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
  },
});

export default VITOMascot;
