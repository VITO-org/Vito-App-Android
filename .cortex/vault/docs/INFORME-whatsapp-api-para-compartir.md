# Informe: WhatsApp Business API para VITO — SCRUM-96 / HU-52

**Fecha:** 14 de septiembre de 2026
**Autora:** Flor Galarza (investigación + testing)
**Estado:** Sandbox funcional, envío exitoso verificado. Pendiente: webhook, token permanente, plantillas, número real.
**Para:** Compañero del equipo que continúe la implementación.

---

## 1. Resumen ejecutivo

Se configuró la **WhatsApp Cloud API** de Meta para el proyecto VITO y se realizó con éxito el primer envío de mensajes desde el número de prueba (+1 555). Este informe documenta todo lo investigado, configurado y verificado para que un compañero pueda retomar la implementación sin preguntar nada.

**Estado actual:**
- ✅ App "Vito" creada en developers.facebook.com (modo desarrollador)
- ✅ Portafolio comercial creado en business.facebook.com
- ✅ Número de prueba +1 555 194-6577 activo
- ✅ Destinatario verificado (número personal de Flor)
- ✅ Envío con template `hello_world` exitoso (status: delivered)
- ✅ Permisos: `whatsapp_business_messaging` + `whatsapp_business_management`
- ⏳ Token: solo temporal (24h), falta generar permanente
- ❌ Webhook: no configurado (sandbox no soporta webhooks sin publicar app)
- ❌ Número real: no registrado aún
- ❌ Plantillas propias: no creadas

---

## 2. Datos de la configuración (CREDENCIALES — NO COMPARTIR)

> ⚠️ Estos datos son sensibles. No pegarlos en repositorios públicos, chats groupales ni archivos sin protección.

| Campo | Valor |
|---|---|
| **Cuenta Meta** | vitoproyecto@gmail.com |
| **Nombre de la app** | Vito |
| **Portafolio comercial** | Sí (business.facebook.com) |
| **Modo** | Desarrollador (app no publicada) |
| **Número de prueba** | +1 (555) 194-6577 |
| **Phone Number ID** | `1266562673215284` |
| **WhatsApp Business Account ID** | `1373330438118869` |
| **Token usado** | Temporal (expira 24h) — generar en WhatsApp Manager |
| **Permisos** | `whatsapp_business_messaging`, `whatsapp_business_management` |
| **Destinatarios verificados** | 1 (número personal de Flor) |

---

## 3. Arquitectura de la WhatsApp Cloud API

### 3.1 Qué es
La **WhatsApp Cloud API** es la API oficial de Meta para enviar mensajes de WhatsApp desde un servidor. Reemplaza la API "On-Premises" (descontinuada). Está hosteada en los servidores de Meta — no hay que instalar nada.

### 3.2 Componentes necesarios

| Componente | Qué es | En nuestro caso |
|---|---|---|
| **Facebook Developer App** | Aplicación que agrupa permisos y tokens | App "Vito" en developers.facebook.com |
| **WhatsApp Business Account (WABA)** | Cuenta registrada ante Meta | ID: `1373330438118869` |
| **Phone Number** | Número registrado en la WABA | +1 555 194-6577 (prueba) |
| **Phone Number ID** | Identificador del número en la API | `1266562673215284` |
| **System User Token** | Token de larga duración (producción) | ❌ No creado aún — solo temporal |
| **WhatsApp Business Manager** | Panel de administración | business.facebook.com |

### 3.3 Flujo básico de envío

```
POST https://graph.facebook.com/v21.0/{phone_number_id}/messages
Header: Authorization: Bearer {access_token}
Header: Content-Type: application/json

Body:
{
  "messaging_product": "whatsapp",
  "to": "{destinatario}",
  "type": "template",
  "template": {
    "name": "hello_world",
    "language": { "code": "es_AR" }
  }
}
```

### 3.4 La ventana de 24 horas (Customer Service Window) — explicación detallada

Este es el concepto **MÁS IMPORTANTE** de la API.

#### ¿Qué es?

Cuando un **contacto/usuario te escribe** a tu negocio por WhatsApp, se abre una **ventana de 24 horas** durante la cual podés responderle sin necesidad de plantillas aprobadas y sin costo.

#### Reglas

| ¿Quién inicia? | ¿Qué podés mandar? | ¿Cobra? |
|---|---|---|
| **El contacto** te escribe → ventana abierta | Texto libre, imágenes, documentos, plantillas Utility | ❌ Gratis (Utility gratis desde julio 2025) |
| **El contacto** te escribe → ventana abierta | Plantillas Marketing o Authentication | ✅ Sí |
| **El negocio** inicia (fuera de ventana) | Solo plantillas aprobadas por Meta | ✅ Sí |

#### Ejemplo concreto para VITO

```
10:00 - Alerta de SpO2 baja → VITO manda WhatsApp al contacto
        (usa plantilla vito_alerta_salud, cobra ~$0.03)

10:05 - Contacto recibe y responde: "Gracias, ya lo llamo"
        → Se abre ventana de 24h

10:15 - VITO manda follow-up: "El paciente está estable ahora"
        (texto libre, GRATIS, sin plantilla)

11:00 - VITO manda otro update: "Se midió de nuevo, SpO2 92%"
        (texto libre, GRATIS)

Día siguiente 10:00 - Ventana cerró (pasaron 24h)
        → Si VITO quiere mandar algo, NECESITA plantilla de nuevo
```

#### ¿Por qué importa para VITO?

- Las **notificaciones automáticas** (alertas de salud) salen desde el negocio → **siempre necesitan plantilla** → **siempre se cobran**.
- Las **respuestas del negocio** a preguntas del contacto → **texto libre gratis** durante 24h.
- Si el contacto responde "OK" o "Recibido" a nuestra alerta, eso **no abre ventana** para mandar texto libre al contacto (porque la respuesta es del contacto, no del negocio — la ventana se abre cuando el contacto INICIA, no cuando responde).
- En la práctica, para nuestro caso el impacto es bajo: las alertas salen del sistema, no de una conversación.

#### Tabla resumen

```
CONTACTO INICIA → Ventana 24h → Texto libre gratis
NEGOCIO INICIA  → Sin ventana → Necesita plantilla → Cobra

¿Quién habla primero?
├── Contacto → Ventana abierta → Respuesta gratis
└── Negocio  → Sin ventana   → Plantilla obligatoria + cobro
```

### 3.5 Ventana de oportunidad de 72 horas
Cuando un usuario llega desde un **anuncio de Facebook/Instagram** (Ads that click to WhatsApp), todos los mensajes son **gratis** durante 72 horas. No aplica a nuestro caso.

---

## 4. Categorías de mensajes y plantillas

### 4.1 Categorías

| Categoría | Uso | Cobro en Argentina |
|---|---|---|
| **Utility** | Alertas de salud, actualizaciones, recordatorios | ~$0.0289/msg |
| **Marketing** | Promociones, newsletters | ~$0.0618/msg |
| **Authentication** | OTP, códigos de verificación | ~$0.0289/msg |
| **Service** | Respuesta del negocio dentro de ventana 24h | Gratis |

**Para VITO:** nuestras alertas van como **Utility** (más barata y relevante).

### 4.2 Proceso de aprobación de plantillas

1. Crear en WhatsApp Manager → Message Templates → Create Template.
2. Definir: nombre, idioma (`es_AR`), categoría (`utility`), cuerpo con variables `{{1}}`, `{{2}}`, etc.
3. Enviar a revisión de Meta.
4. Estados: **Pending** → **Approved** / **Rejected** / **Paused** / **Disabled**.
5. Aprobación típica: minutos a 24 horas.
6. Una vez aprobada, se usa por nombre en el body del request.

### 4.3 Plantilla propuesta para VITO

```
Nombre: vito_alerta_salud
Categoría: Utility
Idioma: es_AR

Cuerpo:
Hola {{1}}, se detectó una alerta de salud para {{2}}.
Tipo: {{3}}
Detalle: {{4}}
Fecha: {{5}}
Si tenés dudas, consultá al profesional de salud.

Variables:
  {{1}} = nombre del contacto de confianza
  {{2}} = nombre del paciente
  {{3}} = tipo de evento (SpO2 baja, FC alta, etc.)
  {{4}} = descripción no técnica
  {{5}} = timestamp
```

### 4.4 Límites de plantillas
- Portafolio sin verificar: hasta **250 plantillas** por WABA.
- Portafolio verificado: hasta **6,000 plantillas** por WABA.

### 4.5 Errores comunes de aprobación
- Placeholder al inicio o fin del mensaje → rechazo automático.
- Contenido demasiado genérico (ej. "Hola {{1}}, gracias") → rechazo.
- Variables no secuenciales (ej. `{{1}}, {{3}}` sin `{{2}}`) → rechazo.
- Newlines o más de 4 espacios consecutivos → rechazo.
- Link wa.me en el template → rechazo.
- Contenido que parezca gaming/gambling → rechazo.

---

## 5. Test realizado — Resultados verificados

### 5.1 Configuración del test
- Número emisor: +1 555 194-6577 (sandbox)
- Número receptor: +54 9 362 465-3178 (número personal de Flor, verificado)
- Template: `hello_world` (pre-aprobado por Meta)
- Token: temporal de 24h
- Método: POST vía curl/Postman a `https://graph.facebook.com/v21.0/1266562673215284/messages`

### 5.2 Respuesta de la API (payload completo)

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "1373330438118869",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15551946577",
              "phone_number_id": "1266562673215284"
            },
            "contacts": [
              {
                "wa_id": "5493624653178",
                "user_id": "AR.2017361043000664"
              }
            ],
            "statuses": [
              {
                "id": "wamid.HBgNNTQ5MzYyNDY1MzE3OBUCABEYEjYxN0EzMDM5ODM1MTJCNjk0NQA=",
                "status": "delivered",
                "timestamp": "1789429749",
                "recipient_id": "5493624653178",
                "conversation": {
                  "id": "4788e56a271439e9266af920b326f7e6",
                  "origin": { "type": "utility" }
                },
                "pricing": {
                  "billable": true,
                  "pricing_model": "PMP",
                  "category": "utility",
                  "type": "regular"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

### 5.3 Datos clave extraídos del test

| Campo | Valor | Significado |
|---|---|---|
| `status` | `delivered` | El mensaje llegó al dispositivo |
| `conversation.origin.type` | `utility` | Categoría correcta (la más barata) |
| `pricing.billable` | `true` | **Sí se cobra** en sandbox (aunque sea test) |
| `pricing.pricing_model` | `PMP` | Per-Message Pricing (modelo vigente) |
| `pricing.category` | `utility` | Cobro como utility |
| `timestamp` | `1789429749` | Unix timestamp del delivery |
| `recipient_id` | `5493624653178` | Teléfono del destinatario sin '+' |

### 5.4 Verificación en el dispositivo
- El mensaje llegó **al instante** en WhatsApp del destinatario.
- Se veía como un mensaje normal del número de prueba +1 555.

### 5.5 Hallazgo importante
> ⚠️ El sandbox **SÍ cobra** por mensajes (pricing.billable = true). Aunque es número de prueba, Meta registra el cobro. En sandbox no hay factura real, pero es bueno saber que en producción cada mensaje tiene costo.

---

## 6. Webhook — Estado actual y opciones

### 6.1 Situación actual
La pantalla de configuración de webhooks en developers.facebook.com muestra:
- **URL de devolución de llamada** (campo vacío)
- **Token de verificación** (campo vacío — es un token que vos creás)
- Botón **"Verificar y guardar"** (deshabilitado hasta que pongas una URL)

**Problema:** el cartel amarillo dice:
> *"Las apps solo podrán recibir webhooks de prueba enviados desde el panel de la app mientras está sin publicar. No se entregarán datos de producción, incluidos los de los administradores, desarrolladores o evaluadores de la app, a menos que esta se haya publicado."*

**Traducción:** en sandbox con app sin publicar, **los webhooks no llegan**. Solo sirven para pruebas desde el propio panel de Meta.

### 6.2 Opciones para resolver el webhook

| Opción | Para qué sirve | Pros | Contras |
|---|---|---|---|
| **Publicar la app** | Habilitar webhooks reales | Funciona con el +1 555 | Expone la app (aunque sea sandbox), proceso de review |
| **Supabase Edge Function** | URL pública para webhook | Ya la tenés, gratis, integrada | Necesitás app publicada para que funcione |
| **ngrok** | URL temporal para desarrollo | Rápido, gratis | URL cambia cada reinicio |
| **No configurar aún** | Desarrollar el envío primero | No bloquea el avance | No hay confirmación de entrega/lectura (CA-03) |

**Recomendación:** por ahora, desarrollar el **envío** (Edge `enviar-whatsapp`) sin depender del webhook. El webhook de confirmación (CA-03) se configura cuando la app esté publicada o se tenga número real.

---

## 7. Costos

### 7.1 Tarifas para Argentina (USD por mensaje, desde julio 2025)

| Categoría | Volumen bajo (0–100K) | Volumen medio (100K–1M) | Volumen alto (1M+) |
|---|---|---|---|
| **Utility** (nuestras alertas) | $0.0289 | ~$0.0275 | ~$0.0260 |
| **Authentication** | $0.0289 | ~$0.0275 | ~$0.0260 |
| **Marketing** | $0.0618 | ~$0.0587 | ~$0.0556 |
| **Service** | **Gratis** | **Gratis** | **Gratis** |

### 7.2 Estimación para VITO

Escenario piloto: **2 pacientes × 2 alertas/mes × 2 contactos = 8 mensajes/mes**
- 8 × $0.0289 = **~$0.23 USD/mes** (prácticamente gratis)

Escenario mediano: **100 pacientes × 3 alertas/mes × 2 contactos = 600 mensajes/mes**
- 600 × $0.0289 = **~$17 USD/mes**

Escenario grande: **1,000 pacientes × 2 alertas/mes × 2 contactos = 4,000 mensajes/mes**
- 4,000 × $0.0289 = **~$116 USD/mes**

### 7.3 Cambios de precio — Octubre 2026
A partir del 1 de octubre de 2026, Meta empezará a cobrar por los **service messages** (hoy gratis) dentro de la ventana de 24h. Las utility templates dentro de la ventana también se cobrarán. Publicarán tarifas por país antes del 1 de septiembre. **No afecta nuestro caso** (salimos del negocio, no del usuario).

---

## 8. Sandbox / Modo desarrollador

### 8.1 Número de prueba +1 555

Al crear la app y agregar WhatsApp, Meta da automáticamente un número con prefijo **+1 555**:

- **Gratis**, sin cobro real (aunque registra pricing).
- **5 destinatarios** registrados como máximo (verificación por código).
- **Sin límites de envío** en volumen, pero solo a esos 5 números.
- Sirve para: probar envíos, probar plantillas, validar integración.
- **No sirve para:** producción, envío a clientes reales, webhooks sin publicar.

### 8.2 Lo que funciona y lo que no en sandbox

| Funcionalidad | ¿Funciona? |
|---|---|
| Enviar template message | ✅ Sí |
| Recibir status de entrega (delivered) | ✅ Sí (en la respuesta de la API) |
| Recibir webhooks | ❌ No (app sin publicar) |
| Enviar a números no verificados | ❌ No |
| Crear plantillas propias | ✅ Sí (pero solo se usan si la app está publicada) |
| Generar token permanente | ✅ Sí (via System User) |

---

## 9. Producción — Checklist

Para pasar del sandbox al número real:

1. **Registrar número propio** en la WABA (verificación por SMS/llamada).
2. **Display Name aprobado** (el nombre que ven los destinatarios).
3. **Plantillas creadas y aprobadas** por Meta (mínimo `vito_alerta_salud`).
4. **Token permanente** via System User (Business Settings → System Users).
5. **Secrets configurados** en Supabase:
```bash
supabase secrets set WHATSAPP_TOKEN="<token_permanente>" \
                     WHATSAPP_PHONE_NUMBER_ID="<id>" \
                     WHATSAPP_PHONE_NUMBER="<numero_real>"
```
6. **Edge Function `enviar-whatsapp`** desplegada.
7. **Webhook configurado** (URL pública + token de verificación).
8. **Rate-limit implementado** (máx 3/hora por contacto, bypass en críticas).
9. **Revisión legal** del flujo de consentimiento y opt-out.

### Límites de envío (Messaging Limits)

| Nivel | Límite | Requisito |
|---|---|---|
| **Inicial** | 250 contactos nuevos/24h | Portafolio nuevo |
| **Tier 1** | 1,000 contactos/24h | Verificar negocio |
| **Tier 2** | 10,000 contactos/24h | Auto-escalado |
| **Tier 3** | 100,000 contactos/24h | Auto-escalado |
| **Tier 4** | Ilimitado | Reputación perfecta |

Desde octubre 2025, los límites son por **portafolio** (no por número).

---

## 10. Pro y Contras

### ✅ Pros

| Ventaja | Detalle |
|---|---|
| **Canal con mayor alcance** | WhatsApp tiene ~90% penetración en Argentina |
| **Mensajes enriquecidos** | Texto, imágenes, botones, listas, documentos |
| **Confirmación de entrega** | Status: sent → delivered → read |
| **Costo bajo** | ~$0.03/msg Utility vs ~$0.08+ SMS internacional |
| **API oficial y estable** | Meta la mantiene, documentación extensa |
| **Sandbox gratis** | 5 destinatarios, sin costo para desarrollo |
| **hello_world funciona al instante** | Sin aprobación, sin setup |
| **Volume tiers** | Descuentos progresivos con volumen |
| **Service messages gratis** | Respuestas dentro de ventana 24h |

### ❌ Contras

| Desventaja | Detalle |
|---|---|
| **Requiere aprobación de plantillas** | Cada plantilla pasa por revisión de Meta (min–24h) |
| **Ventana de 24h** | Solo texto libre si el usuario te escribió primero |
| **Cobro por mensaje** | ~$0.03/msg. A escala puede ser significativo |
| **Cambios de precio frecuentes** | Oct 2026: nuevos cobros. Meta cambia cuando quiere |
| **Número propio obligatorio para producción** | El +1 555 es solo sandbox |
| **Webhooks no funcionan en sandbox** | App debe estar publicada |
| **Riesgo de baneo** | Blocks/spam reports → restricciones |
| **Dependencia total de Meta** | Políticas, precios, disponibilidad — sin control |
| **No funciona sin WhatsApp** | Necesitás fallback SMS/email (CA-04) |
| **2FA obligatorio** | Sin 2FA no generás tokens permanentes |

---

## 11. Alternativas evaluadas (descartadas)

### 11.1 WhatsApp desde el teléfono (wa.me)
- Gratis, sin API. Ya tenemos `buildWhatsAppLink()`.
- No es automático (1 tap), sin confirmación server-side.
- ✅ Se usa como **stub local** para desarrollo.

### 11.2 SMS desde el dispositivo (SmsManager nativo)
- Automático, sale del chip, sin cuentas extra.
- Requiere permiso SEND_SMS, sin confirmación de entrega.
- ✅ Se mantiene como **fallback CA-04**.

### 11.3 Bot QR no oficial (Evolution API, Baileys)
- Automático, desde el número del paciente.
- **Viola ToS de WhatsApp** — riesgo de baneo (grave para app de salud).
- ❌ Descartado para producción.

### 11.4 Twilio Sandbox
- Setup rápido, SDK multi-lenguaje.
- Markup sobre Meta, requiere cuenta Twilio.
- ❌ Descartado por restricción "sin cuentas extra".

### 11.5 BSPs (360dialog, Wati, etc.)
- Dashboard visual, soporte.
- Markup mensual ($39–$89/mes) + markup por mensaje.
- ❌ Cloud API directo es más barato para nuestro volumen.

---

## 12. Integración con la arquitectura de VITO

### 12.1 Punto de encolado: Edge Function `evaluar-evento`

La Edge Function existente ya hace:
1. Evaluar umbrales → generar alerta.
2. INSERT en tabla `alerta`.
3. Fan-out push vía Expo a dispositivos del paciente.
4. INSERT en `notificacion_entrega`.

**Extensión para WhatsApp** (después del paso 3):
5. SELECT contactos donde `canal='whatsapp'` AND `tipos_evento` CONTIENE el tipo AND `estado_opt_in='confirmado'`.
6. Verificar rate-limit (función SQL).
7. INSERT en `notificacion_whatsapp` (cola) con estado `pendiente`.
8. Llamar a `enviar-whatsapp` con la cola.

### 12.2 Tabla `notificacion_whatsapp`

```sql
CREATE TABLE notificacion_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_alerta UUID REFERENCES alerta(id),
  id_contacto UUID REFERENCES contacto_confianza(id),
  id_usuario UUID REFERENCES auth.users(id),
  telefono TEXT NOT NULL,
  plantilla_nombre TEXT NOT NULL,
  plantilla_variables JSONB NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','enviada','fallida','fallback_sms','fallback_email')),
  intentos INT DEFAULT 0,
  respuesta TEXT,
  enviado_en TIMESTAMPTZ,
  respuesta_en TIMESTAMPTZ,
  error_mensaje TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_whatsapp_contacto_hora
  ON notificacion_whatsapp (id_contacto, enviado_en)
  WHERE estado = 'enviada';
```

### 12.3 Función SQL de rate-limit

```sql
CREATE OR REPLACE FUNCTION puede_notificar_whatsapp(p_id_contacto UUID)
RETURNS BOOLEAN AS $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM notificacion_whatsapp
  WHERE id_contacto = p_id_contacto
    AND estado = 'enviada'
    AND enviado_en > NOW() - INTERVAL '1 hour';
  RETURN v_count < 3;
END;
$$ LANGUAGE plpgsql;
```

### 12.4 Edge Function `enviar-whatsapp` (esqueleto)

```typescript
// supabase/functions/enviar-whatsapp/index.ts
// Recibe: { notificacion_id, telefono, plantilla_nombre, plantilla_variables }
// Secrets: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID
// POST a https://graph.facebook.com/v21.0/{phone_number_id}/messages
// Actualiza estado en notificacion_whatsapp
// Si error 131030 (sin WhatsApp) → fallback SMS/email
```

---

## 13. Errores comunes de la API

| Error | Causa | Solución |
|---|---|---|
| `131030` | Destinatario no tiene WhatsApp | Fallback SMS/email |
| `131047` | Reenvío de mensaje fallido | Esperar o nueva plantilla |
| `131051` | Destinatario no verificado (sandbox) | Verificar en WhatsApp Manager |
| `132000` | Template no aprobado | Esperar aprobación o revisar |
| `132001` | Template no existe | Verificar nombre exacto |
| `132005` | Variables incorrectas | Revisar parámetros del body |
| `133004` | Servidor no disponible | Retry con backoff exponencial |
| `368` | Acción restringida (spam/baneo) | Revisar calidad, reducir volumen |

---

## 14. Plan de acción inmediato

### Lo que ya está hecho ✅
1. App "Vito" configurada en developers.facebook.com
2. Portafolio comercial en business.facebook.com
3. Sandbox con número +1 555 activo
4. Primer envío exitoso verificado
5. Permisos configurados

### Lo que falta (en orden de prioridad)

| # | Tarea | Dependencia | Quién |
|---|---|---|---|
| 1 | Generar **token permanente** via System User | business.facebook.com accesible | Flor/Nico |
| 2 | Crear plantilla `vito_alerta_salud` en WhatsApp Manager | Token permanente | Flor/Nico |
| 3 | Esperar aprobación de Meta | Tiempo (min–24h) | Meta |
| 4 | Registrar **número real** en la WABA | Documentación del proyecto | Flor/Nico |
| 5 | Configurar **secrets en Supabase** | Token + number ID | Flor |
| 6 | Desarrollar **Edge Function `enviar-whatsapp`** | Secrets configurados | Agente (SDDwork) |
| 7 | Crear **tabla `notificacion_whatsapp`** + rate-limit | Migración SQL | Agente (SDDwork) |
| 8 | Extender **`evaluar-evento`** con encolado WhatsApp | Tabla + Edge | Agente (SDDwork) |
| 9 | Configurar **webhook** (cuando app esté publicada o con número real) | URL pública | Flor |
| 10 | Tests end-to-end | Todo lo anterior | Flor + Agente |

---

## 15. Recursos de referencia

- **Cloud API Docs:** https://developers.facebook.com/docs/whatsapp/cloud-api
- **Pricing:** https://business.whatsapp.com/products/platform-pricing
- **Rate cards Argentina:** https://developers.facebook.com/docs/whatsapp/pricing#rate-cards
- **Template guidelines:** https://developers.facebook.com/docs/whatsapp/message-templates/guidelines
- **Webhooks:** https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
- **Get Started:** https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
- **Sandbox testing:** https://developers.facebook.com/docs/whatsapp/cloud-api/testing
- **Messaging limits:** https://developers.facebook.com/docs/whatsapp/messaging-limits
- **Quality rating:** https://developers.facebook.com/docs/whatsapp/business-management/phone-number-quality-rating
- **Templates approval:** https://developers.facebook.com/docs/whatsapp/message-templates/managing
