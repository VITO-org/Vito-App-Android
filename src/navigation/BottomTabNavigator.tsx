import React from 'react';
import {View, TouchableOpacity, Image, StyleSheet, Platform} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {colors, spacing, shadows} from '../theme';
import AppIcon from '../components/AppIcon';
import {useHealth} from '../context/HealthProvider';

import InicioScreen from '../screens/InicioScreen';
import HistorialScreen from '../screens/HistorialScreen';
import VITOScreen from '../screens/VITOScreen';
import AlertasScreen from '../screens/AlertasScreen';
import PerfilScreen from '../screens/PerfilScreen';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
export type BottomTabParamList = {
  Inicio: undefined;
  Historial: undefined;
  VITO: undefined;
  Alertas: undefined;
  Perfil: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

const TAB_LABELS: Record<keyof BottomTabParamList, string> = {
  Inicio: 'Inicio',
  Historial: 'Historial',
  VITO: '',
  Alertas: 'Alertas',
  Perfil: 'Perfil',
};

// ---------------------------------------------------------------------------
// Botón central VITO — más grande, circular, con la mascota
// ---------------------------------------------------------------------------
const CenterTabButton: React.FC<{
  children: React.ReactNode;
  onPress?: () => void;
  accessibilityState?: {selected?: boolean};
}> = ({children, onPress, accessibilityState}) => {
  const isSelected = accessibilityState?.selected ?? false;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.centerButtonTouch}>
      <View
        style={[
          styles.centerButtonCircle,
          isSelected && styles.centerButtonCircleActive,
        ]}>
        <Image
              source={require('../assets/icons/VITO-Completo.png')}
              style={{width: 60, height: 60, resizeMode: 'contain'}}
            />
      </View>
    </TouchableOpacity>
  );
};

// ---------------------------------------------------------------------------
// Navigator
// ---------------------------------------------------------------------------
const BottomTabNavigator: React.FC = () => {
  const {activeAlertsCount} = useHealth();

  return (
    <Tab.Navigator
      initialRouteName="Inicio"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarHideOnKeyboard: true,
      }}>
      {/* Inicio */}
      <Tab.Screen
        name="Inicio"
        component={InicioScreen}
        options={{
          tabBarLabel: TAB_LABELS.Inicio,
          tabBarIcon: ({color, size}) => (
            <AppIcon
              name="inicio"
              size={size}
              style={{tintColor: color}}
            />
          ),
        }}
      />

      {/* Historial */}
      <Tab.Screen
        name="Historial"
        component={HistorialScreen}
        options={{
          tabBarLabel: TAB_LABELS.Historial,
          tabBarIcon: ({color, size}) => (
            <AppIcon
              name="historial"
              size={size}
              style={{tintColor: color}}
            />
          ),
        }}
      />

      {/* VITO — botón central destacado */}
      <Tab.Screen
        name="VITO"
        component={VITOScreen}
        options={{
          tabBarLabel: TAB_LABELS.VITO,
          tabBarIcon: () => null,
          tabBarButton: props => <CenterTabButton {...props} />,
        }}
      />

      {/* Alertas */}
      <Tab.Screen
        name="Alertas"
        component={AlertasScreen}
        options={{
          tabBarLabel: TAB_LABELS.Alertas,
          tabBarIcon: ({color, size}) => (
            <AppIcon
              name="alertas"
              size={size}
              style={{tintColor: color}}
            />
          ),
          tabBarBadge: activeAlertsCount > 0 ? activeAlertsCount : undefined,
          tabBarBadgeStyle: styles.badge,
        }}
      />

      {/* Perfil */}
      <Tab.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{
          tabBarLabel: TAB_LABELS.Perfil,
          tabBarIcon: ({color, size}) => (
            <AppIcon
              name="perfil"
              size={size}
              style={{tintColor: color}}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 0,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    height: Platform.OS === 'android' ? 68 : 85,
    paddingBottom: Platform.OS === 'android' ? 8 : 20,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.danger,
    fontSize: 11,
    fontWeight: 'bold',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    lineHeight: 18,
  },

  // Botón central VITO
  centerButtonTouch: {
    top: -18,
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    height: 64,
  },
  centerButtonCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.centerButton,
  },
  centerButtonCircleActive: {
    backgroundColor: colors.backgroundLight,
    borderColor: colors.primaryDark,
  },
});

export default BottomTabNavigator;
