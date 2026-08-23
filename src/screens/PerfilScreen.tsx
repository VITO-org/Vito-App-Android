import React from 'react';
import {View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Card from '../components/Card';
import VitoAvatar from '../components/VitoAvatar';
import {useSupabase} from '../context/SupabaseProvider';
import {colors, spacing, fontSize} from '../theme';
import type {RootStackParamList} from '../navigation/RootNavigator';

interface PerfilOptionProps {
  icon: string;
  iconSource?: any;
  label: string;
  onPress?: () => void;
}

const PerfilOption: React.FC<PerfilOptionProps> = ({icon, iconSource, label, onPress}) => (
  <TouchableOpacity style={styles.optionRow} onPress={onPress} activeOpacity={0.6}>
    <View style={styles.optionLeft}>
      <View style={styles.optionIcon}>
        {iconSource ? (
          <Image source={iconSource} style={styles.optionIconImage} />
        ) : (
          <Text style={styles.optionEmoji}>{icon}</Text>
        )}
      </View>
      <Text style={styles.optionLabel}>{label}</Text>
    </View>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>
);

// Módulo de opciones: sin onPress fijo — se asigna dentro del componente

const PerfilScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {session, profile, signOut} = useSupabase();

  const displayName =
    profile?.nombre
      ? profile.nombre + (profile.apellido ? ` ${profile.apellido}` : '')
      : session?.user?.email?.split('@')[0] ?? 'Usuario';

  const email = session?.user?.email ?? '';

  const handleNavigateEditarPerfil = () => {
    navigation.navigate('EditarPerfil');
  };

  const handleNavigateConfiguracion = () => {
    navigation.navigate('Configuracion');
  };

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que querés cerrar sesión?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch {
              // El RootNavigator detecta session=null y redirige al Login automáticamente
            }
          },
        },
      ],
    );
  };

  const profileIncomplete = session && !profile?.nombre;

  const handleNavigateCompleteProfile = () => {
    navigation.navigate('CompleteProfile');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {/* Banner si el perfil está incompleto */}
      {profileIncomplete && (
        <TouchableOpacity
          style={styles.banner}
          onPress={handleNavigateCompleteProfile}
          activeOpacity={0.8}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerIcon}>⚠️</Text>
            <View style={styles.bannerTextCol}>
              <Text style={styles.bannerTitle}>Perfil incompleto</Text>
              <Text style={styles.bannerSub}>Completá tus datos personales para personalizar tu experiencia</Text>
            </View>
            <Text style={styles.bannerArrow}>›</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Avatar + nombre */}
      <View style={styles.profileHeader}>
        <VitoAvatar size={72} />
        <Text style={styles.userName}>{displayName}</Text>
        {email ? <Text style={styles.userEmail}>{email}</Text> : null}
      </View>

      {/* Opciones */}
      <Card>
        {([
          {icon: '📋', label: 'Datos personales', onPress: handleNavigateEditarPerfil, iconSource: require('../assets/icons/ic-datos-personales.png')},
          {icon: '⚙️', label: 'Configuración', onPress: handleNavigateConfiguracion, iconSource: require('../assets/icons/ic-ajustes.png')},
          {icon: '📱', label: 'Dispositivos conectados', iconSource: require('../assets/icons/ic-dispositivos.png')},
          {icon: '🔒', label: 'Privacidad y seguridad', iconSource: require('../assets/icons/ic-seguridad.png')},
          {icon: '❓', label: 'Ayuda y soporte', iconSource: require('../assets/icons/ic-ayuda.png')},
        ] as PerfilOptionProps[]).map((opt, i) => (
          <React.Fragment key={opt.label}>
            <PerfilOption {...opt} />
            {i < 4 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </Card>

      {/* Cerrar sesión */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut} activeOpacity={0.7}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.screenPaddingTop,
  },

  // ── Banner perfil incompleto ──
  banner: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 20,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  bannerIcon: {
    fontSize: 20,
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: '#9A3412',
  },
  bannerSub: {
    fontSize: fontSize.caption,
    color: '#C2410C',
    marginTop: 2,
  },
  bannerArrow: {
    fontSize: 22,
    color: '#C2410C',
    fontWeight: '300',
  },

  // ── Header ──
  profileHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
  },
  userEmail: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // ── Opciones ──
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  optionIcon: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionEmoji: {
    fontSize: 16,
  },
  optionIconImage: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  optionLabel: {
    fontSize: fontSize.body,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  chevron: {
    fontSize: 22,
    color: colors.textSecondary,
    fontWeight: '300',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  bottomSpacer: {
    height: 32,
  },

  // ── Cerrar sesión ──
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.danger,
  },
});

export default PerfilScreen;
