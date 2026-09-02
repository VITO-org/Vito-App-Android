# VITO Admin Panel - Testing de Alertas

Panel web de administración para generar datos de prueba y verificar que el sistema de alertas de VITO Health Connect funciona correctamente.

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
├── index.html      # Página principal
├── styles.css      # Estilos
├── app.js          # Lógica de la aplicación
├── config.js       # Configuración de Supabase
└── README.md       # Este archivo
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
