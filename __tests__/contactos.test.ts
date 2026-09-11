/**
 * Tests del módulo puro de contactos de confianza (HU-16).
 *
 * Patrón del repo: lógica pura + deps inyectadas con jest.fn(). Acá no se
 * mockea el supabase client: validators y query builders viven en
 * `src/services/contactos.ts` (módulo puro sin imports de client.ts).
 *
 * Cubre el plan de QA del design doc 5.1:
 *  - validarContacto (nombre, email, teléfono, auto-prohibición, frecuencia)
 *  - Query builders (filtro id_usuario, doble filtro delete, update por id)
 *  - Catálogos FRECUENCIAS (4) y RELACIONES (3)
 */
import {
  validarContacto,
  normalizarTelefono,
  esEmailValido,
  esTelefonoValido,
  buildGetContactosQuery,
  buildDeleteContactoQuery,
  buildUpdateContactoQuery,
  buildWhatsAppLink,
  resolverReemplazoPrincipal,
  FRECUENCIAS,
  RELACIONES,
  CANALES,
  EVENTOS,
  CANAL_DEFAULT,
  EVENTOS_DEFAULT,
  ES_PRINCIPAL_DEFAULT,
} from '../src/services/contactos';
import type {ContactoForm} from '../src/services/contactos';

function formValido(): ContactoForm {
  return {
    nombre: 'Juan Pérez',
    relacion: 'familiar',
    telefono: '+54 11 5555-1234',
    email: 'juan@casa.com',
    frecuencia_notificacion: 'diaria',
    canal: 'app_interna',
    tipos_evento: ['fisiologico', 'medicacion'],
    es_principal: false,
  };
}

// ═══════════════════════════════════════════
// validarContacto: nombre
// ═══════════════════════════════════════════

describe('validarContacto — nombre', () => {
  test('nombre vacío → error', () => {
    expect(validarContacto({...formValido(), nombre: ''})).toBe('El nombre es obligatorio');
  });

  test('nombre solo espacios → error', () => {
    expect(validarContacto({...formValido(), nombre: '   '})).toBe('El nombre es obligatorio');
  });

  test('nombre de más de 120 caracteres → error', () => {
    expect(validarContacto({...formValido(), nombre: 'A'.repeat(121)})).toBe(
      'El nombre es obligatorio',
    );
  });
});

// ═══════════════════════════════════════════
// validarContacto: email
// ═══════════════════════════════════════════

describe('validarContacto — email', () => {
  test('emails inválidos → error', () => {
    for (const email of ['juan', 'juan@', 'a@b', 'a@b.c']) {
      expect(validarContacto({...formValido(), email})).toBe('El email no es válido');
    }
  });

  test('email vacío → error', () => {
    expect(validarContacto({...formValido(), email: ''})).toBe('El email no es válido');
  });

  test('emails válidos → null (resto correcto)', () => {
    expect(validarContacto({...formValido(), email: 'juan@casa.com'})).toBeNull();
    expect(validarContacto({...formValido(), email: 'j+tag@sub.dominio.com'})).toBeNull();
  });
});

// ═══════════════════════════════════════════
// validarContacto: teléfono
// ═══════════════════════════════════════════

describe('validarContacto — teléfono', () => {
  test('teléfonos inválidos → error', () => {
    for (const telefono of ['123', '+54911ab', '+54 11 5555-1234 extra']) {
      expect(validarContacto({...formValido(), telefono})).toBe(
        'El teléfono no es válido (formato E.164: +54 11 5555-1234)',
      );
    }
  });

  test('teléfonos válidos → null', () => {
    expect(validarContacto({...formValido(), telefono: '+5491122334455'})).toBeNull();
    expect(validarContacto({...formValido(), telefono: '15551234'})).toBeNull();
    // Con espacios/guiones: se normaliza antes de validar
    expect(validarContacto({...formValido(), telefono: '+54 11 5555-1234'})).toBeNull();
  });
});

// ═══════════════════════════════════════════
// validarContacto: auto-prohibición
// ═══════════════════════════════════════════

describe('validarContacto — auto-prohibición', () => {
  test('mismo email que authed.email con distinto case → error', () => {
    expect(validarContacto(formValido(), {email: 'JUAN@CASA.COM'})).toBe(
      'No podés agregarte a vos mismo como contacto',
    );
  });

  test('mismo teléfono normalizado que authed.telefono → error', () => {
    expect(
      validarContacto(
        {...formValido(), email: 'otro@mail.com'},
        {telefono: '+541155551234'},
      ),
    ).toBe('No podés agregarte a vos mismo como contacto');
  });

  test('datos distintos a authed → null', () => {
    expect(
      validarContacto(formValido(), {email: 'yo@mail.com', telefono: '+5491122223344'}),
    ).toBeNull();
  });
});

// ═══════════════════════════════════════════
// validarContacto: frecuencia
// ═══════════════════════════════════════════

describe('validarContacto — frecuencia', () => {
  test('frecuencia_notificacion fuera del enum → error', () => {
    expect(
      validarContacto({...formValido(), frecuencia_notificacion: 'cada_minuto' as never}),
    ).not.toBeNull();
  });
});

// ═══════════════════════════════════════════
// Helpers de normalización/validación
// ═══════════════════════════════════════════

describe('normalizarTelefono', () => {
  test('quita espacios, guiones y paréntesis; conserva el +', () => {
    expect(normalizarTelefono('+54 11 5555-1234')).toBe('+541155551234');
    expect(normalizarTelefono('(011) 5555-1234')).toBe('01155551234');
  });
});

describe('esEmailValido', () => {
  test('rechaza emails sin @ o sin dominio con TLD >= 2', () => {
    expect(esEmailValido('juan')).toBe(false);
    expect(esEmailValido('juan@')).toBe(false);
    expect(esEmailValido('a@b')).toBe(false);
    expect(esEmailValido('a@b.c')).toBe(false);
  });

  test('acepta emails bien formados', () => {
    expect(esEmailValido('juan@casa.com')).toBe(true);
    expect(esEmailValido('j+tag@sub.dominio.com')).toBe(true);
  });
});

describe('esTelefonoValido', () => {
  test('rechaza teléfonos cortos o con caracteres no numéricos', () => {
    expect(esTelefonoValido('123')).toBe(false);
    expect(esTelefonoValido('+54911ab')).toBe(false);
  });

  test('acepta E.164 simplificado sobre el teléfono normalizado', () => {
    expect(esTelefonoValido('+5491122334455')).toBe(true);
    expect(esTelefonoValido('15551234')).toBe(true);
    expect(esTelefonoValido('+54 11 5555-1234')).toBe(true);
  });
});

// ═══════════════════════════════════════════
// Query builders (unit test del filtro id_usuario)
// ═══════════════════════════════════════════

describe('buildGetContactosQuery', () => {
  test('filtra por id_usuario y ordena por nombre asc', () => {
    expect(buildGetContactosQuery('u1')).toBe(
      'select=*&id_usuario=eq.u1&order=nombre.asc',
    );
    expect(buildGetContactosQuery('u1')).toContain('id_usuario=eq.u1');
    expect(buildGetContactosQuery('u1')).toContain('order=nombre.asc');
  });
});

describe('buildDeleteContactoQuery', () => {
  test('doble filtro: id + id_usuario', () => {
    expect(buildDeleteContactoQuery('c1', 'u1')).toBe('id=eq.c1&id_usuario=eq.u1');
    expect(buildDeleteContactoQuery('c1', 'u1')).toContain('id=eq.c1');
    expect(buildDeleteContactoQuery('c1', 'u1')).toContain('id_usuario=eq.u1');
  });
});

describe('buildUpdateContactoQuery', () => {
  test('filtra solo por id', () => {
    expect(buildUpdateContactoQuery('c1')).toBe('id=eq.c1');
    expect(buildUpdateContactoQuery('c1')).toContain('id=eq.c1');
  });
});

// ═══════════════════════════════════════════
// Catálogos
// ═══════════════════════════════════════════

describe('FRECUENCIAS', () => {
  test('4 opciones con valor y label no vacíos', () => {
    expect(FRECUENCIAS).toHaveLength(4);
    for (const f of FRECUENCIAS) {
      expect(f.valor).toBeTruthy();
      expect(f.label).toBeTruthy();
    }
  });
});

describe('RELACIONES', () => {
  test('3 opciones con valor y label no vacíos', () => {
    expect(RELACIONES).toHaveLength(3);
    for (const r of RELACIONES) {
      expect(r.valor).toBeTruthy();
      expect(r.label).toBeTruthy();
    }
  });
});

// ═══════════════════════════════════════════
// validarContacto: canal y tipos_evento (HU-54)
// ═══════════════════════════════════════════

describe('validarContacto — canal', () => {
  test('canal fuera del catálogo → error', () => {
    expect(
      validarContacto({...formValido(), canal: 'fax' as never}),
    ).toBe('Elegí el canal de notificación');
  });

  test('canales válidos → null', () => {
    expect(validarContacto({...formValido(), canal: 'app_interna'})).toBeNull();
    expect(validarContacto({...formValido(), canal: 'whatsapp'})).toBeNull();
  });
});

describe('validarContacto — tipos_evento', () => {
  test('tipos_evento vacío → error', () => {
    expect(validarContacto({...formValido(), tipos_evento: []})).toBe(
      'Elegí al menos un tipo de evento',
    );
  });

  test('tipos_evento con valor fuera del enum → error', () => {
    expect(
      validarContacto({...formValido(), tipos_evento: ['fisiologico', 'telepatia' as never]}),
    ).toBe('Tipo de evento inválido');
  });

  test('tipos_evento válidos → null', () => {
    expect(validarContacto({...formValido(), tipos_evento: ['fisiologico']})).toBeNull();
    expect(
      validarContacto({...formValido(), tipos_evento: ['fisiologico', 'medicacion', 'estado_animo']}),
    ).toBeNull();
  });
});

// ═══════════════════════════════════════════
// buildWhatsAppLink (HU-54)
// ═══════════════════════════════════════════

describe('buildWhatsAppLink', () => {
  test('quita el + y conserva solo dígitos', () => {
    expect(buildWhatsAppLink('+541155551234', 'Hola')).toBe(
      'https://wa.me/541155551234?text=Hola',
    );
  });

  test('sin + mantiene el mismo resultado', () => {
    expect(buildWhatsAppLink('541155551234', 'Hola')).toBe(
      'https://wa.me/541155551234?text=Hola',
    );
  });

  test('texto con espacios y caracteres especiales → encodeURIComponent', () => {
    expect(buildWhatsAppLink('+541155551234', 'Hola ¿Cómo estás?')).toBe(
      'https://wa.me/541155551234?text=Hola%20%C2%BFC%C3%B3mo%20est%C3%A1s%3F',
    );
  });
});

// ═══════════════════════════════════════════
// resolverReemplazoPrincipal (HU-54)
// ═══════════════════════════════════════════

describe('resolverReemplazoPrincipal', () => {
  test('mismo id → null (no-op)', () => {
    expect(resolverReemplazoPrincipal('c1', 'c1')).toBeNull();
  });

  test('hay principal viejo → desmarcar el viejo, marcar el nuevo', () => {
    expect(resolverReemplazoPrincipal('c1', 'c2')).toEqual({
      desmarcar: ['c1'],
      marcar: 'c2',
    });
  });

  test('sin principal → solo marcar', () => {
    expect(resolverReemplazoPrincipal(null, 'c2')).toEqual({
      desmarcar: [],
      marcar: 'c2',
    });
  });
});

// ═══════════════════════════════════════════
// Defaults (HU-54)
// ═══════════════════════════════════════════

describe('defaults HU-54', () => {
  test('CANAL_DEFAULT / EVENTOS_DEFAULT / ES_PRINCIPAL_DEFAULT correctos', () => {
    expect(CANAL_DEFAULT).toBe('app_interna');
    expect(EVENTOS_DEFAULT).toContain('fisiologico');
    expect(ES_PRINCIPAL_DEFAULT).toBe(false);
  });
});

describe('CANALES', () => {
  test('2 opciones con valor y label no vacíos', () => {
    expect(CANALES).toHaveLength(2);
    for (const c of CANALES) {
      expect(c.valor).toBeTruthy();
      expect(c.label).toBeTruthy();
    }
  });
});

describe('EVENTOS', () => {
  test('3 opciones: fisiologico, medicacion, estado_animo', () => {
    expect(EVENTOS).toHaveLength(3);
    const valores = EVENTOS.map(e => e.valor);
    expect(valores).toEqual(
      expect.arrayContaining(['fisiologico', 'medicacion', 'estado_animo']),
    );
    for (const e of EVENTOS) {
      expect(e.label).toBeTruthy();
    }
  });
});