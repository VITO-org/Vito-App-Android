import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {colors, fontSize, spacing} from '../theme';
import Card from '../components/Card';
import FlechaIcon from '../components/FlechaIcon';
import PrimaryButton from '../components/PrimaryButton';
import {useSupabase} from '../context/SupabaseProvider';
import type {RootStackParamList} from '../navigation/RootNavigator';
import {
  getDatosPrediccionRiesgo,
  upsertDatosPrediccionRiesgo,
} from '../services/supabase/api';

type Props = NativeStackScreenProps<RootStackParamList, 'DatosPrediccion'>;

/**
 * Pantalla de formulario dedicado para la predicción de riesgo cardiovascular
 * (HU-91). El usuario declara las features que Vito NO recolecta de forma
 * nativa: peso/altura (→ BMI), presión arterial manual, colesterol ordinal,
 * diabetes, tabaquismo, consumo de alcohol y actividad física. Guarda una
 * fila por usuario en `datos_prediccion_riesgo` (upsert on_conflict=id_usuario).
 *
 * Sexo y edad NO se piden acá: se toman del perfil existente al evaluar.
 * Si la fila ya existe, precarga sus valores. Si no existe, precarga
 * peso/altura desde el perfil para no duplicar datos ya cargados.
 */
const DatosPrediccionScreen: React.FC<Props> = ({navigation}) => {
  const {session, profile, getUserId} = useSupabase();

  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [bpSist, setBpSist] = useState('');
  const [bpDiast, setBpDiast] = useState('');
  const [colesterol, setColesterol] = useState<1 | 2 | 3 | null>(null);
  const [diabetes, setDiabetes] = useState<boolean | null>(null);
  const [tabaquismo, setTabaquismo] = useState<boolean | null>(null);
  const [alcohol, setAlcohol] = useState<boolean | null>(null);
  const [actividad, setActividad] = useState<boolean | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function preload() {
      const userId = getUserId();
      if (!userId) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const fila = await getDatosPrediccionRiesgo(userId).catch(() => null);
        if (cancelled) return;
        if (fila) {
          setPeso(fila.peso_kg != null ? String(fila.peso_kg) : '');
          setAltura(fila.altura_cm != null ? String(fila.altura_cm) : '');
          setBpSist(fila.bp_sistolica != null ? String(fila.bp_sistolica) : '');
          setBpDiast(fila.bp_diastolica != null ? String(fila.bp_diastolica) : '');
          setColesterol(fila.cholesterol_ord);
          setDiabetes(fila.diabetes);
          setTabaquismo(fila.smoking);
          setAlcohol(fila.alcohol);
          setActividad(fila.active);
        } else if (profile) {
          // Primera vez: precargar peso/altura del perfil (no duplicar)
          if (profile.peso_kg != null) setPeso(String(profile.peso_kg));
          if (profile.altura_cm != null) setAltura(String(profile.altura_cm));
        }
      } catch {
        // no bloqueamos la pantalla por fallo de precarga
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    preload();
    return () => {
      cancelled = true;
    };
  }, [getUserId, profile]);

  const bmiCalculado = useCallback((): number | null => {
    const p = parseFloat(peso);
    const a = parseFloat(altura);
    if (Number.isNaN(p) || Number.isNaN(a) || a <= 0) return null;
    const bmi = p / Math.pow(a / 100, 2);
    return bmi >= 15 && bmi <= 50 ? Math.round(bmi * 10) / 10 : null;
  }, [peso, altura]);

  const validar = (): string | null => {
    const p = parseFloat(peso);
    const a = parseFloat(altura);
    if (Number.isNaN(p) || p < 10 || p > 500) return 'El peso debe estar entre 10 y 500 kg';
    if (Number.isNaN(a) || a < 50 || a > 280) return 'La altura debe estar entre 50 y 280 cm';
    if (bmiCalculado() === null) return 'El IMC calculado está fuera del rango esperado (15-50)';

    const ps = parseInt(bpSist, 10);
    const pd = parseInt(bpDiast, 10);
    if (Number.isNaN(ps) || ps < 80 || ps > 200) return 'La presión sistólica debe estar entre 80 y 200 mmHg';
    if (Number.isNaN(pd) || pd < 50 || pd > 140) return 'La presión diastólica debe estar entre 50 y 140 mmHg';
    if (pd >= ps) return 'La presión diastólica debe ser menor a la sistólica';

    if (!colesterol) return 'Seleccioná tu nivel de colesterol';
    if (diabetes === null) return 'Indicá si tenés diabetes';
    if (tabaquismo === null) return 'Indicá si fumás';
    if (alcohol === null) return 'Indicá si consumís alcohol';
    if (actividad === null) return 'Indicá si hacés actividad física';
    return null;
  };

  const handleGuardar = async () => {
    const err = validar();
    if (err) {
      setError(err);
      return;
    }
    const userId = getUserId();
    if (!userId || !session?.access_token) {
      setError('No hay sesión activa. Volvé a iniciar sesión.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await upsertDatosPrediccionRiesgo(
        {
          id_usuario: userId,
          peso_kg: parseFloat(peso),
          altura_cm: parseFloat(altura),
          bp_sistolica: parseInt(bpSist, 10),
          bp_diastolica: parseInt(bpDiast, 10),
          cholesterol_ord: colesterol!,
          diabetes: diabetes!,
          smoking: tabaquismo!,
          alcohol: alcohol!,
          active: actividad!,
        },
        session.access_token,
      );
      navigation.goBack();
    } catch (e: unknown) {
      const errObj = e as Error;
      setError(errObj.message || 'No se pudieron guardar los datos. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const bmi = bmiCalculado();

  const ChipOption = ({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );

  const ChipGroup = ({
    label,
    options,
    value,
    onChange,
  }: {
    label: string;
    options: {key: 1 | 2 | 3 | boolean; label: string}[];
    value: 1 | 2 | 3 | boolean | null;
    onChange: (v: 1 | 2 | 3 | boolean) => void;
  }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map(opt => {
          const selected = value === opt.key;
          return (
            <ChipOption
              key={String(opt.key)}
              label={opt.label}
              selected={selected}
              onPress={() => onChange(opt.key)}
            />
          );
        })}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <FlechaIcon direction="left" size={14} color={colors.primary} style={{marginRight: 6}} />
            <Text style={styles.backText}>Volver</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Completá tus datos de salud</Text>
          <Text style={styles.subtitle}>
            Vito necesita estos datos para estimar tu riesgo cardiovascular. Son solo tuyos y se
            usan únicamente para la evaluación.
          </Text>
        </View>

        <Card>
          <Text style={styles.descTitle}>Datos corporales</Text>

          <Text style={styles.fieldLabel}>Peso (kg)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="Ej: 70"
            value={peso}
            onChangeText={setPeso}
          />

          <Text style={styles.fieldLabel}>Altura (cm)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="Ej: 170"
            value={altura}
            onChangeText={setAltura}
          />

          {bmi !== null && (
            <Text style={styles.bmiHint}>Tu IMC calculado: {bmi} kg/m²</Text>
          )}
        </Card>

        <Card>
          <Text style={styles.descTitle}>Presión arterial</Text>
          <Text style={styles.hint}>Si tenés el dato de tu último control, usá ese valor.</Text>

          <Text style={styles.fieldLabel}>Presión sistólica (mmHg)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="Ej: 120"
            value={bpSist}
            onChangeText={setBpSist}
          />

          <Text style={styles.fieldLabel}>Presión diastólica (mmHg)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="Ej: 80"
            value={bpDiast}
            onChangeText={setBpDiast}
          />

          <Text style={styles.hint}>Rangos aceptados: sistólica 80-200, diastólica 50-140.</Text>
        </Card>

        <Card>
          <Text style={styles.descTitle}>Factores de riesgo</Text>

          <ChipGroup
            label="Colesterol"
            options={[
              {key: 1, label: 'Normal'},
              {key: 2, label: 'Alto'},
              {key: 3, label: 'Muy alto'},
            ]}
            value={colesterol}
            onChange={v => setColesterol(v as 1 | 2 | 3)}
          />

          <ChipGroup
            label="¿Tenés diabetes?"
            options={[
              {key: false, label: 'No'},
              {key: true, label: 'Sí'},
            ]}
            value={diabetes}
            onChange={v => setDiabetes(v as boolean)}
          />

          <ChipGroup
            label="¿Fumás?"
            options={[
              {key: false, label: 'No'},
              {key: true, label: 'Sí'},
            ]}
            value={tabaquismo}
            onChange={v => setTabaquismo(v as boolean)}
          />

          <ChipGroup
            label="¿Consumís alcohol?"
            options={[
              {key: false, label: 'No'},
              {key: true, label: 'Sí'},
            ]}
            value={alcohol}
            onChange={v => setAlcohol(v as boolean)}
          />

          <ChipGroup
            label="¿Hacés actividad física?"
            options={[
              {key: false, label: 'No'},
              {key: true, label: 'Sí'},
            ]}
            value={actividad}
            onChange={v => setActividad(v as boolean)}
          />
        </Card>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <PrimaryButton title="Guardar mis datos" onPress={handleGuardar} loading={saving} />

        <Text style={styles.disclaimer}>
          Estos datos se guardan de forma segura y solo se usan para calcular tu riesgo
          cardiovascular. No reemplazan la consulta médica.
        </Text>

        <View style={{height: 24}} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  hint: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginBottom: 10,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: fontSize.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    marginBottom: 6,
  },
  bmiHint: {
    fontSize: fontSize.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 8,
    marginBottom: 6,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipText: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primaryDark,
  },
  errorText: {
    fontSize: fontSize.caption,
    color: colors.danger,
    marginBottom: 12,
    lineHeight: 18,
  },
  disclaimer: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 12,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

export default DatosPrediccionScreen;