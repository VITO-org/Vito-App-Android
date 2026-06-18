import React from 'react';
import {View, Text, ActivityIndicator} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import BottomTabNavigator from './BottomTabNavigator';
import DetalleSignoScreen from '../screens/DetalleSignoScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CompleteProfileScreen from '../screens/CompleteProfileScreen';
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
    <Stack.Navigator
      initialRouteName={
        session
          ? needsProfile
            ? 'CompleteProfile'
            : 'MainTabs'
          : 'Login'
      }
      screenOptions={{headerShown: false}}>
      {/*
        Login y Register SIEMPRE están en el navigator para evitar el bug
        de fragment donde el orden se invierte con <> condicional.
      */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />

      {/*
        Pantallas de sesión: solo se agregan si hay sesión activa.
        Si no hay sesión, el initialRouteName 'Login' funciona porque Login
        está siempre presente.
      */}
      {session && (
        <>
          {needsProfile ? (
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
          ) : (
            <>
              <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
              <Stack.Screen
                name="DetalleSigno"
                component={DetalleSignoScreen}
                options={{animation: 'slide_from_right'}}
              />
            </>
          )}
        </>
      )}
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  return <RootNavigatorContent />;
}
