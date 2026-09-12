// node room/test/participant.test.js — renders the tutorial in room mode (jsdom) against a presenter store.
// Requires: npm i react@18 react-dom@18 jsdom @babel/core @babel/preset-react (dev only; see room/README.md)
const path = require('path'), fs = require('fs'), assert = require('assert');
const tool = process.env.TOOL_DIR || path.join(__dirname, '..', '..', 'node_modules');
const req = (m) => require(path.join(tool, m));
const { JSDOM } = req('jsdom');
const babel = req('@babel/core');

const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/next/index.html?session=TEST', pretendToBeVisual: true });
const window = dom.window;
global.window = window; global.document = window.document; global.navigator = window.navigator;
global.location = window.location; global.history = window.history;
global.sessionStorage = window.sessionStorage; global.BroadcastChannel = BroadcastChannel; window.BroadcastChannel = BroadcastChannel;
global.HTMLElement = window.HTMLElement; global.getComputedStyle = window.getComputedStyle;
global.requestAnimationFrame = window.requestAnimationFrame; global.cancelAnimationFrame = window.cancelAnimationFrame;
global.IS_REACT_ACT_ENVIRONMENT = true;

const React = req('react'), ReactDOM = req('react-dom/client'), { act } = req('react');
window.React = React; global.React = React; window.ReactDOM = ReactDOM;

require('../relay-config.js'); require('../relay-transport.js'); require('../room.js');
const Room = window.Room;

// compile the tutorial jsx into this scope
let src = fs.readFileSync(path.join(__dirname, '..', '..', 'next', 'build-your-own-qubit.jsx'), 'utf8')
  .replace('import { useState, useMemo, useEffect, useRef } from "react";', 'const { useState, useMemo, useEffect, useRef } = React;')
  .replace(/^export default (\w+);\s*$/m, '').replace('export default function ', 'function ');
const code = babel.transformSync(src, { presets: [[req('@babel/preset-react'), { runtime: 'classic', development: false }]], filename: 'tutorial.jsx', sourceType: 'script' }).code;
const App = new Function('React', 'Room', 'window', 'document', 'location', code + '\nreturn App;')(React, Room, window, document, location);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const byText = (re) => Array.from(document.querySelectorAll('button')).find((b) => re.test(b.textContent));
const setRange = async (el, v) => { await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new window.Event('input', { bubbles: true })); await sleep(150); }); };
const click = async (el) => { await act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); };

(async () => {
  // the big screen
  const P = Room.createPresenter({ session: 'TEST', role: 'presenter', transport: window.RoomTransport.open({ session: 'TEST', role: 'presenter', clientId: 'pres' }) });
  P.publish({ scene: 0, round: 'A' }, true);

  const root = ReactDOM.createRoot(document.getElementById('root'));
  await act(async () => { root.render(React.createElement(App)); });
  await act(async () => { await sleep(150); });
  assert(/joining session/.test(document.body.textContent), 'join screen shown');

  // pick a tag and join
  await click(byText(/🦊/)); await click(byText(/join as/));
  await act(async () => { await sleep(150); });
  assert.strictEqual(P.get().phones[Object.keys(P.get().phones)[0]].tag, '🦊', 'presenter sees the phone');
  assert(/seat #1/.test(document.body.textContent), 'phone shows its seat');

  // presenter moves to scene 1 → RoomStep1
  await act(async () => { P.publish({ scene: 1, round: 'A' }, true); await sleep(150); });
  assert(/Round A/.test(document.body.textContent), 'scene 1 round A rendered');
  for (let i = 0; i < 10; i++) await click(byText(/^Flip$/));
  await act(async () => { await sleep(120); });
  let T = P.tallies('A');
  assert.strictEqual(T.n, 10, 'ten flips arrived as a snapshot'); assert.strictEqual(T.phones[0].tag, '🦊');
  assert(/ten done/.test(document.body.textContent));

  // round B: the mystery coin is deterministic (seat 1 → face H): ten flips, ten heads
  await act(async () => { P.publish({ round: 'B' }, true); await sleep(120); });
  assert(/Round B/.test(document.body.textContent) && /mystery coin/.test(document.body.textContent));
  for (let i = 0; i < 10; i++) await click(byText(/^Flip$/));
  await act(async () => { await sleep(120); });
  T = P.tallies('B'); assert.strictEqual(T.n, 10); assert.strictEqual(T.heads, 10, 'mystery coin always lands the same way');

  // round C uses the secret bias (slot 1 → 0.05): 40 flips should be mostly tails
  await act(async () => { P.publish({ round: 'C' }, true); await sleep(120); });
  assert(/Round C/.test(document.body.textContent));
  for (let i = 0; i < 40; i++) await click(byText(/^Flip$/));
  await act(async () => { await sleep(120); });
  T = P.tallies('C'); assert.strictEqual(T.n, 40); assert(T.frac < 0.35, 'bias 0.05 shows: frac=' + T.frac);
  assert.strictEqual(P.tallies('A').n, 10, 'round A untouched');

  // presenter resets round C → phone clears and re-sends
  await act(async () => { P.resetRound('C'); await sleep(200); });
  assert.strictEqual(P.tallies('C').n, 0, 'reset propagated');
  assert(/0 flips/.test(document.body.textContent), 'phone shows 0 flips after reset');

  // scenes 2–6: aggregates arrive, plots render, slider follows then detaches
  for (let i = 0; i < 10; i++) await click(byText(/^Flip$/));          // refill round C
  await act(async () => { await sleep(450); });                         // agg throttle
  await act(async () => { P.publish({ scene: 2 }, true); await sleep(120); });
  assert(/Two sources of uncertainty/.test(document.body.textContent) && document.querySelectorAll('svg circle').length >= 2, 'scene 2 bars with room dots');
  await act(async () => { P.publish({ scene: 3, showBandAxis: true, showPooled: true }, true); await sleep(120); });
  assert(/second axis: bandwidth/.test(document.body.textContent), 'scene 3 follows presenter flags');
  await act(async () => { P.publish({ scene: 4, p: 0.8 }, true); await sleep(120); });
  assert(/The Bernoulli circle/.test(document.body.textContent) && /0\.80/.test(document.body.textContent), 'scene 4 follows p');
  const range = document.querySelector('input[type=range]');
  await setRange(range, '0.3');
  assert(/your own value/.test(document.body.textContent) && /0\.30/.test(document.body.textContent), 'slider detaches');
  await click(byText(/follow the presenter again/));
  assert(/following the presenter/.test(document.body.textContent));
  await act(async () => { P.publish({ scene: 5 }, true); await sleep(120); });
  assert(/needle angle θ/.test(document.body.textContent), 'scene 5 renders pointer + needle');
  await act(async () => { P.publish({ scene: 6 }, true); await sleep(120); });
  assert(/Half a disk/.test(document.body.textContent), 'scene 6 text');

  // ── Part II: light ──
  await act(async () => { P.publish({ scene: 7, lens2: 90 }, true); await sleep(120); });
  assert(/lens 2 · 90°/.test(document.body.textContent) && /0%/.test(document.body.textContent), 'scene 7 follows lens2');
  await act(async () => { P.publish({ scene: 8, question: 0 }, true); await sleep(120); });
  assert(/send 25/.test(document.body.textContent), 'scene 8 bench');
  await click(byText(/send 25/)); await click(byText(/send 25/));
  await act(async () => { await sleep(150); });
  let bm = P.beams(); assert.strictEqual(bm.length, 1); assert.strictEqual(bm[0].q['0'].n, 50, 'beam snapshot arrives');
  // seat 1 → theta 10° → about 97% pass the 0° sheet
  assert(bm[0].q['0'].passed / 50 > 0.8, 'Malus with the secret angle: ' + bm[0].q['0'].passed);
  await act(async () => { P.publish({ scene: 9, reveal: true }, true); await sleep(120); });
  assert(/wiggles at 10°/.test(document.body.textContent), 'scene 9 reveal shows the secret angle');
  await act(async () => { P.publish({ scene: 10, reveal: false }, true); await sleep(120); });
  const noiseRange = document.querySelector('input[type=range]');
  await setRange(noiseRange, '1');
  await act(async () => { await sleep(150); });
  bm = P.beams(); assert.strictEqual(bm[0].noise, 1, 'noise reaches presenter'); assert(!bm[0].q['0'], 'new beam clears tallies');
  await click(byText(/send 25/)); await click(byText(/send 25/)); await click(byText(/send 25/)); await click(byText(/send 25/));
  await act(async () => { await sleep(150); });
  bm = P.beams(); const f = bm[0].q['0'].passed / bm[0].q['0'].n;
  assert(f > 0.25 && f < 0.75, 'unpolarized ≈ 50%: ' + f);
  await setRange(document.querySelector('input[type=range]'), '0');
  await act(async () => { P.publish({ scene: 11, question: 45 }, true); await sleep(120); });
  assert(/pass a 45° sheet/.test(document.body.textContent), 'scene 11 follows question');
  await click(byText(/send 25/)); await click(byText(/send 25/));
  await act(async () => { await sleep(150); });
  bm = P.beams(); assert.strictEqual(bm[0].q['45'].n, 50, '45° tally kept separately');
  await click(byText(/slide it in/)); assert(/take it out/.test(document.body.textContent), 'three-sheet bench toggles');
  await act(async () => { P.publish({ scene: 13, fullDisk: true }, true); await sleep(120); });
  assert(/The twins split/.test(document.body.textContent), 'scene 13 renders');

  // ── Parts III–IV ──
  await act(async () => { P.publish({ scene: 14 }, true); await sleep(120); });
  assert(/locked/.test(document.body.textContent), 'scene 14 clock slider locked');
  await act(async () => { P.publish({ scene: 15, unlockDelay: true }, true); await sleep(120); });
  await click(byText(/delay \+ sheet/)); await click(byText(/send 25/)); await click(byText(/send 25/));
  await act(async () => { await sleep(150); });
  bm = P.beams(); assert.strictEqual(bm[0].q['C'].n, 50, 'circular question tallied under C');
  // seat 1: θ=10°, δ=0 → the delay question gives ≈ 50%
  const fc = bm[0].q['C'].passed / 50; assert(fc > 0.25 && fc < 0.75, 'linear beam: delay question ≈ ½: ' + fc);
  await act(async () => { P.publish({ scene: 16, view: { az: -35, el: 22 }, theta: 60, delta: 90 }, true); await sleep(120); });
  assert(/demo beam follows the presenter/.test(document.body.textContent) && /60°/.test(document.body.textContent), 'scene 16 follows θ/δ');
  await act(async () => { P.publish({ scene: 17, mzPhi: 180, mzSource: 'amplitudes', mzRound: 1, armed: true }, true); await sleep(120); });
  assert(/be measured/.test(document.body.textContent), 'scene 17 armed button');
  await click(byText(/be measured/)); await act(async () => { await sleep(150); });
  let R = P.rounds(); assert.strictEqual(R[1].n, 1); assert.strictEqual(R[1].detector === undefined ? R[1].d1 : 0, 0, 'φ=180° → D2 with certainty');
  assert(/flown/.test(document.body.textContent), 'one press per round');
  await act(async () => { P.publish({ mzPhi: 0, mzRound: 2, armed: true }, true); await sleep(120); });
  await click(byText(/be measured/)); await act(async () => { await sleep(150); });
  R = P.rounds(); assert.strictEqual(R[2].d1, 1, 'φ=0° → D1 with certainty');
  await act(async () => { P.publish({ scene: 18 }, true); await sleep(120); });
  assert(/rebit → qubit/.test(document.body.textContent), 'scene 18 ladder');
  await act(async () => { P.publish({ scene: 19, theta: 45, delta: 0 }, true); await sleep(120); });
  await click(byText(/add my noise/)); await act(async () => { await sleep(150); });
  assert.strictEqual(P.noises().length, 1, 'noise snapshot arrives');
  await act(async () => { P.publish({ noiseReset: 1 }, true); await sleep(200); });
  assert.strictEqual(P.noises().length, 0, 'noise reset clears');

  console.log('participant.test.js: all assertions passed');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
