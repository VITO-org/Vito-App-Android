import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useSupabase } from './SupabaseProvider';
import { registerDispositivo, getPreferenciaNotificacion, upsertPreferenciaNotificacion } from '../services/supabase/api';

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
}

interface NotificationsContextValue {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  preferences: NotificationPreferences;
  loading: boolean;
  error: string | null;
  requestPermissions: () => Promise<boolean>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
}

const defaultPreferences: NotificationPreferences = {
  push_habilitado: true,
  alertas_criticas: true,
  alertas_info: true,
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useSupabase();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const notificationListener = useRef<{ remove(): void } | null>(null);
  const responseListener = useRef<{ remove(): void } | null>(null);

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
      await registerDispositivo({
        id_usuario: session.user.id,
        fcm_token: token,
        plataforma: Platform.OS === 'android' ? 'android' : 'ios',
        activo: true,
        last_seen_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error registering push token:', err);
    }
  }, [session?.user?.id]);

  // Get push token
  const getPushToken = useCallback(async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;
      setExpoPushToken(token);

      // Register with Supabase
      await registerToken(token);
    } catch (err) {
      console.error('Error getting push token:', err);
      setError('Error al obtener token de notificaciones');
    }
  }, [requestPermissions, registerToken]);

  // Load user preferences
  const loadPreferences = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const prefs = await getPreferenciaNotificacion(session.user.id);
      if (prefs) {
        setPreferences({
          push_habilitado: prefs.push_habilitado ?? true,
          alertas_criticas: prefs.alertas_criticas ?? true,
          alertas_info: prefs.alertas_info ?? true,
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
      });
    } catch (err) {
      console.error('Error updating notification preferences:', err);
      // Revert on error
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
    // Listener for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // Listener for user tapping on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      // Deep link handling will be implemented here
      console.log('Notification tapped:', data);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const value: NotificationsContextValue = {
    expoPushToken,
    notification,
    preferences,
    loading,
    error,
    requestPermissions,
    updatePreferences,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export default NotificationsProvider;
