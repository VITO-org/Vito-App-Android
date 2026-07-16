---
schema_version: 1
doc_type: spec
title: Migracion HU-92 Supabase ML
created_at: '2026-06-13T17:09:38.382120Z'
updated_at: '2026-06-13T17:09:38.382120Z'
tags:
- spec
status: draft
links: []
vault_scope: local
fingerprint: de55482c406cf12ba6892a4ad71afbef575d6665ecfe0006ab5abfeb68a804b8
verification_hooks: []
goal: Aplicar migracion SQL Supabase y actualizar TypeScript al schema ML de HU-92.
files_in_scope:
- src/services/supabase/schema.sql
- src/services/supabase/models.ts
- src/services/supabase/api.ts
constraints: []
acceptance_criteria: []
---

## Goal

Aplicar migracion SQL Supabase y actualizar TypeScript al schema ML de HU-92.

## Requirements

- Ejecutar migracion SQL en Supabase
- Actualizar models.ts (tipos ML, eliminar obsoletos)
- Actualizar api.ts (nuevas funciones ML, eliminar viejas)
- Actualizar schema.sql
- Actualizar screens afectadas

## Files in Scope

- `src/services/supabase/schema.sql`
- `src/services/supabase/models.ts`
- `src/services/supabase/api.ts`

## Constraints

(none)

## Acceptance Criteria

(none)

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

*(none declared — legacy spec; finish-session will skip verification)*
