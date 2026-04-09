/* ── Navbar partagée Jaharta ── */
/* Injecte nav + mobile-menu, détecte la page active, init le burger */
(function () {
  var PAGES = [
    { href: 'index.html',          label: 'Accueil',   short: 'Accueil',  num: '01' },
    { href: 'fiches.html',         label: 'Fiches RP', short: 'Fiches',   num: '02' },
    { href: 'pnj.html',            label: 'PNJ',       short: 'PNJ',      num: '03' },
    { href: 'portail.html',        label: 'Portail',   short: 'Portail',  num: '04' },
    { href: 'racesjouables.html',  label: 'Races',     short: 'Races',    num: '05' },
    { href: 'gacha.html',          label: 'Gacha',     short: 'Gacha',    num: '06' },
    { href: 'hub.html',            label: 'Hub',       short: 'Hub',      num: '07' }
  ];

  var current = window.location.pathname.split('/').pop() || 'index.html';

  /* ── Nav desktop ── */
  var navLinks = PAGES.map(function (p) {
    var active = p.href === current ? ' class="active"' : '';
    return '<a href="' + p.href + '"' + active + '>' + p.label + '</a>';
  }).join('');

  /* ── Menu mobile ── */
  var menuLinks = PAGES.map(function (p) {
    var cls = 'menu-link' + (p.href === current ? ' active' : '');
    return '<a href="' + p.href + '" class="' + cls + '">' +
      '<span class="menu-link-index">' + p.num + '</span>' +
      '<span class="menu-link-text">' + p.short + '</span>' +
      '<span class="menu-link-arrow">\u2192</span>' +
      '</a>';
  }).join('');

  var html =
    '<nav class="nav" id="nav">' +
      '<a href="index.html" class="nav-logo">' +
        '<img src="img/logo-jaharta.png" alt="Logo Jaharta">JAHARTA' +
      '</a>' +
      '<div class="nav-links" id="nav-links">' + navLinks + '</div>' +
      '<button class="burger" id="burger" aria-label="Menu" aria-expanded="false">' +
        '<span class="burger-line"></span>' +
        '<span class="burger-line"></span>' +
        '<span class="burger-line"></span>' +
      '</button>' +
    '</nav>' +
    '<div class="mobile-menu" id="mobile-menu">' +
      '<div class="menu-inner">' +
        '<div class="menu-header-label">// NAVIGATION</div>' +
        menuLinks +
      '</div>' +
      '<div class="menu-deco"></div>' +
    '</div>';

  /* ── Injection ── */
  var placeholder = document.getElementById('jaharta-nav');
  if (placeholder) placeholder.outerHTML = html;

  /* ── Burger init ── */
  function initBurger() {
    var burger = document.getElementById('burger');
    var mm = document.getElementById('mobile-menu');
    if (!burger || !mm) return;

    burger.addEventListener('click', function () {
      var isOpen = burger.classList.toggle('active');
      mm.classList.toggle('open');
      burger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    mm.querySelectorAll('.menu-link').forEach(function (link) {
      link.addEventListener('click', function () {
        burger.classList.remove('active');
        mm.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mm.classList.contains('open')) {
        burger.classList.remove('active');
        mm.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBurger);
  } else {
    initBurger();
  }
})();
