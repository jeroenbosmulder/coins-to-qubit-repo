/* simulate.js — rehearse the room without participants.
 * Adds a small "SIM" pill (bottom-left) on the presenter page. It spawns local
 * bot participants that speak the normal wire protocol (BroadcastChannel leg
 * only — nothing is sent to Supabase), so every figure fills with live-looking
 * data. Real phones can still join at any time; bots and humans mix freely.
 * Nothing in room.js / relay-transport.js is modified.
 *
 * Bot behaviour, driven by the published state exactly like a real phone:
 *   rounds A/B/C  → flips 10 coins (fair / secret face / secret bias), staggered
 *   resetToken    → clears that round and re-flips
 *   scene ≥ 8     → sends 25 photons through the current question sheet
 *   scene ≥ 16    → also answers 0°, 45° and the delay question (fills the ball)
 *   armed round   → presses "be measured" once (Mach–Zehnder click)
 *   scene 19      → adds its random noise; follows noiseReset
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.__pfSimulate) return;
  if (!window.Room || !window.RoomTransport) return;
  if (Room.isMirrorUrl && Room.isMirrorUrl()) return;   // mirror window: no UI, no bots
  window.__pfSimulate = true;

  var KEY = 'pf-sim-count';
  var bots = [];

  function rand(a, b) { return a + Math.random() * (b - a); }

  function makeBot(i) {
    var session = Room.sessionFromUrl() || (Room.presenter && Room.presenter().session) || Room.newSession();
    var clientId = 'sim-' + (i + 1);
    var t = RoomTransport.open({ session: session, role: 'participant', clientId: clientId, local: true });
    var p = Room.createParticipant({ session: session, transport: t, clientId: clientId });
    var timers = [];
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    var pace = rand(0.7, 1.6);                                   // personality: slow/fast
    var flips = { A: [], B: [], C: [] };
    var beam = { noise: 0, q: {} };
    var photons = {};
    var myNoise = {};
    var lastToken = null, lastNoiseReset = null, busy = {};

    p.join(Room.TAGS[i % Room.TAGS.length]);

    function me() {
      var r = p.get().state.roster || {};
      var mine = r[clientId];
      return mine ? Room.secrets(mine.slot) : null;
    }
    function pFor(round) {
      var m = me(); if (!m) return null;
      return round === 'A' ? 0.5 : round === 'B' ? m.face : m.bias;
    }
    function flipRound(round) {
      if (busy['flip' + round]) return;
      var prob = pFor(round); if (prob === null) return;
      if (flips[round].length >= 10) return;
      busy['flip' + round] = true;
      var step = function () {
        var st = p.get().state;
        if (st.round !== round || flips[round].length >= 10) { busy['flip' + round] = false; return; }
        flips[round].push(Math.random() < prob ? 1 : 0);
        var o = {};
        ['A', 'B', 'C'].forEach(function (r) { o[r] = { n: flips[r].length, heads: flips[r].reduce(function (a, v) { return a + v; }, 0) }; });
        p.send('tally', o);
        later(step, rand(250, 850) * pace);
      };
      later(step, rand(200, 2200) * pace);
    }
    function answer(alpha, count) {
      var m = me(); if (m === null || m.theta === undefined) return;
      var k = 'q' + alpha;
      var cur = beam.q[String(alpha)] || { n: 0, passed: 0 };
      if (cur.n >= count || busy[k]) return;
      busy[k] = true;
      later(function () {
        var passed = 0, need = count - cur.n;
        for (var j = 0; j < need; j++) passed += Room.photon(m.theta, alpha, beam.noise, m.delta);
        beam.q[String(alpha)] = { n: cur.n + need, passed: cur.passed + passed };
        p.send('beam', beam);
        busy[k] = false;
      }, rand(400, 3000) * pace);
    }
    function react() {
      var st = p.get().state;
      // reset → clear that round, re-flip
      if (lastToken === null) lastToken = st.resetToken || 0;
      if ((st.resetToken || 0) !== lastToken) { lastToken = st.resetToken || 0; flips[st.round] = []; }
      if ((st.scene || 0) >= 1 && (st.scene || 0) <= 7) flipRound(st.round || 'A');
      // light: answer the current question, and the three ball questions late in the show
      if ((st.scene || 0) >= 8) {
        var q = st.question; if (q === undefined || q === null) q = 0;
        answer(q, 25);
      }
      if ((st.scene || 0) >= 16) { answer(0, 25); answer(45, 25); answer('C', 25); }
      // one photon at a time
      var rid = st.mzRound || 0;
      if (st.armed && !photons[rid] && !busy.mz) {
        busy.mz = true;
        later(function () {
          var s2 = p.get().state;
          if (s2.armed && (s2.mzRound || 0) === rid && !photons[rid]) {
            var d1 = Math.random() < Room.mzP1(s2.mzPhi || 0, s2.mzSource || 'amplitudes');
            photons[rid] = { phi: s2.mzPhi || 0, source: s2.mzSource || 'amplitudes', detector: d1 ? 1 : 2, at: Date.now() };
            p.send('photon', photons);
          }
          busy.mz = false;
        }, rand(400, 4000) * pace);
      }
      // decoherence noise
      if (lastNoiseReset === null) lastNoiseReset = st.noiseReset || 0;
      if ((st.noiseReset || 0) !== lastNoiseReset) { lastNoiseReset = st.noiseReset || 0; myNoise = {}; }
      if ((st.scene || 0) === 19 && typeof myNoise.delta !== 'number' && !busy.noise) {
        busy.noise = true;
        later(function () { myNoise = { delta: Math.round(Math.random() * 360) }; p.send('noise', myNoise); busy.noise = false; }, rand(500, 5000) * pace);
      }
    }
    var unsub = p.subscribe(react);
    later(react, 600);
    return { close: function () { unsub(); timers.forEach(clearTimeout); p.close(); } };
  }

  function spawn(n) {
    var have = bots.length;
    for (var i = have; i < have + n && i < 20; i++) bots.push(makeBot(i));
    try { sessionStorage.setItem(KEY, String(bots.length)); } catch (e) {}
    render();
  }
  function stopAll() {
    bots.forEach(function (b) { b.close(); }); bots = [];
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    render();
  }

  // ── pill UI ──
  var box, MONO = "'IBM Plex Mono', monospace";
  function btn(label, title, fn) {
    var b = document.createElement('button');
    b.textContent = label; b.title = title;
    b.style.cssText = 'font-family:' + MONO + ';font-size:12px;font-weight:600;padding:5px 12px;border-radius:999px;border:1.5px solid #E37222;background:#FFFFFF;color:#002157;cursor:pointer;';
    b.onclick = fn; return b;
  }
  function render() {
    if (!box) {
      box = document.createElement('div');
      box.id = 'pf-sim';
      box.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:9100;display:flex;gap:8px;align-items:center;background:rgba(255,255,255,0.94);border:1.5px solid #C9E5F5;border-radius:999px;padding:6px 10px;box-shadow:0 4px 14px rgba(5,16,57,0.18);';
      document.body.appendChild(box);
    }
    box.innerHTML = '';
    var tag = document.createElement('span');
    tag.style.cssText = 'font-family:' + MONO + ';font-size:12px;letter-spacing:1px;color:#5E6A85;padding:0 2px;';
    tag.textContent = bots.length ? 'SIM \u00b7 ' + bots.length + ' bots' : 'SIM';
    box.appendChild(tag);
    if (!bots.length) {
      box.appendChild(btn('+12 participants', 'Simulate 12 participants (local only — real participants can still join)', function () { spawn(12); }));
    } else {
      box.appendChild(btn('+4', 'Add 4 more bots', function () { spawn(4); }));
      var x = btn('stop', 'Disconnect all bots (their last answers stay on the slides; start a new session code for a clean room)', stopAll);
      x.style.borderColor = '#E81932'; x.style.color = '#E81932';
      box.appendChild(x);
    }
  }

  function boot() {
    if (!document.body) return void setTimeout(boot, 200);
    render();
    var saved = 0;
    try { saved = parseInt(sessionStorage.getItem(KEY), 10) || 0; } catch (e) {}
    if (saved > 0) spawn(saved);   // survive a presenter reload
  }
  boot();
})();
