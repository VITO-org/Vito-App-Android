import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSupabase} from '../context/SupabaseProvider';
import {getSintomasUsuario, deleteSintomaUsuario} from '../services/supabase/api';
import type {SintomasUsuario, CatSintoma} from '../services/supabase/models';
import {colors, spacing, fontSize} from '../theme';

const INTENSIDAD_COLORES: Record<number, {bg: string; text: string}> = {
  1: {bg: '#D1FAE5', text: '#065F46'},
  2: {bg: '#FEF3C7', text: '#92400E'},
  3: {bg: '#FFEDD5', text: '#9A3412'},
  4: {bg: '#FEE2E2', text: '#991B1B'},
  5: {bg: '#FCA5A5', text: '#7F1D1D'},
};

const HistorialSintomasScreen: React.FC = () => {
  const navigation = useNavigation();
  const {session} = useSupabase();

  const [sintomas, setSintomas] = useState<SintomasUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterCategoria, setFilterCategoria] = useState<CatSintoma | 'todos'>('todos');

  const cargarSintomas = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const data = await getSintomasUsuario(session.user.id, {limit: 100});
      setSintomas(data);
    } catch (err) {
      console.log('[HistorialSintomas] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    cargarSintomas();
  }, [cargarSintomas]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    cargarSintomas();
  }, [cargarSintomas]);

  const filtrados =
    filterCategoria === 'todos'
      ? sintomas
      : sintomas.filter(s => s.categoria === filterCategoria);

  const eliminarSintoma = (item: SintomasUsuario) => {
    Alert.alert(
      'Eliminar síntoma',
      '¿Seguro que querés eliminar este registro?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSintomaUsuario(item.id_usuario, item.recorded_at!);
              setSintomas(prev =>
                prev.filter(
                  s => !(s.id_usuario === item.id_usuario && s.recorded_at === item.recorded_at),
                ),
              );
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'No se pudo eliminar.');
            }
          },
        },
      ],
    );
  };

  const formatearFecha = (s: SintomasUsuario) => {
    if (s.fecha) {
      const d = new Date(s.fecha + 'T00:00:00');
      return d.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    if (s.recorded_at) {
      const d = new Date(s.recorded_at);
      return d.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    return 'Sin fecha';
  };

  const formatearHora = (s: SintomasUsuario) => {
    if (s.hora) return s.hora;
    if (s.recorded_at) {
      const d = new Date(s.recorded_at);
      return d.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
    }
    return '';
  };

  const renderSintoma = ({item}: {item: SintomasUsuario}) => {
    const intensidad = item.intensidad ?? 3;
    const colores = INTENSIDAD_COLORES[intensidad] || INTENSIDAD_COLORES[3];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardDate}>
            <Text style={styles.dateText}>{formatearFecha(item)}</Text>
            {formatearHora(item) ? (
              <Text style={styles.timeText}>{formatearHora(item)}</Text>
            ) : null}
          </View>
          <View style={styles.cardHeaderRight}>
            <View style={[styles.intensidadBadge, {backgroundColor: colores.bg}]}>
              <Text style={[styles.intensidadText, {color: colores.text}]}>
                {intensidad}/5
              </Text>
            </View>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => eliminarSintoma(item)}>
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.categoriaTag}>
            <Text style={styles.categoriaText}>
              {item.categoria === 'fisico' ? '🏥 Físico' : '💭 Emocional'}
            </Text>
          </View>
          {item.descripcion ? (
            <Text style={styles.descripcionText}>{item.descripcion}</Text>
          ) : null}
          <Text style={styles.origenText}>
            Origen: {item.origen === 'chat_ia' ? 'Chat IA' : 'Registro manual'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Historial de Síntomas</Text>
        <Text style={styles.subtitle}>
          {filtrados.length} registro(s) — Ideal para mostrar a tu médico
        </Text>
      </View>

      {/* Filtros */}
      <View style={styles.filterRow}>
        {[
          {key: 'todos' as const, label: 'Todos'},
          {key: 'fisico' as CatSintoma, label: '🏥 Físico'},
          {key: 'emocional' as CatSintoma, label: '💭 Emocional'},
        ].map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filterCategoria === f.key && styles.filterBtnActive]}
            onPress={() => setFilterCategoria(f.key)}>
            <Text
              style={[
                styles.filterBtnText,
                filterCategoria === f.key && styles.filterBtnTextActive,
              ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{marginTop: 40}} />
      ) : filtrados.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>Sin registros</Text>
          <Text style={styles.emptyHint}>
            {sintomas.length === 0
              ? 'Aún no registraste ningún síntoma'
              : 'No hay síntomas en esta categoría'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={item => `${item.id_usuario}_${item.recorded_at ?? item.fecha ?? item.id_sintomas}`}
          renderItem={renderSintoma}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        />
      )}
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
    paddingBottom: 12,
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
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // ── Filters ──
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingBottom: 12,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
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

  // ── List ──
  listContent: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingBottom: 40,
  },

  // ── Card ──
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.cardBorderRadius,
    padding: spacing.cardPadding,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardDate: {
    flex: 1,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  timeText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  intensidadBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  intensidadText: {
    fontSize: fontSize.badge,
    fontWeight: '700',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },

  cardBody: {
    gap: 6,
  },
  categoriaTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoriaText: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  descripcionText: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  origenText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
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
  },
});

export default HistorialSintomasScreen;
