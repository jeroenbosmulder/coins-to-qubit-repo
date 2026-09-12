/* relay-transport.js — one message bus for a room, shaped like a BroadcastChannel.
 *
 *   const t = RoomTransport.open({ session: 'KWQZ', role: 'presenter' });
 *   t.postMessage({ type: 'state', patch: { scene: 1 } });
 *   t.addEventListener('message', (e) => console.log(e.data));
 *   t.onStatus((s) => …);          // 'local' | 'connecting' | 'connected' | 'error'
 *   t.clientId                     // stable per browser tab (sessionStorage)
 *   t.close()
 *
 * Two legs, always both:
 *   • a same-browser BroadcastChannel  — projector mirror, fake phones, dev;
 *   • Supabase Realtime broadcast      — other devices; only if relay-config.js
 *                                        is filled in. Event 'pf', topic
 *                                        '<prefix>-<session>', self-echo off.
 * Every message carries `_id`; a small ring buffer drops duplicates that arrive
 * over both legs. Messages received from Supabase are re-posted on the local
 * channel so a window without Supabase (mirror) still sees the whole room;
 * messages received locally are never re-sent to Supabase (no loops).
 *
 * Because presenter-kit.js and fifteen-figures.jsx only need postMessage /
 * addEventListener, an instance of this can be handed to them in place of
 * `new BroadcastChannel(...)` to make the projector mirror cross-device too.
 */
(function (global) {
  'use strict';
  if (global.RoomTransport) return;

  var SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';

  function cfg() { return global.PF_RELAY_CONFIG || {}; }
  function hasSupabase() { var c = cfg(); return !!(c.SUPABASE_URL && c.SUPABASE_ANON_KEY); }
  function topicFor(session) { return (cfg().TOPIC_PREFIX || 'pf-qubit') + '-' + session; }

  function uid() { return Math.random().toString(36).slice(2, 10); }

  function stableClientId() {
    try {
      var k = 'pf-client-id', v = sessionStorage.getItem(k);
      if (!v) { v = uid(); sessionStorage.setItem(k, v); }
      return v;
    } catch (e) { return uid(); }
  }

  var supabaseLoading = null;
  function ensureSupabase() {
    if (global.supabase && global.supabase.createClient) return Promise.resolve(global.supabase);
    if (supabaseLoading) return supabaseLoading;
    supabaseLoading = new Promise(function (resolve, reject) {
      if (typeof document === 'undefined') return reject(new Error('no document'));
      var s = document.createElement('script');
      s.src = SUPABASE_CDN; s.async = true;
      s.onload = function () { resolve(global.supabase); };
      s.onerror = function () { reject(new Error('supabase-js failed to load')); };
      document.head.appendChild(s);
    });
    return supabaseLoading;
  }

  /* opts: { session, role, clientId?, local?:true (skip Supabase even if configured) } */
  function open(opts) {
    opts = opts || {};
    var session = String(opts.session || '').toUpperCase();
    if (!session) throw new Error('RoomTransport.open: session code required');
    var clientId = opts.clientId || stableClientId();
    var topic = topicFor(session);
    var listeners = [], statusFns = [], status = 'local';
    var seen = [], seenSet = {};            // dedupe ring
    var closed = false;

    function remember(id) {
      if (seenSet[id]) return false;
      seenSet[id] = 1; seen.push(id);
      if (seen.length > 400) { var old = seen.splice(0, 200); old.forEach(function (o) { delete seenSet[o]; }); }
      return true;
    }
    function dispatch(msg) {
      if (!msg || typeof msg !== 'object') return;
      if (msg._id && !remember(msg._id)) return;
      var ev = { data: msg };
      listeners.slice().forEach(function (fn) { try { fn(ev); } catch (e) { console.error(e); } });
    }
    function setStatus(s) { status = s; statusFns.slice().forEach(function (fn) { try { fn(s); } catch (e) {} }); }

    // ── leg 1: same-browser BroadcastChannel ──
    var bc = null;
    try { if (typeof BroadcastChannel !== 'undefined') bc = new BroadcastChannel(topic); } catch (e) {}
    if (bc) bc.onmessage = function (e) { dispatch(e.data); };

    // ── leg 2: Supabase Realtime broadcast ──
    var channel = null, client = null;
    var useSupabase = hasSupabase() && !opts.local;
    if (useSupabase) {
      setStatus('connecting');
      ensureSupabase().then(function (sb) {
        if (closed) return;
        var c = cfg();
        client = sb.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY);
        channel = client.channel(topic, { config: { broadcast: { self: false, ack: false } } });
        channel.on('broadcast', { event: 'pf' }, function (m) {
          var msg = m && m.payload;
          if (!msg) return;
          // re-post to local windows (mirror without Supabase); dedupe protects everyone else
          if (bc) { try { bc.postMessage(msg); } catch (e) {} }
          dispatch(msg);
        });
        channel.subscribe(function (st) {
          if (st === 'SUBSCRIBED') setStatus('connected');
          else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') setStatus('error');
          else if (st === 'CLOSED') setStatus(closed ? 'closed' : 'connecting');
        });
      }).catch(function (err) { console.warn('[room] Supabase unavailable, local mode:', err.message); setStatus('local'); });
    }

    function postMessage(msg) {
      if (closed || !msg || typeof msg !== 'object') return;
      if (!msg._id) msg._id = clientId + ':' + uid();
      if (!msg.from) msg.from = clientId;
      remember(msg._id);                       // never dispatch our own echo
      if (bc) { try { bc.postMessage(msg); } catch (e) {} }
      if (channel && status === 'connected') {
        channel.send({ type: 'broadcast', event: 'pf', payload: msg }).catch(function () {});
      }
    }

    var api = {
      clientId: clientId,
      session: session,
      topic: topic,
      role: opts.role || 'participant',
      postMessage: postMessage,
      addEventListener: function (type, fn) { if (type === 'message' && fn) listeners.push(fn); },
      removeEventListener: function (type, fn) { listeners = listeners.filter(function (f) { return f !== fn; }); },
      onStatus: function (fn) { statusFns.push(fn); fn(status); return function () { statusFns = statusFns.filter(function (f) { return f !== fn; }); }; },
      get status() { return status; },
      get crossDevice() { return useSupabase; },
      close: function () {
        closed = true;
        if (bc) { try { bc.close(); } catch (e) {} }
        if (channel && client) { try { client.removeChannel(channel); } catch (e) {} }
        setStatus('closed');
      },
    };
    return api;
  }

  global.RoomTransport = { open: open, hasSupabase: hasSupabase, topicFor: topicFor };
})(typeof window !== 'undefined' ? window : globalThis);
