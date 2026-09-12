/* presenter-kit.js — drop-in presenter view for any project page.
   One tag: <script src="presenter-kit.js"></script> (before or after React — it waits).
   P — opens a clean mirror window (same URL + ?present=1) that follows slides live.
   N — toggles an editable speaker-notes panel (reads data-speaker-notes off deck-stage slides;
       plain pages get a free-form pad; edits persist in localStorage).
   State sync — window.React.useState is wrapped so every JSON-serializable piece of hook
   state broadcasts from the presenter window and applies in the mirror automatically.
   No deck-stage? P still mirrors scroll position. Same-browser only (BroadcastChannel). */
(function () {
  if (!('BroadcastChannel' in window) || window.__presenterKit) return;
  window.__presenterKit = true;
  var isMirror = /[?&]present(=|&|$)/.test(location.search) || location.hash.indexOf('present') >= 0;
  var CH = 'pk:' + location.pathname;
  var bc = new BroadcastChannel(CH);
  var stage = function () { return document.querySelector('deck-stage'); };

  /* ── automatic React useState sync ──
     No extra hooks are injected (safe to patch at any time, even after first render);
     hook instances are identified by their setter (stable in React) and numbered in
     first-seen order, which matches across two windows running the same page. */
  var registry = {}, ids = typeof WeakMap === 'function' ? new WeakMap() : null,
      pending = {}, lastJson = {}, cache = {}, nextId = 0;
  function patchReact(R) {
    if (!R || !R.useState || R.__pkPatched || !ids) return;
    R.__pkPatched = true;
    var orig = R.useState;
    R.useState = function (init) {
      var pair = orig(init);
      var set = pair[1], id = ids.get(set);
      if (id === undefined) {
        id = nextId++; ids.set(set, id); registry[id] = set;
        if (isMirror && pending[id] !== undefined) {
          (function (pv) { setTimeout(function () { try { set(JSON.parse(pv)); } catch (err) {} }, 0); })(pending[id]);
          delete pending[id];
        }
      }
      if (!isMirror) {
        var json;
        try { json = JSON.stringify(pair[0]); } catch (err) { json = undefined; }
        if (json !== undefined && json !== lastJson[id]) {
          lastJson[id] = json; cache[id] = json;
          bc.postMessage({ pkState: id, json: json });
        }
      }
      return pair;
    };
  }
  if (window.React) patchReact(window.React);
  var pkPoll = setInterval(function () {
    if (window.React && !window.React.__pkPatched) patchReact(window.React);
  }, 100);

  if (isMirror) {
    /* ── mirror window: clean view, apply everything ── */
    var tidy = function () {
      var s = stage();
      if (!s) return void setTimeout(tidy, 200);
      s.setAttribute('no-rail', '');
    };
    tidy();
    bc.postMessage({ hello: true });
    bc.addEventListener('message', function (e) {
      var d = e.data || {};
      if (d.pkState !== undefined) {
        if (registry[d.pkState]) { try { registry[d.pkState](JSON.parse(d.json)); } catch (err) {} }
        else pending[d.pkState] = d.json;
      }
      if (typeof d.index === 'number') { var s = stage(); if (s && s.goTo) s.goTo(d.index); }
      if (typeof d.scroll === 'number') window.scrollTo(0, d.scroll);
    });
    return;
  }

  /* ── presenter window ── */
  var lastIndex = 0;
  bc.addEventListener('message', function (e) {
    if (e.data && e.data.hello) {
      Object.keys(cache).forEach(function (k) { bc.postMessage({ pkState: +k, json: cache[k] }); });
      if (stage()) bc.postMessage({ index: lastIndex });
    }
  });
  var scrollT = null;
  window.addEventListener('scroll', function () {
    if (stage() || scrollT) return;
    scrollT = setTimeout(function () { scrollT = null; bc.postMessage({ scroll: window.scrollY }); }, 80);
  }, { passive: true });

  /* ── speaker-notes panel (toggle with N) ── */
  var HKEY = 'pk-notes-height:' + location.pathname;
  var EKEY = 'pk-notes-edits:' + location.pathname;
  var edits = {};
  try { edits = JSON.parse(localStorage.getItem(EKEY)) || {}; } catch (err) {}
  var curSlide = null, curKey = 'page', open = false;
  var panelH = Math.max(90, Math.min(window.innerHeight * 0.6, parseInt(localStorage.getItem(HKEY), 10) || 190));
  var panel, head, body;
  function ensurePanel() {
    if (panel) return;
    panel = document.createElement('div');
    panel.id = 'pk-notes';
    panel.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:190px;box-sizing:border-box;background:#14181F;color:#FFFFFF;border-top:3px solid #6FA8DC;font-family:ui-monospace,Menlo,Consolas,monospace;z-index:9000;display:flex;flex-direction:column;';
    var grip = document.createElement('div');
    grip.style.cssText = 'position:absolute;left:0;right:0;top:-7px;height:14px;cursor:ns-resize;touch-action:none;';
    grip.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      grip.setPointerCapture(e.pointerId);
      var startY = e.clientY, startH = panelH;
      var onMove = function (ev) {
        panelH = Math.max(90, Math.min(window.innerHeight * 0.6, startH + (startY - ev.clientY)));
        applyOpen();
      };
      var onUp = function () {
        grip.removeEventListener('pointermove', onMove);
        grip.removeEventListener('pointerup', onUp);
        localStorage.setItem(HKEY, String(Math.round(panelH)));
      };
      grip.addEventListener('pointermove', onMove);
      grip.addEventListener('pointerup', onUp);
    });
    panel.appendChild(grip);
    head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:10px 22px 4px;font-size:13px;color:#9BB4CC;flex:none;';
    body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:4px 22px 14px;font-size:17px;line-height:1.55;white-space:pre-wrap;color:#FFFFFF;outline:none;caret-color:#6FA8DC;';
    body.contentEditable = 'true';
    body.spellcheck = false;
    body.addEventListener('input', function () {
      var txt = body.innerText.replace(/\n$/, '');
      edits[curKey] = txt;
      try { localStorage.setItem(EKEY, JSON.stringify(edits)); } catch (err) {}
      if (curSlide) curSlide.setAttribute('data-speaker-notes', txt);
    });
    body.addEventListener('keydown', function (e) { e.stopPropagation(); });
    panel.appendChild(head); panel.appendChild(body);
    document.body.appendChild(panel);
    setHead('notes', 'click to edit \u00b7 drag top edge to resize \u00b7 N to hide \u00b7 P for mirror');
    body.textContent = typeof edits[curKey] === 'string' ? edits[curKey] : '';
  }
  function setHead(leftTxt, rightTxt) {
    head.innerHTML = '';
    var left = document.createElement('span');
    left.textContent = leftTxt;
    var right = document.createElement('span');
    right.textContent = rightTxt;
    right.style.color = '#5C6E8F';
    head.appendChild(left); head.appendChild(right);
  }
  function applyOpen() {
    ensurePanel();
    panel.style.display = open ? 'flex' : 'none';
    panel.style.height = panelH + 'px';
    window.__deckReservedBottom = open ? Math.round(panelH) : 0;
    var s = stage();
    if (s) { s.style.height = ''; if (typeof s._fit === 'function') s._fit(); }
  }
  function updateNotes(d) {
    ensurePanel();
    var slideEl = d.slide || (stage() && stage().querySelectorAll('section')[d.index]);
    var label = slideEl ? (slideEl.getAttribute('data-label') || '') : '';
    curSlide = slideEl; curKey = label || String(d.index);
    var saved = edits[curKey];
    var note = typeof saved === 'string' ? saved : (slideEl ? (slideEl.getAttribute('data-speaker-notes') || '') : '');
    if (typeof saved === 'string' && slideEl) slideEl.setAttribute('data-speaker-notes', saved);
    setHead('notes \u00b7 slide ' + (d.index + 1) + (d.total ? '/' + d.total : '') + (label ? ' \u2014 ' + label : ''),
      'click to edit \u00b7 drag top edge to resize \u00b7 N to hide \u00b7 P for mirror');
    body.textContent = note;
    body.scrollTop = 0;
  }
  document.addEventListener('slidechange', function (e) {
    if (e.detail) {
      lastIndex = e.detail.index; bc.postMessage({ index: lastIndex });
      updateNotes(e.detail); applyOpen();
    }
  });
  window.openPresenterWindow = function () {
    var u = new URL(location.href);
    u.searchParams.set('present', '1');
    window.open(u.toString(), CH, 'width=1280,height=760');
  };
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target, tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return;
    if (e.key === 'p' || e.key === 'P') window.openPresenterWindow();
    else if (e.key === 'n' || e.key === 'N') { open = !open; applyOpen(); }
  });
})();
