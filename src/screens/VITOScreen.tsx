import React, {useRef, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSupabase} from '../context/SupabaseProvider';
import {colors, fontSize, shadows, spacing} from '../theme';

const CHAT_WEBHOOK_URL =
  'https://vitoia.app.n8n.cloud/webhook/chat-agent';

type ChatMessage = {
  id: string;
  author: 'bot' | 'user';
  text: string;
};

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome',
    author: 'bot',
    text: '¡Hola! Soy Vittito, tu asistente de salud. ¿Cómo te sentís hoy?',
  },
];

/** Returns text from the response formats most commonly returned by n8n. */
const extractAgentMessage = (payload: unknown): string | null => {
  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim();
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const message = extractAgentMessage(item);
      if (message) {
        return message;
      }
    }
    return null;
  }

  if (payload && typeof payload === 'object') {
    const response = payload as Record<string, unknown>;
    for (const key of ['output', 'response', 'message', 'text', 'answer']) {
      const message = extractAgentMessage(response[key]);
      if (message) {
        return message;
      }
    }

    return extractAgentMessage(response.data);
  }

  return null;
};

const createMessage = (author: ChatMessage['author'], text: string): ChatMessage => ({
  id: `${author}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  author,
  text,
});

/** Asistente VITO: conversación con el agente configurado en n8n. */
const VITOScreen: React.FC = () => {
  const {getUserId} = useSupabase();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({animated: true});
  };

  const sendMessage = async () => {
    const message = draft.trim();
    if (!message || isSending) {
      return;
    }

    setDraft('');
    setMessages(current => [...current, createMessage('user', message)]);
    setIsSending(true);

    try {
      const userId = getUserId();
      if (!userId) {
        throw new Error('No hay una sesión de usuario activa.');
      }

      const response = await fetch(CHAT_WEBHOOK_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          userId,
          conversationId: userId,
          type: 'text',
          text: message,
        }),
      });

      if (!response.ok) {
        throw new Error(`El agente respondió con estado ${response.status}`);
      }

      const rawResponse = await response.text();
      let payload: unknown = rawResponse;
      try {
        payload = JSON.parse(rawResponse);
      } catch {
        // Some n8n workflows respond with plain text; it is a valid chat reply.
      }

      const agentMessage = extractAgentMessage(payload);
      if (!agentMessage) {
        throw new Error('La respuesta del agente no contiene un mensaje legible.');
      }

      setMessages(current => [
        ...current,
        createMessage('bot', agentMessage),
      ]);
    } catch (error) {
      console.warn('[VITO Chat] Unable to send message:', error);
      const fallbackMessage =
        error instanceof Error &&
        error.message.includes('no contiene un mensaje legible')
          ? 'Vittito recibió tu mensaje, pero no devolvió una respuesta. Intentá nuevamente.'
          : 'No pude comunicarme con Vittito. Verificá tu conexión e intentá nuevamente.';
      setMessages(current => [
        ...current,
        createMessage('bot', fallbackMessage),
      ]);
    } finally {
      setIsSending(false);
      requestAnimationFrame(scrollToBottom);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Image
          source={require('../assets/icons/VITO-Completo.png')}
          style={styles.avatar}
        />
        <View>
          <Text style={styles.headerTitle}>Vittito</Text>
          <Text style={styles.headerSub}>Tu asistente de salud</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={scrollToBottom}>
        {messages.map(item => (
          <View
            key={item.id}
            style={item.author === 'bot' ? styles.bubbleBot : styles.bubbleUser}>
            <Text
              style={
                item.author === 'bot' ? styles.bubbleBotText : styles.bubbleUserText
              }>
              {item.text}
            </Text>
          </View>
        ))}

        {isSending && (
          <View style={[styles.bubbleBot, styles.typingBubble]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.typingText}>Vittito está escribiendo…</Text>
          </View>
        )}

        {!isSending && messages.length === INITIAL_MESSAGES.length && (
          <View style={styles.chips}>
            {[
              '¿Cómo estoy hoy?',
              'Consejos para dormir mejor',
              'Ejercicios recomendados',
            ].map(chip => (
              <TouchableOpacity
                key={chip}
                style={styles.chip}
                onPress={() => setDraft(chip)}>
                <Text style={styles.chipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={sendMessage}
          placeholder="Escribí tu mensaje…"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="send"
          editable={!isSending}
        />
        <TouchableOpacity
          accessibilityLabel="Enviar mensaje"
          accessibilityRole="button"
          activeOpacity={0.8}
          disabled={!draft.trim() || isSending}
          onPress={sendMessage}
          style={[
            styles.sendButton,
            (!draft.trim() || isSending) && styles.sendButtonDisabled,
          ]}>
          <Text style={styles.sendButtonText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.screenPaddingTop,
    paddingBottom: 16,
  },
  avatar: {width: 44, height: 44, resizeMode: 'contain'},
  headerTitle: {fontSize: fontSize.title, fontWeight: '700', color: colors.textPrimary},
  headerSub: {fontSize: fontSize.caption, color: colors.textSecondary, marginTop: 2},
  chat: {flex: 1},
  chatContent: {paddingHorizontal: spacing.screenPaddingHorizontal, paddingBottom: 16},
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
  bubbleBotText: {fontSize: fontSize.body, color: colors.textPrimary, lineHeight: 20},
  bubbleUser: {
    backgroundColor: colors.primaryDark,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 14,
    marginBottom: 10,
    maxWidth: '80%',
    alignSelf: 'flex-end',
  },
  bubbleUserText: {fontSize: fontSize.body, color: '#FFFFFF', lineHeight: 20},
  typingBubble: {flexDirection: 'row', alignItems: 'center', gap: 8},
  typingText: {fontSize: fontSize.caption, color: colors.textSecondary},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8},
  chip: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {fontSize: fontSize.caption, color: colors.primary, fontWeight: '500'},
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
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
    maxHeight: 100,
  },
  sendButton: {
    minWidth: 72,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {opacity: 0.45},
  sendButtonText: {fontSize: fontSize.caption, fontWeight: '700', color: '#FFFFFF'},
});

export default VITOScreen;
