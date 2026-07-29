import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSupabase} from '../context/SupabaseProvider';
import {getSintomasCatalogo, insertSintomaUsuario} from '../services/supabase/api';
import type {Sintoma, CatSintoma} from '../services/supabase/models';
import {colors, spacing, fontSize} from '../theme';

// ── Datos del catálogo precargado (fallback si Supabase no tiene la tabla) ──
const CATALOGO_SINTOMAS: {categoria: CatSintoma; icono: string; nombre: string}[] = [
  // Cardiovascular
  {categoria: 'fisico', icono: '❤️', nombre: 'Palpitaciones'},
  {categoria: 'fisico', icono: '❤️', nombre: 'Latidos irregulares'},
  {categoria: 'fisico', icono: '❤️', nombre: 'Corazón acelerado'},
  {categoria: 'fisico', icono: '❤️', nombre: 'Dolor en el pecho'},
  {categoria: 'fisico', icono: '❤️', nombre: 'Opresión en el pecho'},
  // Respiratorio
  {categoria: 'fisico', icono: '🫁', nombre: 'Falta de aire'},
  {categoria: 'fisico', icono: '🫁', nombre: 'Dificultad para respirar'},
  {categoria: 'fisico', icono: '🫁', nombre: 'Respiración rápida'},
  {categoria: 'fisico', icono: '🫁', nombre: 'Tos'},
  {categoria: 'fisico', icono: '🫁', nombre: 'Silbidos al respirar'},
  {categoria: 'fisico', icono: '🫁', nombre: 'Sensación de ahogo'},
  // Neurológico
  {categoria: 'fisico', icono: '🧠', nombre: 'Mareos'},
  {categoria: 'fisico', icono: '🧠', nombre: 'Sensación de desmayo'},
  {categoria: 'fisico', icono: '🧠', nombre: 'Desmayo'},
  {categoria: 'fisico', icono: '🧠', nombre: 'Confusión / desorientación'},
  {categoria: 'fisico', icono: '🧠', nombre: 'Dolor de cabeza'},
  // General
  {categoria: 'fisico', icono: '🧍', nombre: 'Fatiga'},
  {categoria: 'fisico', icono: '🧍', nombre: 'Debilidad'},
  {categoria: 'fisico', icono: '🧍', nombre: 'Sudoración excesiva'},
  {categoria: 'fisico', icono: '🧍', nombre: 'Escalofríos'},
  // Digestivo
  {categoria: 'fisico', icono: '🤢', nombre: 'Náuseas'},
  {categoria: 'fisico', icono: '🤢', nombre: 'Vómitos'},
  // Signos visibles
  {categoria: 'fisico', icono: '⚠️', nombre: 'Labios azulados'},
  {categoria: 'fisico', icono: '⚠️', nombre: 'Uñas azuladas'},
  {categoria: 'fisico', icono: '⚠️', nombre: 'Palidez'},
  // ── Emocional ──
  {categoria: 'emocional', icono: '😰', nombre: 'Ansioso/a'},
  {categoria: 'emocional', icono: '😣', nombre: 'Estresado/a'},
  {categoria: 'emocional', icono: '😨', nombre: 'Asustado/a / con miedo'},
  {categoria: 'emocional', icono: '😵', nombre: 'Abrumado/a'},
  {categoria: 'emocional', icono: '😠', nombre: 'Irritable'},
  {categoria: 'emocional', icono: '😡', nombre: 'Enojado/a'},
  {categoria: 'emocional', icono: '😔', nombre: 'Triste'},
  {categoria: 'emocional', icono: '😞', nombre: 'Desanimado/a'},
  {categoria: 'emocional', icono: '😶', nombre: 'Indiferente / sin ganas'},
  {categoria: 'emocional', icono: '😴', nombre: 'Cansancio emocional'},
  {categoria: 'emocional', icono: '😖', nombre: 'Nervioso/a'},
  {categoria: 'emocional', icono: '🫨', nombre: 'Inquieto/a'},
  {categoria: 'emocional', icono: '🧠', nombre: 'Dificultad para concentrarse'},
  {categoria: 'emocional', icono: '😌', nombre: 'Tranquilo/a'},
  {categoria: 'emocional', icono: '😊', nombre: 'Feliz / de buen ánimo'},
];

type SintomaSeleccionado = Sintoma & {
  intensidad: number;
  descripcion: string;
  fecha: string;
  hora: string;
};

const INTENSIDADES = [
  {value: 1, label: '1', color: '#86EFAC'},
  {value: 2, label: '2', color: '#FDE68A'},
  {value: 3, label: '3', color: '#FDBA74'},
  {value: 4, label: '4', color: '#FCA5A5'},
  {value: 5, label: '5', color: '#EF4444'},
];

const RegistrarSintomaScreen: React.FC = () => {
  const navigation = useNavigation();
  const {session} = useSupabase();

  const [catalogo, setCatalogo] = useState<Sintoma[]>([]);
  const [seleccionados, setSeleccionados] = useState<SintomaSeleccionado[]>([]);
  const [showCatalogo, setShowCatalogo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterCategoria, setFilterCategoria] = useState<CatSintoma | 'todos'>('todos');

  // Cargar catálogo desde Supabase o usar fallback local
  const cargarCatalogo = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSintomasCatalogo();
      console.log('[Sintomas] Supabase respondió:', data.length, 'síntomas');
      if (data.length > 0) {
        setCatalogo(data);
      } else {
        console.log('[Sintomas] Supabase vacío, usando fallback local');
        setCatalogo(
          CATALOGO_SINTOMAS.map((s, i) => ({
            id_sintomas: `local-${i}`,
            nombre: s.nombre,
            descripcion: null,
            categoria: s.categoria,
            icono: s.icono,
            activo: true,
            created_at: null,
          })),
        );
      }
    } catch (err) {
      console.log('[Sintomas] Error Supabase:', err, '- usando fallback local');
      // Fallback si la tabla no existe aún
      setCatalogo(
        CATALOGO_SINTOMAS.map((s, i) => ({
          id_sintomas: `local-${i}`,
          nombre: s.nombre,
          descripcion: null,
          categoria: s.categoria,
          icono: s.icono,
          activo: true,
          created_at: null,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarCatalogo();
  }, [cargarCatalogo]);

  const hoy = new Date().toISOString().split('T')[0];
  const ahora = new Date().toTimeString().slice(0, 5);

  const toggleSeleccion = (sintoma: Sintoma) => {
    setSeleccionados(prev => {
      const exists = prev.find(s => s.id_sintomas === sintoma.id_sintomas);
      if (exists) {
        return prev.filter(s => s.id_sintomas !== sintoma.id_sintomas);
      }
      return [
        ...prev,
        {
          ...sintoma,
          intensidad: 3,
          descripcion: '',
          fecha: hoy,
          hora: ahora,
        },
      ];
    });
  };

  const updateSeleccionado = (
    id_sintomas: string,
    field: keyof SintomaSeleccionado,
    value: string | number,
  ) => {
    setSeleccionados(prev =>
      prev.map(s => (s.id_sintomas === id_sintomas ? {...s, [field]: value} : s)),
    );
  };

  const guardar = async () => {
    if (!session?.user?.id) {
      Alert.alert('Error', 'No hay sesión activa.');
      return;
    }
    if (seleccionados.length === 0) {
      Alert.alert('Atención', 'Seleccioná al menos un síntoma.');
      return;
    }

    setSaving(true);
    try {
      for (const s of seleccionados) {
        // Solo enviar id_sintomas si es un UUID real (no fallback local)
        const isRealUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.id_sintomas);
        await insertSintomaUsuario({
          id_usuario: session.user.id,
          id_sintomas: isRealUuid ? s.id_sintomas : null,
          descripcion: s.descripcion || null,
          categoria: s.categoria,
          intensidad: s.intensidad,
          fecha: s.fecha,
          hora: s.hora || null,
          origen: 'manual',
        });
      }
      Alert.alert('¡Listo!', `${seleccionados.length} síntoma(s) registrado(s).`, [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  // ── Agrupar catálogo por categoría ──
  const categorias = [
    {key: 'fisico' as CatSintoma, label: 'Físico', icono: '🏥'},
    {key: 'emocional' as CatSintoma, label: 'Emocional', icono: '💭'},
  ];

  const catalogoFiltrado =
    filterCategoria === 'todos'
      ? catalogo
      : catalogo.filter(s => s.categoria === filterCategoria);

  // Agrupar por icono (subcategoría visual)
  const agrupado = catalogoFiltrado.reduce<Record<string, Sintoma[]>>((acc, s) => {
    const key = s.icono || '📋';
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Registrar Síntoma</Text>
        <Text style={styles.subtitle}>
          Seleccioná uno o más síntomas del catálogo
        </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* ── Botón abrir catálogo ── */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowCatalogo(true)}
          activeOpacity={0.8}>
          <Text style={styles.addBtnIcon}>+</Text>
          <Text style={styles.addBtnText}>Agregar síntoma</Text>
        </TouchableOpacity>

        {/* ── Síntomas seleccionados ── */}
        {seleccionados.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🩺</Text>
            <Text style={styles.emptyText}>No seleccionaste ningún síntoma</Text>
            <Text style={styles.emptyHint}>
              Tocá "Agregar síntoma" para abrir el catálogo
            </Text>
          </View>
        ) : (
          seleccionados.map(s => (
            <View key={s.id_sintomas} style={styles.sintomaCard}>
              <View style={styles.sintomaHeader}>
                <Text style={styles.sintomaIcono}>{s.icono || '📋'}</Text>
                <View style={styles.sintomaInfo}>
                  <Text style={styles.sintomaNombre}>{s.nombre}</Text>
                  <Text style={styles.sintomaCategoria}>
                    {s.categoria === 'fisico' ? 'Físico' : 'Emocional'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => toggleSeleccion(s)}
                  style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Intensidad */}
              <Text style={styles.fieldLabel}>Intensidad</Text>
              <View style={styles.intensidadRow}>
                {INTENSIDADES.map(int => (
                  <TouchableOpacity
                    key={int.value}
                    style={[
                      styles.intensidadBtn,
                      {
                        backgroundColor:
                          s.intensidad === int.value ? int.color : colors.surface,
                        borderColor:
                          s.intensidad === int.value ? int.color : colors.border,
                      },
                    ]}
                    onPress={() => updateSeleccionado(s.id_sintomas, 'intensidad', int.value)}>
                    <Text
                      style={[
                        styles.intensidadText,
                        {color: s.intensidad === int.value ? '#fff' : colors.textPrimary},
                      ]}>
                      {int.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Descripción */}
              <Text style={styles.fieldLabel}>Descripción (opcional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Describí cómo te sentís..."
                placeholderTextColor={colors.textSecondary}
                value={s.descripcion}
                onChangeText={v => updateSeleccionado(s.id_sintomas, 'descripcion', v)}
                multiline
                numberOfLines={2}
              />

              {/* Fecha y Hora */}
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>Fecha</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                    value={s.fecha}
                    onChangeText={v => updateSeleccionado(s.id_sintomas, 'fecha', v)}
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>Hora</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.textSecondary}
                    value={s.hora}
                    onChangeText={v => updateSeleccionado(s.id_sintomas, 'hora', v)}
                  />
                </View>
              </View>
            </View>
          ))
        )}

        {/* ── Botón guardar ── */}
        {seleccionados.length > 0 && (
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={guardar}
            disabled={saving}
            activeOpacity={0.8}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>
                Guardar {seleccionados.length} síntoma(s)
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Modal Catálogo ── */}
      <Modal visible={showCatalogo} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header del modal */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Catálogo de Síntomas</Text>
              <TouchableOpacity
                onPress={() => setShowCatalogo(false)}
                style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            {/* Filtro por categoría */}
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterBtn, filterCategoria === 'todos' && styles.filterBtnActive]}
                onPress={() => setFilterCategoria('todos')}>
                <Text
                  style={[
                    styles.filterBtnText,
                    filterCategoria === 'todos' && styles.filterBtnTextActive,
                  ]}>
                  Todos
                </Text>
              </TouchableOpacity>
              {categorias.map(c => (
                <TouchableOpacity
                  key={c.key}
                  style={[
                    styles.filterBtn,
                    filterCategoria === c.key && styles.filterBtnActive,
                  ]}
                  onPress={() => setFilterCategoria(c.key)}>
                  <Text
                    style={[
                      styles.filterBtnText,
                      filterCategoria === c.key && styles.filterBtnTextActive,
                    ]}>
                    {c.icono} {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Lista del catálogo */}
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{marginTop: 40}} />
            ) : (
              <FlatList
                data={Object.entries(agrupado)}
                keyExtractor={([icono]) => icono}
                renderItem={({item: [icono, items]}) => (
                  <View style={styles.catalogoGroup}>
                    <Text style={styles.catalogoGroupTitle}>{icono} {items[0]?.nombre.split(' ')[0]}</Text>
                    {items.map(s => {
                      const isSelected = seleccionados.some(
                        sel => sel.id_sintomas === s.id_sintomas,
                      );
                      return (
                        <TouchableOpacity
                          key={s.id_sintomas}
                          style={[
                            styles.catalogoItem,
                            isSelected && styles.catalogoItemSelected,
                          ]}
                          onPress={() => toggleSeleccion(s)}>
                          <Text style={styles.catalogoItemText}>{s.nombre}</Text>
                          {isSelected && <Text style={styles.checkMark}>✓</Text>}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.screenPaddingTop,
    paddingBottom: 16,
  },
  backBtn: {
    marginBottom: 8,
  },
  backText: {
    fontSize: fontSize.body,
    color: colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.subtitle,
    color: colors.textSecondary,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingBottom: 40,
  },

  // ── Add Button ──
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: spacing.buttonBorderRadius,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 10,
  },
  addBtnIcon: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  addBtnText: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: '#fff',
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptyHint: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // ── Sintoma Card ──
  sintomaCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.cardBorderRadius,
    padding: spacing.cardPadding,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sintomaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sintomaIcono: {
    fontSize: 28,
    marginRight: 12,
  },
  sintomaInfo: {
    flex: 1,
  },
  sintomaNombre: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sintomaCategoria: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger,
  },

  // ── Fields ──
  fieldLabel: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  intensidadRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  intensidadBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  intensidadText: {
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },

  // ── Save Button ──
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: spacing.buttonBorderRadius,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.primary,
  },

  // ── Filters ──
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  filterBtnText: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterBtnTextActive: {
    color: '#fff',
  },

  // ── Catalog Groups ──
  catalogoGroup: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  catalogoGroupTitle: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: 8,
  },
  catalogoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  catalogoItemSelected: {
    backgroundColor: colors.successLight,
  },
  catalogoItemText: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  checkMark: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
});

export default RegistrarSintomaScreen;
