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
} from '../services/supabase/api';
import {
  syncWearableToBackend,
  DEFAULT_SYNC_INTERVAL_MIN,
  MIN_SYNC_INTERVAL_MS,
} from '../services/healthSync';
import {saveHealthSnapshot, pruneOldEntries} from '../services/HealthDataCache';

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
  const [syncIntervalMin, setSyncIntervalMin] = useState(DEFAULT_SYNC_INTERVAL_MIN);
  const {getUserId} = useSupabase();

  // Referencia para el intervalo de auto-refresh
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

      // Sincronizar automáticamente con Supabase (datos_reloj) — motor central HU-25
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
        // Fuente de escritura (Supabase) caída: no bloquear la UI; reintenta en el próximo tick
        console.warn('HealthProvider: error al sincronizar con datos_reloj', syncErr);
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
