import React, {useMemo} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Card from './Card';
import {colors, fontSize, spacing} from '../theme';
import {NormalRange} from '../data/mockReportes';

interface ResumenEstadisticoProps {
  values: number[];
  unit: string;
  normalRange: NormalRange;
}

interface Metrica {
  label: string;
  value: string;
  isAlert: boolean;
}

export default function ResumenEstadistico({values, unit, normalRange}: ResumenEstadisticoProps) {
  const metricas = useMemo<Metrica[]>(() => {
    if (values.length === 0) {
      return [
        {label: 'Promedio', value: '--', isAlert: false},
        {label: 'Máximo', value: '--', isAlert: false},
        {label: 'Mínimo', value: '--', isAlert: false},
        {label: 'Registros', value: '0', isAlert: false},
      ];
    }

    const promedio = values.reduce((a, b) => a + b, 0) / values.length;
    const maximo = Math.max(...values);
    const minimo = Math.min(...values);
    const cantidad = values.length;

    const fmt = (v: number) => {
      const s = v % 1 === 0 ? String(v) : v.toFixed(1);
      return unit ? `${s}${unit}` : String(v);
    };

    const promedioFuera = promedio < normalRange.min || promedio > normalRange.max;

    return [
      {label: 'Promedio', value: fmt(promedio), isAlert: promedioFuera},
      {label: 'Máximo', value: fmt(maximo), isAlert: false},
      {label: 'Mínimo', value: fmt(minimo), isAlert: false},
      {label: 'Registros', value: String(cantidad), isAlert: false},
    ];
  }, [values, unit, normalRange]);

  return (
    <Card>
      <View style={styles.row}>
        {metricas.map((m, i) => (
          <View key={i} style={styles.metric}>
            <Text style={[styles.metricValue, m.isAlert && styles.alertValue]}>
              {m.value}
            </Text>
            <Text style={styles.metricLabel}>{m.label}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  alertValue: {
    color: '#EF4444',
  },
  metricLabel: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
});
