import React from 'react';
import {View, Text, ActivityIndicator} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import BottomTabNavigator from './BottomTabNavigator';
import DetalleSignoScreen from '../screens/DetalleSignoScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CompleteProfileScreen from '../screens/CompleteProfileScreen';
import EditarPerfilScreen from '../screens/EditarPerfilScreen';
import TodosLosSignosScreen from '../screens/TodosLosSignosScreen';
import RegistrarSintomaScreen from '../screens/RegistrarSintomaScreen';
import HistorialSintomasScreen from '../screens/HistorialSintomasScreen';
import ExportHistorialScreen from '../screens/ExportHistorialScreen';
import {useSupabase} from '../context/SupabaseProvider';

export type RootStackParamList = {
  MainTabs: undefined;
  DetalleSigno: {
    tipoSigno: string;
    label: string;
    unit: string;
    icon: string;
  };
  TodosLosSignos: undefined;
  Login: undefined;
  Register: undefined;
  CompleteProfile: undefined;
  EditarPerfil: undefined;
  RegistrarSintoma: undefined;
  HistorialSintomas: undefined;
  ExportHistorial: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigatorContent() {
  const {session, isLoading, needsProfile} = useSupabase();

  console.log(`[DIAG-NAV] isLoading=${isLoading}, session=${session ? 'ACTIVE' : 'NULL'}, needsProfile=${needsProfile}`);

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
      */}
      {!session && <Stack.Screen name="Login" component={LoginScreen} />}
      {!session && <Stack.Screen name="Register" component={RegisterScreen} />}
      {session && !needsProfile && (
        <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
      )}
      {session && needsProfile && (
        <Stack.Screen
          name="CompleteProfile"
          component={CompleteProfileScreen}
          options={{animation: 'slide_from_bottom'}}
        />
      )}
      {session && (
        <Stack.Screen
          name="DetalleSigno"
          component={DetalleSignoScreen}
          options={{animation: 'slide_from_right'}}
        />
      )}
      {session && (
        <Stack.Screen
          name="EditarPerfil"
          component={EditarPerfilScreen}
          options={{animation: 'slide_from_right'}}
        />
      )}
      {session && (
        <Stack.Screen
          name="TodosLosSignos"
          component={TodosLosSignosScreen}
          options={{animation: 'slide_from_right'}}
        />
      )}
      {session && (
        <Stack.Screen
          name="RegistrarSintoma"
          component={RegistrarSintomaScreen}
          options={{animation: 'slide_from_bottom'}}
        />
      )}
      {session && (
        <Stack.Screen
          name="HistorialSintomas"
          component={HistorialSintomasScreen}
          options={{animation: 'slide_from_right'}}
        />
      )}
      {session && (
        <Stack.Screen
          name="ExportHistorial"
          component={ExportHistorialScreen}
          options={{animation: 'slide_from_right'}}
        />
      )}
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  return <RootNavigatorContent />;
}
