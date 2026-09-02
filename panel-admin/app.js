// ============================================
// VITO Admin Panel - App Logic
// ============================================

// Estado de la aplicación
let isConnected = false;
let alerts = [];

// ============================================
// Inicialización
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initForm();
  initFilters();
  checkConnection();
  loadAlerts();
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

    let query = 'select=*,usuario:id_usuario(nombre,apellido)&order=created_at.desc&limit=50';

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
  document.getElementById('filterUser').addEventListener('input', debounce(loadAlerts, 500));
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
