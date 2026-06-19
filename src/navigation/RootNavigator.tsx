import React from 'react';
import {View, Text, ActivityIndicator} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import BottomTabNavigator from './BottomTabNavigator';
import DetalleSignoScreen from '../screens/DetalleSignoScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CompleteProfileScreen from '../screens/CompleteProfileScreen';
import EditarPerfilScreen from '../screens/EditarPerfilScreen';
import {useSupabase} from '../context/SupabaseProvider';

export type RootStackParamList = {
  MainTabs: undefined;
  DetalleSigno: {
    tipoSigno: string;
    label: string;
    unit: string;
    icon: string;
  };
  Login: undefined;
  Register: undefined;
  CompleteProfile: undefined;
  EditarPerfil: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigatorContent() {
  const {session, isLoading, needsProfile} = useSupabase();

  if (isLoading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff'}}>
        <ActivityIndicator size="large" color="#2FAF7A" />
        <Text style={{marginTop: 12, fontSize: 14, color: '#6B7280'}}>Cargando...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {/*
        Cada pantalla es un condicional INDIVIDUAL.
        Sin fragments, sin Stack.Group — el orden en JSX determina
        el orden real en React Navigation (sin bugs de reversión).
      */}
      {!session && <Stack.Screen name="Login" component={LoginScreen} />}
      {!session && <Stack.Screen name="Register" component={RegisterScreen} />}
      {session && needsProfile && (
        <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
      )}
      {session && !needsProfile && (
        <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
      )}
      {session && !needsProfile && (
        <Stack.Screen
          name="DetalleSigno"
          component={DetalleSignoScreen}
          options={{animation: 'slide_from_right'}}
        />
      )}
      {session && !needsProfile && (
        <Stack.Screen
          name="EditarPerfil"
          component={EditarPerfilScreen}
          options={{animation: 'slide_from_right'}}
        />
      )}
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  return <RootNavigatorContent />;
}
