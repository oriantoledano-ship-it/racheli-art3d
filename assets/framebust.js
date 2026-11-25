/* Clickjacking guard (GitHub Pages cannot send frame-ancestors) + marks JS as available. */
(function () {
  document.documentElement.classList.add('js');
  /* safety net: if site.js never runs, show everything after 4s */
  setTimeout(function () {
    if (!document.documentElement.getAttribute('data-ready')) document.documentElement.classList.remove('js');
  }, 4000);
  if (window.self === window.top) return;
  try { window.top.location = window.self.location.href; } catch (e) {
    document.documentElement.style.visibility = 'hidden';
  }
})();
