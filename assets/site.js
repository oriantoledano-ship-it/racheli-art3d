/* רחלי - interactions: print reveals, sticky nav, mobile drawer, live sign preview, refresh-at-top. */
(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var WA = 'https://wa.me/972525360176?text=';

  /* refresh opens at the top; a hash link lands once, then the hash is dropped */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  var navEntry = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  if (navEntry && navEntry.type === 'reload') window.scrollTo(0, 0);
  if (location.hash) {
    var target = document.getElementById(location.hash.slice(1));
    if (target) setTimeout(function () { target.scrollIntoView(); }, 30);
    history.replaceState(null, '', location.pathname + location.search);
  }

  setTimeout(function () { document.body.classList.add('is-live'); root.setAttribute('data-ready', '1'); }, 60);

  /* reveals: .rv fades up, .pr prints in layer by layer */
  var els = $$('.rv, .pr');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    els.forEach(function (el) {
      if (el.classList.contains('rv')) {
        var sibs = el.parentElement ? $$('.rv', el.parentElement) : [];
        el.style.transitionDelay = Math.min(Math.max(sibs.indexOf(el), 0), 4) * 90 + 'ms';
      }
      io.observe(el);
    });
  } else {
    els.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* sticky nav */
  var nav = $('#nav');
  var onScroll = function () { nav.classList.toggle('is-stuck', window.scrollY > 10); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* mobile drawer */
  var burger = $('.nav__burger');
  var drawer = $('#drawer');
  function setDrawer(open) {
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'סגירת תפריט' : 'פתיחת תפריט');
    nav.classList.toggle('is-open', open);
    drawer.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (burger && drawer) {
    burger.addEventListener('click', function () { setDrawer(drawer.hidden); });
    $$('a', drawer).forEach(function (a) { a.addEventListener('click', function () { setDrawer(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) { setDrawer(false); burger.focus(); } });
  }

  /* in-page links scroll without leaving a hash */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var el = id === 'top' ? document.body : document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      var top = id === 'top' ? 0 : el.getBoundingClientRect().top + window.scrollY - nav.offsetHeight + 1;
      window.scrollTo({ top: top, behavior: root.getAttribute('data-motion') === 'off' ? 'auto' : 'smooth' });
    });
  });

  /* live sign preview */
  var input = $('#tryText'), plaque = $('#plaque'), txt = $('#plaqueTxt'), send = $('#trySend');
  if (input && plaque && txt && send) {
    var names = { stone: 'אבן', white: 'לבן', sand: 'חול', grey: 'אפור', black: 'שחור' };
    var color = 'stone', timer;
    var fit = function () {
      var n = Math.max(txt.textContent.length, 6);
      var w = plaque.clientWidth;
      txt.style.setProperty('--fs', Math.max(26, Math.min(w / (n * 0.48), w / 6.2)).toFixed(0) + 'px');
    };
    var printAgain = function () {
      plaque.classList.remove('is-printing');
      void plaque.offsetWidth;
      plaque.classList.add('is-printing');
    };
    var update = function () {
      var v = input.value.trim() || 'הכיתוב שלכם';
      txt.textContent = v;
      fit();
      send.href = WA + encodeURIComponent('היי רחלי, הגעתי מהאתר ואשמח לשלט עם הכיתוב: "' + v + '", בצבע ' + names[color] + '.');
    };
    input.addEventListener('input', function () { update(); clearTimeout(timer); timer = setTimeout(printAgain, 380); });
    $$('.sw').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.sw').forEach(function (x) { x.classList.remove('is-on'); x.setAttribute('aria-checked', 'false'); });
        b.classList.add('is-on'); b.setAttribute('aria-checked', 'true');
        color = b.getAttribute('data-c');
        plaque.setAttribute('data-c', color);
        update(); printAgain();
      });
    });
    window.addEventListener('resize', fit);
    update();
    if ('IntersectionObserver' in window) {
      var po = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { printAgain(); po.disconnect(); } }, { threshold: .4 });
      po.observe(plaque);
    }
  }
})();
