---
id: HU-910
title: Derivación de features enriquecidas
épica: Épica 9: Inteligencia Artificial y Ciencia de Datos
sprint: S12
inicio: 12/08/2026
fin: 18/08/2026
release: Release 3
capa: IA
devs: Flor Galarza · Emma · Nico
estado: pending
---

# HU-910: Derivación de features enriquecidas para pipeline ML

**Como** sistema  
**Quiero** calcular variables derivadas a partir de los datos crudos (promedios móviles, variaciones y tendencias)  
**Para** enriquecer los datasets y mejorar la capacidad predictiva de futuros modelos

## Criterios de aceptación

- [ ] Features derivadas calculadas automáticamente: promedios móviles, variabilidad HRV
- [ ] Tendencia de PA en ventana de 24h
- [ ] Datos enriquecidos disponibles para consulta del pipeline ML
- [ ] Tests unitarios para cada feature derivada

## Dependencias

- HU-95 (históricos de datos)
- HU-97 (EDA básica)
