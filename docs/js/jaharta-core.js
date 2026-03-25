/* ═══════════════════════════════════════════════════════════════
   jaharta-core.js — Shared scripts for all pages
   - Page transitions cybernetic/glitch
   - Nav init (mobile toggle + scroll shrink)
   - Scroll reveal (IntersectionObserver)
   - Scroll progress bar
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── PAGE TRANSITION OVERLAY ───────────────────────────────────
     Creates a cyberpunk glitch effect between page navigations.
     Blocks are revealed left→right in staggered rows with scanlines.
  ────────────────────────────────────────────────────────────── */
  const NUM_BLOCKS = 12;
  const overlay = document.createElement('div');
  overlay.id = 'page-transition';

  for (let i = 0; i < NUM_BLOCKS; i++) {
    const b = document.createElement('div');
    b.className = 'pt-block';
    overlay.appendChild(b);
  }
  document.body.appendChild(overlay);
  const blocks = overlay.querySelectorAll('.pt-block');

  function glitchIn(cb) {
    overlay.classList.add('active');
    blocks.forEach(b => {
      b.style.transform = 'translateX(-100%)';
      b.style.background = '';
    });

    // Stagger each block with tiny random glitch offsets
    blocks.forEach((b, i) => {
      const delay = i * 18 + Math.random() * 10;
      setTimeout(() => {
        // Alternate cyan flash
        b.style.background = Math.random() > 0.85
          ? 'rgba(0,240,255,0.9)'
          : (Math.random() > 0.9 ? '#ff2a8a' : 'var(--bg-deep)');
        b.style.transition = 'transform 0.06s ease-in';
        b.style.transform = 'translateX(0)';
      }, delay);
    });

    const total = NUM_BLOCKS * 18 + 60;
    setTimeout(cb, total);
  }

  function glitchOut(cb) {
    blocks.forEach((b, i) => {
      const delay = i * 16 + Math.random() * 8;
      setTimeout(() => {
        b.style.transition = 'transform 0.05s ease-out';
        b.style.transform = 'translateX(100%)';
      }, delay);
    });

    const total = NUM_BLOCKS * 16 + 60;
    setTimeout(() => {
      overlay.classList.remove('active');
      blocks.forEach(b => {
        b.style.transform = 'translateX(-100%)';
        b.style.background = '';
      });
      if (cb) cb();
    }, total);
  }

  // Intercept internal links for transition
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');

    // Skip: external, hash, javascript:, admin, discord
    if (!href
      || href.startsWith('http')
      || href.startsWith('#')
      || href.startsWith('javascript')
      || href.startsWith('mailto')
      || link.target === '_blank') return;

    e.preventDefault();
    glitchIn(function () {
      window.location.href = href;
    });
  });

  // On page load, glitch out
  window.addEventListener('load', function () {
    glitchOut();
  });

  /* ── NAVIGATION ────────────────────────────────────────────────
  ─────────────────────────────────────────────────────────────── */
  function initNav() {
    const toggle   = document.getElementById('nav-toggle');
    const nav      = document.getElementById('main-nav');
    const backdrop = document.getElementById('nav-backdrop');
    const header   = document.querySelector('header');

    if (toggle && nav) {
      function closeNav() {
        nav.classList.remove('open');
        if (backdrop) backdrop.classList.remove('open');
        toggle.textContent = '☰';
      }
      function openNav() {
        nav.classList.add('open');
        if (backdrop) backdrop.classList.add('open');
        toggle.textContent = '✕';
      }
      toggle.addEventListener('click', () => {
        nav.classList.contains('open') ? closeNav() : openNav();
      });
      if (backdrop) backdrop.addEventListener('click', closeNav);
      nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
    }

    // Header scroll shrink
    if (header) {
      let scrolled = false;
      window.addEventListener('scroll', () => {
        const v = window.scrollY > 80;
        if (v !== scrolled) {
          scrolled = v;
          header.classList.toggle('scrolled', v);
        }
      }, { passive: true });
    }
  }

  /* ── SCROLL PROGRESS BAR ─────────────────────────────────────── */
  function initScrollProgress() {
    const bar = document.querySelector('.scroll-progress');
    if (!bar) return;
    window.addEventListener('scroll', () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const pct = total > 0 ? (window.scrollY / total) * 100 : 0;
      bar.style.width = pct + '%';
    }, { passive: true });
  }

  /* ── SCROLL REVEAL ───────────────────────────────────────────── */
  function initScrollReveal() {
    const els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const delay = entry.target.dataset.delay || 0;
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, parseInt(delay));
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    els.forEach(el => observer.observe(el));
  }

  /* ── DISCORD BANNER GLITCH ───────────────────────────────────── */
  function initDiscordGlitch() {
    const title = document.querySelector('.db-title');
    if (!title) return;
    const db = title.closest('.db');
    if (!db) return;
    db.addEventListener('mouseenter', () => {
      title.classList.remove('glitching');
      void title.offsetWidth;
      title.classList.add('glitching');
    });
    title.addEventListener('animationend', () => {
      title.classList.remove('glitching');
    });
  }

  /* ── HERO TITLE GLITCH (index) ───────────────────────────────── */
  function initHeroGlitch() {
    const c = document.querySelector('.hero-title .c');
    if (!c) return;
    c.classList.add('glitching');
  }

  /* ── INIT ALL ────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initScrollProgress();
    initScrollReveal();
    initDiscordGlitch();
    initHeroGlitch();
  });

})();
