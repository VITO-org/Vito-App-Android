---
schema_version: 1
doc_type: design
title: rediseño pantalla inicio según mockups
created_at: '2026-10-11T14:30:58.652990Z'
updated_at: '2026-10-11T14:30:58.652990Z'
tags:
- design
- inicio
- rediseño
- mockups
status: draft
links: []
vault_scope: local
fingerprint: ef6197612c7a59a7adf12cb514821414b547af2e62ddf922cd41cc8111133c3b
session_id: 2026-10-11_rediseno-pantalla-inicio-segun-mockups
spec_path: C:\Vito-App-Android\.cortex\vault\specs\2026-10-11_rediseno-pantalla-inicio-segun-mockups.md
---

# rediseño pantalla inicio según mockups

> *Design document — Pluggable Middle Phase 09.B.*
> *Session: `2026-10-11_rediseno-pantalla-inicio-segun-mockups` · Spec: `C:\Vito-App-Android\.cortex\vault\specs\2026-10-11_rediseno-pantalla-inicio-segun-mockups.md`*

## Architecture decision

Fase 1 (visual, sin tocar lógica): reordenar `src/screens/InicioScreen.tsx` al orden mockup — header compacto (VitoAvatar 40 + saludo + botón notif, reducir `marginBottom:24` y tamaños hacia mockup), `ActiveAlertsBanner` entre header y Estado general (el condicional ya existe: `return null` si 0 activas — solo ajustar estilos/pill), Card Estado general siempre visible con estilos mockup (badge `successLight/#F0FDF4` hoy → parametrizable en Fase 2), filas de alertas con valor en rojo (`sev.text`) + línea umbral vía nuevo `getUmbralLabel(alert)` en `src/utils/alertas.ts` (solo si el dato existe, nunca inventar). No se tocan reglas HU-37, navegación (`destinoPorTipoAlerta`, `onAlertPress/onDismiss/onSeeAll`) ni Health Connect. Tokens al theme existente + únicos nuevos `#C62828` (crítica) / `#D97706` (advertencia).

Fase 2 (lógica separada de presentación): nuevo selector puro `src/utils/estadoGeneral.ts` → `getEstadoGeneral({activeAlerts, summary, lastSync})` que devuelve `{estado, badgeLabel, mensaje}`; `InicioScreen` lo consume para badge+texto del Card Estado general (deja de estar hardcodeado a 'Bien' / 'Tus signos vitales están estables', `InicioScreen.tsx:199-209`). Sin BD, sin dependencias, sin cambios de navegación. Nuevo test `__tests__/estadoGeneral.test.ts`.

Archivos (máx 5 prod, reutilizando base): 1) `src/screens/InicioScreen.tsx` (reorden + consume selector en Fase 2); 2) `src/components/ActiveAlertsBanner.tsx` (solo estilos); 3) `src/components/Card.tsx` (reuso, sin cambios); 4) `src/utils/alertas.ts` (agrega `getUmbralLabel`); 5) `src/utils/estadoGeneral.ts` (NUEVO, selector puro) + test espejo. Si el implementador necesita un 6º archivo (estilos/theme), extender `src/theme/colors.ts` con los 2 colores en vez de hardcodearlos.

## Data model changes

- NINGÚN cambio en BD ni en `Alerta`/`AlertaDatos` (`src/services/supabase/models.ts:303-316`): `getUmbralLabel` es solo lectura del jsonb existente.
- `getUmbralLabel(alert: Alerta): string | null` — lee ÚNICAMENTE campos ya presentes en `AlertaDatos` (`valor_registrado, umbral_configurado, bp_sistolica, bp_diastolica, umbral_sist, umbral_diast, is_combined`, models.ts:272-301); cualquier campo ausente/null → se omite ese fragmento; si no queda etiqueta válida → `null` y la fila NO renderiza línea de umbral (cumple 'umbral solo si el dato existe').
- SpO₂ puntual: `summary.spo2Percent` y `valor_registrado` son lecturas puntuales; si faltan, fila muestra `'--'`/sin línea — prohibido interpolar línea de tendencia o inventar histórico.
- Nulabilidad total: `datos: AlertaDatos | null`, cada numérico `number | undefined`, `umbral_sist/diast: number | null | undefined`; formateo defensivo (`Math.round`, sin `'m'` fantasma como en fix distancia de InicioScreen).

## API contracts

- `getEstadoGeneral(input: { activeAlerts: Alerta[]; summary: HealthSummary | null; lastSync: Date | null }): { estado: EstadoGeneral; badgeLabel: string; mensaje: string }` — `EstadoGeneral = 'bien' | 'requiere-atencion' | 'revisar' | 'sin-datos'`. Inputs: solo `activeAlerts` (ya filtradas por `leida_en === null` en banner), `summary: HealthSummary | null` (`src/types/health.ts`: steps, distanceMeters, caloriesKcal, sleepMinutes, averageBpm/bloodPressureSystolic/bloodPressureDiastolic/spo2Percent/bodyTemperatureCelsius nulables), `lastSync: Date | null`. Reglas: `sin-datos` si `summary == null && lastSync == null &&` sin activas; `revisar` si alguna activa `severidad === 'critica'`; `requiere-atencion` si alguna activa `severidad === 'advertencia'`; `bien` en cualquier otro caso (incluye solo leve/INFO — ver Riesgos). Precedencia estricta: critica > advertencia > sin-datos > bien; nunca 'bien' con críticas (AC spec). Función pura, sin navegación ni I/O.
- `getUmbralLabel(alert: Alerta): string | null` en `src/utils/alertas.ts` — devuelve etiqueta de umbral solo con campos presentes en `alert.datos` (`AlertaDatos | null`, `src/services/supabase/models.ts:272-301`), o `null` (no renderizar línea). Por tipo: `hipoxia` → `valor_registrado` + `umbral_configurado` (`'SpO₂ 88% · umbral <90%'`); `hipertension/hipotension` → `bp_sistolica/bp_diastolica` + `umbral_sist/umbral_diast` respetando `is_combined` (`'120/80 · umbral ≥140/90'` o parcial si solo un lado presente); `taquicardia/bradicardia` → `valor_registrado` + `umbral_configurado` (`'132 lpm · umbral >120'`). Tolerar nulls/ausentes en cada campo; `datos == null` → `null`. SpO₂ es puntual, sin línea de tendencia si falta.
- Props que cambian (ninguna rota): `ActiveAlertsBanner` — mismos props (`alerts, onAlertPress?, onDismiss?, onSeeAll?`); solo estilos mockup (pill severidad máxima danger>warning>info, colores `#C62828/#D97706` nuevos + theme existente) y render condicional ya existente (`return null` si 0 activas, `ActiveAlertsBanner.tsx:35-37`). `InicioScreen` — sin nuevas props; reordena bloques existentes (header compacto → banner condicional → Estado general permanente → Resumen → Síntomas → resto intacto: signos vitales, última actividad, HC warnings, navegación `destinoPorTipoAlerta` HU-37 intacta). `Card` — sin cambios, reutilizado tal cual.

## Test plan

- Nuevo jest `__tests__/estadoGeneral.test.ts` (Fase 2): 4 estados — critica→`revisar`, advertencia→`requiere-atencion`, sin nada+`summary==null&&lastSync==null`→`sin-datos`, con datos y sin críticas/advertencias→`bien`; + caso leve/INFO solas→`bien` (fija el default); + precedencia mixta (critica+advertencia→`revisar`).
- `npx tsc --noEmit` verde en ambas fases (hook bloqueante de la spec).
- Escenarios 1-6 del brief → verificación: S1 normal/Bien (F1: orden+header compacto; F2: selector→`bien`); S2 críticas (F1: banner rojo + filas valor en rojo; F2: selector→`revisar`, nunca 'Bien'); S3 advertencia (F1: banner ámbar; F2: →`requiere-atencion`); S4 sin datos (F1: banner ausente + `'--'`; F2: →`sin-datos` explícito); S5 leve/INFO solas (F1: banner neutro; F2: estado sigue `bien` — default); S6 umbral-si-existe (F1: línea umbral solo con dato presente, SpO₂ puntual sin línea si falta; F2: sin cambios).
- Manual en físico (AC spec): métricas, síntomas y navegación intactas tras reorden.

## Risks

- R1 Inventar datos (umbrales/mediciones/tendencias) — mitigación: `getUmbralLabel` solo lee `datos` existentes, `null` si falta; prohibidas tendencias (spec constraint).
- R2 Romper reglas HU-37 (dismiss críticas / navegación a DetalleSigno) — mitigación: no tocar `destinoPorTipoAlerta`, `onAlertPress/onDismiss`, ni filtro `leida_en===null`; Fase 1 solo estilos.
- R3 'Bien' con críticas visibles (incoherencia mockup) — mitigación: precedencia crítica>advertencia en selector + test; Estado general siempre visible pero nunca 'Bien' con activas críticas.
- R4 Severidades leve/INFO mal clasificadas (son las más frecuentes) — DECISIÓN PENDIENTE, ver default abajo.
- R5 Nulls en jsonb `datos` (alertas viejas sin campos HU-43/HU-98) — mitigación: tolerancia campo-por-campo, `null` → sin línea.
- R6 SpO₂/BP ausentes según dispositivo (campos nulables en `HealthSummary`) — mitigación: `'--'` + `noDataMessage`, sin línea.
- R7 Colores fuera de theme (mockup trae #C62828/#D97706) — mitigación: únicos 2 hex nuevos, resto `colors.*` (`danger/warning/success`); proponer llevarlos a `theme/colors.ts`.
- R8 Regresión tsc/CI (rama fix/ui-fixes-dia, tsc bloqueante) — mitigación: firmas tipadas estrictas, `tsc --noEmit` en ambas fases.
- R9 Health Connect no disponible/desactualizado/sin permisos — mitigación: no tocar cards HC/error existentes; `sin-datos` solo cuando `summary==null && lastSync==null` y sin activas.
- R10 Layout FlatList `data={[{}]}` + grid vitales — mitigación: reorden sin cambiar contenedor; verificar en físico (AC) que no haya overflow con banner expandido.
- DECISIÓN PENDIENTE leve/INFO → DEFAULT PROPUESTO: leve/INFO NO alteran el estado general (solo `critica`→revisar, `advertencia`→requiere-atención, sin-datos explícito). Justificación: (a) `SeveridadAlerta` incluye 'INFO'/'leve' como ruido informativo (models.ts:265) y `severityLabel` ya devuelve null para INFO (alertas.ts:22-26); (b) el banner ya las muestra con `SEVERITY_COLORS.info` neutro, así que no se pierden; (c) evita que notificaciones informativas dejen al usuario permanentemente en 'Requiere atención'. Si PO decide lo contrario, cambiar es 1 línea en el selector + 1 test — queda cubierto por el caso leve/INFO del test plan.

---

*Generated by `cortex-code-designer` (Pluggable Middle Phase 09.B). The
implementer reads this document and follows it; deviations require a
new checkpoint with the `unverified_claims` justifying the diff.*
