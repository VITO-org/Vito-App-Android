import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Alerta } from '../supabase/models';

/**
 * Send a push notification for an alert
 */
export async function sendAlertNotification(alert: Alerta): Promise<void> {
  const hasPermission = await Notifications.getPermissionsAsync();
  if (hasPermission.status !== 'granted') {
    return;
  }

  const content: Notifications.NotificationContentInput = {
    title: alert.titulo,
    body: alert.mensaje || getAlertBody(alert),
    data: {
      alertId: alert.id,
      alertType: alert.tipo,
      severity: alert.severidad,
      screen: 'Alertas',
    },
    sound: alert.severidad === 'critica' ? 'default' : undefined,
    priority: alert.severidad === 'critica' 
      ? Notifications.AndroidNotificationPriority.MAX 
      : Notifications.AndroidNotificationPriority.DEFAULT,
  };

  const trigger: Notifications.NotificationTriggerInput = null; // Send immediately

  await Notifications.scheduleNotificationAsync({
    content,
    trigger,
  });
}

/**
 * Get a human-readable body for the alert
 */
function getAlertBody(alert: Alerta): string {
  switch (alert.tipo) {
    case 'hipoxia':
      return 'Tu saturación de oxígeno está baja';
    case 'hipertension':
      return 'Tu presión arterial está alta';
    case 'hipotension':
      return 'Tu presión arterial está baja';
    case 'taquicardia':
      return 'Tu frecuencia cardíaca está alta';
    case 'bradicardia':
      return 'Tu frecuencia cardíaca está baja';
    default:
      return 'Tienes una nueva alerta de salud';
  }
}

/**
 * Cancel all pending notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear badge
 */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}
