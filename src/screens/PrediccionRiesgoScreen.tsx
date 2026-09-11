import React, {useCallback, useEffect, useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {colors, fontSize, spacing} from '../theme';
import Card from '../components/Card';
import FlechaIcon from '../components/FlechaIcon';
import {useSupabase} from '../context/SupabaseProvider';
import type {RootStackParamList} from '../navigation/RootNavigator';
import {
  buildPredictionPayload,
  camposFaltantesPrediccion,
  mapearRiesgo,
  FEATURE_ORDER,
} from '../services/prediccionRiesgo';
import type {FeatureName} from '../services/prediccionRiesgo';
import {
  callPrediccionRiesgo,
  getDatosPrediccionRiesgo,
  getFactoresRiesgoCardiaco,
  getPromedioSemanalML,
  getUltimaPrediccionRiesgo,
} from '../services/supabase/api';
import type {PrediccionRiesgoApiResponse} from '../services/supabase/api';
import type {PromedioSemanalML} from '../services/supabase/models';

type Props = NativeStackScreenProps<RootStackParamList, 'PrediccionRiesgo'>;

const RIESGO_META: Record<
  'bajo' | 'medio' | 'alto',
  {label: string; color: string; bg: string; emoji: string; desc: string}
> = {
  bajo: {
    label: 'Riesgo bajo',
    color: colors.success,
    bg: colors.successLight,
    emoji: '🟢',
    desc: 'El modelo estima un riesgo cardiovascular bajo según tus datos actuales.',
  },
  medio: {
    label: 'Riesgo medio',
    color: colors.warning,
    bg: colors.warningLight,
    emoji: '🟠',
    desc: 'El modelo estima un riesgo cardiovascular medio. Consultá a tu médico para una evaluación.',
  },
  alto: {
    label: 'Riesgo alto',
    color: colors.danger,
    bg: colors.dangerLight,
    emoji: '🔴',
    desc: 'El modelo estima un riesgo cardiovascular alto. Te recomendamos consultar a un profesional de la salud lo antes posible.',
  },
};

const FEATURE_LABEL: Record<(typeof FEATURE_ORDER)[number], string> = {
  age: 'Edad',
  sex_male: 'Sexo masculino',
  bmi: 'IMC',
  bp_sistolica: 'Presión sistólica',
  bp_diastolica: 'Presión diastólica',
  cholesterol_ord: 'Colesterol',
  diabetes: 'Diabetes',
  smoking: 'Tabaquismo',
  alcohol: 'Consumo de alcohol',
  active: 'Actividad física',
};

/**
 * Clasificación interpretable de la contribución local de cada factor
 * (delta en puntos porcentuales devuelto por la Edge Function):
 *
 * - delta < 0        → "Bueno" (verde): la feature te BAJA el riesgo frente
 *                      al valor de referencia saludable.
 * - 0 <= delta < 5   → "Malo" (naranja): la feature te SUBE el riesgo.
 * - delta >= 5       → "Muy malo" (rojo): te sube el riesgo y está lejos del
 *                      estándar saludable (ajuste prioritario).
 */
const UMBRAL_MUY_MALO = 5;

function estadoFactor(delta: number): {label: string; color: string; bg: string} {
  if (delta < 0) {
    return {label: 'Bueno', color: colors.success, bg: colors.successLight};
  }
  if (delta >= UMBRAL_MUY_MALO) {
    return {label: 'Muy malo', color: colors.danger, bg: colors.dangerLight};
  }
  return {label: 'Malo', color: colors.warning, bg: colors.warningLight};
}

export default function PrediccionRiesgoScreen({navigation}: Props) {
  const {profile, session, getUserId} = useSupabase();

  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<PrediccionRiesgoApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imputados, setImputados] = useState<string[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  // Campos críticos que faltan para evaluar sin imputar (CA-03). Vacía = ok.
  const [faltantes, setFaltantes] = useState<FeatureName[]>([]);

  // Cargar en paralelo: factores de riesgo + datos declarados + promedio
  // semanal + última predicción
  useEffect(() => {
    let cancelled = false;
    async function loadDatos() {
      const userId = getUserId();
      if (!userId) {
        if (!cancelled) setCargandoDatos(false);
        return;
      }
      try {
        const [factores, datos, promedio, ultima] = await Promise.all([
          getFactoresRiesgoCardiaco(userId).catch(() => null),
          getDatosPrediccionRiesgo(userId).catch(() => null),
          getPromedioSemanalML(userId, {limit: 1}).catch(() => [] as PromedioSemanalML[]),
          getUltimaPrediccionRiesgo(userId).catch(() => null),
        ]);
        if (cancelled) return;
        if (ultima) {
          setResultado({
            riesgo: ultima.riesgo,
            score: ultima.score ?? 0,
            modelo_version: ultima.modelo_version ?? 'v1.0.0',
            factores_mas_influyentes: ultima.factores_mas_influyentes ?? {},
            prediccion_id: ultima.id,
            disclaimer:
              'Evaluación educativa basada en un modelo poblacional. No constituye diagnóstico médico.',
          });
        }
        // Estado de campos faltantes para el aviso previo a evaluar
        if (profile) {
          setFaltantes(
            camposFaltantesPrediccion({
              profile,
              factores,
              promedio: promedio[0] ?? null,
              datos,
            }),
          );
        }
      } catch {
        // no bloqueamos la pantalla por fallo de precarga
      } finally {
        if (!cancelled) setCargandoDatos(false);
      }
    }
    loadDatos();
    return () => {
      cancelled = true;
    };
  }, [getUserId, profile]);

  // Al volver del formulario DatosPrediccionScreen: recargar datos declarados
  // y re-evaluar si aún faltan campos (si el usuario acaba de completarlos,
  // el aviso desaparece y puede evaluar directo).
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const userId = getUserId();
      if (!userId || !profile) return;
      getDatosPrediccionRiesgo(userId)
        .then(datos => {
          setFaltantes(
            camposFaltantesPrediccion({
              profile,
              datos,
            }),
          );
        })
        .catch(() => {
          // dejamos el estado anterior
        });
    });
    return unsubscribe;
  }, [navigation, getUserId, profile]);

  const handleEvaluar = useCallback(async () => {
    if (!profile) {
      setError('Completá tu perfil (fecha de nacimiento, sexo, peso y altura) antes de evaluar.');
      return;
    }
    const userId = getUserId();
    if (!userId || !session?.access_token) {
      setError('No hay sesión activa. Volvé a iniciar sesión.');
      return;
    }

    setLoading(true);
    setError(null);
    setResultado(null);
    try {
      // Inputs frescos: factores + datos declarados + último promedio semanal
      const [factores, datos, promedio] = await Promise.all([
        getFactoresRiesgoCardiaco(userId).catch(() => null),
        getDatosPrediccionRiesgo(userId).catch(() => null),
        getPromedioSemanalML(userId, {limit: 1}).catch(() => [] as PromedioSemanalML[]),
      ]);

      // CA-03: si faltan campos críticos, NO llamamos a la Edge Function.
      // Mostramos el aviso con la lista de faltantes en vez de imputar.
      const faltan = camposFaltantesPrediccion({
        profile,
        factores,
        promedio: promedio[0] ?? null,
        datos,
      });
      setFaltantes(faltan);
      if (faltan.length > 0) {
        return;
      }

      const payload = buildPredictionPayload({
        profile,
        factores,
        promedio: promedio[0] ?? null,
        datos,
      });
      setImputados(payload.imputados.map(f => FEATURE_LABEL[f]));

      const res = await callPrediccionRiesgo(payload.vector, session.access_token);
      setResultado(res);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || 'No se pudo calcular el riesgo. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [profile, session, getUserId]);

  const riesgoMeta = resultado ? RIESGO_META[mapearRiesgo(resultado.score)] : null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FlechaIcon direction="left" size={14} color={colors.primary} style={{marginRight: 6}} />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Riesgo cardiovascular</Text>
        <Text style={styles.subtitle}>
          Estimación con IA basada en el modelo Vito v1 (Kaggle-Cardio, 70k pacientes).
        </Text>
      </View>

      {/* Descripción y CTA */}
      <Card>
        <Text style={styles.descTitle}>¿Qué es esto?</Text>
        <Text style={styles.descText}>
          Vito combina tu perfil (edad, sexo, IMC), tus factores de riesgo y tus promedios
          semanales (presión arterial, actividad) para estimar la probabilidad de presentar
          un evento cardiovascular. El resultado es orientativo y complementa, nunca
          reemplaza, la evaluación médica.
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {faltantes.length > 0 && (
          <View style={styles.faltantesCard}>
            <Text style={styles.faltantesTitle}>
              Faltan datos para una evaluación precisa
            </Text>
            <Text style={styles.faltantesText}>
              Vito no tiene estos datos y no queremos usar valores estándar en silencio.
              Completalos para obtener un resultado con tus valores reales:
            </Text>
            <Text style={styles.faltantesList}>
              {faltantes.map(f => `• ${FEATURE_LABEL[f] ?? f}`).join('\n')}
            </Text>
            <TouchableOpacity
              style={styles.faltantesButton}
              onPress={() => navigation.navigate('DatosPrediccion')}
              activeOpacity={0.8}>
              <Text style={styles.faltantesButtonText}>Completar mis datos</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.ctaButton, loading && styles.ctaDisabled]}
          onPress={handleEvaluar}
          disabled={loading}
          activeOpacity={0.8}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.ctaText}>
              {resultado ? 'Volver a evaluar' : 'Evaluar mi riesgo ahora'}
            </Text>
          )}
        </TouchableOpacity>
      </Card>

      {/* Resultado */}
      {resultado && riesgoMeta && (
        <>
          <Card style={[styles.resultCard, {backgroundColor: riesgoMeta.bg}]}>
            <Text style={[styles.resultEmoji]}>{riesgoMeta.emoji}</Text>
            <Text style={[styles.resultLabel, {color: riesgoMeta.color}]}>
              {riesgoMeta.label}
            </Text>
            <Text style={styles.resultScore}>{resultado.score.toFixed(1)}/100</Text>
            <Text style={styles.resultDesc}>{riesgoMeta.desc}</Text>
          </Card>

          {resultado.factores_mas_influyentes &&
            Object.keys(resultado.factores_mas_influyentes).length > 0 && (
              <Card>
                <Text style={styles.sectionTitle}>Factores más influyentes</Text>
                {Object.entries(resultado.factores_mas_influyentes).map(([name, factor]) => {
                  const delta = Number(factor);
                  const estado = estadoFactor(delta);
                  const deltaStr = `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`;
                  return (
                    <View key={name} style={styles.factorRow}>
                      <Text style={styles.factorName}>
                        {FEATURE_LABEL[name as (typeof FEATURE_ORDER)[number]] ?? name}
                      </Text>
                      <View style={[styles.factorBadge, {backgroundColor: estado.bg}]}>
                        <Text style={[styles.factorBadgeText, {color: estado.color}]}>
                          {estado.label} ({deltaStr})
                        </Text>
                      </View>
                    </View>
                  );
                })}
                <Text style={styles.factorHint}>
                  El número muestra cuánto sube (Malo / Muy malo) o baja (Bueno)
                  la estimación de riesgo frente a los valores de referencia
                  saludables.
                </Text>
              </Card>
            )}

          {imputados.length > 0 && (
            <Card>
              <Text style={styles.sectionTitle}>Datos usados por defecto</Text>
              <Text style={styles.imputadosText}>
                Vito no tenía estos datos y usó valores poblacionales estándar:{' '}
                {imputados.join(', ')}.
              </Text>
            </Card>
          )}

          <Card>
            <Text style={styles.sectionTitle}>Modelo</Text>
            <Text style={styles.modelText}>
              Versión {resultado.modelo_version} · Árboles RandomForest · Exactitud 73.6% ·
              AUC 0.80 en validación independiente.
            </Text>
            <Text style={styles.disclaimer}>
              ⚠️ {resultado.disclaimer}
              {'\n\n'}Este cálculo no reemplaza la consulta con un profesional de la salud.
            </Text>
          </Card>
        </>
      )}

      {/* Cargando datos iniciales */}
      {cargandoDatos && <ActivityIndicator size="small" color={colors.primary} />}

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
    lineHeight: 18,
  },
  descTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  descText: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  errorText: {
    fontSize: fontSize.caption,
    color: colors.danger,
    marginBottom: 12,
    lineHeight: 18,
  },
  faltantesCard: {
    backgroundColor: colors.warningLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.warning,
    padding: 14,
    marginBottom: 12,
  },
  faltantesTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  faltantesText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  faltantesList: {
    fontSize: fontSize.caption,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 10,
  },
  faltantesButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  faltantesButtonText: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: '#fff',
  },
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  ctaDisabled: {
    opacity: 0.7,
  },
  ctaText: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: '#fff',
  },
  resultCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  resultEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: fontSize.title,
    fontWeight: '800',
  },
  resultScore: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
  },
  resultDesc: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  factorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  factorName: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  factorBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  factorBadgeText: {
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  factorHint: {
    marginTop: 10,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  imputadosText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  modelText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginBottom: 10,
    lineHeight: 18,
  },
  disclaimer: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});