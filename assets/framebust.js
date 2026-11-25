/* Clickjacking guard (GitHub Pages cannot send frame-ancestors), JS flag, and the printer-loader decision.
   Runs in <head> so the loader shows (or is skipped) before the first paint. */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  try {
    var prefs = JSON.parse(localStorage.getItem('racheli-a11y') || '{}');
    var skip = sessionStorage.getItem('racheli-printed') || document.hidden || location.hash ||
      prefs.motion === 'off' || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (!skip) root.classList.add('printing', 'printed');
  } catch (e) { /* storage blocked: no loader */ }
  /* safety net: if site.js never runs, drop the loader and show everything */
  setTimeout(function () {
    if (!root.getAttribute('data-ready')) root.classList.remove('js', 'printing');
  }, 4000);
  if (window.self === window.top) return;
  try { window.top.location = window.self.location.href; } catch (e) {
    root.style.visibility = 'hidden';
  }
})();
