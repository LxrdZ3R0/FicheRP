/* page-transition.js — Cybernetic page transitions */
(function() {
  var overlay = document.getElementById('page-transition');
  if (!overlay) return;

  // Fade out on load
  function hideOverlay() {
    setTimeout(function() { overlay.classList.add('hidden'); }, 300);
  }
  if (document.readyState === 'complete') hideOverlay();
  else window.addEventListener('load', hideOverlay);
  setTimeout(function() { overlay.classList.add('hidden'); }, 1500);

  // Intercept internal links
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') ||
        href.startsWith('mailto') || link.target === '_blank') return;
    var current = window.location.pathname.split('/').pop() || 'index.html';
    if (href === current) return;
    e.preventDefault();
    overlay.classList.remove('hidden');
    setTimeout(function() { window.location.href = href; }, 200);
  });
})();
