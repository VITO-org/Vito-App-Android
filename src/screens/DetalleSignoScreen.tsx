import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {LineChart} from 'react-native-gifted-charts';
import {colors, fontSize, spacing} from '../theme';
import Card from '../components/Card';
import FlechaIcon from '../components/FlechaIcon';
import ResumenEstadistico from '../components/ResumenEstadistico';
import {useSupabase} from '../context/SupabaseProvider';
import {getDatosReloj, getBaseline} from '../services/supabase/api';
import type {DatosReloj, BaselineClinico} from '../services/supabase/models';
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
    alertId?: string;
    alertType?: string;
    severity?: 'INFO' | 'advertencia' | 'critica';
  };
};

type Props = NativeStackScreenProps<RootStackParamList, 'DetalleSigno'>;

const VISTAS: {key: VistaReporte; label: string}[] = [
  {key: 'daily', label: 'Diario'},
  {key: 'weekly', label: 'Semanal'},
  {key: 'monthly', label: 'Mensual'},
];

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const MONTH_X_LABELS = ['7', '14', '21', '28'];

const INITIAL_SPACING = 8;
// El eje termina con aire; el label final llega al borde por su alineación, no por endSpacing.
const END_SPACING = 10;

type ChartPoint = {
  value?: number;
  label?: string;
  labelComponent?: () => React.ReactElement;
  hideDataPoint?: boolean;
  dataPointText?: string;
};

/** Extrae el valor numérico de un DatosReloj según el tipo de signo vital. */
function extraerValor(dato: DatosReloj, tipo: TipoSignoVital): number | null {
  switch (tipo) {
    case 'frecuencia_cardiaca': return dato.frec_cardiaca_bpm;
    case 'presion_sistolica':   return dato.bp_sistolica;
    case 'presion_diastolica':  return dato.bp_diastolica;
    case 'saturacion_oxigeno':  return dato.spo2_pct;
    case 'temperatura':         return dato.temperatura;
  }
}

/** Columna NOT NULL a pedir a PostgREST según el tipo (espejo de `extraerValor`). */
function columnaNotNull(tipo: TipoSignoVital): string {
  switch (tipo) {
    case 'frecuencia_cardiaca': return 'frec_cardiaca_bpm';
    case 'presion_sistolica':   return 'bp_sistolica';
    case 'presion_diastolica':  return 'bp_diastolica';
    case 'saturacion_oxigeno':  return 'spo2_pct';
    case 'temperatura':         return 'temperatura';
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
  datos: DatosReloj[],
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

/** Agrupa los samples del día en 24 buckets de 1 hora ({min,max,avg,count,minutes}).
 *  Centro del slot = h*60+30. Los slots vacíos se omiten (no inventa datos).
 *  Solo vista Diaria. `value` = avg redondeado (1 decimal solo temperatura). */
function agruparPorHora(
  datos: DatosReloj[],
  tipo: TipoSignoVital,
): {min: number; max: number; avg: number; count: number; minutes: number; value: number}[] {
  const slots: number[][] = Array.from({length: 24}, () => []);
  for (const d of datos) {
    if (!d.recorded_at) continue;
    const val = extraerValor(d, tipo);
    if (val == null || !Number.isFinite(val)) continue;
    const fecha = new Date(d.recorded_at);
    if (Number.isNaN(fecha.getTime())) continue;
    const h = fecha.getHours();
    if (h < 0 || h > 23) continue;
    slots[h].push(val);
  }
  const result: {min: number; max: number; avg: number; count: number; minutes: number; value: number}[] = [];
  for (let h = 0; h < 24; h++) {
    const arr = slots[h];
    if (arr.length === 0) continue;
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    const value = tipo === 'temperatura' ? parseFloat(avg.toFixed(1)) : Math.round(avg);
    result.push({min, max, avg, count: arr.length, minutes: h * 60 + 30, value});
  }
  return result.sort((a, b) => a.minutes - b.minutes);
}

export default function DetalleSignoScreen({route, navigation}: Props) {
  const {tipoSigno, label, unit} = route.params;
  const {getUserId, session} = useSupabase();

  const [vista, setVista] = useState<VistaReporte>('daily');
  const [dayOffset, setDayOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [weekXLabels, setWeekXLabels] = useState<string[]>([]);
  const [chartContainerWidth, setChartContainerWidth] = useState(0);
  const [values, setValues] = useState<number[]>([]);
  const [normalMin, setNormalMin] = useState(NORMAL_RANGES[tipoSigno as TipoSignoVital].min);
  const [normalMax, setNormalMax] = useState(NORMAL_RANGES[tipoSigno as TipoSignoVital].max);
  const [loading, setLoading] = useState(false);
  const [, setHasData] = useState(false);

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
      let hasta: Date = now;
      let limite: number;

      switch (vista) {
        case 'daily':
          desde = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffset);
          limite = 200;
          hasta = dayOffset > 0
            ? new Date(desde.getFullYear(), desde.getMonth(), desde.getDate(), 23, 59, 59)
            : now;
          break;
        case 'weekly':
          hasta = new Date(now.getTime() - weekOffset * 7 * 24 * 60 * 60 * 1000);
          desde = new Date(hasta.getTime() - 7 * 24 * 60 * 60 * 1000);
          limite = 500;
          break;
        case 'monthly': {
          const base = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
          desde = base;
          hasta = monthOffset === 0
            ? now
            : new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59);
          limite = 1000;
          break;
        }
      }

      try {
        let datos = await getDatosReloj(userId, {
          from: desde.toISOString(),
          to: hasta.toISOString(),
          limit: limite,
          notNullColumn: columnaNotNull(t),
        }, session?.access_token);

        if (cancelled) return;

        // Fallback a cache local si Supabase no tiene datos
        if (datos.length === 0) {
          datos = await getCacheData(desde, hasta, t);
        }

        if (datos.length === 0) {
          setChartData([]);
          setValues([]);
          setHasData(false);
          setWeekXLabels([]);
          return;
        }

        let registros: {label: string; value: number; isAbnormal: boolean}[];
        let giftedData: ChartPoint[];

        if (vista === 'daily') {
          // Diaria: buckets de 1 HORA (24 slots, vacíos omitidos). Semanal/mensual intactos.
          const buckets = agruparPorHora(datos, t);
          registros = buckets.map(b => ({
            label: `${String(Math.floor(b.minutes / 60)).padStart(2, '0')}:00`,
            value: b.value,
            isAbnormal: b.avg < normalMin || b.avg > normalMax,
          }));
          const puntos: {point: ChartPoint; minutes: number}[] = buckets.map(b => ({
            point: {value: b.value, label: '', dataPointText: ''},
            minutes: b.minutes,
          }));
          // Anclas gap (sin value, hideDataPoint) en 00:00 y 24:00 si faltan
          if (puntos.length === 0 || puntos[0].minutes !== 0) {
            puntos.unshift({point: {label: '', dataPointText: '', hideDataPoint: true}, minutes: 0});
          }
          if (puntos.length === 0 || puntos[puntos.length - 1].minutes !== 1440) {
            puntos.push({point: {label: '', dataPointText: '', hideDataPoint: true}, minutes: 1440});
          }
          giftedData = puntos.map(p => p.point);
        } else if (vista === 'weekly') {
          // Semanal: un solo punto por día (promedio del día, días sin datos omitidos).
          // Mismo redondeo que diaria: 1 decimal temperatura, Math.round resto.
          // Label = día de semana (DAY_LABELS, vía agruparPorDia).
          registros = agruparPorDia(datos, t, normalMin, normalMax);
          // Transformar a formato gifted-charts (descarta valores no numéricos).
          // Labels planos '' para todos (sin labelComponent): el eje X lo dibuja
          // la fila propia weekXLabels (como en diaria).
          giftedData = registros
            .filter(r => Number.isFinite(r.value))
            .map(r => ({
              value: r.value,
              label: '',
              dataPointText: '',
            }));
        } else {
          // Mensual INTACTO: agrupar por día (un punto por día).
          // Labels planos '' en gifted (el eje X lo dibuja la fila propia fija 7/14/21/28).
          registros = agruparPorDia(datos, t, normalMin, normalMax);
          // Transformar a formato gifted-charts (descarta valores no numéricos)
          giftedData = registros
            .filter(r => Number.isFinite(r.value))
            .map(r => ({
              value: r.value,
              label: '',
              dataPointText: '',
            }));
        }

        if (!cancelled) {
          setChartData(giftedData);
          setValues(registros.map(r => r.value));
          setHasData(registros.length > 0);
          if (vista === 'weekly') {
            setWeekXLabels(
              registros.filter(r => Number.isFinite(r.value)).map(r => r.label),
            );
          } else {
            setWeekXLabels([]);
          }
        }
      } catch {
        if (!cancelled) {
          setChartData([]);
          setValues([]);
          setHasData(false);
          setWeekXLabels([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [vista, tipoSigno, getUserId, normalMin, normalMax, t, dayOffset, weekOffset, monthOffset, session?.access_token]);

  const refLineValue = useMemo(() => (normalMin + normalMax) / 2, [normalMin, normalMax]);

  const fechaVista = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffset);
  }, [dayOffset]);
  const etiquetaFechaVista = `${String(fechaVista.getDate()).padStart(2, '0')}/${String(fechaVista.getMonth() + 1).padStart(2, '0')}`;

  const etiquetaSemanaVista = useMemo(() => {
    const now = new Date();
    const hasta = new Date(now.getTime() - weekOffset * 7 * 24 * 60 * 60 * 1000);
    const desde = new Date(hasta.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    return `${fmt(desde)} - ${fmt(hasta)}`;
  }, [weekOffset]);

  const etiquetaMesVista = useMemo(() => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    return base.toLocaleDateString('es-ES', {month: 'long', year: 'numeric'});
  }, [monthOffset]);

  const formatYLabel = useCallback((v: string) => {
    const num = parseFloat(v);
    return isTemperature ? num.toFixed(1) : String(Math.round(num));
  }, [isTemperature]);

  const containerWidth = chartContainerWidth > 0
    ? chartContainerWidth
    : Dimensions.get('window').width - spacing.screenPaddingHorizontal * 2 - 16;
  const chartWidth = containerWidth - 62;
  const N = chartData.length;
  // Tope: min(ideal (chartWidth+4)/(N-0.5), contenido 18+s(N-2)<=chartWidth) con mínimo 4.
  const chartSpacing = N>1 ? Math.max(4, Math.min((chartWidth+4)/(N-0.5), (chartWidth-18)/Math.max(1,N-2))) : 10;
  const rulesLength = INITIAL_SPACING + chartSpacing * (N - 1) + 4;

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
            onPress={() => { setVista(v.key); setDayOffset(0); setWeekOffset(0); setMonthOffset(0); }}>
            <Text style={[styles.segmentText, vista === v.key && styles.segmentTextActive]}>
              {v.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Paginación de días (solo vista Diaria) */}
      {vista === 'daily' && (
        <View style={styles.dayNavRow}>
          <TouchableOpacity
            onPress={() => setDayOffset(o => o + 1)}
            style={styles.dayNavButton}
            accessibilityLabel="Día anterior">
            <Text style={styles.dayNavArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.dayNavLabel}>{etiquetaFechaVista}</Text>
          <TouchableOpacity
            onPress={() => setDayOffset(o => Math.max(0, o - 1))}
            disabled={dayOffset === 0}
            style={styles.dayNavButton}
            accessibilityLabel="Día siguiente">
            <Text style={[styles.dayNavArrow, dayOffset === 0 && styles.dayNavArrowDisabled]}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Paginación de semanas (solo vista Semanal) */}
      {vista === 'weekly' && (
        <View style={styles.dayNavRow}>
          <TouchableOpacity
            onPress={() => setWeekOffset(o => o + 1)}
            style={styles.dayNavButton}
            accessibilityLabel="Semana anterior">
            <Text style={styles.dayNavArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.dayNavLabel}>{etiquetaSemanaVista}</Text>
          <TouchableOpacity
            onPress={() => setWeekOffset(o => Math.max(0, o - 1))}
            disabled={weekOffset === 0}
            style={styles.dayNavButton}
            accessibilityLabel="Semana siguiente">
            <Text style={[styles.dayNavArrow, weekOffset === 0 && styles.dayNavArrowDisabled]}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Paginación de meses (solo vista Mensual) */}
      {vista === 'monthly' && (
        <View style={styles.dayNavRow}>
          <TouchableOpacity
            onPress={() => setMonthOffset(o => o + 1)}
            style={styles.dayNavButton}
            accessibilityLabel="Mes anterior">
            <Text style={styles.dayNavArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.dayNavLabel}>{etiquetaMesVista}</Text>
          <TouchableOpacity
            onPress={() => setMonthOffset(o => Math.max(0, o - 1))}
            disabled={monthOffset === 0}
            style={styles.dayNavButton}
            accessibilityLabel="Mes siguiente">
            <Text style={[styles.dayNavArrow, monthOffset === 0 && styles.dayNavArrowDisabled]}>›</Text>
          </TouchableOpacity>
        </View>
      )}

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
          <ChartErrorBoundary>
            <View
              style={{width: '100%'}}
              onLayout={e => setChartContainerWidth(e.nativeEvent.layout.width)}>
              <LineChart
                key={`${vista}-${dayOffset}-${weekOffset}-${monthOffset}`}
                data={chartData}
                width={chartWidth}
                height={260}
                spacing={chartSpacing}
                initialSpacing={INITIAL_SPACING}
                endSpacing={END_SPACING}
                disableScroll
                rulesLength={rulesLength}
                color={colors.primary}
              thickness={2}
              curved={chartData.length > 1}
              areaChart={chartData.length > 1}
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
              labelsExtraHeight={6}
              noOfSections={5}
              yAxisOffset={0}
              formatYLabel={formatYLabel}
              referenceLine1Config={{
                color: colors.primarySoft,
                thickness: 1.5,
                dashWidth: 6,
                dashGap: 4,
                labelText: `Normal: ${normalMin}–${normalMax}`,
                labelTextStyle: styles.refLabel,
              }}
              referenceLine1Position={refLineValue}
              hideRules={false}
              rulesColor={colors.border}
              rulesType="dashed"
            />
              {vista === 'daily' && (
                <View style={styles.xAxisRow}>
                  <Text style={[{color: colors.textSecondary, fontSize: 9}, {textAlign: 'left'}]}>00:00</Text>
                  <Text style={[{color: colors.textSecondary, fontSize: 9}, {textAlign: 'center'}]}>06:00</Text>
                  <Text style={[{color: colors.textSecondary, fontSize: 9}, {textAlign: 'center'}]}>12:00</Text>
                  <Text style={[{color: colors.textSecondary, fontSize: 9}, {textAlign: 'center'}]}>18:00</Text>
                  <Text style={[{color: colors.textSecondary, fontSize: 9}, {textAlign: 'right'}]}>00:00</Text>
                </View>
              )}
              {vista === 'weekly' && weekXLabels.length > 0 && (
                <View style={styles.xAxisRow}>
                  {weekXLabels.map((lbl, i) => (
                    <Text
                      key={`${i}-${lbl}`}
                      style={[
                        {color: colors.textSecondary, fontSize: 9},
                        {textAlign: i === 0 ? 'left' : i === weekXLabels.length - 1 ? 'right' : 'center'},
                      ]}>
                      {lbl}
                    </Text>
                  ))}
                </View>
              )}
              {vista === 'monthly' && (
                <View style={styles.xAxisRow}>
                  {MONTH_X_LABELS.map((lbl, i) => (
                    <Text
                      key={`${i}-${lbl}`}
                      style={[
                        {color: colors.textSecondary, fontSize: 9},
                        {textAlign: i === 0 ? 'left' : i === MONTH_X_LABELS.length - 1 ? 'right' : 'center'},
                      ]}>
                      {lbl}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </ChartErrorBoundary>
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

/**
 * Error boundary para el gráfico. Si react-native-gifted-charts o
 * react-native-svg lanzan un error de render (p. ej. con datasets
 * degenerados), en lugar de tumbar la app se muestra un mensaje
 * recuperable.
 */
class ChartErrorBoundary extends React.Component<
  {children: React.ReactNode},
  {hasError: boolean}
> {
  state = {hasError: false};

  static getDerivedStateFromError() {
    return {hasError: true};
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn('[DetalleSigno] Error de render en el grafico:', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Text style={styles.chartErrorText}>
          No se pudo dibujar el gráfico para este período. Intenta con otro filtro.
        </Text>
      );
    }
    return this.props.children;
  }
}

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

/** Obtiene datos del cache local y los convierte a DatosReloj[] */
async function getCacheData(
  desde: Date,
  hasta: Date,
  tipo: TipoSignoVital,
): Promise<DatosReloj[]> {
  try {
    const cached = await getDailyAveragesForRange(desde, hasta);
    const datos: DatosReloj[] = [];
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
          nivel_estres: null,
          actividad_pasos: day.averages.steps,
          horas_sueno: day.averages.sleepMinutes / 60,
          sospechoso: null,
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
    marginBottom: 6,
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
  dayNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayNavButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dayNavArrow: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  dayNavArrowDisabled: {
    color: colors.textSecondary,
    opacity: 0.4,
  },
  dayNavLabel: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chartCard: {
    marginBottom: 16,
    alignItems: 'flex-start',
    paddingVertical: 8,
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
  chartErrorText: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 30,
    marginRight: 0,
    marginTop: 0,
    marginBottom: 10,
  },
});
