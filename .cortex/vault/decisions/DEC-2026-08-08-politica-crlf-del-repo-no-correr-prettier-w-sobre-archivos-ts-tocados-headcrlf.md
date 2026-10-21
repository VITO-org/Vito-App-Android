---
schema_version: 1
doc_type: decision
title: 'Política CRLF del repo: no correr prettier -w sobre archivos TS tocados (HEAD=CRLF)'
created_at: '2026-08-08T14:20:52.344907Z'
updated_at: '2026-08-08T14:20:52.344907Z'
tags: []
status: active
links:
- vault/specs/2026-08-08_hu-25-sincronizacion-de-datos-de-salud-scrum-79.md
vault_scope: local
fingerprint: e76de014ecb323c3c5b116db366eb720c9a8d19d7b24cd7d166bbd984eb076c4
reversible_within_days: 0
---

## Context

Durante HU-25 los archivos commiteados en HEAD usan CRLF (verificado con git ls-files --eol: i/crlf). Editores/agentes que escriben LF convierten el archivo completo y producen diffs de archivo entero (visto: HealthProvider 475 líneas, api.ts 780) en vez del cambio real (53/40 con -w). .gitattributes solo fija eol=lf para gradlew y *.sh; las herramientas que normalizan (prettier -w) rompen la convención del repo. Además, el edit tool preserva CRLF, por lo que un sed 's/$/\r/' posterior genera CR doble (\r\r\n).

## Decision

Los archivos .ts/.tsx editados se dejan en CRLF (convención de HEAD) y NO se les corre prettier -w. Para normalizar a exactamente un \r por línea usar: sed -i 's/\r*$/\r/' <archivos>. Verificar antes de commitear con git diff -w --numstat (los números reales). Advertencia para futuras sesiones: reintentar un commit con line endings mezclados contamina el diff.

## Alternative Rejected



## Reason


