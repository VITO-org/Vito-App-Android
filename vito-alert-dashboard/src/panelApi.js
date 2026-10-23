import { supabase } from './supabase'

// ─────────────────────────────────────────────────────────────
// Cliente del gate de acceso del panel QA.
//
// Todo lo que el panel hace contra la base pasa por la Edge Function
// `panel-acceso`: es el único backend con el que puede hablar. La
// publishable key que viaja en el bundle NO es la frontera de seguridad
// (es pública); la frontera real es el passcode + token que valida la
// Edge Function, y la allowlist de usuarios vive en el servidor.
//
// Este módulo no guarda credenciales: sólo administra el token de sesión
// en `sessionStorage` y traduce las respuestas de la función a objetos
// planos para la UI.
// ─────────────────────────────────────────────────────────────

const NOMBRE_FUNCION = 'panel-acceso'
const LLAVE_TOKEN = 'panel_acceso_token'
const LLAVE_EXPIRACION = 'panel_acceso_expira'

/** Error de negocio devuelto por la Edge Function (400 / 429 / …). */
export class PanelError extends Error {
  constructor(mensaje, status = 0) {
    super(mensaje)
    this.name = 'PanelError'
    this.status = status
  }
}

/** El token de sesión es inválido o venció: hay que volver al ingreso. */
export class PanelAuthError extends PanelError {
  constructor(mensaje) {
    super(mensaje, 401)
    this.name = 'PanelAuthError'
  }
}

// ─── Token de sesión ───

export function leerToken() {
  try {
    return sessionStorage.getItem(LLAVE_TOKEN)
  } catch {
    return null
  }
}

export function guardarToken(token, expiraEn) {
  try {
    sessionStorage.setItem(LLAVE_TOKEN, token)
    if (expiraEn) sessionStorage.setItem(LLAVE_EXPIRACION, expiraEn)
  } catch {
    /* storage no disponible: la sesión no persiste entre recargas */
  }
}

export function borrarToken() {
  try {
    sessionStorage.removeItem(LLAVE_TOKEN)
    sessionStorage.removeItem(LLAVE_EXPIRACION)
  } catch {
    /* no-op */
  }
}

// ─── Traducción de errores ───

async function cuerpoDeError(contexto) {
  if (!contexto || typeof contexto.json !== 'function') return null
  try {
    return await contexto.json()
  } catch {
    return null
  }
}

async function describirError(error) {
  const contexto = error && error.context
  const status = contexto && typeof contexto.status === 'number' ? contexto.status : 0
  const cuerpo = await cuerpoDeError(contexto)
  const mensaje =
    (cuerpo && typeof cuerpo.error === 'string' && cuerpo.error) ||
    (cuerpo && typeof cuerpo.message === 'string' && cuerpo.message) ||
    (error && error.message) ||
    'No se pudo completar la operación.'
  return { status, mensaje }
}

// ─── Invocación de la Edge Function ───

async function invocar(accion, { token, payload } = {}) {
  const body = { accion }
  if (token) body.token = token
  if (payload) body.payload = payload

  const { data, error } = await supabase.functions.invoke(NOMBRE_FUNCION, { body })

  if (error) {
    const { status, mensaje } = await describirError(error)
    if (status === 401) throw new PanelAuthError(mensaje)
    throw new PanelError(mensaje, status)
  }

  if (data && typeof data.error === 'string') throw new PanelError(data.error)

  return data || {}
}

// ─── API del panel ───

export const panelApi = {
  /** Canjea el passcode por un token de sesión. Lanza PanelError si falla. */
  async validarAcceso(passcode) {
    const { data, error } = await supabase.functions.invoke(NOMBRE_FUNCION, {
      body: { accion: 'validar_acceso', passcode },
    })

    if (error) {
      const { status, mensaje } = await describirError(error)
      throw new PanelError(mensaje, status)
    }

    if (!data || data.ok !== true || !data.token) {
      throw new PanelError((data && data.error) || 'El servidor no devolvió un token de acceso.')
    }

    return data
  },

  /** Usuarios de la allowlist del servidor (nunca hardcodeados en el bundle). */
  listarPerfiles: (token) => invocar('listar_perfiles', { token }),

  /** Historial de alertas con filtros aplicados en el servidor. */
  listarAlertas: (token, filtros) => invocar('listar_alertas', { token, payload: filtros }),

  /** Delivery log (notificacion_entrega). */
  listarEntregas: (token, filtros) => invocar('listar_entregas', { token, payload: filtros }),

  /** Genera el dato de prueba; los valores los elige el servidor. */
  insertarDatoPrueba: (token, payload) => invocar('insertar_dato_prueba', { token, payload }),

  /** Lee el horario silencioso (quiet-hours) de un usuario. */
  obtenerHorarioSilencioso: (token, idUsuario) =>
    invocar('obtener_horario_silencioso', { token, payload: { id_usuario: idUsuario } }),

  /** Guarda el horario silencioso (quiet-hours) de un usuario. */
  upsertHorarioSilencioso: (token, { id_usuario, inicio, fin }) =>
    invocar('upsert_horario_silencioso', { token, payload: { id_usuario, inicio, fin } }),

  /** INFO: la reenvía el servidor con service_role. */
  enviarInfo: (token, payload) => invocar('enviar_info', { token, payload }),
}
