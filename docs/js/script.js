/* ════════════════════════════════════════════════════════════════════════════
   JAHARTA RP — Main Scripts (v6 Refactored)
   Improved accessibility, performance, and mobile support
   ════════════════════════════════════════════════════════════════════════════ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initMobileNav();
  initScrollReveal();
  initParticles();
  initPageTransition();
});

/* ════════════════════════════════════════════════════════════════════════════
   NAVIGATION — Scroll effect with throttling
   ════════════════════════════════════════════════════════════════════════════ */
function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  
  let ticking = false;
  const scrollThreshold = 60;

  const updateNav = () => {
    const isScrolled = window.scrollY > scrollThreshold;
    nav.classList.toggle('scrolled', isScrolled);
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateNav);
      ticking = true;
    }
  }, { passive: true });
  
  // Initial check
  updateNav();
}

/* ════════════════════════════════════════════════════════════════════════════
   MOBILE NAVIGATION — Accessible hamburger menu
   ════════════════════════════════════════════════════════════════════════════ */
function initMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  const backdrop = document.getElementById('nav-backdrop');
  
  if (!toggle || !navLinks) return;

  // State management
  let isOpen = false;
  
  const openMenu = () => {
    isOpen = true;
    navLinks.classList.add('open');
    backdrop?.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Fermer le menu');
    toggle.querySelector('span').textContent = '✕';
    
    // Trap focus in menu
    document.body.style.overflow = 'hidden';
    
    // Focus first link
    const firstLink = navLinks.querySelector('a');
    firstLink?.focus();
  };
  
  const closeMenu = () => {
    isOpen = false;
    navLinks.classList.remove('open');
    backdrop?.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Ouvrir le menu');
    toggle.querySelector('span').textContent = '☰';
    
    document.body.style.overflow = '';
    
    // Return focus to toggle
    toggle.focus();
  };
  
  const toggleMenu = () => {
    isOpen ? closeMenu() : openMenu();
  };

  // Toggle button click
  toggle.addEventListener('click', toggleMenu);
  
  // Backdrop click closes menu
  backdrop?.addEventListener('click', closeMenu);

  // Close on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (isOpen) closeMenu();
    });
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      closeMenu();
    }
  });

  // Close on resize if desktop
  const mediaQuery = window.matchMedia('(min-width: 881px)');
  mediaQuery.addEventListener('change', (e) => {
    if (e.matches && isOpen) {
      closeMenu();
    }
  });

  // Keyboard navigation within menu
  navLinks.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    
    const links = Array.from(navLinks.querySelectorAll('a:not(.admin-badge)'));
    const currentIndex = links.indexOf(document.activeElement);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % links.length;
        links[nextIndex]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + links.length) % links.length;
        links[prevIndex]?.focus();
        break;
      case 'Home':
        e.preventDefault();
        links[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        links[links.length - 1]?.focus();
        break;
    }
  });
}

/* ════════════════════════════════════════════════════════════════════════════
   SCROLL REVEAL — IntersectionObserver animations
   ════════════════════════════════════════════════════════════════════════════ */
function initScrollReveal() {
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  const reveals = document.querySelectorAll('.reveal, .reveal-stagger, [data-reveal]');
  
  if (!reveals.length) return;

  // If user prefers reduced motion, show everything immediately
  if (prefersReducedMotion) {
    reveals.forEach(el => {
      el.classList.add('visible', 'revealed');
    });
    return;
  }

  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible', 'revealed');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  reveals.forEach((el) => observer.observe(el));
}

/* ════════════════════════════════════════════════════════════════════════════
   PARTICLE SYSTEM — Canvas-based floating particles
   ════════════════════════════════════════════════════════════════════════════ */
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;

  // Check for reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    canvas.style.display = 'none';
    return;
  }

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animationId = null;
  let width, height;
  let isVisible = true;

  const resize = () => {
    const hero = canvas.parentElement;
    if (!hero) return;
    
    const rect = hero.getBoundingClientRect();
    width = canvas.width = rect.width;
    height = canvas.height = rect.height;
  };

  const createParticles = () => {
    const density = Math.min(Math.floor((width * height) / 20000), 60);
    particles = [];

    for (let i = 0; i < density; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.3,
        speedX: (Math.random() - 0.5) * 0.25,
        speedY: (Math.random() - 0.5) * 0.15 - 0.08,
        opacity: Math.random() * 0.5 + 0.1,
        color: Math.random() > 0.75 ? '180, 74, 255' : '0, 240, 255',
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.015 + 0.005,
      });
    }
  };

  const draw = () => {
    if (!isVisible) return;
    
    ctx.clearRect(0, 0, width, height);

    particles.forEach((p) => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.pulse += p.pulseSpeed;

      // Wrap around
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;

      const currentOpacity = p.opacity * (0.6 + 0.4 * Math.sin(p.pulse));

      // Glow effect
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, ${currentOpacity * 0.15})`;
      ctx.fill();

      // Core particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, ${currentOpacity})`;
      ctx.fill();
    });

    animationId = requestAnimationFrame(draw);
  };

  // Visibility observer - pause when not visible
  const visibilityObserver = new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible && !animationId) {
        draw();
      } else if (!isVisible && animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },
    { threshold: 0.1 }
  );

  // Initialize
  resize();
  createParticles();
  
  const hero = canvas.parentElement;
  if (hero) {
    visibilityObserver.observe(hero);
  }
  
  draw();

  // Debounced resize handler
  let resizeTimer;
  const handleResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      createParticles();
    }, 200);
  };
  
  window.addEventListener('resize', handleResize, { passive: true });
}

/* ════════════════════════════════════════════════════════════════════════════
   PAGE TRANSITION — Smooth navigation transitions
   ════════════════════════════════════════════════════════════════════════════ */
function initPageTransition() {
  const overlay = document.getElementById('page-transition');
  if (!overlay) return;

  // Check for reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  const hideOverlay = () => {
    const delay = prefersReducedMotion ? 0 : 300;
    setTimeout(() => {
      overlay.classList.add('hidden');
    }, delay);
  };

  // Fade out on load
  if (document.readyState === 'complete') {
    hideOverlay();
  } else {
    window.addEventListener('load', hideOverlay);
  }
  
  // Safety timeout
  setTimeout(() => {
    overlay.classList.add('hidden');
  }, 1500);

  // Don't intercept if reduced motion
  if (prefersReducedMotion) return;

  // Intercept internal links for transition
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    
    // Skip external links, anchors, special protocols
    if (!href || 
        href.startsWith('#') || 
        href.startsWith('http') ||
        href.startsWith('mailto') || 
        href.startsWith('tel') ||
        link.target === '_blank' ||
        link.hasAttribute('download')) {
      return;
    }

    // Skip if same page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (href === currentPage) return;

    e.preventDefault();
    overlay.classList.remove('hidden');
    
    setTimeout(() => {
      window.location.href = href;
    }, 300);
  });
}

/* ════════════════════════════════════════════════════════════════════════════
   UTILITY — Scroll progress indicator
   ════════════════════════════════════════════════════════════════════════════ */
function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  
  let ticking = false;
  
  const updateProgress = () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollHeight > 0 ? (window.scrollY / scrollHeight) * 100 : 0;
    bar.style.width = `${progress}%`;
    ticking = false;
  };
  
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateProgress);
      ticking = true;
    }
  }, { passive: true });
}

// Initialize scroll progress if element exists
document.addEventListener('DOMContentLoaded', initScrollProgress);
