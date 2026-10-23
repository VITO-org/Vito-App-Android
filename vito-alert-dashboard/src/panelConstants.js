// ─────────────────────────────────────────────────────────────
// Constantes de dominio del panel QA.
//
// No hay acá ningún id de usuario, key ni UUID: la allowlist de perfiles
// vive en el servidor (Edge Function `panel-acceso`). Sólo catálogos de
// presentación y la réplica del deep-link que usa la app móvil.
// ─────────────────────────────────────────────────────────────

/** Tipos de alerta que el gate sabe generar (los valores los pone el server). */
export const TIPOS_ALERTA = [
  'hipoxia',
  'taquicardia',
  'bradicardia',
  'hipertension',
  'hipotension',
]

/** Severidades que el gate acepta al generar una alerta de prueba. */
export const SEVERIDADES_GENERABLES = [
  { valor: 'advertencia', etiqueta: 'Advertencia' },
  { valor: 'critica', etiqueta: 'Crítica' },
]

/** Severidades que existen en la base (para filtrar el historial). */
export const SEVERIDADES_ALERTA = [
  { valor: 'critica', etiqueta: 'Crítica' },
  { valor: 'advertencia', etiqueta: 'Advertencia' },
  { valor: 'leve', etiqueta: 'Leve' },
  { valor: 'INFO', etiqueta: 'INFO' },
]

/** Filtro por estado de lectura (lo aplica el servidor). */
export const ESTADOS_ALERTA = [
  { valor: '', etiqueta: 'Todas' },
  { valor: 'no_leida', etiqueta: 'No leída' },
  { valor: 'leida', etiqueta: 'Leída' },
]

/** Límite por defecto de la consulta de alertas (configurable en la UI). */
export const LIMITE_DEFAULT = 50

export const LIMITES = [12, 25, 50, 100, 200]

/** Presets de horario silencioso (mismos que el panel legacy). */
export const PRESETS_QUIET_HOURS = [
  { etiqueta: '23–07', inicio: '23:00', fin: '07:00' },
  { etiqueta: '22–06', inicio: '22:00', fin: '06:00' },
  { etiqueta: '00–06', inicio: '00:00', fin: '06:00' },
]

/** Rango por defecto del editor de quiet-hours. */
export const QUIET_HOURS_INICIO = '23:00'
export const QUIET_HOURS_FIN = '07:00'

/** Marca que usa el backend cuando la entrega se cayó por quiet-hours. */
export const MARCA_SUPRIMIDA = 'suprimida_quiet_hours'

/**
 * Réplica de `destinoPorTipoAlerta` (src/context/NotificationsProvider.tsx):
 * tipo de alerta → deep-link con el que la app abriría el detalle del signo.
 * No replica la tabla de umbrales: eso vive en el detector de la app.
 */
export function destinoPorTipoAlerta(tipoAlerta) {
  switch (tipoAlerta) {
    case 'hipoxia':
      return { tipoSigno: 'saturacion_oxigeno', label: 'Saturación de oxígeno', unit: '%' }
    case 'hipertension':
    case 'hipotension':
      return { tipoSigno: 'presion_sistolica', label: 'Presión arterial', unit: 'mmHg' }
    case 'taquicardia':
    case 'bradicardia':
      return { tipoSigno: 'frecuencia_cardiaca', label: 'Frecuencia cardíaca', unit: 'lpm' }
    default:
      return { tipoSigno: 'frecuencia_cardiaca', label: 'Frecuencia cardíaca', unit: 'lpm' }
  }
}
