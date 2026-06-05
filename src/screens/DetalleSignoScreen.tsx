import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet, LayoutChangeEvent} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {colors, fontSize, spacing} from '../theme';
import Card from '../components/Card';
import LineChart from '../components/LineChart';
import ResumenEstadistico from '../components/ResumenEstadistico';
import {
  VistaReporte,
  MockRegistro,
  TipoSignoVital,
  NORMAL_RANGES,
  generarDatosDiarios,
  generarDatosSemanales,
  generarDatosMensuales,
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

export default function DetalleSignoScreen({route, navigation}: Props) {
  const {tipoSigno, label, unit} = route.params;

  const [vista, setVista] = useState<VistaReporte>('daily');
  const [data, setData] = useState<MockRegistro[]>([]);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    const fecha = new Date();
    const t = tipoSigno as TipoSignoVital;
    let newData: MockRegistro[];
    switch (vista) {
      case 'daily':
        newData = generarDatosDiarios(t, fecha);
        break;
      case 'weekly':
        newData = generarDatosSemanales(t, fecha);
        break;
      case 'monthly':
        newData = generarDatosMensuales(t, fecha);
        break;
    }
    setData(newData);
  }, [vista, tipoSigno]);

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

      <View style={styles.chartWrapper} onLayout={onLayout}>
        {chartWidth > 0 && (
          <LineChart
            data={data}
            normalRange={normalRange}
            width={chartWidth}
            height={280}
            viewMode={vista}
          />
        )}
      </View>

      <ResumenEstadistico values={values} unit={unit} normalRange={normalRange} />

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
});
