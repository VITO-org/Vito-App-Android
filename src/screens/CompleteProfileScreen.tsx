import React, {useState, useCallback, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useNavigation, CommonActions} from '@react-navigation/native';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import VitoAvatar from '../components/VitoAvatar';
import {useSupabase} from '../context/SupabaseProvider';
import {colors, spacing, fontSize} from '../theme';
import type {SexoBiologico} from '../services/supabase/models';
import {supabase} from '../services/supabase/client';
import {upsertBaseline} from '../services/supabase/api';

/** Test rápido: hace un HEAD a la API de Supabase para ver si responde */
async function testSupabaseConnection(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      'https://rkgbedehkfpiylaubjbo.supabase.co/rest/v1/',
      {
        method: 'HEAD',
        headers: {'Accept': 'application/json'},
        signal: controller.signal,
      },
    );
    clearTimeout(id);
    console.warn(`[testSupabaseConnection] status=${res.status}`);
    return res.ok || res.status === 401;
    // 401 = autenticación requerida (normal para REST sin auth)
  } catch (e) {
    console.warn('[testSupabaseConnection] Error:', e);
    return false;
  }
}

type FormField = keyof typeof fieldMeta;

const fieldMeta = {
  nombre: {label: 'Nombre *', placeholder: 'Tu nombre', keyboard: 'default' as const},
  apellido: {label: 'Apellido', placeholder: 'Tu apellido', keyboard: 'default' as const},
  dia: {label: 'Día', placeholder: 'DD', keyboard: 'numeric' as const},
  mes: {label: 'Mes', placeholder: 'MM', keyboard: 'numeric' as const},
  anio: {label: 'Año', placeholder: 'AAAA', keyboard: 'numeric' as const},
  altura: {label: 'Altura (cm)', placeholder: 'Ej: 170', keyboard: 'numeric' as const},
  peso: {label: 'Peso (kg)', placeholder: 'Ej: 70', keyboard: 'numeric' as const},
};

const SEXOS: {key: SexoBiologico; label: string}[] = [
  {key: 'M', label: 'Masculino'},
  {key: 'F', label: 'Femenino'},
  {key: 'otro', label: 'Otro'},
];

/** Rangos normales orientativos para cada signo vital */
const VITAL_RANGES = {
  presionSist: {min: 90, max: 119, unit: 'mmHg', label: 'Presión sistólica'},
  presionDiast: {min: 60, max: 79, unit: 'mmHg', label: 'Presión diastólica'},
  frecCardiaca: {min: 60, max: 100, unit: 'lpm', label: 'Frec. cardíaca'},
  temperatura: {min: 36.5, max: 37.3, unit: '°C', label: 'Temperatura'},
  oxigenacion: {min: 95, max: 100, unit: '%', label: 'SpO₂'},
};

/**
 * Pantalla de finalización de perfil que aparece después del registro.
 * Recopila datos personales (nombre, apellido, fecha de nacimiento, sexo)
 * y datos clínicos básicos (altura, peso + signos vitales iniciales).
 */
const CompleteProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const {session, updateProfile, updateClinicalConfig, getUserId} = useSupabase();

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [dia, setDia] = useState('');
  const [mes, setMes] = useState('');
  const [anio, setAnio] = useState('');
  const [sexo, setSexo] = useState<SexoBiologico | null>(null);
  const [altura, setAltura] = useState('');
  const [peso, setPeso] = useState('');

  // ── Signos vitales iniciales (baseline) ──
  const [showVitals, setShowVitals] = useState(false);
  const [presionSist, setPresionSist] = useState('');
  const [presionDiast, setPresionDiast] = useState('');
  const [frecCardiaca, setFrecCardiaca] = useState('');
  const [temperatura, setTemperatura] = useState('');
  const [oxigenacion, setOxigenacion] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestDoneRef = useRef(false); // Evita race-condition timeout vs respuesta

  /** Verifica si un valor numérico está fuera del rango normal */
  const isOutOfRange = (value: string, min: number, max: number): boolean => {
    const num = parseFloat(value);
    if (isNaN(num) || !value.trim()) return false;
    return num < min || num > max;
  };

  /** Estilo dinámico para inputs: borde rojo si fuera de rango */
  const getVitalInputStyle = (value: string, min: number, max: number) => {
    return isOutOfRange(value, min, max) ? styles.inputOutOfRange : styles.input;
  };

  const calcularEdad = useCallback((): number | null => {
    const d = parseInt(dia, 10);
    const m = parseInt(mes, 10);
    const a = parseInt(anio, 10);
    if (!d || !m || !a) return null;
    const hoy = new Date();
    const nac = new Date(a, m - 1, d);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const mesDiff = hoy.getMonth() - nac.getMonth();
    if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < nac.getDate())) {
      edad--;
    }
    return edad;
  }, [dia, mes, anio]);

  const validar = (): string | null => {
    if (!nombre.trim()) return 'El nombre es obligatorio';

    const d = parseInt(dia, 10);
    const m = parseInt(mes, 10);
    const a = parseInt(anio, 10);
    if (!d || !m || !a) return 'Completá la fecha de nacimiento';
    if (d < 1 || d > 31) return 'Día inválido';
    if (m < 1 || m > 12) return 'Mes inválido';
    if (a < 1900 || a > new Date().getFullYear()) return 'Año inválido';

    const edad = calcularEdad();
    if (edad != null && edad < 0) return 'La fecha de nacimiento es futura';
    if (edad != null && edad > 120) return 'Revisá el año de nacimiento';

    if (!sexo) return 'Seleccioná tu sexo biológico';

    if (altura.trim()) {
      const h = parseFloat(altura);
      if (isNaN(h) || h < 50 || h > 280) return 'La altura debe estar entre 50 y 280 cm';
    }
    if (peso.trim()) {
      const w = parseFloat(peso);
      if (isNaN(w) || w < 10 || w > 500) return 'El peso debe estar entre 10 y 500 kg';
    }

    // ── Validación de signos vitales (solo si se ingresaron) ──
    if (showVitals) {
      if (presionSist.trim()) {
        const ps = parseInt(presionSist, 10);
        if (isNaN(ps) || ps < 60 || ps > 300) return 'La presión sistólica debe estar entre 60 y 300 mmHg';
      }
      if (presionDiast.trim()) {
        const pd = parseInt(presionDiast, 10);
        if (isNaN(pd) || pd < 30 || pd > 200) return 'La presión diastólica debe estar entre 30 y 200 mmHg';
      }
      if (presionSist.trim() && presionDiast.trim()) {
        const ps = parseInt(presionSist, 10);
        const pd = parseInt(presionDiast, 10);
        if (!isNaN(ps) && !isNaN(pd) && pd >= ps) return 'La presión diastólica debe ser menor a la sistólica';
      }
      if (frecCardiaca.trim()) {
        const fc = parseInt(frecCardiaca, 10);
        if (isNaN(fc) || fc < 30 || fc > 250) return 'La frecuencia cardíaca debe estar entre 30 y 250 lpm';
      }
      if (temperatura.trim()) {
        const t = parseFloat(temperatura);
        if (isNaN(t) || t < 30 || t > 45) return 'La temperatura debe estar entre 30 y 45 °C';
      }
      if (oxigenacion.trim()) {
        const o = parseInt(oxigenacion, 10);
        if (isNaN(o) || o < 50 || o > 100) return 'La oxigenación debe estar entre 50 y 100 %';
      }
    }

    return null;
  };

  const handleSave = async () => {
    const err = validar();
    if (err) {
      setError(err);
      return;
    }

    const userId = getUserId();
    if (!userId) {
      setError('Sesión no disponible. Reiniciá la app.');
      return;
    }

    // Log para diagnosticar conectividad
    console.warn(`[CompleteProfile] userId=${userId}, session=${session?.access_token?.slice(0,10)}...`);

    setError(null);
    setLoading(true);
    requestDoneRef.current = false;

    // Timeout extendido a 45s
    const timeout = setTimeout(() => {
      if (!requestDoneRef.current) {
        console.warn('[CompleteProfile] TIMEOUT 45s alcanzado — la request no respondió');
        setError('La conexión está tardando demasiado. ¿Tenés internet? (45s)');
        setLoading(false);
      }
    }, 45000);

    try {
      const fechaNac = `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      const profileData = {
        id_usuario: userId,
        nombre: nombre.trim(),
        apellido: apellido.trim() || null,
        dni: dni.trim() || null,
        telefono: telefono.trim() || null,
        fecha_nac: fechaNac,
        sexo,
        altura_cm: altura.trim() ? parseFloat(altura) : null,
        peso_kg: peso.trim() ? parseFloat(peso) : null,
      };

      // ── Preparar baseline si hay datos de signos vitales ──
      const hasVitals = showVitals && (
        presionSist.trim() ||
        presionDiast.trim() ||
        frecCardiaca.trim() ||
        temperatura.trim() ||
        oxigenacion.trim()
      );

      const baselinePromise = hasVitals
        ? upsertBaseline({
            id_usuario: userId,
            hr_min: frecCardiaca.trim() ? parseInt(frecCardiaca, 10) : null,
            hr_max: frecCardiaca.trim() ? parseInt(frecCardiaca, 10) : null,
            bp_sist_min: presionSist.trim() ? parseInt(presionSist, 10) : null,
            bp_sist_max: presionSist.trim() ? parseInt(presionSist, 10) : null,
            bp_diast_min: presionDiast.trim() ? parseInt(presionDiast, 10) : null,
            bp_diast_max: presionDiast.trim() ? parseInt(presionDiast, 10) : null,
            spo2_min: oxigenacion.trim() ? parseFloat(oxigenacion) : null,
            temp_min: temperatura.trim() ? parseFloat(temperatura) : null,
            temp_max: temperatura.trim() ? parseFloat(temperatura) : null,
          })
        : null;

      // ── Ejecutar perfil + baseline en paralelo ──
      await Promise.all([
        updateProfile(profileData),
        baselinePromise,
      ]);

      requestDoneRef.current = true;
      // Reset del stack para ir a MainTabs (no hay pantalla anterior en el stack)
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{name: 'MainTabs'}],
        }),
      );
    } catch (e: unknown) {
      requestDoneRef.current = true;
      const err = e as Error & {status?: number; code?: string};
      console.warn('[CompleteProfile] Error:', err.message, '| status:', err.status, '| code:', err.code);
      // Mostrar el error real de Supabase
      const msg = err.message ?? 'Error al guardar el perfil';
      setError(msg);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const edad = calcularEdad();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <VitoAvatar size={56} />
          <Text style={styles.title}>Completá tu perfil</Text>
          <Text style={styles.subtitle}>
            Estos datos nos ayudan a personalizar tu experiencia en VITO
          </Text>
        </View>

        {/* Formulario */}
        <Card>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Nombre y Apellido */}
          <Text style={styles.label}>{fieldMeta.nombre.label}</Text>
          <TextInput
            style={styles.input}
            placeholder={fieldMeta.nombre.placeholder}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
            value={nombre}
            onChangeText={setNombre}
          />

          <Text style={styles.label}>{fieldMeta.apellido.label}</Text>
          <TextInput
            style={styles.input}
            placeholder={fieldMeta.apellido.placeholder}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
            value={apellido}
            onChangeText={setApellido}
          />

          <Text style={styles.label}>DNI</Text>
          <TextInput
            style={styles.input}
            placeholder="Número de documento"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            value={dni}
            onChangeText={setDni}
          />

          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: +54 11 5555-1234"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
            value={telefono}
            onChangeText={setTelefono}
          />

          {/* Fecha de nacimiento */}
          <Text style={styles.label}>Fecha de nacimiento *</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateFieldSmall}>
              <TextInput
                style={styles.input}
                placeholder={fieldMeta.dia.placeholder}
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                maxLength={2}
                value={dia}
                onChangeText={setDia}
              />
            </View>
            <Text style={styles.dateSep}>/</Text>
            <View style={styles.dateFieldSmall}>
              <TextInput
                style={styles.input}
                placeholder={fieldMeta.mes.placeholder}
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                maxLength={2}
                value={mes}
                onChangeText={setMes}
              />
            </View>
            <Text style={styles.dateSep}>/</Text>
            <View style={styles.dateFieldLarge}>
              <TextInput
                style={styles.input}
                placeholder={fieldMeta.anio.placeholder}
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                maxLength={4}
                value={anio}
                onChangeText={setAnio}
              />
            </View>
          </View>

          {/* Edad calculada */}
          {edad != null && (
            <View style={styles.ageBadge}>
              <Text style={styles.ageText}>Edad: {edad} años</Text>
            </View>
          )}

          {/* Sexo biológico */}
          <Text style={styles.label}>Sexo biológico *</Text>
          <View style={styles.sexoRow}>
            {SEXOS.map(s => (
              <TouchableOpacity
                key={s.key}
                activeOpacity={0.7}
                style={[styles.sexoButton, sexo === s.key && styles.sexoButtonActive]}
                onPress={() => setSexo(s.key)}>
                <Text
                  style={[styles.sexoText, sexo === s.key && styles.sexoTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sección de signos vitales (colapsable) */}
          <TouchableOpacity
            style={styles.vitalsToggle}
            activeOpacity={0.7}
            onPress={() => setShowVitals(!showVitals)}>
            <Text style={styles.vitalsToggleText}>
              {showVitals ? '▾' : '▸'} Signos vitales iniciales (opcional)
            </Text>
            <Text style={styles.vitalsToggleHint}>
              {showVitals ? 'Ocultar' : 'Presión, frecuencia cardíaca, temperatura, oxigenación'}
            </Text>
          </TouchableOpacity>

          {showVitals && (
            <View style={styles.vitalsSection}>
              {/* Presión arterial */}
              <View style={styles.measureRow}>
                <View style={styles.measureField}>
                  <Text style={styles.label}>Presión sistólica (mmHg)</Text>
                  <TextInput
                    style={getVitalInputStyle(presionSist, VITAL_RANGES.presionSist.min, VITAL_RANGES.presionSist.max)}
                    placeholder="Ej: 120"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={presionSist}
                    onChangeText={setPresionSist}
                  />
                  <Text style={styles.rangeHint}>Normal: 90–119 mmHg</Text>
                </View>
                <View style={styles.measureField}>
                  <Text style={styles.label}>Presión diastólica (mmHg)</Text>
                  <TextInput
                    style={getVitalInputStyle(presionDiast, VITAL_RANGES.presionDiast.min, VITAL_RANGES.presionDiast.max)}
                    placeholder="Ej: 80"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={presionDiast}
                    onChangeText={setPresionDiast}
                  />
                  <Text style={styles.rangeHint}>Normal: 60–79 mmHg</Text>
                </View>
              </View>

              {/* Frecuencia cardíaca y temperatura */}
              <View style={styles.measureRow}>
                <View style={styles.measureField}>
                  <Text style={styles.label}>Frec. cardíaca (lpm)</Text>
                  <TextInput
                    style={getVitalInputStyle(frecCardiaca, VITAL_RANGES.frecCardiaca.min, VITAL_RANGES.frecCardiaca.max)}
                    placeholder="Ej: 72"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={frecCardiaca}
                    onChangeText={setFrecCardiaca}
                  />
                  <Text style={styles.rangeHint}>Normal: 60–100 lpm</Text>
                </View>
                <View style={styles.measureField}>
                  <Text style={styles.label}>Temperatura (°C)</Text>
                  <TextInput
                    style={getVitalInputStyle(temperatura, VITAL_RANGES.temperatura.min, VITAL_RANGES.temperatura.max)}
                    placeholder="Ej: 36.8"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={temperatura}
                    onChangeText={setTemperatura}
                  />
                  <Text style={styles.rangeHint}>Normal: 36.5–37.3 °C</Text>
                </View>
              </View>

              {/* Oxigenación */}
              <Text style={styles.label}>Oxigenación (SpO2 %)</Text>
              <TextInput
                style={getVitalInputStyle(oxigenacion, VITAL_RANGES.oxigenacion.min, VITAL_RANGES.oxigenacion.max)}
                placeholder="Ej: 98"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={oxigenacion}
                onChangeText={setOxigenacion}
              />
              <Text style={styles.rangeHint}>Normal: 95–100 %</Text>
            </View>
          )}

          {/* Altura y Peso */}
          <View style={styles.measureRow}>
            <View style={styles.measureField}>
              <Text style={styles.label}>{fieldMeta.altura.label}</Text>
              <TextInput
                style={styles.input}
                placeholder={fieldMeta.altura.placeholder}
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={altura}
                onChangeText={setAltura}
              />
            </View>
            <View style={styles.measureField}>
              <Text style={styles.label}>{fieldMeta.peso.label}</Text>
              <TextInput
                style={styles.input}
                placeholder={fieldMeta.peso.placeholder}
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={peso}
                onChangeText={setPeso}
              />
            </View>
          </View>

          <PrimaryButton
            title="Guardar y continuar"
            onPress={handleSave}
            loading={loading}
            style={styles.button}
          />
        </Card>

        <View style={{height: 40}} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.screenPaddingTop,
    paddingBottom: spacing.screenPaddingBottom,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: 12,
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Form ──
  errorBox: {
    backgroundColor: colors.dangerLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  errorText: {
    fontSize: fontSize.caption,
    color: colors.danger,
    textAlign: 'center',
  },
  label: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: fontSize.body,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundLight,
  },
  inputOutOfRange: {
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: fontSize.body,
    color: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  button: {
    marginTop: 20,
  },

  // ── Date ──
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateFieldSmall: {
    flex: 1,
  },
  dateFieldLarge: {
    flex: 2,
  },
  dateSep: {
    fontSize: 20,
    color: colors.textSecondary,
    marginTop: 24,
    fontWeight: '600',
  },
  ageBadge: {
    backgroundColor: colors.successLight,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  ageText: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.success,
  },

  // ── Sexo ──
  sexoRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  sexoButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  sexoButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.successLight,
  },
  sexoText: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sexoTextActive: {
    color: colors.primary,
  },

  // ── Measurements ──
  measureRow: {
    flexDirection: 'row',
    gap: 12,
  },
  measureField: {
    flex: 1,
  },

  // ── Vitals toggle ──
  vitalsToggle: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.backgroundLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vitalsToggleText: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.primary,
  },
  vitalsToggleHint: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  vitalsSection: {
    marginTop: 12,
    gap: 4,
  },
  rangeHint: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 4,
    fontStyle: 'italic',
  },
});

export default CompleteProfileScreen;
