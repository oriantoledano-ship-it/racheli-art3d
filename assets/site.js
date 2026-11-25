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

  var motionOff = function () {
    return root.getAttribute('data-motion') === 'off' ||
      (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };

  /* ---------- the printer loader: right to left, row by row from the top ---------- */
  var printing = root.classList.contains('printing');
  var loader = $('#loader');
  var finished = false;
  function finishLoader() {
    if (finished) return;
    finished = true;
    root.classList.remove('printing');
    if (loader) loader.remove();
    try { sessionStorage.setItem('racheli-printed', '1'); } catch (e) {}
    document.body.classList.add('is-live');
  }
  root.setAttribute('data-ready', '1');
  if (printing && loader && loader.animate) {
    var W = window.innerWidth, H = window.innerHeight;
    var rows = W < 700 ? 8 : 10, rh = Math.ceil(H / rows), per = W < 700 ? 135 : 150;
    var bed = $('.loader__bed', loader), rail = $('.loader__rail', loader), head = $('.loader__head', loader);
    var frag = document.createDocumentFragment(), strips = [];
    for (var i = 0; i < rows; i++) {
      var r = document.createElement('div');
      r.className = 'loader__row';
      r.style.top = (i * rh) + 'px';
      r.style.height = (rh + 1) + 'px';
      frag.appendChild(r); strips.push(r);
    }
    loader.insertBefore(frag, rail);
    bed.remove();
    strips.forEach(function (r, i) {
      // later animations win while running; with fill 'forwards' each row's head pass holds until the next row starts
      var y = i * rh + rh / 2, o = { duration: per, delay: 120 + i * per, fill: i === 0 ? 'both' : 'forwards', easing: 'linear' };
      r.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 100% 0 0)' }], o);
      head.animate([{ transform: 'translate(' + W + 'px,' + y + 'px)' }, { transform: 'translate(0px,' + y + 'px)' }], o);
      rail.animate([{ transform: 'translateY(' + (y - 48) + 'px)' }, { transform: 'translateY(' + (y - 48) + 'px)' }], o);
    });
    var out = loader.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, delay: 160 + rows * per, fill: 'forwards' });
    out.onfinish = finishLoader;
    setTimeout(finishLoader, 160 + rows * per + 1400);
  } else {
    root.classList.remove('printing');
    if (loader) loader.remove();
    setTimeout(function () { document.body.classList.add('is-live'); }, 60);
  }

  /* ---------- raster print-in for any element: rows from the top, each printed right to left ---------- */
  function printIn(el, opts) {
    opts = opts || {};
    var old = el.querySelector(':scope > .prc');
    if (old) old.remove();
    if (motionOff() || !el.animate) { el.classList.add('printed-done'); return null; }
    var rows = opts.rows || 7, total = opts.ms || 950, per = total / rows;
    var cover = document.createElement('div');
    cover.className = 'prc' + (opts.flat ? ' prc--flat' : '');
    if (opts.color) cover.style.setProperty('--cv', opts.color);
    var strips = [];
    for (var i = 0; i < rows; i++) {
      var s = document.createElement('div');
      s.className = 'prc__row';
      s.style.top = (i * 100 / rows) + '%';
      s.style.height = (100 / rows + .6) + '%';
      cover.appendChild(s); strips.push(s);
    }
    var nz = document.createElement('div');
    nz.className = 'prc__nz';
    cover.appendChild(nz);
    el.appendChild(cover);
    el.classList.add('has-cover');
    cover.run = function () {
      var w = el.clientWidth, h = el.clientHeight;
      var last;
      strips.forEach(function (s, i) {
        var y = (i + .5) * h / rows, o = { duration: per, delay: i * per, fill: 'forwards', easing: 'linear' };
        s.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 100% 0 0)' }], o);
        last = nz.animate([{ transform: 'translate(' + w + 'px,' + y + 'px)' }, { transform: 'translate(0px,' + y + 'px)' }], o);
      });
      last.onfinish = function () { cover.remove(); el.classList.add('printed-done'); };
    };
    return cover;
  }

  /* reveals: .rv fades up; .pr images and products are printed in when they come into view */
  var covers = new Map();
  $$('.pr').forEach(function (el) {
    var r = el.getBoundingClientRect();
    if (printing && r.top < window.innerHeight) { el.classList.add('printed-done'); return; }   // the loader already printed it
    var c = printIn(el, { rows: 7, ms: 950 });
    if (c) covers.set(el, c);
  });
  var els = $$('.rv').concat(Array.from(covers.keys()));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var c = covers.get(e.target);
        if (c) { setTimeout(c.run, printing && !finished ? 1900 : 0); return; }
        e.target.classList.add('is-in');
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.15 });
    els.forEach(function (el) {
      if (el.classList.contains('rv')) {
        var sibs = el.parentElement ? $$('.rv', el.parentElement) : [];
        el.style.transitionDelay = Math.min(Math.max(sibs.indexOf(el), 0), 4) * 90 + 'ms';
      }
      io.observe(el);
    });
  } else {
    els.forEach(function (el) { el.classList.add('is-in'); var c = covers.get(el); if (c) c.run(); });
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
      var c = printIn(txt, { rows: 5, ms: 650, flat: true, color: getComputedStyle(plaque).getPropertyValue('--p').trim() });
      if (c) c.run();
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
