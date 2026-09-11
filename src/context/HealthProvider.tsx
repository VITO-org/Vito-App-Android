import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type {HealthSummary, HealthConnectStatus} from '../types/health';
import {
  checkAvailability,
  requestPermissions,
  getHealthData,
  HealthModuleNotAvailableError,
} from '../services/VitoHealthNative';
import {useSupabase} from './SupabaseProvider';
import {
  getDatosReloj,
  getProfile,
  insertDatosReloj,
  markDatosRelojReemplazado,
  insertAlerta,
  getAlertas,
  getAlertasActivas,
  marcarAlertaLeida,
  updateAlertaDatos,
  insertDatosRelojYML,
  SyncMLPartialError,
  getBaselinePersonalizado,
} from '../services/supabase/api';
import type {Alerta} from '../services/supabase/models';
import {sendAlertNotification} from '../services/notifications';
import {
  syncWearableToBackend,
  DEFAULT_SYNC_INTERVAL_MIN,
  MIN_SYNC_INTERVAL_MS,
} from '../services/healthSync';
import { normalizeVital } from '../services/vitals';
import type {DatosRelojInsert} from '../services/supabase/models';
import {saveHealthSnapshot, pruneOldEntries} from '../services/HealthDataCache';
import {AlertEngine} from '../services/alerts/engine';

type ErrorSeverity = 'error' | 'warning';

interface HealthContextValue {
  /** Current health summary, null before first successful load. */
  summary: HealthSummary | null;
  /** Health Connect availability status. */
  hcStatus: HealthConnectStatus | null;
  /** True while loading data. */
  loading: boolean;
  /** Last error message, if any. */
  error: string | null;
  /** Severity of the current error (if any). */
  errorSeverity: ErrorSeverity | null;
  /** True if HC permissions have been granted. */
  permissionsGranted: boolean;
  /** Timestamp of the last successful data sync, null if never synced. */
  lastSync: Date | null;
  /** Intervalo de sincronización configurado en minutos (HU-25 CA-01), default 10. */
  syncIntervalMin: number;
  /** Actualiza el intervalo de sincronización en el contexto (HU-25 CA-01). Re-crea el auto-refresh. */
  setSyncInterval: (min: number) => void;
  /** Request permissions and load data. */
  requestPermissionsAndLoad: () => Promise<void>;
  /** Refresh health data (requires permissions already granted). */
  refreshData: () => Promise<void>;
  // ── HU-41: Alertas ──
  /** Active alerts for the current user. */
  activeAlerts: Alerta[];
  /** Count of active alerts (for badge display). */
  activeAlertsCount: number;
  /** Confirm that the user acknowledged an alert. */
  confirmAlert: (alertId: string) => Promise<void>;
  /** Refresh the list of active alerts from Supabase. */
  refreshAlerts: () => Promise<void>;
}

const HealthContext = createContext<HealthContextValue | undefined>(undefined);

interface HealthProviderProps {
  children: ReactNode;
}

export const HealthProvider: React.FC<HealthProviderProps> = ({children}) => {
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [hcStatus, setHcStatus] = useState<HealthConnectStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorSeverity, setErrorSeverity] = useState<ErrorSeverity | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncIntervalMin, setSyncIntervalMin] = useState(DEFAULT_SYNC_INTERVAL_MIN);
  const [activeAlerts, setActiveAlerts] = useState<Alerta[]>([]);
  const {getUserId} = useSupabase();

  // Referencia para el intervalo de auto-refresh
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── HU-41: Alert Engine (initialized lazily after userId is available) ──
  const alertEngineRef = useRef<AlertEngine | null>(null);

  // Cargar intervalo configurable desde perfil_usuario.intervalo_sync_min (HU-25 CA-01)
  useEffect(() => {
    const userId = getUserId();
    if (!userId) return;
    getProfile(userId)
      .then(profile => {
        const config = profile?.intervalo_sync_min;
        if (config != null && config > 0) {
          // Clamp al mínimo soportado (modo casi-tiempo-real)
          setSyncIntervalMin(Math.max(config, Math.ceil(MIN_SYNC_INTERVAL_MS / 60_000)));
        }
      })
      .catch(() => {
        // Configuración no disponible → se mantiene el default
      });
  }, [getUserId]);

  // ── HU-41: Initialize AlertEngine and load active alerts ──
  useEffect(() => {
    const userId = getUserId();
    if (!userId) return;

    // Initialize engine if not yet created
    if (!alertEngineRef.current) {
      alertEngineRef.current = new AlertEngine({
        insertAlert: async (alertInsert) => {
          const row = await insertAlerta({
            id_usuario: alertInsert.id_usuario,
            id_dato_reloj: alertInsert.id_dato_reloj ?? null,
            id_prediccion_riesgo: alertInsert.id_prediccion_riesgo ?? null,
            tipo: alertInsert.tipo,
            severidad: alertInsert.severidad,
            titulo: alertInsert.titulo,
            mensaje: alertInsert.mensaje,
            datos: alertInsert.datos ?? null,
            leida_en: null,
            expira_en: alertInsert.expira_en ?? null,
          });
          return {
            ...row,
            status: row.leida_en ? 'leida' as const : 'activa' as const,
          };
        },
        getActiveAlerts: async (uid) => {
          const rows = await getAlertasActivas(uid);
          return rows.map(r => ({
            ...r,
            status: r.leida_en ? 'leida' as const : 'activa' as const,
          }));
        },
        markAlertRead: async (alertId) => {
          await marcarAlertaLeida(alertId);
        },
        updateAlertDatos: async (alertId, datos) => {
          await updateAlertaDatos(alertId, datos as any);
        },
        // HU-42 CA-04: historial de FC de los últimos 5 min para calcular tendencia
        getRecentHeartRates: async (uid, fromIso) => {
          const rows = await getDatosReloj(uid, {from: fromIso, limit: 20});
          return rows
            .filter(r => r.frec_cardiaca_bpm != null && r.recorded_at != null)
            .map(r => ({
              bpm: r.frec_cardiaca_bpm as number,
              recordedAt: r.recorded_at as string,
            }));
        },
        // HU-98: baseline personalizado para umbrales adaptativos (fallback estándar si falla)
        getPersonalizedBaseline: async (uid) => {
          try {
            return await getBaselinePersonalizado(uid);
          } catch {
            return null;
          }
        },
      });

      // Register listeners for UI updates
      alertEngineRef.current.onGenerated(async (alert) => {
        refreshAlerts();
        // Send push notification
        try {
          await sendAlertNotification(alert as any);
        } catch (e) {
          console.error('Error sending push notification:', e);
        }
      });
      alertEngineRef.current.onEscalated(() => {
        refreshAlerts();
      });
      alertEngineRef.current.onResolved(() => {
        refreshAlerts();
      });
    }

    // Load initial active alerts
    refreshAlerts();

    return () => {
      alertEngineRef.current?.dispose();
      alertEngineRef.current = null;
    };
  }, [getUserId]);

  // Check Health Connect availability on mount
  useEffect(() => {
    (async () => {
      try {
        const status = await checkAvailability();
        setHcStatus(status);
      } catch (e) {
        if (e instanceof HealthModuleNotAvailableError) {
          setError('El módulo nativo de Health Connect no está disponible en esta plataforma.');
          setErrorSeverity('warning');
        } else {
          setError('Error al verificar disponibilidad de Health Connect.');
          setErrorSeverity('error');
        }
        setHcStatus('unavailable');
      }
    })();
  }, []);

  const loadHealthData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorSeverity(null);
    const userId = getUserId();
    try {
      const data = await getHealthData();
      setSummary(data);
      setLastSync(new Date());

      // Guardar en caché local (AsyncStorage) como respaldo para el historial
      saveHealthSnapshot(data).catch(() => {});
      // Podar entradas viejas 1 vez al día (lo ejecutamos pero ignoramos error)
      pruneOldEntries(60).catch(() => {});

      // ── HU-25: Sincronizar con Supabase (datos_reloj) — motor central ──
      const userId = getUserId();
      if (userId) {
        // ── HU-25: Sincronizar con Supabase (datos_reloj) ──
        try {
          const result = await syncWearableToBackend(userId, data, {
            insertDatosReloj,
            getDatosRelojInWindow: (uid, from, to) => getDatosReloj(uid, {from, to}),
            markDatosRelojReemplazado,
          });
          if (result.conflictResolved) {
            console.warn(
              'HealthProvider: conflicto resuelto a favor del wearable',
              result.manualReplaced,
            );
          }
        } catch (syncErr) {
          console.warn('HealthProvider: error al sincronizar con datos_reloj', syncErr);
        }

        // ── HU-95: Carga paralela en dato_salud_ml ──
        try {
          const hr = normalizeVital('frecuencia_cardiaca', data.averageBpm ?? null);
          const spo2 = normalizeVital('saturacion_oxigeno', data.spo2Percent ?? null);
          const temp = normalizeVital('temperatura', data.bodyTemperatureCelsius ?? null);

          const lectura: DatosRelojInsert = {
            id_usuario: userId,
            bp_sistolica: data.bloodPressureSystolic != null ? Math.round(data.bloodPressureSystolic) : null,
            bp_diastolica: data.bloodPressureDiastolic != null ? Math.round(data.bloodPressureDiastolic) : null,
            frec_cardiaca_bpm: hr.value,
            spo2_pct: spo2.value,
            temperatura: temp.value,
            nivel_estres: null,
            actividad_pasos: data.steps != null ? Math.round(data.steps) : null,
            horas_sueno: data.sleepMinutes != null ? data.sleepMinutes / 60 : null,
            recorded_at: new Date().toISOString(),
            sospechoso: hr.sospechoso || spo2.sospechoso || temp.sospechoso,
          };
          await insertDatosRelojYML(lectura, 'dispositivo');
        } catch (syncErr) {
          if (syncErr instanceof SyncMLPartialError) {
            console.warn(
              'HealthProvider: dato_salud_ml pendiente de re-intento',
              syncErr.datosMLPendientes,
            );
          } else {
            console.warn('HealthProvider: error al sincronizar con Supabase', syncErr);
          }
        }

        // ── HU-41: Evaluar SpO₂ para alertas de hipoxia (CA-02: ≤30s) ──
        if (data.spo2Percent != null && alertEngineRef.current) {
          try {
            await alertEngineRef.current.evaluateSpo2Reading(
              userId,
              data.spo2Percent,
              'health-connect',
            );
          } catch (alertErr) {
            console.warn('HealthProvider: error en motor de alertas SpO2', alertErr);
          }
        }

        // ── HU-43: Evaluar BP para alertas de hipertension/hipotension ──
        if (
          data.bloodPressureSystolic != null &&
          data.bloodPressureDiastolic != null &&
          alertEngineRef.current
        ) {
          try {
            await alertEngineRef.current.evaluateBpReading(
              userId,
              data.bloodPressureSystolic,
              data.bloodPressureDiastolic,
              'health-connect',
            );
          } catch (bpAlertErr) {
            console.warn('HealthProvider: error en motor de alertas BP', bpAlertErr);
          }
        }

        // ── HU-42: Evaluar FC para alertas de taquicardia/bradicardia ──
        if (data.averageBpm != null && alertEngineRef.current) {
          try {
            await alertEngineRef.current.evaluateHrReading(
              userId,
              data.averageBpm,
              'health-connect',
            );
          } catch (hrAlertErr) {
            console.warn('HealthProvider: error en motor de alertas FC', hrAlertErr);
          }
        }
      }
    } catch (e) {
      // Fuente de lectura (Health Connect) desconectada: conservar estado previo y avisar
      const message = e instanceof Error ? e.message : String(e ?? 'unknown error');
      setError('Error al leer datos: ' + message);
      setErrorSeverity('error');
    } finally {
      setLoading(false);
    }
  }, [getUserId]);

  const requestPermissionsAndLoad = useCallback(async () => {
    setError(null);
    setErrorSeverity(null);
    try {
      const result = await requestPermissions();
      if (result.granted || result.partiallyGranted) {
        setPermissionsGranted(true);
        await loadHealthData();
        if (result.partiallyGranted) {
          setError('Permisos parciales concedidos. Cargando datos disponibles...');
          setErrorSeverity('warning');
        }
      } else {
        setError('No se concedieron permisos. Habilítalos en Health Connect.');
        setErrorSeverity('error');
        setPermissionsGranted(false);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e ?? 'unknown error');
      setError('Error al solicitar permisos: ' + message);
      setErrorSeverity('error');
    } finally {
      setLoading(false);
    }
  }, [loadHealthData]);

  const refreshData = useCallback(async () => {
    if (!permissionsGranted) {
      await requestPermissionsAndLoad();
    } else {
      await loadHealthData();
    }
  }, [permissionsGranted, requestPermissionsAndLoad, loadHealthData]);

  // ── HU-41: Alert helpers ──
  const refreshAlerts = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;
    try {
      const alerts = await getAlertas(userId);
      setActiveAlerts(alerts);
    } catch {
      // Best-effort: don't crash the app if alerts can't be loaded
    }
  }, [getUserId]);

  const confirmAlert = useCallback(async (alertId: string) => {
    if (!alertEngineRef.current) return;
    await alertEngineRef.current.confirmAlert(alertId);
    await refreshAlerts();
  }, [refreshAlerts]);

  // Auto-refresh periódico cuando HC está disponible y permisos concedidos.
  // El intervalo es configurable (perfil_usuario.intervalo_sync_min, default 10 min)
  // con un mínimo de 60s para modo casi-tiempo-real (HU-25 CA-01).
  useEffect(() => {
    if (hcStatus === 'available' && permissionsGranted) {
      const intervalMs = Math.max(syncIntervalMin * 60_000, MIN_SYNC_INTERVAL_MS);
      autoRefreshRef.current = setInterval(() => {
        loadHealthData();
      }, intervalMs);
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };
  }, [hcStatus, permissionsGranted, syncIntervalMin, loadHealthData]);

  const value: HealthContextValue = {
    summary,
    hcStatus,
    loading,
    error,
    errorSeverity,
    permissionsGranted,
    lastSync,
    syncIntervalMin,
    setSyncInterval: setSyncIntervalMin,
    requestPermissionsAndLoad,
    refreshData,
    // HU-41: Alertas
    activeAlerts,
    activeAlertsCount: activeAlerts.filter(a => !a.leida_en).length,
    confirmAlert,
    refreshAlerts,
  };

  return <HealthContext.Provider value={value}>{children}</HealthContext.Provider>;
};

/**
 * Hook to access Health Connect context.
 */
export function useHealth(): HealthContextValue {
  const ctx = useContext(HealthContext);
  if (!ctx) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return ctx;
}
