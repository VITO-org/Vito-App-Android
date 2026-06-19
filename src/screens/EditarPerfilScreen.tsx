import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import VITOMascot from '../components/VITOMascot';
import {useSupabase} from '../context/SupabaseProvider';
import {colors, spacing, fontSize} from '../theme';
import type {SexoBiologico} from '../services/supabase/models';
import type {RootStackParamList} from '../navigation/RootNavigator';

const SEXOS: {key: SexoBiologico; label: string}[] = [
  {key: 'M', label: 'Masculino'},
  {key: 'F', label: 'Femenino'},
  {key: 'otro', label: 'Otro'},
];

/**
 * Pantalla para editar datos personales del perfil.
 * Pre-carga los valores existentes desde el perfil y permite actualizarlos.
 */
const EditarPerfilScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {session, profile, updateProfile, getUserId} = useSupabase();

  // ── Estado del formulario ──
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [dia, setDia] = useState('');
  const [mes, setMes] = useState('');
  const [anio, setAnio] = useState('');
  const [sexo, setSexo] = useState<SexoBiologico | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Cargar datos del perfil existente ──
  useEffect(() => {
    if (profile) {
      setNombre(profile.nombre ?? '');
      setApellido(profile.apellido ?? '');
      setDni(profile.dni ?? '');
      setTelefono(profile.telefono ?? '');
      setSexo(profile.sexo ?? null);

      if (profile.fecha_nac) {
        const parts = profile.fecha_nac.split('-');
        if (parts.length === 3) {
          setAnio(parts[0]);
          setMes(parts[1]);
          setDia(parts[2]);
        }
      }
    }
  }, [profile]);

  const displayName =
    profile?.nombre
      ? profile.nombre + (profile.apellido ? ` ${profile.apellido}` : '')
      : session?.user?.email?.split('@')[0] ?? 'Usuario';

  const email = session?.user?.email ?? '';

  // ── Validación ──
  const validar = (): string | null => {
    if (!nombre.trim()) return 'El nombre es obligatorio';

    if (dia.trim() || mes.trim() || anio.trim()) {
      const d = parseInt(dia, 10);
      const m = parseInt(mes, 10);
      const a = parseInt(anio, 10);
      if (d < 1 || d > 31) return 'Día inválido';
      if (m < 1 || m > 12) return 'Mes inválido';
      if (a < 1900 || a > new Date().getFullYear()) return 'Año inválido';
      const hoy = new Date();
      const nac = new Date(a, m - 1, d);
      if (nac > hoy) return 'La fecha de nacimiento es futura';
    }

    return null;
  };

  // ── Guardar ──
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

    const timeout = setTimeout(() => {
      setError('La conexión está tardando demasiado. ¿Tenés internet?');
      setLoading(false);
    }, 10000);

    try {
      let fechaNac: string | null = null;
      if (dia.trim() && mes.trim() && anio.trim()) {
        fechaNac = `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      }

      await updateProfile({
        user_id: userId,
        nombre: nombre.trim(),
        apellido: apellido.trim() || null,
        dni: dni.trim() || null,
        telefono: telefono.trim() || null,
        fecha_nac: fechaNac,
        sexo,
      });

      Alert.alert('Datos guardados', 'Tu perfil se actualizó correctamente.', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (e: unknown) {
      const msg = (e as {message?: string}).message ?? 'Error al guardar el perfil';
      setError(msg);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  // ── Render ──
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        {/* Back + título */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Datos personales</Text>
          <View style={styles.backButton} />
        </View>

        {/* Header con avatar */}
        <View style={styles.profileHeader}>
          <VITOMascot size={64} />
          <Text style={styles.userName}>{displayName}</Text>
          {email ? <Text style={styles.userEmail}>{email}</Text> : null}
        </View>

        {/* Formulario */}
        <Card>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Nombre */}
          <Text style={styles.label}>Nombre *</Text>
          <TextInput
            style={styles.input}
            placeholder="Tu nombre"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
            value={nombre}
            onChangeText={setNombre}
          />

          {/* Apellido */}
          <Text style={styles.label}>Apellido</Text>
          <TextInput
            style={styles.input}
            placeholder="Tu apellido"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
            value={apellido}
            onChangeText={setApellido}
          />

          {/* DNI */}
          <Text style={styles.label}>DNI</Text>
          <TextInput
            style={styles.input}
            placeholder="Número de documento"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            value={dni}
            onChangeText={setDni}
          />

          {/* Teléfono */}
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
          <Text style={styles.label}>Fecha de nacimiento</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateFieldSmall}>
              <TextInput
                style={styles.input}
                placeholder="DD"
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
                placeholder="MM"
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
                placeholder="AAAA"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                maxLength={4}
                value={anio}
                onChangeText={setAnio}
              />
            </View>
          </View>

          {/* Sexo biológico */}
          <Text style={styles.label}>Sexo biológico</Text>
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

          <PrimaryButton
            title="Guardar cambios"
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

  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 32,
    color: colors.primaryDark,
    fontWeight: '300',
    lineHeight: 36,
  },
  screenTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: '700',
    color: colors.primaryDark,
  },

  // ── Header ──
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 10,
  },
  userEmail: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 4,
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
});

export default EditarPerfilScreen;
