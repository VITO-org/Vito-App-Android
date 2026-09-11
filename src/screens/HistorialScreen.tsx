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
import AppIcon from '../components/AppIcon';
import FlechaIcon from '../components/FlechaIcon';
import {useSupabase} from '../context/SupabaseProvider';
import {useHealth} from '../context/HealthProvider';
import {getDatosReloj} from '../services/supabase/api';
import {getDailyAveragesForRange, type DailyAverages} from '../services/HealthDataCache';
import type {DatosReloj} from '../services/supabase/models';
import type {HealthSummary} from '../types/health';
import {NORMAL_RANGES} from '../data/mockReportes';
import {buildSignosFromResumen, type Resumen} from '../utils/signosVitales';

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

function calcularResumen(datos: DatosReloj[]): Resumen {
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
  const {summary: healthSummary} = useHealth();

  const [periodo, setPeriodo] = useState<Periodo>('7d');
  const [loading, setLoading] = useState(true);
  const [datos, setDatos] = useState<DatosReloj[]>([]);
  const [cacheDays, setCacheDays] = useState<{date: string; averages: DailyAverages}[]>([]);
  const [usingCache, setUsingCache] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      const userId = getUserId();
      if (!userId) {
        if (!cancelled) setLoading(false);
        return;
      }

      setLoading(true);
      setUsingCache(false);
      const dias = PERIODOS.find(p => p.key === periodo)!.dias;
      const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

      // 1️⃣ Intentar desde Supabase (datos_reloj)
      let dbData: DatosReloj[] = [];
      try {
        const result = await getDatosReloj(userId, {
          from: desde.toISOString(),
          to: new Date().toISOString(),
          limit: 2000,
        });
        dbData = result;
      } catch {
        dbData = [];
      }

      // 2️⃣ Si no hay datos en la DB, usar caché local (AsyncStorage)
      if (dbData.length === 0) {
        const cachedDays = await getDailyAveragesForRange(desde, new Date());
        if (!cancelled) {
          setCacheDays(cachedDays);
          setDatos([]);
          setUsingCache(cachedDays.length > 0);
          setLoading(false);
        }
      } else {
        if (!cancelled) {
          setDatos(dbData);
          setCacheDays([]);
          setUsingCache(false);
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [periodo, getUserId]);

  // ─── Resumen desde DB ───
  const resumenBD = useCallback(() => calcularResumen(datos), [datos])();

  // ─── Resumen desde caché local ───
  const resumenCache = useCallback((): Resumen | null => {
    if (cacheDays.length === 0 && !healthSummary) return null;

    const allDays = [...cacheDays];

    // Agregar hoy desde useHealth() si hay datos
    if (healthSummary) {
      const avg = (v: number | null): number =>
        v != null ? v : 0;

      // Ver si ya existe entrada de hoy en cacheDays
      const hoy = new Date();
      const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
      const existeHoy = allDays.some(d => d.date === hoyStr);
      if (!existeHoy) {
        // Crear un "día virtual" con el HealthSummary actual
        allDays.push({
          date: hoyStr,
          averages: {
            steps: avg(healthSummary.steps),
            caloriesKcal: avg(healthSummary.caloriesKcal),
            distanceMeters: avg(healthSummary.distanceMeters),
            sleepMinutes: avg(healthSummary.sleepMinutes),
            averageBpm: healthSummary.averageBpm,
            bloodPressureSystolic: healthSummary.bloodPressureSystolic,
            bloodPressureDiastolic: healthSummary.bloodPressureDiastolic,
            spo2Percent: healthSummary.spo2Percent,
            bodyTemperatureCelsius: healthSummary.bodyTemperatureCelsius,
            count: 1,
          },
        });
      }
    }

    if (allDays.length === 0) return null;

    // Agregar todos los días
    const n = allDays.length;

    const sumMetric = (key: keyof DailyAverages): number =>
      allDays.reduce((acc, d) => {
        const v = d.averages[key];
        return acc + (typeof v === 'number' ? v : 0);
      }, 0);

    const avgMetric = (key: keyof DailyAverages): number =>
      sumMetric(key) / n;

    // Para valores que pueden ser null, sacar el promedio no-nulo
    const avgNullable = (key: keyof DailyAverages): number => {
      const valid = allDays.filter(d => d.averages[key] != null);
      if (valid.length === 0) return 0;
      return valid.reduce((acc, d) => acc + (d.averages[key] as number), 0) / valid.length;
    };

    // Encontrar máximos/mínimos por cada métrica (de los promedios diarios)
    const minOf = (key: keyof DailyAverages): number => {
      const vals = allDays.map(d => d.averages[key]).filter((v): v is number => v != null);
      return vals.length > 0 ? Math.min(...vals) : 0;
    };
    const maxOf = (key: keyof DailyAverages): number => {
      const vals = allDays.map(d => d.averages[key]).filter((v): v is number => v != null);
      return vals.length > 0 ? Math.max(...vals) : 0;
    };

    return {
      frecCardiaca: {
        avg: avgNullable('averageBpm'),
        min: minOf('averageBpm'),
        max: maxOf('averageBpm'),
        count: allDays.filter(d => d.averages.averageBpm != null).length,
      },
      sistolica: {
        avg: avgNullable('bloodPressureSystolic'),
        min: minOf('bloodPressureSystolic'),
        max: maxOf('bloodPressureSystolic'),
        count: allDays.filter(d => d.averages.bloodPressureSystolic != null).length,
      },
      diastolica: {
        avg: avgNullable('bloodPressureDiastolic'),
        min: minOf('bloodPressureDiastolic'),
        max: maxOf('bloodPressureDiastolic'),
        count: allDays.filter(d => d.averages.bloodPressureDiastolic != null).length,
      },
      spo2: {
        avg: avgNullable('spo2Percent'),
        min: minOf('spo2Percent'),
        max: maxOf('spo2Percent'),
        count: allDays.filter(d => d.averages.spo2Percent != null).length,
      },
      temperatura: {
        avg: avgNullable('bodyTemperatureCelsius'),
        min: minOf('bodyTemperatureCelsius'),
        max: maxOf('bodyTemperatureCelsius'),
        count: allDays.filter(d => d.averages.bodyTemperatureCelsius != null).length,
      },
      pasos: {
        avg: avgNullable('steps'),
        total: Math.round(sumMetric('steps')),
        count: allDays.filter(d => d.averages.steps > 0).length,
      },
      sueno: {
        avg: avgNullable('sleepMinutes') / 60, // convertir a horas
        count: allDays.filter(d => d.averages.sleepMinutes > 0).length,
      },
    };
  }, [cacheDays, healthSummary])();

  const resumen = usingCache && resumenCache ? resumenCache : resumenBD;

  const historialSignos = buildSignosFromResumen(resumen);

  // ─── Últimas lecturas ───
  // Si hay datos de DB, mostrar individuales; si no, mostrar promedios diarios del caché
  const ultimasLecturas: DatosReloj[] = datos.length > 0
    ? [...datos]
        .sort((a, b) => new Date(b.recorded_at ?? 0).getTime() - new Date(a.recorded_at ?? 0).getTime())
        .slice(0, 20)
    : cacheDays.length > 0
      ? [...cacheDays]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 20)
          .map(d => ({
            id: `cache_${d.date}`,
            id_usuario: '',
            bp_sistolica: d.averages.bloodPressureSystolic ? Math.round(d.averages.bloodPressureSystolic) : null,
            bp_diastolica: d.averages.bloodPressureDiastolic ? Math.round(d.averages.bloodPressureDiastolic) : null,
            frec_cardiaca_bpm: d.averages.averageBpm ? Math.round(d.averages.averageBpm) : null,
            spo2_pct: d.averages.spo2Percent ? Math.round(d.averages.spo2Percent) : null,
            temperatura: d.averages.bodyTemperatureCelsius,
            nivel_estres: null,
            actividad_pasos: d.averages.steps ? Math.round(d.averages.steps) : null,
            horas_sueno: d.averages.sleepMinutes > 0 ? d.averages.sleepMinutes / 60 : null,
            sospechoso: null,
            recorded_at: d.date + 'T12:00:00',
          }))
      : [];

  // ─── Render ───

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Historial</Text>
        <Text style={styles.subtitle}>
          {usingCache
            ? `${cacheDays.length} días con datos (caché local)`
            : `${datos.length} lecturas registradas`}
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

      {!loading && datos.length === 0 && cacheDays.length === 0 && (
        <Card>
          <Text style={styles.emptyText}>
            Aún no hay datos en este período.{'\n'}
            Los datos del reloj se sincronizan cada 10 minutos.{'\n\n'}
            💡 Abrí la pantalla de inicio para forzar una lectura
            desde Health Connect.
          </Text>
        </Card>
      )}

      {!loading && (datos.length > 0 || cacheDays.length > 0) && (
        <>
          {/* Resumen de promedios */}
          <Text style={styles.sectionTitle}>Resumen del período</Text>
          <View style={styles.resumenGrid}>
            {historialSignos.map(signo => {
              const tieneDetalle = !['pasos', 'sueno'].includes(signo.id);
              const content = (
                <>
                  <View style={[styles.iconCircle, {backgroundColor: signo.iconBgColor + '20'}]}>
                    <AppIcon name={signo.iconName!} size={signo.iconSize!} />
                  </View>
                  <Text style={styles.resumenValue}>{signo.value}</Text>
                  <Text style={styles.resumenUnit}>{signo.unit}</Text>
                  <Text style={styles.resumenLabel}>{signo.label}</Text>
                  <Text style={styles.resumenRange}>{signo.rangeLabel}</Text>
                </>
              );
              return tieneDetalle ? (
                <TouchableOpacity
                  key={signo.id}
                  style={styles.resumenCard}
                  onPress={() =>
                    navigation.navigate('DetalleSigno', {
                      tipoSigno: signo.id,
                      label: signo.label,
                      unit: signo.unit,
                      icon: signo.iconName ?? signo.icon,
                    })
                  }>
                  {content}
                </TouchableOpacity>
              ) : (
                <View key={signo.id} style={styles.resumenCard}>
                  {content}
                </View>
              );
            })}
          </View>

          {/* Últimas lecturas / Resumen diario */}
          <Text style={styles.sectionTitle}>
            {usingCache ? 'Resumen diario' : 'Últimas lecturas'}
          </Text>
          <Card style={styles.lecturasCard}>
            {usingCache && (
              <View style={styles.cacheTag}>
                <Text style={styles.cacheTagText}>
                  📱 Datos locales — los promedios diarios se acumulan al usar la app
                </Text>
              </View>
            )}
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
                  <FlechaIcon direction="right" size={16} color={colors.textSecondary} />
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
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
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

  // ── Cache tag ──
  cacheTag: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cacheTagText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

export default HistorialScreen;