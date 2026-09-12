/* room.js — the room protocol on top of relay-transport.js.
 *
 * Wire (all messages also carry `from` and `_id`, added by the transport):
 *   presenter → all   { type:'state', patch:{…} }
 *   phone → presenter { type:'up', name, data }
 *       name 'hello'         data { tag }                    on join / reconnect
 *       name 'sync-request'  data {}                          ask for a full state snapshot
 *       anything else        data = a SNAPSHOT (last-write-wins per phone per name),
 *                            e.g. 'tally' { A:{n,heads}, B:{n,heads}, C:{n,heads} }
 *
 * Published state (presenter → everyone) — only these keys are ever set:
 *   scene, round, question, resetToken, reveal, unlockDelay, armed, spotlight, pairs,
 *   roster: { [from]: { slot, tag } }
 * Secrets (bias, theta, delta, twin) are NOT on the wire: both sides derive
 * them from the slot with Room.secrets(slot).
 *
 * Presenter side keeps  phones = { [from]: { slot, tag, up:{ [name]: data }, at } }
 * and republishes `roster` whenever a phone joins. Slot assignment is persisted
 * in sessionStorage so a presenter reload keeps everyone's slot.
 *
 * Roles:  'presenter' — assigns slots, publishes state, reduces ups.
 *         'mirror'    — reduces ups and applies state like the presenter, but never sends.
 *         'participant'
 *
 * Plain API (no React):
 *   Room.createPresenter({ session, transport?, role? })  → store
 *   Room.createParticipant({ session, transport?, clientId? }) → store
 *   store.get(), store.subscribe(fn), store.publish(patch) / store.send(name, data), store.close()
 * React hooks (React 18, read from window.React at call time):
 *   Room.usePresenter(), Room.useParticipant()
 */
(function (global) {
  'use strict';
  if (global.Room) return;

  // ─────────────────────────── roster ───────────────────────────
  // 20 designed slots (spec §3.2). Pairs first so the twin reveal always exists.
  var SLOTS = [
    /* 1 */ { bias: 0.05, theta: 10,  delta: 0,   twin: 2 },
    /* 2 */ { bias: 0.95, theta: 170, delta: 0,   twin: 1 },
    /* 3 */ { bias: 0.15, theta: 30,  delta: 0,   twin: 4 },
    /* 4 */ { bias: 0.85, theta: 150, delta: 0,   twin: 3 },
    /* 5 */ { bias: 0.25, theta: 45,  delta: 0,   twin: 6 },
    /* 6 */ { bias: 0.75, theta: 135, delta: 0,   twin: 5 },
    /* 7 */ { bias: 0.35, theta: 60,  delta: 0,   twin: 8 },
    /* 8 */ { bias: 0.65, theta: 120, delta: 0,   twin: 7 },
    /* 9 */ { bias: 0.45, theta: 80,  delta: 0,   twin: 10 },
    /*10 */ { bias: 0.55, theta: 100, delta: 0,   twin: 9 },
    /*11 */ { bias: 0.50, theta: 0,   delta: 0,   twin: null },
    /*12 */ { bias: 0.50, theta: 90,  delta: 0,   twin: null },
    /*13 */ { bias: 0.10, theta: 45,  delta: 90,  twin: null },   // impostor L
    /*14 */ { bias: 0.90, theta: 45,  delta: -90, twin: null },   // impostor R
    /*15 */ { bias: 0.30, theta: 45,  delta: 45,  twin: null },
    /*16 */ { bias: 0.70, theta: 135, delta: 45,  twin: null },
    /*17 */ { bias: 0.20, theta: 20,  delta: 0,   twin: null },
    /*18 */ { bias: 0.40, theta: 70,  delta: 90,  twin: null },
    /*19 */ { bias: 0.60, theta: 110, delta: 30,  twin: null },
    /*20 */ { bias: 0.80, theta: 160, delta: 60,  twin: null },
  ];
  function secrets(slot) {
    var s = SLOTS[((slot - 1) % SLOTS.length + SLOTS.length) % SLOTS.length];
    // face: the mystery coin of round B — deterministic (always the same side) but unknown; odd seats H, even seats T
    return { slot: slot, bias: s.bias, face: slot % 2 === 1 ? 1 : 0, theta: s.theta, delta: s.delta, twin: s.twin };
  }

  // ── light helpers (both sides) ──
  var DEG = Math.PI / 180;
  function malus(theta, alpha) { var c = Math.cos((theta - alpha) * DEG); return c * c; }
  /* one photon of a beam at `theta` (deg), polarization wandering by `noise`∈[0,1], meeting a sheet at `alpha` */
  function photon(theta, alpha, noise) {
    var t = theta + (noise ? noise * (Math.random() * 180 - 90) : 0);
    return Math.random() < malus(t, alpha) ? 1 : 0;
  }
  function pOf(q, angle) { var d = q && q[String(angle)]; return d && d.n > 0 ? d.passed / d.n : null; }

  var TAGS = ['🦊','🐙','🦉','🐢','🦋','🐝','🐬','🦩','🐸','🦔','🐧','🦒','🐳','🦜','🐞','🦎','🐨','🦚','🐿️','🦭','🐌','🦀','🐇','🦓'];

  // ─────────────────────────── helpers ───────────────────────────
  function newSession() {
    var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ', s = '';
    for (var i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)];
    return s;
  }
  function sessionFromUrl() {
    try { var m = /[?&]session=([A-Za-z0-9]{3,8})/.exec(global.location.search); return m ? m[1].toUpperCase() : null; } catch (e) { return null; }
  }
  function isMirrorUrl() {
    try { return /[?&]present(=|&|$)/.test(global.location.search) || global.location.hash.indexOf('present') >= 0; } catch (e) { return false; }
  }
  function participantUrl(session) {
    var c = global.PF_RELAY_CONFIG || {};
    var base = c.PARTICIPANT_URL || new URL('../next/index.html', global.location.href).href;
    return base + (base.indexOf('?') >= 0 ? '&' : '?') + 'session=' + session;
  }
  function makeStore(initial) {
    var st = initial, subs = [];
    return {
      get: function () { return st; },
      set: function (next) { st = next; subs.slice().forEach(function (f) { try { f(st); } catch (e) { console.error(e); } }); },
      update: function (fn) { this.set(fn(st)); },
      subscribe: function (f) { subs.push(f); return function () { subs = subs.filter(function (x) { return x !== f; }); }; },
    };
  }
  function shallowMerge(a, b) { var o = {}; for (var k in a) o[k] = a[k]; for (var j in b) o[j] = b[j]; return o; }
  function loadJSON(k) { try { return JSON.parse(sessionStorage.getItem(k)) || null; } catch (e) { return null; } }
  function saveJSON(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  // ─────────────────────────── presenter ───────────────────────────
  function createPresenter(opts) {
    opts = opts || {};
    var session = opts.session || sessionFromUrl() || newSession();
    var role = opts.role || (isMirrorUrl() ? 'mirror' : 'presenter');
    var t = opts.transport || global.RoomTransport.open({ session: session, role: role });
    var key = 'pf-room-' + session;
    var saved = role === 'presenter' ? loadJSON(key) : null;

    var store = makeStore({
      session: session, role: role, status: t.status,
      state: (saved && saved.state) || { scene: 0, round: 'A', resetToken: 0, p: 0.5, question: 0, lens2: 90, mid: 45, roster: {} },
      phones: (saved && saved.phones) || {},
      memo: {},                                    // scratch for figures (histories etc.)
    });

    var pending = null, timer = null;
    function flush() {
      timer = null;
      if (!pending || role !== 'presenter') { pending = null; return; }
      t.postMessage({ type: 'state', patch: pending }); pending = null;
    }
    function publish(patch, immediate) {
      if (role !== 'presenter') return;
      var cur = store.get();
      var next = shallowMerge(cur.state, patch);
      store.set(shallowMerge(cur, { state: next }));
      pending = shallowMerge(pending || {}, patch);
      if (immediate) { if (timer) clearTimeout(timer); flush(); }
      else if (!timer) timer = setTimeout(flush, 80);
      persist();
    }
    function persist() { if (role === 'presenter') { var c = store.get(); saveJSON(key, { state: c.state, phones: c.phones }); } }

    function nextSlot(phones) {
      var used = {}; Object.keys(phones).forEach(function (f) { used[phones[f].slot] = 1; });
      var s = 1; while (used[s]) s++; return s;
    }

    function onMessage(e) {
      var m = e.data; if (!m || !m.from) return;
      if (m.type === 'state' && role === 'mirror') {
        store.update(function (c) { return shallowMerge(c, { state: shallowMerge(c.state, m.patch || {}) }); });
        return;
      }
      if (m.type !== 'up') return;
      var cur = store.get(), phones = shallowMerge({}, cur.phones), ph = phones[m.from];
      if (m.name === 'hello') {
        var tag = (m.data && m.data.tag) || '?';
        if (!ph) ph = phones[m.from] = { slot: nextSlot(phones), tag: tag, up: {}, at: Date.now() };
        else phones[m.from] = ph = shallowMerge(ph, { tag: tag, at: Date.now() });
        var roster = shallowMerge({}, cur.state.roster || {});
        roster[m.from] = { slot: ph.slot, tag: ph.tag };
        store.set(shallowMerge(cur, { phones: phones }));
        publish({ roster: roster }, true);
        // full snapshot for the newcomer (everyone gets it; harmless)
        if (role === 'presenter') t.postMessage({ type: 'state', patch: store.get().state });
        return;
      }
      if (m.name === 'sync-request') {
        if (role === 'presenter') t.postMessage({ type: 'state', patch: cur.state });
        return;
      }
      if (!ph) ph = phones[m.from] = { slot: nextSlot(phones), tag: '?', up: {}, at: Date.now() };
      var up = shallowMerge(ph.up || {}); up[m.name] = m.data;
      phones[m.from] = shallowMerge(ph, { up: up, at: Date.now() });
      store.set(shallowMerge(cur, { phones: phones }));
      persist();
      scheduleAgg();
    }

    /* Aggregates (presenter → everyone, ≤ 1 per 300 ms): the room around each phone's own dot.
       agg.tally = { A:[{slot,tag,n,heads}], B:[…] }; later slices add agg.beam etc.            */
    var aggTimer = null;
    function computeAgg() {
      var out = { tally: { A: [], B: [], C: [] }, beam: [] };
      ['A', 'B', 'C'].forEach(function (r) {
        tallies(r).phones.forEach(function (x) { out.tally[r].push({ slot: x.slot, tag: x.tag, n: x.n, heads: x.heads }); });
      });
      beams().forEach(function (b) { out.beam.push({ slot: b.slot, tag: b.tag, noise: b.noise, q: b.q }); });
      return out;
    }
    function scheduleAgg() {
      if (role !== 'presenter' || aggTimer) return;
      aggTimer = setTimeout(function () { aggTimer = null; publish({ agg: computeAgg() }); }, 300);
    }
    t.addEventListener('message', onMessage);
    t.onStatus(function (s) { store.update(function (c) { return shallowMerge(c, { status: s }); }); });

    // presenter: keep the URL carrying the session so a reload keeps the room
    if (role === 'presenter' && !opts.transport) {
      try {
        if (!sessionFromUrl()) {
          var u = new URL(global.location.href); u.searchParams.set('session', session);
          history.replaceState(null, '', u.toString());
        }
      } catch (e) {}
      // announce the current state on start so mirrors/phones resync
      setTimeout(function () { t.postMessage({ type: 'state', patch: store.get().state }); }, 300);
    }

    // scene follows the deck: <section data-scene="7"> (falls back to slide index)
    function bindDeck(stageEl) {
      if (role !== 'presenter') return;
      var el = stageEl || (typeof document !== 'undefined' && document.querySelector('deck-stage'));
      if (!el) { setTimeout(function () { bindDeck(stageEl); }, 300); return; }
      // <section data-scene="1" data-pf-round="B" data-pf-question="45"> → publish {scene:1, round:'B', question:45}
      el.addEventListener('slidechange', function (ev) {
        var d = ev.detail || {}, s = d.slide, ds = s && s.dataset;
        if (!ds) return;
        var patch = {};
        if (ds.scene !== undefined && !isNaN(Number(ds.scene))) patch.scene = Number(ds.scene);
        Object.keys(ds).forEach(function (k) {
          if (k.length > 2 && k.slice(0, 2) === 'pf') {
            var key = k.charAt(2).toLowerCase() + k.slice(3), v = ds[k];
            patch[key] = (v !== '' && !isNaN(Number(v))) ? Number(v) : v;
          }
        });
        if (Object.keys(patch).length) publish(patch, true);
      });
    }

    // aggregates, so figures don't repeat the same reductions
    function tallies(round) {
      var ph = store.get().phones, out = [], N = 0, H = 0;
      Object.keys(ph).forEach(function (f) {
        var d = ph[f].up && ph[f].up.tally && ph[f].up.tally[round];
        if (d && d.n > 0) { out.push({ from: f, tag: ph[f].tag, slot: ph[f].slot, n: d.n, heads: d.heads, frac: d.heads / d.n }); N += d.n; H += d.heads; }
      });
      return { phones: out, n: N, heads: H, frac: N ? H / N : null };
    }
    /* Part II: light. beam snapshot = { noise, q:{ "0":{n,passed}, "45":{n,passed}, … } } per phone */
    function beams() {
      var ph = store.get().phones, out = [];
      Object.keys(ph).forEach(function (f) {
        var b = ph[f].up && ph[f].up.beam; if (!b || !b.q) return;
        out.push({ from: f, slot: ph[f].slot, tag: ph[f].tag, noise: b.noise || 0, q: b.q });
      });
      return out.sort(function (a, b) { return a.slot - b.slot; });
    }
    function resetRound(round) {
      var cur = store.get(), phones = {};
      Object.keys(cur.phones).forEach(function (f) {
        var p = cur.phones[f], up = shallowMerge(p.up || {});
        if (up.tally) { up.tally = shallowMerge(up.tally); delete up.tally[round]; }
        phones[f] = shallowMerge(p, { up: up });
      });
      var memo = shallowMerge(cur.memo); delete memo['hist:' + round];
      store.set(shallowMerge(cur, { phones: phones, memo: memo }));
      publish({ resetToken: (cur.state.resetToken || 0) + 1, round: round }, true);
      scheduleAgg();
    }
    function setMemo(k, v) { store.update(function (c) { var m = shallowMerge(c.memo); m[k] = v; return shallowMerge(c, { memo: m }); }); }

    var api = {
      session: session, role: role, transport: t,
      get: store.get, subscribe: store.subscribe,
      publish: publish, bindDeck: bindDeck, tallies: tallies, beams: beams, resetRound: resetRound, setMemo: setMemo,
      participantUrl: function () { return participantUrl(session); },
      close: function () { t.removeEventListener('message', onMessage); if (!opts.transport) t.close(); },
    };
    return api;
  }

  // ─────────────────────────── participant ───────────────────────────
  function createParticipant(opts) {
    opts = opts || {};
    var session = opts.session || sessionFromUrl();
    if (!session) throw new Error('Room.createParticipant: no session');
    var t = opts.transport || global.RoomTransport.open({ session: session, role: 'participant', clientId: opts.clientId });
    var key = 'pf-me-' + session;
    var saved = opts.clientId ? null : loadJSON(key);
    var store = makeStore({
      session: session, status: t.status, from: t.clientId,
      tag: (saved && saved.tag) || null, joined: !!(saved && saved.tag),
      state: { scene: 0, round: 'A', resetToken: 0, p: 0.5, question: 0, lens2: 90, mid: 45, roster: {} },
      me: null,                                     // { slot, tag, bias, theta, delta, twin }
      snapshots: (saved && saved.snapshots) || {},  // last sent per name (re-sent on reconnect)
    });
    function persist() { if (!opts.clientId) { var c = store.get(); saveJSON(key, { tag: c.tag, snapshots: c.snapshots }); } }

    function deriveMe(c) {
      var r = c.state.roster && c.state.roster[c.from];
      return r ? shallowMerge(secrets(r.slot), { tag: r.tag }) : null;
    }
    function onMessage(e) {
      var m = e.data; if (!m || m.type !== 'state') return;
      store.update(function (c) {
        var next = shallowMerge(c, { state: shallowMerge(c.state, m.patch || {}) });
        next.me = deriveMe(next); return next;
      });
    }
    t.addEventListener('message', onMessage);

    function hello() {
      var c = store.get(); if (!c.joined) return;
      t.postMessage({ type: 'up', name: 'hello', data: { tag: c.tag } });
      Object.keys(c.snapshots).forEach(function (n) { t.postMessage({ type: 'up', name: n, data: c.snapshots[n] }); });
    }
    t.onStatus(function (s) {
      store.update(function (c) { return shallowMerge(c, { status: s }); });
      if (s === 'connected' || s === 'local') setTimeout(hello, 50);
    });
    if (store.get().joined) setTimeout(hello, 50);

    function join(tag) {
      store.update(function (c) { return shallowMerge(c, { tag: tag, joined: true }); });
      persist(); hello();
    }
    function send(name, data) {
      store.update(function (c) { var s = shallowMerge(c.snapshots); s[name] = data; return shallowMerge(c, { snapshots: s }); });
      persist();
      t.postMessage({ type: 'up', name: name, data: data });
    }
    function forget(name) {
      store.update(function (c) { var s = shallowMerge(c.snapshots); delete s[name]; return shallowMerge(c, { snapshots: s }); });
      persist();
    }
    var api = {
      session: session, transport: t,
      get: store.get, subscribe: store.subscribe,
      join: join, send: send, forget: forget,
      close: function () { t.removeEventListener('message', onMessage); if (!opts.transport) t.close(); },
    };
    return api;
  }

  // ─────────────────────────── React hooks ───────────────────────────
  var _presenter = null, _participant = null;
  function presenter() { if (!_presenter) { _presenter = createPresenter(); _presenter.bindDeck(); } return _presenter; }
  function participant() { if (!_participant && sessionFromUrl()) _participant = createParticipant(); return _participant; }

  function useStore(s) {
    var R = global.React;
    return R.useSyncExternalStore(s.subscribe, s.get, s.get);
  }
  function usePresenter() { var p = presenter(); var snap = useStore(p); return shallowMerge(snap, { transport: p.transport, publish: p.publish, tallies: p.tallies, beams: p.beams, resetRound: p.resetRound, setMemo: p.setMemo, participantUrl: p.participantUrl }); }
  function useParticipant() {
    var p = participant();
    var R = global.React;
    var snap = R.useSyncExternalStore(p ? p.subscribe : function () { return function () {}; }, p ? p.get : function () { return null; }, p ? p.get : function () { return null; });
    if (!p) return null;
    return shallowMerge(snap, { join: p.join, send: p.send, forget: p.forget });
  }

  global.Room = {
    SLOTS: SLOTS, TAGS: TAGS, secrets: secrets, malus: malus, photon: photon, pOf: pOf,
    newSession: newSession, sessionFromUrl: sessionFromUrl, isMirrorUrl: isMirrorUrl, participantUrl: participantUrl,
    createPresenter: createPresenter, createParticipant: createParticipant,
    presenter: presenter, participant: participant,
    usePresenter: usePresenter, useParticipant: useParticipant,
  };
})(typeof window !== 'undefined' ? window : globalThis);
