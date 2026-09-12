/* Presenter mirror for the Three Arches deck.
   Press P (or call openPresenterWindow()) in the main window to open a second
   window that shows the current slide without the sidebar and follows
   navigation live (BroadcastChannel, same browser). */
(function () {
  if (!('BroadcastChannel' in window)) return;
  if (window.__taPresentSync) return;
  window.__taPresentSync = true;
  var isMirror = /[?&]present/.test(location.search) || location.hash.indexOf('present') >= 0;
  var bc = new BroadcastChannel('three-arches-deck');
  var stage = function () { return document.querySelector('deck-stage'); };
  if (isMirror) {
    var apply = function () {
      var s = stage();
      if (!s) return void setTimeout(apply, 200);
      s.setAttribute('no-rail', '');
      bc.postMessage({ hello: true });
    };
    apply();
    bc.onmessage = function (e) {
      var d = e.data || {};
      if (typeof d.index === 'number') { var s = stage(); if (s && s.goTo) s.goTo(d.index); }
    };
  } else {
    var last = 0;
    // ── speaker-notes panel (presenter view only, toggle with N) ──
    var KEY = 'three-arches-notes-open';
    var HKEY = 'three-arches-notes-height';
    var EKEY = 'three-arches-notes-edits';
    var edits = {};
    try { edits = JSON.parse(localStorage.getItem(EKEY)) || {}; } catch (err) {}
    var curSlide = null, curKey = null;
    var open = false; // notes panel starts hidden — toggle with N
    var panelH = Math.max(90, Math.min(window.innerHeight * 0.6, parseInt(localStorage.getItem(HKEY), 10) || 190));
    var panel, head, body;
    function ensurePanel() {
      if (panel) return;
      var stale = document.getElementById('ta-notes');
      if (stale) stale.remove();
      panel = document.createElement('div');
      panel.id = 'ta-notes';
      panel.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:190px;box-sizing:border-box;background:#002157;color:#FFFFFF;border-top:3px solid #EE7203;font-family:\'IBM Plex Mono\',monospace;z-index:9000;display:flex;flex-direction:column;';
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
      head.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:10px 22px 4px;font-size:13px;color:#AFE0F7;flex:none;';
      body = document.createElement('div');
      body.style.cssText = 'flex:1;overflow-y:auto;padding:4px 22px 14px;font-size:17px;line-height:1.55;white-space:pre-wrap;color:#FFFFFF;outline:none;caret-color:#EE7203;';
      body.contentEditable = 'true';
      body.spellcheck = false;
      body.addEventListener('input', function () {
        if (curKey === null) return;
        var txt = body.innerText.replace(/\n$/, '');
        edits[curKey] = txt;
        try { localStorage.setItem(EKEY, JSON.stringify(edits)); } catch (err) {}
        if (curSlide) curSlide.setAttribute('data-speaker-notes', txt);
        body.style.color = '#FFFFFF';
      });
      body.addEventListener('keydown', function (e) { e.stopPropagation(); });
      panel.appendChild(head); panel.appendChild(body);
      document.body.appendChild(panel);
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
      head.innerHTML = '';
      var left = document.createElement('span');
      left.textContent = 'notes \u00b7 slide ' + (d.index + 1) + (d.total ? '/' + d.total : '') + (label ? ' \u2014 ' + label : '');
      var right = document.createElement('span');
      right.textContent = 'click to edit · drag top edge to resize · N to hide · P for mirror';
      right.style.color = '#5C6E8F';
      head.appendChild(left); head.appendChild(right);
      body.textContent = note;
      body.style.color = '#FFFFFF';
      if (!note) { body.setAttribute('data-empty', '1'); } else { body.removeAttribute('data-empty'); }
      body.scrollTop = 0;
    }
    document.addEventListener('slidechange', function (e) {
      if (e.detail) {
        last = e.detail.index; bc.postMessage({ index: last });
        updateNotes(e.detail); applyOpen();
      }
    });
    bc.onmessage = function (e) { if (e.data && e.data.hello) bc.postMessage({ index: last }); };
    window.openPresenterWindow = function () {
      window.open(location.pathname + '?present=1', 'threeArchesPresent', 'width=1280,height=760');
    };
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target, tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return;
      if (e.key === 'p' || e.key === 'P') window.openPresenterWindow();
      else if (e.key === 'n' || e.key === 'N') {
        open = !open;
        applyOpen();
      }
    });
  }
})();
