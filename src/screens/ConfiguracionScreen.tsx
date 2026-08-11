import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Card from '../components/Card';
import StatusIndicator from '../components/StatusIndicator';
import {useHealth} from '../context/HealthProvider';
import {useSupabase} from '../context/SupabaseProvider';
import {colors, spacing, fontSize} from '../theme';
import {
  resolveSyncIntervalMin,
  MIN_SYNC_INTERVAL_MS,
} from '../services/healthSync';
import {
  updateSyncInterval,
  countConflictosRecientes,
  getUltimosConflictos,
  type ConflictoReciente,
} from '../services/supabase/api';
import type {RootStackParamList} from '../navigation/RootNavigator';

const MIN_INTERVALO_MIN = Math.ceil(MIN_SYNC_INTERVAL_MS / 60_000); // 1 min (60s)
const MAX_INTERVALO_MIN = 60;

/** "hace X min" / "hace X h" / "hace X d" — feedback reactivo de lastSync (CA-01). */
function formatHace(ts: Date): string {
  const diffMin = Math.max(0, Math.floor((Date.now() - ts.getTime()) / 60_000));
  if (diffMin < 1) return 'hace menos de 1 min';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHs = Math.floor(diffMin / 60);
  if (diffHs < 24) return `hace ${diffHs} h`;
  return `hace ${Math.floor(diffHs / 24)} d`;
}

/** Label corto del signo que fue reemplazado en un conflicto (CA-03). */
function signoLabel(c: ConflictoReciente): string {
  if (c.frec_cardiaca_bpm != null) return `Frec. cardíaca · ${c.frec_cardiaca_bpm} lpm`;
  if (c.bp_sistolica != null || c.bp_diastolica != null) {
    return `Presión · ${c.bp_sistolica ?? '--'}/${c.bp_diastolica ?? '--'}`;
  }
  if (c.spo2_pct != null) return `SpO₂ · ${c.spo2_pct}%`;
  if (c.temperatura != null) return `Temperatura · ${c.temperatura}°C`;
  return 'Registro manual';
}

function formatFecha(iso: string | null): string {
  if (!iso) return 'Fecha desconocida';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Fecha desconocida';
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Configuración — materializa visualmente los criterios de aceptación de la HU-25:
 * CA-01 (intervalo configurable + estado de última sync), CA-02 (detección de
 * conflictos) y CA-03 (prioridad wearable > manual).
 */
const ConfiguracionScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    syncIntervalMin,
    setSyncInterval,
    lastSync,
    hcStatus,
    error: healthError,
    errorSeverity,
  } = useHealth();
  const {session, getUserId} = useSupabase();

  const [intervalo, setIntervalo] = useState(() =>
    resolveSyncIntervalMin(syncIntervalMin),
  );
  const [savingIntervalo, setSavingIntervalo] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Conflictos (CA-02/CA-03): se refrescan al volver a la pantalla ──
  const [conflictos, setConflictos] = useState<number | null>(null);
  const [reemplazos, setReemplazos] = useState<ConflictoReciente[]>([]);
  const [cargandoConflictos, setCargandoConflictos] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const userId = getUserId();
      if (!userId) return;
      let activo = true;
      setCargandoConflictos(true);
      Promise.all([
        countConflictosRecientes(userId, 7, session?.access_token),
        getUltimosConflictos(userId, 5, session?.access_token),
      ])
        .then(([count, list]) => {
          if (!activo) return;
          setConflictos(count);
          setReemplazos(list);
        })
        .catch(() => {
          if (activo) setConflictos(null);
        })
        .finally(() => {
          if (activo) setCargandoConflictos(false);
        });
      return () => {
        activo = false;
      };
    }, [getUserId, session]),
  );

  // ── Persistir intervalo (CA-01): PATCH de una columna, no pisa el perfil ──
  const handleCambiarIntervalo = useCallback(
    async (delta: number) => {
      const nuevo = Math.min(
        MAX_INTERVALO_MIN,
        Math.max(MIN_INTERVALO_MIN, intervalo + delta),
      );
      setSaveError(null);
      const userId = getUserId();
      if (!userId) {
        setSaveError('Sesión no disponible. Reiniciá la app.');
        return;
      }
      setSavingIntervalo(true);
      setIntervalo(nuevo); // reflejo inmediato
      try {
        await updateSyncInterval(userId, nuevo, session?.access_token);
        setSyncInterval(nuevo); // el contexto re-crea el auto-refresh
      } catch {
        setIntervalo(prev => prev - delta); // revertir
        setSaveError('No se pudo guardar el intervalo. ¿Tenés internet?');
      } finally {
        setSavingIntervalo(false);
      }
    },
    [intervalo, getUserId, session, setSyncInterval],
  );

  // ── Badge de conexión (CA-01 estado) ──
  const online =
    hcStatus === 'available' && healthError == null && errorSeverity !== 'error';
  const badgeStatus = online ? 'ok' : healthError ? 'error' : 'alerta';
  const badgeLabel = online
    ? 'En línea'
    : hcStatus === 'unavailable'
      ? 'Health Connect no disponible'
      : hcStatus === 'update_required'
        ? 'Health Connect desactualizado'
        : 'Desconectado';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {/* Top bar: back + título */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Configuración</Text>
        <View style={styles.backButton} />
      </View>

      {/* ── Card 1: Intervalo de sincronización (CA-01) ── */}
      <Card>
        <Text style={styles.cardTitle}>Sincronización de datos</Text>
        <Text style={styles.cardSubtitle}>
          Tus datos se guardan automáticamente en tu historial.
        </Text>

        <View style={styles.intervalRow}>
          <TouchableOpacity
            style={[styles.stepperBtn, intervalo <= MIN_INTERVALO_MIN && styles.stepperBtnDisabled]}
            onPress={() => handleCambiarIntervalo(-1)}
            disabled={savingIntervalo || intervalo <= MIN_INTERVALO_MIN}
            testID="intervalo-menos">
            <Text style={styles.stepperBtnText}>−</Text>
          </TouchableOpacity>

          <View style={styles.intervalValueBox}>
            <Text style={styles.intervalValue}>{intervalo}</Text>
            <Text style={styles.intervalUnit}>
              {intervalo === 1 ? 'minuto' : 'minutos'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.stepperBtn, intervalo >= MAX_INTERVALO_MIN && styles.stepperBtnDisabled]}
            onPress={() => handleCambiarIntervalo(1)}
            disabled={savingIntervalo || intervalo >= MAX_INTERVALO_MIN}
            testID="intervalo-mas">
            <Text style={styles.stepperBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {savingIntervalo && (
          <ActivityIndicator size="small" color={colors.primary} style={styles.savingSpinner} />
        )}
        {saveError && <Text style={styles.errorText}>{saveError}</Text>}
      </Card>

      {/* ── Card 2: Estado de la sincronización (CA-01) ── */}
      <Card>
        <View style={styles.statusRow}>
          <View style={styles.statusInfo}>
            <Text style={styles.cardTitle}>Estado de la sincronización</Text>
            <Text style={styles.statusValue}>
              {lastSync ? `Última sincronización: ${formatHace(lastSync)}` : 'Nunca sincronizado'}
            </Text>
          </View>
          <View style={styles.badge}>
            <StatusIndicator status={badgeStatus} size={18} />
            <Text style={[styles.badgeText, {color: online ? colors.success : errorSeverity === 'error' ? colors.danger : colors.warning}]}>
              {badgeLabel}
            </Text>
          </View>
        </View>

        <View style={styles.autoSyncRow}>
          <StatusIndicator status="ok" size={16} />
          <Text style={styles.autoSyncText}>Sincronización automática: Activa</Text>
        </View>
      </Card>

      {/* ── Card 3: Conflictos entre fuentes (CA-02 + CA-03) ── */}
      <Card>
        <Text style={styles.cardTitle}>Conflictos entre fuentes</Text>
        <View style={styles.autoSyncRow}>
          <StatusIndicator status="ok" size={16} />
          <Text style={styles.autoSyncText}>Detección de conflictos: Activa</Text>
        </View>

        <Text style={styles.conflictCount}>
          {cargandoConflictos
            ? 'Calculando...'
            : conflictos == null
              ? 'No se pudo consultar'
              : `Conflictos resueltos en los últimos 7 días: ${conflictos}`}
        </Text>

        <Text style={styles.leyenda}>
          Cuando el wearable y el registro manual coinciden, gana el wearable. El registro
          manual queda guardado como reemplazado.
        </Text>

        {!cargandoConflictos && reemplazos.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Últimos reemplazos</Text>
            {reemplazos.map((r, i) => (
              <View key={r.id} style={[styles.reemplazoRow, i === reemplazos.length - 1 && styles.reemplazoRowLast]}>
                <View style={styles.reemplazoInfo}>
                  <Text style={styles.reemplazoSigno}>{signoLabel(r)}</Text>
                  <Text style={styles.reemplazoFecha}>{formatFecha(r.recorded_at)}</Text>
                </View>
                <StatusIndicator status="ok" size={16} />
              </View>
            ))}
          </>
        )}

        {!cargandoConflictos && conflictos === 0 && (
          <Text style={styles.emptyText}>Sin conflictos recientes.</Text>
        )}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.screenPaddingTop,
    paddingBottom: 40,
  },

  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 32,
    color: colors.textPrimary,
    fontWeight: '300',
  },
  screenTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // ── Cards ──
  cardTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginBottom: 14,
  },

  // ── Stepper intervalo ──
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 6,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.35,
  },
  stepperBtnText: {
    fontSize: 28,
    color: colors.primary,
    fontWeight: '600',
    lineHeight: 30,
  },
  intervalValueBox: {
    alignItems: 'center',
    minWidth: 72,
  },
  intervalValue: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  intervalUnit: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: fontSize.caption,
    color: colors.danger,
    marginTop: 8,
    textAlign: 'center',
  },
  savingSpinner: {
    marginTop: 8,
  },

  // ── Estado sync ──
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusInfo: {
    flex: 1,
    marginRight: 12,
  },
  statusValue: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: spacing.badgeBorderRadius,
    gap: 6,
  },
  badgeText: {
    fontSize: fontSize.badge,
    fontWeight: '600',
  },
  autoSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  autoSyncText: {
    fontSize: fontSize.caption,
    color: colors.textPrimary,
    fontWeight: '500',
  },

  // ── Conflictos ──
  conflictCount: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: 12,
  },
  leyenda: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 18,
  },
  subsectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 4,
  },
  reemplazoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  reemplazoRowLast: {
    borderBottomWidth: 0,
  },
  reemplazoInfo: {
    flex: 1,
    marginRight: 8,
  },
  reemplazoSigno: {
    fontSize: fontSize.body,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  reemplazoFecha: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 12,
  },
});

export default ConfiguracionScreen;
