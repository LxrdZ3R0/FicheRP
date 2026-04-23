/* ──────────────────────────────────────────────────────────────────────
   casino-cards.js — Sprint 1 : rendu SVG vectoriel + dos Jaharta + GSAP deal
   Remplace les glyphes Unicode (♠♥♦♣) par des pips SVG crisp à toute taille.

   API (window.JCards) :
     build(card)   → HTMLElement    (div.card > svg) — carte face (null = dos)
     html(card)    → string          — même sortie sérialisée (pour innerHTML)
     dealIn(el, o) → void            — joue l'anim GSAP (fallback CSS .deal-in)
     animateAll(container, o) → void — anim staggered des .card enfants

   Format carte accepté (les deux coexistent dans le projet) :
     • blackjack : "A♠"  "10♦"  "K♣"   (rank + suit unicode)
     • poker     : "As"  "Td"  "Kc"    (rank char + suit letter)
     • null / "" → dos de carte
   ────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  /* ── Injection des <defs> SVG partagés (sprite : suits + pattern dos) ── */
  const DEFS_ID = 'jcards-defs';
  function ensureDefs() {
    if (document.getElementById(DEFS_ID)) return;
    const defsSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    defsSvg.setAttribute('id', DEFS_ID);
    defsSvg.setAttribute('width', '0');
    defsSvg.setAttribute('height', '0');
    defsSvg.setAttribute('aria-hidden', 'true');
    defsSvg.style.position = 'absolute';
    defsSvg.style.width = '0';
    defsSvg.style.height = '0';
    defsSvg.style.overflow = 'hidden';
    defsSvg.innerHTML = `
      <defs>
        <symbol id="jc-suit-h" viewBox="0 0 32 32">
          <path d="M16 29 C 4 20 2 12 2 10 C 2 5 6 3 9 3 C 12 3 15 5 16 8 C 17 5 20 3 23 3 C 26 3 30 5 30 10 C 30 12 28 20 16 29 Z"/>
        </symbol>
        <symbol id="jc-suit-d" viewBox="0 0 32 32">
          <path d="M16 3 L 29 16 L 16 29 L 3 16 Z"/>
        </symbol>
        <symbol id="jc-suit-s" viewBox="0 0 32 32">
          <path d="M16 3 C 18 5 30 13 30 21 C 30 26 26 28 23 28 C 21 28 19 27 18 25 L 20 30 L 12 30 L 14 25 C 13 27 11 28 9 28 C 6 28 2 26 2 21 C 2 13 14 5 16 3 Z"/>
        </symbol>
        <symbol id="jc-suit-c" viewBox="0 0 32 32">
          <circle cx="16" cy="9" r="5.5"/>
          <circle cx="9" cy="18" r="5.5"/>
          <circle cx="23" cy="18" r="5.5"/>
          <path d="M 13 18 L 19 18 L 21 30 L 11 30 Z"/>
        </symbol>
        <linearGradient id="jc-back-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0a0f22"/>
          <stop offset="100%" stop-color="#1a0c30"/>
        </linearGradient>
        <pattern id="jc-back-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="5" y2="0" stroke="#e8b04a" stroke-width="0.35" opacity="0.35"/>
        </pattern>
        <radialGradient id="jc-back-glow" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%" stop-color="#e8b04a" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#e8b04a" stop-opacity="0"/>
        </radialGradient>
      </defs>
    `;
    document.body.insertBefore(defsSvg, document.body.firstChild);
  }

  /* ── Parsing : "A♠" / "10♦" / "As" / "Td" → { rank, suit } ── */
  const UNICODE_SUITS = { '♠': 's', '♥': 'h', '♦': 'd', '♣': 'c' };
  function parse(card) {
    if (!card) return null;
    const last = card[card.length - 1];
    if (UNICODE_SUITS[last]) {
      return { rank: card.slice(0, -1), suit: UNICODE_SUITS[last] };
    }
    const suit = card[card.length - 1];
    if (!'shdc'.includes(suit)) return null;
    const rankChar = card.slice(0, -1);
    return { rank: rankChar === 'T' ? '10' : rankChar, suit };
  }

  /* ── Construction SVG face ── */
  function faceSVG(rank, suit) {
    const suitId = `#jc-suit-${suit}`;
    // "10" plus large → décale légèrement la position x pour rester centré
    const isTen = rank === '10';
    const rankFontSize = isTen ? 9 : 11;
    return `<svg class="card-svg" viewBox="0 0 56 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
<rect x="0.5" y="0.5" width="55" height="79" rx="4" ry="4" fill="#fdfdfd" stroke="#9aa0ad" stroke-width="0.5"/>
<g fill="currentColor">
<text x="7" y="13" font-family="Georgia,serif" font-size="${rankFontSize}" font-weight="700" text-anchor="middle">${rank}</text>
<use href="${suitId}" x="3" y="15" width="8" height="8"/>
<use href="${suitId}" x="16" y="28" width="24" height="24" opacity="0.95"/>
<g transform="rotate(180 28 40)">
<text x="7" y="13" font-family="Georgia,serif" font-size="${rankFontSize}" font-weight="700" text-anchor="middle">${rank}</text>
<use href="${suitId}" x="3" y="15" width="8" height="8"/>
</g>
</g>
</svg>`;
  }

  /* ── Construction SVG dos Jaharta ── */
  function backSVG() {
    return `<svg class="card-svg card-back-svg" viewBox="0 0 56 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
<rect x="0" y="0" width="56" height="80" rx="4" fill="url(#jc-back-bg)"/>
<rect x="0" y="0" width="56" height="80" rx="4" fill="url(#jc-back-hatch)"/>
<rect x="0" y="0" width="56" height="80" rx="4" fill="url(#jc-back-glow)"/>
<rect x="2.5" y="2.5" width="51" height="75" rx="3" fill="none" stroke="#e8b04a" stroke-width="0.5" opacity="0.75"/>
<rect x="4.5" y="4.5" width="47" height="71" rx="2" fill="none" stroke="#e8b04a" stroke-width="0.3" opacity="0.45"/>
<g transform="translate(28 40)" fill="none" stroke="#e8b04a">
<path d="M 0 -15 L 11 0 L 0 15 L -11 0 Z" stroke-width="0.9"/>
<path d="M 0 -10 L 7.5 0 L 0 10 L -7.5 0 Z" stroke-width="0.5" opacity="0.6" fill="#e8b04a" fill-opacity="0.12"/>
<path d="M 0 -5 L 4 0 L 0 5 L -4 0 Z" stroke-width="0.4" opacity="0.5"/>
</g>
<text x="28" y="43.5" text-anchor="middle" font-family="Orbitron,sans-serif" font-weight="900" font-size="10" fill="#e8b04a">J</text>
<g fill="#e8b04a" opacity="0.55">
<circle cx="6" cy="6" r="0.9"/>
<circle cx="50" cy="6" r="0.9"/>
<circle cx="6" cy="74" r="0.9"/>
<circle cx="50" cy="74" r="0.9"/>
</g>
</svg>`;
  }

  /* ── Builders publics ── */
  function html(card) {
    ensureDefs();
    const p = parse(card);
    if (!p) return `<div class="card back">${backSVG()}</div>`;
    const color = (p.suit === 'h' || p.suit === 'd') ? 'red-suit' : 'black-suit';
    return `<div class="card ${color}">${faceSVG(p.rank, p.suit)}</div>`;
  }

  function build(card) {
    ensureDefs();
    const wrap = document.createElement('div');
    wrap.innerHTML = html(card);
    return wrap.firstElementChild;
  }

  /* ── Anim : GSAP si dispo, sinon CSS .deal-in ── */
  function dealIn(el, opts) {
    if (!el) return;
    const { delay = 0, dir = 1 } = opts || {};
    if (window.gsap) {
      window.gsap.fromTo(
        el,
        { y: -42, x: 18 * dir, rotation: -10 * dir, scale: 0.82, opacity: 0 },
        { y: 0, x: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.42, ease: 'power3.out', delay, clearProps: 'transform,opacity' }
      );
      return;
    }
    // Fallback CSS (classe déclarée dans casino.css)
    el.classList.remove('deal-in');
    // Force reflow pour rejouer l'animation si l'élément est réutilisé
    void el.offsetWidth;
    el.classList.add('deal-in');
  }

  function animateAll(container, opts) {
    if (!container) return;
    const { stagger = 0.08, baseDelay = 0 } = opts || {};
    const cards = container.querySelectorAll(':scope > .card');
    cards.forEach((el, i) => dealIn(el, { delay: baseDelay + i * stagger }));
  }

  /* ── Export ── */
  window.JCards = { build, html, dealIn, animateAll, parse };
})();
