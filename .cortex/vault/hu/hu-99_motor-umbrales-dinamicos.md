---
id: HU-99
title: Motor de umbrales dinámicos
épica: Épica 9: Inteligencia Artificial y Ciencia de Datos
sprint: S11
inicio: 05/08/2026
fin: 10/08/2026
release: Release 2
capa: Back / IA
devs: Flor Galarza · Nico
estado: pending
---

# HU-99: Motor de umbrales dinámicos

**Como** sistema  
**Quiero** ajustar los umbrales de alerta según el comportamiento histórico de cada paciente  
**Para** reducir falsas alarmas sin perder sensibilidad ante eventos reales

## Criterios de aceptación

- [ ] Umbral dinámico generado a partir del baseline personalizado
- [ ] Factor de desviación estándar configurable
- [ ] Umbral superior e inferior calculados correctamente
- [ ] Integración con el módulo de alertas

## Dependencias

- HU-98 (baseline personalizado)
- HU-37 (alertas en dashboard)
