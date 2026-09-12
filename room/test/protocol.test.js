// node room/test/protocol.test.js — in-memory bus, no browser, no Supabase
const assert = require('assert');
globalThis.window = undefined;
require('../room.js');
const Room = globalThis.Room;

// in-memory bus: every client sees every other client's messages (no self-echo)
function makeBus() {
  const clients = [];
  return {
    open(id) {
      const ls = []; let statusFn = null;
      const t = {
        clientId: id, status: 'local',
        postMessage(m) { m.from = m.from || id; m._id = m._id || id + ':' + Math.random(); clients.forEach(c => c !== t && c._recv(m)); },
        addEventListener(_, f) { ls.push(f); }, removeEventListener(_, f) { const i = ls.indexOf(f); if (i >= 0) ls.splice(i, 1); },
        onStatus(f) { statusFn = f; f('local'); }, close() {},
        _recv(m) { ls.slice().forEach(f => f({ data: JSON.parse(JSON.stringify(m)) })); },
        _reconnect() { statusFn && statusFn('connected'); },
      };
      clients.push(t); return t;
    },
  };
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const bus = makeBus();
  const P = Room.createPresenter({ session: 'TEST', role: 'presenter', transport: bus.open('pres') });
  const M = Room.createPresenter({ session: 'TEST', role: 'mirror', transport: bus.open('mirr') });
  const a = Room.createParticipant({ session: 'TEST', clientId: 'a', transport: bus.open('a') });
  const b = Room.createParticipant({ session: 'TEST', clientId: 'b', transport: bus.open('b') });
  const c = Room.createParticipant({ session: 'TEST', clientId: 'c', transport: bus.open('c') });
  await sleep(80);
  a.join('🦊'); b.join('🐙'); c.join('🦉');
  await sleep(120);

  // slots assigned in join order, roster published, secrets derived on the phone
  const ph = P.get().phones;
  assert.deepStrictEqual([ph.a.slot, ph.b.slot, ph.c.slot], [1, 2, 3]);
  assert.strictEqual(a.get().me.bias, 0.05); assert.strictEqual(a.get().me.twin, 2);
  assert.strictEqual(b.get().me.theta, 170); assert.strictEqual(c.get().me.tag, '🦉');
  assert.strictEqual(Object.keys(a.get().state.roster).length, 3, 'phones see the roster');

  // scene + round downstream, mirror follows
  P.publish({ scene: 1, round: 'B' }, true);
  await sleep(120);
  assert.strictEqual(b.get().state.scene, 1); assert.strictEqual(M.get().state.round, 'B');

  // snapshots upstream, aggregated
  a.send('tally', { A: { n: 10, heads: 4 } });
  b.send('tally', { A: { n: 10, heads: 6 }, B: { n: 5, heads: 5 } });
  await sleep(50);
  let T = P.tallies('A');
  assert.deepStrictEqual([T.n, T.heads, T.frac], [20, 10, 0.5]);
  assert.strictEqual(T.phones.find(x => x.from === 'b').tag, '🐙');
  assert.strictEqual(M.tallies('B').n, 5, 'mirror reduces ups too');

  // last-write-wins snapshot
  a.send('tally', { A: { n: 12, heads: 5 } });
  await sleep(50);
  assert.strictEqual(P.tallies('A').n, 22);

  // reset round B clears B only, bumps resetToken, phones see it
  P.resetRound('B'); await sleep(120);
  assert.strictEqual(P.tallies('B').n, 0); assert.strictEqual(P.tallies('A').n, 22);
  assert.strictEqual(c.get().state.resetToken, 1);

  // reconnect: phone re-sends hello + snapshots; slot is kept
  const before = P.get().phones.a.slot;
  a.transport._reconnect(); await sleep(120);
  assert.strictEqual(P.get().phones.a.slot, before);
  assert.strictEqual(P.tallies('A').n, 22);

  // late joiner gets the full state and a fresh slot
  const d = Room.createParticipant({ session: 'TEST', clientId: 'd', transport: bus.open('d') });
  await sleep(50); d.join('🐢'); await sleep(120);
  assert.strictEqual(d.get().state.scene, 1); assert.strictEqual(d.get().me.slot, 4);

  // aggregates reach the phones (throttled)
  await sleep(400);
  const agg = d.get().state.agg;
  assert(agg && agg.tally && agg.tally.A.length === 2, 'phones receive agg.tally: ' + JSON.stringify(agg));
  assert.strictEqual(agg.tally.A.find(x => x.slot === 1).n, 12);

  // roster wraps beyond 20 slots
  assert.strictEqual(Room.secrets(21).bias, Room.secrets(1).bias);
  console.log('protocol.test.js: all assertions passed');
})().catch(e => { console.error(e); process.exit(1); });
