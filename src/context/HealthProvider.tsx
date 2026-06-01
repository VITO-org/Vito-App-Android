import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type {HealthSummary, HealthConnectStatus} from '../types/health';
import {
  checkAvailability,
  requestPermissions,
  getHealthData,
  openHealthConnectStore,
  HealthModuleNotAvailableError,
} from '../services/VitoHealthNative';

interface HealthContextValue {
  /** Current health summary, null before first successful load. */
  summary: HealthSummary | null;
  /** Health Connect availability status. */
  hcStatus: HealthConnectStatus | null;
  /** True while loading data. */
  loading: boolean;
  /** Last error message, if any. */
  error: string | null;
  /** True if HC permissions have been granted. */
  permissionsGranted: boolean;
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
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  // Check Health Connect availability on mount
  useEffect(() => {
    (async () => {
      try {
        const status = await checkAvailability();
        setHcStatus(status);
      } catch (e) {
        if (e instanceof HealthModuleNotAvailableError) {
          setError('El módulo nativo de Health Connect no está disponible en esta plataforma.');
        } else {
          setError('Error al verificar disponibilidad de Health Connect.');
        }
        setHcStatus('unavailable');
      }
    })();
  }, []);

  const loadHealthData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHealthData();
      setSummary(data);
    } catch (e) {
      setError('Error al leer datos: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const requestPermissionsAndLoad = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await requestPermissions();
      if (result.granted || result.partiallyGranted) {
        setPermissionsGranted(true);
        await loadHealthData();
        if (result.partiallyGranted) {
          setError('Permisos parciales concedidos. Cargando datos disponibles...');
        }
      } else {
        setError('No se concedieron permisos. Habilítalos en Health Connect.');
        setPermissionsGranted(false);
      }
    } catch (e) {
      setError('Error al solicitar permisos: ' + (e as Error).message);
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

  const value: HealthContextValue = {
    summary,
    hcStatus,
    loading,
    error,
    permissionsGranted,
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
