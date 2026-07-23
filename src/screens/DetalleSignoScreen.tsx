import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {LineChart} from 'react-native-gifted-charts';
import {colors, fontSize, spacing} from '../theme';
import Card from '../components/Card';
import FlechaIcon from '../components/FlechaIcon';
import ResumenEstadistico from '../components/ResumenEstadistico';
import {useSupabase} from '../context/SupabaseProvider';
import {getDatosReloj, getBaseline} from '../services/supabase/api';
import type {DatoReloj, BaselineClinico} from '../services/supabase/models';
import {getDailyAveragesForRange} from '../services/HealthDataCache';
import {
  VistaReporte,
  TipoSignoVital,
  NORMAL_RANGES,
} from '../data/mockReportes';

type RootStackParamList = {
  MainTabs: undefined;
  DetalleSigno: {
    tipoSigno: string;
    label: string;
    unit: string;
    icon: string;
  };
};

type Props = NativeStackScreenProps<RootStackParamList, 'DetalleSigno'>;

const VISTAS: {key: VistaReporte; label: string}[] = [
  {key: 'daily', label: 'Diario'},
  {key: 'weekly', label: 'Semanal'},
  {key: 'monthly', label: 'Mensual'},
];

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Extrae el valor numérico de un DatoReloj según el tipo de signo vital. */
function extraerValor(dato: DatoReloj, tipo: TipoSignoVital): number | null {
  switch (tipo) {
    case 'frecuencia_cardiaca': return dato.frec_cardiaca_bpm;
    case 'presion_sistolica':   return dato.bp_sistolica;
    case 'presion_diastolica':  return dato.bp_diastolica;
    case 'saturacion_oxigeno':  return dato.spo2_pct;
    case 'temperatura':         return dato.temperatura;
  }
}

/** Extrae el valor del cache local según el tipo de signo vital. */
function extraerValorCache(
  avg: {averageBpm: number | null; bloodPressureSystolic: number | null; bloodPressureDiastolic: number | null; spo2Percent: number | null; bodyTemperatureCelsius: number | null},
  tipo: TipoSignoVital,
): number | null {
  switch (tipo) {
    case 'frecuencia_cardiaca': return avg.averageBpm;
    case 'presion_sistolica':   return avg.bloodPressureSystolic;
    case 'presion_diastolica':  return avg.bloodPressureDiastolic;
    case 'saturacion_oxigeno':  return avg.spo2Percent;
    case 'temperatura':         return avg.bodyTemperatureCelsius;
  }
}

/** Agrupa registros por día y devuelve el promedio. */
function agruparPorDia(
  datos: DatoReloj[],
  tipo: TipoSignoVital,
  normalMin: number,
  normalMax: number,
): {label: string; value: number; isAbnormal: boolean; timestamp: Date}[] {
  const map = new Map<string, number[]>();
  for (const d of datos) {
    if (!d.recorded_at) continue;
    const dia = d.recorded_at.slice(0, 10);
    const val = extraerValor(d, tipo);
    if (val == null) continue;
    const arr = map.get(dia) ?? [];
    arr.push(val);
    map.set(dia, arr);
  }

  const result: {label: string; value: number; isAbnormal: boolean; timestamp: Date}[] = [];
  for (const [dia, valores] of map) {
    const avg = valores.reduce((a, b) => a + b, 0) / valores.length;
    const fecha = new Date(dia);
    result.push({
      label: DAY_LABELS[fecha.getDay()],
      value: tipo === 'temperatura' ? parseFloat(avg.toFixed(1)) : Math.round(avg),
      isAbnormal: avg < normalMin || avg > normalMax,
      timestamp: fecha,
    });
  }
  return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export default function DetalleSignoScreen({route, navigation}: Props) {
  const {tipoSigno, label, unit} = route.params;
  const {getUserId, session} = useSupabase();

  const [vista, setVista] = useState<VistaReporte>('daily');
  const [chartData, setChartData] = useState<{value: number; label: string; dataPointText: string}[]>([]);
  const [values, setValues] = useState<number[]>([]);
  const [normalMin, setNormalMin] = useState(NORMAL_RANGES[tipoSigno as TipoSignoVital].min);
  const [normalMax, setNormalMax] = useState(NORMAL_RANGES[tipoSigno as TipoSignoVital].max);
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);

  const t = tipoSigno as TipoSignoVital;
  const isTemperature = t === 'temperatura';

  // Cargar baseline del paciente
  useEffect(() => {
    let cancelled = false;
    async function loadBaseline() {
      const userId = getUserId();
      if (!userId) return;
      try {
        const baseline = await getBaseline(userId);
        if (cancelled || !baseline) return;
        const ranges = getBaselineRange(baseline, t);
        if (ranges) {
          setNormalMin(ranges.min);
          setNormalMax(ranges.max);
        }
      } catch {}
    }
    loadBaseline();
    return () => { cancelled = true; };
  }, [getUserId, t]);

  // Cargar datos según la vista seleccionada
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      const userId = getUserId();
      if (!userId) return;

      setLoading(true);
      const now = new Date();
      let desde: Date;
      let limite: number;

      switch (vista) {
        case 'daily':
          desde = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          limite = 200;
          break;
        case 'weekly':
          desde = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          limite = 500;
          break;
        case 'monthly':
          desde = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          limite = 1000;
          break;
      }

      try {
        let datos = await getDatosReloj(userId, {
          from: desde.toISOString(),
          to: now.toISOString(),
          limit: limite,
        });

        if (cancelled) return;

        // Fallback a cache local si Supabase no tiene datos
        if (datos.length === 0) {
          datos = await getCacheData(desde, now, t);
        }

        if (datos.length === 0) {
          setChartData([]);
          setValues([]);
          setHasData(false);
          return;
        }

        let registros: {label: string; value: number; isAbnormal: boolean}[];

        if (vista === 'daily') {
          registros = datos.map(d => {
            const val = extraerValor(d, t) ?? 0;
            const fecha = new Date(d.recorded_at!);
            return {
              label: `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`,
              value: val,
              isAbnormal: val < normalMin || val > normalMax,
            };
          }).sort((a, b) => {
            const timeA = a.label;
            const timeB = b.label;
            return timeA.localeCompare(timeB);
          });
        } else {
          registros = agruparPorDia(datos, t, normalMin, normalMax);
        }

        // Transformar a formato gifted-charts
        const giftedData = registros.map(r => ({
          value: r.value,
          label: r.label,
          dataPointText: '',
        }));

        if (!cancelled) {
          setChartData(giftedData);
          setValues(registros.map(r => r.value));
          setHasData(registros.length > 0);
        }
      } catch {
        if (!cancelled) {
          setChartData([]);
          setValues([]);
          setHasData(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [vista, tipoSigno, getUserId, normalMin, normalMax, t]);

  const refLineValue = useMemo(() => (normalMin + normalMax) / 2, [normalMin, normalMax]);

  const formatYLabel = useCallback((v: string) => {
    const num = parseFloat(v);
    return isTemperature ? num.toFixed(1) : String(Math.round(num));
  }, [isTemperature]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FlechaIcon direction="left" size={14} color={colors.primary} style={{marginRight: 6}} />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{label}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>

      {/* Filtro Diario / Semanal / Mensual */}
      <View style={styles.segmentRow}>
        {VISTAS.map(v => (
          <TouchableOpacity
            key={v.key}
            style={[styles.segment, vista === v.key && styles.segmentActive]}
            onPress={() => setVista(v.key)}>
            <Text style={[styles.segmentText, vista === v.key && styles.segmentTextActive]}>
              {v.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Estado vacío */}
      {chartData.length === 0 && !loading && (
        <Card>
          <Text style={styles.emptyText}>
            Aun no hay datos historicos para mostrar.
            {'\n'}Los datos del reloj se sincronizaran automaticamente.
          </Text>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card style={styles.loadingCard}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando datos...</Text>
        </Card>
      )}

      {/* Gráfico gifted-charts */}
      {chartData.length > 0 && (
        <Card style={styles.chartCard}>
          <LineChart
            data={chartData}
            width={spacing.screenPaddingHorizontal * 2 + 200}
            height={220}
            spacing={vista === 'daily' ? 40 : 60}
            color={colors.primary}
            thickness={2}
            curved
            areaChart
            startFillColor={colors.primary}
            endFillColor={colors.backgroundLight}
            startOpacity={0.3}
            endOpacity={0.0}
            dataPointsColor={colors.primary}
            dataPointsRadius={4}
            textColor={colors.textSecondary}
            textFontSize={10}
            yAxisColor={colors.border}
            xAxisColor={colors.border}
            yAxisTextStyle={{color: colors.textSecondary, fontSize: 10}}
            xAxisLabelTextStyle={{color: colors.textSecondary, fontSize: 9}}
            noOfSections={5}
            yAxisOffset={0}
            formatYLabel={formatYLabel}
            referenceLine={{
              config: {
                color: colors.primarySoft,
                thickness: 1.5,
                dashWidth: 6,
                dashGap: 4,
                labelComponent: () => (
                  <Text style={styles.refLabel}>
                    Normal: {normalMin}–{normalMax}
                  </Text>
                ),
              },
              value: refLineValue,
            }}
            onFocus={(item: {value: number; label: string; dataPointText: string}) => {}}
            pressPointIndex={-1}
            hideRules={false}
            rulesColor={colors.border}
            rulesType="dashed"
            animateOnDataChange
            animationDuration={800}
          />
        </Card>
      )}

      {/* Resumen estadístico */}
      {values.length > 0 && (
        <ResumenEstadistico
          values={values}
          unit={unit}
          normalRange={{min: normalMin, max: normalMax}}
        />
      )}

      {/* Rango normal */}
      <Card>
        <Text style={styles.rangeTitle}>Rango normal</Text>
        <Text style={styles.rangeText}>
          Valores normales: {normalMin} - {normalMax} {unit}
        </Text>
      </Card>

      <View style={{height: 24}} />
    </ScrollView>
  );
}

// ─── Helpers ───

/** Obtiene el rango normal desde el baseline del paciente */
function getBaselineRange(baseline: BaselineClinico, tipo: TipoSignoVital): {min: number; max: number} | null {
  switch (tipo) {
    case 'frecuencia_cardiaca':
      if (baseline.hr_min != null && baseline.hr_max != null) {
        return {min: baseline.hr_min, max: baseline.hr_max};
      }
      break;
    case 'presion_sistolica':
      if (baseline.bp_sist_min != null && baseline.bp_sist_max != null) {
        return {min: baseline.bp_sist_min, max: baseline.bp_sist_max};
      }
      break;
    case 'presion_diastolica':
      if (baseline.bp_diast_min != null && baseline.bp_diast_max != null) {
        return {min: baseline.bp_diast_min, max: baseline.bp_diast_max};
      }
      break;
    case 'saturacion_oxigeno':
      if (baseline.spo2_min != null) {
        return {min: baseline.spo2_min, max: 100};
      }
      break;
    case 'temperatura':
      if (baseline.temp_min != null && baseline.temp_max != null) {
        return {min: baseline.temp_min, max: baseline.temp_max};
      }
      break;
  }
  return null;
}

/** Obtiene datos del cache local y los convierte a DatoReloj[] */
async function getCacheData(
  desde: Date,
  hasta: Date,
  tipo: TipoSignoVital,
): Promise<DatoReloj[]> {
  try {
    const cached = await getDailyAveragesForRange(desde, hasta);
    const datos: DatoReloj[] = [];
    for (const day of cached) {
      const val = extraerValorCache(day.averages, tipo);
      if (val != null && val > 0) {
        datos.push({
          id: `cache-${day.date}`,
          id_usuario: '',
          frec_cardiaca_bpm: day.averages.averageBpm,
          bp_sistolica: day.averages.bloodPressureSystolic,
          bp_diastolica: day.averages.bloodPressureDiastolic,
          spo2_pct: day.averages.spo2Percent,
          temperatura: day.averages.bodyTemperatureCelsius,
          actividad_pasos: day.averages.steps,
          horas_sueno: day.averages.sleepMinutes / 60,
          recorded_at: `${day.date}T12:00:00Z`,
        });
      }
    }
    return datos;
  } catch {
    return [];
  }
}

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
  header: {
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backText: {
    fontSize: fontSize.body,
    color: colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  unit: {
    fontSize: fontSize.subtitle,
    color: colors.textSecondary,
    marginTop: 2,
  },
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
  chartCard: {
    marginBottom: 16,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
  },
  refLabel: {
    fontSize: 10,
    color: colors.primarySoft,
    fontWeight: '600',
  },
  rangeTitle: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  rangeText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
    lineHeight: 22,
  },
});
