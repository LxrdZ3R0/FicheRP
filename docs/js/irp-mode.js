/* ── IRP Mode — Système d'accès secret au mode IRP ── */
/* Gère : code d'accès, thème violine/écarlate, chargement des données IRP */
(function () {
  'use strict';

  var IRP_CODE = 'JAHARTA02irp';
  var STORAGE_KEY = 'jaharta_irp_mode';

  /* ── State ── */
  window._irpMode = localStorage.getItem(STORAGE_KEY) === 'true';

  /* ── CSS du mode IRP (injecté dynamiquement) ── */
  var IRP_THEME_CSS = [
    /* ── Palette complète IRP : violine / rouge écarlate / violet sombre ── */
    ':root.irp-mode {',
    /* Fonds — tons sombres violacés */
    '  --bg:       #0a0410;',        /* fond principal — violet très sombre */
    '  --bg2:      #100818;',        /* fond secondaire */
    '  --surface:  #1a0c28;',        /* surface carte */
    '  --surface2: #140a20;',        /* surface secondaire */
    '  --border:   rgba(220,20,60,0.12);',
    /* Accents — tout en rouge/violine/violet */
    '  --cyan:     #dc143c;',        /* Scarlet (remplace cyan partout) */
    '  --blue:     #8B008B;',        /* Violine */
    '  --violet:   #800020;',        /* Burgundy */
    '  --magenta:  #dc143c;',        /* Scarlet */
    '  --purple:   #6A0DAD;',        /* Violet profond */
    '  --gold:     #c41e3a;',        /* Cardinal */
    '  --green:    #cc3366;',        /* Rose foncé (remplace vert) */
    '  --orange:   #b8336a;',        /* Mauve-rose */
    '  --red:      #ff1744;',        /* Rouge vif */
    /* RGB channels */
    '  --cyan-rgb:       220,20,60;',
    '  --blue-rgb:       139,0,139;',
    '  --violet-rgb:     128,0,32;',
    '  --red-rgb:        255,23,68;',
    '  --green-rgb:      204,51,102;',
    '  --gold-rgb:       196,30,58;',
    '  --surface-dk-rgb: 20,10,32;',
    '  --bg-dk-rgb:      10,4,16;',
    /* Lueurs — tout en rouge/violine */
    '  --cyan-dim:    #8B0000;',
    '  --cyan-glow:   rgba(220,20,60,0.38);',
    '  --violet-glow: rgba(139,0,139,0.3);',
    '  --glow-sm:     0 0 8px rgba(220,20,60,0.38);',
    '  --glow-md:     0 0 20px rgba(220,20,60,0.38), 0 0 40px rgba(139,0,139,0.15);',
    '  --glow-lg:     0 0 30px rgba(220,20,60,0.35), 0 0 80px rgba(139,0,139,0.1), 0 0 120px rgba(106,13,173,0.06);',
    '  --glow-violet: 0 0 20px rgba(139,0,139,0.3), 0 0 50px rgba(106,13,173,0.1);',
    '  --glow-blue:   rgba(220,20,60,0.35);',
    '  --glow-gold:   rgba(139,0,139,0.4);',
    /* Texte — légèrement rosé */
    '  --text:  #e8dce6;',
    '  --text2: #8a7090;',
    '  --text3: #4a3060;',
    '  --muted: #6a4070;',
    '}',
    /* Background html & body */
    '.irp-mode, .irp-mode body { background: #0a0410 !important; }',
    'html.irp-mode { background: #0a0410 !important; }',
    /* Scrollbar */
    '.irp-mode body { scrollbar-color: #8B0000 #0a0410; }',
    '.irp-mode ::-webkit-scrollbar-track { background: #100818; }',
    '.irp-mode ::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #8B0000, #6A0DAD); }',
    '.irp-mode ::-webkit-scrollbar-thumb:hover { box-shadow: 0 0 6px rgba(220,20,60,0.38); }',
    /* Nav */
    '.irp-mode .nav { background: rgba(10,4,16,0.92) !important; border-bottom-color: rgba(220,20,60,0.1) !important; }',
    '.irp-mode .nav-links a { color: #8a7090 !important; }',
    '.irp-mode .nav-links a:hover, .irp-mode .nav-links a.active { color: #dc143c !important; }',
    '.irp-mode .nav-logo { color: #dc143c !important; }',
    '.irp-mode .nav-logo img { filter: hue-rotate(280deg) saturate(1.5) brightness(0.9); }',
    /* Burger / mobile menu */
    '.irp-mode .burger { background: rgba(220,20,60,0.06) !important; border-color: rgba(220,20,60,0.15) !important; }',
    '.irp-mode .burger-line { background: #dc143c !important; }',
    '.irp-mode .mobile-menu { background: rgba(10,4,16,0.97) !important; }',
    '.irp-mode .menu-link { color: #8a7090 !important; border-bottom-color: rgba(220,20,60,0.08) !important; }',
    '.irp-mode .menu-link:hover, .irp-mode .menu-link.active { color: #dc143c !important; }',
    '.irp-mode .menu-link-index { color: #dc143c !important; }',
    /* Footer */
    '.irp-mode .footer { border-top-color: rgba(220,20,60,0.08) !important; }',
    '.irp-mode .footer-brand { color: #dc143c !important; }',
    '.irp-mode .footer-links a { color: #8a7090 !important; }',
    '.irp-mode .footer-links a:hover { color: #dc143c !important; }',
    '.irp-mode .footer-copy { color: #4a3060 !important; }',
    /* Titres et textes */
    '.irp-mode .hero-title,',
    '.irp-mode .section-title {',
    '  background: linear-gradient(135deg, #8B008B, #dc143c) !important;',
    '  -webkit-background-clip: text !important;',
    '  -webkit-text-fill-color: transparent !important;',
    '  background-clip: text !important;',
    '}',
    /* Cartes / surfaces */
    '.irp-mode .rp-card, .irp-mode .pnj-card, .irp-mode .sys-card,',
    '.irp-mode .lore-card, .irp-mode .race-card {',
    '  background: #1a0c28 !important;',
    '  border-color: rgba(220,20,60,0.12) !important;',
    '}',
    '.irp-mode .rp-card:hover, .irp-mode .pnj-card:hover {',
    '  border-color: rgba(220,20,60,0.3) !important;',
    '  box-shadow: 0 0 20px rgba(220,20,60,0.15) !important;',
    '}',
    /* Boutons / filtres */
    '.irp-mode .fbtn, .irp-mode .cat-btn {',
    '  border-color: rgba(220,20,60,0.15) !important;',
    '  color: #8a7090 !important;',
    '}',
    '.irp-mode .fbtn:hover, .irp-mode .fbtn.active,',
    '.irp-mode .cat-btn:hover, .irp-mode .cat-btn.active {',
    '  border-color: rgba(220,20,60,0.4) !important;',
    '  color: #dc143c !important;',
    '  background: rgba(220,20,60,0.08) !important;',
    '}',
    /* Hero section */
    '.irp-mode .hero { background: radial-gradient(ellipse at 50% 0%, rgba(139,0,139,0.12) 0%, transparent 60%) !important; }',
    /* Scan line / grain overlay */
    '.irp-mode .scroll-line { background: linear-gradient(90deg, #8B008B, #dc143c) !important; }',
    /* Live dot */
    '.irp-mode .live-dot { background: #dc143c !important; box-shadow: 0 0 8px #dc143c !important; }',
    '.irp-mode .live-text { color: #dc143c !important; }',
    /* Stats bars */
    '.irp-mode .sb-fill { background: linear-gradient(90deg, #8B008B, #dc143c) !important; }',
    /* Rank badges — prismatic override */
    '.irp-mode [data-rank] { --rank-color: #dc143c; }',
    /* Badge IRP flottant */
    '.irp-badge {',
    '  position: fixed; bottom: 1rem; right: 1rem;',
    '  font-family: var(--font-h); font-size: 0.55rem;',
    '  letter-spacing: 0.15em; color: #dc143c;',
    '  background: rgba(220,20,60,0.08);',
    '  border: 1px solid rgba(220,20,60,0.25);',
    '  border-radius: 6px; padding: 6px 14px;',
    '  z-index: 9999; pointer-events: none;',
    '  animation: irpPulse 2s ease-in-out infinite;',
    '}',
    '@keyframes irpPulse {',
    '  0%,100% { opacity: 0.6; }',
    '  50% { opacity: 1; }',
    '}',
    /* Modal d'accès */
    '.irp-modal-overlay {',
    '  position: fixed; inset: 0; z-index: 10000;',
    '  background: rgba(2,7,19,0.95); backdrop-filter: blur(20px);',
    '  display: flex; align-items: center; justify-content: center;',
    '  opacity: 0; transition: opacity 0.3s;',
    '}',
    '.irp-modal-overlay.visible { opacity: 1; }',
    '.irp-modal {',
    '  background: linear-gradient(145deg, #0a0f22, #120818);',
    '  border: 1px solid rgba(220,20,60,0.3);',
    '  border-radius: 16px; padding: 40px;',
    '  max-width: 400px; width: 90%; text-align: center;',
    '  box-shadow: 0 0 60px rgba(139,0,139,0.15);',
    '}',
    '.irp-modal h2 {',
    '  font-family: var(--font-h); font-size: 1rem;',
    '  letter-spacing: 0.15em; color: #dc143c;',
    '  margin-bottom: 8px;',
    '}',
    '.irp-modal p {',
    '  font-family: var(--font-m); font-size: 0.65rem;',
    '  color: var(--text2); margin-bottom: 24px;',
    '}',
    '.irp-modal input {',
    '  width: 100%; padding: 12px 16px;',
    '  background: rgba(220,20,60,0.06);',
    '  border: 1px solid rgba(220,20,60,0.2);',
    '  border-radius: 8px; color: var(--text);',
    '  font-family: var(--font-m); font-size: 0.75rem;',
    '  letter-spacing: 0.1em; text-align: center;',
    '  outline: none; transition: border-color 0.2s;',
    '}',
    '.irp-modal input:focus {',
    '  border-color: rgba(220,20,60,0.5);',
    '}',
    '.irp-modal input.error {',
    '  border-color: #ff4444; animation: shake 0.4s;',
    '}',
    '@keyframes shake {',
    '  0%,100% { transform: translateX(0); }',
    '  25% { transform: translateX(-8px); }',
    '  75% { transform: translateX(8px); }',
    '}',
    '.irp-modal .irp-submit {',
    '  margin-top: 16px; padding: 10px 32px;',
    '  background: linear-gradient(135deg, #8B008B, #dc143c);',
    '  border: none; border-radius: 8px;',
    '  color: #fff; font-family: var(--font-h);',
    '  font-size: 0.65rem; letter-spacing: 0.12em;',
    '  cursor: pointer; transition: opacity 0.2s;',
    '}',
    '.irp-modal .irp-submit:hover { opacity: 0.8; }',
    '.irp-modal .irp-cancel {',
    '  margin-top: 12px; padding: 8px 24px;',
    '  background: transparent;',
    '  border: 1px solid rgba(255,255,255,0.1);',
    '  border-radius: 8px; color: var(--text3);',
    '  font-family: var(--font-m); font-size: 0.6rem;',
    '  cursor: pointer;',
    '}',
    /* Bouton footer secret */
    '.irp-secret-btn {',
    '  color: var(--text3); text-decoration: none;',
    '  font-size: 0.42rem; letter-spacing: 0.12em;',
    '  opacity: 0.15; transition: opacity 0.2s;',
    '  margin-left: 10px; cursor: pointer;',
    '  user-select: none;',
    '}',
    '.irp-secret-btn:hover { opacity: 0.5; }',
    /* En mode IRP, le bouton devient visible */
    '.irp-mode .irp-secret-btn {',
    '  opacity: 0.6; color: #dc143c;',
    '}',
  ].join('\n');

  /* ── Inject CSS ── */
  var style = document.createElement('style');
  style.id = 'irp-theme-css';
  style.textContent = IRP_THEME_CSS;
  document.head.appendChild(style);

  /* ── Apply/Remove IRP mode ── */
  function applyIRPMode() {
    document.documentElement.classList.add('irp-mode');
    window._irpMode = true;
    localStorage.setItem(STORAGE_KEY, 'true');

    /* Modifier le logo texte */
    var logos = document.querySelectorAll('.nav-logo, .footer-brand');
    logos.forEach(function (el) {
      if (el.classList.contains('nav-logo')) {
        /* Navbar : ajouter " IRP" au texte */
        var textNodes = [];
        el.childNodes.forEach(function (n) {
          if (n.nodeType === 3 && n.textContent.trim()) textNodes.push(n);
        });
        textNodes.forEach(function (n) {
          if (!n.textContent.includes('IRP')) {
            n.textContent = n.textContent.replace('JAHARTA', 'JAHARTA IRP');
          }
        });
      } else {
        if (!el.textContent.includes('IRP')) {
          el.textContent = el.textContent.replace('JAHARTA', 'JAHARTA IRP');
        }
      }
    });

    /* Badge flottant */
    if (!document.getElementById('irp-badge')) {
      var badge = document.createElement('div');
      badge.id = 'irp-badge';
      badge.className = 'irp-badge';
      badge.textContent = '◆ MODE IRP';
      document.body.appendChild(badge);
    }

    /* Recharger les données si les fonctions existent */
    if (typeof window._loadIRPCards === 'function') window._loadIRPCards();
    if (typeof window._loadIRPPNJ === 'function') window._loadIRPPNJ();
  }

  function removeIRPMode() {
    document.documentElement.classList.remove('irp-mode');
    window._irpMode = false;
    localStorage.removeItem(STORAGE_KEY);

    /* Restaurer les logos */
    var logos = document.querySelectorAll('.nav-logo, .footer-brand');
    logos.forEach(function (el) {
      if (el.classList.contains('nav-logo')) {
        el.childNodes.forEach(function (n) {
          if (n.nodeType === 3) n.textContent = n.textContent.replace('JAHARTA IRP', 'JAHARTA');
        });
      } else {
        el.textContent = el.textContent.replace('JAHARTA IRP', 'JAHARTA');
      }
    });

    /* Retirer le badge */
    var badge = document.getElementById('irp-badge');
    if (badge) badge.remove();
  }

  /* ── Modal d'accès ── */
  function openIRPModal() {
    /* Si déjà en mode IRP, on désactive */
    if (window._irpMode) {
      removeIRPMode();
      if (typeof showToast === 'function') showToast('Mode IRP désactivé', 'info');
      /* Recharger la page pour nettoyer les données IRP */
      setTimeout(function () { location.reload(); }, 500);
      return;
    }

    var overlay = document.createElement('div');
    overlay.className = 'irp-modal-overlay';
    overlay.innerHTML = [
      '<div class="irp-modal">',
      '  <h2>◆ ACCÈS RESTREINT</h2>',
      '  <p>Ce contenu est réservé. Entrez le code d\'accès.</p>',
      '  <input type="password" id="irp-code-input" placeholder="Code d\'accès..." autocomplete="off" spellcheck="false">',
      '  <br>',
      '  <button class="irp-submit" id="irp-submit-btn">ACCÉDER</button>',
      '  <br>',
      '  <button class="irp-cancel" id="irp-cancel-btn">Annuler</button>',
      '</div>'
    ].join('');
    document.body.appendChild(overlay);

    /* Fade in */
    requestAnimationFrame(function () {
      overlay.classList.add('visible');
    });

    var input = document.getElementById('irp-code-input');
    var submitBtn = document.getElementById('irp-submit-btn');
    var cancelBtn = document.getElementById('irp-cancel-btn');

    function trySubmit() {
      var val = input.value.trim();
      if (val === IRP_CODE) {
        overlay.classList.remove('visible');
        setTimeout(function () {
          overlay.remove();
          applyIRPMode();
          if (typeof showToast === 'function') showToast('Mode IRP activé', 'success');
        }, 300);
      } else {
        input.classList.add('error');
        setTimeout(function () { input.classList.remove('error'); }, 500);
        input.value = '';
        input.placeholder = 'Code incorrect...';
      }
    }

    submitBtn.addEventListener('click', trySubmit);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') trySubmit();
    });
    cancelBtn.addEventListener('click', function () {
      overlay.classList.remove('visible');
      setTimeout(function () { overlay.remove(); }, 300);
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        overlay.classList.remove('visible');
        setTimeout(function () { overlay.remove(); }, 300);
      }
    });

    setTimeout(function () { input.focus(); }, 100);
  }

  /* ── Exposer pour les autres scripts ── */
  window._openIRPModal = openIRPModal;
  window._applyIRPMode = applyIRPMode;
  window._removeIRPMode = removeIRPMode;

  /* ── Injecter le bouton secret dans le footer ── */
  function injectSecretButton() {
    var footerCopy = document.querySelector('.footer-copy');
    if (!footerCopy) return;
    if (footerCopy.querySelector('.irp-secret-btn')) return;

    var btn = document.createElement('span');
    btn.className = 'irp-secret-btn';
    btn.textContent = '◆';
    btn.title = '';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      openIRPModal();
    });
    footerCopy.appendChild(btn);
  }

  /* ── Auto-apply si déjà authentifié ── */
  function init() {
    injectSecretButton();
    if (window._irpMode) {
      applyIRPMode();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
