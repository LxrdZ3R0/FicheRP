/* ═══════════════════════════════════════════════════════════════
   js/page-transitions.js — Cybernetic Page Transitions
   ═══════════════════════════════════════════════════════════════
   Intercepts internal link clicks, plays a cyber-wipe animation,
   then navigates. On page load, plays an enter animation.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Page Enter Animation ── */
  function playEnterAnimation() {
    document.body.classList.add('page-enter');
    // Remove after animation completes
    setTimeout(function () {
      document.body.classList.remove('page-enter');
    }, 800);
  }

  /* ── Check if navigation was triggered by transition ── */
  if (sessionStorage.getItem('jaharta-transition') === '1') {
    sessionStorage.removeItem('jaharta-transition');
    playEnterAnimation();
  }

  /* ── Create Transition Overlay ── */
  function createOverlay() {
    var overlay = document.createElement('div');
    overlay.className = 'page-transition-overlay';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.15s ease-in';

    // Scanline
    var scanline = document.createElement('div');
    scanline.className = 'transition-scanline';
    overlay.appendChild(scanline);

    // Loading text
    var text = document.createElement('div');
    text.className = 'transition-text';
    text.textContent = 'LOADING';
    overlay.appendChild(text);

    // Horizontal bars (cybernetic effect)
    for (var i = 0; i < 3; i++) {
      var bar = document.createElement('div');
      bar.style.cssText =
        'position:absolute;left:0;right:0;height:1px;' +
        'background:linear-gradient(90deg,transparent,rgba(0,240,255,' + (0.15 - i * 0.04) + '),transparent);' +
        'top:' + (30 + i * 20) + '%;' +
        'animation:transitionScan ' + (0.5 + i * 0.15) + 's ' + (i * 0.1) + 's ease-out forwards;';
      overlay.appendChild(bar);
    }

    document.body.appendChild(overlay);
    // Force reflow then fade in
    overlay.offsetHeight;
    overlay.style.opacity = '1';
    return overlay;
  }

  /* ── Intercept Internal Links ── */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href]');
    if (!link) return;

    var href = link.getAttribute('href');
    if (!href) return;

    // Skip external links, anchors, js:, admin badge, and same page
    if (href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
    if (link.target === '_blank') return;

    // Skip admin.html links (admin panel has its own flow)
    if (href.indexOf('admin.html') !== -1 && link.classList.contains('admin-badge')) return;

    // Skip same page
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    var targetPage = href.split('#')[0].split('?')[0];
    if (targetPage === currentPage) return;

    e.preventDefault();

    // Mark transition in session
    sessionStorage.setItem('jaharta-transition', '1');

    // Play exit animation
    createOverlay();

    // Navigate after animation
    setTimeout(function () {
      window.location.href = href;
    }, 350);
  });

  /* ── Also play enter animation on first visit (no transition flag) ── */
  if (!sessionStorage.getItem('jaharta-visited')) {
    sessionStorage.setItem('jaharta-visited', '1');
    playEnterAnimation();
  }

})();
