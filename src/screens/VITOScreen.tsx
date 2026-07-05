import React from 'react';
import {View, Text, TextInput, Image, ScrollView, StyleSheet} from 'react-native';
import Card from '../components/Card';
import VITOMascot from '../components/VITOMascot';
import {colors, spacing, fontSize, shadows} from '../theme';

/**
 * Asistente VITO — chat con la mascota.
 *
 * Placeholder visual. La funcionalidad real (HU-61, HU-62) se implementa
 * en sprints 15-16.
 */
const VITOScreen: React.FC = () => {
  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../assets/icons/VITO-Completo.png')}
          style={{width: 44, height: 44, resizeMode: 'contain'}}
        />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Vittito</Text>
          <Text style={styles.headerSub}>Tu asistente de salud</Text>
        </View>
      </View>

      {/* Mensajes */}
      <ScrollView style={styles.chat} contentContainerStyle={styles.chatContent}>
        {/* Burbuja del bot */}
        <View style={styles.bubbleBot}>
          <Text style={styles.bubbleBotText}>
            ¡Hola Juan! ¿Cómo te sentís hoy?
          </Text>
        </View>

        {/* Burbuja del usuario */}
        <View style={styles.bubbleUser}>
          <Text style={styles.bubbleUserText}>Me siento bien, gracias</Text>
        </View>

        {/* Burbuja del bot */}
        <View style={styles.bubbleBot}>
          <Text style={styles.bubbleBotText}>
            ¡Qué bueno saberlo! Recordá mantenerte hidratado y tomar tus
            medicamentos.
          </Text>
        </View>

        {/* Chips de sugerencias */}
        <View style={styles.chips}>
          {['¿Qué debo comer hoy?', 'Consejos para dormir mejor', 'Ejercicios recomendados'].map(
            (chip, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{chip}</Text>
              </View>
            ),
          )}
        </View>
      </ScrollView>

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Escribí tu mensaje…"
          placeholderTextColor={colors.textSecondary}
        />
        <View style={styles.micButton}>
          <Image
            source={require('../assets/icons/ic-microfono.png')}
            style={{width: 22, height: 22, resizeMode: 'contain', tintColor: '#FFFFFF'}}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.screenPaddingTop,
    paddingBottom: 16,
  },
  headerText: {},
  headerTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // ── Chat ──
  chat: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingBottom: 16,
  },
  bubbleBot: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 14,
    marginBottom: 10,
    maxWidth: '80%',
    alignSelf: 'flex-start',
    ...shadows.card,
  },
  bubbleBotText: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  bubbleUser: {
    backgroundColor: colors.primaryDark,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 14,
    marginBottom: 10,
    maxWidth: '80%',
    alignSelf: 'flex-end',
  },
  bubbleUserText: {
    fontSize: fontSize.body,
    color: '#FFFFFF',
    lineHeight: 20,
  },

  // ── Chips ──
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: fontSize.caption,
    color: colors.primary,
    fontWeight: '500',
  },

  // ── Input ──
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micIcon: {
    fontSize: 18,
  },
});

export default VITOScreen;
