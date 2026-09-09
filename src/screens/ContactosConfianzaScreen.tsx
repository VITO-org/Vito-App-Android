import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import {useSupabase} from '../context/SupabaseProvider';
import {colors, spacing, fontSize} from '../theme';
import {normalizarTelefono, validarContacto, FRECUENCIAS, RELACIONES} from '../services/contactos';
import {
  getContactos,
  insertContacto,
  updateContacto,
  deleteContacto,
} from '../services/supabase/api';
import type {
  ContactoConfianza,
  FrecuenciaNotificacion,
  RelacionContacto,
} from '../services/supabase/models';
import type {RootStackParamList} from '../navigation/RootNavigator';

const FRECUENCIA_DEFAULT: FrecuenciaNotificacion = 'inmediata';

function labelRelacion(valor: RelacionContacto): string {
  return RELACIONES.find(r => r.valor === valor)?.label ?? valor;
}

function labelFrecuencia(valor: FrecuenciaNotificacion): string {
  return FRECUENCIAS.find(f => f.valor === valor)?.label ?? valor;
}

/**
 * Contactos de confianza (HU-16): lista de familiares/médicos con alta,
 * edición y eliminación. Acceso desde PerfilScreen. Persiste en Supabase.
 */
const ContactosConfianzaScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {session, profile, getUserId} = useSupabase();

  // ── Lista ──
  const [contactos, setContactos] = useState<ContactoConfianza[]>([]);
  const [cargando, setCargando] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  // ── Modal alta/edición ──
  const [modalVisible, setModalVisible] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [relacion, setRelacion] = useState<RelacionContacto | ''>('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [frecuencia, setFrecuencia] = useState<FrecuenciaNotificacion>(FRECUENCIA_DEFAULT);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cargarContactos = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;
    try {
      setListError(null);
      const data = await getContactos(userId, session?.access_token);
      setContactos(data);
    } catch (e: unknown) {
      setListError(
        (e as {message?: string}).message ?? 'No se pudieron cargar los contactos',
      );
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [getUserId, session]);

  // Refetch al enfocar la pantalla: refleja add/edit/delete hechos acá mismo.
  useFocusEffect(
    useCallback(() => {
      cargarContactos();
    }, [cargarContactos]),
  );

  const onRefresh = useCallback(() => {
    setRefrescando(true);
    cargarContactos();
  }, [cargarContactos]);

  // ── Modal ──
  const cerrarModal = useCallback(() => {
    setModalVisible(false);
    setEditandoId(null);
    setNombre('');
    setRelacion('');
    setTelefono('');
    setEmail('');
    setFrecuencia(FRECUENCIA_DEFAULT);
    setFormError(null);
    setGuardando(false);
  }, []);

  const abrirAlta = useCallback(() => {
    cerrarModal();
    setModalVisible(true);
  }, [cerrarModal]);

  const abrirEdicion = useCallback(
    (contacto: ContactoConfianza) => {
      cerrarModal();
      setEditandoId(contacto.id);
      setModalVisible(true);
    },
    [cerrarModal],
  );

  // Modo edición: precargar valores del item (design doc 4.3).
  useEffect(() => {
    if (!editandoId) return;
    const c = contactos.find(x => x.id === editandoId);
    if (!c) return;
    setNombre(c.nombre);
    setRelacion(c.relacion);
    setTelefono(c.telefono);
    setEmail(c.email);
    setFrecuencia(c.frecuencia_notificacion);
  }, [editandoId, contactos]);

  const confirmarEliminar = useCallback(
    (contacto: ContactoConfianza) => {
      const userId = getUserId();
      if (!userId) return;
      Alert.alert(
        'Eliminar contacto',
        `¿Seguro que querés eliminar a ${contacto.nombre}?`,
        [
          {text: 'Cancelar', style: 'cancel'},
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteContacto(contacto.id, userId, session?.access_token);
                cargarContactos();
              } catch (e: unknown) {
                Alert.alert(
                  'Error',
                  (e as {message?: string}).message ?? 'No se pudo eliminar.',
                );
              }
            },
          },
        ],
      );
    },
    [getUserId, session, cargarContactos],
  );

  const handleGuardar = useCallback(async () => {
    const form = {nombre, relacion, telefono, email, frecuencia_notificacion: frecuencia};
    const err = validarContacto(form, {
      email: session?.user?.email,
      telefono: profile?.telefono ?? null,
    });
    if (err) {
      setFormError(err);
      return;
    }

    const userId = getUserId();
    if (!userId) {
      setFormError('Sesión no disponible. Reiniciá la app.');
      return;
    }

    setFormError(null);
    setGuardando(true);
    try {
      if (editandoId) {
        await updateContacto(
          editandoId,
          {
            nombre: nombre.trim(),
            relacion: relacion as RelacionContacto,
            telefono: normalizarTelefono(telefono),
            email: email.trim().toLowerCase(),
            frecuencia_notificacion: frecuencia,
          },
          session?.access_token,
        );
      } else {
        await insertContacto(
          {
            id_usuario: userId,
            nombre: nombre.trim(),
            relacion: relacion as RelacionContacto,
            telefono: normalizarTelefono(telefono),
            email: email.trim().toLowerCase(),
            frecuencia_notificacion: frecuencia,
          },
          session?.access_token,
        );
      }
      cerrarModal();
      cargarContactos();
    } catch (e: unknown) {
      setFormError(
        (e as {message?: string}).message ?? 'No se pudo guardar el contacto',
      );
    } finally {
      setGuardando(false);
    }
  }, [
    nombre,
    relacion,
    telefono,
    email,
    frecuencia,
    editandoId,
    session,
    profile,
    getUserId,
    cerrarModal,
    cargarContactos,
  ]);

  const renderContacto = useCallback(
    ({item}: {item: ContactoConfianza}) => (
      <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.cardNombre}>{item.nombre}</Text>
          <View style={styles.relacionBadge}>
            <Text style={styles.relacionBadgeText}>{labelRelacion(item.relacion)}</Text>
          </View>
        </View>

        <View style={styles.cardContacto}>
          <Text style={styles.cardContactoLine}>📞 {item.telefono}</Text>
          <Text style={styles.cardContactoLine}>✉️ {item.email}</Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.frecuenciaLabel}>
            Frecuencia: {labelFrecuencia(item.frecuencia_notificacion)}
          </Text>
          <View style={styles.cardAcciones}>
            <TouchableOpacity onPress={() => abrirEdicion(item)} hitSlop={8}>
              <Text style={styles.accionEditar}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => confirmarEliminar(item)} hitSlop={8}>
              <Text style={styles.accionEliminar}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    ),
    [abrirEdicion, confirmarEliminar],
  );

  const listaVacia = (
    <Card>
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>👥</Text>
        <Text style={styles.emptyTitle}>Sin contactos</Text>
        <Text style={styles.emptyHint}>
          Agregá familiares o médicos de confianza para compartir alertas y reportes.
        </Text>
      </View>
    </Card>
  );

  return (
    <View style={styles.screen}>
      {/* Top bar: back + título (patrón EditarPerfilScreen) */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Contactos de confianza</Text>
        <View style={styles.backButton} />
      </View>

      {cargando ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loadingSpinner} />
      ) : (
        <FlatList
          data={contactos}
          keyExtractor={c => c.id}
          renderItem={renderContacto}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={listaVacia}
        />
      )}

      {listError && <Text style={styles.listErrorText}>{listError}</Text>}

      {/* Footer fijo */}
      <View style={styles.footer}>
        <PrimaryButton
          title="Agregar contacto"
          onPress={abrirAlta}
          style={styles.footerButton}
        />
      </View>

      {/* Modal bottom-sheet de alta/edición */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={cerrarModal}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>
                {editandoId ? 'Editar contacto' : 'Nuevo contacto'}
              </Text>

              {formError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              )}

              {/* Nombre */}
              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre completo"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                value={nombre}
                onChangeText={setNombre}
              />

              {/* Relación (selector segmentado) */}
              <Text style={styles.label}>Relación *</Text>
              <View style={styles.segmentRow}>
                {RELACIONES.map(r => (
                  <TouchableOpacity
                    key={r.valor}
                    activeOpacity={0.7}
                    style={[
                      styles.segmentButton,
                      relacion === r.valor && styles.segmentButtonActive,
                    ]}
                    onPress={() => setRelacion(r.valor)}>
                    <Text
                      style={[
                        styles.segmentText,
                        relacion === r.valor && styles.segmentTextActive,
                      ]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Teléfono */}
              <Text style={styles.label}>Teléfono *</Text>
              <TextInput
                style={styles.input}
                placeholder="+54 11 5555-1234"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                value={telefono}
                onChangeText={setTelefono}
              />

              {/* Email */}
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="contacto@ejemplo.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              {/* Frecuencia (selector segmentado) */}
              <Text style={styles.label}>Frecuencia de notificación</Text>
              <View style={styles.frecuenciaWrap}>
                {FRECUENCIAS.map(f => (
                  <TouchableOpacity
                    key={f.valor}
                    activeOpacity={0.7}
                    style={[
                      styles.frecuenciaButton,
                      frecuencia === f.valor && styles.frecuenciaButtonActive,
                    ]}
                    onPress={() => setFrecuencia(f.valor)}>
                    <Text
                      style={[
                        styles.frecuenciaOptionText,
                        frecuencia === f.valor && styles.frecuenciaOptionTextActive,
                      ]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <PrimaryButton
                title="Guardar contacto"
                onPress={handleGuardar}
                loading={guardando}
                style={styles.saveButton}
              />
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={cerrarModal}
                disabled={guardando}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screenPaddingHorizontal,
  },

  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: spacing.screenPaddingTop,
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

  loadingSpinner: {
    marginTop: 48,
  },

  // ── Lista ──
  listContent: {
    paddingBottom: 16,
    paddingTop: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardNombre: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 1,
    marginRight: 8,
  },
  relacionBadge: {
    backgroundColor: colors.successLight,
    borderRadius: spacing.badgeBorderRadius,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  relacionBadgeText: {
    fontSize: fontSize.badge,
    fontWeight: '600',
    color: colors.success,
  },
  cardContacto: {
    gap: 4,
    marginBottom: 10,
  },
  cardContactoLine: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  frecuenciaLabel: {
    fontSize: fontSize.caption,
    color: colors.textPrimary,
    fontWeight: '500',
    flexShrink: 1,
    marginRight: 8,
  },
  cardAcciones: {
    flexDirection: 'row',
    gap: 16,
  },
  accionEditar: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.primary,
  },
  accionEliminar: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.danger,
  },

  // ── Estado vacío ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyHint: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },

  listErrorText: {
    fontSize: fontSize.caption,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 8,
  },

  // ── Footer fijo ──
  footer: {
    paddingBottom: 24,
    paddingTop: 8,
  },
  footerButton: {
    alignSelf: 'stretch',
  },

  // ── Modal bottom-sheet ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: 20,
    paddingBottom: 28,
  },
  modalTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
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

  // ── Selector segmentado ──
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  segmentButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.successLight,
  },
  segmentText: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.primary,
  },

  frecuenciaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  frecuenciaButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  frecuenciaButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.successLight,
  },
  frecuenciaOptionText: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  frecuenciaOptionTextActive: {
    color: colors.primary,
  },

  saveButton: {
    marginTop: 20,
  },
  modalCancel: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});

export default ContactosConfianzaScreen;