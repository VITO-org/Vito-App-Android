/**
 * Configuración editable de la landing.
 *
 * La landing NO ofrece descarga mientras la app esté en beta cerrada: el CTA
 * es un botón deshabilitado ("Próximamente en Play Store"). Cuando exista una
 * lista de espera o la ficha de Play Store, el destino se configura acá.
 * Ver "Acceso anticipado" en README.md para el paso a paso.
 *
 * `releasesFallback` se usa cuando `releases.json` no puede leerse
 * (por ejemplo al abrir `index.html` con file://). Mantenelo en sincronía
 * con `releases.json` al publicar una release.
 */
window.VITO_CONFIG = {
  releasesFallback: {
    current: '1.2.2',
    releasedAt: '2026-10-27',
    highlights: [
      'Documentación reorganizada en docs/ con índice propio.',
      'Material canónico de Vittito: system prompt y workflow de n8n.',
      'README reescrito para explicar el producto, no el árbol de carpetas.',
      'Nombre visible unificado a Vito en la app y la documentación.'
    ],
    history: [
      {
        version: '1.2.1',
        date: '2026-10-24',
        summary:
          'Corrección de seguridad: token de sesión en las consultas y cierre total del acceso anónimo a datos de pacientes.'
      },
      {
        version: '1.2.0',
        date: '2026-10-19',
        summary:
          'Rediseño de Inicio, detalle de signos con buckets de 30 minutos y correcciones de cálculo de sueño y pasos.'
      },
      {
        version: '1.1.0',
        date: '2026-09-15',
        summary:
          'Sistema completo de alertas clínicas, baseline de salud y generación de históricos.'
      }
    ]
  }
};
