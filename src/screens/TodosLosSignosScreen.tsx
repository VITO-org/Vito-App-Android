import React from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useHealth} from '../context/HealthProvider';
import {colors, spacing, fontSize, shadows} from '../theme';
import {
  buildSignosFromSummary,
  getSignosVitales,
  getMetricasBienestar,
} from '../utils/signosVitales';
import AppIcon, {type AppIconName} from '../components/AppIcon';
import FlechaIcon from '../components/FlechaIcon';
import type {RootStackParamList} from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'TodosLosSignos'>;

/**
 * Pantalla que muestra TODOS los signos vitales y métricas disponibles.
 * Los signos vitales navegan al detalle individual;
 * pasos y sueño son informativos.
 *
 * Único punto de render — los datos vienen de buildSignosFromSummary.
 */
const TodosLosSignosScreen: React.FC<Props> = ({navigation}) => {
  const {summary, loading, lastSync} = useHealth();

  const allSignos = buildSignosFromSummary(summary, lastSync);
  const signosVitales = getSignosVitales(allSignos);
  const bienestar = getMetricasBienestar(allSignos);

  const secciones = [
    {title: 'Signos vitales', items: signosVitales},
    {title: 'Bienestar', items: bienestar},
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FlechaIcon direction="left" size={14} color={colors.primary} style={{marginRight: 6}} />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Todos los signos</Text>
        <Text style={styles.subtitle}>
          {loading ? 'Cargando datos...' : `${allSignos.length} métricas monitoreadas`}
        </Text>
      </View>

      {secciones.map(sec => (
        <View key={sec.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{sec.title}</Text>
          <View style={styles.grid}>
            {sec.items.map(s => {
              const puedeNavegar = !!s.rangeLabel;
              const Card = puedeNavegar ? TouchableOpacity : View;
              const cardProps = puedeNavegar
                ? {
                    onPress: () =>
                      navigation.navigate('DetalleSigno', {
                        tipoSigno: s.id,
                        label: s.label,
                        unit: s.unit,
                        icon: s.icon,
                      }),
                    activeOpacity: 0.7,
                  }
                : {};

              return (
                <Card key={s.id} style={styles.resumenCard} {...cardProps}>
                  <View style={[styles.iconCircle, {backgroundColor: s.iconBgColor + '20'}]}>
                    {s.iconName ? (
                      <AppIcon name={s.iconName as AppIconName} size={s.iconSize ?? 22} />
                    ) : (
                      <Text style={styles.iconEmoji}>{s.icon}</Text>
                    )}
                  </View>
                  <Text style={styles.resumenValue}>{s.value}</Text>
                  <Text style={styles.resumenUnit}>{s.unit}</Text>
                  <Text style={styles.resumenLabel}>{s.label}</Text>
                  {s.rangeLabel ? (
                    <Text style={styles.resumenRange}>{s.rangeLabel}</Text>
                  ) : null}
                </Card>
              );
            })}
          </View>
        </View>
      ))}

      <View style={{height: 24}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
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
  subtitle: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  resumenCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.cardBorderRadius,
    padding: 14,
    width: '48%',
    marginBottom: spacing.gridGap,
    ...shadows.card,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
});

export default TodosLosSignosScreen;
