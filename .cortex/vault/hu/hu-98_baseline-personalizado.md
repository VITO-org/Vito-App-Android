---
id: HU-98
title: Cálculo de baseline personalizado por paciente
épica: Épica 9: Inteligencia Artificial y Ciencia de Datos
sprint: S10
inicio: 29/07/2026
fin: 04/08/2026
release: Release 2
capa: Back / IA
devs: Flor Galarza · Emma
estado: pending
---

# HU-98: Cálculo de baseline personalizado por paciente

**Como** sistema  
**Quiero** calcular los valores normales de cada paciente a partir de su historial  
**Para** detectar desviaciones individuales en lugar de comparar con rangos poblacionales genéricos

## Criterios de aceptación

- [ ] Baseline calculado con mínimo 7 días de lecturas validadas
- [ ] Umbrales se recalculan cada 24h
- [ ] Con <7 días usa valores por defecto clínicos
- [ ] Baseline incluye media, desviación estándar y días utilizados

## Dependencias

- HU-95 (históricos de datos)
- HU-96 (calidad de datos)
