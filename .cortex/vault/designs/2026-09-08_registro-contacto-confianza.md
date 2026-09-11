---
schema_version: 1
doc_type: design
title: Registro de contactos de confianza (HU-16)
created_at: '2026-09-08T21:43:35.397174Z'
updated_at: '2026-09-08T21:43:35.397174Z'
tags:
- hu-16
- contactos-confianza
- supabase
- rls
- release-r3
- epica-1
status: draft
links: []
vault_scope: local
fingerprint: 4c34e5bf952826d747ff0c98d1742498bdc294d085fa716ac0d6625479f4c5a6
session_id: 2026-09-08_registro-contacto-confianza
spec_path: /Users/cristianvera21/Documents/proyecto-final/Vito-App-Android/.cortex/vault/specs/2026-09-08_registro-contacto-confianza.md
---

# Registro de contactos de confianza (HU-16) — Design Doc

> *Design document — Pluggable Middle Phase 09.B.*
> *Session: `2026-09-08_registro-contacto-confianza` · Spec: `/Users/cristianvera21/Documents/proyecto-final/Vito-App-Android/.cortex/vault/specs/2026-09-08_registro-contacto-confianza.md`*
> *Rama: `dev` · GATES: `npx tsc --noEmit` 0 errores · `npx jest` exit code 0 (149 tests existentes + nuevos)*

---

## 1. Contexto y decisión de arquitectura (resumen ejecutivo)

HU-16: el usuario autenticado agrega, edita y elimina contactos de confianza (familiar / médico / otro) con **nombre, relacion, teléfono, email** y **frecuencia de notificación por contacto**. Persistencia en Supabase (tabla nueva `contacto_confianza` con RLS), acceso desde PerfilScreen, sobrevive entre sesiones.

### Decisiones clave

| # | Decisión | Justificación |
|---|----------|---------------|
| D1 | `contacto_confianza` con **RLS desde el alta**: 4 policies separadas `select_own / insert_own / update_own / delete_own` (naming del patrón `baseline_personalizado` de hu98:78-89) + policy `service_role_all` | CA-04 pide explícitamente "select/insert/update/delete own". NO se repite el gap de `datos_reloj` (tabla creada sin RLS, commit 001de31). Se copia el patrón que SÍ funciona en el repo. |
| D2 | `relacion` y `frecuencia_notificacion` como **varchar + CHECK** en DB y **union type** en TS | Dirección del repo: hu41 migró de `ENUM` de Postgres a `varchar` (2026-08-20_hu41). El CHECK agrega validación a nivel DB (defensa en profundidad) sin el costo de `ALTER TYPE` de los enums. |
| D3 | `frecuencia_notificacion` como **columna propia en `contacto_confianza`** | La preferencia es POR CONTACTO; `preferencia_notificacion` es global (1 fila/usuario, PK `id_usuario`, contrato `on_conflict=id_usuario` existente). Guardarla allí requeriría romper PK/contrato + joins. CA-04 lista la columna en la tabla. |
| D4 | API con **`rawRestFetch<T>()`** para GET/POST/PATCH/DELETE | Writes de `@supabase/supabase-js` cuelgan la promesa en RN (issues #1620/#1693). Patrón verificado: `insertAlerta` (POST `return=representation`), `marcarAlertaLeida` (PATCH `id=eq.X`), `deleteSintomaUsuario` (DELETE con filtro doble). |
| D5 | **Validación manual** (NO `react-hook-form` + `zod`), centralizada como lógica pura en `src/services/contactos.ts` | Ver sección 4.4. |
| D6 | Formulario de alta/edición en **Modal bottom-sheet inline** dentro de `ContactosConfianzaScreen` | `files_in_scope` restringe a UN screen nuevo; el repo ya usa Modal bottom-sheet para opciones (ConfiguracionScreen:390, RegistrarSintoma). |
| D7 | Lógica testeable: validators + **query builders** como funciones puras | El repo NO mockea el supabase client; los tests usan lógica pura con `jest.fn()` (alerts.test.ts `makeEngineDeps`, personalized.test.ts). Los builders permiten testear que el query filtra por `id_usuario` sin mockear nada. |
| D8 | DoD "frecuencia aplicada efectivamente al envío de alertas": **FUERA de alcance** de esta HU | Verificado: `AlertEngine`/`HealthProvider` (engine.ts) no leen `contacto_confianza`. Esta HU persiste la preferencia como dato (CA-03) y queda disponible para el futuro motor de envío. Ver Risks R3. |

---

## 2. Data model

### 2.1 Migration `scripts/migrations/2026-09-08_hu16_contacto_confianza.sql`

El usuario corre la migración manualmente en el SQL Editor de Supabase (no hay push automatizado de migraciones).

```sql
-- ============================================
-- HU-16: Registro de contactos de confianza
-- Fecha: 2026-09-08
-- Descripción: Tabla contacto_confianza (una fila por contacto del usuario)
--              con RLS "own" habilitado desde el alta (NO repetir el gap
--              de datos_reloj, que se creó sin RLS).
--
-- Ejecutar en: Supabase SQL Editor
-- ============================================

-- 1. TABLA contacto_confianza
CREATE TABLE contacto_confianza (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario uuid NOT NULL REFERENCES public.usuario(id) ON DELETE CASCADE,
  nombre varchar(120) NOT NULL,
  relacion varchar(20) NOT NULL CHECK (relacion IN ('familiar', 'medico', 'otro')),
  telefono varchar(30) NOT NULL,
  email varchar(255) NOT NULL,
  frecuencia_notificacion varchar(20) NOT NULL DEFAULT 'inmediata'
    CHECK (frecuencia_notificacion IN ('inmediata', 'diaria', 'semanal', 'sin_notificaciones')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Índice por usuario: lookup de la lista de la pantalla + soporte del filtro id_usuario
CREATE INDEX idx_contacto_confianza_usuario
  ON contacto_confianza(id_usuario);

-- 3. RLS: el dueño solo ve/escribe sus contactos (CA-04)
ALTER TABLE contacto_confianza ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacto_confianza_select_own"
  ON contacto_confianza FOR SELECT
  TO authenticated
  USING (auth.uid() = id_usuario);

CREATE POLICY "contacto_confianza_insert_own"
  ON contacto_confianza FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id_usuario);

CREATE POLICY "contacto_confianza_update_own"
  ON contacto_confianza FOR UPDATE
  TO authenticated
  USING (auth.uid() = id_usuario)
  WITH CHECK (auth.uid() = id_usuario);

CREATE POLICY "contacto_confianza_delete_own"
  ON contacto_confianza FOR DELETE
  TO authenticated
  USING (auth.uid() = id_usuario);

-- Escrituras server-side futuras (motor de notificaciones / Edge Function).
-- Copia del patrón baseline_personalizado_service_role_all (hu98:85-89).
CREATE POLICY "contacto_confianza_service_role_all"
  ON contacto_confianza FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Comentario de tabla (documentación in-DB, como hu25/hu98)
COMMENT ON TABLE public.contacto_confianza IS 'Contactos de confianza del usuario (HU-16). RLS: solo el dueño (auth.uid()=id_usuario) puede select/insert/update/delete.';
```

**Nota RLS (estilo):** Postgres combina policies por comando con OR lógico, así que 4 policies separadas son funcionalmente equivalentes a una `FOR ALL` (estilo de `alerta`/`preferencia_notificacion`), pero expresan explícitamente CA-04 y permiten grant/auditoría por comando. Por eso se usa el estilo `_own` y **no** el `FOR ALL`. La policy `service_role_all` se agrega por consistencia con `baseline_personalizado` (hu98) y para no bloquear writes server-side futuros. FK name autogenerado: `contacto_confianza_id_usuario_fkey` (el repo no nombra FKs explícitamente — ver `baseline_personalizado`).

**`relacion` (spec usa `relacion`, NO `rol`):** respetado en DDL, models.ts y payloads.

### 2.2 models.ts

```ts
// ─── TABLA: contacto_confianza (HU-16 — registro de contactos de confianza) ───
export type RelacionContacto = 'familiar' | 'medico' | 'otro';
export type FrecuenciaNotificacion = 'inmediata' | 'diaria' | 'semanal' | 'sin_notificaciones';

export interface ContactoConfianza {
  id: string;
  id_usuario: string;
  nombre: string;
  relacion: RelacionContacto;
  telefono: string;
  email: string;
  frecuencia_notificacion: FrecuenciaNotificacion;
  created_at: string | null;
  updated_at: string | null;
}
export type ContactoConfianzaInsert = Omit<ContactoConfianza, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
```

(Sigue el patrón canónico del repo: interfaz singular por tabla + `XxxInsert = Omit<Xxx, ...> & {...opcionales}`, enums como union strings.)

### 2.3 ¿Columna en `contacto_confianza` o en `preferencia_notificacion`?

**Columna `frecuencia_notificacion` en `contacto_confianza`.** Justificación:
- La preferencia es **por contacto** (CA-03); modelarla en la tabla del contacto es 1:1 con la entidad.
- `preferencia_notificacion` es **global** (1 fila por usuario, PK `id_usuario`, único index + `on_conflict=id_usuario` en `upsertPreferenciaNotificacion`). Mover la frecuencia ahí la convertiría en N filas/usuario → rompe PK y contrato existente (`getPreferenciaNotificacion` hace `limit=1`).
- Lectura simple: `getContactos` trae la frecuencia ya incluida, sin joins.

---

## 3. API contracts (api.ts)

> Los queries sensibles se construyen en un módulo **puro** `src/services/contactos.ts` (sin imports de `client.ts`, testeable con jest sin mockear supabase) y `api.ts` los consume.

### 3.1 `src/services/contactos.ts` (lógica pura)

```ts
import type {
  ContactoConfianza,
  ContactoConfianzaInsert,
  FrecuenciaNotificacion,
  RelacionContacto,
} from './supabase/models';

export type ContactoForm = {
  nombre: string;
  relacion: RelacionContacto | '';
  telefono: string;
  email: string;
  frecuencia_notificacion: FrecuenciaNotificacion;
};

export const FRECUENCIAS: { valor: FrecuenciaNotificacion; label: string }[] = [
  { valor: 'inmediata', label: 'Inmediata (cada alerta)' },
  { valor: 'diaria', label: 'Resumen diario' },
  { valor: 'semanal', label: 'Resumen semanal' },
  { valor: 'sin_notificaciones', label: 'Sin notificaciones' },
];

export const RELACIONES: { valor: RelacionContacto; label: string }[] = [
  { valor: 'familiar', label: 'Familiar' },
  { valor: 'medico', label: 'Médico' },
  { valor: 'otro', label: 'Otro' },
];

/** Quita espacios/guiones/paréntesis, conserva el "+" inicial. */
export function normalizarTelefono(raw: string): string;

/** ^[^\s@]+@[^\s@]+\.[^\s@]{2,}$ (regex conservadora). */
export function esEmailValido(email: string): boolean;

/** E.164 simplificado: ^\+?[0-9]{8,15}$ sobre el teléfono normalizado. */
export function esTelefonoValido(tel: string): boolean;

/**
 * Valida el formulario completo. Devuelve el primer error o null.
 * authed compara contra la sesión/perfil para impedir agregarse a uno mismo.
 */
export function validarContacto(
  form: ContactoForm,
  authed?: { email?: string | null; telefono?: string | null },
): string | null;

// ── Query builders (testables, silicatos del query real) ──
export function buildGetContactosQuery(userId: string): string;
export function buildDeleteContactoQuery(id: string, idUsuario: string): string;
export function buildUpdateContactoQuery(id: string): string;
```

### 3.2 `api.ts` — funciones nuevas (CA-05)

```ts
// ═══════════════════════════════════════════
// CONTACTOS DE CONFIANZA (HU-16)
// ═══════════════════════════════════════════

export async function getContactos(
  userId: string,
  accessToken?: string | null,
): Promise<ContactoConfianza[]> {
  const rows = await rawRestFetch<ContactoConfianza[]>('contacto_confianza', {
    query: buildGetContactosQuery(userId), // 'select=*&id_usuario=eq.<userId>&order=nombre.asc'
    accessToken,
  });
  return rows ?? [];
}

export async function insertContacto(
  contacto: ContactoConfianzaInsert,
  accessToken?: string | null,
): Promise<ContactoConfianza> {
  const rows = await rawRestFetch<ContactoConfianza[]>('contacto_confianza', {
    method: 'POST',
    body: { ...contacto, updated_at: new Date().toISOString() },
    prefer: 'return=representation',
    accessToken,
  });
  const row = rows[0];
  if (!row) throw new Error('No se pudo crear el contacto');
  return row;
}

export async function updateContacto(
  id: string,
  cambios: Partial<Omit<ContactoConfianzaInsert, 'id_usuario'>>,
  accessToken?: string | null,
): Promise<void> {
  await rawRestFetch<null>('contacto_confianza', {
    method: 'PATCH',
    body: { ...cambios, updated_at: new Date().toISOString() },
    prefer: 'return=minimal',
    query: buildUpdateContactoQuery(id), // 'id=eq.<id>'
    accessToken,
  });
}

export async function deleteContacto(
  id: string,
  idUsuario: string,
  accessToken?: string | null,
): Promise<void> {
  await rawRestFetch<null>('contacto_confianza', {
    method: 'DELETE',
    prefer: 'return=minimal',
    query: buildDeleteContactoQuery(id, idUsuario), // 'id=eq.<id>&id_usuario=eq.<idUsuario>'
    accessToken,
  });
}
```

**Contratos / comportamiento:**
- `getContactos` filtra siempre por `id_usuario=eq.<userId>` (defensa doble ante RLS + habilita el test del query). Ordena `nombre.asc`. Devuelve `[]` cuando no hay filas (patrón `getAlertas`/`getDispositivos`).
- `insertContacto`: `id_usuario` lo setea la pantalla con `getUserId()`. La policy `insert_own` con `WITH CHECK (auth.uid() = id_usuario)` rechaza si se manda un uid ajeno.
- `updateContacto`: PATCH por `id=eq.X` (patrón `marcarAlertaLeida`). El tipo de `cambios` excluye `id_usuario` → no se puede "mover" un contacto de dueño; RLS `update_own` exige que la fila sea del dueño.
- `deleteContacto`: DELETE con doble filtro `id=eq.X&id_usuario=eq.Y` (patrón `deleteSintomaUsuario`:620-631) — defensa en profundidad ante RLS.
- Manejo de errores: `rawRestFetch` lanza `Error` con `{ message, status, code }`; la pantalla muestra `message` en el `errorBox`. `accessToken` opcional (se pasa `session?.access_token`, patrón ConfiguracionScreen:161).

---

## 4. Frontend

### 4.1 Navegación y acceso

- `RootStackParamList` (RootNavigator.tsx:16-32): agregar `ContactosConfianza: undefined;`.
- `RootNavigator.tsx`: nuevo `Stack.Screen` bajo `{session && (...)}` con `component={ContactosConfianzaScreen}` y `options={{animation: 'slide_from_right'}}` (patrón EditarPerfil/Configuracion).
- `PerfilScreen.tsx`: nueva `PerfilOption` → insertar entre "Datos personales" y "Configuración":
  ```tsx
  {icon: '👥', label: 'Contactos de confianza', onPress: handleNavigateContactos},
  ```
  con `const handleNavigateContactos = () => navigation.navigate('ContactosConfianza');`.
  ⚠️ El render de opciones usa `{i < 4 && <View style={styles.divider} />}` (PerfilScreen:119): con 6 opciones el índice pasa a `i < 5`.

### 4.2 `ContactosConfianzaScreen.tsx` — estructura

- **Contenedor:** `View` flex 1, `backgroundColor: colors.background`.
- **Top bar:** back (‹) + título "Contactos de confianza" (patrón topBar de EditarPerfilScreen).
- **Carga / refresh:** `useFocusEffect` (patrón ConfiguracionScreen:154) que con `getUserId()` + `getContactos(userId, session?.access_token)` actualiza la lista cada vez que se enfoca (para reflejar add/edit/delete); estados `cargando`, `error`, `contactos`.
- **Lista:** `FlatList` (patrón InicioScreen/HistorialSintomas), `keyExtractor={(c) => c.id}`, `RefreshControl` para pull-to-refresh (patrón AlertasScreen), `ListEmptyComponent` = estado vacío (mensaje + subtítulo, en `Card`).
- **Item (Card):**
  - Línea 1: `nombre` (bold, `textPrimary`) + badge `relacion` (pill `successLight`).
  - Línea 2: 📞 `telefono` y ✉️ `email` (`textSecondary`, caption).
  - Línea 3: "Frecuencia: {label}" + acciones `Editar` (color `primary`) y `Eliminar` (color `danger`).
  - `Eliminar` → `Alert.alert` de confirmación (patrón signOut de PerfilScreen:56) → `deleteContacto(id, userId, session?.access_token)` → refetch.
- **Footer fijo** (debajo del FlatList): `PrimaryButton title="Agregar contacto" onPress={abrir modal}` (la app NO tiene FAB / FAB component; PrimaryButton es el CTA canónico).

### 4.3 Formulario: Modal inline (bottom-sheet) vs sub-pantalla

**DECISIÓN: Modal bottom-sheet dentro del mismo archivo** (no una ruta/screen extra).

Justificación:
1. `files_in_scope` de la spec restringe a `ContactosConfianzaScreen.tsx` como única pantalla nueva (agregar una ruta + archivo extra expande scope sin pedido).
2. El repo ya usa Modal bottom-sheet para selección de opciones (ConfiguracionScreen:390, RegistrarSintoma).
3. El formulario es compacto: 4 campos + 2 selectores segmentados; no justifica un flujo de navegación completo.

Implementación:
- `Modal` nativo `animationType="slide"`, transparent, overlay `rgba(0,0,0,0.4)`, sheet blanco con `borderTopLeft/TopRightRadius: 20` (patrón modal avanzado de Configuración); `KeyboardAvoidingView` dentro del sheet con `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`.
- Campos (patrón EditarPerfilScreen):
  - **Nombre**: `TextInput`, `autoCapitalize="words"`.
  - **Relación**: selector segmentado 3 botones (patrón `SEXOS` EditarPerfil:297-310) con `RELACIONES`.
  - **Teléfono**: `TextInput keyboardType="phone-pad"`, placeholder `+54 11 5555-1234`.
  - **Email**: `TextInput keyboardType="email-address"`, `autoCapitalize="none"`.
  - **Frecuencia**: selector segmentado 4 botones con `FRECUENCIAS`.
- `errorBox` (`dangerLight` + `danger`) que muestra el mensaje de `validarContacto`.
- `PrimaryButton "Guardar contacto"` con `loading` (patrón EditarPerfil).
- Modo edición: precargar valores del item en `useEffect` + mantener `id` en estado; título "Editar contacto".

**Estados del formulario:** `form` (object con los 5 campos) o `useState` por campo (patrón EditarPerfil); y `editandoId: string | null` (null = alta).

### 4.4 Validación: DECISIÓN react-hook-form + zod vs manual

**DECISIÓN: validación manual** (NO sumar `react-hook-form` + `zod`).

Argumentos (costo/beneficio):
- **No hay deps directas** de `react-hook-form` ni `zod` en `package.json` (zod es transitivo de expo). Sumar 2 dependencias es una decisión de peso: lockfile, bundle, ecosistema de tipos + configuración de babel/transforms, y adopción de un estilo que ninguna otra pantalla usa.
- **Consistencia del repo:** TODA la app valida a mano — `EditarPerfilScreen.validar(): string | null` (EditarPerfilScreen:101), RegistrarSintoma, CompleteProfile. Patrón: `useState` por campo + `validar()` local + `errorBox` + `PrimaryButton loading`.
- **Beneficio marginal bajo:** RHF+zod brilla en forms grandes (decenas de campos, validación cross-field dinámica, schemas compartidos). Acá son 5 campos y reglas simples (~40 líneas de lógica pura).
- **Testabilidad:** la validación manual se centraliza en `src/services/contactos.ts` como **función pura** y se testea con jest (no hay precedente en el repo de testear forms con RHF/zod; los tests del repo son lógica pura + deps inyectadas).
- **Primer caso del repo:** no existe validación de email en ningún lado; teléfono hoy solo usa `keyboardType="phone-pad"`. Este es el primer requisito formal de formato → se implementa como helper puro reutilizable, no como dependencia nueva.

**Reglas de `validarContacto(form, authed?):`**

| Campo | Regla | Error |
|-------|-------|-------|
| nombre | requerido, `trim()`, 1..120 chars | "El nombre es obligatorio" |
| relacion | ∈ `('familiar','medico','otro')` | "Elegí la relación (familiar, médico u otro)" |
| telefono | requerido; `normalizarTelefono()` luego `^\+?\d{8,15}$` | "El teléfono no es válido (formato E.164: +54 11 5555-1234)" |
| email | requerido; regex `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$` | "El email no es válido" |
| auto-prohibición | `email.toLowerCase() === authed.email?.toLowerCase()` o `normalizarTelefono(telefono) === normalizarTelefono(authed.telefono)` | "No podés agregarte a vos mismo como contacto" |

Al guardar: normalizar email en lowercase y teléfono ya normalizado (persistir el valor normalizado).

---

## 5. Test plan

**Patrón del repo:** lógica pura + deps inyectadas con `jest.fn()` (`makeEngineDeps` en alerts.test.ts, `mockResolvedValue/mockRejectedValue` en personalized.test.ts). **NO se mockea el supabase client** (no hay precedente). Por eso validators + query builders viven en el módulo puro.

### 5.1 `__tests__/contactos.test.ts` (unitario)

**validarContacto:**
- nombre vacío / solo espacios → error.
- email inválido: `'juan'`, `'juan@'`, `'a@b'`, `'a@b.c'` → error; válidos: `'juan@casa.com'`, `'j+tag@sub.dominio.com'` → null (resto correcto).
- teléfono inválido: `'123'`, `'+54911ab'`, `'+54 11 5555-1234 extra'` → error; válidos: `'+5491122334455'`, `'15551234'`, `'+54 11 5555-1234'` (post-normalización) → null.
- auto-prohibición: mismo email que `authed.email` con distinto case → error; mismo teléfono normalizado que `authed.telefono` → error.
- `frecuencia_notificacion` fuera del enum → error.

**Query builders (cumple el "unit test de filtro id_usuario" del plan de QA):**
- `buildGetContactosQuery('u1')` contiene `id_usuario=eq.u1` y `order=nombre.asc` (el query del cliente SIEMPRE filtra por dueño).
- `buildDeleteContactoQuery('c1','u1')` contiene `id=eq.c1` Y `id_usuario=eq.u1` (doble filtro).
- `buildUpdateContactoQuery('c1')` contiene `id=eq.c1`.

**FRECUENCIAS/RELACIONES:** 4 y 3 entradas respectivamente, con `valor` y `label` no vacíos.

### 5.2 RLS cross-user (prueba QA manual SQL) — bloque comentado en la migration

```sql
-- ════════════════════ Verificación manual RLS cross-user — HU-16 ════════════════════
-- Ejecutar en el SQL Editor de Supabase. Reemplazar <UID_A>, <UID_B> e <ID_FILA_B>.

-- 0) Confirmar que las policies existen (5 esperadas)
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename = 'contacto_confianza' ORDER BY policyname;

-- 1) Simular sesión autenticada como usuario A
SELECT set_config('request.jwt.claims', '{"sub":"<UID_A>","role":"authenticated"}', false);
SELECT set_config('role', 'authenticated', false);

-- 2) INSERT de contacto propio → OK (esperado: 1 fila)
INSERT INTO contacto_confianza (id_usuario, nombre, relacion, telefono, email, frecuencia_notificacion)
VALUES ('<UID_A>', 'Familiar A', 'familiar', '+5491100001111', 'a@example.com', 'diaria');

-- 3) SELECT de filas de B siendo A → 0 filas (esperado: 0)
SELECT count(*) FROM contacto_confianza WHERE id_usuario = '<UID_B>';

-- 4) UPDATE de filas de B siendo A → 0 filas afectadas (esperado: 0)
UPDATE contacto_confianza SET nombre = 'hack' WHERE id_usuario = '<UID_B>';

-- 5) DELETE de fila de B siendo A → 0 filas eliminadas (esperado: 0)
DELETE FROM contacto_confianza WHERE id = '<ID_FILA_B>';

-- 6) INSERT con id_usuario ajeno siendo A → VIOLACIÓN RLS (WITH CHECK auth.uid()=id_usuario)
INSERT INTO contacto_confianza (id_usuario, nombre, relacion, telefono, email, frecuencia_notificacion)
VALUES ('<UID_B>', 'Invasor', 'familiar', '+5491199999999', 'b@example.com', 'inmediata');
```

### 5.3 Gates

- `npx tsc --noEmit` → 0 errores.
- `npx jest` → exit code 0. Se mantienen los 149 tests existentes (el "149/149" de la spec es la base; esta HU agrega casos nuevos, el total crece).

---

## 6. Risks y mitigaciones

| # | Riesgo | Mitigación |
|---|--------|-----------|
| R1 | **RLS mal configurado por omisión** (lección `datos_reloj`, creada sin `ENABLE ROW LEVEL SECURITY` ni policies, commit 001de31, nunca corregido) | La migration lleva `ENABLE ROW LEVEL SECURITY` + 4 policies `_own` + `service_role_all`, copiadas del patrón que SÍ funciona (`baseline_personalizado` hu98:78-89). Verificación: `pg_policies` + script cross-user (5.2). Comentario en la migration. |
| R2 | **`rawRestFetch` en DELETE/PATCH** (¿hay precedente?) | Sí, verificado: `deleteSintomaUsuario` (DELETE con query doble, api.ts:620) y `marcarAlertaLeida` (PATCH `id=eq.X`, api.ts:792). DELETE no manda body → solo query string. Riesgo bajo. |
| R3 | **DoD "frecuencia se aplica efectivamente al envío de alertas"** | El `AlertEngine` (engine.ts) y `HealthProvider` NO consultan `contacto_confianza` (verificado contra deps de engine.ts:75-97). Integrar los contactos al envío = tocar el motor notificador/HealthProvider, **fuera de scope**. Esta HU persiste `frecuencia_notificacion` como dato por contacto (CA-03 quedaría cumplido como persistencia). Se informa al stakeholder: el literal del DoD se cumple en un incremento futuro (notificador/Edge Function). |
| R4 | **Primera validación de email/teléfono del repo** (no existe precedente) | Regex conservadores: E.164 simplificado (`^\+?\d{8,15}$` post-normalización), acepta formato argentino e internacional. Normaliza antes de validar (no rechaza `+54 11 5555-1234`). Centralizado en función pura testeable; no se bloquea con validación excesivamente estricta. |
| R5 | **"No puede ser el propio usuario" y duplicados** solo client-side | No hay forma server-side sin trigger/check. Se valida en `validarContacto` contra `session.user.email` y `profile.telefono`. Hardening futuro (descartado por sobre-ingeniería y para no bloquear ediciones): unique index `(id_usuario, lower(email))` + trigger. |
| R6 | **Escaping / inyección en query string** | Filtros solo por UUID (`id_usuario`, `id`) — seguros para PostgREST. Email/nombre viajan en el body JSON, nunca en la query. Si a futuro se filtra por texto, usar `encodeURIComponent`. |

---

## 7. Archivos a crear/modificar

### Crear
| Archivo | Contenido |
|---------|-----------|
| `scripts/migrations/2026-09-08_hu16_contacto_confianza.sql` | DDL tabla + índice + 5 policies RLS (sección 2.1) + bloque comentado de verificación cross-user (5.2). La corre el usuario manualmente. |
| `src/services/contactos.ts` | Lógica pura: tipos de form, `FRECUENCIAS`, `RELACIONES`, `normalizarTelefono`, `esEmailValido`, `esTelefonoValido`, `validarContacto`, query builders. Sin imports de `client.ts`. |
| `src/screens/ContactosConfianzaScreen.tsx` | Pantalla: topBar + FlatList de Cards + footer PrimaryButton + Modal bottom-sheet de alta/edición. |
| `__tests__/contactos.test.ts` | Validators + query builders (sección 5.1). |

### Modificar
| Archivo | Cambio |
|---------|--------|
| `src/services/supabase/models.ts` | `RelacionContacto`, `FrecuenciaNotificacion`, `ContactoConfianza`, `ContactoConfianzaInsert`. |
| `src/services/supabase/api.ts` | Import de builders desde `contactos.ts` + 4 funciones `getContactos`/`insertContacto`/`updateContacto`/`deleteContacto` (sección 3.2). |
| `src/screens/PerfilScreen.tsx` | Nueva `PerfilOption` "Contactos de confianza" + `handleNavigateContactos`; divisores `i < 4` → `i < 5`. |
| `src/navigation/RootNavigator.tsx` | Ruta `ContactosConfianza` en `RootStackParamList` + `Stack.Screen` con `animation: 'slide_from_right'`. |
| `src/services/supabase/schema.sql` | Sección de documentación de `contacto_confianza` (SIN RLS — el repo solo documenta el schema; las policies viven en `scripts/migrations/`). |

### NO tocar
- `package.json` / lockfile (sin dependencias nuevas — decisión D5).
- `AlertEngine` / `HealthProvider` / notificador (integración del envío de alertas con contactos: fuera de scope, ver R3).
- Comportamiento de módulos existentes fuera del scope declarado (constraint de la spec).

---

*Generated by `cortex-code-designer` (Pluggable Middle Phase 09.B). The
implementer reads this document and follows it; deviations require a
new checkpoint with the `unverified_claims` justifying the diff.*