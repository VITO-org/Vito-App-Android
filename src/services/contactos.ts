// ──────────────────────────────────────────────
// Lógica pura de contactos de confianza (HU-16)
// Módulo SIN imports de client.ts / supabase: testeable con jest sin mockear nada.
// ──────────────────────────────────────────────
import type {
  FrecuenciaNotificacion,
  RelacionContacto,
  CanalNotificacion,
  TipoEventoNotificacion,
} from './supabase/models';

export type ContactoForm = {
  nombre: string;
  relacion: RelacionContacto | '';
  telefono: string;
  email: string;
  frecuencia_notificacion: FrecuenciaNotificacion;
  canal: CanalNotificacion;
  tipos_evento: TipoEventoNotificacion[];
  es_principal: boolean;
};

export const FRECUENCIAS: {valor: FrecuenciaNotificacion; label: string}[] = [
  {valor: 'inmediata', label: 'Inmediata (cada alerta)'},
  {valor: 'diaria', label: 'Resumen diario'},
  {valor: 'semanal', label: 'Resumen semanal'},
  {valor: 'sin_notificaciones', label: 'Sin notificaciones'},
];

export const RELACIONES: {valor: RelacionContacto; label: string}[] = [
  {valor: 'familiar', label: 'Familiar'},
  {valor: 'medico', label: 'Médico'},
  {valor: 'otro', label: 'Otro'},
];

export const CANAL_DEFAULT: CanalNotificacion = 'app_interna';
export const EVENTOS_DEFAULT: TipoEventoNotificacion[] = ['fisiologico'];
export const ES_PRINCIPAL_DEFAULT = false;

export const CANALES: {valor: CanalNotificacion; label: string}[] = [
  {valor: 'app_interna', label: 'App de Vito'},
  {valor: 'whatsapp', label: 'WhatsApp'},
];

export const EVENTOS: {valor: TipoEventoNotificacion; label: string}[] = [
  {valor: 'fisiologico', label: 'Fisiológicos'},
  {valor: 'medicacion', label: 'Medicación'},
  {valor: 'estado_animo', label: 'Estado de ánimo'},
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEFONO_RE = /^\+?[0-9]{8,15}$/;

/** Quita espacios/guiones/paréntesis, conserva el "+" inicial. */
export function normalizarTelefono(raw: string): string {
  return raw.replace(/[\s\-()]/g, '');
}

/** ^[^\s@]+@[^\s@]+\.[^\s@]{2,}$ (regex conservadora). */
export function esEmailValido(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** E.164 simplificado: ^\+?[0-9]{8,15}$ sobre el teléfono normalizado. */
export function esTelefonoValido(tel: string): boolean {
  return TELEFONO_RE.test(normalizarTelefono(tel));
}

/**
 * Valida el formulario completo. Devuelve el primer error o null.
 * authed compara contra la sesión/perfil para impedir agregarse a uno mismo.
 */
export function validarContacto(
  form: ContactoForm,
  authed?: {email?: string | null; telefono?: string | null},
): string | null {
  const nombre = form.nombre.trim();
  if (!nombre || nombre.length > 120) return 'El nombre es obligatorio';

  const relacionValida = RELACIONES.some(r => r.valor === form.relacion);
  if (!relacionValida) return 'Elegí la relación (familiar, médico u otro)';

  const telefono = normalizarTelefono(form.telefono);
  if (!telefono || !esTelefonoValido(telefono)) {
    return 'El teléfono no es válido (formato E.164: +54 11 5555-1234)';
  }

  const email = form.email.trim();
  if (!email || !esEmailValido(email)) return 'El email no es válido';

  const frecuenciaValida = FRECUENCIAS.some(f => f.valor === form.frecuencia_notificacion);
  if (!frecuenciaValida) return 'Frecuencia de notificación inválida';

  const canalValido = CANALES.some(c => c.valor === form.canal);
  if (!canalValido) return 'Elegí el canal de notificación';

  if (!form.tipos_evento || form.tipos_evento.length === 0) {
    return 'Elegí al menos un tipo de evento';
  }
  const eventosValidos = form.tipos_evento.every(t => EVENTOS.some(e => e.valor === t));
  if (!eventosValidos) return 'Tipo de evento inválido';

  if (email.toLowerCase() === authed?.email?.toLowerCase()) {
    return 'No podés agregarte a vos mismo como contacto';
  }
  const telefonoAuthed = authed?.telefono ? normalizarTelefono(authed.telefono) : '';
  if (telefonoAuthed && telefono === telefonoAuthed) {
    return 'No podés agregarte a vos mismo como contacto';
  }

  return null;
}

// ── Query builders (testables, silicatos del query real) ──
export function buildGetContactosQuery(userId: string): string {
  return `select=*&id_usuario=eq.${userId}&order=nombre.asc`;
}

export function buildDeleteContactoQuery(id: string, idUsuario: string): string {
  return `id=eq.${id}&id_usuario=eq.${idUsuario}`;
}

export function buildUpdateContactoQuery(id: string): string {
  return `id=eq.${id}`;
}

/** Construye un link wa.me con el teléfono (solo dígitos) y mensaje encodeado. */
export function buildWhatsAppLink(telefono: string, mensaje: string): string {
  const digitos = telefono.replace(/[^0-9]/g, '');
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Resuelve el reemplazo de principal entre dos contactos.
 * - Mismo id → null (no-op)
 * - Hay principal viejo → {desmarcar: [viejo], marcar: nuevo}
 * - No hay principal → {desmarcar: [], marcar: nuevo}
 */
export function resolverReemplazoPrincipal(
  actualPrincipalId: string | null,
  nuevoId: string,
): {desmarcar: string[]; marcar: string} | null {
  if (actualPrincipalId === nuevoId) return null;
  return {
    desmarcar: actualPrincipalId ? [actualPrincipalId] : [],
    marcar: nuevoId,
  };
}