# VITO Admin Panel - Testing de Alertas

Panel web de administración para generar datos de prueba y verificar que el sistema de alertas de VITO Health Connect funciona correctamente.

## Configuración Inicial (Supabase)

Antes de usar el panel, ejecutá el script `supabase-setup.sql` en el SQL Editor de Supabase. Esto habilita las permisos necesarios para que el panel pueda insertar datos y leer alertas.

```sql
-- 1. Deshabilitar RLS en datos_reloj (para permitir inserciones anónimas)
ALTER TABLE datos_reloj DISABLE ROW LEVEL SECURITY;

-- 2. Crear policy de lectura para anon en alerta
CREATE POLICY "anon_select_alertas"
  ON alerta
  FOR SELECT
  TO anon
  USING (true);
```

> ⚠️ Estos cambios son solo para testing. En producción, RLS debe estar habilitado.

## Uso Rápido

1. Abrí `index.html` en tu navegador (Chrome, Firefox o Safari)
2. Verificá que el indicador de conexión muestre "Conectado a Supabase"
3. Ingresá el UUID del usuario de prueba
4. Seleccioná el tipo de signo vital a simular
5. Ingresá un valor fuera de rango para generar la alerta
6. Tocá "Generar Alerta"
7. Abrí la app VITO en tu teléfono y verificá que la alerta aparezca en AlertasScreen

## Valores de Referencia

### SpO₂ (Saturación de oxígeno)
| Rango | Significado |
|-------|-------------|
| 95-100% | Normal |
| 90-94% | Leve |
| 85-89% | Advertencia |
| <85% | Crítico |

### Frecuencia Cardíaca
| Rango | Significado |
|-------|-------------|
| 50-100 bpm | Normal |
| 100-120 bpm | Taquicardia leve |
| >120 bpm | Taquicardia crítica |
| 40-49 bpm | Bradicardia leve |
| <40 bpm | Bradicardia crítica |

### Presión Arterial
| Sistólica | Diastólica | Significado |
|-----------|------------|-------------|
| 90-140 | 60-90 | Normal |
| 140-160 | 90-100 | Hipertensión leve |
| >160 | >100 | Hipertensión crítica |
| 80-90 | 50-60 | Hipotensión leve |
| <80 | <50 | Hipotensión crítica |

## Simulador Vittito (HU-34 Fase A)

La sección **Simulador Vittito** es un espejo JS del motor `src/services/suggestions/rulesEngine.ts` con los mismos umbrales (FC >100/<60, PA ≥130/85, SpO₂ <95, temp >37.5/<36.0, pasos <5000, sueño <360 min) y el mismo orden (Alta > Media > Baja, fuera de rango primero).

> ⚠️ Importante: en Fase A Vittito lee el `HealthSummary` de **Health Connect** (dispositivo), NO de `datos_reloj`. Por eso el panel **no puede provocarla** insertando datos como con las alertas: el simulador solo muestra qué sugerencias generaría con esos valores. En Fase B, cuando Vittito lea de Supabase, se podrá disparar vía `datos_reloj` (ahí sí sumaremos temperatura/pasos/sueño al formulario de alertas).

Presets incluidos: **Todo normal** (lista vacía → “Todo en orden, seguí así”) y **Caso crítico** (FC 112 + SpO₂ 93 + pasos 1200 + sueño 300 → 4 sugerencias ordenadas).

Si cambian los umbrales en `rulesEngine.ts`, actualizar `VIT_UMBRALES` en `app.js`.

## Funcionalidades

- **Generar alertas de prueba**: Inserta datos en `datos_reloj` que la app lee al sincronizar
- **Ver alertas existentes**: Lista las alertas generadas en la tabla `alerta`
- **Filtrar por tipo**: Hipoxia, taquicardia, bradicardia, hipertensión, hipotensión
- **Filtrar por severidad**: Crítica, advertencia, INFO
- **Filtrar por usuario**: Por UUID del usuario
- **Estadísticas**: Total, críticas, advertencia, no leídas

## Cómo Funciona

```
Panel web → POST a datos_reloj (Supabase)
    ↓
App VITO hace sync → lee datos_reloj
    ↓
AlertEngine evalúa → detecta valor fuera de rango
    ↓
Genera alerta en tabla alerta
    ↓
Muestra notificación local en el dispositivo
    ↓
Aparece en AlertasScreen
```

## Archivos

```
panel-admin/
├── index.html           # Página principal
├── styles.css           # Estilos
├── app.js               # Lógica de la aplicación
├── config.js            # Configuración de Supabase
├── supabase-setup.sql   # Script de configuración en Supabase
└── README.md            # Este archivo
```

## Requisitos

- Navegador web moderno (Chrome, Firefox, Safari)
- Conexión a internet
- UUID de un usuario existente en Supabase

## Notas Importantes

- ⚠️ Este panel es solo para desarrollo y testing
- ⚠️ No usar en producción
- ⚠️ Las credenciales de Supabase están expuestas (es normal para un panel de testing local)
- ⚠️ Las alertas generadas se guardan permanentemente en Supabase
- ⚠️ Para borrar alertas de prueba, usar el SQL Editor de Supabase

## Solución de Problemas

### "Error de conexión"
- Verificá que tengas internet
- Verificá que las credenciales en `config.js` sean correctas
- Abrí la consola del navegador (F12) para ver errores detallados

### "Error al insertar datos"
- Verificá que el UUID del usuario sea válido
- Verificá que la tabla `datos_reloj` exista en Supabase
- Revisá las RLS policies en Supabase

### La app no genera la alerta
- Verificá que la app tenga permisos de Health Connect
- Verificá que la sincronización automática esté activa
- Forzá un sync manual desde la app
