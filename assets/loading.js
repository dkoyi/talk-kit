/* Talk Kit loading screen controller. No dependencies.
   TalkKitLoading.play('full' | 'quick')  -> Promise, resolves when the intro has settled
   TalkKitLoading.exit()                  -> Promise, resolves when the logo has become the header logo
      Header targets (optional): [data-tk-logo-mark] and [data-tk-logo-word] on your real header logo. */
(function () {
  var root = document.querySelector('[data-tk-load]');
  if (!root) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var INTRO = { full: 2500, quick: 1500 };   /* long enough for all three faces to bounce once */
  var K = { full: 1, quick: .5 };
  var EASE = 'cubic-bezier(.65, 0, .35, 1)';
  var $ = function (s) { return root.querySelector(s); };
  var mark = $('.tk-load-mark'), word = $('.tk-load-word'), tag = $('.tk-load-tag'), bg = $('.tk-load-bg'), faces = $('.tk-load-faces');
  var busy = null;

  function cancelScripted() {
    root.getAnimations({ subtree: true }).forEach(function (a) {
      if (typeof CSSAnimation !== 'undefined' && a instanceof CSSAnimation) return;
      a.cancel();
    });
  }

  function play(mode) {
    mode = mode === 'quick' ? 'quick' : 'full';
    busy = null;
    cancelScripted();
    root.hidden = false;
    root.classList.remove('is-playing', 'is-full', 'is-quick');
    root.style.setProperty('--k', K[mode]);
    void root.offsetWidth;                                  /* restart every CSS animation */
    root.classList.add('is-playing', 'is-' + mode);
    return new Promise(function (r) { setTimeout(r, reduce.matches ? 0 : INTRO[mode]); });
  }

  /* where the header logo is; falls back to the top-left corner */
  function target(sel, fallback) {
    var el = document.querySelector(sel);
    if (el && !root.contains(el)) { var r = el.getBoundingClientRect(); if (r.width) return r; }
    return fallback;
  }
  function flip(el, from, to, inner) {
    /* inner: 1 when source and target share the same viewBox */
    var fw = from.width * inner, fh = from.height * inner;
    var s = Math.min(to.width / fw, to.height / fh);
    var dx = (to.left + to.width / 2) - (from.left + from.width / 2);
    var dy = (to.top + to.height / 2) - (from.top + from.height / 2);
    return 'translate(' + dx + 'px, ' + dy + 'px) scale(' + s + ')';
  }

  function exit() {
    if (busy) return busy;
    busy = new Promise(function (resolve) {
      var finish = function () { root.hidden = true; cancelScripted(); root.classList.remove('is-playing'); busy = null; resolve(); };
      if (reduce.matches) {
        root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: 'ease-out', fill: 'forwards' }).finished.then(finish);
        return;
      }
      var host = root.classList.contains('tk-load--contained') ? root.getBoundingClientRect() : { left: 0, top: 0 };
      var mr = mark.getBoundingClientRect(), wr = word.getBoundingClientRect();
      var mt = target('[data-tk-logo-mark]', { left: host.left + 24, top: host.top + 18, width: 40, height: 40 });
      var wt = target('[data-tk-logo-word]', { left: mt.left + 50, top: mt.top + 6, width: wr.width * .48, height: wr.height * .48 });
      var t = { duration: 560, easing: EASE, fill: 'forwards' };
      [tag, faces].forEach(function (n) { n.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(6px)' }], { duration: 200, easing: 'ease-in', fill: 'forwards' }); });
      mark.animate([{ transform: 'none', opacity: 1 }, { opacity: 1, offset: .7 }, { transform: flip(mark, mr, mt, 1), opacity: 0 }], t);
      word.animate([{ transform: 'none', opacity: 1 }, { opacity: 1, offset: .7 }, { transform: flip(word, wr, wt, 1), opacity: 0 }], t);
      bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 460, delay: 100, easing: 'ease-out', fill: 'forwards' })
        .finished.then(finish);
    });
    return busy;
  }

  window.TalkKitLoading = { play: play, exit: exit };
})();
