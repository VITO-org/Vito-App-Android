---
schema_version: 1
doc_type: session
title: fix distancia imposible y unidad km faltante en card
created_at: '2026-10-10T19:13:46.921626Z'
updated_at: '2026-10-10T19:13:46.921626Z'
tags:
- session
- session
- with-checkpoints
- gitless
- auto-draft
- handoff
status: handoff
links: []
vault_scope: local
fingerprint: 7930f1bfcccab0c9b7be0d917bc83b3c6981a20ee6f11163debd0817da026e35
session_id: 4eb0818bf8dd
pr: null
branch: null
commit: null
cortex_telemetry: null
---

## ⚠ Gitless Session

This session was opened in a workspace without a usable git repository.
The documenter was unable to compute a git diff at close time, so the
"Changes Made" and "Files Touched" sections below are reconstructed
**exclusively from agent checkpoints**. A checkpoint can claim a touch
the agent did not actually perform — there's no objective ground truth
to cross-check.

To restore full documenter fidelity in future sessions, run:

```
git init && git add -A && git commit -m "initial"
```

## Original Specification

Corregir distancia imposible (35) y unidad km/m faltante en card: UI con unidad siempre visible + dato DISTANCE_TOTAL con logs por fuente, dedup o cap de cordura. Todo en rama fix del día basada en dev + PR #34.

## Changes Made

(none)

## Files Touched

- `◌ src/components/VitalSignCard.tsx`
- `◌ src/utils/signosVitales.ts`
- `◌ android/app/src/main/java/com/vito/healthconnect/nativeModule/HealthDataProvider.kt`
- `◌ src/screens/InicioScreen.tsx`
- `◌ src/screens/TodosLosSignosScreen.tsx`

## Key Decisions

- documenter: fix distancia en rama fix/ui-fixes-dia (desde dev + PR #34 mergeado). UI: VitalSignCard value+unit inline (nunca número pelado), signosVitales sin 'm' fantasma en '--'. Nativo: logs distancia por origen + huérfana→0 + clamp >2m/paso. tsc exit 0. Sin commit: queda para seguir sumando fixes del día. NO amerita ADR.
- documenter: completar UI unidad en Inicio+TodosLosSignos (inline value+unit, sin fantasma en '--'). Nativo ya con logs por origen + huérfana→0 + clamp >2m/paso. tsc exit 0 en fix/ui-fixes-dia. Falta verificación física en dispositivo (distancia 35) vía WiFi + logcat. NO amerita ADR.
- documenter: verificado en físico Xiaomi 24090RA29G vía expo-dev-client. App ejecuta bien con fix instalado (BUILD SUCCESSFUL 8m48s + run-android). Receta WiFi validada: reverse tunnel + expo start --dev-client + exp://localhost:8081. Falta confirmación visual final de card distancia km/m + logcat VitoHealth.
- documenter: diagnóstico verificado en físico. '--' en distancia es CORRECTO: HC solo tiene fragmentos GPS del teléfono (último 0,011 km) y nada del reloj desde 4/ago; septiembre sin ningún dato de distancia. Mi Fitness calcula 612 m internos desde pasos pero NO los escribe en HC. Zancada usuario ~0,57-0,59 m/paso consistente. 4/ago: HC 10 km vs MiFit 8,09 km = doble conteo teléfono+reloj sin dedup (clamp >2m/paso no lo captura). Propuesta general: fallback UI estimado pasos×0,8m con marca ~ (nueva spec).
- documenter: hallazgo clave en físico — aggregate DISTANCE_TOTAL=0.0 con 26 records/337.3m en detalle (bug provider HC en Xiaomi). Fix: si aggregate=0 y detalle>0 se adopta el detalle como fuente de verdad, antes de huérfana/clamp. Requiere rebuild run-android (~9 min) para probar; card debería pasar a '337 m'.
- documenter: VERIFICADO EN FÍSICO — card distancia muestra '337 m' con unidad tras rebuild. Aggregate OEM bug confirmado y corregido (detalle como fuente de verdad). UI inline value+unit en dashboard/resumen/detalle/todos. tsc exit 0. Rama fix/ui-fixes-dia desde dev + PR #34. Sin commit (acordado, sigue sumando fixes del día). NO amerita ADR. Follow-up propuesto: fallback estimado ~ desde pasos + dedup por solape (nueva spec).

## Next Steps

- [ ] Implement: src/screens/DetalleSignoScreen.tsx
- [ ] Commit (or revert) declared-only files: src/components/VitalSignCard.tsx, src/utils/signosVitales.ts, android/app/src/main/java/com/vito/healthconnect/nativeModule/HealthDataProvider.kt, src/screens/InicioScreen.tsx, src/screens/TodosLosSignosScreen.tsx
- [ ] [self-review] Placeholders detected in draft: ['todo']

## Verified State

- Modified 5 file(s) inside spec scope
- verification hook 'tsc' passed

## Unverified Claims

- acceptance criterion: La card de distancia siempre muestra unidad (km si >=1000m, m si no) en dashboard, signos, detalle y todos-los-signos — nunca número pelado
- acceptance criterion: El caso 35 imposible queda explicado (doble conteo reloj+teléfono o fuente vehículo) y corregido con dedup o cap de cordura logueado
- acceptance criterion: Rama fix del día creada desde dev actualizado incluyendo PR #34
- acceptance criterion: tsc en verde
