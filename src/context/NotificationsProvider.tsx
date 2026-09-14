import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useSupabase } from './SupabaseProvider';

// EAS projectId (app.json extra.eas.projectId). Obligatorio en APK
// standalone: getExpoPushTokenAsync() sin projectId tira en físico.
const EAS_PROJECT_ID =
  (Constants.expoConfig?.extra as any)?.eas?.projectId ??
  'fa67daf3-789f-4cc2-a373-ceb1507c4a50';
import { registerDispositivo, getPreferenciaNotificacion, upsertPreferenciaNotificacion, marcarRecibidaPorAlerta, marcarLeidaPorAlerta } from '../services/supabase/api';
import type { DispositivoUsuario } from '../services/supabase/models';

// ===========================================================================
// Módulo-level refs for navigation + notification tap handling
// ===========================================================================

/**
 * Navigation ref — seteado por RootNavigator via useNavigation().
 * Permite navegar al DetalleSignoScreen cuando el usuario toca una notificación.
 */
const navigationRef: { current: any } = { current: null };

/**
 * Notification tap data ref — actualizado por el listener de respuesta.
 * Contiene { alertId, alertType, severity, screen } del último tap.
 */
const notificationTapRef: { current: any } = { current: null };

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationPreferences {
  push_habilitado: boolean;
  alertas_criticas: boolean;
  alertas_info: boolean;
  horario_silencioso_inicio: string | null;
  horario_silencioso_fin: string | null;
}

interface NotificationsContextValue {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  preferences: NotificationPreferences;
  dispositivoId: string | null;
  loading: boolean;
  error: string | null;
  requestPermissions: () => Promise<boolean>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  updateHorarioSilencioso: (inicio: string, fin: string) => Promise<void>;
}

const defaultPreferences: NotificationPreferences = {
  push_habilitado: true,
  alertas_criticas: true,
  alertas_info: true,
  horario_silencioso_inicio: '23:00:00',
  horario_silencioso_fin: '07:00:00',
};

/**
 * CA-03: map alert type → DetalleSigno params so a tap always lands
 * on a valid detail screen, carrying alertId for traceability.
 */
function destinoPorTipoAlerta(alertType: string | undefined): {
  tipoSigno: string;
  label: string;
  unit: string;
  icon: string;
} {
  switch (alertType) {
    case 'hipoxia':
      return {tipoSigno: 'saturacion_oxigeno', label: 'Saturación de oxígeno', unit: '%', icon: '🩸'};
    case 'hipertension':
    case 'hipotension':
      return {tipoSigno: 'presion_sistolica', label: 'Presión arterial', unit: 'mmHg', icon: '❤️'};
    case 'taquicardia':
    case 'bradicardia':
      return {tipoSigno: 'frecuencia_cardiaca', label: 'Frecuencia cardíaca', unit: 'lpm', icon: '💓'};
    default:
      return {tipoSigno: 'frecuencia_cardiaca', label: 'Frecuencia cardíaca', unit: 'lpm', icon: '💓'};
  }
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

/**
 * Provider de notificaciones push con expo-notifications.
 * Gestiona tokens FCM, preferencias de usuario y listeners de notificaciones.
 */
export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useSupabase();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [dispositivoId, setDispositivoId] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Request notification permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!Device.isDevice) {
      setError('Las notificaciones push requieren un dispositivo físico');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      setError('Permiso de notificaciones no concedido');
      return false;
    }

    setError(null);
    return true;
  }, []);

  // Register FCM token with Supabase
  const registerToken = useCallback(async (token: string) => {
    if (!session?.user?.id) return;

    try {
      const dispositivo = await registerDispositivo({
        id_usuario: session.user.id,
        fcm_token: token,
        plataforma: Platform.OS === 'android' ? 'android' : 'ios',
        activo: true,
        last_seen_at: new Date().toISOString(),
      });
      setDispositivoId(dispositivo.id);
    } catch (err) {
      console.error('Error registering push token:', err);
    }
  }, [session?.user?.id]);

  // Get push token
  const getPushToken = useCallback(async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
      const token = tokenData.data;
      setExpoPushToken(token);

      // Register with Supabase
      await registerToken(token);
    } catch (err) {
      console.error('Error getting push token:', err);
      setError('Error al obtener token de notificaciones');
    }
  }, [requestPermissions, registerToken]);

  // Load user preferences (includes horario silencioso from DB)
  const loadPreferences = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const prefs = await getPreferenciaNotificacion(session.user.id);
      if (prefs) {
        setPreferences({
          push_habilitado: prefs.push_habilitado ?? true,
          alertas_criticas: prefs.alertas_criticas ?? true,
          alertas_info: prefs.alertas_info ?? true,
          horario_silencioso_inicio: prefs.horario_silencioso_inicio ?? '23:00:00',
          horario_silencioso_fin: prefs.horario_silencioso_fin ?? '07:00:00',
        });
      }
    } catch (err) {
      console.error('Error loading notification preferences:', err);
    }
  }, [session?.user?.id]);

  // Update preferences
  const updatePreferences = useCallback(async (newPrefs: Partial<NotificationPreferences>) => {
    if (!session?.user?.id) return;

    const updatedPrefs = { ...preferences, ...newPrefs };
    setPreferences(updatedPrefs);

    try {
      await upsertPreferenciaNotificacion({
        id_usuario: session.user.id,
        ...updatedPrefs,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error updating notification preferences:', err);
      setPreferences(preferences);
    }
  }, [session?.user?.id, preferences]);

  // Update only the quiet hours
  const updateHorarioSilencioso = useCallback(async (inicio: string, fin: string) => {
    if (!session?.user?.id) return;

    const updatedPrefs = {
      ...preferences,
      horario_silencioso_inicio: inicio,
      horario_silencioso_fin: fin,
    };
    setPreferences(updatedPrefs);

    try {
      await upsertPreferenciaNotificacion({
        id_usuario: session.user.id,
        ...updatedPrefs,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error updating quiet hours:', err);
      setPreferences(preferences);
    }
  }, [session?.user?.id, preferences]);

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await getPushToken();
      await loadPreferences();
      setLoading(false);
    };

    if (session?.user?.id) {
      initialize();
    }
  }, [session?.user?.id, getPushToken, loadPreferences]);

  // Set up notification listeners
  useEffect(() => {
    // Listener for notifications received while app is in foreground (CA-06: recibida)
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      const alertId = (notification.request.content.data as any)?.alertId;
      if (typeof alertId === 'string' && alertId) {
        marcarRecibidaPorAlerta(alertId, session?.access_token ?? null).catch(err =>
          console.error('Error marking delivery recibida:', err),
        );
      }
    });

    // Listener for user tapping on notification — CA-03 Deep Link + CA-06 leída
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      notificationTapRef.current = data;

      if (typeof (data as any)?.alertId === 'string' && (data as any)?.alertId) {
        marcarLeidaPorAlerta((data as any).alertId, session?.access_token ?? null).catch(err =>
          console.error('Error marking delivery leida:', err),
        );
      }

      // Deep link: DetalleSigno requires tipoSigno/label/unit/icon,
      // so resolve them from the alert type and always include alertId.
      if (data?.alertId && navigationRef.current) {
        const destino = destinoPorTipoAlerta(data.alertType as string | undefined);
        navigationRef.current.navigate('DetalleSigno', {
          ...destino,
          alertId: data.alertId,
          alertType: data.alertType,
          severity: data.severity,
        });
      }
      console.log('Notification tapped with data:', data);
    });

    return () => {
      if (notificationListener) {
        notificationListener.remove();
      }
      if (responseListener) {
        responseListener.remove();
      }
    };
  }, []);

  const value: NotificationsContextValue = {
    expoPushToken,
    notification,
    preferences,
    dispositivoId,
    loading,
    error,
    requestPermissions,
    updatePreferences,
    updateHorarioSilencioso,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export default NotificationsProvider;

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};

/**
 * Call this from RootNavigator (via useNavigation) to enable deep linking.
 * Ejemplo: setNavigationRef(navigation);
 */
export const setNavigationRef = (nav: any): void => {
  navigationRef.current = nav;
};

/**
 * Exponer navigationRef como export directo (módulo-level)
 * para uso en listeners sin necesidad de hooks.
 */
export { navigationRef, notificationTapRef };