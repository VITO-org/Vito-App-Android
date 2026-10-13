import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AlertTriangle, BellRing, CheckCircle2, Clock3, RefreshCw, Send, UserRound } from 'lucide-react'
import { supabase } from './supabase'
import './styles.css'

const ALLOWED_IDS = [
  'ee6b8389-f546-4339-9853-1e3f13487004',
  'd11f3190-6d35-4b6e-b9c9-f75f55716b8b',
  '276e9db2-f382-44fd-93c4-5c7226a0019e',
  'dbeff0c5-468f-48d8-9363-85fb5ba2b951'
]
const FALLBACK_USERS = [
  { id_usuario: ALLOWED_IDS[0], nombre: 'Cristian', apellido: 'Vera' },
  { id_usuario: ALLOWED_IDS[1], nombre: 'Flor', apellido: 'González' },
  { id_usuario: ALLOWED_IDS[2], nombre: 'Victor', apellido: 'Molina' },
  { id_usuario: ALLOWED_IDS[3], nombre: 'Nicolas', apellido: 'Vallejos Zabala' }
]
const DEFAULT_TYPES = ['taquicardia','bradicardia','hipoxia','hipertension','hipotension']
const sev = ['advertencia','critica']
const normalize = s => (s || '').trim().toLowerCase()
const titleFor = (tipo, severidad) => `${severidad === 'critica' ? 'Alerta crítica' : severidad === 'advertencia' ? 'Advertencia' : 'Información'}: ${tipo || 'evento'}`

function App(){
 const [users,setUsers]=useState(FALLBACK_USERS), [types,setTypes]=useState(DEFAULT_TYPES), [history,setHistory]=useState([])
 const [loading,setLoading]=useState(true), [sending,setSending]=useState(false), [notice,setNotice]=useState(null)
 const [mode,setMode]=useState('salud')
 const [form,setForm]=useState({id_usuario:'',tipo:'',severidad:'advertencia',info_titulo:'Información de Vito',info_mensaje:''})
 const selected=useMemo(()=>users.find(u=>u.id_usuario===form.id_usuario),[users,form.id_usuario])
 const set=(k,v)=>setForm(f=>({...f,[k]:v}))

 async function load(){
   setLoading(true); setNotice(null)
   const profilesTable=import.meta.env.VITE_PROFILES_TABLE || 'perfil_usuario'
   const [u,a,h]=await Promise.all([
     supabase.from(profilesTable).select('id_usuario,nombre,apellido').in('id_usuario',ALLOWED_IDS),
     supabase.from('alerta').select('tipo'),
     supabase.from('alerta').select('id,id_usuario,tipo,severidad,titulo,mensaje,created_at,leida_en').in('id_usuario',ALLOWED_IDS).order('created_at',{ascending:false}).limit(12)
   ])
   if(!u.error && u.data?.length) setUsers(ALLOWED_IDS.map(id=>u.data.find(x=>x.id_usuario===id)).filter(Boolean))
   if(!a.error && a.data?.length){ const supported=new Set(DEFAULT_TYPES); const unique=[...new Set(a.data.map(x=>normalize(x.tipo)).filter(t=>supported.has(t)))]; setTypes([...new Set([...DEFAULT_TYPES,...unique])]) }
   if(!h.error) setHistory(h.data || [])
   setLoading(false)
 }
 useEffect(()=>{load()},[])

 async function submit(e){
   e.preventDefault(); setNotice(null)
   if(!form.id_usuario) return setNotice({kind:'error',text:'Seleccioná un usuario.'})

   setSending(true)

   if(mode==='info'){
     if(!form.info_mensaje.trim()){
       setSending(false)
       return setNotice({kind:'error',text:'Escribí el mensaje informativo.'})
     }

     const titulo=form.info_titulo.trim() || 'Información de Vito'
     const mensaje=form.info_mensaje.trim()

     // INFO se procesa server-side por la misma Edge Function que las alertas de salud.
     const {data,error}=await supabase.functions.invoke('enviar-info',{
       body:{
         tipo:'info',
         id_usuario:form.id_usuario,
         titulo,
         mensaje
       }
     })

     setSending(false)

     if(error){
       return setNotice({kind:'error',text:`No se pudo enviar la INFO: ${error.message}`})
     }

     if(data?.error){
       return setNotice({kind:'error',text:`No se pudo enviar la INFO: ${data.error}${data.detail ? ` · ${data.detail}` : ''}`})
     }

     if(data?.pushed===0){
       return setNotice({kind:'error',text:`La INFO se guardó, pero no se envió a ningún dispositivo${data?.reason ? ` (${data.reason})` : ''}.`})
     }

     setNotice({kind:'ok',text:`INFO enviada a ${selected?.nombre || 'usuario'} correctamente${typeof data?.pushed==='number' ? ` (${data.pushed} push)` : ''}.`})
     setForm(f=>({...f,info_mensaje:''}))
     setTimeout(load,1200)
     return
   }

   if(!form.tipo || !form.severidad){
     setSending(false)
     return setNotice({kind:'error',text:'Completá tipo y severidad.'})
   }

   const tipo=normalize(form.tipo)
   const severidad=normalize(form.severidad)
   const payload={id_usuario:form.id_usuario,spo2_pct:null,frec_cardiaca_bpm:null,bp_sistolica:null,bp_diastolica:null,temperatura:null,nivel_estres:null,actividad_pasos:null,horas_sueno:null,origen:'dashboard_manual',recorded_at:new Date().toISOString()}

   if(tipo==='hipoxia') payload.spo2_pct=severidad==='critica'?82:88
   else if(tipo==='taquicardia') payload.frec_cardiaca_bpm=severidad==='critica'?125:110
   else if(tipo==='bradicardia') payload.frec_cardiaca_bpm=severidad==='critica'?38:45
   else if(tipo==='hipertension'){ payload.bp_sistolica=severidad==='critica'?165:145; payload.bp_diastolica=severidad==='critica'?105:95 }
   else if(tipo==='hipotension'){ payload.bp_sistolica=severidad==='critica'?75:85; payload.bp_diastolica=severidad==='critica'?45:55 }
   else {
     setSending(false)
     return setNotice({kind:'error',text:`El tipo "${form.tipo}" no puede generarse desde datos_reloj.`})
   }

   const {error}=await supabase.from('datos_reloj').insert(payload)
   setSending(false)
   if(error) return setNotice({kind:'error',text:`Supabase rechazó el dato de prueba: ${error.message}`})
   setNotice({kind:'ok',text:`Dato de prueba enviado para ${selected?.nombre || 'usuario'}. Vito debería generar la alerta y el push automáticamente.`})
   setTimeout(load,1200)
 }
 function changeType(v){ setForm(f=>({...f,tipo:v,titulo:f.titulo || titleFor(v,f.severidad)})) }
 function changeSeverity(v){ setForm(f=>({...f,severidad:v,titulo:f.titulo ? titleFor(f.tipo,v) : f.titulo})) }
 const userName=id=>{const u=users.find(x=>x.id_usuario===id);return u?`${u.nombre} ${u.apellido||''}`.trim():id.slice(0,8)+'…'}

 return <div className="shell">
  <aside><div className="brand"><div className="brandmark">V</div><div><b>Vito</b><span>Control Center</span></div></div><nav><div className="active"><BellRing size={19}/> Generar alerta</div><div><Clock3 size={19}/> Historial</div></nav><div className="asideFoot">Supabase · Producción</div></aside>
  <main><header><div><p className="eyebrow">ADMINISTRACIÓN</p><h1>Generador de alertas</h1><p>Generá datos de prueba para activar el flujo real de alertas y notificaciones push de Vito.</p></div><button className="ghost" onClick={load}><RefreshCw size={17}/>Actualizar</button></header>
   {notice && <div className={`notice ${notice.kind}`}>{notice.kind==='ok'?<CheckCircle2 size={18}/>:<AlertTriangle size={18}/>}<span>{notice.text}</span></div>}
   <section className="stats"><div><span>Usuarios habilitados</span><strong>{users.length}</strong></div><div><span>Tipos detectados</span><strong>{types.length}</strong></div><div><span>Alertas recientes</span><strong>{history.length}</strong></div></section>
   <div className="grid"><section className="card formCard"><div className="cardHead"><div><h2>Nueva alerta</h2></div><BellRing/></div>
    <form onSubmit={submit}>
     <label>Usuario *</label><select value={form.id_usuario} onChange={e=>set('id_usuario',e.target.value)}><option value="">Seleccionar usuario…</option>{users.map(u=><option key={u.id_usuario} value={u.id_usuario}>{u.nombre} {u.apellido||''}</option>)}</select>
     {selected && <div className="userChip"><UserRound size={18}/><div><b>{selected.nombre} {selected.apellido}</b><small>{selected.id_usuario}</small></div></div>}

     <label>Tipo de envío *</label>
     <div className="two">
      <button type="button" className={mode==='salud'?'primary':'ghost'} onClick={()=>setMode('salud')}>Alerta de salud</button>
      <button type="button" className={mode==='info'?'primary':'ghost'} onClick={()=>setMode('info')}>INFO</button>
     </div>

     {mode==='salud' ? <>
      <div className="two"><div><label>Tipo *</label><select value={form.tipo} onChange={e=>changeType(e.target.value)}><option value="">Seleccionar tipo…</option>{types.map(t=><option key={t}>{t}</option>)}</select></div><div><label>Severidad *</label><select value={form.severidad} onChange={e=>changeSeverity(e.target.value)}>{sev.map(s=><option key={s}>{s}</option>)}</select></div></div>
     </> : <>
      <label>Título</label><input value={form.info_titulo} onChange={e=>set('info_titulo',e.target.value)} placeholder="Información de Vito"/>
      <label>Mensaje *</label><textarea rows="5" value={form.info_mensaje} onChange={e=>set('info_mensaje',e.target.value)} placeholder="Escribí el mensaje que recibirá el usuario en su celular…"/>
     </>}

     <button className="primary" disabled={sending}>{sending?'Enviando…':<><Send size={18}/>{mode==='info'?'Enviar INFO a Vito':'Enviar alerta a Vito'}</>}</button>
    </form></section>
    <section className="card history"><div className="cardHead"><div><h2>Últimas alertas</h2><p>Usuarios habilitados en este panel.</p></div></div>{loading?<div className="empty">Cargando…</div>:history.length===0?<div className="empty">Todavía no hay alertas para mostrar.</div>:history.map(x=><article key={x.id}><div className={`dot ${normalize(x.severidad)}`}></div><div className="histBody"><div className="histTop"><b>{x.titulo || x.tipo}</b><span>{x.leida_en?'Leída':'No leída'}</span></div><p>{userName(x.id_usuario)} · <strong>{x.tipo}</strong> · {x.severidad}</p><small>{x.created_at?new Date(x.created_at).toLocaleString('es-AR'):'Sin fecha'}</small></div></article>)}</section>
   </div>
  </main>
 </div>
}
createRoot(document.getElementById('root')).render(<App/>)
