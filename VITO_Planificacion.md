# VITO Health Connect — Planificación del Proyecto

**Proyecto Final · Ingeniería en Sistemas de Información · 5º Año**  
**Universidad Tecnológica Nacional — Facultad Regional Resistencia**

---

## Índice

1. [Marco de Trabajo](#marco-de-trabajo)
2. [Herramienta de Gestión](#herramienta-de-gestión)
3. [Definition of Done](#definition-of-done)
4. [Roles de Usuarios del Sistema](#roles-de-usuarios-del-sistema)
5. [Roles del Equipo de Desarrollo](#roles-del-equipo-de-desarrollo)
6. [Planificación del Proyecto](#planificación-del-proyecto)
7. [Ceremoniencias Ágiles](#ceremoniencias-ágiles)
8. [Estimación y Priorización](#estimación-y-priorización)
9. [Entregas por Release](#entregas-por-release)

---

## Marco de Trabajo

### Enfoque Ágil

Para el desarrollo de VITO Health Connect se adopta un enfoque **Scrum adaptado** con las siguientes características:

- **Sprints de 1 semana**: La duración se ajusta según complejidad y carga horaria del equipo. Se comienza con sprints de 1 semana y se reevalúa la velocidad en cada retrospectiva.

- **Sprint Planning semanal**: Reunión al inicio de cada sprint para evaluar velocidad real basándose en el desempeño anterior, considerando la carga horaria con otras materias y responsabilidades.

- **Sprint Retrospective semanal**: Al finalizar cada sprint, el equipo realiza una retrospectiva colaborativa para identificar mejoras. Las conclusiones se documentan en Cortex mediante `cortex save-session`.

- **Reunión general semanal**: Encuentro informal sin ceremonias rigurosas de Scrum puro. Cubre:
  - Refinamiento de trabajo
  - Asignación de historias de usuario por integrante
  - Documentación del trabajo en Jira
  - Identificación de impedimentos

- **Comunicación asincrónica**: Cuando hay superposición de horarios, la comunicación se coordina a través de WhatsApp, asegurando que se notifique del estado de las tareas.

### Integración Cortex + Jira

- **Cortex** (`cortex create-spec`, `cortex save-session`): Documentación de sesiones, decisiones técnicas, y especificaciones de desarrollo.
- **Jira**: Gestión de tickets (HU, bugs, tareas técnicas), asignación, seguimiento y flujo de trabajo.

**Flujo:**
1. HU se define en Jira con descripción, criterios de aceptación y estimación.
2. Al iniciar desarrollo, se crea especificación en Cortex referenciando el link de Jira.
3. Al terminar, se ejecuta `cortex save-session` documentando lo realizado.
4. Se actualiza ticket en Jira con evidencia y se mueve a "Done" cuando cumple DoD.

---

## Herramienta de Gestión

### Jira — Tablero Kanban

**Fuente centralizada**: Atlassian Jira es la plataforma única para rastreabilidad de desarrollo.

**Columnas del Tablero Kanban:**

| Columna | Descripción |
|---------|-------------|
| **Product Backlog** | Todas las HU priorizadas del proyecto (no están en sprint). |
| **Sprint Backlog** | HU seleccionadas para el sprint actual y tareas relacionadas. |
| **In Progress** | Tareas actualmente en desarrollo (máximo 1-2 por desarrollador). |
| **In Review** | Tareas completadas que esperan revisión técnica o PR approval. |
| **Done** | Tareas que cumplen completamente con Definition of Done. |

**Campos Obligatorios por Ticket:**
- ID y Tipo (Story, Task, Bug)
- Título descriptivo
- Descripción/Historia de usuario
- Criterios de aceptación
- Puntos estimados (Fibonacci: 1, 2, 3, 5, 8, 13)
- Épica asociada
- Sprint asignado
- Asignado a integrante
- Etiquetas (tech stack, área, prioridad MoSCoW)

---

## Definition of Done

### DoD General (Aplica a Todas las HU)

Una historia de usuario se considera **completamente terminada** cuando:

1. **Funcionalidad 100% implementada**: Los criterios de aceptación específicos de la HU se cumplen íntegramente.

2. **Revisión técnica**: Al menos otro miembro del equipo ha revisado el Pull Request en GitHub y lo aprobó explícitamente.

3. **Testing**: 
   - Pruebas unitarias pasan en Jest (frontend) y pytest (backend).
   - Pruebas de integración validan flujos completos.
   - Mock-based testing para puentes nativos (VitoHealthModule).

4. **Merge sin conflictos**: El código se mergeó exitosamente a la rama `develop` sin conflictos.

5. **Documentación en Cortex**: La especificación técnica se ha guardado mediante `cortex save-session` con evidencia de desarrollo.

6. **Ticket en Jira actualizado**: El ticket refleja estado final, evidencia (links a PR, commits, artefactos) y se movió a columna "Done".

7. **DoD específico de la HU**: Además de lo anterior, cada historia tiene su propio Definition of Done documentado en la ficha de Jira y/o en Cortex.

### Relación Cortex ↔ Jira

- **Cortex**: Documentación técnica, decisiones arquitectónicas, análisis, pruebas y sesiones de desarrollo. No reemplaza Jira, es complementario.
- **Jira**: Rastreabilidad formal, estado de tarea, asignación y seguimiento del sprint.

Ambas herramientas se sincronizan manualmente: cuando una HU avanza en Jira, se refleja en la especificación de Cortex, y viceversa.

---

## Roles de Usuarios del Sistema

Se identificó un único rol funcional basado en el análisis de requisitos:

### Rol: Usuario (Productor de Datos de Salud)

**Descripción**: Persona que utiliza la aplicación VITO Health Connect para monitorear y gestionar su salud.

**Subrol: Contacto de Confianza** (Familiar o Médico Responsable)

Se reconoce la importancia de un segundo actor en la aplicación:

- **Familiar de confianza**: Recibe notificaciones y puede acceder a información de salud compartida del usuario principal.
- **Médico responsable**: Accede a reportes y datos clínicos para seguimiento médico remoto.

**Nota**: No se detectó necesidad de diferenciar roles adicionales en esta etapa. La personalización se maneja mediante permisos y acceso a datos, no mediante tipos de usuario distintos. Queda abierta la posibilidad de incorporar nuevos roles en futuras iteraciones.

---

## Roles del Equipo de Desarrollo

### Composición del Equipo

| Rol | Responsable | Áreas |
|-----|-------------|-------|
| **Scrum Master** | Víctor Molina | Dirección de sprints, facilitación de retrospectivas, remoción de impedimentos |
| **Product Owner** | Equipo completo | Priorización colaborativa, refinamiento de backlog |
| **Tech Lead — Backend** | Flor Galarza | Arquitectura backend, Supabase, FastAPI, DevOps |
| **Tech Lead — Frontend** | Flor González | Arquitectura React Native, diseño UI/UX, componentes |
| **Tech Lead — Native (Kotlin)** | Emma Molina | Módulos Android nativos, Health Connect SDK, VitoHealthModule |
| **QA Lead** | Nicolás Vallejos | Estrategia de testing, coordinación de pruebas, calidad |
| **Documentación** | Nicolás Vallejos | Documentación técnica, generación de artefactos |

### Responsabilidades Transversales

- **Cortex Governance**: Victor (Scrum Master) coordina sesiones y `cortex save-session`.
- **Jira Management**: Flor González supervisa flujo de tickets y limpieza de backlog.
- **Code Review**: Todos revisan PRs; el revisor debe ser distinto al autor.
- **Testing**: QA Lead supervisa; cada desarrollador escribe tests en su área.

---

## Planificación del Proyecto

### Cronograma General

| Release | Objetivo | Período | Sprints | Estado |
|---------|----------|---------|--------|--------|
| **R1** | Fundación de Plataforma e Integración Inicial de Datos | 26 may — 28 jul 2026 | 4 | Completada |
| **R2** | Monitoreo Inteligente y Sistema Inicial de Alertas | 14 jul — 12 ago 2026 | 2 | Por empezar |
| **R3** | Comunicación y Gestión de Red de Apoyo | 13 ago — 19 sep 2026 | 2 | Planificado |
| **R4** | Asistencia Inteligente al Usuario | 20 sep — 27 oct 2026 | 2 | Planificado |
| **R5** | Personalización Clínica y Analítica Predictiva | 28 oct — 4 dic 2026 | 2 | Planificado |

**Total**: 24 semanas, 12 sprints de 1-2 semanas cada uno.

### Desglose Detallado por Release

#### Release 1: Fundación de Plataforma e Integración Inicial de Datos

**Objetivo**: Establecer infraestructura robusta (testing, Supabase, bridge Kotlin-TS). Integración con Health Connect. Dashboard básico de signos vitales y reportes.

**Período**: 26 may — 28 jul 2026 | **4 Sprints**

| Sprint | Nombre | Objetivo | Fechas |
|--------|--------|----------|--------|
| S1 | Fundación Técnica | Infraestructura, testing, Supabase, bridge TS-Kotlin, CI/CD | 26 may — 2 jun |
| S2 | Base Funcional + ML | Autenticación, Health Connect, dashboard básico, pipeline ML | 3 jun — 9 jun |
| S3 | ML Setup + Actualización Manual | Registro de usuario, datos manuales, estructuración para ML | 10 jun — 16 jun |
| S4 | Validación + Síntomas | Perfil personal, validación de datos, registro de síntomas | 17 jun — 23 jun |

#### Release 2: Monitoreo Inteligente y Sistema Inicial de Alertas

**Objetivo**: Baseline clínico personalizado. Alertas inteligentes para signos vitales críticos. Mejora de reportes visuales.

**Período**: 14 jul — 12 ago 2026 | **2 Sprints**

| Sprint | Nombre | Objetivo | Fechas |
|--------|--------|----------|--------|
| S5 | Fundación de Datos Clínicos y ML | Sync automático, dashboard, baseline clínico, normalización, captura estructurada | 25 jun — 28 jul |
| S6 | Sistema de Alertas Inteligentes | Alertas por hipoxia, frecuencia cardíaca, presión arterial. Motor de umbrales dinámicos | 29 jul — 12 ago |

#### Release 3: Comunicación y Gestión de Red de Apoyo

**Objetivo**: Notificaciones push y WhatsApp. Gestión de contactos de confianza. Features enriquecidas para ML.

**Período**: 13 ago — 19 sep 2026 | **2 Sprints**

| Sprint | Nombre | Objetivo | Fechas |
|--------|--------|----------|--------|
| S7 | Notificaciones + Contactos | Notificaciones push, registro de contactos de confianza | 13 ago — 4 sep |
| S8 | Notificaciones Automatizadas + Gestión | WhatsApp automático, variación de estado anímico, features ML derivadas | 5 sep — 19 sep |

#### Release 4: Asistencia Inteligente al Usuario

**Objetivo**: Asistente virtual (Vittito). IA interactiva, recomendaciones personalizadas, detección de patrones anómalos.

**Período**: 20 sep — 27 oct 2026 | **2 Sprints**

| Sprint | Nombre | Objetivo | Fechas |
|--------|--------|----------|--------|
| S9 | Motor de IA y Recomendaciones | Reportes automáticos, respuestas sugeridas, recomendaciones, interacción Vittito | 20 sep — 12 oct |
| S10 | IA Interactiva + Detección de Patrones | Check-in emocional, detección de patrones anómalos, exportación de reportes | 13 oct — 27 oct |

#### Release 5: Personalización Clínica y Analítica Predictiva

**Objetivo**: Predicción de eventos clínicos críticos. Ajuste automático de umbrales. Seguridad y accesibilidad.

**Período**: 28 oct — 4 dic 2026 | **2 Sprints**

| Sprint | Nombre | Objetivo | Fechas |
|--------|--------|----------|--------|
| S11 | IA Predictiva + Perfil Clínico | Predicción eventos críticos, perfil clínico, ajuste automático umbrales | 28 oct — 19 nov |
| S12 | Accesibilidad + Seguridad | Google Sign-in, interacción por micrófono, advertencias para configuraciones peligrosas | 20 nov — 4 dic |

---

## Ceremoniencias Ágiles

### Sprint Planning

**Cadencia**: Semanal, al inicio de cada sprint.

**Participantes**: Equipo completo + Scrum Master.

**Agenda**:
1. Revisión de velocidad real del sprint anterior (puntos entregados vs. estimados).
2. Evaluación de capacidad actual (considerando exámenes, otras materias).
3. Selección de HU del Product Backlog para el sprint, ordenadas por MoSCoW.
4. Desglose de HU en tareas técnicas si es necesario.
5. Asignación de tareas por integrante.
6. Definición de objetivos del sprint.

**Output**: Sprint Backlog en Jira actualizado con HU, tareas, asignaciones y puntos.

### Sprint Review (Informal)

**Cadencia**: Al finalizar cada sprint.

**Participantes**: Equipo de desarrollo.

**Dinámica**:
- Se notifican los incrementos entregados mediante plataformas de mensajería instantánea.
- Se documentan avances formalmente en Cortex con `cortex save-session`.
- Se resguardan artefactos en el repositorio central.

**Output**: Documentación de sesión en Cortex, estado actualizado en Jira.

### Sprint Retrospective

**Cadencia**: Al finalizar cada sprint.

**Participantes**: Equipo completo + Scrum Master.

**Metodología**: Dinámica participativa donde cada integrante identifica colaborativamente:
- Fortalezas (qué facilita el desempeño).
- Debilidades (qué dificulta el desempeño).
- Acciones correctivas (cómo mejorar).

**Herramienta**: Tablero Miro con esquema Starfish Retro (MORE, LESS, STOP, CONTINUE, START).

**Temas típicos**:
- Comunicación interna (formalidad, frecuencia, claridad).
- Compromiso (dedicación, responsabilidad, colaboración).
- Herramientas (Jira, Cortex, GitHub, etc.).
- Documentación y procesos técnicos.

**Output**: Conclusiones documentadas en Cortex. Plan de acción con responsables y lineamientos concretos.

### Weekly Stand-up (Informal)

**Cadencia**: Martes, semanalmente (sujeto a superposición de horarios).

**Modo**: Reunión presencial o por video.

**Alternativa**: Si hay conflicto de horarios, se reprograma para sábados o se comunica status por WhatsApp.

**Contenido**:
- Estado de tareas en curso.
- Impedimentos y bloqueadores.
- Preparación para próximos días.

---

## Estimación y Priorización

### Planning Poker — Escala Fibonacci

**Escala**: 1, 2, 3, 5, 8, 13 (puntos).

**Límite superior**: 13 puntos. Si una HU se estima en más de 13, se divide en historias menores.

**Proceso**:
1. Product Owner (equipo) presenta HU con criterios de aceptación.
2. Cada developer estima independientemente en Fibonacci.
3. Se revelan estimaciones simultáneamente.
4. Si hay discrepancias, se discute y re-estima.
5. Se llega a consenso sobre puntos finales.

**Referencia de tamaño**:
- **1 pt**: Tarea trivial (cambio de texto, configuración simple).
- **2 pts**: Pequeña funcionalidad (componente aislado, ajuste menor).
- **3 pts**: Funcionalidad claramente delimitada (autenticación básica).
- **5 pts**: Funcionalidad moderada con lógica (dashboard con múltiples métricas).
- **8 pts**: Funcionalidad compleja (integración entre sistemas).
- **13 pts**: Máximo; si se estima así, dividir en sub-historias.

### Priorización — MoSCoW

**Criterios de priorización**:

| Nivel | Descripción | Incluyó en Sprint |
|-------|-------------|------------------|
| **MUST** | Crítica para el funcionamiento del release o bloqueante para otras HU. | Sí, obligatoriamente. |
| **SHOULD** | Importante, agrega valor significativo, pero no bloquea. | Sí, si cabe en capacidad. |
| **COULD** | Deseable, nice-to-have, bajo impacto. | Si queda capacidad. |
| **WON'T** | Deferida a futuro o descartada. | No, en este sprint. |

**Asignación de etiquetas MoSCoW en Jira**: Cada HU se etiqueta antes del Sprint Planning para facilitar priorización colaborativa.

---

## Entregas por Release

Cada release genera los siguientes entregables:

### 1. Código Fuente

- **Repositorio GitHub**: Vito-App-Android (rama `develop` y release branches).
- **Estándar**: Commits descriptivos, PRs con descripción y revisión, merge sin conflictos.
- **Branches**: `develop` (integración continua), `main` (release), feature branches (`feature/HU-XX`).

### 2. Documentación Técnica

- **Arquitectura**: Diagrama de componentes, flujos, capas (React Native, Kotlin, FastAPI, Supabase).
- **Base de Datos**: Esquema ER, diccionario de atributos, relaciones.
- **API / Bridge**: Documentación de endpoints (FastAPI), contrato de comunicación (TypeScript Bridge).
- **Decisiones Arquitectónicas**: Registro de decisiones técnicas tomadas (ADRs).
- **Guía de Setup**: Instrucciones para replicar entorno de desarrollo (dependencias, variables de entorno, etc.).

### 3. Artefactos Técnicos Relevantes

Según el release, incluye:

- **Módulos Nativos** (Kotlin): VitoHealthModule.kt, HealthDataProvider.kt, puente de comunicación.
- **Pipeline CI/CD**: GitHub Actions workflow (build-android-dev.yml).
- **Esquema de BD**: Modelo relacional implementado en Supabase.
- **Stack ML**: Selección tecnológica (Python, FastAPI, scikit-learn), dataset preparado, features definidas.
- **Configuraciones**: Docker compose, variables de entorno, secretos.

### 4. Informe de Retrospectiva de Release

Documento que consolida conclusiones de todas las retrospectivas del release:

- **Introducción**: Resumen del release, objetivo, participantes.
- **Metodología**: Cómo se condujeron las retrospectivas (Starfish Retro, etc.).
- **Conclusiones**:
  - Áreas de mejora identificadas (comunicación, compromiso, herramientas, documentación).
  - Fortalezas detectadas.
- **Plan de Acción**: Acciones correctivas con responsables y lineamientos concretos por eje (comunicación, actitud, gestión, herramientas).
- **Consideraciones finales**: Recomendaciones para próximo release.

### Entrega Formal

Al cierre de cada release:

1. Código se mergeó a `main` con tag de versión (v1.0.0, v2.0.0, etc.).
2. Documentación técnica se versionó en repositorio (`/docs`) o Google Drive.
3. Artefactos (especialmente BD y decisiones) se resguardan en Cortex.
4. Informe de retrospectiva se genera y comparte con equipo y docentes.
5. Demo interna o con stakeholders (si aplica).

---

## Apéndice: Recursos y Referencias

### Repositorios

- **Código**: https://github.com/VITO-org/Vito-App-Android
- **Planificación**: Hoja "HUs por Sprint" en VITO_Planificacion (Google Sheets)

### Herramientas

- **Gestión**: Jira (Atlassian)
- **Documentación técnica**: Cortex + Google Drive
- **Comunicación**: WhatsApp (async), reuniones presenciales/video (sincrónico)
- **Versionado**: Git + GitHub

### Artefactos de Referencia

- **Historias de Usuario**: Documento Historias-de-Usuario_VITO.md
- **Roles del Equipo**: roles-del-equipo (carpeta en repositorio)
- **Decisiones Técnicas**: Vault de Cortex (/vault/decisions)
- **Especificaciones**: Cortex specs (/vault/specs)

---

**Documento versión 1.0**  
**Última actualización**: Agosto 2026  
**Próxima revisión**: Fin de Release 2
