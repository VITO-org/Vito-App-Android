import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Card from '../components/Card';
import StatusIndicator from '../components/StatusIndicator';
import {useHealth} from '../context/HealthProvider';
import {useSupabase} from '../context/SupabaseProvider';
import {useNotifications} from '../context/NotificationsProvider';
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

/** Opciones discretas del selector desplegable de intervalo (CA-01). */
const OPCIONES_MINUTOS = [1, 2, 3, 5, 10, 15, 30, 45, 60];

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
 * Título de sección con botón de ayuda (¡ en un círculo gris, del tamaño del
 * texto). Al tocarlo, abre un pop-up (Modal) que explica qué hace la sección.
 */
const TituloConInfo: React.FC<{
  titulo: string;
  textoAyuda: string;
  notaAyuda?: string;
}> = ({titulo, textoAyuda, notaAyuda}) => {
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <View style={styles.tituloRow}>
        <Text style={styles.cardTitle}>{titulo}</Text>
        <TouchableOpacity
          onPress={() => setVisible(true)}
          style={styles.infoBtn}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Text style={styles.infoIcon}>!</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}>
        <TouchableOpacity
          style={styles.popupOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}>
          <View style={styles.popupBox}>
            <Text style={styles.popupTitle}>{titulo}</Text>
            <Text style={styles.popupText}>{textoAyuda}</Text>
            {notaAyuda ? <Text style={styles.popupNote}>{notaAyuda}</Text> : null}
            <TouchableOpacity
              style={styles.popupClose}
              onPress={() => setVisible(false)}>
              <Text style={styles.popupCloseText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

/**
 * Configuración — materializa visualmente los criterios de aceptación de la HU-25:
 * CA-01 (intervalo configurable con selector desplegable + estado de última sync
 * agrupado en la misma card de sincronización), CA-02 (detección de conflictos)
 * y CA-03 (prioridad wearable > manual).
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
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [savingIntervalo, setSavingIntervalo] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Si el valor persistido no está en las opciones discretas, se muestra igual
  // (y se agrega como opción marcada al selector).
  const opciones =
    OPCIONES_MINUTOS.includes(intervalo)
      ? OPCIONES_MINUTOS
      : [...OPCIONES_MINUTOS, intervalo].sort((a, b) => a - b);

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

  const {preferences: notifPrefs, updatePreferences: updateNotifPrefs, loading: notifLoading} = useNotifications();

  // ── Persistir intervalo (CA-01): PATCH de una columna, no pisa el perfil ──
  const handleSeleccionarIntervalo = useCallback(
    async (nuevo: number) => {
      const clamped = Math.min(MAX_INTERVALO_MIN, Math.max(MIN_INTERVALO_MIN, nuevo));
      setSelectorVisible(false);
      setSaveError(null);
      const userId = getUserId();
      if (!userId) {
        setSaveError('Sesión no disponible. Reiniciá la app.');
        return;
      }
      setSavingIntervalo(true);
      setIntervalo(clamped); // reflejo inmediato
      try {
        await updateSyncInterval(userId, clamped, session?.access_token);
        setSyncInterval(clamped); // el contexto re-crea el auto-refresh
      } catch {
        setIntervalo(intervalo); // revertir al valor previo
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

      {/* ── Card Sincronización (CA-01): intervalo + estado agrupados ── */}
      <Card>
        <TituloConInfo
          titulo="Sincronización"
          textoAyuda="Elegí cada cuánto se sincronizan tus datos: ese intervalo define cuándo se actualiza el estado de la última sincronización."
        />

        {/* Sub-sección 1: Intervalo (selector desplegable) */}
        <Text style={styles.sectionTitle}>Intervalo de sincronización</Text>
        <TouchableOpacity
          style={styles.dropdownBtn}
          onPress={() => setSelectorVisible(true)}
          disabled={savingIntervalo}
          testID="selector-intervalo">
          <Text style={styles.dropdownLabel}>Sincronizar cada</Text>
          <View style={styles.dropdownValueRow}>
            <Text style={styles.dropdownValue}>
              {intervalo} {intervalo === 1 ? 'minuto' : 'minutos'}
            </Text>
            <Text style={styles.dropdownChevron}>▼</Text>
          </View>
        </TouchableOpacity>
        {savingIntervalo && (
          <ActivityIndicator size="small" color={colors.primary} style={styles.savingSpinner} />
        )}
        {saveError && <Text style={styles.errorText}>{saveError}</Text>}

        <View style={styles.sectionDivider} />

        {/* Sub-sección 2: Estado */}
        <Text style={styles.sectionTitle}>Estado de la sincronización</Text>
        <View style={styles.statusRow}>
          <View style={styles.statusInfo}>
            <Text style={styles.statusValue}>
              {lastSync
                ? `Última sincronización: ${formatHace(lastSync)}`
                : 'Nunca sincronizado'}
            </Text>
          </View>
          <View style={styles.badge}>
            <StatusIndicator status={badgeStatus} size={18} />
            <Text
              style={[
                styles.badgeText,
                {
                  color: online
                    ? colors.success
                    : errorSeverity === 'error'
                      ? colors.danger
                      : colors.warning,
                },
              ]}>
              {badgeLabel}
            </Text>
          </View>
        </View>

        <View style={styles.autoSyncRow}>
          <StatusIndicator status="ok" size={16} />
          <Text style={styles.autoSyncText}>Sincronización automática: Activa</Text>
        </View>
      </Card>

      {/* ── Card Conflictos entre fuentes (CA-02 + CA-03) ── */}
      <Card>
        <TituloConInfo
          titulo="Conflictos entre fuentes"
          textoAyuda="Cuando el wearable y el registro manual coinciden, gana el wearable. El registro manual queda guardado como reemplazado."
          notaAyuda="En esta sección se muestran los registros de los conflictos de los últimos 7 días."
        />
        <View style={styles.autoSyncRow}>
          <StatusIndicator status="ok" size={16} />
          <Text style={styles.autoSyncText}>Detección de conflictos: Activa</Text>
        </View>

        {!cargandoConflictos && reemplazos.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Últimos reemplazos</Text>
            {reemplazos.map((r, i) => (
              <View
                key={r.id}
                style={[
                  styles.reemplazoRow,
                  i === reemplazos.length - 1 && styles.reemplazoRowLast,
                ]}>
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

      {/* ── Card Notificaciones Push ── */}
      <Card>
        <TituloConInfo
          titulo="Notificaciones"
          textoAyuda="Configurá cómo recibís las alertas de salud cuando la app está en segundo plano o cerrada."
        />

        <View style={styles.notifRow}>
          <View style={styles.notifInfo}>
            <Text style={styles.notifLabel}>Notificaciones push</Text>
            <Text style={styles.notifDesc}>Recibir alertas en tu dispositivo</Text>
          </View>
          <TouchableOpacity
            style={[styles.toggleBtn, notifPrefs.push_habilitado && styles.toggleActive]}
            onPress={() => updateNotifPrefs({push_habilitado: !notifPrefs.push_habilitado})}
            disabled={notifLoading}>
            <Text style={[styles.toggleText, notifPrefs.push_habilitado && styles.toggleTextActive]}>
              {notifPrefs.push_habilitado ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionDivider} />

        <View style={styles.notifRow}>
          <View style={styles.notifInfo}>
            <Text style={styles.notifLabel}>Alertas críticas</Text>
            <Text style={styles.notifDesc}>SpO₂ baja, presión fuera de rango, FC anormal</Text>
          </View>
          <TouchableOpacity
            style={[styles.toggleBtn, notifPrefs.alertas_criticas && styles.toggleActive]}
            onPress={() => updateNotifPrefs({alertas_criticas: !notifPrefs.alertas_criticas})}
            disabled={notifLoading || !notifPrefs.push_habilitado}>
            <Text style={[styles.toggleText, notifPrefs.alertas_criticas && styles.toggleTextActive]}>
              {notifPrefs.alertas_criticas ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionDivider} />

        <View style={styles.notifRow}>
          <View style={styles.notifInfo}>
            <Text style={styles.notifLabel}>Información de salud</Text>
            <Text style={styles.notifDesc}>Resúmenes y recordatorios</Text>
          </View>
          <TouchableOpacity
            style={[styles.toggleBtn, notifPrefs.alertas_info && styles.toggleActive]}
            onPress={() => updateNotifPrefs({alertas_info: !notifPrefs.alertas_info})}
            disabled={notifLoading || !notifPrefs.push_habilitado}>
            <Text style={[styles.toggleText, notifPrefs.alertas_info && styles.toggleTextActive]}>
              {notifPrefs.alertas_info ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* ── Selector desplegable de intervalo (Modal nativo, patrón RegistrarSintoma) ── */}
      <Modal
        visible={selectorVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectorVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Sincronizar cada</Text>
            {opciones.map(opcion => {
              const seleccionada = opcion === intervalo;
              return (
                <TouchableOpacity
                  key={opcion}
                  style={[
                    styles.modalOption,
                    seleccionada && styles.modalOptionSelected,
                  ]}
                  onPress={() => handleSeleccionarIntervalo(opcion)}>
                  <Text
                    style={[
                      styles.modalOptionText,
                      seleccionada && styles.modalOptionTextSelected,
                    ]}>
                    {opcion} {opcion === 1 ? 'minuto' : 'minutos'}
                  </Text>
                  {seleccionada && <Text style={styles.modalCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setSelectorVisible(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  // ── Card ──
  tituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoBtn: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIcon: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    lineHeight: 9,
  },
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
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 18,
  },

  // ── Selector desplegable de intervalo ──
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownLabel: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
  },
  dropdownValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownValue: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  dropdownChevron: {
    fontSize: 10,
    color: colors.primary,
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

  // ── Modal selector ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: 20,
    paddingBottom: 28,
  },
  modalTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalOptionSelected: {
    backgroundColor: colors.successLight,
  },
  modalOptionText: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  modalOptionTextSelected: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  modalCheck: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.success,
  },
  modalCancel: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  // ── Pop-up de ayuda (¡) ──
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  popupBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    maxWidth: 320,
    alignSelf: 'stretch',
  },
  popupTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  popupText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  popupNote: {
    fontSize: fontSize.caption,
    fontStyle: 'italic',
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 8,
  },
  popupClose: {
    marginTop: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  popupCloseText: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.primary,
  },

  // ── Notificaciones ──
  notifRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  notifInfo: {
    flex: 1,
    marginRight: 12,
  },
  notifLabel: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  notifDesc: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
});

export default ConfiguracionScreen;
