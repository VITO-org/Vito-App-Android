/**
 * Vito — landing
 * Sin dependencias. Todo degrada a contenido estático si algo falla.
 */
(function () {
  'use strict';

  var config = window.VITO_CONFIG || {};
  var prefersReducedMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  /* ----------------------------------------------------------------------
     Navegación móvil
     ---------------------------------------------------------------------- */
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('nav-menu');

  function closeMenu() {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menú');
    menu.classList.remove('is-open');
  }

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Abrir menú' : 'Cerrar menú');
      menu.classList.toggle('is-open', !isOpen);
    });

    menu.addEventListener('click', function (event) {
      if (event.target.closest('a')) closeMenu();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu();
    });

    document.addEventListener('click', function (event) {
      if (!menu.classList.contains('is-open')) return;
      if (!menu.contains(event.target) && !toggle.contains(event.target)) {
        closeMenu();
      }
    });
  }

  /* ----------------------------------------------------------------------
     CTA de descarga
     ---------------------------------------------------------------------- */
  var downloadUrl = config.downloadUrl;
  if (downloadUrl) {
    document.querySelectorAll('[data-download]').forEach(function (link) {
      link.setAttribute('href', downloadUrl);
      link.setAttribute('rel', 'noopener');
    });
  }

  var repoUrl = config.repoUrl;
  if (repoUrl) {
    document
      .querySelectorAll('[data-repo]')
      .forEach(function (link) {
        link.setAttribute('href', repoUrl);
      });
  }

  /* ----------------------------------------------------------------------
     Año del footer
     ---------------------------------------------------------------------- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ----------------------------------------------------------------------
     Novedades
     ---------------------------------------------------------------------- */
  var MONTHS = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre'
  ];

  function formatDate(value) {
    if (!value) return '';
    var parts = String(value).split('-');
    if (parts.length !== 3) return String(value);
    var monthIndex = Number(parts[1]) - 1;
    if (monthIndex < 0 || monthIndex > 11) return String(value);
    return Number(parts[2]) + ' de ' + MONTHS[monthIndex] + ' de ' + parts[0];
  }

  function renderReleases(data) {
    if (!data) return;

    var version = document.getElementById('release-version');
    var date = document.getElementById('release-date');
    var highlights = document.getElementById('release-highlights');
    var history = document.getElementById('release-history');

    if (version) version.textContent = 'v' + data.current;
    if (date) date.textContent = formatDate(data.releasedAt);

    if (highlights && Array.isArray(data.highlights)) {
      highlights.textContent = '';
      data.highlights.forEach(function (item) {
        var li = document.createElement('li');
        li.textContent = item;
        highlights.appendChild(li);
      });
    }

    if (history && Array.isArray(data.history)) {
      history.textContent = '';
      data.history.forEach(function (release) {
        var li = document.createElement('li');
        var strong = document.createElement('strong');
        strong.textContent = 'v' + release.version;
        li.appendChild(strong);
        li.appendChild(
          document.createTextNode(
            formatDate(release.date) + ' — ' + release.summary
          )
        );
        history.appendChild(li);
      });
    }
  }

  function loadReleases() {
    var fallback = config.releasesFallback || null;

    if (window.location.protocol === 'file:') {
      renderReleases(fallback);
      return;
    }

    fetch('releases.json', { cache: 'no-cache' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(renderReleases)
      .catch(function () {
        renderReleases(fallback);
      });
  }

  loadReleases();

  /* ----------------------------------------------------------------------
     Aparición suave al scrollear
     ---------------------------------------------------------------------- */
  if (
    !prefersReducedMotion &&
    'IntersectionObserver' in window &&
    document.documentElement.classList.contains('js')
  ) {
    var targets = document.querySelectorAll(
      '.section-head, .card, .feature, .vital, .release, .vittito-copy, .vittito-visual, .cta-inner'
    );

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    targets.forEach(function (element) {
      element.classList.add('reveal');
      observer.observe(element);
    });
  }
})();
