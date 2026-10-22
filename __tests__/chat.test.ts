/**
 * Tests del transporte del chat (HU-99 / SCRUM-51).
 *
 * Se cubren los dos transportes (direct y proxy) y el parseo de la respuesta
 * del agente, inyectando las dependencias de red para no hacer requests.
 */
import {
  CHAT_WEBHOOK_URL,
  EDGE_FUNCTION_NAME,
  EMPTY_AGENT_MESSAGE_ERROR,
  extractAgentMessage,
  resolveTransport,
  sendChatMessage,
} from '../src/services/chat';

const PARAMS = {
  userId: 'user-1',
  conversationId: 'user-1',
  message: 'Hola Vittito',
};

function fakeResponse(
  body: string,
  init: {ok?: boolean; status?: number} = {},
): Response {
  const status = init.status ?? 200;
  return {
    ok: init.ok ?? (status >= 200 && status < 300),
    status,
    text: async () => body,
  } as unknown as Response;
}

describe('extractAgentMessage', () => {
  it('extrae texto plano', () => {
    expect(extractAgentMessage('  Hola  ')).toBe('Hola');
  });

  it('extrae de las claves que devuelve n8n', () => {
    for (const key of ['output', 'response', 'message', 'text', 'answer']) {
      expect(extractAgentMessage({[key]: 'respuesta'})).toBe('respuesta');
    }
  });

  it('extrae de un objeto anidado en data', () => {
    expect(extractAgentMessage({data: {output: 'anidada'}})).toBe('anidada');
  });

  it('extrae el primer elemento legible de un array', () => {
    expect(extractAgentMessage([{output: 'primera'}, {output: 'segunda'}])).toBe(
      'primera',
    );
  });

  it('devuelve null si no hay nada legible', () => {
    expect(extractAgentMessage(null)).toBeNull();
    expect(extractAgentMessage({})).toBeNull();
    expect(extractAgentMessage('   ')).toBeNull();
    expect(extractAgentMessage([])).toBeNull();
  });
});

describe('resolveTransport', () => {
  const original = process.env.EXPO_PUBLIC_CHAT_TRANSPORT;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.EXPO_PUBLIC_CHAT_TRANSPORT;
    } else {
      process.env.EXPO_PUBLIC_CHAT_TRANSPORT = original;
    }
  });

  it('es direct por defecto', () => {
    delete process.env.EXPO_PUBLIC_CHAT_TRANSPORT;
    expect(resolveTransport()).toBe('direct');
  });

  it('es proxy cuando está configurado', () => {
    process.env.EXPO_PUBLIC_CHAT_TRANSPORT = 'proxy';
    expect(resolveTransport()).toBe('proxy');
  });
});

describe('sendChatMessage - transporte direct', () => {
  const originalName = process.env.EXPO_PUBLIC_CHAT_AUTH_HEADER_NAME;
  const originalValue = process.env.EXPO_PUBLIC_CHAT_AUTH_HEADER_VALUE;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_CHAT_AUTH_HEADER_NAME = 'x-api-key';
    process.env.EXPO_PUBLIC_CHAT_AUTH_HEADER_VALUE = 'secreto';
    delete process.env.EXPO_PUBLIC_CHAT_TRANSPORT;
  });

  afterEach(() => {
    if (originalName === undefined) {
      delete process.env.EXPO_PUBLIC_CHAT_AUTH_HEADER_NAME;
    } else {
      process.env.EXPO_PUBLIC_CHAT_AUTH_HEADER_NAME = originalName;
    }
    if (originalValue === undefined) {
      delete process.env.EXPO_PUBLIC_CHAT_AUTH_HEADER_VALUE;
    } else {
      process.env.EXPO_PUBLIC_CHAT_AUTH_HEADER_VALUE = originalValue;
    }
  });

  it('envía el payload que espera el workflow de n8n', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      fakeResponse(JSON.stringify({output: '¡Hola!'})),
    );

    const respuesta = await sendChatMessage(PARAMS, {fetchImpl});

    expect(respuesta).toBe('¡Hola!');
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(CHAT_WEBHOOK_URL);
    expect(init.method).toBe('POST');

    const headers = init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('secreto');
    expect(headers['Content-Type']).toBe('application/json');

    expect(JSON.parse(init.body as string)).toEqual({
      userId: 'user-1',
      conversationId: 'user-1',
      type: 'text',
      text: 'Hola Vittito',
    });
  });

  it('acepta una respuesta en texto plano', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(fakeResponse('respuesta cruda'));

    await expect(sendChatMessage(PARAMS, {fetchImpl})).resolves.toBe(
      'respuesta cruda',
    );
  });

  it('falla con el estado cuando el agente responde con error', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(fakeResponse('boom', {ok: false, status: 502}));

    await expect(sendChatMessage(PARAMS, {fetchImpl})).rejects.toThrow(
      'El agente respondió con estado 502',
    );
  });

  it('falla si la respuesta no trae un mensaje legible', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(fakeResponse(JSON.stringify({status: 'ok'})));

    await expect(sendChatMessage(PARAMS, {fetchImpl})).rejects.toThrow(
      EMPTY_AGENT_MESSAGE_ERROR,
    );
  });

  it('falla si no está configurada la autenticación', async () => {
    delete process.env.EXPO_PUBLIC_CHAT_AUTH_HEADER_VALUE;
    const fetchImpl = jest.fn();

    await expect(sendChatMessage(PARAMS, {fetchImpl})).rejects.toThrow(
      'La autenticación del chat no está configurada.',
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('sendChatMessage - transporte proxy', () => {
  const originalTransport = process.env.EXPO_PUBLIC_CHAT_TRANSPORT;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_CHAT_TRANSPORT = 'proxy';
  });

  afterEach(() => {
    if (originalTransport === undefined) {
      delete process.env.EXPO_PUBLIC_CHAT_TRANSPORT;
    } else {
      process.env.EXPO_PUBLIC_CHAT_TRANSPORT = originalTransport;
    }
  });

  it('invoca la Edge Function sin mandar el userId', async () => {
    const invokeFunction = jest
      .fn()
      .mockResolvedValue({data: {output: 'respuesta'}, error: null});

    const respuesta = await sendChatMessage(PARAMS, {invokeFunction});

    expect(respuesta).toBe('respuesta');
    expect(invokeFunction).toHaveBeenCalledWith(EDGE_FUNCTION_NAME, {
      body: {
        message: 'Hola Vittito',
        conversationId: 'user-1',
      },
    });

    // El userId sale del JWT validado en la función: no debe viajar en el body.
    const [, options] = invokeFunction.mock.calls[0] as unknown as [
      string,
      {body: Record<string, unknown>},
    ];
    expect(options.body).not.toHaveProperty('userId');
  });

  it('propaga el error devuelto por la Edge Function', async () => {
    const invokeFunction = jest
      .fn()
      .mockResolvedValue({data: null, error: {message: 'Token inválido'}});

    await expect(sendChatMessage(PARAMS, {invokeFunction})).rejects.toThrow(
      'Token inválido',
    );
  });

  it('falla si la respuesta no trae un mensaje legible', async () => {
    const invokeFunction = jest
      .fn()
      .mockResolvedValue({data: {status: 'ok'}, error: null});

    await expect(sendChatMessage(PARAMS, {invokeFunction})).rejects.toThrow(
      EMPTY_AGENT_MESSAGE_ERROR,
    );
  });

  it('exige la dependencia invokeFunction', async () => {
    await expect(sendChatMessage(PARAMS)).rejects.toThrow(
      'El transporte proxy necesita invokeFunction.',
    );
  });
});
