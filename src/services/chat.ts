/**
 * Transporte del chat de VITO.
 *
 * El agente (Railway / n8n) se puede invocar de dos formas:
 *
 *   direct → la app llama al webhook y manda el header de autenticación.
 *            Requiere que el valor esté en EXPO_PUBLIC_CHAT_AUTH_HEADER_VALUE,
 *            que se INLINEA en el bundle JS. El valor viaja dentro del APK y
 *            es extraíble: sirve como comprobación de versión o rate-limit,
 *            NO como secreto.
 *
 *   proxy  → la app llama a la Edge Function `chat-vito`, que valida el JWT
 *            del usuario y reenvía al webhook con el secreto que vive en
 *            `supabase secrets`. El secreto nunca sale del servidor.
 *            Requiere EXPO_PUBLIC_CHAT_TRANSPORT=proxy y la función desplegada.
 *
 * El transporte se elige con EXPO_PUBLIC_CHAT_TRANSPORT y por defecto es
 * `direct`, para no romper el flujo que ya está verificado contra n8n.
 *
 * Este módulo es deliberadamente puro: NO importa el cliente de Supabase
 * (src/services/supabase/client), porque ese cliente trae un storage nativo
 * que Jest no puede cargar. Quien llama (la pantalla) inyecta la invocación
 * real con `{invokeFunction: (name, options) => supabase.functions.invoke(name, options)}`.
 */

export type ChatTransport = 'direct' | 'proxy';

export interface ChatSendParams {
  /** Id del usuario autenticado. Solo lo usa el transporte `direct`. */
  userId: string;
  /** Conversación lógica. Por ahora coincide con el usuario. */
  conversationId: string;
  /** Texto enviado por el usuario. */
  message: string;
}

export interface ChatDependencies {
  /** Implementación de fetch. Se inyecta para poder testear sin red. */
  fetchImpl?: typeof fetch;
  /** Invocación de la Edge Function. Se inyecta para poder testear sin red. */
  invokeFunction?: (
    name: string,
    options: {body: Record<string, unknown>},
  ) => Promise<{data: unknown; error: {message: string} | null}>;
}

const CHAT_WEBHOOK_URL =
  'https://primary-production-7732.up.railway.app/webhook/chat-agent';

const EDGE_FUNCTION_NAME = 'chat-vito';

export {CHAT_WEBHOOK_URL, EDGE_FUNCTION_NAME};

/** Mensaje que la UI usa para diferenciar "respuesta vacía" de "sin conexión". */
export const EMPTY_AGENT_MESSAGE_ERROR =
  'La respuesta del agente no contiene un mensaje legible.';

/**
 * Devuelve el transporte configurado. `direct` por defecto.
 */
export function resolveTransport(): ChatTransport {
  return process.env.EXPO_PUBLIC_CHAT_TRANSPORT === 'proxy' ? 'proxy' : 'direct';
}

/**
 * Extrae el texto del agente de los formatos que devuelve n8n:
 * texto plano, o JSON con output / response / message / text / answer / data.
 */
export function extractAgentMessage(payload: unknown): string | null {
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
}

async function sendDirect(
  params: ChatSendParams,
  fetchImpl: typeof fetch,
): Promise<string> {
  // Se leen acá y no al importar el módulo: las variables se resuelven en el
  // momento del bundle y el valor puede cambiar entre builds.
  const headerName = process.env.EXPO_PUBLIC_CHAT_AUTH_HEADER_NAME;
  const headerValue = process.env.EXPO_PUBLIC_CHAT_AUTH_HEADER_VALUE;

  if (!headerName || !headerValue) {
    throw new Error('La autenticación del chat no está configurada.');
  }

  const response = await fetchImpl(CHAT_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [headerName]: headerValue,
    },
    body: JSON.stringify({
      userId: params.userId,
      conversationId: params.conversationId,
      type: 'text',
      text: params.message,
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
    throw new Error(EMPTY_AGENT_MESSAGE_ERROR);
  }
  return agentMessage;
}

async function sendProxy(
  params: ChatSendParams,
  invokeFunction: NonNullable<ChatDependencies['invokeFunction']>,
): Promise<string> {
  // El userId no se manda: la Edge Function lo toma del JWT validado, así
  // que la app no puede suplantar a otro usuario.
  const {data, error} = await invokeFunction(EDGE_FUNCTION_NAME, {
    body: {
      message: params.message,
      conversationId: params.conversationId,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  const agentMessage = extractAgentMessage(data);
  if (!agentMessage) {
    throw new Error(EMPTY_AGENT_MESSAGE_ERROR);
  }
  return agentMessage;
}

/**
 * Envía un mensaje al agente y devuelve el texto de la respuesta.
 *
 * @throws Error si el transporte falla o la respuesta no trae un mensaje legible.
 */
export async function sendChatMessage(
  params: ChatSendParams,
  deps: ChatDependencies = {},
): Promise<string> {
  if (resolveTransport() === 'proxy') {
    if (!deps.invokeFunction) {
      throw new Error('El transporte proxy necesita invokeFunction.');
    }
    return sendProxy(params, deps.invokeFunction);
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  return sendDirect(params, fetchImpl);
}
