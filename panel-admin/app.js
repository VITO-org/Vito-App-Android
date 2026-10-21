// ============================================
// VITO Admin Panel - App Logic
// ============================================

// Estado de la aplicación
let isConnected = false;
let alerts = [];
let deliveries = [];

// ============================================
// Inicialización
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initForm();
  initFilters();
  checkConnection();
  loadUsers();
  loadAlerts();
  initDeliveryLog();
  initQuietHours();
});

// ============================================
// Conexión a Supabase
// ============================================

async function checkConnection() {
  const statusEl = document.getElementById('connectionStatus');
  const dotEl = statusEl.querySelector('.status-dot');
  const textEl = statusEl.querySelector('.status-text');

  try {
    const response = await fetch(`${REST_BASE}/usuario?select=id&limit=1`, {
      headers: getHeaders()
    });

    if (response.ok) {
      isConnected = true;
      dotEl.classList.add('connected');
      textEl.textContent = 'Conectado a Supabase';
    } else {
      throw new Error('Connection failed');
    }
  } catch (error) {
    isConnected = false;
    dotEl.classList.add('error');
    textEl.textContent = 'Error de conexión';
    console.error('Supabase connection error:', error);
  }
}

// ============================================
// Cargar usuarios desde Supabase
// ============================================

async function loadUsers() {
  const selectEl = document.getElementById('userId');
  const filterEl = document.getElementById('filterUser');

  try {
    const response = await fetch(
      `${REST_BASE}/perfil_usuario?select=id_usuario,nombre,apellido&order=nombre.asc`,
      { headers: getHeaders() }
    );

    if (!response.ok) {
      throw new Error('Error al cargar usuarios');
    }

    const perfiles = await response.json();

    if (perfiles.length === 0) {
      selectEl.innerHTML = '<option value="">No hay usuarios</option>';
      return;
    }

    selectEl.innerHTML = '<option value="">Seleccionar usuario...</option>';
    filterEl.innerHTML = '<option value="">Todos</option>';
    syncExtraUserSelects();

    perfiles.forEach(p => {
      const nombre = [p.nombre, p.apellido].filter(Boolean).join(' ') || 'Sin nombre';
      const label = `${nombre} (${p.id_usuario.substring(0, 8)}...)`;

      const option1 = document.createElement('option');
      option1.value = p.id_usuario;
      option1.textContent = label;
      selectEl.appendChild(option1);

      const option2 = document.createElement('option');
      option2.value = p.id_usuario;
      option2.textContent = label;
      filterEl.appendChild(option2);

      appendExtraUserOption(p.id_usuario, label);
    });

  } catch (error) {
    console.error('Error loading users:', error);
    selectEl.innerHTML = '<option value="">Error al cargar usuarios</option>';
  }
}

// ============================================
// Formulario de generación de alertas
// ============================================

function initForm() {
  const form = document.getElementById('alertForm');
  const vitalType = document.getElementById('vitalType');

  // Mostrar/ocultar campos según tipo de signo vital
  vitalType.addEventListener('change', (e) => {
    const type = e.target.value;
    
    document.querySelectorAll('.vital-fields').forEach(el => {
      el.style.display = 'none';
    });
    document.getElementById('contextoField').style.display = 'none';

    if (type === 'spo2') {
      document.getElementById('spo2Fields').style.display = 'block';
    } else if (type === 'hr') {
      document.getElementById('hrFields').style.display = 'block';
    } else if (type === 'bp') {
      document.getElementById('bpFields').style.display = 'block';
      document.getElementById('contextoField').style.display = 'block';
    }
  });

  // Manejar envío del formulario
  form.addEventListener('submit', handleFormSubmit);
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const userId = document.getElementById('userId').value.trim();
  const vitalType = document.getElementById('vitalType').value;

  if (!userId || !vitalType) {
    showResult('Por favor completá todos los campos requeridos.', 'error');
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Generando...';

  try {
    let data = {};

    if (vitalType === 'spo2') {
      const spo2 = parseFloat(document.getElementById('spo2Value').value);
      if (isNaN(spo2)) {
        showResult('Ingresá un valor de SpO₂ válido.', 'error');
        return;
      }
      data = buildSpo2Data(userId, spo2);
    } else if (vitalType === 'hr') {
      const hr = parseInt(document.getElementById('hrValue').value);
      if (isNaN(hr)) {
        showResult('Ingresá un valor de FC válido.', 'error');
        return;
      }
      data = buildHrData(userId, hr);
    } else if (vitalType === 'bp') {
      const sist = parseInt(document.getElementById('bpSistolica').value);
      const diast = parseInt(document.getElementById('bpDiastolica').value);
      const contexto = document.getElementById('contexto').value;
      if (isNaN(sist) || isNaN(diast)) {
        showResult('Ingresá valores de PA válidos.', 'error');
        return;
      }
      data = buildBpData(userId, sist, diast, contexto);
    }

    await insertTestData(data);
    showResult('✅ Datos insertados correctamente. La app debería generar la alerta al hacer sync.', 'success');
    loadAlerts(); // Recargar lista de alertas

  } catch (error) {
    console.error('Error inserting data:', error);
    showResult(`❌ Error: ${error.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Generar Alerta';
  }
}

// ============================================
// Construcción de datos para datos_reloj
// ============================================

function buildSpo2Data(userId, spo2) {
  return {
    id_usuario: userId,
    spo2_pct: spo2,
    frec_cardiaca_bpm: null,
    bp_sistolica: null,
    bp_diastolica: null,
    temperatura: null,
    nivel_estres: null,
    actividad_pasos: null,
    horas_sueno: null,
    origen: 'manual',
    recorded_at: new Date().toISOString()
  };
}

function buildHrData(userId, hr) {
  return {
    id_usuario: userId,
    spo2_pct: null,
    frec_cardiaca_bpm: hr,
    bp_sistolica: null,
    bp_diastolica: null,
    temperatura: null,
    nivel_estres: null,
    actividad_pasos: null,
    horas_sueno: null,
    origen: 'manual',
    recorded_at: new Date().toISOString()
  };
}

function buildBpData(userId, sist, diast, contexto) {
  return {
    id_usuario: userId,
    spo2_pct: null,
    frec_cardiaca_bpm: null,
    bp_sistolica: sist,
    bp_diastolica: diast,
    temperatura: null,
    nivel_estres: null,
    actividad_pasos: null,
    horas_sueno: null,
    origen: 'manual',
    recorded_at: new Date().toISOString()
  };
}

// ============================================
// Operaciones CRUD con Supabase
// ============================================

async function insertTestData(data) {
  const response = await fetch(`${REST_BASE}/datos_reloj`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al insertar datos');
  }

  return await response.json();
}

async function loadAlerts() {
  const listEl = document.getElementById('alertsList');
  listEl.innerHTML = '<div class="loading">Cargando alertas...</div>';

  try {
    const filterType = document.getElementById('filterType').value;
    const filterSeverity = document.getElementById('filterSeverity').value;
    const filterUser = document.getElementById('filterUser').value.trim();

    let query = 'select=*&order=created_at.desc&limit=50';

    if (filterType) {
      query += `&tipo=eq.${filterType}`;
    }
    if (filterSeverity) {
      query += `&severidad=eq.${filterSeverity}`;
    }
    if (filterUser) {
      query += `&id_usuario=eq.${filterUser}`;
    }

    const response = await fetch(`${REST_BASE}/alerta?${query}`, {
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error('Error al cargar alertas');
    }

    alerts = await response.json();
    renderAlerts(alerts);
    updateStats(alerts);

  } catch (error) {
    console.error('Error loading alerts:', error);
    listEl.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <p>Error al cargar alertas: ${error.message}</p>
    </div>`;
  }
}

function renderAlerts(alerts) {
  const listEl = document.getElementById('alertsList');

  if (alerts.length === 0) {
    listEl.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <p>No hay alertas que mostrar</p>
      <p style="font-size: 12px; margin-top: 8px;">Generá una alerta desde el formulario</p>
    </div>`;
    return;
  }

  listEl.innerHTML = alerts.map(alert => {
    const icon = getAlertIcon(alert.tipo);
    const isUnread = !alert.leida_en;
    const timeAgo = formatTimeAgo(alert.created_at);
    const destino = destinoEsperado(alert.tipo);

    return `
      <div class="alert-item ${isUnread ? 'unread' : ''}">
        <div class="alert-icon ${alert.severidad}">${icon}</div>
        <div class="alert-content">
          <div class="alert-title">${alert.titulo}</div>
          <div class="alert-message">${alert.mensaje || ''}</div>
          <div class="alert-meta">
            <span class="alert-badge ${alert.severidad}">${alert.severidad}</span>
            <span>${alert.tipo}</span>
            <span>${timeAgo}</span>
            <span>${alert.id_usuario?.substring(0, 8) || 'N/A'}...</span>
          </div>
          <div class="alert-meta alert-ids">
            <span class="alert-id" title="${alert.id}" onclick="navigator.clipboard && navigator.clipboard.writeText('${alert.id}')">alertId: ${alert.id}</span>
            <span class="alert-deeplink" title="Deep-link esperado en app">AlertDetail → ${destino.tipoSigno} (${destino.label}, ${destino.unit}) · alertType=${alert.tipo} severity=${alert.severidad}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function updateStats(alerts) {
  document.getElementById('statTotal').textContent = alerts.length;
  document.getElementById('statCritical').textContent = alerts.filter(a => a.severidad === 'critica').length;
  document.getElementById('statWarning').textContent = alerts.filter(a => a.severidad === 'advertencia').length;
  document.getElementById('statUnread').textContent = alerts.filter(a => !a.leida_en).length;
}

// ============================================
// Filtros
// ============================================

function initFilters() {
  document.getElementById('filterType').addEventListener('change', loadAlerts);
  document.getElementById('filterSeverity').addEventListener('change', loadAlerts);
  document.getElementById('filterUser').addEventListener('change', loadAlerts);
  document.getElementById('refreshBtn').addEventListener('click', loadAlerts);
}

// ============================================
// Utilidades
// ============================================

function getAlertIcon(tipo) {
  const icons = {
    'hipoxia': '🫁',
    'taquicardia': '💓',
    'bradicardia': '💙',
    'hipertension': '⬆️',
    'hipotension': '⬇️'
  };
  return icons[tipo] || '🔔';
}

function formatTimeAgo(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHs = Math.floor(diffMin / 60);
  if (diffHs < 24) return `Hace ${diffHs}h`;
  return `Hace ${Math.floor(diffHs / 24)}d`;
}

function showResult(message, type) {
  const resultEl = document.getElementById('result');
  resultEl.style.display = 'block';
  resultEl.className = `result ${type}`;
  resultEl.querySelector('.result-content').textContent = message;
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ============================================
// Deep-link esperado (réplica de destinoPorTipoAlerta
// en src/context/NotificationsProvider.tsx)
// ============================================

function destinoEsperado(alertType) {
  switch (alertType) {
    case 'hipoxia':
      return { tipoSigno: 'saturacion_oxigeno', label: 'Saturación de oxígeno', unit: '%', icon: '🩸' };
    case 'hipertension':
    case 'hipotension':
      return { tipoSigno: 'presion_sistolica', label: 'Presión arterial', unit: 'mmHg', icon: '❤️' };
    case 'taquicardia':
    case 'bradicardia':
      return { tipoSigno: 'frecuencia_cardiaca', label: 'Frecuencia cardíaca', unit: 'lpm', icon: '💓' };
    default:
      return { tipoSigno: 'frecuencia_cardiaca', label: 'Frecuencia cardíaca', unit: 'lpm', icon: '💓' };
  }
}

// ============================================
// Delivery Log (notificacion_entrega)
// ============================================

function initDeliveryLog() {
  const btn = document.getElementById('deliveryRefreshBtn');
  if (btn) btn.addEventListener('click', () => loadDeliveries());
  const userSel = document.getElementById('deliveryUser');
  if (userSel) userSel.addEventListener('change', () => loadDeliveries());
  const alertInput = document.getElementById('deliveryAlert');
  if (alertInput) alertInput.addEventListener('change', () => loadDeliveries());
  syncDeliveryUserOptions();
}

function syncDeliveryUserOptions() {
  syncExtraUserSelects();
}

// Inicializa los selects extra (delivery/qh) con la opción base y,
// si filterUser ya tiene usuarios cargados, los replica.
function syncExtraUserSelects() {
  const filterUser = document.getElementById('filterUser');
  const deliveryUser = document.getElementById('deliveryUser');
  const qhUser = document.getElementById('qhUser');
  if (deliveryUser) deliveryUser.innerHTML = '<option value="">Todos</option>';
  if (qhUser) qhUser.innerHTML = '<option value="">Seleccionar usuario...</option>';
  if (!filterUser) return;
  Array.from(filterUser.options).forEach(o => {
    if (!o.value) return;
    appendExtraUserOption(o.value, o.textContent);
  });
}

function appendExtraUserOption(value, label) {
  const deliveryUser = document.getElementById('deliveryUser');
  const qhUser = document.getElementById('qhUser');
  if (deliveryUser) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    deliveryUser.appendChild(opt);
  }
  if (qhUser) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    qhUser.appendChild(opt);
  }
}

async function loadDeliveries(userId, alertId) {
  const listEl = document.getElementById('deliveriesList');
  if (!listEl) return;
  const uid = (userId !== undefined ? userId : document.getElementById('deliveryUser')?.value || '').trim();
  const aid = (alertId !== undefined ? alertId : document.getElementById('deliveryAlert')?.value || '').trim();
  listEl.innerHTML = '<div class="loading">Cargando entregas...</div>';
  try {
    let query = 'select=*,alerta(tipo,severidad,titulo)&order=enviado_en.desc&limit=50';
    if (uid) query += `&id_usuario=eq.${uid}`;
    if (aid) query += `&id_alerta=eq.${aid}`;
    const response = await fetch(`${REST_BASE}/notificacion_entrega?${query}`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Error al cargar entregas');
    deliveries = await response.json();
    renderDeliveries(deliveries);
  } catch (error) {
    console.error('Error loading deliveries:', error);
    listEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>Error al cargar entregas: ${error.message}</p></div>`;
  }
}

function renderDeliveries(rows) {
  const listEl = document.getElementById('deliveriesList');
  if (!listEl) return;
  if (!rows || rows.length === 0) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><p>Sin entregas para el filtro actual</p></div>`;
    return;
  }
  listEl.innerHTML = rows.map(d => {
    const err = d.error_mensaje || '—';
    const isFail = d.estado === 'fallida';
    const isSup = d.error_mensaje === 'suprimida_quiet_hours';
    return `
      <div class="delivery-item ${isFail ? 'failed' : ''} ${isSup ? 'suppressed' : ''}">
        <div class="delivery-main">
          <span class="delivery-badge ${d.estado}">${d.estado}</span>
          <span class="delivery-alert">${d.alerta ? `${d.alerta.tipo}/${d.alerta.severidad}` : (d.id_alerta || '')}</span>
          <span class="delivery-time">${d.enviado_en ? formatTimeAgo(d.enviado_en) : '—'}</span>
          <span class="delivery-user">${d.id_usuario ? d.id_usuario.substring(0, 8) + '...' : 'N/A'}</span>
        </div>
        <div class="delivery-sub">
          <span title="${d.id_alerta || ''}">alerta: ${d.id_alerta || '—'}</span>
          <span>error: ${err}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// Quiet-Hours editor (preferencia_notificacion)
// ============================================

function initQuietHours() {
  document.querySelectorAll('.qh-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('qhInicio').value = btn.dataset.inicio;
      document.getElementById('qhFin').value = btn.dataset.fin;
    });
  });
  const saveBtn = document.getElementById('qhSaveBtn');
  if (saveBtn) saveBtn.addEventListener('click', () => {
    const uid = document.getElementById('qhUser')?.value.trim();
    const inicio = document.getElementById('qhInicio')?.value;
    const fin = document.getElementById('qhFin')?.value;
    saveQuietHours(uid, inicio, fin);
  });
}

async function saveQuietHours(userId, inicio, fin) {
  const resultEl = document.getElementById('qhResult');
  const show = (msg, type) => {
    if (!resultEl) return;
    resultEl.style.display = 'block';
    resultEl.className = `result ${type}`;
    resultEl.querySelector('.result-content').textContent = msg;
  };
  if (!userId) { show('Seleccioná un usuario.', 'error'); return; }
  if (!inicio || !fin) { show('Ingresá inicio y fin.', 'error'); return; }
  try {
    const response = await fetch(`${REST_BASE}/preferencia_notificacion?on_conflict=id_usuario`, {
      method: 'POST',
      headers: { ...getHeaders(), Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        id_usuario: userId,
        horario_silencioso_inicio: inicio.length === 5 ? `${inicio}:00` : inicio,
        horario_silencioso_fin: fin.length === 5 ? `${fin}:00` : fin,
        updated_at: new Date().toISOString()
      })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al guardar horario');
    }
    show(`✅ Horario silencioso guardado (${inicio}–${fin}).`, 'success');
  } catch (error) {
    console.error('Error saving quiet hours:', error);
    show(`❌ Error: ${error.message}`, 'error');
  }
}
