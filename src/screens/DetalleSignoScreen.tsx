import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet, LayoutChangeEvent} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {colors, fontSize, spacing} from '../theme';
import Card from '../components/Card';
import LineChart from '../components/LineChart';
import ResumenEstadistico from '../components/ResumenEstadistico';
import {useSupabase} from '../context/SupabaseProvider';
import {getDatosReloj} from '../services/supabase/api';
import type {DatoReloj} from '../services/supabase/models';
import {
  VistaReporte,
  MockRegistro,
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

/**
 * Extrae el valor numérico de un DatoReloj según el tipo de signo vital.
 */
function extraerValor(dato: DatoReloj, tipo: TipoSignoVital): number | null {
  switch (tipo) {
    case 'frecuencia_cardiaca': return dato.frec_cardiaca_bpm;
    case 'presion_sistolica':   return dato.bp_sistolica;
    case 'presion_diastolica':  return dato.bp_diastolica;
    case 'saturacion_oxigeno':  return dato.spo2_pct;
    case 'temperatura':         return dato.temperatura;
  }
}

/**
 * Agrupa registros por día (según recorded_at) y devuelve el promedio de cada día.
 */
function agruparPorDia(
  datos: DatoReloj[],
  tipo: TipoSignoVital,
  rango: {min: number; max: number},
): MockRegistro[] {
  const map = new Map<string, number[]>();
  for (const d of datos) {
    if (!d.recorded_at) continue;
    const dia = d.recorded_at.slice(0, 10); // "2026-06-10"
    const val = extraerValor(d, tipo);
    if (val == null) continue;
    const arr = map.get(dia) ?? [];
    arr.push(val);
    map.set(dia, arr);
  }

  const result: MockRegistro[] = [];
  for (const [dia, valores] of map) {
    const avg = valores.reduce((a, b) => a + b, 0) / valores.length;
    const fecha = new Date(dia);
    result.push({
      label: DAY_LABELS[fecha.getDay()],
      value: tipo === 'temperatura' ? parseFloat(avg.toFixed(1)) : Math.round(avg),
      isAbnormal: avg < rango.min || avg > rango.max,
      timestamp: fecha,
    });
  }
  return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export default function DetalleSignoScreen({route, navigation}: Props) {
  const {tipoSigno, label, unit} = route.params;
  const {getUserId} = useSupabase();

  const [vista, setVista] = useState<VistaReporte>('daily');
  const [data, setData] = useState<MockRegistro[]>([]);
  const [chartWidth, setChartWidth] = useState(0);
  const [loadingDatos, setLoadingDatos] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      const userId = getUserId();
      if (!userId) return;

      setLoadingDatos(true);
      const t = tipoSigno as TipoSignoVital;
      const rango = NORMAL_RANGES[t];
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
        const datos = await getDatosReloj(userId, {
          from: desde.toISOString(),
          to: now.toISOString(),
          limit: limite,
        });

        if (cancelled) return;

        if (datos.length === 0) {
          setData([]);
          return;
        }

        let registros: MockRegistro[];

        if (vista === 'daily') {
          // Vista diaria: puntos individuales con hora
          registros = datos.map(d => {
            const val = extraerValor(d, t) ?? 0;
            const fecha = new Date(d.recorded_at!);
            return {
              label: `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`,
              value: val,
              isAbnormal: val < rango.min || val > rango.max,
              timestamp: fecha,
            };
          }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        } else {
          // Semanal / Mensual: agrupar por día y promediar
          registros = agruparPorDia(datos, t, rango);
        }

        setData(registros);
      } catch (err) {
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setLoadingDatos(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [vista, tipoSigno, getUserId]);

  const normalRange = NORMAL_RANGES[tipoSigno as TipoSignoVital];
  const values = data.map(d => d.value);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setChartWidth(e.nativeEvent.layout.width);
  }, []);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{label}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>

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

      {data.length === 0 && !loadingDatos && (
        <Card>
          <Text style={styles.emptyText}>
            Aún no hay datos históricos para mostrar.
            {'\n'}Los datos del reloj se sincronizarán automáticamente cada 10 minutos.
          </Text>
        </Card>
      )}

      {loadingDatos && (
        <Card>
          <Text style={styles.emptyText}>Cargando datos...</Text>
        </Card>
      )}

      <View style={styles.chartWrapper} onLayout={onLayout}>
        {chartWidth > 0 && data.length > 0 && (
          <LineChart
            data={data}
            normalRange={normalRange}
            width={chartWidth}
            height={280}
            viewMode={vista}
          />
        )}
      </View>

      {data.length > 0 && (
        <ResumenEstadistico values={values} unit={unit} normalRange={normalRange} />
      )}

      <Card>
        <Text style={styles.rangeTitle}>Rango normal</Text>
        <Text style={styles.rangeText}>
          Valores normales: {normalRange.min} - {normalRange.max} {unit}
        </Text>
      </Card>

      <View style={{height: 24}} />
    </ScrollView>
  );
}

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
    marginTop: 4,
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
  chartWrapper: {
    marginBottom: 16,
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
