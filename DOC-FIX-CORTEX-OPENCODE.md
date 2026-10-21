# Reporte Técnico: Compatibilidad de Cortex con OpenCode (Free Tier)

**Fecha:** 22 de septiembre de 2026  
**Para:** Desarrollador / Mantenedores de Cortex (`cortex-memory`)  
**Proyecto afectado:** Generador de integración para OpenCode (`cortex sync-ide --ide opencode` / plantillas de agentes)  
**Severidad:** Media / Bloqueante para usuarios de OpenCode en tier gratuito.

---

## 1. Resumen del Problema

Al utilizar los perfiles de agentes generados por Cortex en **OpenCode**:
* `cortex-SDDwork` funciona correctamente.
* `cortex-sync` y `cortex-documenter` fallan inmediatamente al iniciar la conversación con el siguiente error del proveedor:

```text
AI_APICallError: Error from provider (Console): OpenCode's free tier can only be used from within OpenCode
```

---

## 2. Análisis de Causa Raíz

### Comportamiento del Backend de OpenCode
OpenCode aplica una política estricta de protección de API en su backend (*Console*) para sus modelos gratuitos (`*-free`, como `mimo-v2.5-free`, `nemotron-3.5-lightning-free`, etc.), buscando evitar que su infraestructura gratuita sea consumida por scripts, proxies (como LiteLLM) o clientes de terceros no autorizados.

Para validar que la petición proviene de su cliente interactivo legítimo, el backend inspecciona el esquema de herramientas (*tools*) enviadas en la solicitud. Si la herramienta de terminal (`bash` / `shell`) no está presente en la solicitud, el backend asume que se trata de un cliente headless o una integración externa, y rechaza la conexión con `403 Forbidden`.

Este problema está documentado como un issue abierto en el repositorio oficial de OpenCode:
> **`anomalyco/opencode` - Issue #50627:**  
> *"policy: deny shell \* on custom agent breaks free tier with 'can only be used from within OpenCode'"*

### Discrepancia en la Configuración Generada por Cortex
El archivo de configuración de agentes generado por Cortex (`~/.config/opencode/opencode.json` mediante `cortex sync-ide --ide opencode`) definía los permisos de la siguiente forma:

```json
{
  "agent": {
    "cortex-sync": {
      "mode": "primary",
      "permission": {
        "read": "allow",
        "write": "deny",
        "edit": "deny",
        "bash": "deny"   // <--- CAUSA DEL ERROR
      }
    },
    "cortex-SDDwork": {
      "mode": "primary",
      "permission": {
        "read": "allow",
        "write": "allow",
        "edit": "allow",
        "bash": "ask",    // <--- Incluye bash en el schema -> Pasa la validación
        "task": "allow"
      }
    },
    "cortex-documenter": {
      "mode": "primary",
      "permission": {
        "read": "allow",
        "write": "allow",
        "edit": "allow",
        "bash": "deny",   // <--- CAUSA DEL ERROR
        "task": "deny"
      }
    }
  }
}
```

* **`cortex-SDDwork`:** Al tener `"bash": "ask"`, OpenCode registra y envía la definición de la herramienta `bash` al proveedor. El backend valida la solicitud y responde con normalidad.
* **`cortex-sync` y `cortex-documenter`:** Al tener `"bash": "deny"`, OpenCode suprime la herramienta `bash` del payload. El backend rechaza la solicitud acusando uso no autorizado del *free tier*.

---

## 3. Solución Implementada (Workaround Validado)

Se modificó `~/.config/opencode/opencode.json` reemplazando los permisos `"bash": "deny"` por `"bash": "ask"`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "agent": {
    "cortex-sync": {
      "mode": "primary",
      "description": "PRE-FLIGHT: Context gathering and spec preparation.",
      "prompt": "{file:C:\\Users\\Flor Gonzalez\\.config\\opencode\\skills\\cortex-sync.md}",
      "permission": {
        "read": "allow",
        "write": "deny",
        "edit": "deny",
        "bash": "ask"
      }
    },
    "cortex-SDDwork": {
      "mode": "primary",
      "description": "ORCHESTRATOR: Fast Track direct edits or Deep Track delegation.",
      "prompt": "{file:C:\\Users\\Flor Gonzalez\\.config\\opencode\\skills\\cortex-SDDwork.md}",
      "permission": {
        "read": "allow",
        "write": "allow",
        "edit": "allow",
        "bash": "ask",
        "task": "allow"
      }
    },
    "cortex-documenter": {
      "mode": "primary",
      "description": "CLOSING ANCHOR: Editorial documentation + Session close (Phase 09.A+).",
      "prompt": "{file:C:\\Users\\Flor Gonzalez\\.config\\opencode\\skills\\cortex-documenter.md}",
      "permission": {
        "read": "allow",
        "write": "allow",
        "edit": "allow",
        "bash": "ask",
        "task": "allow"
      }
    }
  },
  "mcp": {
    "cortex": {
      "type": "local",
      "command": [
        "python3",
        "C:\\Vito-App-Android\\.cortex-probe\\proxy.py"
      ],
      "enabled": true,
      "environment": {
        "PYTHONWARNINGS": "ignore"
      }
    }
  }
}
```

### Consideración de Seguridad
El cambio a `"bash": "ask"` no compromete la gobernanza de Cortex:
1. **Regla de prompt estricta:** Los prompts de `cortex-sync.md` y `cortex-documenter.md` prohíben explícitamente la ejecución de comandos (`NO PUEDES EJECUTAR COMANDOS: bash: false`), por lo que el agente no intenta invocarlos en su flujo normal.
2. **Confirmación interactiva:** Si por alguna razón el modelo intentara invocar `bash`, OpenCode intercepta la llamada y requiere confirmación manual explícita (`ask`) del desarrollador antes de ejecutar cualquier comando.

---

## 4. Recomendaciones para el Código Fuente de Cortex

En el repositorio de Cortex (`cortex-memory`), específicamente en el generador de configuración para IDEs (`cortex sync-ide --ide opencode` o los templates de agentes de OpenCode):

1. **Ajustar la plantilla por defecto de OpenCode:**
   - Cambiar los permisos de `bash` en `cortex-sync` y `cortex-documenter` de `"deny"` a `"ask"`.
   - Ajustar `task` a `"allow"` para evitar falsos positivos con llamadas a subagentes o herramientas auxiliares.
2. **Evitar sobrescritura no deseada:**
   - Si un usuario ejecuta `cortex sync-ide --ide opencode --force`, el generador volvería a escribir `"bash": "deny"` si no se actualiza la plantilla base en el código de Cortex.
3. **Documentación:**
   - Agregar una nota en la documentación de Cortex indicando que OpenCode requiere al menos el nivel `"ask"` en herramientas interactivas al operar con modelos de la capa gratuita (*Free Tier*).
