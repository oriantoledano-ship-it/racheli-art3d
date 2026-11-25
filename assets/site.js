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

  /* ---------- the printer loader ----------
     The head prints the page right to left, row after row from the top, at a calm pace.
     Only transform and opacity are animated, so everything runs on the compositor at 60fps. */
  var printing = root.classList.contains('printing');
  var loader = $('#loader');
  var finished = false;
  var CALM = 'cubic-bezier(.45, .05, .25, 1)';
  function finishLoader() {
    if (finished) return;
    finished = true;
    root.classList.remove('printing');
    if (loader) loader.remove();
    try { sessionStorage.setItem('racheli-printed', '1'); } catch (e) {}
    document.body.classList.add('is-live');
  }
  root.setAttribute('data-ready', '1');

  function runLoader() {
    var W = window.innerWidth, H = window.innerHeight;
    var phone = W < 700;
    var rows = phone ? 5 : 6, rh = Math.ceil(H / rows);
    var pass = phone ? 400 : 430, back = 170, cycle = pass + back;
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
    var t0 = 200, keys = [], railKeys = [], total = t0 + rows * cycle;
    // one keyframe track for the head and one for the rail: glide in, print a row right to left, glide back up a row
    var at = function (ms) { return Math.min(ms / total, 1); };
    keys.push({ offset: 0, transform: 'translate(' + (W + 60) + 'px,' + (rh / 2) + 'px)' });
    railKeys.push({ offset: 0, transform: 'translateY(' + (rh / 2 - 48) + 'px)' });
    strips.forEach(function (r, i) {
      var y = i * rh + rh / 2, start = t0 + i * cycle + (i ? back : 0);
      keys.push({ offset: at(start), transform: 'translate(' + W + 'px,' + y + 'px)', easing: CALM });
      keys.push({ offset: at(start + pass), transform: 'translate(0px,' + y + 'px)', easing: CALM });
      railKeys.push({ offset: at(start - (i ? back : 0)), transform: 'translateY(' + (y - 48) + 'px)', easing: CALM });
      railKeys.push({ offset: at(start), transform: 'translateY(' + (y - 48) + 'px)' });
      r.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
                { duration: pass, delay: start, fill: 'both', easing: CALM });
    });
    keys.push({ offset: 1, transform: 'translate(-70px,' + (H - rh / 2) + 'px)' });
    railKeys.push({ offset: 1, transform: 'translateY(' + (H - rh / 2 - 48) + 'px)' });
    head.animate(keys, { duration: total, fill: 'forwards' });
    rail.animate(railKeys, { duration: total, fill: 'forwards' });
    var out = loader.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, delay: total - 40, fill: 'forwards', easing: 'ease-out' });
    out.onfinish = finishLoader;
    setTimeout(finishLoader, total + 2200);
  }

  if (printing && loader && loader.animate) {
    // let fonts and the first images settle before the head starts, so the first frames stay smooth
    var hero = $('.pr--hero img');
    var ready = Promise.all([
      document.fonts && document.fonts.ready,
      hero && hero.decode ? hero.decode().catch(function () {}) : null
    ]);
    var started = false, go = function () { if (!started) { started = true; runLoader(); } };
    ready.then(function () { requestAnimationFrame(function () { requestAnimationFrame(go); }); });
    setTimeout(go, 900);
  } else {
    root.classList.remove('printing');
    if (loader) loader.remove();
    setTimeout(function () { document.body.classList.add('is-live'); }, 60);
  }

  /* ---------- raster print-in: rows from the top, each printed right to left (transform only) ---------- */
  function printIn(el, opts) {
    opts = opts || {};
    var old = el.querySelector(':scope > .prc');
    if (old) old.remove();
    if (motionOff() || !el.animate) { el.classList.add('printed-done'); return null; }
    var rows = opts.rows || 6, pass = opts.pass || 300, back = opts.back || 110;
    var cover = document.createElement('div');
    cover.className = 'prc';
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
    cover.run = function (rect) {
      var w = rect ? rect.width : el.clientWidth, h = rect ? rect.height : el.clientHeight, cycle = pass + back, total = rows * cycle;
      var keys = [{ offset: 0, transform: 'translate(' + (w + 30) + 'px,' + (h / rows / 2) + 'px)' }];
      strips.forEach(function (s, i) {
        var y = (i + .5) * h / rows, start = i * cycle + (i ? back : 0);
        keys.push({ offset: Math.min(start / total, 1), transform: 'translate(' + w + 'px,' + y + 'px)', easing: CALM });
        keys.push({ offset: Math.min((start + pass) / total, 1), transform: 'translate(0px,' + y + 'px)', easing: CALM });
        s.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: pass, delay: start, fill: 'both', easing: CALM });
      });
      if (keys[keys.length - 1].offset < 1) keys.push({ offset: 1, transform: keys[keys.length - 1].transform });
      var head = nz.animate(keys, { duration: total + back, fill: 'forwards' });
      var fade = nz.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: total, fill: 'forwards' });
      fade.onfinish = function () { cover.remove(); el.classList.add('printed-done'); };
    };
    return cover;
  }

  /* ---------- text prints like a 3D printer: from the bottom up, one layer at a time ---------- */
  var TEXT = '.hero__title .ln, .hero__lede, .h2, .lede, .card h3, .prod h3, .steps h3, .cta p';
  function bgOf(el) {
    for (var n = el; n && n !== document.documentElement; n = n.parentElement) {
      var c = getComputedStyle(n).backgroundColor;
      if (c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c)) return c;
    }
    return getComputedStyle(document.body).backgroundColor;
  }
  function printText(el, opts) {
    opts = opts || {};
    var old = el.querySelector(':scope > .ptc');
    if (old) old.remove();
    if (motionOff() || !el.animate) { el.classList.add('pt-ready'); return null; }
    var cover = document.createElement('span');
    cover.className = 'ptc';
    cover.style.background = opts.color || bgOf(el);
    var line = document.createElement('i');
    cover.appendChild(line);
    el.appendChild(cover);
    el.classList.add('pt-ready');
    cover.run = function (rect) {
      var h = rect ? rect.height : el.offsetHeight;   // the observer's rect avoids a forced layout mid-scroll
      var layers = Math.max(10, Math.min(40, Math.round(h / 4)));
      var dur = Math.max(1500, Math.min(2900, 1100 + h * 10));
      var ease = 'steps(' + layers + ', end)';
      cover.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], { duration: dur, easing: ease, fill: 'forwards' });
      line.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(' + (-h) + 'px)', opacity: 1 }], { duration: dur, easing: ease, fill: 'forwards' });
      var fade = line.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, delay: dur, fill: 'forwards' });
      fade.onfinish = function () { cover.remove(); };
    };
    return cover;
  }
  var texts = new Map();
  $$(TEXT).forEach(function (el) {
    el.classList.remove('rv');
    var r = el.getBoundingClientRect();
    if (printing && r.top < window.innerHeight) { el.classList.add('pt-ready'); return; }   // printed by the loader
    var c = printText(el);
    if (c) texts.set(el, c);
  });

  /* reveals: .rv fades up; .pr images and products are printed in when they come into view */
  var covers = new Map();
  $$('.pr').forEach(function (el) {
    var r = el.getBoundingClientRect();
    if (printing && r.top < window.innerHeight) { el.classList.add('printed-done'); return; }   // the loader already printed it
    var c = printIn(el, { rows: 6, pass: 320, back: 120 });
    if (c) covers.set(el, c);
  });
  var els = $$('.rv').concat(Array.from(covers.keys()), Array.from(texts.keys()));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var t = texts.get(e.target);
        if (t) {
          var block = e.target.closest('header, .hero__copy, .try__copy, .about__copy, .card, .prod, .steps li, .cta__in') || e.target.parentElement;
          var idx = Array.from(block.querySelectorAll(TEXT)).indexOf(e.target);
          var tr = e.boundingClientRect;
          setTimeout(function () { t.run(tr); }, (printing && !finished ? 4200 : 80) + Math.max(idx, 0) * 650);
          return;
        }
        var c = covers.get(e.target);
        if (c) { var cr = e.boundingClientRect; setTimeout(function () { c.run(cr); }, printing && !finished ? 4200 : 120); return; }
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
  var stuck = null;
  var onScroll = function () { var s = window.scrollY > 10; if (s !== stuck) { stuck = s; nav.classList.toggle('is-stuck', s); } };
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
      var c = printText(txt, { color: getComputedStyle(plaque).getPropertyValue('--p').trim() });
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
