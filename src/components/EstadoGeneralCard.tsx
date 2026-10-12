import React, {useEffect, useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  Modal,
  LayoutAnimation,
  Platform,
  StyleSheet,
  UIManager,
} from 'react-native';
import {colors, spacing, fontSize, shadows} from '../theme';
import AppIcon from './AppIcon';
import {getEstadoGeneral, type EstadoGeneral} from '../utils/estadoGeneral';
import {
  alertIcon,
  cleanAlertTitle,
  formatAlertTime,
  getAlertValue,
  getComparacionAlerta,
  getUmbralLabel,
  getUmbralOnlyLabel,
  severityLabel,
  SEVERITY_COLORS,
} from '../utils/alertas';
import type {Alerta} from '../services/supabase/models';
import type {HealthSummary} from '../types/health';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface EstadoGeneralCardProps {
  alerts: Alerta[];
  summary: HealthSummary | null;
  lastSync: Date | null;
  onAlertPress?: (alert: Alerta) => void;
  onReview?: () => void;
  onMarkRead?: (alertId: string) => void | Promise<void>;
}

// ── Paleta semáforo ─────────────────────────────────────────────────
//  verde  → bien      (#2FAF7A / fondo #E6F4EC)
//  rojo   → critico   (#C62828 / fondo #FDECEC)
//  ámbar  → advertencia (#D97706 / fondo #FFF4E0)
//  gris   → sin-datos (#6B7280 / fondo #EEF2EF)

interface EstadoVisual {
  /** Color principal (texto del badge, punto, escudo) */
  color: string;
  /** Fondo del punto y del botón "Revisar" */
  bg: string;
  /** Emoji o símbolo del ícono principal */
  icon: string;
  /** Tipo de ícono a renderizar */
  iconType: 'check' | 'bang' | 'clock';
}

const VISUAL: Record<EstadoGeneral, EstadoVisual> = {
  bien: {
    color: colors.success,          // verde
    bg:    colors.surface,
    icon:  '✓',
    iconType: 'check',
  },
  revisar: {
    color: colors.critical,         // rojo #C62828
    bg:    '#FDECEC',
    icon:  '!',
    iconType: 'bang',
  },
  'requiere-atencion': {
    color: colors.warningStrong,    // ámbar #D97706
    bg:    '#FFF4E0',
    icon:  '!',
    iconType: 'bang',
  },
  'sin-datos': {
    color: colors.textSecondary,    // gris
    bg:    '#EEF2EF',
    icon:  '∟',
    iconType: 'clock',
  },
};

function coloresPorSeveridad(severidad: Alerta['severidad']) {
  if (severidad === 'critica') return SEVERITY_COLORS.danger;
  if (severidad === 'advertencia') return SEVERITY_COLORS.warning;
  return SEVERITY_COLORS.info;
}

/**
 * EstadoGeneralCard — tarjeta de estado general del dashboard.
 *
 * Implementa la misma lógica de EstadoGeneralCard.jsx (colapsable,
 * chips de resumen, lista desplegable) con 3 estados semáforo:
 *   🟢 Verde   — sin alertas activas
 *   🟡 Ámbar   — hay advertencias
 *   🔴 Rojo    — hay alertas críticas
 *
 * El título y el subtítulo se generan dinámicamente desde las alertas
 * reales (tipo y cantidad), nunca con texto inventado.
 */
const EstadoGeneralCard: React.FC<EstadoGeneralCardProps> = ({
  alerts,
  summary,
  lastSync,
  onAlertPress,
  onReview,
  onMarkRead,
}) => {
  const resultado = getEstadoGeneral({activeAlerts: alerts, summary, lastSync});
  const visual    = VISUAL[resultado.estado];
  const hasAlerts = alerts.length > 0;
  const alertZoneBg = resultado.estado === 'revisar' ? '#FFF7F7' : resultado.estado === 'requiere-atencion' ? colors.warningLight : colors.surface;
  const [expanded, setExpanded] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alerta | null>(null);
  const [pendingReopen, setPendingReopen] = useState<Alerta | null>(null);
  const navigation = useNavigation();

  useEffect(() => {
    const unsub = (navigation as any).addListener('focus', () => {
      setPendingReopen(prev => {
        if (prev) {
          const r = prev;
          setSelectedAlert(r);
          return null;
        }
        return prev;
      });
    });
    return unsub;
  }, [navigation]);

  // ── Render del ícono de estado ───────────────────────────────────
  const StatusIcon = () => {
    if (visual.iconType === 'check') {
      return (
        <View style={[styles.statusCircle, {backgroundColor: visual.color}]}>
          <Text style={styles.statusIconText}>✓</Text>
        </View>
      );
    }
    if (visual.iconType === 'bang') {
      return (
        <View style={[styles.statusCircle, {backgroundColor: visual.color}]}>
          <Text style={styles.bangIconText}>!</Text>
        </View>
      );
    }
    // clock (sin-datos)
    return (
      <View style={[styles.statusCircle, {backgroundColor: visual.bg}]}>
        <View style={styles.clockRing}>
          <Text style={[styles.clockHandsText, {color: visual.color}]}>∟</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.card, {backgroundColor: visual.bg}]}>
      {/*
       * ── Cabecera ────────────────────────────────────────────────────
       * Si hay alertas → navega directamente a la pantalla Alertas.
       * Si no → muestra el estado pero sin interacción.
       */}
      <Pressable
        onPress={hasAlerts ? onReview : undefined}
        accessibilityRole={hasAlerts ? 'button' : 'text'}
        accessibilityLabel={`Estado general: ${resultado.badgeLabel}. ${resultado.mensaje}`}
        style={({pressed}) => [
          styles.header,
          hasAlerts && pressed && styles.headerPressed,
        ]}>

        {/* Textos a la izquierda */}
        <View style={styles.headerText}>
          <Text style={styles.sectionLabel}>Estado general</Text>
          <Text style={[styles.badgeLabel, {color: visual.color}]}>
            {resultado.badgeLabel}
          </Text>
          <Text style={styles.mensaje}>{resultado.mensaje}</Text>
        </View>

        {/* Ícono de estado a la derecha */}
        <StatusIcon />
      </Pressable>

      {/* Última actualización */}
      {lastSync != null && (
        <Text style={styles.syncText}>
          Última actualización:{' '}
          {lastSync.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })}{' '}
          h
        </Text>
      )}

      {/*
       * ── Fila "Ver alertas" desplegable ──────────────────────────────
       * Tap alterna la lista expandida; ya no navega a Alertas.
       */}
      {hasAlerts && (
        <View style={[styles.alertZone, {backgroundColor: alertZoneBg}]}>
          <Pressable
            onPress={() => {
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
              );
              setExpanded(v => !v);
            }}
            style={({pressed}) => [
              styles.verAlertasRow,
              {borderTopColor: colors.border},
              pressed && styles.verAlertasPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Ocultar alertas' : 'Ver alertas'}
            accessibilityState={{expanded}}>
            <Text style={[styles.verAlertasText, {color: visual.color}]}>
              Ver alertas
            </Text>
            <Text style={[styles.verAlertasChevron, {color: visual.color}]}>
              {expanded ? '⌃' : '⌄'}
            </Text>
          </Pressable>
          {expanded && (
            <View style={styles.alertList}>
              {alerts.map((a, index) => {
                const sev = coloresPorSeveridad(a.severidad);
                const value = getAlertValue(a);
                const sevLabel = severityLabel(a.severidad);
                const comp = getComparacionAlerta(a);
                const a11yValue = comp != null ? `${comp.medido} / ${comp.limite}` : value;
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => setSelectedAlert(a)}
                    accessibilityRole="button"
                    accessibilityLabel={`Alerta ${cleanAlertTitle(a.titulo)}${a11yValue ? `: ${a11yValue}` : ''}`}
                    style={({pressed}) => [
                      styles.alertRow,
                      index > 0 && {
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: colors.border,
                      },
                      pressed && styles.verAlertasPressed,
                    ]}>
                    {a.severidad === 'critica' ? (
                      <View style={[styles.alertCritDot, {backgroundColor: sev.text}]}>
                        <Text style={styles.alertCritText}>!</Text>
                      </View>
                    ) : a.severidad === 'advertencia' ? (
                      <AppIcon name="advertencia" size={18} style={{marginRight: 8, tintColor: colors.warningStrong}} />
                    ) : (
                      <View style={[styles.alertSevDot, {backgroundColor: sev.text}]} />
                    )}
                    <View style={styles.alertTitleWrap}>
                      <Text style={styles.alertTitle} numberOfLines={2} ellipsizeMode="tail">
                        {cleanAlertTitle(a.titulo)}
                      </Text>
                    </View>
                    {(comp?.medido ?? value) !== '' && (
                      <View style={styles.alertRight}>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.alertMedidoBig,
                            {color: sev.text},
                          ]}>
                          {comp?.medido ?? value}
                        </Text>
                        {comp != null && (
                          <>
                            <Text
                              numberOfLines={1}
                              style={styles.alertSeparator}>
                              {'/'}
                            </Text>
                            <Text
                              numberOfLines={1}
                              style={styles.alertLimiteSmall}>
                              {comp.limite}
                            </Text>
                          </>
                        )}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      )}
      <Modal
        visible={selectedAlert != null}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedAlert(null)}>
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setSelectedAlert(null)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar detalle de alerta"
          />
          <View style={styles.modalSheet}>
            {selectedAlert != null && (() => {
              const sev = coloresPorSeveridad(selectedAlert.severidad);
              const title = cleanAlertTitle(selectedAlert.titulo);
              const value = getAlertValue(selectedAlert);
              const time = formatAlertTime(selectedAlert.created_at);
              const sevLabel = severityLabel(selectedAlert.severidad);
              const mensaje = (selectedAlert.mensaje ?? '').trim();
              const umbralOnly = getUmbralOnlyLabel(selectedAlert);
              const strippedMensaje =
                mensaje !== ''
                  ? mensaje.replace(/^FC\s+\d+\s*lpm\s*(\(.*?\)\.?\s*)?/i, '').trim()
                  : '';
              const detalle =
                umbralOnly ?? (strippedMensaje !== '' ? strippedMensaje : null);
              const rawTopDescripcion =
                (selectedAlert as unknown as {descripcion?: unknown})
                  .descripcion;
              const rawDatosDescripcion = selectedAlert.datos?.descripcion;
              const rawDescripcion =
                typeof rawTopDescripcion === 'string'
                  ? rawTopDescripcion
                  : rawDatosDescripcion;
              const descripcion =
                typeof rawDescripcion === 'string' &&
                rawDescripcion.trim() !== '' &&
                rawDescripcion.trim() !== detalle
                  ? rawDescripcion.trim()
                  : null;
              const rawOrigen = selectedAlert.datos?.dispositivo_origen;
              const origen =
                typeof rawOrigen === 'string' && rawOrigen.trim() !== ''
                  ? rawOrigen.trim()
                  : null;
              return (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalIcon}>
                      {alertIcon(selectedAlert.tipo)}
                    </Text>
                    {title !== '' && (
                      <Text style={styles.modalTitle}>{title}</Text>
                    )}
                    {onAlertPress != null && (
                      <TouchableOpacity
                        onPress={() => {
                          const a = selectedAlert;
                          if (!a) return;
                          setSelectedAlert(null);
                          setPendingReopen(a);
                          onAlertPress?.(a);
                        }}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: colors.backgroundLight,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Ver gráficos">
                        <AppIcon name="graficos" size={20} />
                      </TouchableOpacity>
                    )}
                  </View>
                  {(sevLabel != null || time !== '') && (
                    <View style={styles.modalMetaRow}>
                      {sevLabel != null && (
                        <View
                          style={[styles.modalChip, {backgroundColor: sev.bg}]}>
                          <Text style={[styles.modalChipText, {color: sev.text}]}>
                            {sevLabel}
                          </Text>
                        </View>
                      )}
                      {time !== '' && (
                        <Text style={styles.modalTime}>{time}</Text>
                      )}
                    </View>
                  )}
                  {value !== '' && (
                    <Text style={[styles.modalValue, {color: sev.text}]}>
                      {value}
                    </Text>
                  )}
                  {detalle != null && (
                    <Text style={styles.modalDetalle}>{detalle}</Text>
                  )}
                  {descripcion != null && (
                    <Text style={styles.modalDescripcion}>{descripcion}</Text>
                  )}
                  {origen != null && (
                    <Text style={styles.modalOrigen}>Origen: {origen}</Text>
                  )}
                  {selectedAlert.leida_en != null ? (
                    <Pressable
                      onPress={() => setSelectedAlert(null)}
                      style={({pressed}) => [
                        styles.modalCloseButton,
                        pressed && styles.verAlertasPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Cerrar">
                      <Text style={styles.modalCloseText}>Cerrar</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.modalButtonRow}>
                      <Pressable
                        onPress={() => setSelectedAlert(null)}
                        style={({pressed}) => [
                          styles.modalCloseButton,
                          styles.modalButtonFlex,
                          pressed && styles.verAlertasPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Cerrar">
                        <Text style={styles.modalCloseText}>Cerrar</Text>
                      </Pressable>
                      <Pressable
                        onPress={async () => {
                          await onMarkRead?.(selectedAlert.id);
                          setSelectedAlert(null);
                        }}
                        style={({pressed}) => [
                          styles.modalSecondaryButton,
                          styles.modalButtonFlex,
                          pressed && styles.verAlertasPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Marcar como leída">
                        <Text style={styles.modalSecondaryText}>
                          Marcar como leída
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ── Estilos ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.cardBorderRadius,
    padding: spacing.cardPadding,
    marginBottom: spacing.cardMarginBottom,
    ...shadows.card,
  },

  // Cabecera
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerPressed: {
    opacity: 0.75,
  },

  // Ícono de estado (círculo izquierdo)
  statusCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInnerCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
  },
  bangIconText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
  },
  clockRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockHandsText: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: -2,
    marginLeft: 3,
  },

  // Textos izquierda
  headerText: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  badgeLabel: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 1,
  },
  mensaje: {
    fontSize: fontSize.metricLabel,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Flecha de navegación (reemplaza al chevron de expandir)
  navArrow: {
    fontSize: 26,
    fontWeight: '300',
    paddingHorizontal: 4,
    marginLeft: 2,
  },

  // Última actualización
  syncText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 8,
  },

  // Zona desplegable "Ver alertas" — fondo más claro que la card, ancho completo
  alertZone: {
    marginTop: 12,
    marginHorizontal: -spacing.cardPadding,
    paddingHorizontal: spacing.cardPadding,
    marginBottom: -spacing.cardPadding,
    paddingBottom: spacing.cardPadding,
    borderBottomLeftRadius: spacing.cardBorderRadius,
    borderBottomRightRadius: spacing.cardBorderRadius,
  },
  // Fila "Ver alertas" — siempre visible al pie cuando hay alertas
  verAlertasRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 0,
    paddingTop: 12,
    borderTopWidth: 1,
    backgroundColor: 'transparent',
  },
  verAlertasPressed: {
    opacity: 0.7,
  },
  verAlertasText: {
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  verAlertasChevron: {
    fontSize: 22,
    fontWeight: '300',
  },
  alertList: {
    marginTop: 8,
  },
  alertRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  alertTitleWrap: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    marginRight: 8,
  },
  alertTitle: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    fontWeight: '400',
    textAlign: 'left',
    flexShrink: 1,
  },
  alertRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    flexShrink: 0,
    maxWidth: '52%',
  },
  alertMedidoBig: {
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 0,
  },
  alertSeparator: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
    flexShrink: 0,
    marginHorizontal: 2,
  },
  alertLimiteSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
    flexShrink: 0,
  },
  alertSevDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
    alignSelf: 'center',
  },
  alertCritDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 8,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertCritText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
    textAlign: 'center',
  },
  // Modal detalle de alerta — bottom-sheet
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.cardPadding,
    maxHeight: '80%',
    ...shadows.card,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '400',
    color: colors.textPrimary,
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  modalChip: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  modalChipText: {
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  modalTime: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  modalValue: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
  },
  modalDetalle: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    fontWeight: '400',
    marginTop: 8,
  },
  modalDescripcion: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    marginTop: 6,
  },
  modalOrigen: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 6,
  },
  modalCloseButton: {
    marginTop: 16,
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  modalButtonFlex: {
    flex: 1,
    marginTop: 0,
  },
  modalSecondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSecondaryText: {
    color: colors.primaryDark,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  modalCloseText: {
    color: colors.surface,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
});

export default EstadoGeneralCard;
