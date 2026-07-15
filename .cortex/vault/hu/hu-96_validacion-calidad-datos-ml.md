---
id: HU-96
title: Validación de calidad de datos ingresados
épica: Épica 9: Inteligencia Artificial y Ciencia de Datos
sprint: S6
inicio: 01/07/2026
fin: 07/07/2026
release: Release 2
capa: Back / IA
devs: Flor Galarza · Emma
estado: pending
---

# HU-96: Validación de calidad de datos ingresados

**Como** sistema  
**Quiero** validar los datos ingresados antes de persistirlos  
**Para** evitar ruido que afecte la calidad de futuros modelos

## Criterios de aceptación

- [ ] Detección de outliers estadísticos (no solo rangos fisiológicos)
- [ ] Marcado de datos sospechosos cuando superan N desvíos estándar del baseline
- [ ] Rechazo de datos con formato inválido

## Dependencias

- HU-94 (captura estructurada)
- HU-21 (baseline clínico)
