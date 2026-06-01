# HU-37: Visualizar alertas activas en el dashboard

**Release:** RELEASE 2
**Sprint:** Sprint 11 QA+Estabilizacion
**Épica:** Épica 3: Monitoreo y Visualización
**Desarrolladores:** Flor Gonzalez, Emma

---

## Goal

Visualizar alertas activas en el dashboard

## User Story

> **Como** usuario
> **Quiero** ver las alertas de salud activas al inicio del dashboard
> **Para** estar informado de inmediato sobre situaciones que requieran atención

## Requirements

1. Visualizar alertas activas en el dashboard.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: Si existen alertas activas, se muestran en un banner o sección destacada en la parte superior del dashboard, antes de los signos vitales.
- [ ] CA-02: Cada alerta muestra tipo de alerta, hora de generación y nivel de urgencia (Crítica en rojo / Advertencia en amarillo / Informativa en azul).
- [ ] CA-03: Al tocar una alerta, el usuario accede al detalle del evento que la generó.
- [ ] CA-04: El usuario puede descartar alertas no críticas deslizándolas o con un botón de cierre.
- [ ] CA-05: Las alertas críticas no pueden descartarse hasta que el signo vital vuelva al rango normal o el usuario confirme que tomó acción.
- [ ] CA-06: Si no hay alertas activas, la sección no se muestra y no ocupa espacio en el dashboard.

## Tasks

- [ ] Diseñar e implementar banner de alertas con niveles de urgencia diferenciados.
- [ ] Implementar acceso al detalle del evento desde la alerta.
- [ ] Implementar lógica de descarte diferenciada para alertas críticas y no críticas.

## Definition of Done

- [ ] Las alertas aparecen siempre antes de los signos vitales cuando están activas.
- [ ] El comportamiento de descarte funciona diferente para alertas críticas y no críticas.
- [ ] El dashboard no muestra la sección de alertas si no hay ninguna activa.
- [ ] Las pruebas cubren múltiples alertas simultáneas, descarte y resolución de alerta crítica.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-37, release-release-2, epic-épica-3, dev-flor-gonzalez, dev-emma
