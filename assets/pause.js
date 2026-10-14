/* Talk Kit: "Take a pause" v2 (from the Claude Design handoff): grow-from-button transition + guided breathing.
   Plain JS, no dependencies. Any element with [data-pause-open] opens the pause;
   its [data-pause-icon] child is where the sun rises from; data-wash is its colour. */
(function () {
  var pz = document.querySelector('.pz');
  if (!pz) return;

  var IN = 4000, OUT = 6000, CYCLE = IN + OUT, BREATHS = 3, LEAD = 180;   /* ms */
  var EASE_OUT = 'cubic-bezier(.22, 1, .36, 1)', EASE_INOUT = 'cubic-bezier(.65, 0, .35, 1)';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var $ = function (s) { return pz.querySelector(s); };
  var el = {
    wash: $('.pz-wash'), scene: $('.pz-scene'), amb: $('.pz-ambient'), sky: $('.pz-sky'), lake: $('.pz-lake'),
    title: $('.pz-title'), close: $('.pz-close'), breath: $('.pz-breath'), fill: $('.pz-ring-fill'),
    say: $('.pz-say'), word: $('.pz-word'), count: $('.pz-count'), live: $('.pz-live'),
    cue: $('.pz-cue'), cueWord: $('.pz-cue-word'), cueCount: $('.pz-cue-count'),
    hint: $('.pz-hint'), label: $('.pz-progress-label'), dots: pz.querySelectorAll('.pz-dot'),
    end: $('.pz-end'), ready: $('.pz-ready'), again: $('.pz-again')
  };
  var raf = 0, t0 = 0, phase = '', breathIdx = -1, trigger = null, startTimer = 0, busy = false;
  var HINT_FIRST = 'Follow the sun. Breathe in as it grows, out as it shrinks.';
  var HINT_LATER = 'Keep following the sun.';

  /* ---------- breathing ---------- */
  function setPhase(p, instant) {
    phase = p;
    pz.classList.remove('is-in', 'is-out');
    void pz.offsetWidth;                                   /* restart the speck animations */
    pz.classList.add('is-' + p);
    var swap = function () {
      el.word.textContent = p; el.cueWord.textContent = p === 'in' ? 'Breathe in' : 'Breathe out';
      el.say.classList.remove('is-swap'); el.cue.classList.remove('is-swap');
    };
    if (instant || reduce.matches) swap();
    else { el.say.classList.add('is-swap'); el.cue.classList.add('is-swap'); setTimeout(swap, LEAD); }
    el.live.textContent = p === 'in' ? 'Breathe in' : 'Breathe out';
    if (!instant && !reduce.matches && navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
  }
  function setBreath(b) {
    breathIdx = b;
    for (var i = 0; i < el.dots.length; i++) {
      el.dots[i].classList.toggle('is-done', i < b);
      el.dots[i].classList.toggle('is-now', i === b);
    }
    el.label.textContent = 'Breath ' + (b + 1) + ' of ' + BREATHS;
    var text = b === 0 ? HINT_FIRST : HINT_LATER;
    if (el.hint.textContent !== text) {
      el.hint.classList.add('is-swap');
      setTimeout(function () { el.hint.textContent = text; el.hint.classList.remove('is-swap'); }, reduce.matches ? 0 : 400);
    }
  }
  /* draw everything for time e (ms since the breathing started) */
  function render(e, instant) {
    var b = Math.min(BREATHS - 1, Math.floor(e / CYCLE)), pt = e - b * CYCLE, isIn = pt < IN;
    var steps = isIn ? IN / 1000 : OUT / 1000;
    var prog = isIn ? pt / IN : (pt - IN) / OUT;
    if (reduce.matches) prog = Math.floor(prog * steps) / steps;          /* ring moves in whole seconds */
    /* ring fills clockwise while breathing in, then empties clockwise while breathing out: never jumps */
    el.fill.style.strokeDashoffset = isIn ? 100 * (1 - prog) : -100 * prog;
    el.count.textContent = el.cueCount.textContent = isIn ? Math.ceil((IN - pt) / 1000) : Math.ceil((CYCLE - pt) / 1000);
    var ahead = e + LEAD < BREATHS * CYCLE ? ((pt + LEAD) % CYCLE < IN ? 'in' : 'out') : phase;
    if (instant) ahead = isIn ? 'in' : 'out';
    if (ahead !== phase) setPhase(ahead, instant);
    if (b !== breathIdx) setBreath(b);
  }
  function tick() {
    /* performance.now(), not the frame stamp: a frame can start just before t0 */
    var e = Math.max(0, performance.now() - t0);
    if (e >= BREATHS * CYCLE) { finish(); return; }
    render(e);
    raf = requestAnimationFrame(tick);
  }
  function startBreathing() {
    cancelAnimationFrame(raf);
    pz.classList.remove('is-done', 'is-running', 'is-in', 'is-out');
    phase = ''; breathIdx = -1;
    void pz.offsetWidth;                                   /* restart the CSS breath */
    pz.classList.add('is-running');
    t0 = performance.now();
    render(0, true);
    raf = requestAnimationFrame(tick);
  }
  function resetBreathing() {
    cancelAnimationFrame(raf); clearTimeout(startTimer);
    pz.classList.remove('is-done', 'is-running', 'is-out');
    pz.classList.add('is-in');
    phase = 'in'; breathIdx = -1;
    el.word.textContent = 'in'; el.count.textContent = el.cueCount.textContent = '4'; el.cueWord.textContent = 'Breathe in'; el.fill.style.strokeDashoffset = 100;
    el.hint.textContent = HINT_FIRST; setBreath(0);
  }
  function finish() {
    cancelAnimationFrame(raf);
    var hadFocus = document.activeElement === el.end;
    pz.classList.remove('is-running', 'is-in', 'is-out');
    pz.classList.add('is-done');
    el.fill.style.strokeDashoffset = 0;
    for (var i = 0; i < el.dots.length; i++) { el.dots[i].classList.add('is-done'); el.dots[i].classList.remove('is-now'); }
    el.label.textContent = BREATHS + ' breaths';
    el.live.textContent = 'Your pause is complete.';
    if (hadFocus) el.ready.focus();
  }

  /* ---------- transition geometry ---------- */
  function rectOf(btn) {                                /* the button's box, relative to the overlay */
    var r = btn.getBoundingClientRect(), P = pz.getBoundingClientRect();
    var rad = getComputedStyle(btn).borderTopLeftRadius;
    return 'inset(' + (r.top - P.top) + 'px ' + (P.right - r.right) + 'px ' + (P.bottom - r.bottom) + 'px ' + (r.left - P.left) + 'px round ' + rad + ')';
  }
  /* The overlay covers the whole screen; the page underneath (nav bar, scroll position, scrollbar) is left untouched. */
  function placeBelowHeader() { pz.style.top = '0px'; }
  function sunFrom(btn) {                                 /* transform that puts the resting sun on the button's icon */
    var ic = (btn.querySelector('[data-pause-icon]') || btn).getBoundingClientRect();
    var b = el.breath.getBoundingClientRect();
    var D = b.width / 1.14, rest = parseFloat(getComputedStyle(pz).getPropertyValue('--rest')) || .76;
    var k = ic.width / (D * rest);
    var dx = (ic.left + ic.width / 2) - (b.left + b.width / 2), dy = (ic.top + ic.height / 2) - (b.top + b.height / 2);
    return 'translate(' + dx + 'px, ' + dy + 'px) scale(' + k + ')';
  }
  function cancelAll() { pz.getAnimations({ subtree: true }).forEach(function (a) { if (a instanceof CSSAnimation) return; a.cancel(); }); }

  /* ---------- open: the button grows into the dawn ---------- */
  function open(btn) {
    if (busy || !pz.hidden) return;
    busy = true; trigger = btn;
    document.dispatchEvent(new CustomEvent('talkkit:pause-open'));   /* the app stops any voice line */
    pz.style.setProperty('--wash', btn.getAttribute('data-wash') || '#265c4c');
    resetBreathing();
    placeBelowHeader();
    el.wash.style.opacity = '1';
    pz.style.clipPath = pz.style.webkitClipPath = 'inset(50%)';   /* nothing visible until measured */
    pz.hidden = false;
    pz.style.clipPath = pz.style.webkitClipPath = rectOf(btn);    /* show only the button's shape at first */
    var pill = document.getElementById('pause-session'); if (pill) pill.style.visibility = 'hidden';   /* the pill waits underneath */
    var done = function () { busy = false; el.end.focus({ preventScroll: true }); if (!window.__pzNoAutoStart) startBreathing(); };
    if (reduce.matches) {
      pz.style.clipPath = pz.style.webkitClipPath = ''; el.wash.style.opacity = '';
      pz.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' }).finished.then(done, function () {});
      return;
    }
    /* iPhone Safari paints the dawn scene slowly the first time; wait for that paint (two
       frames) so the grow animation is actually seen instead of finishing before it shows. */
    void pz.offsetWidth;
    var started = false, go = function () { if (!started) { started = true; grow(btn, done); } };
    requestAnimationFrame(function () { requestAnimationFrame(go); });
    setTimeout(go, 120);                                   /* backup if frames are paused (background tab) */
  }
  function grow(btn, done) {
    var sun = sunFrom(btn);
    var P = pz.getBoundingClientRect(), r = btn.getBoundingClientRect();
    /* A golden circle grows out of the button until it covers the screen. Only transform and
       opacity animate, so the GPU does the work and it stays smooth on phones. */
    var cx = r.left + r.width / 2 - P.left, cy = r.top + r.height / 2 - P.top;
    var R = Math.ceil(Math.hypot(Math.max(cx, P.width - cx), Math.max(cy, P.height - cy))) + 2;
    var w = el.wash.style;
    w.inset = 'auto'; w.left = (cx - R) + 'px'; w.top = (cy - R) + 'px'; w.width = w.height = (2 * R) + 'px';
    w.borderRadius = '50%'; w.opacity = '1'; w.willChange = 'transform, opacity';
    pz.style.background = 'transparent';
    pz.style.clipPath = pz.style.webkitClipPath = '';
    var s0 = Math.max(r.width, r.height) / (2 * R);
    /* 1. the circle grows from the button to fill the screen           0–620ms  */
    el.wash.animate([{ transform: 'scale(' + s0 + ')' }, { transform: 'scale(1)' }], { duration: 620, easing: EASE_OUT, fill: 'both' });
    /* 2. the dawn fades in beneath it, then the gold dissolves         300–1000ms */
    el.scene.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, delay: 260, easing: 'ease-out', fill: 'backwards' });
    el.wash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 460, delay: 430, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' });
    /* 3. the sun rises from the button's icon to its place              60–1040ms */
    el.breath.animate([{ transform: sun }, { transform: 'none' }], { duration: 980, delay: 60, easing: EASE_OUT, fill: 'backwards' });
    /* 4. lake, details and words settle in                             420–1080ms */
    el.lake.animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: 600, easing: 'ease-out', fill: 'backwards' });
    el.amb.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 520, fill: 'backwards' });
    [el.title, el.close].forEach(function (n) { n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 640, easing: 'ease-out', fill: 'backwards' }); });
    startTimer = setTimeout(function () {
      /* put the wash back to full-screen for the closing animation */
      el.wash.getAnimations().forEach(function (a) { a.cancel(); });
      ['inset', 'left', 'top', 'width', 'height', 'borderRadius', 'opacity', 'willChange'].forEach(function (k) { w[k] = ''; });
      pz.style.background = '';
      done();
    }, 1100);
  }


  /* ---------- close: the scene folds back into the button ---------- */
  function close() {
    if (busy || pz.hidden) return;
    busy = true; cancelAnimationFrame(raf); clearTimeout(startTimer);
    var btn = trigger;
    var closed = false;
    var done = function () {
      if (closed) return; closed = true;          /* runs once: animation end or the timer backup */
      cancelAll(); pz.hidden = true; pz.classList.remove('is-running', 'is-done', 'is-in', 'is-out');
      var pill = document.getElementById('pause-session'); if (pill) pill.style.visibility = ''; busy = false;
      if (btn) btn.focus({ preventScroll: true });
    };
    if (reduce.matches || !btn) {
      pz.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-in', fill: 'forwards' }).finished.then(done, function () {});
      setTimeout(done, 240);
      return;
    }
    var to = rectOf(btn), sun = sunFrom(btn);
    [el.title, el.close, el.lake, el.amb].forEach(function (n) { n.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-in', fill: 'forwards' }); });
    el.breath.animate([{ transform: 'none' }, { transform: sun }], { duration: 680, delay: 60, easing: 'cubic-bezier(.55, 0, .7, .2)', fill: 'forwards' });
    el.wash.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 460, delay: 260, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' });
    pz.animate([{ clipPath: 'inset(0px 0px 0px 0px round 0px)', webkitClipPath: 'inset(0px 0px 0px 0px round 0px)' }, { clipPath: to, webkitClipPath: to }], { duration: 760, delay: 160, easing: EASE_INOUT, fill: 'forwards' })
      .finished.then(done, function () {});
    setTimeout(done, 960);                        /* backup if animations are paused (background tab) */
  }

  /* ---------- static states for design review: <div class="pz" data-static="in|out|done" data-t="2600"> ---------- */
  function showStatic(state, t) {
    pz.hidden = false;
    if (state === 'done') { resetBreathing(); finish(); return; }
    pz.classList.add('is-running');
    render(t, true);
    var sec = -(t % CYCLE) / 1000 + 's';
    pz.querySelectorAll('.pz-sun, .pz-halo, .pz-reflect, .pz-ripple').forEach(function (n) { n.style.animationDelay = sec; n.style.animationPlayState = 'paused'; });
    var into = ((t % CYCLE) < IN ? (t % CYCLE) : (t % CYCLE) - IN) / 1000;
    pz.querySelectorAll('.pz-speck').forEach(function (n) { n.style.animationDelay = 'calc(var(--d) - ' + into + 's)'; n.style.animationPlayState = 'paused'; });
  }

  document.addEventListener('click', function (ev) {
    var opener = ev.target.closest('[data-pause-open]');
    if (opener) { ev.preventDefault(); open(opener); return; }
    if (ev.target.closest('.pz-close, .pz-end, .pz-ready')) { ev.preventDefault(); close(); return; }
    if (ev.target.closest('.pz-again')) { ev.preventDefault(); startBreathing(); el.end.focus(); }
  });
  document.addEventListener('keydown', function (ev) {
    if (pz.hidden || pz.hasAttribute('data-static')) return;
    if (ev.key === 'Escape') { close(); return; }
    /* the page behind must not scroll while the pause is open */
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].indexOf(ev.key) >= 0 && !ev.target.closest('button, a, input, textarea, select')) ev.preventDefault();
  });
  ['wheel', 'touchmove'].forEach(function (type) { pz.addEventListener(type, function (ev) { ev.preventDefault(); }, { passive: false }); });
  window.addEventListener('resize', function () { if (!pz.hidden) placeBelowHeader(); });

  if (pz.hasAttribute('data-static')) showStatic(pz.getAttribute('data-static'), +pz.getAttribute('data-t') || 0);
  /* Pre-paint the dawn scene into a bitmap image while the browser is idle. Its SVG filters
     are expensive to compute; done once up front, the first "Take a pause" opens smoothly. */
  function prepaintScene() {
    var svg = el.scene; if (!svg || svg.tagName.toLowerCase() !== 'svg' || !window.Blob) return;
    var copy = svg.cloneNode(true);
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    if (matchMedia('(max-width: 767px)').matches) {             /* phones skip the two heaviest filters */
      copy.querySelectorAll('[filter="url(#pz-paint)"], [filter="url(#pz-grain)"]').forEach(function (n) { n.removeAttribute('filter'); });
      var grain = copy.querySelector('rect[width="1440"][height="900"]'); if (grain) grain.remove();
    }
    var url = URL.createObjectURL(new Blob([copy.outerHTML], { type: 'image/svg+xml' }));
    var img = new Image(); img.className = 'pz-scene'; img.alt = ''; img.setAttribute('aria-hidden', 'true'); img.decoding = 'async'; img.src = url;
    (img.decode ? img.decode() : Promise.resolve()).then(function () {
      if (!pz.hidden) return;                                     /* never swap while it is showing */
      svg.replaceWith(img); el.scene = img;
    }, function () { URL.revokeObjectURL(url); });
  }
  var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 1); };
  window.addEventListener('load', function () { setTimeout(function () { idle(prepaintScene, { timeout: 2500 }); }, 1800); });

  window.TalkKitPause = { open: open, close: close, start: startBreathing };
})();
