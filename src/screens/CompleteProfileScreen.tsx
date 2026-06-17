import React, {useState, useCallback} from 'react';
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
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import VITOMascot from '../components/VITOMascot';
import {useSupabase} from '../context/SupabaseProvider';
import {colors, spacing, fontSize} from '../theme';
import type {SexoBiologico} from '../services/supabase/models';

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

/**
 * Pantalla de finalización de perfil que aparece después del registro.
 * Recopila datos personales (nombre, apellido, fecha de nacimiento, sexo)
 * y datos clínicos básicos (altura, peso).
 */
const CompleteProfileScreen: React.FC = () => {
  const {session, updateProfile, updateClinicalConfig, getUserId} = useSupabase();

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dia, setDia] = useState('');
  const [mes, setMes] = useState('');
  const [anio, setAnio] = useState('');
  const [sexo, setSexo] = useState<SexoBiologico | null>(null);
  const [altura, setAltura] = useState('');
  const [peso, setPeso] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    setError(null);
    setLoading(true);
    // Timeout de seguridad: si la API no responde en 10s, mostramos error
    const timeout = setTimeout(() => {
      setError('La conexión está tardando demasiado. ¿Tenés internet?');
      setLoading(false);
    }, 10000);

    try {
      const fechaNac = `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      // Guardar datos personales en perfil_usuario (crítico — esperamos)
      await updateProfile({
        user_id: userId,
        nombre: nombre.trim(),
        apellido: apellido.trim() || null,
        fecha_nac: fechaNac,
        sexo,
      });
      // Guardar altura y peso en datos_clinicos_config (no crítico — en background)
      if (altura.trim() || peso.trim()) {
        updateClinicalConfig({
          id_usuario: userId,
          altura_cm: altura.trim() ? parseFloat(altura) : null,
          peso_kg: peso.trim() ? parseFloat(peso) : null,
        }).catch(() => {
          // No bloquear la UI si falla la sincronización de altura/peso
        });
      }
      // El RootNavigator detecta needsProfile=false y muestra MainTabs automáticamente
    } catch (e: unknown) {
      const msg = (e as {message?: string}).message ?? 'Error al guardar el perfil';
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
          <VITOMascot size={56} />
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
});

export default CompleteProfileScreen;
