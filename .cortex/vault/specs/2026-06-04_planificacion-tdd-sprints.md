---
title: Planificación VITO 2026 — Sprints temáticos + QA + TDD simplificado
status: approved
date: 2026-06-04
tags:
  - planificacion
  - tdd
  - qa
  - sprints
  - vito
  - health-connect
---

# Spec: Planificación VITO 2026 — Sprints temáticos + QA + TDD

## Goal

Transformar la planificación existente (24 sprints, 38 HUs, 5 releases) en un plan con
**nombres temáticos de sprint**, **tareas QA explícitas por sprint**, y una **guía TDD
progresiva de 3 pasos** que un equipo sin experiencia en TDD pueda seguir desde el Sprint 2.

## Estado actual del proyecto

| Aspecto | Estado |
|---------|--------|
| Proyecto | VITO Health Connect — React Native + Kotlin nativo |
| Build | Compila con `npx react-native run-android` |
| Tests | `__tests__/` vacío — cero tests escritos |
| Cobertura | 0% |
| Equipo | 5 personas (Flor G., Emma, Cristian, Flor Ga., Nico) |
| Sprint actual | Sprint 1 en curso (26 may - 2 jun), ~2.5% completado |
| TDD previo | El equipo nunca aplicó TDD |

## Releases con nombres temáticos

| Release | Nombre | Sprints | Foco |
|---------|--------|---------|------|
| **R1** | Fundación Técnica | S1-S4 | Infraestructura, auth, baseline salud |
| **R2** | Monitoreo y Alertas Tempranas | S5-S11 | Dashboard, alertas, + IA ligera integrada |
| **R3** | Red de Confianza y Voz | S12-S14 | Contactos, WhatsApp, perfil clínico, + voz |
| **R4** | Vittito y Reportes IA | S15-S18 | Sugerencias avanzadas, reportes automáticos |
| **R5** | Salud Predictiva | S19-S24 | ML, umbrales dinámicos, estabilización, defensa |

### 🧠 Estrategia de distribución de IA

Las HUs de IA NO están todas juntas al final. Se distribuyen según su **complejidad real**:

| Tipo | HUs | ¿Qué requieren? | Cuándo arrancan |
|------|-----|-----------------|-----------------|
| 🟢 **IA Falsa** (CRUD + textos fijos) | HU-65, HU-62 | Solo DB + dashboard | S6-S7 |
| 🟡 **IA Asistida** (templates + datos) | HU-63, HU-34 | Baseline + datos históricos | S9, S14 |
| 🔵 **IA con LLM** (chat + voz) | HU-61, HU-66 | Integración LLM + micrófono | S10, S13 |
| 🟣 **IA con ML** (modelos predictivos) | HU-71, HU-72 | Pipeline ML + datos acumulados | S19+ |

## Sprint plan completo (24 sprints con nombres, HUs, QA, y TDD)

---

### Fundación Técnica — Release 1

#### S1 — Fundación Técnica (26 may - 2 jun)
**Tipo:** QA+Análisis + Setup

| HU | Título | Dev(s) |
|----|--------|--------|
| Setup | Inicialización RN + HC native module + build | Todo el equipo |
| HU-14 | Registro básico de cuenta | Flor G., Cristian, Flor Ga. |
| HU-11 | Inicio de sesión (mail) | Flor G., Emma, Cristian |
| HU-15 | Configuración de perfil personal | Flor G., Cristian, Emma, Flor Ga. |
| HU-21 | Registro de baseline clínico inicial | Flor G., Cristian, Flor Ga. |
| HU-24 | Integración con dispositivos wearables | Flor G., Emma, Cristian, Nico |

**Tareas QA:**
- [ ] Verificar que Jest corre: `npx jest --passWithNoTests` → exit 0
- [ ] Configurar ESLint + Prettier para que los tests tengan formato consistente
- [ ] Crear archivo `jest.config.js` explícito (no solo el preset de RN)
- [ ] Verificar que `__tests__/` está siendo incluido en `tsconfig.json`
- [ ] Documentar en README cómo correr tests: `npm test`

**TDD:** ⛔ NO HAY TDD — este sprint es setup técnico. Jest se configura pero no se escribe ningún test todavía. El equipo se familiariza con `npm test` y la estructura.

---

#### S2 — Login y Registro (3 jun - 9 jun)
**Tipo:** Desarrollo

| HU | Título | Dev(s) |
|----|--------|--------|
| HU-11 | Inicio de sesión (mail) | Flor G., Emma, Cristian |
| HU-14 | Registro básico de cuenta | Flor G., Cristian, Flor Ga. |

**Tareas QA:**
- [ ] Escribir test de login exitoso con email y contraseña válidos
- [ ] Escribir test de login con credenciales incorrectas → mensaje de error
- [ ] Escribir test de registro con email duplicado → mensaje informativo
- [ ] Verificar que la contraseña se oculta visualmente en el input
- [ ] Verificar que después del login exitoso se redirige al dashboard

**🎯 TDD por primera vez — 3 pasos:**
```
PASO 1 — RED: escribí el test ANTES del código
  test('login con credenciales válidas redirige al dashboard', () => {
    // Este test falla porque el login NO existe todavía → ¡perfecto!
    const { getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('email-input'), 'test@vito.com');
    fireEvent.changeText(getByTestId('password-input'), '123456');
    fireEvent.press(getByText('Iniciar sesión'));
    // El test verifica que navegó al dashboard
  });

PASO 2 — GREEN: escribí el código MÍNIMO para que el test pase
  - Creá el componente LoginScreen
  - Conectá el auth con Supabase
  - Navegá al dashboard en éxito

PASO 3 — REFACTOR: mejorá el código sin romper el test
  - Extraé la lógica de validación a un helper
  - Agregá manejo de errores
  - Corré el test otra vez → Sigue en verde
```

**Checklist TDD del sprint:**
- [ ] ¿Escribiste el test antes del código? (RED)
- [ ] ¿El test falló primero? (confirmación de RED)
- [ ] ¿Escribiste solo el código necesario para que pase? (GREEN)
- [ ] ¿El test sigue en verde después de refactorizar? (REFACTOR)

---

#### S3 — Perfil y Baseline (10 jun - 16 jun)
**Tipo:** Desarrollo

| HU | Título | Dev(s) |
|----|--------|--------|
| HU-15 | Configuración de perfil personal | Flor G., Cristian, Emma, Flor Ga. |
| HU-21 | Registro de baseline clínico inicial | Flor G., Cristian, Flor Ga. |
| HU-24 | Integración con dispositivos wearables | Flor G., Emma, Cristian, Nico |
| HU-22 | Registro manual de signos vitales | Flor G., Emma |
| HU-23 | Registro de síntomas | Cristian, Flor Ga. |
| HU-25 | Sincronización de datos de salud | Nico |
| HU-26 | Validación / normalización de datos | Nico |

**Tareas QA:**
- [ ] Test: cálculo automático de edad desde fecha de nacimiento
- [ ] Test: baseline con peso 500kg es rechazado (validación fisiológica)
- [ ] Test: baseline con oxigenación 100% es aceptado (válido)
- [ ] Test: temperatura 25°C es rechazada
- [ ] Test: registro de signos vitales con timestamp en UTC
- [ ] Verificar que datos del wearable se almacenan con campo `origen: "wearable"`

**TDD — Ciclo simple (mismo 3 pasos que S2):**
```typescript
// RED: test de cálculo de edad
test('edad se calcula automáticamente desde fecha de nacimiento', () => {
  const edad = calcularEdad('1990-06-15');
  expect(edad).toBe(36); // asumiendo 2026
});

// GREEN: implementar calcularEdad()

// REFACTOR: manejar fechas futuras, bordes de año
```

---

#### S4 — Calidad de Datos (17 jun - 23 jun)
**Tipo:** QA + Estabilización

| HU | Título | Dev(s) |
|----|--------|--------|
| HU-22 | Registro manual de signos vitales | Flor G., Emma |
| HU-23 | Registro de síntomas | Cristian, Flor Ga. |
| HU-25 | Sincronización de datos de salud | Nico |
| HU-26 | Validación / normalización de datos | Nico |

**Tareas QA:**
- [ ] Test: resolución de conflictos wearable > manual
- [ ] Test: sincronización sin conflictos funciona
- [ ] Test: datos fuera de rango fisiológico son marcados como sospechosos
- [ ] Test: unidades normalizadas al estándar definido
- [ ] Verificar que todos los timestamps están en UTC por test
- [ ] Regression run: `npm test` → todos los tests de S2 y S3 siguen verdes

**TDD — Tests de reglas de negocio:**
```typescript
// RED: test de resolución de conflictos
test('dato wearable prevalece sobre manual en mismo timestamp', () => {
  const resultado = resolverConflicto(
    { fuente: 'wearable', valor: 72, timestamp: '2026-06-17T10:00:00Z' },
    { fuente: 'manual', valor: 68, timestamp: '2026-06-17T10:00:00Z' }
  );
  expect(resultado.valor).toBe(72);
  expect(resultado.fuente).toBe('wearable');
});
```

---

### Monitoreo y Alertas — Release 2

#### S5 — Dashboard y Navegación (24 jun - 30 jun)
**Tipo:** Desarrollo
**Nombre temático:** Dashboard & Navegación

| HU | Título | Dev(s) |
|----|--------|--------|
| HU-31 | Dashboard de signos vitales | Flor G., Emma |
| HU-36 | Menú de navegación principal | Flor G. |
| HU-32 | Reportes diario/semanal/mensual | Cristian, Emma |
| HU-41 | Alerta por hipoxia | Flor Ga., Emma |
| HU-42 | Alerta por frecuencia cardíaca | Flor Ga., Emma |
| HU-43 | Alerta por presión arterial | Flor Ga., Nico |

**Tareas QA:**
- [ ] Test: lógica de colores (verde/amarillo/rojo) según rangos
- [ ] Test: indicador muestra "Sin datos recientes" cuando no hay datos
- [ ] Test: los 4 indicadores se renderizan
- [ ] Test: navegación entre secciones no pierde estado
- [ ] Test: badge de alertas muestra cantidad correcta

**TDD — Lógica de colores (test sin UI):**
```typescript
// RED: lógica pura, sin componentes
test('valor dentro de rango devuelve estado normal', () => {
  const resultado = calcularEstadoSignoVital(72, { min: 60, max: 100 });
  expect(resultado.color).toBe('verde');
  expect(resultado.etiqueta).toBe('Estable');
});

test('valor sobre rango devuelve estado elevado', () => {
  const resultado = calcularEstadoSignoVital(110, { min: 60, max: 100 });
  expect(resultado.color).toBe('rojo');
  expect(resultado.etiqueta).toBe('Elevado');
});
```

---

#### S6 — Dashboard + Check-in Emocional (1 jul - 7 jul)
**Tipo:** Desarrollo

| HU | Título | Dev(s) |
|----|--------|--------|
| HU-31 | Dashboard de signos vitales | Flor G., Emma |
| HU-36 | Menú de navegación principal | Flor G. |
| 🆕 **HU-65** | **Check-in emocional diario** | Flor G., Flor Ga. |

**✏️ ¿Por qué HU-65 acá?** — No es IA real. Es un formulario CRUD que guarda
estado de ánimo en DB. No necesita modelo ML ni LLM. Apenas necesita que exista
el perfil de usuario (S2-S3) y un menú para navegar a la sección (S5-S6).

**Tareas QA:**
- [ ] Test: actualización automática del dashboard sin recargar
- [ ] Test: el menú inferior es visible en todas las pantallas
- [ ] Test: botón activo se resalta visualmente
- [ ] Test: formulario de check-in guarda estado de ánimo correctamente
- [ ] Test: preguntas obligatorias no pueden enviarse vacías

---

#### S7 — Reportes + Respuestas Sugeridas (8 jul - 14 jul)
**Tipo:** Desarrollo
**Nombre temático:** Reportes Temporales

| HU | Título | Dev(s) |
|----|--------|--------|
| HU-32 | Reportes diario/semanal/mensual | Cristian, Emma |
| HU-41 | Alerta por hipoxia | Flor Ga., Emma |
| 🆕 **HU-62** | **Respuestas sugeridas sobre estado diario** | Flor G., Flor Ga. |

**✏️ ¿Por qué HU-62 acá?** — Las "respuestas sugeridas" son textos fijos y
predefinidos tipo "¿Cómo estoy hoy?", "¿Tuve anomalías?". No necesitan LLM ni
IA. Solo necesitan que el dashboard exista (S5-S6) para mostrar las cards. Se
implementan como componentes con texto estático + enlace a resumen.

**Tareas QA:**
- [ ] Test: cálculo de promedio, máximo, mínimo en período
- [ ] Test: gráfico con valores anormales destacados
- [ ] Test: alerta de hipoxia con SpO2 < 90%
- [ ] Test: SpO2 91% NO genera alerta
- [ ] Test: 3 consultas sugeridas se renderizan en dashboard
- [ ] Test: "¿Cómo estoy hoy?" muestra resumen diario

**TDD — Alerta de hipoxia:**
```typescript
// Tests ANTES del módulo de alertas
test('SpO2 89% genera alerta con umbral 90%', () => {
  const alerta = evaluarHipoxia(89, { umbral: 90 });
  expect(alerta.generada).toBe(true);
  expect(alerta.severidad).toBe('advertencia');
});

test('SpO2 85% genera alerta crítica', () => {
  const alerta = evaluarHipoxia(85, { umbral: 90 });
  expect(alerta.severidad).toBe('critica');
});

test('SpO2 90% exacto NO genera alerta (umbral es menor estricto)', () => {
  const alerta = evaluarHipoxia(90, { umbral: 90 });
  expect(alerta.generada).toBe(false);
});
```

---

#### S8 — Alertas Cardíacas (15 jul - 21 jul)
**Tipo:** Desarrollo

| HU | Título | Dev(s) |
|----|--------|--------|
| HU-42 | Alerta por frecuencia cardíaca | Flor Ga., Emma |
| HU-43 | Alerta por presión arterial | Flor Ga., Nico |

**Tareas QA:**
- [ ] Test: taquicardia (FC > 100) genera alerta diferenciada
- [ ] Test: bradicardia (FC < 50) genera alerta diferenciada
- [ ] Test: alertas duplicadas en episodio continuo (máx 1)
- [ ] Test: alerta combinada cuando sistólica + diastólica están fuera de rango
- [ ] Test: evaluación independiente de sistólica y diastólica

---

#### S9 — Alertas + Recomendaciones (22 jul - 28 jul)
**Tipo:** Desarrollo
**Nombre temático:** Visibilidad de Alertas

| HU | Título | Dev(s) |
|----|--------|--------|
| HU-37 | Alertas activas en dashboard | Flor G., Emma |
| 🆕 **HU-63** | **Recomendaciones personalizadas de salud** | Flor G., Emma |

**✏️ ¿Por qué HU-63 acá?** — Las recomendaciones son textos generados en base a
template + datos del usuario (actividad, peso, hábitos). NO requieren LLM: usan
reglas tipo "si pasos < 5000 → recomendación de movimiento". Necesitan el
baseline (S3) y datos históricos (S4-S8).

**Tareas QA:**
- [ ] Test: alerta crítica NO puede descartarse al deslizar
- [ ] Test: alerta no crítica SÍ desaparece al deslizar
- [ ] Test: sección de alertas NO ocupa espacio si no hay activas
- [ ] Test: banner de alertas aparece antes que signos vitales
- [ ] Test: recomendación "Hoy" se muestra si hay datos del día
- [ ] Test: sin datos suficientes muestra "Registrá más datos"

---

#### S10 — Push + Vittito Chat (29 jul - 4 ago)
**Tipo:** Desarrollo
**Nombre temático:** Push + Vittito Chat

| HU | Título | Dev(s) |
|----|--------|--------|
| HU-51 | Notificaciones push | Emma |
| 🆕 **HU-61** | **Interactuar con asistente IA desde dashboard** | Cristian, Emma |

**✏️ ¿Por qué HU-61 acá?** — El chat con Vittito es la primera HU que realmente
usa un LLM. Se coloca acá porque ya hay datos del usuario acumulados (S3-S9),
el dashboard funciona (S5-S6), y las alertas están operativas (S7-S9). Emma
puede liderar FCM + Vittito en paralelo.

**Tareas QA:**
- [ ] Test: lógica de horario silencioso (23:00-07:00 bloquea notificaciones)
- [ ] Test: alerta crítica siempre se envía aunque esté en silencio
- [ ] Test: log de estado de entrega registra "enviada"
- [ ] Test: prompt construido incluye datos vitales del usuario
- [ ] Test: endpoint devuelve "datos insuficientes" sin historial
- [ ] Test: respuesta sanitizada sin datos clínicos crudos

---

#### S11 — Estabilización R2 (5 ago - 10 ago)
**Tipo:** QA + Estabilización

| HU | Título | Dev(s) |
|----|--------|--------|
| HU-31 | Dashboard de signos vitales | Flor G., Emma |
| HU-32 | Reportes diario/semanal/mensual | Cristian, Emma |
| HU-37 | Alertas activas en dashboard | Flor G., Emma |
| HU-41 | Alerta por hipoxia | Flor Ga., Emma |
| HU-42 | Alerta por frecuencia cardíaca | Flor Ga., Emma |
| HU-43 | Alerta por presión arterial | Flor Ga., Nico |
| HU-51 | Notificaciones push | Emma |

**Tareas QA:**
- [ ] Regression run completo: `npm test` → 100% verde
- [ ] Verificar cobertura mínima > 60% en módulos de alertas
- [ ] Prueba de humo: flujo completo wearable → dashboard funciona
- [ ] Documentar bugs conocidos en `.cortex/vault/` como incidentes

---

### Red de Confianza — Release 3

#### S12 — Contactos y Perfil Clínico (12 ago - 18 ago)
**Tipo:** QA + Análisis
**Nombre temático:** Red de Confianza

| HU | Título | Dev(s) |
|----|--------|--------|
| HU-16 | Registro de contactos de confianza | Cristian, Nico |
| HU-52 | Notificaciones por WhatsApp | Emma |
| HU-54 | Admin. contactos y notificaciones | Flor G., Flor Ga. |
| HU-81 | Configurar según perfil de salud | Flor G., Nico |
| HU-82 | Advertencia configuraciones peligrosas | Cristian, Emma |

**Tareas QA:**
- [ ] Test: flujo de opt-in con vencimiento 48h
- [ ] Test: contacto eliminado NO recibe notificaciones
- [ ] Test: configuración peligrosa (FC > 200) requiere confirmación explícita
- [ ] Test: guardado bloqueado sin confirmación
- [ ] Test: contacto no confirmado queda en estado pendiente

---

#### S13 — Contactos + Entrada por Voz (19 ago - 25 ago)
**Tipo:** Desarrollo

| HU | Título | Dev(s) |
|----|--------|--------|
| HU-16 | Registro de contactos de confianza | Cristian, Nico |
| HU-54 | Admin. contactos y notificaciones | Flor G., Flor Ga. |
| 🆕 **HU-66** | **Consultas por voz** | Flor G., Flor Ga. |

**✏️ ¿Por qué HU-66 acá?** — La entrada por voz depende directamente del chat
con Vittito (HU-61, implementado en S10). Una vez que el chat existe, la voz
es una capa de input adicional. Además los contactos de confianza usan voz
para mensajes, así que hay sinergia con HU-16/HU-54.

---

#### S14 — WhatsApp + Sugerencias Vittito (26 ago - 1 sep)
**Tipo:** QA + Estabilización

| HU | Título | Dev(s) |
|----|--------|--------|
| HU-52 | Notificaciones por WhatsApp | Emma |
| HU-81 | Configurar según perfil de salud | Flor G., Nico |
| HU-82 | Advertencia configuraciones peligrosas | Cristian, Emma |
| 🆕 **HU-34** | **Sugerencias personalizadas de Vittito** | Flor G., Emma |

**✏️ ¿Por qué HU-34 acá?** — Las sugerencias de Vittito son más complejas que
las recomendaciones de HU-63 (S9). Usan machine learning ligero para analizar
patrones. Se colocan en S14 porque para entonces hay ~3 meses de datos
acumulados (desde S3), baseline consolidado, y alertas operativas.

---

### Vittito y Reportes IA — Release 4

#### S15 — Reportes Automáticos IA (2 sep - 8 sep)
**Tipo:** QA + Análisis
**Nombre temático:** Reportes IA — Análisis

| HU | Título | Dev(s) |
|----|--------|--------|
| HU-64 | Reportes automáticos de salud | Cristian, Flor Ga. |

**Nota:** Esta HU necesita que los reportes manuales (HU-32, implementados en
S7) ya estén funcionando, y datos acumulados desde S3. En S15 hay ~3 meses de
datos reales. Este sprint es de análisis y diseño del prompt de IA para generar
el resumen en lenguaje natural.

---

#### S16 — Reportes Automáticos — Desarrollo (9 sep - 15 sep)
**Tipo:** Desarrollo
**Nombre temático:** Reportes IA — Desarrollo

| HU | Título | Dev(s) |
|----|--------|--------|
| HU-64 | Reportes automáticos de salud | Cristian, Flor Ga. |

**Tareas QA:**
- [ ] Test: PDF se genera con datos reales o simulados
- [ ] Test: no se llama al LLM si datos son insuficientes
- [ ] Test: compartir por WhatsApp desde dispositivo funciona
- [ ] Test: indicador de carga se muestra durante generación

---

#### S17 — Buffer / Slack (16 sep - 22 sep)
**Tipo:** Buffer

Sin HUs asignadas. Sprint de reserva para absorber retrasos de sprints
anteriores. Si va todo según plan, puede usarse para:
- Reducir deuda técnica
- Mejorar cobertura de tests
- Refinar features existentes basado en feedback

---

#### S18 — Google Auth y Export (23 sep - 29 sep)
**Tipo:** Desarrollo

| HU | Título | Dev(s) |
|----|--------|--------|
| HU-12 | Inicio de sesión con Google | Flor G. |
| HU-13 | Recuperación de contraseña | Cristian, Flor Ga. |
| HU-33 | Exportar reportes de salud | Flor G., Nico, Emma |

---

### Salud Predictiva — Release 5

#### S19 — Análisis ML (30 sep - 6 oct)
**Tipo:** QA + Análisis

| HU | Título | Dev(s) |
|----|--------|--------|
| HU-35 | Comunicarse con Vittito (micrófono) | Cristian, Emma |
| HU-44 | Ajuste automático de umbrales | Flor Ga., Emma |
| HU-45 | Reducción de falsas alarmas | Flor Ga., Emma |
| HU-53 | Notif. por variación de ánimo | Flor Ga., Emma |
| HU-71 | Detección de patrones anormales | Emma, Flor Ga. |
| HU-72 | Predicción de eventos críticos | Emma, Flor Ga. |

**Nota:** Este sprint ahora tiene solo 6 HUs (vs 8 en el plan original). Las
HUs de IA liviana (HU-65 check-in, HU-66 voz, HU-34 sugerencias, HU-61 chat,
HU-62 respuestas, HU-63 recomendaciones) ya se implementaron en sprints
anteriores. Acá queda solo la IA pesada: ML, umbrales dinámicos y micrófono.

---

#### S20 — Micrófono Vittito (7 oct - 13 oct)
**Tipo:** Desarrollo
**Nombre temático:** Micrófono Vittito

| HU | Título | Dev(s) |
|----|--------|--------|
| HU-35 | Comunicarse con Vittito (micrófono) | Cristian, Emma |

**Tareas QA:**
- [ ] Test: botón sticky de micrófono visible al hacer scroll
- [ ] Test: gesto de cancelación (deslizar izquierda) funciona
- [ ] Test: mensaje guía aparece solo en primera interacción
- [ ] Test: consultas frecuentes devuelven respuestas coherentes

---

#### S21 — Umbrales Dinámicos (14 oct - 20 oct)
**Tipo:** Desarrollo
**Nombre temático:** Umbrales ML

| HU | Título | Dev(s) |
|----|--------|--------|
| HU-44 | Ajuste automático de umbrales | Flor Ga., Emma |
| HU-71 | Detección de patrones anormales | Emma, Flor Ga. |

**Tareas QA:**
- [ ] Test: baseline calculado con 7 días de lecturas validadas
- [ ] Test: umbrales se recalculan cada 24h
- [ ] Test: con <7 días usa valores por defecto clínicos
- [ ] Test: patrón anormal genera alerta clasificada
- [ ] Test: lecturas normales NO generan alerta

---

#### S22 — Estado de Ánimo (21 oct - 27 oct)
**Tipo:** Desarrollo

| HU | Título | Dev(s) |
|----|--------|--------|
| HU-53 | Notif. por variación de ánimo | Flor Ga., Emma |

**Tareas QA:**
- [ ] Test: mismo estado en últimas 4h NO renotifica
- [ ] Test: estado distinto SÍ notifica
- [ ] Test: usuario puede pausar temporalmente

---

#### S23 — Predicción de Eventos (28 oct - 3 nov)
**Tipo:** Desarrollo
**Nombre temático:** ML Predictivo

| HU | Título | Dev(s) |
|----|--------|--------|
| HU-72 | Predicción de eventos críticos | Emma, Flor Ga. |

**Tareas QA:**
- [ ] Test: endpoint devuelve estructura {probabilidad, tipo_evento, anticipacion_minutos}
- [ ] Test: modelo no falla con datos ruidosos
- [ ] Test: probabilidad entre 0 y 1

---

#### S24 — Estabilización Final (4 nov - 10 nov)
**Tipo:** QA + Estabilización
**Nombre temático:** Defensa

| HU | Título | Dev(s) |
|----|--------|--------|
| HU-45 | Reducción de falsas alarmas | Flor Ga., Emma |
| — | Demo, bugs, documentación final | Todo el equipo |

**Tareas QA:**
- [ ] Regression run completo: `npm test` → 100% verde
- [ ] Verificar cobertura global > 70%
- [ ] Demo end-to-end sin bugs críticos
- [ ] Sesiones de Cortex compiladas para informe final

---

## Guía TDD de 3 pasos (para imprimir y pegar en el monitor)

### Los 3 pasos

```
┌─────────────────────────────────────────────────────────┐
│                    CICLO TDD                             │
│                                                         │
│  ① RED ── Escribí el test ANTES del código             │
│           ▶ El test FALLA (esperado)                    │
│                                                         │
│  ② GREEN ─ Escribí el código MÍNIMO para que pase      │
│           ▶ El test PASA                                │
│           ▶ No importa si el código es feo              │
│                                                         │
│  ③ REFACTOR ─ Mejorá el código sin agregar功能          │
│           ▶ El test SIGUE PASANDO                       │
│           ▶ Limpiá, extraé, renombrá                    │
└─────────────────────────────────────────────────────────┘
```

### Regla de oro

> **No escribas UNA SOLA línea de código de producción sin que un test la esté esperando.**

Si escribís código y después decís "ahora hago el test", **no es TDD**. Es "testing", que está bien, pero no es TDD.

### Diferencia práctica

| Situación | SOS TDD | SOS Testing |
|-----------|---------|-------------|
| Escribiste el test → falló → escribiste el código → pasó | ✅ TDD | ❌ |
| Escribiste el código → después escribiste el test | ❌ | ✅ Testing |
| Escribiste el test y el código a la vez | ❌ | ✅ Testing |
| No escribiste ningún test | ❌ | ❌ Código sin red |

### Qué testear primero (prioridades)

```
1. Casos felices (happy path) → "funciona cuando todo está bien"
2. Casos de error → "falla elegantemente cuando algo está mal"  
3. Casos borde → "qué pasa con valores límite, null, vacío"
4. Casos de regresión → "esto ya funcionaba y quiero que siga funcionando"
```

### Cómo escribir un test que valga la pena

Un buen test TDD tiene 3 partes:

```typescript
// 1. ARRANGE — prepará los datos
const datosSalud = { frecuenciaCardiaca: 72, oxigenacion: 98 };

// 2. ACT — ejecutá la función  
const resultado = procesarSignosVitales(datosSalud);

// 3. ASSERT — verificá el resultado
expect(resultado.estado).toBe('normal');
```

Si tu test no tiene estas 3 partes claramente separadas, probablemente puedas mejorarlo.

### Anti-patrones TDD (lo que NO tenés que hacer)

❌ **"El test es muy complicado de escribir, mejor pruebo a mano"**
→ Si es complicado de testear, la función está mal diseñada. Simplificá la función primero.

❌ **"Primero hago el código y después veo los tests"**
→ Eso no es TDD. Vas a terminar sin tests porque "no hay tiempo".

❌ **"Este test prueba muchas cosas a la vez"**
→ Un test = un comportamiento. Si el test tiene 5 asserts que verifican 5 cosas distintas, partilo en 5 tests.

❌ **"El test usa datos reales de la base de datos"**
→ Los tests unitarios NO tocan la base de datos. Usá datos mockeados o en memoria.

### Progresión de aprendizaje TDD

| Sprints | Nivel | Qué testear | Cómo |
|---------|-------|-------------|------|
| S2-S4 | 🟢 TDD Guiado | Funciones puras (cálculos, validaciones) | Tests copiados de esta spec |
| S5-S11 | 🟡 TDD Asistido | Lógica de negocio + componentes simples | El equipo escribe sus tests guiado por los ejemplos |
| S12-S24 | 🔵 TDD Autónomo | Lógica clínica, integración, ML | El equipo decide qué testear y escribe los tests primero |

---

## Requirements

1. Unificar Planificacion-de-Sprints.txt, Planning TDD.md, y SPRINTS.md en un plan coherente
2. Asignar nombres temáticos a cada sprint (2-4 palabras en español)
3. Definir al menos 1 tarea QA concreta por sprint
4. Simplificar TDD a 3 pasos con ejemplos copiables
5. Iniciar TDD desde Sprint 2
6. Escalar complejidad TDD gradualmente
7. Incluir checklist de verificación TDD por sprint

## Files in Scope

| Archivo | Acción |
|---------|--------|
| `Planificacion-de-Sprints.txt` | Leer como input (no modificar) |
| `Planning TDD.md` | Leer como input (no modificar) |
| `.cortex/vault/hu/SPRINTS.md` | Actualizar con nombres temáticos |
| `__tests__/` | Crear tests desde S2 en adelante |

## Constraints

1. No cambiar fechas ni duración de sprints (calendario académico)
2. No eliminar HUs existentes
3. TDD progresivo: arrancar simple e ir complejizando
4. Nombres de sprint en español, cortos (2-4 palabras)
5. Cada sprint DEBE tener al menos 1 tarea QA explícita
6. Sprint 1 NO tiene TDD (solo setup de Jest)

## Acceptance Criteria

1. ✅ 24 sprints con nombre temático en español
2. ✅ Cada sprint lista tareas QA concretas
3. ✅ Guía TDD de 3 pasos con ejemplos de código copiables
4. ✅ Distinción entre TDD guiado (S2-S6) y TDD autónomo (S7+)
5. ✅ La spec queda persistida en `.cortex/vault/specs/`

## Verification Hooks

| Nombre | Comando | Criterio |
|--------|---------|----------|
| Verificar spec existe | `ls -la .cortex/vault/specs/` | exit code 0 |
| Verificar nombres temáticos | `grep -c "Nombre temático" .cortex/vault/specs/*planif*` | >= 5 ocurrencias |
