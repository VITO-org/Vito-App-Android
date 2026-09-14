import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Alerta, SeveridadAlerta, EstadoNotificacion } from '../supabase/models';
import {
  registrarEntregaNotificacion,
  getPreferenciaNotificacion,
  getDispositivos,
} from '../supabase/api';

/**
 * Time interface for silencing schedule
 */
interface HorarioSilencioso {
  inicio: string; // 'HH:MM:SS'
  fin: string;   // 'HH:MM:SS'
}

/**
 * Check if current time falls within the silent hours.
 * Silent hours wrap around midnight (e.g., 23:00-07:00).
 * Critical alerts skip this filter.
 */
export function estaEnHorarioSilencioso(horario: HorarioSilencioso | null): boolean {
  if (!horario) return false;
  
  const ahora = new Date();
  const horaActual = ahora.getHours();
  const minutoActual = ahora.getMinutes();
  const segundosActuales = ahora.getSeconds();
  const totalSegundos = horaActual * 3600 + minutoActual * 60 + segundosActuales;

  const [hIn, mIn, sIn] = horario.inicio.split(':').map(Number);
  const [hFin, mFin, sFin] = horario.fin.split(':').map(Number);
  const inicioSegundos = hIn * 3600 + mIn * 60 + (sIn || 0);
  const finSegundos = hFin * 3600 + mFin * 60 + (sFin || 0);

  // Handle wrap-around (e.g., 23:00 -> 07:00)
  if (inicioSegundos > finSegundos) {
    return totalSegundos >= inicioSegundos || totalSegundos < finSegundos;
  }
  return totalSegundos >= inicioSegundos && totalSegundos < finSegundos;
}

/**
 * Send a push notification for an alert.
 * Options:
 * - skipFilter: if true, doesn't check silent hours (used for critical alerts)
 * - userId: needed for delivery logging
 * - horarioSilencioso: user's quiet hours preference
 */
export async function sendAlertNotification(
  alert: Alerta,
  options?: {
    skipFilter?: boolean;
    userId?: string;
    horarioSilencioso?: HorarioSilencioso | null;
    accessToken?: string | null;
  },
): Promise<string | null> {
  // Resolve user + quiet-hours prefs (self-sufficient: HealthProvider calls bare).
  const userId = options?.userId ?? alert.id_usuario;
  let horario = options?.horarioSilencioso ?? null;
  if (horario === null && userId) {
    try {
      const prefs = await getPreferenciaNotificacion(userId, options?.accessToken);
      if (prefs?.horario_silencioso_inicio && prefs?.horario_silencioso_fin) {
        horario = {
          inicio: prefs.horario_silencioso_inicio,
          fin: prefs.horario_silencioso_fin,
        };
      }
    } catch (err) {
      console.error('Error loading quiet-hours prefs (fail-open):', err);
    }
  }

  // CA-05: quiet hours suppress NON-critical alerts only. Critical always delivered.
  const isCritica = alert.severidad === 'critica';
  if (!isCritica && !options?.skipFilter && estaEnHorarioSilencioso(horario)) {
    console.log('Alerta no enviada: horario de silencio activo');
    return null;
  }

  const hasPermission = await Notifications.getPermissionsAsync();
  if (hasPermission.status !== 'granted') {
    return null;
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

  // Schedule the notification and get its identifier
  const notificationId = await Notifications.scheduleNotificationAsync({
    content,
    trigger,
  });

  // Register delivery in Supabase (CA-06: estado 'enviada')
  if (userId) {
    try {
      let dispositivoId: string | null = null;
      try {
        const dispositivos = await getDispositivos(userId, options?.accessToken);
        dispositivoId = dispositivos[0]?.id ?? null;
      } catch {
        // Best-effort: log without device link if lookup fails
      }
      await registrarEntregaNotificacion({
        id_alerta: alert.id,
        id_usuario: userId,
        id_dispositivo: dispositivoId,
        estado: 'enviada' as EstadoNotificacion,
        enviado_en: new Date().toISOString(),
        recibida_en: null,
        leida_en: null,
        error_mensaje: null,
      }, options?.accessToken ?? null);
    } catch (err) {
      console.error('Error registering delivery:', err);
    }
  }

  return notificationId;
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
