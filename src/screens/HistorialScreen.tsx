import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, fontSize, spacing, shadows} from '../theme';
import Card from '../components/Card';
import {useSupabase} from '../context/SupabaseProvider';
import {getDatosReloj} from '../services/supabase/api';
import type {DatoReloj} from '../services/supabase/models';
import {NORMAL_RANGES} from '../data/mockReportes';

// ─── Tipos ───

type RootStackParamList = {
  MainTabs: undefined;
  DetalleSigno: {
    tipoSigno: string;
    label: string;
    unit: string;
    icon: string;
  };
};

type Periodo = '7d' | '30d' | '90d';

const PERIODOS: {key: Periodo; label: string; dias: number}[] = [
  {key: '7d', label: '7 días', dias: 7},
  {key: '30d', label: '30 días', dias: 30},
  {key: '90d', label: '90 días', dias: 90},
];

interface Resumen {
  frecCardiaca: {avg: number; min: number; max: number; count: number};
  sistolica: {avg: number; min: number; max: number; count: number};
  diastolica: {avg: number; min: number; max: number; count: number};
  spo2: {avg: number; min: number; max: number; count: number};
  temperatura: {avg: number; min: number; max: number; count: number};
  pasos: {avg: number; total: number; count: number};
  sueno: {avg: number; count: number};
}

function calcularResumen(datos: DatoReloj[]): Resumen {
  const acc = {
    fc: [] as number[],
    sist: [] as number[],
    diast: [] as number[],
    spo2: [] as number[],
    temp: [] as number[],
    pasos: [] as number[],
    sueno: [] as number[],
  };

  for (const d of datos) {
    if (d.frec_cardiaca_bpm != null) acc.fc.push(d.frec_cardiaca_bpm);
    if (d.bp_sistolica != null) acc.sist.push(d.bp_sistolica);
    if (d.bp_diastolica != null) acc.diast.push(d.bp_diastolica);
    if (d.spo2_pct != null) acc.spo2.push(d.spo2_pct);
    if (d.temperatura != null) acc.temp.push(d.temperatura);
    if (d.actividad_pasos != null) acc.pasos.push(d.actividad_pasos);
    if (d.horas_sueno != null) acc.sueno.push(d.horas_sueno);
  }

  const avg = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return {
    frecCardiaca: {
      avg: avg(acc.fc),
      min: acc.fc.length > 0 ? Math.min(...acc.fc) : 0,
      max: acc.fc.length > 0 ? Math.max(...acc.fc) : 0,
      count: acc.fc.length,
    },
    sistolica: {
      avg: avg(acc.sist),
      min: acc.sist.length > 0 ? Math.min(...acc.sist) : 0,
      max: acc.sist.length > 0 ? Math.max(...acc.sist) : 0,
      count: acc.sist.length,
    },
    diastolica: {
      avg: avg(acc.diast),
      min: acc.diast.length > 0 ? Math.min(...acc.diast) : 0,
      max: acc.diast.length > 0 ? Math.max(...acc.diast) : 0,
      count: acc.diast.length,
    },
    spo2: {
      avg: avg(acc.spo2),
      min: acc.spo2.length > 0 ? Math.min(...acc.spo2) : 0,
      max: acc.spo2.length > 0 ? Math.max(...acc.spo2) : 0,
      count: acc.spo2.length,
    },
    temperatura: {
      avg: avg(acc.temp),
      min: acc.temp.length > 0 ? Math.min(...acc.temp) : 0,
      max: acc.temp.length > 0 ? Math.max(...acc.temp) : 0,
      count: acc.temp.length,
    },
    pasos: {
      avg: avg(acc.pasos),
      total: acc.pasos.reduce((a, b) => a + b, 0),
      count: acc.pasos.length,
    },
    sueno: {
      avg: avg(acc.sueno),
      count: acc.sueno.length,
    },
  };
}

function formatearFecha(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);

  if (d.toDateString() === hoy.toDateString()) {
    return `Hoy ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  if (d.toDateString() === ayer.toDateString()) {
    return `Ayer ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── Screen ───

const HistorialScreen: React.FC = () => {
  const {getUserId} = useSupabase();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [periodo, setPeriodo] = useState<Periodo>('7d');
  const [loading, setLoading] = useState(true);
  const [datos, setDatos] = useState<DatoReloj[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      const userId = getUserId();
      if (!userId) {
        if (!cancelled) setLoading(false);
        return;
      }

      setLoading(true);
      const dias = PERIODOS.find(p => p.key === periodo)!.dias;
      const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

      try {
        const result = await getDatosReloj(userId, {
          from: desde.toISOString(),
          to: new Date().toISOString(),
          limit: 2000,
        });
        if (!cancelled) setDatos(result);
      } catch {
        if (!cancelled) setDatos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [periodo, getUserId]);

  const resumen = useCallback(() => calcularResumen(datos), [datos])();

  const ultimasLecturas = [...datos]
    .sort((a, b) => new Date(b.recorded_at ?? 0).getTime() - new Date(a.recorded_at ?? 0).getTime())
    .slice(0, 20);

  // ─── Render ───

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Historial</Text>
        <Text style={styles.subtitle}>
          {datos.length} lecturas registradas
        </Text>
      </View>

      {/* Selector de período */}
      <View style={styles.segmentRow}>
        {PERIODOS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.segment, periodo === p.key && styles.segmentActive]}
            onPress={() => setPeriodo(p.key)}>
            <Text style={[styles.segmentText, periodo === p.key && styles.segmentTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && (
        <Card>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando historial...</Text>
        </Card>
      )}

      {!loading && datos.length === 0 && (
        <Card>
          <Text style={styles.emptyText}>
            Aún no hay datos en este período.{'\n'}
            Los datos del reloj se sincronizan cada 10 minutos.
          </Text>
        </Card>
      )}

      {!loading && datos.length > 0 && (
        <>
          {/* Resumen de promedios */}
          <Text style={styles.sectionTitle}>Resumen del período</Text>
          <View style={styles.resumenGrid}>
            {/* Frecuencia cardíaca */}
            <TouchableOpacity
              style={styles.resumenCard}
              onPress={() =>
                navigation.navigate('DetalleSigno', {
                  tipoSigno: 'frecuencia_cardiaca',
                  label: 'Frecuencia cardíaca',
                  unit: 'lpm',
                  icon: '❤️',
                })
              }>
              <View style={[styles.iconCircle, {backgroundColor: colors.heartRed + '20'}]}>
                <Text style={styles.iconEmoji}>❤️</Text>
              </View>
              <Text style={styles.resumenValue}>
                {Math.round(resumen.frecCardiaca.avg)}
              </Text>
              <Text style={styles.resumenUnit}>lpm</Text>
              <Text style={styles.resumenLabel}>Frecuencia cardíaca</Text>
              <Text style={styles.resumenRange}>
                {Math.round(resumen.frecCardiaca.min)}-{Math.round(resumen.frecCardiaca.max)}
              </Text>
            </TouchableOpacity>

            {/* Presión sistólica */}
            <TouchableOpacity
              style={styles.resumenCard}
              onPress={() =>
                navigation.navigate('DetalleSigno', {
                  tipoSigno: 'presion_sistolica',
                  label: 'Presión sistólica',
                  unit: 'mmHg',
                  icon: '🫀',
                })
              }>
              <View style={[styles.iconCircle, {backgroundColor: colors.danger + '20'}]}>
                <Text style={styles.iconEmoji}>🫀</Text>
              </View>
              <Text style={styles.resumenValue}>
                {Math.round(resumen.sistolica.avg)}
              </Text>
              <Text style={styles.resumenUnit}>mmHg</Text>
              <Text style={styles.resumenLabel}>Sistólica</Text>
              <Text style={styles.resumenRange}>
                {Math.round(resumen.sistolica.min)}-{Math.round(resumen.sistolica.max)}
              </Text>
            </TouchableOpacity>

            {/* Presión diastólica */}
            <TouchableOpacity
              style={styles.resumenCard}
              onPress={() =>
                navigation.navigate('DetalleSigno', {
                  tipoSigno: 'presion_diastolica',
                  label: 'Presión diastólica',
                  unit: 'mmHg',
                  icon: '🫀',
                })
              }>
              <View style={[styles.iconCircle, {backgroundColor: colors.danger + '20'}]}>
                <Text style={styles.iconEmoji}>🫀</Text>
              </View>
              <Text style={styles.resumenValue}>
                {Math.round(resumen.diastolica.avg)}
              </Text>
              <Text style={styles.resumenUnit}>mmHg</Text>
              <Text style={styles.resumenLabel}>Diastólica</Text>
              <Text style={styles.resumenRange}>
                {Math.round(resumen.diastolica.min)}-{Math.round(resumen.diastolica.max)}
              </Text>
            </TouchableOpacity>

            {/* SPO2 */}
            <TouchableOpacity
              style={styles.resumenCard}
              onPress={() =>
                navigation.navigate('DetalleSigno', {
                  tipoSigno: 'saturacion_oxigeno',
                  label: 'Oxigenación',
                  unit: '%',
                  icon: '💧',
                })
              }>
              <View style={[styles.iconCircle, {backgroundColor: colors.oxygenBlue + '20'}]}>
                <Text style={styles.iconEmoji}>💧</Text>
              </View>
              <Text style={styles.resumenValue}>
                {resumen.spo2.avg.toFixed(1)}
              </Text>
              <Text style={styles.resumenUnit}>%</Text>
              <Text style={styles.resumenLabel}>Oxigenación</Text>
              <Text style={styles.resumenRange}>
                {resumen.spo2.min.toFixed(0)}-{resumen.spo2.max.toFixed(0)}
              </Text>
            </TouchableOpacity>

            {/* Temperatura */}
            <TouchableOpacity
              style={styles.resumenCard}
              onPress={() =>
                navigation.navigate('DetalleSigno', {
                  tipoSigno: 'temperatura',
                  label: 'Temperatura',
                  unit: '°C',
                  icon: '🌡️',
                })
              }>
              <View style={[styles.iconCircle, {backgroundColor: colors.tempRed + '20'}]}>
                <Text style={styles.iconEmoji}>🌡️</Text>
              </View>
              <Text style={styles.resumenValue}>
                {resumen.temperatura.avg.toFixed(1)}
              </Text>
              <Text style={styles.resumenUnit}>°C</Text>
              <Text style={styles.resumenLabel}>Temperatura</Text>
              <Text style={styles.resumenRange}>
                {resumen.temperatura.min.toFixed(1)}-{resumen.temperatura.max.toFixed(1)}
              </Text>
            </TouchableOpacity>

            {/* Pasos */}
            <View style={styles.resumenCard}>
              <View style={[styles.iconCircle, {backgroundColor: colors.primary + '20'}]}>
                <Text style={styles.iconEmoji}>👣</Text>
              </View>
              <Text style={styles.resumenValue}>
                {resumen.pasos.total.toLocaleString('es-ES')}
              </Text>
              <Text style={styles.resumenUnit}>total</Text>
              <Text style={styles.resumenLabel}>Pasos</Text>
              <Text style={styles.resumenRange}>
                Ø {Math.round(resumen.pasos.avg).toLocaleString('es-ES')}/día
              </Text>
            </View>

            {/* Sueño */}
            <View style={styles.resumenCard}>
              <View style={[styles.iconCircle, {backgroundColor: '#7C3AED20'}]}>
                <Text style={styles.iconEmoji}>😴</Text>
              </View>
              <Text style={styles.resumenValue}>
                {resumen.sueno.avg.toFixed(1)}
              </Text>
              <Text style={styles.resumenUnit}>h</Text>
              <Text style={styles.resumenLabel}>Sueño</Text>
              <Text style={styles.resumenRange}>
                {resumen.sueno.count} registros
              </Text>
            </View>
          </View>

          {/* Últimas lecturas */}
          <Text style={styles.sectionTitle}>Últimas lecturas</Text>
          <Card style={styles.lecturasCard}>
            {ultimasLecturas.map((lectura, i) => {
              const fecha = formatearFecha(lectura.recorded_at ?? '');
              const tieneFC = lectura.frec_cardiaca_bpm != null;
              const tieneBP = lectura.bp_sistolica != null && lectura.bp_diastolica != null;
              const tieneSPO2 = lectura.spo2_pct != null;
              const tieneTemp = lectura.temperatura != null;

              return (
                <TouchableOpacity
                  key={lectura.id}
                  style={[styles.lecturaRow, i < ultimasLecturas.length - 1 && styles.lecturaBorder]}
                  onPress={() => {
                    // Navegar al detalle del primer signo disponible
                    if (tieneFC) {
                      navigation.navigate('DetalleSigno', {
                        tipoSigno: 'frecuencia_cardiaca',
                        label: 'Frecuencia cardíaca',
                        unit: 'lpm',
                        icon: '❤️',
                      });
                    } else if (tieneBP) {
                      navigation.navigate('DetalleSigno', {
                        tipoSigno: 'presion_sistolica',
                        label: 'Presión arterial',
                        unit: 'mmHg',
                        icon: '🫀',
                      });
                    }
                  }}>
                  <View style={styles.lecturaLeft}>
                    <Text style={styles.lecturaFecha}>{fecha}</Text>
                    <View style={styles.lecturaMetrics}>
                      {tieneFC && (
                        <Text style={styles.lecturaMetric}>
                          ❤️ {lectura.frec_cardiaca_bpm} lpm
                        </Text>
                      )}
                      {tieneBP && (
                        <Text style={styles.lecturaMetric}>
                          🫀 {lectura.bp_sistolica}/{lectura.bp_diastolica}
                        </Text>
                      )}
                      {tieneSPO2 && (
                        <Text style={styles.lecturaMetric}>
                          💧 {lectura.spo2_pct}%
                        </Text>
                      )}
                      {tieneTemp && (
                        <Text style={styles.lecturaMetric}>
                          🌡️ {lectura.temperatura}°C
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text style={styles.lecturaArrow}>→</Text>
                </TouchableOpacity>
              );
            })}
          </Card>
        </>
      )}

      <View style={{height: 32}} />
    </ScrollView>
  );
};

// ─── Styles ───

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.screenPaddingTop,
  },

  // ── Header ──
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.subtitle,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // ── Selector de período ──
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: spacing.cardBorderRadius,
    padding: 4,
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 16,
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.surface,
  },

  // ── Estados ──
  loadingText: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
    lineHeight: 22,
  },

  // ── Resumen ──
  sectionTitle: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 14,
    marginTop: 4,
  },
  resumenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  resumenCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.cardBorderRadius,
    padding: 14,
    width: '48%',
    marginBottom: spacing.gridGap,
    ...shadows.card, // needs import
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconEmoji: {
    fontSize: 18,
  },
  resumenValue: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 30,
  },
  resumenUnit: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  resumenLabel: {
    fontSize: fontSize.metricLabel,
    color: colors.textSecondary,
    marginTop: 6,
  },
  resumenRange: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // ── Últimas lecturas ──
  lecturasCard: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  lecturaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: 14,
  },
  lecturaBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lecturaLeft: {
    flex: 1,
  },
  lecturaFecha: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  lecturaMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lecturaMetric: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  lecturaArrow: {
    fontSize: 18,
    color: colors.textSecondary,
    marginLeft: 8,
  },
});

export default HistorialScreen;