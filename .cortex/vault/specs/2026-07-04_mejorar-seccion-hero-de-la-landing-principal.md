---
schema_version: 1
doc_type: spec
title: Mejorar sección Hero de la landing principal
created_at: '2026-07-04T00:57:41.926413Z'
updated_at: '2026-07-04T22:30:00.000000Z'
tags:
- spec
- landing
- hero
- rediseno
- ux
- conversion
status: closed
links: []
vault_scope: local
fingerprint: 0cd937f6abcef202fa8554903e21bd2bd8b5f9064f5552070eb3efd9ccfac367
verification_hooks: []
goal: Modernizar la primera impresión del sitio, reforzar la identidad de la marca,
  mejorar la jerarquía visual y aumentar la capacidad de conversión de la sección
  principal (Hero).
files_in_scope:
- apps/landing/src/components/Hero.astro
- apps/landing/src/components/Header.astro
- apps/landing/src/components/TrustSection.astro (nuevo)
constraints:
- Mantener identidad institucional (azul + blanco)
- No perder la imagen de seriedad y confianza
- Preservar compatibilidad con Astro 5 + Tailwind v4
acceptance_criteria:
- Hero ocupa ~80vh del viewport en vez de 100%
- Las estadísticas están en una sección separada debajo del Hero (card blanca con sombra)
- La imagen comunica protección/tranquilidad en vez de solo profesionalismo
- La imagen tiene bordes con forma orgánica (blob border-radius)
- El título diferencia a Organización Esnal con "tranquilidad" acentuada en #2563EB
- Hay al menos 2 CTAs distintos: cotizar (primario) y WhatsApp asesor (secundario)
- Los beneficios aparecen visibles sin hacer scroll con bullets azules
- Las estadísticas tienen animación de contador con íconos circulares azules
- El navbar está optimizado a 64px de altura
- Sin overlay ni filtros sobre la imagen
- Sin scroll indicator (mouse icon)
---

## Goal

Modernizar la primera impresión del sitio, reforzar la identidad de la marca, mejorar la jerarquía visual y aumentar la capacidad de conversión de la sección principal (Hero).

## Requirements

- Hero a ~80vh con fondo #EEF4FB
- Layout de dos columnas con CSS Grid (1fr 1fr), max-width 1320px
- Columna izquierda: título, descripción, lista de beneficios, dos CTAs
- Columna derecha: imagen con forma orgánica (blob border-radius 60% 40%...)
- Imagen local en /images/hero-family.png, sin overlay, sin filtros
- Título multi-línea con palabra "tranquilidad" acentuada en #2563EB + itálicas
- Descripción en clamp con color gris azulado #5a7a9a
- Beneficios con bullets • en #2563EB
- CTA primario: #0E4C92, hover #0B3D78
- CTA secundario: enlace WhatsApp con ícono de chat, borde #0B2E63
- Sección de estadísticas independiente debajo del Hero
  - Card blanca con border-radius 20px y box-shadow
  - Íconos circulares azules (#0E4C92) con SVG blancos
  - Divisores verticales (#e4eff9) entre columnas
  - Contador animado al scrollear
- Header reducido a 64px de altura con logo 52px
- Sin scroll indicator, sin overlay de imagen

## Files in Scope

- `apps/landing/src/components/Hero.astro`
- `apps/landing/src/components/Header.astro`
- `apps/landing/src/components/TrustSection.astro (nuevo)`

## Constraints

- Mantener identidad institucional (azul + blanco)
- No perder la imagen de seriedad y confianza
- Preservar compatibilidad con Astro 5 + Tailwind v4

## Acceptance Criteria

- [x] Hero ocupa ~80vh del viewport en vez de 100%
- [x] Las estadísticas están en una sección separada debajo del Hero (card blanca con sombra)
- [x] La imagen comunica protección/tranquilidad en vez de solo profesionalismo
- [x] La imagen tiene bordes con forma orgánica (blob border-radius)
- [x] El título diferencia a Organización Esnal con "tranquilidad" acentuada en #2563EB
- [x] Hay al menos 2 CTAs distintos: cotizar (primario) y WhatsApp asesor (secundario)
- [x] Los beneficios aparecen visibles sin hacer scroll con bullets azules
- [x] Las estadísticas tienen animación de contador con íconos circulares azules
- [x] El navbar está optimizado a 64px de altura
- [x] Sin overlay ni filtros sobre la imagen
- [x] Sin scroll indicator (mouse icon)

## Verification Hooks

*(none declared)*
