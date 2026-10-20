---
schema_version: 1
doc_type: session
title: fix sueño muestra -- por ventana que excluye sesión de anoche
created_at: '2026-10-10T21:14:05.657898Z'
updated_at: '2026-10-10T21:14:05.657898Z'
tags:
- session
- session
- with-checkpoints
- gitless
- auto-draft
status: completed
links: []
vault_scope: local
fingerprint: 04dca787e2d90dc379eee11230a11d051a8ad1c1ea70dd8d90462598d199a6f2
session_id: 0dda10ce2ce3
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

Corregir card de Sueño en "--": la ventana de lectura (medianoche→ahora) excluye la sesión de anoche que empieza el día anterior. Cambiar a ventana "última noche" (ayer 18:00→ahora) manteniendo merge/dedup y logs. Sin tocar pasos/distancia/calorías.

## Changes Made

(none)

## Files Touched

- `◌ android/app/src/main/java/com/vito/healthconnect/nativeModule/HealthDataProvider.kt`
- `◌ src/utils/signosVitales.ts`
- `◌ src/screens/InicioScreen.tsx`
- `◌ src/screens/TodosLosSignosScreen.tsx`

## Key Decisions

- documenter: ventana sueño cambiada a 'última noche' (ayer 18:00→ahora) con helper lastNightTimeRange + log de ventana. Merge/dedup SCRUM-207 intacto; pasos/distancia/calorías sin tocar. Pendiente: diagnóstico en HC (¿existe sesión de anoche?) + rebuild run-android + refresh + logcat.
- documenter: VERIFICADO EN FÍSICO — tras rebuild, dashboard muestra pasos, calorías, distancia y sueño. Reloj 9h50m vs app 9,9h (dif ~4 min por redondeo/stages, dentro de tolerancia). Ventana 'última noche' confirmada como causa y fix. Merge SCRUM-207 intacto. tsc sin cambios TS (último verde vigente).
- documenter: formato sueño exacto 'Xh Ym' sin decimal (9h50m en vez de 9,9h), mismo patrón que formatMinutes. Solo JS: alcanza con reload, sin rebuild. tsc exit 0.
- documenter: sueño como valor+unidad (n° negrita + 'h 50m' chico gris, igual que m/kcal). Solo JS: reload. tsc exit 0.
- documenter: sueño en dos partes (9 grande + h chica + 50 grande + m chica) vía value2/unit2 en SignoVitalItem, render en Inicio grid y TodosLosSignos. Solo JS: reload. tsc exit 0.

## Next Steps

- [ ] Decide if scope drift is intentional: src/utils/signosVitales.ts, src/screens/InicioScreen.tsx, src/screens/TodosLosSignosScreen.tsx
- [ ] Commit (or revert) declared-only files: android/app/src/main/java/com/vito/healthconnect/nativeModule/HealthDataProvider.kt, src/utils/signosVitales.ts, src/screens/InicioScreen.tsx, src/screens/TodosLosSignosScreen.tsx
- [ ] [self-review] Placeholders detected in draft: ['todo']

## Verified State

- Modified 1 file(s) inside spec scope
- verification hook 'tsc' passed

## Unverified Claims

- acceptance criterion: La card de Sueño muestra las horas de anoche tras pull-to-refresh cuando HC contiene la sesión
- acceptance criterion: Si no hay sesión en la ventana, se mantiene '--' con log que confirma 0 sesiones (comportamiento correcto, no bug)
- acceptance criterion: tsc en verde
- acceptance criterion: Verificado en físico (Xiaomi) con logcat VitoHealth
