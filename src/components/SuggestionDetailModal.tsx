/**
 * HU-34 Fase A — Modal de detalle de sugerencia.
 * Muestra descripción, motivo y acciones + botones Vista/Hecha (CA-04/CA-05).
 */
import React from 'react';
import {View, Text, Modal, Pressable, StyleSheet, ScrollView} from 'react-native';
import {colors, spacing, fontSize} from '../theme';
import type {Suggestion} from '../services/suggestions/types';

interface Props {
  visible: boolean;
  suggestion: Suggestion | null;
  onClose: () => void;
  onMarkSeen: (id: string) => void;
  onMarkDone: (id: string) => void;
}

const SuggestionDetailModal: React.FC<Props> = ({visible, suggestion, onClose, onMarkSeen, onMarkDone}) => {
  if (!suggestion) return null;

  const handleSeen = () => {
    onMarkSeen(suggestion.id);
    onClose();
  };

  const handleDone = () => {
    onMarkDone(suggestion.id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.icon}>{suggestion.icon}</Text>
            <Text style={styles.title}>{suggestion.titulo}</Text>
            <Text style={styles.badge}>{suggestion.prioridad}</Text>

            <Text style={styles.sectionLabel}>Qué significa</Text>
            <Text style={styles.body}>{suggestion.descripcion}</Text>

            <Text style={styles.sectionLabel}>Por qué te lo sugiero</Text>
            <Text style={styles.body}>{suggestion.motivo}</Text>

            <Text style={styles.sectionLabel}>Qué podés hacer</Text>
            {suggestion.acciones.map((a, i) => (
              <Text key={i} style={styles.action}>
                {'• '}
                {a}
              </Text>
            ))}

            <View style={styles.row}>
              <Pressable onPress={handleSeen} style={[styles.btn, styles.btnSecondary]}>
                <Text style={styles.btnSecondaryText}>Marcar vista</Text>
              </Pressable>
              <Pressable onPress={handleDone} style={[styles.btn, styles.btnPrimary]}>
                <Text style={styles.btnPrimaryText}>Marcar hecha</Text>
              </Pressable>
            </View>

            <Pressable onPress={onClose} style={styles.closeHit}>
              <Text style={styles.closeText}>Cerrar</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: spacing.cardBorderRadius,
    maxHeight: '85%',
    padding: spacing.cardPadding,
  },
  scroll: {
    paddingBottom: 8,
  },
  icon: {
    fontSize: 40,
    textAlign: 'center',
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 8,
  },
  badge: {
    alignSelf: 'center',
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 6,
  },
  sectionLabel: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 4,
  },
  body: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  action: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    lineHeight: 22,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  btn: {
    flex: 1,
    borderRadius: spacing.buttonBorderRadius,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnSecondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnSecondaryText: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnPrimaryText: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeHit: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});

export default SuggestionDetailModal;
