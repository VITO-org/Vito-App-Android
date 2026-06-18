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
import {insertDatoReloj, upsertDatosClinicosConfig} from '../services/supabase/api';
import type {DatoRelojInsert} from '../services/supabase/models';
import {saveHealthSnapshot, pruneOldEntries} from '../services/HealthDataCache';

type ErrorSeverity = 'error' | 'warning';

const AUTO_REFRESH_INTERVAL_MS = 600_000; // 10 minutos

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
  /** Request permissions and load data. */
  requestPermissionsAndLoad: () => Promise<void>;
  /** Refresh health data (requires permissions already granted). */
  refreshData: () => Promise<void>;
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
  const {getUserId} = useSupabase();

  // Referencia para el intervalo de auto-refresh
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    try {
      const data = await getHealthData();
      setSummary(data);
      setLastSync(new Date());

      // Guardar en caché local (AsyncStorage) como respaldo para el historial
      saveHealthSnapshot(data).catch(() => {});
      // Podar entradas viejas 1 vez al día (lo ejecutamos pero ignoramos error)
      pruneOldEntries(60).catch(() => {});

      // Sincronizar automáticamente con Supabase (datos_reloj)
      const userId = getUserId();
      if (userId) {
        try {
          const redondear = (v: number | null): number | null =>
            v != null ? Math.round(v) : null;

          // Asegurar que datos_clinicos_config tiene fila por si existe
          // un trigger en datos_reloj que la referencia (workaround error 23505)
          try {
            await upsertDatosClinicosConfig({id_usuario: userId});
          } catch {
            // ignorar error del upsert preparatorio
          }

          const lectura: DatoRelojInsert = {
            id_usuario: userId,
            bp_sistolica: redondear(data.bloodPressureSystolic),
            bp_diastolica: redondear(data.bloodPressureDiastolic),
            frec_cardiaca_bpm: redondear(data.averageBpm),
            spo2_pct: data.spo2Percent ?? null,
            temperatura: data.bodyTemperatureCelsius ?? null,
            nivel_estres: null,
            actividad_pasos: redondear(data.steps),
            horas_sueno: data.sleepMinutes != null ? data.sleepMinutes / 60 : null,
            recorded_at: new Date().toISOString(),
          };
          await insertDatoReloj(lectura);
        } catch (syncErr) {
          // No bloquear la UI si falla la sincronización
          console.warn('HealthProvider: error al sincronizar con datos_reloj', syncErr);
        }
      }
    } catch (e) {
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

  // Auto-refresh periódico cuando HC está disponible y permisos concedidos
  useEffect(() => {
    if (hcStatus === 'available' && permissionsGranted) {
      // Iniciar intervalo
      autoRefreshRef.current = setInterval(() => {
        loadHealthData();
      }, AUTO_REFRESH_INTERVAL_MS);
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };
  }, [hcStatus, permissionsGranted, loadHealthData]);

  const value: HealthContextValue = {
    summary,
    hcStatus,
    loading,
    error,
    errorSeverity,
    permissionsGranted,
    lastSync,
    requestPermissionsAndLoad,
    refreshData,
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
