import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Filter,
  LogOut,
  MoonStar,
  PackageSearch,
  RefreshCw,
  Send,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import {
  ESTADOS_ALERTA,
  LIMITE_DEFAULT,
  LIMITES,
  MARCA_SUPRIMIDA,
  PRESETS_QUIET_HOURS,
  QUIET_HOURS_FIN,
  QUIET_HOURS_INICIO,
  SEVERIDADES_ALERTA,
  SEVERIDADES_GENERABLES,
  TIPOS_ALERTA,
  destinoPorTipoAlerta,
} from './panelConstants'
import {
  PanelAuthError,
  borrarToken,
  guardarToken,
  leerToken,
  panelApi,
} from './panelApi'
import './styles.css'

// ─────────────────────────────────────────────────────────────
// Panel QA de alertas de Vito.
//
// Reglas de la casa:
//  * el panel NO habla con la base directamente: todo pasa por la Edge
//    Function `panel-acceso`, que exige un token de sesión válido;
//  * la allowlist de usuarios y los valores de las alertas de prueba
//    viven en el servidor, no en este bundle;
//  * la UI no filtra nada localmente: los filtros van en el request.
// ─────────────────────────────────────────────────────────────

const VISTAS = {
  GENERAR: 'generar',
  HISTORIAL: 'historial',
}

// ─── Helpers de presentación ───

const normalize = (valor) => (valor || '').trim().toLowerCase()

function formatearFecha(iso) {
  if (!iso) return 'Sin fecha'
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return 'Sin fecha'
  return fecha.toLocaleString('es-AR')
}

/** "23:00:00" → "23:00" (los <input type="time"> piden HH:MM). */
function aHoraMinutos(valor) {
  return valor ? String(valor).slice(0, 5) : ''
}

function nombreUsuario(idUsuario, usuarios) {
  const perfil = (usuarios || []).find((u) => u.id_usuario === idUsuario)
  if (perfil) return `${perfil.nombre || ''} ${perfil.apellido || ''}`.trim() || 'Usuario'
  if (!idUsuario) return 'Usuario desconocido'
  return `${String(idUsuario).slice(0, 8)}…`
}

// ─────────────────────────────────────────────────────────────
// Pantalla de acceso (gate)
// ─────────────────────────────────────────────────────────────

function PantallaAcceso({ mensaje, onAcceso }) {
  const [passcode, setPasscode] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(mensaje || null)

  useEffect(() => {
    setError(mensaje || null)
  }, [mensaje])

  async function ingresar(evento) {
    evento.preventDefault()
    if (!passcode.trim()) {
      setError('Ingresá el passcode del panel.')
      return
    }
    setEnviando(true)
    setError(null)
    try {
      await onAcceso(passcode.trim())
    } catch (err) {
      setError(err?.message || 'No se pudo validar el passcode.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="accessScreen">
      <div className="accessCard">
        <div className="brand">
          <div className="brandmark">V</div>
          <div>
            <b>Vito</b>
            <span>Control Center</span>
          </div>
        </div>

        <h1>Acceso al panel QA</h1>
        <p className="accessLead">
          Este panel requiere un passcode válido. Las operaciones se ejecutan en el servidor,
          nunca desde el navegador.
        </p>

        {error && (
          <div className="notice error">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={ingresar}>
          <label>Passcode</label>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="••••••••••"
            autoComplete="current-password"
            autoFocus
          />
          <button className="primary" disabled={enviando}>
            {enviando ? (
              'Validando…'
            ) : (
              <>
                <ShieldCheck size={18} />
                Ingresar
              </>
            )}
          </button>
        </form>

        <small className="accessHint">La sesión dura 8 horas y se cierra con “Salir”.</small>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Fila de alerta (historial + vista rápida)
// ─────────────────────────────────────────────────────────────

function FilaAlerta({ alerta, usuarios }) {
  const [copiado, setCopiado] = useState(false)
  const destino = destinoPorTipoAlerta(alerta.tipo)

  async function copiarId() {
    try {
      await navigator.clipboard.writeText(alerta.id)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    } catch {
      /* clipboard no disponible: el id queda visible para copiar a mano */
    }
  }

  return (
    <article>
      <div className={`dot ${normalize(alerta.severidad)}`} />
      <div className="histBody">
        <div className="histTop">
          <b>{alerta.titulo || alerta.tipo}</b>
          <span>{alerta.leida_en ? 'Leída' : 'No leída'}</span>
        </div>
        <p>
          {nombreUsuario(alerta.id_usuario, usuarios)} · <strong>{alerta.tipo}</strong> ·{' '}
          {alerta.severidad}
        </p>
        <small>{formatearFecha(alerta.created_at)}</small>

        <div className="deepLink" title="Deep-link esperado en la app">
          <ExternalLink size={13} />
          <span>
            AlertDetail → {destino.tipoSigno} ({destino.label}, {destino.unit})
          </span>
        </div>

        <div className="alertIdRow">
          <code className="code" title={alerta.id}>
            {alerta.id}
          </code>
          <button type="button" className="copyBtn" onClick={copiarId} title="Copiar alertId">
            {copiado ? <CheckCircle2 size={13} /> : <Copy size={13} />}
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>
    </article>
  )
}

// ─────────────────────────────────────────────────────────────
// Delivery log (notificacion_entrega)
// ─────────────────────────────────────────────────────────────

function FilaEntrega({ entrega }) {
  const suprimida = entrega.error_mensaje === MARCA_SUPRIMIDA
  const fallida = entrega.estado === 'fallida'
  const clases = ['deliveryRow']
  if (fallida) clases.push('failed')
  if (suprimida) clases.push('suppressed')

  const alerta = entrega.alerta

  return (
    <div className={clases.join(' ')}>
      <div className="deliveryMain">
        <span className={`deliveryBadge ${normalize(entrega.estado)}`}>{entrega.estado || '—'}</span>
        <span className="deliveryAlert">
          {alerta ? `${alerta.tipo}/${alerta.severidad} · ${alerta.titulo}` : 'Sin alerta asociada'}
        </span>
        <span className="deliveryTime">{formatearFecha(entrega.enviado_en)}</span>
      </div>
      <div className="deliverySub">
        <span title={entrega.id_alerta || ''}>alerta: {entrega.id_alerta || '—'}</span>
        <span>error: {entrega.error_mensaje || '—'}</span>
        <span>dispositivo: {entrega.id_dispositivo ? String(entrega.id_dispositivo).slice(0, 8) : '—'}</span>
        <span>recibida: {entrega.recibida_en ? 'sí' : 'no'}</span>
        <span>leída: {entrega.leida_en ? 'sí' : 'no'}</span>
      </div>
    </div>
  )
}

function PanelEntregas({
  entregas,
  cargando,
  error,
  usuarios,
  filtroUsuario,
  onFiltroUsuario,
  filtroAlertId,
  onFiltroAlertId,
  onRecargar,
}) {
  return (
    <section className="card deliveryCard">
      <div className="cardHead">
        <div>
          <h2>Delivery log</h2>
          <p>notificacion_entrega · estado real de cada push</p>
        </div>
        <PackageSearch />
      </div>

      <div className="filterGrid">
        <div>
          <label>Usuario</label>
          <select value={filtroUsuario} onChange={(e) => onFiltroUsuario(e.target.value)}>
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id_usuario} value={u.id_usuario}>
                {u.nombre} {u.apellido || ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>AlertId</label>
          <input
            value={filtroAlertId}
            onChange={(e) => onFiltroAlertId(e.target.value)}
            placeholder="uuid de alerta (opcional)"
          />
        </div>
        <button className="ghost" onClick={onRecargar}>
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>

      <div className="deliveryList">
        {cargando ? (
          <div className="empty">Cargando entregas…</div>
        ) : error ? (
          <div className="notice error">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        ) : entregas.length === 0 ? (
          <div className="empty">Sin entregas para el filtro actual.</div>
        ) : (
          entregas.map((entrega) => <FilaEntrega key={entrega.id} entrega={entrega} />)
        )}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Editor de horario silencioso (preferencia_notificacion)
// ─────────────────────────────────────────────────────────────

function PanelQuietHours({
  usuarios,
  usuario,
  onUsuario,
  inicio,
  onInicio,
  fin,
  onFin,
  preferencia,
  cargando,
  guardando,
  aviso,
  onGuardar,
}) {
  return (
    <section className="card quietCard">
      <div className="cardHead">
        <div>
          <h2>Horario silencioso</h2>
          <p>preferencia_notificacion · quiet-hours</p>
        </div>
        <MoonStar />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          onGuardar()
        }}
      >
        <label>Usuario</label>
        <select value={usuario} onChange={(e) => onUsuario(e.target.value)}>
          <option value="">Seleccionar usuario…</option>
          {usuarios.map((u) => (
            <option key={u.id_usuario} value={u.id_usuario}>
              {u.nombre} {u.apellido || ''}
            </option>
          ))}
        </select>

        <label>Presets</label>
        <div className="presetRow">
          {PRESETS_QUIET_HOURS.map((preset) => (
            <button
              key={preset.etiqueta}
              type="button"
              className="ghost"
              onClick={() => {
                onInicio(preset.inicio)
                onFin(preset.fin)
              }}
            >
              {preset.etiqueta}
            </button>
          ))}
        </div>

        <div className="two">
          <div>
            <label>Inicio</label>
            <input type="time" value={inicio} onChange={(e) => onInicio(e.target.value)} />
          </div>
          <div>
            <label>Fin</label>
            <input type="time" value={fin} onChange={(e) => onFin(e.target.value)} />
          </div>
        </div>

        <button className="primary" disabled={guardando || !usuario}>
          {guardando ? 'Guardando…' : 'Guardar horario'}
        </button>

        {aviso && (
          <div className={`notice ${aviso.kind}`}>
            {aviso.kind === 'ok' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{aviso.text}</span>
          </div>
        )}

        {cargando ? (
          <small className="quietCurrent">Cargando preferencia…</small>
        ) : preferencia ? (
          <small className="quietCurrent">
            Actual: {aHoraMinutos(preferencia.horario_silencioso_inicio)}–
            {aHoraMinutos(preferencia.horario_silencioso_fin)} · push {preferencia.push_habilitado ? 'habilitado' : 'deshabilitado'}
          </small>
        ) : usuario ? (
          <small className="quietCurrent">Sin preferencia guardada: se usarán los valores por defecto.</small>
        ) : null}

        <small className="quietHint">
          Críticas bypasean quiet-hours siempre. Ventana con wrap de medianoche.
        </small>
      </form>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────

function App() {
  // ── Sesión (gate) ──
  const [token, setToken] = useState(() => leerToken())
  const [mensajeSesion, setMensajeSesion] = useState(null)

  // ── Navegación ──
  const [vista, setVista] = useState(VISTAS.GENERAR)

  // ── Perfiles (allowlist del servidor) ──
  const [usuarios, setUsuarios] = useState([])
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false)

  // ── Aviso global ──
  const [aviso, setAviso] = useState(null)

  // ── Formulario de generación ──
  const [modo, setModo] = useState('salud')
  const [form, setForm] = useState({
    id_usuario: '',
    tipo: '',
    severidad: 'advertencia',
    info_titulo: 'Información de Vito',
    info_mensaje: '',
  })
  const [enviando, setEnviando] = useState(false)

  // ── Historial ──
  const [alertas, setAlertas] = useState([])
  const [totalAlertas, setTotalAlertas] = useState(0)
  const [cargandoAlertas, setCargandoAlertas] = useState(false)
  const [errorAlertas, setErrorAlertas] = useState(null)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroSeveridad, setFiltroSeveridad] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [limite, setLimite] = useState(LIMITE_DEFAULT)

  // ── Delivery log ──
  const [entregas, setEntregas] = useState([])
  const [cargandoEntregas, setCargandoEntregas] = useState(false)
  const [errorEntregas, setErrorEntregas] = useState(null)
  const [filtroEntregaUsuario, setFiltroEntregaUsuario] = useState('')
  const [filtroEntregaAlertId, setFiltroEntregaAlertId] = useState('')

  // ── Quiet hours ──
  const [quietUsuario, setQuietUsuario] = useState('')
  const [quietInicio, setQuietInicio] = useState(QUIET_HOURS_INICIO)
  const [quietFin, setQuietFin] = useState(QUIET_HOURS_FIN)
  const [preferencia, setPreferencia] = useState(null)
  const [cargandoQuiet, setCargandoQuiet] = useState(false)
  const [guardandoQuiet, setGuardandoQuiet] = useState(false)
  const [avisoQuiet, setAvisoQuiet] = useState(null)

  // Contador para forzar recargas manuales.
  const [refresco, setRefresco] = useState(0)

  const cerrarSesion = useCallback((mensaje) => {
    borrarToken()
    setToken(null)
    setUsuarios([])
    setAlertas([])
    setEntregas([])
    setPreferencia(null)
    setVista(VISTAS.GENERAR)
    setMensajeSesion(mensaje || null)
  }, [])

  const manejarFallo = useCallback(
    (error, contexto) => {
      if (error instanceof PanelAuthError) {
        cerrarSesion('Tu sesión del panel expiró o fue invalidada. Volvé a ingresar el passcode.')
        return
      }
      setAviso({
        kind: 'error',
        text: `${contexto}: ${error?.message || 'error inesperado'}`,
      })
    },
    [cerrarSesion],
  )

  const usuarioSeleccionado = useMemo(
    () => usuarios.find((u) => u.id_usuario === form.id_usuario) || null,
    [usuarios, form.id_usuario],
  )

  const payloadAlertas = useMemo(() => {
    const payload = { limite }
    if (filtroTipo) payload.tipo = filtroTipo
    if (filtroSeveridad) payload.severidad = filtroSeveridad
    if (filtroEstado) payload.estado = filtroEstado
    if (filtroUsuario) payload.usuario = filtroUsuario
    return payload
  }, [filtroTipo, filtroSeveridad, filtroEstado, filtroUsuario, limite])

  const payloadEntregas = useMemo(() => {
    const payload = { limite: LIMITE_DEFAULT }
    if (filtroEntregaUsuario) payload.usuario = filtroEntregaUsuario
    if (filtroEntregaAlertId.trim()) payload.alertId = filtroEntregaAlertId.trim()
    return payload
  }, [filtroEntregaUsuario, filtroEntregaAlertId])

  // ── Carga de perfiles ──
  useEffect(() => {
    if (!token) return undefined
    let vigente = true
    setCargandoUsuarios(true)
    panelApi
      .listarPerfiles(token)
      .then((data) => {
        if (vigente) setUsuarios(Array.isArray(data.perfiles) ? data.perfiles : [])
      })
      .catch((error) => {
        if (vigente) manejarFallo(error, 'No se pudieron cargar los usuarios')
      })
      .finally(() => {
        if (vigente) setCargandoUsuarios(false)
      })
    return () => {
      vigente = false
    }
  }, [token, refresco, manejarFallo])

  // ── Carga del historial (los filtros viajan al servidor) ──
  useEffect(() => {
    if (!token) return undefined
    let vigente = true
    setCargandoAlertas(true)
    setErrorAlertas(null)
    panelApi
      .listarAlertas(token, payloadAlertas)
      .then((data) => {
        if (!vigente) return
        const lista = Array.isArray(data.alertas) ? data.alertas : []
        setAlertas(lista)
        setTotalAlertas(typeof data.total === 'number' ? data.total : lista.length)
      })
      .catch((error) => {
        if (!vigente) return
        if (error instanceof PanelAuthError) {
          cerrarSesion('Tu sesión del panel expiró o fue invalidada. Volvé a ingresar el passcode.')
          return
        }
        setErrorAlertas(error?.message || 'No se pudo cargar el historial.')
      })
      .finally(() => {
        if (vigente) setCargandoAlertas(false)
      })
    return () => {
      vigente = false
    }
  }, [token, payloadAlertas, refresco, cerrarSesion])

  // ── Carga del delivery log (sólo cuando la vista de historial está abierta) ──
  useEffect(() => {
    if (!token || vista !== VISTAS.HISTORIAL) return undefined
    let vigente = true
    setCargandoEntregas(true)
    setErrorEntregas(null)
    panelApi
      .listarEntregas(token, payloadEntregas)
      .then((data) => {
        if (vigente) setEntregas(Array.isArray(data.entregas) ? data.entregas : [])
      })
      .catch((error) => {
        if (!vigente) return
        if (error instanceof PanelAuthError) {
          cerrarSesion('Tu sesión del panel expiró o fue invalidada. Volvé a ingresar el passcode.')
          return
        }
        setErrorEntregas(error?.message || 'No se pudo cargar el delivery log.')
      })
      .finally(() => {
        if (vigente) setCargandoEntregas(false)
      })
    return () => {
      vigente = false
    }
  }, [token, vista, payloadEntregas, refresco, cerrarSesion])

  // ── Lectura del horario silencioso del usuario elegido ──
  useEffect(() => {
    if (!token || !quietUsuario) {
      setPreferencia(null)
      return undefined
    }
    let vigente = true
    setCargandoQuiet(true)
    panelApi
      .obtenerHorarioSilencioso(token, quietUsuario)
      .then((data) => {
        if (!vigente) return
        const pref = data.preferencia || null
        setPreferencia(pref)
        if (pref) {
          setQuietInicio(aHoraMinutos(pref.horario_silencioso_inicio) || QUIET_HOURS_INICIO)
          setQuietFin(aHoraMinutos(pref.horario_silencioso_fin) || QUIET_HOURS_FIN)
        }
      })
      .catch((error) => {
        if (!vigente) return
        if (error instanceof PanelAuthError) {
          cerrarSesion('Tu sesión del panel expiró o fue invalidada. Volvé a ingresar el passcode.')
          return
        }
        setAvisoQuiet({ kind: 'error', text: error?.message || 'No se pudo leer el horario silencioso.' })
      })
      .finally(() => {
        if (vigente) setCargandoQuiet(false)
      })
    return () => {
      vigente = false
    }
  }, [token, quietUsuario, cerrarSesion])

  // ── Acceso ──
  async function ingresar(passcode) {
    const data = await panelApi.validarAcceso(passcode)
    guardarToken(data.token, data.expira_en)
    setMensajeSesion(null)
    setToken(data.token)
  }

  // ── Envío del formulario ──
  async function enviar(evento) {
    evento.preventDefault()
    setAviso(null)

    if (!form.id_usuario) {
      setAviso({ kind: 'error', text: 'Seleccioná un usuario.' })
      return
    }

    setEnviando(true)
    try {
      if (modo === 'info') {
        const mensaje = form.info_mensaje.trim()
        if (!mensaje) {
          setAviso({ kind: 'error', text: 'Escribí el mensaje informativo.' })
          return
        }
        const titulo = form.info_titulo.trim() || 'Información de Vito'
        const data = await panelApi.enviarInfo(token, {
          id_usuario: form.id_usuario,
          titulo,
          mensaje,
        })
        const info = data.info || {}
        if (info.pushed === 0) {
          setAviso({
            kind: 'error',
            text: `La INFO se guardó, pero no se envió a ningún dispositivo${
              info.reason ? ` (${info.reason})` : ''
            }.`,
          })
          return
        }
        setAviso({
          kind: 'ok',
          text: `INFO enviada a ${nombreUsuario(form.id_usuario, usuarios)} correctamente${
            typeof info.pushed === 'number' ? ` (${info.pushed} push)` : ''
          }.`,
        })
        setForm((f) => ({ ...f, info_mensaje: '' }))
        return
      }

      if (!form.tipo || !form.severidad) {
        setAviso({ kind: 'error', text: 'Completá tipo y severidad.' })
        return
      }

      const data = await panelApi.insertarDatoPrueba(token, {
        id_usuario: form.id_usuario,
        tipo: form.tipo,
        severidad: form.severidad,
      })
      setAviso({
        kind: 'ok',
        text: `Dato de prueba generado para ${nombreUsuario(form.id_usuario, usuarios)} (${
          data.tipo
        }/${data.severidad}). Vito debería generar la alerta y el push automáticamente.`,
      })
    } catch (error) {
      manejarFallo(error, 'No se pudo completar la operación')
    } finally {
      setEnviando(false)
    }
  }

  // ── Guardado del horario silencioso ──
  async function guardarQuietHours() {
    setAvisoQuiet(null)
    if (!quietUsuario) {
      setAvisoQuiet({ kind: 'error', text: 'Seleccioná un usuario.' })
      return
    }
    if (!quietInicio || !quietFin) {
      setAvisoQuiet({ kind: 'error', text: 'Ingresá inicio y fin.' })
      return
    }
    setGuardandoQuiet(true)
    try {
      const data = await panelApi.upsertHorarioSilencioso(token, {
        id_usuario: quietUsuario,
        inicio: quietInicio,
        fin: quietFin,
      })
      const pref = data.preferencia || null
      setPreferencia(pref)
      if (pref) {
        setQuietInicio(aHoraMinutos(pref.horario_silencioso_inicio) || quietInicio)
        setQuietFin(aHoraMinutos(pref.horario_silencioso_fin) || quietFin)
      }
      setAvisoQuiet({
        kind: 'ok',
        text: `Horario silencioso guardado (${quietInicio}–${quietFin}).`,
      })
    } catch (error) {
      if (error instanceof PanelAuthError) {
        cerrarSesion('Tu sesión del panel expiró o fue invalidada. Volvé a ingresar el passcode.')
        return
      }
      setAvisoQuiet({
        kind: 'error',
        text: error?.message || 'No se pudo guardar el horario silencioso.',
      })
    } finally {
      setGuardandoQuiet(false)
    }
  }

  const setCampo = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))
  const recargarTodo = () => setRefresco((r) => r + 1)

  if (!token) {
    return <PantallaAcceso mensaje={mensajeSesion} onAcceso={ingresar} />
  }

  const sinUsuarios = !cargandoUsuarios && usuarios.length === 0

  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <div className="brandmark">V</div>
          <div>
            <b>Vito</b>
            <span>Control Center</span>
          </div>
        </div>

        <nav>
          <div
            role="button"
            tabIndex={0}
            className={vista === VISTAS.GENERAR ? 'active' : ''}
            onClick={() => setVista(VISTAS.GENERAR)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setVista(VISTAS.GENERAR)
              }
            }}
          >
            <BellRing size={19} /> Generar alerta
          </div>
          <div
            role="button"
            tabIndex={0}
            className={vista === VISTAS.HISTORIAL ? 'active' : ''}
            onClick={() => setVista(VISTAS.HISTORIAL)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setVista(VISTAS.HISTORIAL)
              }
            }}
          >
            <Clock3 size={19} /> Historial
          </div>
        </nav>

        <div className="asideFoot">
          <span>Supabase · Producción</span>
          <button className="logoutBtn" onClick={() => cerrarSesion(null)}>
            <LogOut size={14} /> Salir
          </button>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <p className="eyebrow">ADMINISTRACIÓN</p>
            <h1>{vista === VISTAS.GENERAR ? 'Generador de alertas' : 'Historial y QA'}</h1>
            <p>
              {vista === VISTAS.GENERAR
                ? 'Generá datos de prueba para activar el flujo real de alertas y notificaciones push de Vito.'
                : 'Revisá las alertas generadas, el delivery log de las notificaciones y los horarios silenciosos.'}
            </p>
          </div>
          <button className="ghost" onClick={recargarTodo}>
            <RefreshCw size={17} />
            Actualizar
          </button>
        </header>

        {aviso && (
          <div className={`notice ${aviso.kind}`}>
            {aviso.kind === 'ok' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{aviso.text}</span>
          </div>
        )}

        <section className="stats">
          <div>
            <span>Usuarios habilitados</span>
            <strong>{usuarios.length}</strong>
          </div>
          <div>
            <span>Tipos soportados</span>
            <strong>{TIPOS_ALERTA.length}</strong>
          </div>
          <div>
            <span>{vista === VISTAS.HISTORIAL ? 'Alertas filtradas' : 'Alertas cargadas'}</span>
            <strong>{totalAlertas}</strong>
          </div>
        </section>

        {vista === VISTAS.GENERAR ? (
          <div className="grid">
            <section className="card formCard">
              <div className="cardHead">
                <div>
                  <h2>Nueva alerta</h2>
                </div>
                <BellRing />
              </div>

              <form onSubmit={enviar}>
                <label>Usuario *</label>
                <select
                  value={form.id_usuario}
                  onChange={(e) => setCampo('id_usuario', e.target.value)}
                >
                  <option value="">
                    {cargandoUsuarios ? 'Cargando usuarios…' : 'Seleccionar usuario…'}
                  </option>
                  {usuarios.map((u) => (
                    <option key={u.id_usuario} value={u.id_usuario}>
                      {u.nombre} {u.apellido || ''}
                    </option>
                  ))}
                </select>
                {usuarioSeleccionado && (
                  <div className="userChip">
                    <UserRound size={18} />
                    <div>
                      <b>
                        {usuarioSeleccionado.nombre} {usuarioSeleccionado.apellido}
                      </b>
                      <small>{usuarioSeleccionado.id_usuario}</small>
                    </div>
                  </div>
                )}
                {sinUsuarios && (
                  <div className="emptyHint">
                    No hay usuarios habilitados en la allowlist del servidor. Pedile a un administrador que
                    agregue cuentas de QA en el panel-acceso.
                  </div>
                )}

                <label>Tipo de envío *</label>
                <div className="two">
                  <button
                    type="button"
                    className={modo === 'salud' ? 'primary' : 'ghost'}
                    onClick={() => setModo('salud')}
                  >
                    Alerta de salud
                  </button>
                  <button
                    type="button"
                    className={modo === 'info' ? 'primary' : 'ghost'}
                    onClick={() => setModo('info')}
                  >
                    INFO
                  </button>
                </div>

                {modo === 'salud' ? (
                  <div className="two">
                    <div>
                      <label>Tipo *</label>
                      <select value={form.tipo} onChange={(e) => setCampo('tipo', e.target.value)}>
                        <option value="">Seleccionar tipo…</option>
                        {TIPOS_ALERTA.map((tipo) => (
                          <option key={tipo} value={tipo}>
                            {tipo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>Severidad *</label>
                      <select
                        value={form.severidad}
                        onChange={(e) => setCampo('severidad', e.target.value)}
                      >
                        {SEVERIDADES_GENERABLES.map((sev) => (
                          <option key={sev.valor} value={sev.valor}>
                            {sev.etiqueta}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <>
                    <label>Título</label>
                    <input
                      value={form.info_titulo}
                      onChange={(e) => setCampo('info_titulo', e.target.value)}
                      placeholder="Información de Vito"
                    />
                    <label>Mensaje *</label>
                    <textarea
                      rows="5"
                      value={form.info_mensaje}
                      onChange={(e) => setCampo('info_mensaje', e.target.value)}
                      placeholder="Escribí el mensaje que recibirá el usuario en su celular…"
                    />
                  </>
                )}

                <button className="primary" disabled={enviando}>
                  {enviando ? (
                    'Enviando…'
                  ) : (
                    <>
                      <Send size={18} />
                      {modo === 'info' ? 'Enviar INFO a Vito' : 'Enviar alerta a Vito'}
                    </>
                  )}
                </button>
              </form>
            </section>

            <section className="card history">
              <div className="cardHead">
                <div>
                  <h2>Últimas alertas</h2>
                  <p>Vista rápida · {totalAlertas} alertas en el filtro actual.</p>
                </div>
                <button className="linkBtn" onClick={() => setVista(VISTAS.HISTORIAL)}>
                  Ver historial <ExternalLink size={14} />
                </button>
              </div>
              {cargandoAlertas ? (
                <div className="empty">Cargando…</div>
              ) : errorAlertas ? (
                <div className="notice error">
                  <AlertTriangle size={18} />
                  <span>{errorAlertas}</span>
                </div>
              ) : alertas.length === 0 ? (
                <div className="empty">Todavía no hay alertas para mostrar.</div>
              ) : (
                <>
                  {alertas.slice(0, 8).map((alerta) => (
                    <FilaAlerta key={alerta.id} alerta={alerta} usuarios={usuarios} />
                  ))}
                  {alertas.length > 8 && (
                    <button className="linkBtn moreBtn" onClick={() => setVista(VISTAS.HISTORIAL)}>
                      Ver las {totalAlertas} alertas
                    </button>
                  )}
                </>
              )}
            </section>
          </div>
        ) : (
          <div className="grid">
            <div className="colStack">
              <section className="card filterCard">
                <div className="cardHead">
                  <div>
                    <h2>Filtros</h2>
                    <p>Se aplican en la consulta al servidor.</p>
                  </div>
                  <Filter />
                </div>
                <div className="filterGrid">
                  <div>
                    <label>Tipo</label>
                    <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                      <option value="">Todos</option>
                      {TIPOS_ALERTA.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Severidad</label>
                    <select
                      value={filtroSeveridad}
                      onChange={(e) => setFiltroSeveridad(e.target.value)}
                    >
                      <option value="">Todas</option>
                      {SEVERIDADES_ALERTA.map((sev) => (
                        <option key={sev.valor} value={sev.valor}>
                          {sev.etiqueta}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Estado</label>
                    <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                      {ESTADOS_ALERTA.map((estado) => (
                        <option key={estado.valor || 'todas'} value={estado.valor}>
                          {estado.etiqueta}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Usuario</label>
                    <select value={filtroUsuario} onChange={(e) => setFiltroUsuario(e.target.value)}>
                      <option value="">Todos</option>
                      {usuarios.map((u) => (
                        <option key={u.id_usuario} value={u.id_usuario}>
                          {u.nombre} {u.apellido || ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Límite</label>
                    <select value={limite} onChange={(e) => setLimite(Number(e.target.value))}>
                      {LIMITES.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="ghost" onClick={recargarTodo}>
                    <RefreshCw size={16} />
                    Actualizar
                  </button>
                </div>
              </section>

              <section className="card history">
                <div className="cardHead">
                  <div>
                    <h2>Historial de alertas</h2>
                    <p>{totalAlertas} alertas para el filtro actual.</p>
                  </div>
                </div>
                {cargandoAlertas ? (
                  <div className="empty">Cargando…</div>
                ) : errorAlertas ? (
                  <div className="notice error">
                    <AlertTriangle size={18} />
                    <span>{errorAlertas}</span>
                  </div>
                ) : alertas.length === 0 ? (
                  <div className="empty">Todavía no hay alertas para mostrar.</div>
                ) : (
                  alertas.map((alerta) => (
                    <FilaAlerta key={alerta.id} alerta={alerta} usuarios={usuarios} />
                  ))
                )}
              </section>
            </div>

            <div className="colStack">
              <PanelEntregas
                entregas={entregas}
                cargando={cargandoEntregas}
                error={errorEntregas}
                usuarios={usuarios}
                filtroUsuario={filtroEntregaUsuario}
                onFiltroUsuario={setFiltroEntregaUsuario}
                filtroAlertId={filtroEntregaAlertId}
                onFiltroAlertId={setFiltroEntregaAlertId}
                onRecargar={recargarTodo}
              />

              <PanelQuietHours
                usuarios={usuarios}
                usuario={quietUsuario}
                onUsuario={setQuietUsuario}
                inicio={quietInicio}
                onInicio={setQuietInicio}
                fin={quietFin}
                onFin={setQuietFin}
                preferencia={preferencia}
                cargando={cargandoQuiet}
                guardando={guardandoQuiet}
                aviso={avisoQuiet}
                onGuardar={guardarQuietHours}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
