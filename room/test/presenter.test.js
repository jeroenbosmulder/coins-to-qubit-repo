// node room/test/presenter.test.js — renders the presenter figures (jsdom) with three simulated phones.
const path = require('path'), fs = require('fs'), assert = require('assert');
const tool = process.env.TOOL_DIR || path.join(__dirname, '..', '..', 'node_modules');
const req = (m) => require(path.join(tool, m));
const { JSDOM } = req('jsdom'); const babel = req('@babel/core');
const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/presentation/room.dc.html?session=TEST', pretendToBeVisual: true });
const window = dom.window;
global.window = window; global.document = window.document; global.navigator = window.navigator; global.location = window.location;
global.history = window.history; global.sessionStorage = window.sessionStorage; global.BroadcastChannel = BroadcastChannel; window.BroadcastChannel = BroadcastChannel;
global.IS_REACT_ACT_ENVIRONMENT = true; global.confirm = () => false;
const React = req('react'), ReactDOM = req('react-dom/client'), { act } = req('react');
window.React = React; global.React = React;
require('../relay-config.js'); require('../relay-transport.js'); require('../room.js');
const Room = window.Room;

const src = fs.readFileSync(path.join(__dirname, '..', '..', 'presentation', 'room-figures.jsx'), 'utf8');
const code = babel.transformSync(src, { presets: [[req('@babel/preset-react'), { runtime: 'classic' }]], filename: 'room-figures.jsx', sourceType: 'script' }).code;
const mod = { exports: {} };
new Function('React', 'Room', 'window', 'document', 'location', 'navigator', 'module', 'confirm', code)(React, Room, window, document, location, navigator, mod, global.confirm);
const { FigJoin, FigFlipRoom, FigBarsRoom, FigHalfPlaneRoom, FigArcRoom, FigNeedleRoom, FigLensRoom, FigPhotonRoom, FigSurveyRoom, FigMixRoom, FigQuestionRoom, FigProjectRoom, FigThreeLensRoom, FigDoubleRoom, FigTwinsRoom } = mod.exports;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const byText = (re) => Array.from(document.querySelectorAll('button')).find((b) => re.test(b.textContent));
const setRange = async (el, v) => { await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new window.Event('input', { bubbles: true })); await sleep(150); }); };
const click = async (el) => { await act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); };

(async () => {
  const phone = (id, tag) => { const p = Room.createParticipant({ session: 'TEST', clientId: id, transport: window.RoomTransport.open({ session: 'TEST', role: 'participant', clientId: id }) }); p.join(tag); return p; };
  const root = ReactDOM.createRoot(document.getElementById('root'));
  await act(async () => { root.render(React.createElement(FigJoin)); });
  await act(async () => { await sleep(400); });               // presenter announces state
  const a = phone('a', '🦊'), b = phone('b', '🐙'), c = phone('c', '🦉');
  await act(async () => { await sleep(150); });
  assert(/3 joined/.test(document.body.textContent), 'join figure counts phones: ' + document.body.textContent.slice(0, 120));
  assert(/#1/.test(document.body.textContent) && /#3/.test(document.body.textContent), 'seat numbers shown');
  assert.strictEqual(a.get().me.slot, 1); assert.strictEqual(c.get().me.theta, 30);

  await act(async () => { root.render(React.createElement(FigFlipRoom)); await sleep(50); });
  assert(/round A/.test(document.body.textContent));
  a.send('tally', { A: { n: 10, heads: 6 }, B: { n: 0, heads: 0 } });
  b.send('tally', { A: { n: 10, heads: 4 }, B: { n: 0, heads: 0 } });
  await act(async () => { await sleep(80); });
  c.send('tally', { A: { n: 10, heads: 5 }, B: { n: 0, heads: 0 } });
  await act(async () => { await sleep(80); });
  const txt = document.body.textContent;
  assert(/30 flips from 3 phones/.test(txt), 'pooled count: ' + txt.slice(0, 200));
  assert(/0\.50/.test(txt), 'pooled fraction shown');
  const P = Room.presenter();
  assert((P.get().memo['hist:A'] || []).length >= 2, 'history accumulates in the store');
  assert(document.querySelectorAll('polyline').length === 1, 'running line drawn');

  await click(byText(/round B/)); await act(async () => { await sleep(120); });
  assert.strictEqual(a.get().state.round, 'B', 'phones follow the round button');
  assert(/mystery coin/.test(document.body.textContent) && /no flips yet/.test(document.body.textContent));
  a.send('tally', { A: { n: 10, heads: 6 }, B: { n: 7, heads: 7 } });
  await act(async () => { await sleep(80); });
  assert(/7 flips from 1 phones/.test(document.body.textContent));
  await click(byText(/round C/)); await act(async () => { await sleep(120); });
  assert(/secret coin/.test(document.body.textContent));
  await click(byText(/round B/)); await act(async () => { await sleep(120); });
  await click(byText(/reset round B/)); await act(async () => { await sleep(120); });
  assert(/no flips yet/.test(document.body.textContent), 'reset clears the plot');
  assert.strictEqual(a.get().state.resetToken, 1);

  // scenes 2–5 figures render from the same room data
  a.send('tally', { A: { n: 10, heads: 6 }, B: { n: 10, heads: 10 }, C: { n: 10, heads: 1 } });
  b.send('tally', { A: { n: 10, heads: 4 }, B: { n: 10, heads: 0 }, C: { n: 10, heads: 9 } });
  await act(async () => { await sleep(80); });
  await act(async () => { root.render(React.createElement(FigBarsRoom)); await sleep(30); });
  assert(/round A/.test(document.body.textContent) && /round C/.test(document.body.textContent) && (document.body.textContent.match(/room 0\.50/g) || []).length === 3, 'three rows, three room means at ½');
  await act(async () => { root.render(React.createElement(FigHalfPlaneRoom)); await sleep(30); });
  assert(/add the second number/.test(document.body.textContent));
  await click(byText(/add the second number/)); await click(byText(/pool each round/));
  await act(async () => { await sleep(120); });
  assert(/room, round B/.test(document.body.textContent) && /room, round C/.test(document.body.textContent), 'pooled dots shown');
  assert.strictEqual(a.get().state.showPooled, true, 'flags reach phones');
  await act(async () => { root.render(React.createElement(FigArcRoom)); await sleep(30); });
  const range = document.querySelector('input[type=range]');
  await setRange(range, '0.25');
  assert(/p = 0\.25/.test(document.body.textContent), 'arc dot follows slider');
  assert.strictEqual(a.get().state.p, 0.25, 'p reaches phones');
  await act(async () => { root.render(React.createElement(FigNeedleRoom)); await sleep(30); });
  assert(/2θ = 120°/.test(document.body.textContent), 'central angle readout at p=0.25');
  await click(byText(/circle of radius ½/)); await act(async () => { await sleep(120); });
  assert(/T′/.test(document.body.textContent) && /60°/.test(document.body.textContent), 'half-circle toggle shows T′/H′ and θ in the inset');
  assert.strictEqual(a.get().state.halfCircle, true);

  // ── Part II figures with three simulated beams (seats 1,2 = twins at 10°/170°, seat 3 = 30°) ──
  const mk = (n, p) => ({ n, passed: Math.round(n * p) });
  a.send('beam', { noise: 0, q: { '0': mk(50, Room.malus(10, 0)), '45': mk(50, Room.malus(10, 45)) } });
  b.send('beam', { noise: 0, q: { '0': mk(50, Room.malus(170, 0)), '45': mk(50, Room.malus(170, 45)) } });
  c.send('beam', { noise: 1, q: { '0': mk(50, 0.5), '45': mk(50, 0.5) } });
  await act(async () => { await sleep(80); });
  await act(async () => { root.render(React.createElement(FigLensRoom)); await sleep(30); });
  await click(byText(/^45°$/)); await act(async () => { await sleep(120); });
  assert(/sheet 2 · 45°/.test(document.body.textContent) && /50%/.test(document.body.textContent), 'lens bench at 45° → 50%');
  assert.strictEqual(a.get().state.lens2, 45, 'lens2 reaches phones');
  await act(async () => { P.publish({ question: 0 }, true); root.render(React.createElement(FigPhotonRoom)); await sleep(30); });
  assert(/150 photons/.test(document.body.textContent) && /from 3 beams/.test(document.body.textContent), 'photon figure counts');
  await act(async () => { root.render(React.createElement(FigSurveyRoom)); await sleep(30); });
  await click(byText(/reveal each beam/)); await act(async () => { await sleep(120); });
  assert.strictEqual(a.get().state.reveal, true, 'reveal reaches phones');
  assert(document.querySelectorAll('line[stroke="#6D3FC0"]').length === 2, 'needle strokes only on the two pure beams');
  await act(async () => { root.render(React.createElement(FigMixRoom)); await sleep(30); });
  await click(byText(/spotlight: a 45°/)); await act(async () => { await sleep(120); });
  assert.deepStrictEqual(a.get().state.spotlight, [3], 'spotlight picks the unpolarized beam (no 45° beam in this room)');
  await act(async () => { root.render(React.createElement(FigQuestionRoom)); await sleep(30); });
  await click(byText(/ask 45°/)); await act(async () => { await sleep(120); });
  assert.strictEqual(a.get().state.question, 45, 'question reaches phones');
  assert(/do you pass a 45° sheet/.test(document.body.textContent));
  await act(async () => { root.render(React.createElement(FigProjectRoom)); await sleep(30); });
  assert(/cos²\(θ − 45°\)/.test(document.body.textContent), 'projection readout');
  await act(async () => { root.render(React.createElement(FigThreeLensRoom)); await sleep(30); });
  await click(byText(/slide the middle sheet in/)); await act(async () => { await sleep(120); });
  assert(/= 25%/.test(document.body.textContent), 'three sheets: 25% at 45°');
  await act(async () => { root.render(React.createElement(FigDoubleRoom)); await sleep(30); });
  assert(/two laps/.test(document.body.textContent));
  await act(async () => { root.render(React.createElement(FigTwinsRoom)); await sleep(30); });
  await click(byText(/spotlight a twin pair/)); await act(async () => { await sleep(120); });
  assert.deepStrictEqual(a.get().state.pair, [1, 2], 'twin pair found');
  await click(byText(/with the 45° question/)); await act(async () => { await sleep(120); });
  assert.strictEqual(a.get().state.fullDisk, true);
  assert(/negative bandwidth/.test(document.body.textContent), 'full disk view');

  console.log('presenter.test.js: all assertions passed');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
