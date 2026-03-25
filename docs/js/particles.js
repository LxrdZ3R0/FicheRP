/* ═══════════════════════════════════════════════════════
   js/particles.js — Floating Canvas Particles
   ═══════════════════════════════════════════════════════
   Renders animated particles behind the hero section.
   Pauses when hero is out of viewport for performance.
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var canvas = document.getElementById('particles-canvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var particles = [];
  var animationId = null;
  var width, height;

  function resize() {
    var hero = canvas.parentElement;
    width = canvas.width = hero.offsetWidth;
    height = canvas.height = hero.offsetHeight;
  }

  function createParticles() {
    var count = Math.min(Math.floor((width * height) / 20000), 60);
    particles = [];

    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.3,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.2 - 0.1,
        opacity: Math.random() * 0.5 + 0.1,
        color: Math.random() > 0.75 ? '180, 74, 255' : '0, 240, 255',
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.speedX;
      p.y += p.speedY;
      p.pulse += p.pulseSpeed;

      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;

      var currentOpacity = p.opacity * (0.6 + 0.4 * Math.sin(p.pulse));

      // Glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + p.color + ', ' + (currentOpacity * 0.15) + ')';
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + p.color + ', ' + currentOpacity + ')';
      ctx.fill();
    }

    animationId = requestAnimationFrame(draw);
  }

  // Pause when hero not visible
  if ('IntersectionObserver' in window) {
    var heroObserver = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) {
          if (!animationId) draw();
        } else {
          if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
          }
        }
      },
      { threshold: 0.1 }
    );
    heroObserver.observe(canvas.parentElement);
  }

  resize();
  createParticles();
  draw();

  // Debounced resize
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      createParticles();
    }, 200);
  });
})();
