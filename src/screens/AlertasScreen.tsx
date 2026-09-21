import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl} from 'react-native';
import Card from '../components/Card';
import {colors, spacing, fontSize} from '../theme';
import {useHealth} from '../context/HealthProvider';
import {useSupabase} from '../context/SupabaseProvider';
import type {Alerta, SuggestionRecord} from '../services/supabase/models';
import {getSuggestions, marcarSuggestionLeida, marcarSuggestionHecha} from '../services/supabase/api';

type SectionId = 'alertas' | 'sugerencias';
type FilterId = 'todas' | 'no-leidas' | 'leidas';

const SECTIONS: {id: SectionId; label: string; icon: string}[] = [
  {id: 'alertas', label: 'Alertas', icon: '🔔'},
  {id: 'sugerencias', label: 'Sugerencias', icon: '💡'},
];

const FILTERS: {id: FilterId; label: string}[] = [
  {id: 'todas', label: 'Todas'},
  {id: 'no-leidas', label: 'Sin leer'},
  {id: 'leidas', label: 'Leídas'},
];

// ── Helpers ──

function isAlertRead(alert: Alerta): boolean {
  return alert.leida_en !== null;
}

function isSuggestionRead(s: SuggestionRecord): boolean {
  return s.leida_en !== null;
}

function isSuggestionDone(s: SuggestionRecord): boolean {
  return s.hecha_en !== null;
}

function severityToColorKey(severidad: Alerta['severidad']): 'danger' | 'warning' | 'info' {
  if (severidad === 'critica') return 'danger';
  if (severidad === 'advertencia') return 'warning';
  return 'info';
}

function alertIcon(tipo: Alerta['tipo']): string {
  switch (tipo) {
    case 'hipoxia': return '\uD83E\uDEC1';
    case 'hipertension': return '\u26A0\uFE0F';
    case 'hipotension': return '\u2B07\uFE0F';
    default: return '\uD83D\uDD14';
  }
}

function formatTime(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours}h`;
  return date.toLocaleDateString('es-AR', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
}

function alertDescription(alert: Alerta): string {
  const parts: string[] = [];
  if (alert.mensaje) parts.push(alert.mensaje);
  if (alert.datos && typeof alert.datos === 'object') {
    const datos = alert.datos as Record<string, unknown>;
    if (datos.escalada === true) parts.push('Escalada al guardia');
  }
  return parts.join(' · ');
}

function suggestionPriorityColor(prioridad: string): {bg: string; fg: string} {
  if (prioridad === 'Alta') return {bg: colors.dangerLight, fg: colors.danger};
  if (prioridad === 'Media') return {bg: colors.warningLight, fg: colors.warning};
  return {bg: colors.successLight, fg: colors.success};
}

const SEVERITY_COLORS: Record<'danger' | 'warning' | 'info', {bg: string; dot: string}> = {
  danger: {bg: colors.dangerLight, dot: colors.danger},
  warning: {bg: colors.warningLight, dot: colors.warning},
  info: {bg: colors.surface, dot: colors.textSecondary},
};

// ── Component ──

const AlertasScreen: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionId>('alertas');
  const [activeFilter, setActiveFilter] = useState<FilterId>('todas');
  const [refreshing, setRefreshing] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionRecord[]>([]);
  const {activeAlerts, refreshAlerts, confirmAlert} = useHealth();
  const supabaseCtx = useSupabase();
  const uid = supabaseCtx?.session?.user?.id ?? null;

  const loadSuggestions = useCallback(async () => {
    if (!uid) return;
    try {
      const data = await getSuggestions(uid);
      setSuggestions(data);
    } catch (e) {
      console.log('[AlertasScreen] Error loading suggestions:', e);
    }
  }, [uid]);

  useEffect(() => {
    refreshAlerts();
    loadSuggestions();
  }, [refreshAlerts, loadSuggestions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshAlerts(), loadSuggestions()]);
    setRefreshing(false);
  }, [refreshAlerts, loadSuggestions]);

  // ── Filtrado ──

  const filteredAlerts = activeAlerts.filter(a => {
    const read = isAlertRead(a);
    if (activeFilter === 'no-leidas') return !read;
    if (activeFilter === 'leidas') return read;
    return true;
  });

  const filteredSuggestions = suggestions.filter(s => {
    if (isSuggestionDone(s)) return false; // Las hechas no se muestran
    const read = isSuggestionRead(s);
    if (activeFilter === 'no-leidas') return !read;
    if (activeFilter === 'leidas') return read;
    return true;
  });

  const alertCount = filteredAlerts.length;
  const suggestionCount = filteredSuggestions.length;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <Text style={styles.title}>Centro de Notificaciones</Text>

      {/* Section selector: Alertas / Sugerencias */}
      <View style={styles.sectionRow}>
        {SECTIONS.map(sec => {
          const count = sec.id === 'alertas' ? alertCount : suggestionCount;
          return (
            <TouchableOpacity
              key={sec.id}
              onPress={() => { setActiveSection(sec.id); setActiveFilter('todas'); }}
              style={[styles.sectionTab, activeSection === sec.id && styles.sectionTabActive]}>
              <Text style={styles.sectionIcon}>{sec.icon}</Text>
              <Text style={[styles.sectionLabel, activeSection === sec.id && styles.sectionLabelActive]}>
                {sec.label}
              </Text>
              {count > 0 && (
                <View style={[styles.sectionBadge, activeSection === sec.id && styles.sectionBadgeActive]}>
                  <Text style={[styles.sectionBadgeText, activeSection === sec.id && styles.sectionBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            onPress={() => setActiveFilter(f.id)}
            style={[styles.filterTab, activeFilter === f.id && styles.filterTabActive]}>
            <Text style={[styles.filterText, activeFilter === f.id && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }>

        {/* ── ALERTAS ── */}
        {activeSection === 'alertas' && (
          <>
            {filteredAlerts.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🔔</Text>
                <Text style={styles.emptyText}>No hay alertas {activeFilter === 'no-leidas' ? 'sin leer' : activeFilter === 'leidas' ? 'leídas' : 'activas'}</Text>
              </View>
            )}
            {filteredAlerts.map(alert => {
              const colorKey = severityToColorKey(alert.severidad);
              const sev = SEVERITY_COLORS[colorKey];
              const read = isAlertRead(alert);
              return (
                <Card key={alert.id} style={styles.alertCard as any}>
                  <View style={[styles.alertRow, {borderLeftColor: sev.dot, borderLeftWidth: 3, paddingLeft: 12}]}>
                    <View style={[styles.alertIcon, {backgroundColor: sev.bg}]}>
                      <Text style={styles.alertEmoji}>{alertIcon(alert.tipo)}</Text>
                    </View>
                    <View style={styles.alertBody}>
                      <View style={styles.alertHeaderRow}>
                        <Text style={styles.alertTitle}>{alert.titulo}</Text>
                        <View style={[styles.severityBadge, {backgroundColor: sev.bg}]}>
                          <Text style={[styles.severityText, {color: sev.dot}]}>
                            {alert.severidad === 'critica' ? 'Crítica' : alert.severidad === 'advertencia' ? 'Advertencia' : 'Info'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.alertTime}>{formatTime(alert.created_at)}</Text>
                      <Text style={styles.alertDesc}>{alertDescription(alert)}</Text>
                      {alert.datos && typeof alert.datos === 'object' && (alert.datos as Record<string, unknown>).escalada === true && (
                        <Text style={styles.escalatedBadge}>⬆ Escalada</Text>
                      )}
                    </View>
                    {!read && <View style={[styles.unreadDot, {backgroundColor: sev.dot}]} />}
                  </View>
                  {!read && (
                    <TouchableOpacity style={styles.confirmButton} onPress={() => confirmAlert(alert.id)}>
                      <Text style={styles.confirmButtonText}>Marcar como leída</Text>
                    </TouchableOpacity>
                  )}
                </Card>
              );
            })}
          </>
        )}

        {/* ── SUGERENCIAS ── */}
        {activeSection === 'sugerencias' && (
          <>
            {filteredSuggestions.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>💡</Text>
                <Text style={styles.emptyText}>No hay sugerencias {activeFilter === 'no-leidas' ? 'sin leer' : activeFilter === 'leidas' ? 'leídas' : 'activas'}</Text>
              </View>
            )}
            {filteredSuggestions.map(sug => {
              const pri = suggestionPriorityColor(sug.prioridad);
              const read = isSuggestionRead(sug);
              const recordedAt = (sug.datos as Record<string, unknown>)?.recordedAt as string | undefined;
              return (
                <Card key={sug.id} style={[styles.suggestionCard, read && styles.suggestionCardRead] as any}>
                  <View style={[styles.suggestionRow, {borderLeftColor: pri.fg, borderLeftWidth: 3, paddingLeft: 12}]}>
                    <Text style={styles.suggestionIcon}>{sug.icon || '💡'}</Text>
                    <View style={styles.suggestionBody}>
                      <View style={styles.suggestionHeaderRow}>
                        <Text style={styles.suggestionTitle}>{sug.titulo}</Text>
                        <View style={[styles.priorityBadge, {backgroundColor: pri.bg}]}>
                          <Text style={[styles.priorityText, {color: pri.fg}]}>{sug.prioridad}</Text>
                        </View>
                      </View>
                      {sug.motivo && <Text style={styles.suggestionMotivo}>{sug.motivo}</Text>}
                      {recordedAt && (
                        <Text style={styles.suggestionTime}>{formatTime(recordedAt)}</Text>
                      )}
                    </View>
                    {!read && <View style={[styles.unreadDot, {backgroundColor: pri.fg}]} />}
                  </View>
                  {sug.acciones && sug.acciones.length > 0 && (
                    <View style={styles.suggestionActions}>
                      {sug.acciones.slice(0, 2).map((a, i) => (
                        <Text key={i} style={styles.suggestionAction}>• {a}</Text>
                      ))}
                    </View>
                  )}
                  <View style={styles.suggestionButtons}>
                    {!read && (
                      <TouchableOpacity
                        style={styles.suggestionBtn}
                        onPress={async () => {
                          await marcarSuggestionLeida(sug.id);
                          setSuggestions(prev => prev.map(s => s.id === sug.id ? {...s, leida_en: new Date().toISOString()} : s));
                        }}>
                        <Text style={styles.suggestionBtnText}>Marcar leída</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.suggestionBtn, styles.suggestionBtnDone]}
                      onPress={async () => {
                        await marcarSuggestionHecha(sug.id);
                        setSuggestions(prev => prev.map(s => s.id === sug.id ? {...s, hecha_en: new Date().toISOString()} : s));
                      }}>
                      <Text style={[styles.suggestionBtnText, styles.suggestionBtnDoneText]}>Hecha</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })}
          </>
        )}

        <View style={{height: 24}} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.screenPaddingTop,
    paddingBottom: 12,
  },

  // ── Section selector ──
  sectionRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPaddingHorizontal,
    gap: 10,
    marginBottom: 12,
  },
  sectionTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    gap: 6,
  },
  sectionTabActive: {
    backgroundColor: colors.primary,
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionLabel: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sectionLabelActive: {
    color: '#FFFFFF',
  },
  sectionBadge: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  sectionBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sectionBadgeTextActive: {
    color: '#FFFFFF',
  },

  // ── Filter tabs ──
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPaddingHorizontal,
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  filterTabActive: {
    backgroundColor: colors.primarySoft,
  },
  filterText: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.primary,
  },

  // ── List ──
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
  },

  // ── Alert card ──
  alertCard: {
    padding: 16,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertEmoji: {
    fontSize: 18,
  },
  alertBody: {
    flex: 1,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertTitle: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  alertTime: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  alertDesc: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  escalatedBadge: {
    fontSize: fontSize.caption,
    color: colors.danger,
    fontWeight: '600',
    marginTop: 4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },

  // ── Suggestion card ──
  suggestionCard: {
    padding: 16,
  },
  suggestionCardRead: {
    opacity: 0.7,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  suggestionIcon: {
    fontSize: 24,
  },
  suggestionBody: {
    flex: 1,
  },
  suggestionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionTitle: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  suggestionMotivo: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  suggestionTime: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  suggestionActions: {
    marginTop: 8,
    paddingLeft: 12,
  },
  suggestionAction: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  suggestionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  suggestionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionBtnText: {
    fontSize: fontSize.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  suggestionBtnDone: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  suggestionBtnDoneText: {
    color: colors.success,
  },

  // ── Confirm button (alerts) ──
  confirmButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmButtonText: {
    fontSize: fontSize.caption,
    color: colors.primary,
    fontWeight: '600',
  },

  // ── Empty state ──
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 48,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyText: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
  },
});

export default AlertasScreen;
