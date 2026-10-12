import React, {useEffect, useCallback, useState} from 'react';
import {View, Text, FlatList, StyleSheet, TouchableOpacity, Dimensions} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useHealth} from '../context/HealthProvider';
import {useSupabase} from '../context/SupabaseProvider';
import Card from '../components/Card';
import VitalSignCard from '../components/VitalSignCard';
import PrimaryButton from '../components/PrimaryButton';
import AppIcon, {type AppIconName} from '../components/AppIcon';
import VitoAvatar from '../components/VitoAvatar';
import StatusIndicator from '../components/StatusIndicator';
import EstadoGeneralCard from '../components/EstadoGeneralCard';
import {colors, spacing, fontSize, shadows} from '../theme';
import {buildSignosFromSummary, getMetricasBienestar} from '../utils/signosVitales';
import type {Alerta} from '../services/supabase/models';


type RootStackParamList = {
  MainTabs: undefined;
  DetalleSigno: {
    tipoSigno: string;
    label: string;
    unit: string;
    icon: string;
  };
  TodosLosSignos: undefined;
  RegistrarSintoma: undefined;
  HistorialSintomas: undefined;
};

/**
 * FIX SCRUM-191 (BUG HU-37): mapea tipo de alerta → params de DetalleSigno
 * para que el tap en el banner abra el detalle del evento que la generó (CA-03).
 */
function destinoPorTipoAlerta(alertType: Alerta['tipo']): {
  tipoSigno: string;
  label: string;
  unit: string;
  icon: string;
} {
  switch (alertType) {
    case 'hipoxia':
      return {tipoSigno: 'saturacion_oxigeno', label: 'Saturación de oxígeno', unit: '%', icon: '🩸'};
    case 'hipertension':
    case 'hipotension':
      return {tipoSigno: 'presion_sistolica', label: 'Presión arterial', unit: 'mmHg', icon: '❤️'};
    case 'taquicardia':
    case 'bradicardia':
    default:
      return {tipoSigno: 'frecuencia_cardiaca', label: 'Frecuencia cardíaca', unit: 'lpm', icon: '💓'};
  }
}

/**
 * Dashboard principal — pantalla de inicio de VITO.
 *
 * Muestra datos reales de Health Connect cuando están disponibles,
 * con fallback a datos mock cuando no.
 */
const InicioScreen: React.FC = () => {
  const {
    summary,
    loading,
    error,
    errorSeverity,
    hcStatus,
    permissionsGranted,
    lastSync,
    requestPermissionsAndLoad,
    refreshData,
    activeAlerts,
    confirmAlert,
    refreshAlerts,
  } = useHealth();
  const {session, profile} = useSupabase();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } finally {
      setRefreshing(false);
    }
  }, [refreshData]);

  // FIX SCRUM-191 (BUG HU-37): el banner quedaba deshabilitado porque no se
  // pasaba onAlertPress. Ahora el tap navega al detalle del evento (CA-03).
  const handleAlertPress = useCallback(
    (alert: Alerta) => {
      const destino = destinoPorTipoAlerta(alert.tipo);
      navigation.navigate('DetalleSigno', destino);
    },
    [navigation],
  );

  const userName = profile?.nombre
    ? profile.nombre
    : session?.user?.email?.split('@')[0] ?? 'Usuario';

  // Gestión automática de Health Connect:
  // - Si HC disponible y sin permisos → solicitar permisos + cargar datos
  // - Si HC disponible y permisos concedidos pero sin datos → cargar datos
  useEffect(() => {
    if (hcStatus === 'available' && !loading && !error) {
      if (!permissionsGranted) {
        requestPermissionsAndLoad();
      } else if (!summary) {
        refreshData();
      }
    }
  }, [hcStatus, permissionsGranted, loading, error, summary, requestPermissionsAndLoad, refreshData]);

  // Red de seguridad: al volver al dashboard, refrescar alertas
  // (la push server-side no pasa por el motor local).
  useFocusEffect(
    useCallback(() => {
      refreshAlerts();
    }, [refreshAlerts]),
  );

  // Construir vitals desde la fuente única de datos
  const allSignos = buildSignosFromSummary(summary, lastSync);

  // Estado general dinámico (Fase 2): solo activas (leida_en === null).
  const alertasActivas = (activeAlerts ?? []).filter(a => a.leida_en === null);
  const unreadCount = alertasActivas.length;

  // InicioScreen: solo signos vitales (excluye bienestar),
  // combina sistólica+diastólica en un solo card "Presión arterial"
  const bienestarIds = new Set(['pasos', 'calorias', 'distancia', 'sueno']);
  const vitals = allSignos
    .filter(s => !bienestarIds.has(s.id) && s.id !== 'presion_diastolica')
    .map(s => {
      if (s.id === 'presion_sistolica') {
        // Combinar sistólica + diastólica en "120/80"
        const diast = allSignos.find(s2 => s2.id === 'presion_diastolica');
        const combinedValue =
          s.rawValue != null && diast?.rawValue != null
            ? `${Math.round(s.rawValue)}/${Math.round(diast.rawValue)}`
            : '--/--';
        return {
          id: s.id,
          label: 'Presión arterial',
          value: combinedValue,
          unit: s.unit,
          icon: s.icon,
          iconName: s.iconName,
          iconSize: s.iconSize,
          iconBgColor: s.iconBgColor,
          trend: s.trend ?? 'stable',
        };
      }
      return {
        id: s.id,
        label: s.label,
        value: s.value,
        unit: s.unit,
        icon: s.icon,
        iconName: s.iconName,
        iconSize: s.iconSize,
        iconBgColor: s.iconBgColor,
        trend: s.trend ?? 'stable',
      };
    });

  return (
    <FlatList
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshing={refreshing}
      onRefresh={onRefresh}
      data={[{}]}
      keyExtractor={() => 'content'}
      renderItem={() => (
      <>
      {/* ── Header: saludo + notificaciones ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <VitoAvatar size={40} />
          <View style={styles.headerText}>
            <Text style={styles.greeting}>¡Hola, {userName}!</Text>
            <Text style={styles.subtitle}>Tu bienestar, monitoreado</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.notifButton}
          onPress={() => navigation.navigate('Alertas' as any)}
          accessibilityLabel="Ver alertas">
          <AppIcon name="alertas" size={20} />
          {unreadCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>
                {unreadCount > 9 ? '9+' : `${unreadCount}`}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Card Estado General (siempre visible, dinámico según los 4 estados) ── */}
      <EstadoGeneralCard
        alerts={alertasActivas}
        summary={summary}
        lastSync={lastSync}
        onAlertPress={handleAlertPress}
        onMarkRead={(id) => confirmAlert(id)}
        onReview={() =>
          navigation.navigate(
            (alertasActivas.length > 0 ? 'Alertas' : 'TodosLosSignos') as any,
          )
        }
      />

      {/* ── Estado Health Connect ── */}
      {hcStatus === 'unavailable' && (
        <Card style={styles.warningCard}>
          <Text style={styles.warningTitle}>Health Connect no disponible</Text>
          <Text style={styles.warningText}>
            Instalá Google Health Connect desde Play Store para ver tus datos reales.
          </Text>
        </Card>
      )}

      {hcStatus === 'update_required' && (
        <Card style={styles.warningCard}>
          <Text style={styles.warningTitle}>Health Connect desactualizado</Text>
          <Text style={styles.warningText}>
            Actualizá Health Connect desde Play Store.
          </Text>
        </Card>
      )}

      {error && (
        <Card
          style={[
            styles.warningCard,
            ...(errorSeverity === 'error' ? [styles.errorCard] : []),
          ]}>
          <Text style={styles.warningTitle}>
            {errorSeverity === 'error' ? 'Error' : 'Aviso'}
          </Text>
          <Text style={styles.warningText}>{error}</Text>
          {hcStatus === 'available' && !loading && (
            <PrimaryButton
              variant="secondary"
              title="Conceder permisos"
              onPress={requestPermissionsAndLoad}
              style={{marginTop: 8}}
            />
          )}
        </Card>
      )}

      {/* ── Resumen del día (4 métricas de bienestar) ── */}
      <Text style={styles.resumenTitle}>Resumen del día</Text>
      <View style={styles.daySummaryGrid}>
        {getMetricasBienestar(allSignos).map(s => (
          <View key={s.id} style={styles.daySummaryCard}>
            {s.iconName ? (
              <View style={[styles.daySummaryIconCircle, {backgroundColor: s.iconBgColor + '20'}]}>
                <AppIcon name={s.iconName as AppIconName} size={s.iconSize ?? 26} />
              </View>
            ) : (
              <Text style={styles.daySummaryIcon}>{s.icon}</Text>
            )}
            {/* Fix distancia: unidad siempre visible inline, nunca número pelado. Sin 'm' fantasma cuando value '--' (unit=''). Sueño usa value2/unit2 ("9" "h" "50" "m") en un solo renglón. */}
            <Text
              style={styles.daySummaryValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}>
              {s.value}
              {s.unit ? <Text style={styles.daySummaryUnit}> {s.unit}</Text> : null}
              {s.value2 ? <Text> {s.value2}</Text> : null}
              {s.unit2 ? <Text style={styles.daySummaryUnit}> {s.unit2}</Text> : null}
            </Text>
            <Text style={styles.daySummaryLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Síntomas: registrar + consultar en la misma sección ── */}
      <Text style={styles.sectionTitle}>Síntomas</Text>
      <View style={styles.sintomasSection}>
        <TouchableOpacity
          style={[styles.sintomaBtn, styles.sintomaRow]}
          onPress={() => navigation.navigate('RegistrarSintoma')}
          activeOpacity={0.8}>
          <Text style={styles.sintomaBtnIcon}>🩺</Text>
          <View style={styles.sintomaBtnInfo}>
            <Text style={styles.sintomaBtnTitle}>Registrar Síntoma</Text>
            <Text style={styles.sintomaBtnSubtitle}>¿Sentís algo? Registralo acá</Text>
          </View>
          <Text style={styles.sintomaBtnArrow}>›</Text>
        </TouchableOpacity>
        <View style={styles.sintomaDivider} />
        <TouchableOpacity
          style={[styles.sintomaBtn, styles.sintomaRow]}
          onPress={() => navigation.navigate('HistorialSintomas')}
          activeOpacity={0.8}>
          <Text style={styles.sintomaBtnIcon}>📋</Text>
          <View style={styles.sintomaBtnInfo}>
            <Text style={styles.sintomaBtnTitle}>Consultar Síntomas</Text>
            <Text style={styles.sintomaBtnSubtitle}>Historial para mostrar a tu médico</Text>
          </View>
          <Text style={styles.sintomaBtnArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ── Signos Vitales ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Signos vitales</Text>
        <View style={styles.sectionActions}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={refreshData}
            disabled={loading}>
            <AppIcon
              name="recargar"
              size={20}
              style={[
                {tintColor: colors.success},
                loading ? {opacity: 0.5} : undefined,
              ]}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('TodosLosSignos')}>
            <Text style={styles.seeAll}>Ver todos</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Grid de signos vitales ── */}
      <View style={styles.vitalsGrid}>
        {vitals.map((v, i) => (
          <VitalSignCard
            key={i}
            {...v}
            onPress={() => navigation.navigate('DetalleSigno', {
              tipoSigno: v.id,
              label: v.label,
              unit: v.unit || '',
              icon: v.icon,
            })}
          />
        ))}
      </View>

      {!permissionsGranted && hcStatus === 'available' && !loading && !error && (
        <Card>
          <Text style={styles.hcText}>Conectá con Health Connect para ver tus datos reales.</Text>
          <PrimaryButton
            title="Conectar Health Connect"
            onPress={requestPermissionsAndLoad}
            style={{marginTop: 8}}
          />
        </Card>
      )}

      {/* ── Última Actividad ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Última actividad</Text>
      </View>

      {(() => {
        if (!lastSync) {
          return (
            <Card>
              <View style={styles.activityRow}>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>Sin actividad registrada</Text>
                  <Text style={styles.activityTime}>
                    {loading
                      ? 'Cargando datos...'
                      : 'Conectá Health Connect para ver tu actividad'}
                  </Text>
                </View>
              </View>
            </Card>
          );
        }

        const items: {title: string; detail: string; iconName?: AppIconName}[] = [
          {
            title: 'Sincronización Health Connect',
            detail: lastSync.toLocaleDateString('es-ES', {
              weekday: 'long',
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
        ];

        if (summary) {
          if (summary.steps > 0) {
            items.push({
              iconName: 'pasos',
              title: 'Pasos registrados',
              detail: `${summary.steps.toLocaleString('es-ES')} pasos`,
            });
          }
          if (summary.caloriesKcal > 0) {
            items.push({
              iconName: 'calorias',
              title: 'Calorías quemadas',
              detail: `${summary.caloriesKcal.toFixed(0)} kcal`,
            });
          }
          if (summary.distanceMeters > 0) {
            items.push({
              iconName: 'distancia',
              title: 'Distancia recorrida',
              detail:
                summary.distanceMeters >= 1000
                  ? `${(summary.distanceMeters / 1000).toFixed(2)} km`
                  : `${summary.distanceMeters.toFixed(0)} m`,
            });
          }
          if (summary.sleepMinutes > 0) {
            items.push({
              iconName: 'sueno',
              title: 'Sueño registrado',
              detail: `${Math.floor(summary.sleepMinutes / 60)}h ${summary.sleepMinutes % 60}m`,
            });
          }
          if (summary.averageBpm != null) {
            items.push({
              title: '❤️ Frecuencia cardíaca',
              detail: `${Math.round(summary.averageBpm)} lpm promedio`,
            });
          }
        }

        return (
          <Card>
            {items.map((item, i) => (
              <View
                key={i}
                style={[styles.activityRow, i === items.length - 1 && styles.activityRowLast]}>
                {item.iconName ? (
                  <View style={[styles.activityIconCircle, {backgroundColor: (allSignos.find(s => s.id === item.iconName)?.iconBgColor || '#ccc') + '20'}]}>
                    <AppIcon name={item.iconName} size={18} />
                  </View>
                ) : null}
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>{item.title}</Text>
                  <Text style={styles.activityTime}>{item.detail}</Text>
                </View>
                {i === 0 && (
                  <StatusIndicator status="ok" size={20} />
                )}
              </View>
            ))}
          </Card>
        );
      })()}

      <View style={{height: 24}} />
      </>
    )}
  />
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.screenPaddingTop,
    paddingBottom: 100,
  },

  // ── Header (compacto mockup) ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {},
  greeting: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.subtitle,
    color: colors.textSecondary,
    marginTop: 2,
  },
  notifButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifIcon: {
    fontSize: 20,
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.critical,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.surface,
  },

  // ── Signos Vitales ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  seeAll: {
    fontSize: fontSize.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  // ── Warning / Error ──
  warningCard: {
    backgroundColor: colors.warningLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  errorCard: {
    backgroundColor: colors.dangerLight,
    borderLeftColor: colors.danger,
  },
  warningTitle: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  warningText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },

  // ── Resumen del día ──
  resumenTitle: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 4,
  },
  daySummaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  daySummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.cardBorderRadius,
    padding: 12,
    width: '23%',
    alignItems: 'center',
  },
  daySummaryIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  daySummaryIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  daySummaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  daySummaryUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  daySummaryLabel: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  hcText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginVertical: 1,
  },

  // ── Síntomas (sección única) ──
  sintomasSection: {
    backgroundColor: colors.surface,
    borderRadius: spacing.cardBorderRadius,
    padding: spacing.cardPadding,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sintomaDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  sintomaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: spacing.cardBorderRadius,
    padding: spacing.cardPadding,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  // Fila dentro de la sección: sin caja ni sombra propia
  // (anula ...shadows.card heredado de sintomaBtn).
  sintomaRow: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    marginBottom: 0,
    paddingVertical: 8,
    paddingHorizontal: 0,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: {width: 0, height: 0},
  },
  sintomaBtnIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  sintomaBtnInfo: {
    flex: 1,
  },
  sintomaBtnTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sintomaBtnSubtitle: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sintomaBtnArrow: {
    fontSize: 28,
    fontWeight: '300',
    color: colors.textSecondary,
  },

  // ── Última Actividad ──
  activityIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  activityRowLast: {
    borderBottomWidth: 0,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: fontSize.body,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  activityTime: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default InicioScreen;
