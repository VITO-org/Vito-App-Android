import React, {useState} from 'react';
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
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import {useSupabase} from '../context/SupabaseProvider';
import {colors, spacing, fontSize} from '../theme';
import type {RootStackParamList} from '../navigation/RootNavigator';

type LoginNav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginNav>();
  const {signIn, signInWithGoogle} = useSupabase();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Completa todos los campos');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: unknown) {
      const msg = (e as {message?: string}).message ?? 'Error al iniciar sesión';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: unknown) {
      const msg = (e as {message?: string}).message ?? 'Error con Google';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Iniciar sesión</Text>
          <Text style={styles.subtitle}>
            Accede a tu cuenta de VITO Salud
          </Text>
        </View>

        <Card>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            placeholder="correo@ejemplo.com"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="Tu contraseña"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
          />

          <PrimaryButton
            title="Iniciar sesión"
            onPress={handleSignIn}
            loading={loading}
            style={styles.button}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <PrimaryButton
            title="Iniciar sesión con Google"
            onPress={handleGoogleSignIn}
            variant="secondary"
            loading={loading}
            style={styles.button}
          />
        </Card>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate('Register')}>
          <Text style={styles.linkText}>
            ¿No tienes cuenta?{' '}
            <Text style={styles.linkBold}>Regístrate</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.screenPaddingTop,
    paddingBottom: spacing.screenPaddingBottom,
    justifyContent: 'center',
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    marginTop: 6,
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
    marginTop: 18,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: fontSize.body,
    color: colors.textSecondary,
  },
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
  linkRow: {
    alignItems: 'center',
    marginTop: 20,
  },
  linkText: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
  },
  linkBold: {
    fontWeight: '700',
    color: colors.primary,
  },
});

export default LoginScreen;
