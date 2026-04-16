/* ═══════════════════════════════════════════════════════════════
   js/card-glow.js — Futuristic Card Effect (Fiches only)
   
   Effects:
   1. Animated scanline overlay on hover
   2. 3D tilt following cursor (perspective transform)
   3. Text scramble on firstname (.card-fn) AND lastname (.card-ln)
   4. Sweep light line on top edge
   ═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  var CHARS = 'アイウエオカキクケコサシスセソタチツテトΨΩΣΔЯЖЩЦЫЭЮABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var MAX_TILT = 8; // degrees

  /* ── CSS ── */
  var s = document.createElement('style');
  s.id = 'hpx-fx';
  s.textContent = [
    '@keyframes hpx-pan{from{background-position:0% 0%}to{background-position:0% -100%}}',
    '@keyframes hpx-sweep{0%{left:-30%}100%{left:130%}}',

    '.rp-card{transition:transform 0.35s cubic-bezier(.03,.98,.52,.99),border-color 0.4s,box-shadow 0.4s!important;transform-style:preserve-3d;will-change:transform;}',

    /* overlay scanlines */
    '.rp-card .hpx-ov{position:absolute;inset:0;z-index:3;pointer-events:none;opacity:0;transition:opacity .5s;' +
    'background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,240,255,.018) 2px,rgba(0,240,255,.018) 4px),' +
    'repeating-linear-gradient(90deg,transparent,transparent 4px,rgba(0,240,255,.008) 4px,rgba(0,240,255,.008) 8px);' +
    'background-size:100% 400%;animation:hpx-pan 14s linear infinite;}',
    '.rp-card:hover .hpx-ov{opacity:1}',

    /* sweep line */
    '.rp-card .hpx-sw{position:absolute;top:0;left:-30%;width:30%;height:2px;z-index:11;pointer-events:none;opacity:0;transition:opacity .3s;' +
    'background:linear-gradient(90deg,transparent,rgba(0,240,255,.7),transparent);}',
    '.rp-card:hover .hpx-sw{opacity:1;animation:hpx-sweep 2s ease-in-out infinite}',

    /* content stays on top */
    '.rp-card>*:not(.hpx-ov):not(.hpx-sw){position:relative;z-index:4}',

    /* scramble mono font */
    '.hpx-scrambling{font-family:"Share Tech Mono","Rajdhani",monospace!important}',
  ].join('\n');
  document.head.appendChild(s);

  /* ── Inject layers ── */
  function inject(card) {
    if (card.querySelector('.hpx-ov')) return;
    var ov = document.createElement('div'); ov.className = 'hpx-ov'; card.appendChild(ov);
    var sw = document.createElement('div'); sw.className = 'hpx-sw'; card.appendChild(sw);
  }

  /* ── 3D Tilt ── */
  function bindTilt(card) {
    if (card._hpxTilt) return;
    card._hpxTilt = true;

    card.addEventListener('mousemove', function(e) {
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var cx = rect.width / 2;
      var cy = rect.height / 2;
      var rotY = ((x - cx) / cx) * MAX_TILT;
      var rotX = ((cy - y) / cy) * MAX_TILT;
      card.style.transform = 'perspective(800px) rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg) scale(1.02)';
    });

    card.addEventListener('mouseleave', function() {
      card.style.transform = '';
    });
  }

  /* ── Text scramble ── */
  function scrambleEl(el) {
    if (!el) return;
    var orig = el.getAttribute('data-hpx') || el.textContent.trim();
    if (!orig) return;
    el.setAttribute('data-hpx', orig);
    el.classList.add('hpx-scrambling');
    var iter = 0;
    clearInterval(el._hpxI);
    el._hpxI = setInterval(function() {
      el.textContent = orig.split('').map(function(c, i) {
        if (c === ' ') return ' ';
        if (i < iter) return orig[i];
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      }).join('');
      if (iter >= orig.length) { clearInterval(el._hpxI); el.classList.remove('hpx-scrambling'); }
      iter += 0.5;
    }, 35);
  }

  function bindScramble(card) {
    if (card._hpxScr) return;
    card._hpxScr = true;
    card.addEventListener('mouseenter', function() {
      scrambleEl(card.querySelector('.card-fn'));
      scrambleEl(card.querySelector('.card-ln'));
    });
  }

  /* ── Staggered reveal — quinconce ── */
  function revealCards() {
    var cards = document.querySelectorAll('.rp-card:not(.card-revealed)');
    if (!cards.length) return;
    var observer = new IntersectionObserver(function(entries) {
      var visible = [];
      entries.forEach(function(e) {
        if (e.isIntersecting) { visible.push(e.target); observer.unobserve(e.target); }
      });
      visible.forEach(function(card, i) {
        setTimeout(function() { card.classList.add('card-revealed'); }, i * 80);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    cards.forEach(function(c) { observer.observe(c); });
  }

  /* ── Init ── */
  function init() {
    var cards = document.querySelectorAll('.rp-card');
    for (var i = 0; i < cards.length; i++) {
      inject(cards[i]);
      bindTilt(cards[i]);
      bindScramble(cards[i]);
    }
    revealCards();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* Watch for dynamically added cards (Firestore) */
  new MutationObserver(function(muts) {
    for (var i = 0; i < muts.length; i++) {
      for (var j = 0; j < muts[i].addedNodes.length; j++) {
        var n = muts[i].addedNodes[j];
        if (n.nodeType === 1 && (n.classList && n.classList.contains('rp-card') || (n.querySelector && n.querySelector('.rp-card')))) {
          setTimeout(init, 80);
          return;
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

})();
