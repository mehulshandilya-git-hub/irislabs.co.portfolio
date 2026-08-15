/*!
 * Iris Labs — motion.js
 * Reusable, dependency-free cinematic animation system.
 * All animations are rAF-driven, passive-listener, GPU-friendly and
 * automatically disabled for touch devices and prefers-reduced-motion.
 */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  var root = document.documentElement;

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ------------------------- page load ------------------------- */
  function initLoad() {
    if (prefersReduced) {
      document.body.classList.add('is-loaded');
      root.classList.add('reduced-motion');
      return;
    }
    var done = false;
    function go() {
      if (done) return;
      done = true;
      requestAnimationFrame(function () { document.body.classList.add('is-loaded'); });
    }
    if (document.readyState === 'complete') { go(); }
    else {
      window.addEventListener('load', go);
      setTimeout(go, 1600);
    }
  }

  /* ---------------------- scroll progress ---------------------- */
  function initProgress() {
    var el = document.querySelector('[data-progress]');
    if (!el) return;
    var ticking = false;
    function update() {
      ticking = false;
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      el.style.transform = 'scaleX(' + (max > 0 ? h.scrollTop / max : 0) + ')';
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ----------------------------- nav ---------------------------- */
  function initNav() {
    var nav = document.querySelector('[data-nav]');
    if (nav) {
      var markScrolled = function () { nav.classList.toggle('scrolled', window.scrollY > 24); };
      window.addEventListener('scroll', markScrolled, { passive: true });
      markScrolled();
    }

    var toggle = document.querySelector('[data-nav-toggle]');
    var menu = document.querySelector('[data-nav-menu]');
    if (toggle && menu) {
      function close() {
        document.body.classList.remove('menu-open');
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
      toggle.addEventListener('click', function () {
        var open = menu.classList.toggle('is-open');
        document.body.classList.toggle('menu-open', open);
        toggle.setAttribute('aria-expanded', String(open));
      });
      menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
      window.addEventListener('resize', function () { if (window.innerWidth > 900) close(); });
    }

    var links = document.querySelectorAll('[data-nav-link]');
    if (links.length) {
      var sections = [];
      links.forEach(function (l) {
        var id = l.getAttribute('href');
        if (id && id.charAt(0) === '#' && id.length > 1) {
          var s = document.querySelector(id);
          if (s) sections.push({ link: l, section: s });
        }
      });
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            sections.forEach(function (o) {
              o.link.classList.toggle('is-active', o.section === entry.target);
            });
          }
        });
      }, { rootMargin: '-38% 0px -55% 0px' });
      sections.forEach(function (o) { spy.observe(o.section); });
    }
  }

  /* --------------------------- reveals --------------------------- */
  function initReveals() {
    var els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;
    if (prefersReduced) {
      els.forEach(function (el) { el.classList.add('in-view'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var d = el.getAttribute('data-reveal-delay');
          if (d) el.style.transitionDelay = d + 'ms';
          el.classList.add('in-view');
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------- split text reveal ----------------------- */
  function initSplitText() {
    var els = document.querySelectorAll('[data-split]');
    if (!els.length) return;
    if (prefersReduced) return;

    els.forEach(function (el) {
      if (el.getAttribute('data-split-done')) return;
      el.setAttribute('data-split-done', '1');
      var frag = document.createDocumentFragment();
      var nodes = Array.prototype.slice.call(el.childNodes);
      var wordIndex = 0;
      nodes.forEach(function (node) {
        if (node.nodeType === 3) {
          node.textContent.split(/(\s+)/).forEach(function (chunk) {
            if (!chunk) return;
            if (/^\s+$/.test(chunk)) { frag.appendChild(document.createTextNode(chunk)); return; }
            frag.appendChild(makeWord(chunk, wordIndex++));
          });
        } else if (node.nodeType === 1) {
          if (node.tagName === 'BR') {
            frag.appendChild(document.createElement('br'));
          } else {
            frag.appendChild(makeWord(node, wordIndex++));
            frag.appendChild(document.createTextNode(' '));
          }
        }
      });
      el.textContent = '';
      el.appendChild(frag);
    });

    function makeWord(content, i) {
      var w = document.createElement('span');
      w.className = 'sw';
      var inner = document.createElement('span');
      inner.className = 'sw-inner';
      if (content.nodeType === 1) inner.appendChild(content);
      else inner.textContent = content;
      inner.style.transitionDelay = (i * 42) + 'ms';
      w.appendChild(inner);
      return w;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* --------------------------- count-up --------------------------- */
  function initCountUp() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    function run(el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      var dur = parseInt(el.getAttribute('data-duration') || '1500', 10);
      var pad = parseInt(el.getAttribute('data-pad') || '0', 10);
      var prefix = el.getAttribute('data-prefix') || '';
      var suffix = el.getAttribute('data-suffix') || '';
      var t0 = null;
      function frame(ts) {
        if (t0 === null) t0 = ts;
        var p = clamp((ts - t0) / dur, 0, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var val = String(Math.round(target * eased));
        if (pad) val = val.padStart(pad, '0');
        el.textContent = prefix + val + suffix;
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { run(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* --------------------------- parallax --------------------------- */
  function initParallax() {
    var els = document.querySelectorAll('[data-parallax]');
    if (!els.length || prefersReduced || isTouch) return;
    var ticking = false;
    function update() {
      ticking = false;
      var vh = window.innerHeight;
      els.forEach(function (el) {
        var speed = parseFloat(el.getAttribute('data-parallax') || '0.2');
        var rect = el.getBoundingClientRect();
        var offset = (rect.top + rect.height / 2 - vh / 2) * speed;
        el.style.transform = 'translate3d(0, ' + offset.toFixed(1) + 'px, 0)';
      });
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* --------------------------- magnetic --------------------------- */
  function initMagnetic() {
    var els = document.querySelectorAll('[data-magnetic]');
    if (!els.length || isTouch || prefersReduced) return;
    els.forEach(function (el) {
      var strength = parseFloat(el.getAttribute('data-magnetic') || '0.3');
      var cx = 0, cy = 0, curX = 0, curY = 0, raf = null;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        cx = e.clientX - (r.left + r.width / 2);
        cy = e.clientY - (r.top + r.height / 2);
        if (!raf) raf = requestAnimationFrame(tick);
      });
      el.addEventListener('pointerleave', function () {
        cx = 0; cy = 0;
        if (!raf) raf = requestAnimationFrame(tick);
      });
      function tick() {
        raf = null;
        curX = lerp(curX, cx * strength, 0.16);
        curY = lerp(curY, cy * strength, 0.16);
        el.style.transform = 'translate3d(' + curX.toFixed(1) + 'px, ' + curY.toFixed(1) + 'px, 0)';
        if (Math.abs(curX - cx * strength) > 0.3 || Math.abs(curY - cy * strength) > 0.3) {
          raf = requestAnimationFrame(tick);
        }
      }
    });
  }

  /* ---------------------------- tilt ---------------------------- */
  function initTilt() {
    var els = document.querySelectorAll('[data-tilt]');
    if (!els.length || isTouch || prefersReduced) return;
    els.forEach(function (el) {
      var max = parseFloat(el.getAttribute('data-tilt') || '4');
      var tarX = 0, tarY = 0, curX = 0, curY = 0, raf = null;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        tarX = -py * max;
        tarY = px * max;
        if (!raf) raf = requestAnimationFrame(tick);
      });
      el.addEventListener('pointerleave', function () {
        tarX = 0; tarY = 0;
        if (!raf) raf = requestAnimationFrame(tick);
      });
      function tick() {
        raf = null;
        curX = lerp(curX, tarX, 0.14);
        curY = lerp(curY, tarY, 0.14);
        el.style.transform = 'perspective(900px) rotateX(' + curX.toFixed(2) + 'deg) rotateY(' + curY.toFixed(2) + 'deg)';
        if (Math.abs(curX - tarX) > 0.04 || Math.abs(curY - tarY) > 0.04) {
          raf = requestAnimationFrame(tick);
        }
      }
    });
  }

  /* --------------------------- spotlight --------------------------- */
  function initSpotlight() {
    var els = document.querySelectorAll('[data-spotlight]');
    if (!els.length || isTouch) return;
    els.forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ------------------------ gmail compose popup ------------------------ */
  function initGmailCompose() {
    var els = document.querySelectorAll('[data-gmail]');
    if (!els.length) return;
    els.forEach(function (el) {
      el.addEventListener('click', function (e) {
        var to = el.getAttribute('data-gmail');
        if (!to) return;
        e.preventDefault();
        var subject = encodeURIComponent(el.getAttribute('data-subject') || 'Project Inquiry');
        var url = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(to) + '&su=' + subject;
        window.open(url, '_blank', 'noopener,noreferrer');
      });
    });
  }

  /* --------------------------- particles --------------------------- */
  function initParticles() {
    var canvas = document.querySelector('[data-particles]');
    if (!canvas || isTouch || prefersReduced) return;
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var particles = [];
    var rafId = null;

    function resize() {
      var w = canvas.clientWidth;
      var h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.min(70, Math.max(18, Math.floor((w * h) / 26000)));
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.6 + 0.4,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          a: Math.random() * 0.5 + 0.12
        });
      }
    }

    function tick() {
      var w = canvas.clientWidth;
      var h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -4) p.x = w + 4;
        if (p.x > w + 4) p.x = -4;
        if (p.y < -4) p.y = h + 4;
        if (p.y > h + 4) p.y = -4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(201,185,154,' + p.a.toFixed(3) + ')';
        ctx.fill();
      }
      rafId = requestAnimationFrame(tick);
    }

    resize();
    tick();
    window.addEventListener('resize', resize);
  }

  /* ---------------------------- timeline ---------------------------- */
  function initTimeline() {
    var line = document.querySelector('[data-timeline-fill]');
    var wrap = document.querySelector('[data-timeline]');
    if (!line || !wrap) return;
    var ticking = false;
    function update() {
      ticking = false;
      var r = wrap.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = clamp((vh * 0.55 - r.top) / r.height, 0, 1);
      line.style.transform = 'scaleY(' + p.toFixed(3) + ')';
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ----------------------- work horizontal track ----------------------- */
  function initWorkTrack() {
    var section = document.querySelector('[data-work-section]');
    var track = document.querySelector('[data-work-track]');
    if (!section || !track) return;
    if (isTouch || prefersReduced || window.innerWidth < 1025) return;
    var ticking = false;
    function update() {
      ticking = false;
      var vh = window.innerHeight;
      var total = section.offsetHeight - vh;
      var top = section.getBoundingClientRect().top;
      var p = clamp(-top / total, 0, 1);
      var maxX = track.scrollWidth - window.innerWidth + 96;
      if (maxX < 0) return;
      track.style.transform = 'translate3d(' + (-p * maxX).toFixed(1) + 'px, 0, 0)';
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ------------------------------ FAQ ------------------------------ */
  function initFaq() {
    var btns = document.querySelectorAll('[data-faq]');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.faq-item');
        if (!item) return;
        var open = item.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(open));
        var panel = item.querySelector('[data-faq-panel]');
        if (panel) panel.setAttribute('aria-hidden', String(!open));
      });
    });
  }

  /* ----------------------------- cursor ----------------------------- */
  function initCursor() {
    if (isTouch || prefersReduced) return;
    var dot = document.createElement('div');
    dot.className = 'cursor-dot';
    var ring = document.createElement('div');
    ring.className = 'cursor-ring';
    var label = document.createElement('span');
    label.className = 'cursor-label';
    ring.appendChild(label);
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.body.classList.add('has-cursor');

    var mx = -100, my = -100, dx = -100, dy = -100, raf = null;
    window.addEventListener('pointermove', function (e) {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = 'translate3d(' + mx + 'px, ' + my + 'px, 0) translate(-50%, -50%)';
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });

    function tick() {
      raf = null;
      dx = lerp(dx, mx, 0.2);
      dy = lerp(dy, my, 0.2);
      ring.style.transform = 'translate3d(' + dx + 'px, ' + dy + 'px, 0) translate(-50%, -50%)';
      if (Math.abs(dx - mx) > 0.4 || Math.abs(dy - my) > 0.4) raf = requestAnimationFrame(tick);
    }

    var hot = 'a, button, [data-cursor]';
    document.addEventListener('pointerover', function (e) {
      var t = e.target && e.target.closest ? e.target.closest(hot) : null;
      document.body.classList.toggle('is-link', !!t);
      var c = t && t.getAttribute ? t.getAttribute('data-cursor') : null;
      document.body.classList.toggle('is-cursor-text', c === 'view' || c === 'talk');
      if (c === 'view') label.textContent = 'VIEW';
      else if (c === 'talk') label.textContent = "LET'S TALK";
      else label.textContent = '';
    });

    document.addEventListener('pointerout', function (e) {
      var out = !e.relatedTarget;
      dot.style.opacity = out ? '0' : '1';
      ring.style.opacity = out ? '0' : '1';
    });
  }

  /* ------------------------------ boot ------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    initLoad();
    initProgress();
    initNav();
    initReveals();
    initSplitText();
    initCountUp();
    initParallax();
    initMagnetic();
    initTilt();
    initSpotlight();
    initParticles();
    initTimeline();
    initWorkTrack();
    initFaq();
    initGmailCompose();
    initCursor();
  });
})();
