/* room-figures.jsx — presenter figures that read the room (phones) via Room.usePresenter().
   Slice 1: FigJoin (scene 0c) and FigFlipRoom (scene 1).
   Same palette/helpers as fifteen-figures.jsx; requires ../room/{relay-config,relay-transport,room}.js
   loaded before this module (see room.dc.html). */
const { useState, useRef, useEffect } = React;

const INK = "#002157", SOFT = "#5E6A85", GOLD = "#E37222", TEAL = "#00A1DE",
      RED = "#E81932", LBLUE = "#AFE0F7", PEACH = "#FBE7D8", GRID = "#E1F3FC", PURP = "#7B2D8B";
const SANS = "'IBM Plex Mono', 'Courier New', monospace";
const MONO = "'IBM Plex Mono', 'Courier New', monospace";
const svgStyle = { width: "100%", display: "block", touchAction: "none", userSelect: "none" };

/* after a drag release the browser still fires a click — eat it (capture, once) so nothing outside the figure treats the release as a tap */
function swallowClick() {
  const eat = (ev) => { ev.stopImmediatePropagation(); ev.preventDefault(); };
  window.addEventListener("click", eat, { capture: true, once: true });
  setTimeout(() => window.removeEventListener("click", eat, { capture: true }), 400);
}
function Txt({ x, y, size = 16, fill = SOFT, anchor = "middle", bold, transform, children }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontFamily={MONO} fontSize={size}
      fontWeight={bold ? 600 : 400} fill={fill} transform={transform}>{children}</text>
  );
}
function Button({ onClick, ghost, active, children }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: SANS, fontSize: 14, fontWeight: 600, letterSpacing: 0.2,
      padding: "7px 16px", borderRadius: 999, cursor: "pointer",
      background: ghost ? "#FFFFFF" : active === false ? "#FFFFFF" : GOLD,
      color: ghost ? INK : active === false ? INK : "#FFFFFF",
      border: ghost ? `1.5px solid ${LBLUE}` : `1.5px solid ${GOLD}`,
    }}>{children}</button>
  );
}
function StatusPill({ status, crossDevice }) {
  const col = status === "connected" ? TEAL : status === "error" ? RED : status === "connecting" ? GOLD : SOFT;
  const label = status === "local" ? (crossDevice ? "local" : "local mode — no Supabase configured")
    : status === "connected" ? "live — other devices can join" : status;
  return (
    <span style={{ fontFamily: MONO, fontSize: 12, color: col, background: "#FFFFFF", border: `1.5px solid ${col}`, padding: "3px 12px", borderRadius: 999 }}>{label}</span>
  );
}

/* lazy QR (qrcodejs from cdnjs); falls back to the plain URL */
let qrLoading = null;
function ensureQR() {
  if (window.QRCode) return Promise.resolve();
  if (!qrLoading) qrLoading = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
  return qrLoading;
}
function QR({ text, size = 260, bare, light = "#FFFFFF", dark = INK }) {
  const ref = useRef(null);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let alive = true;
    ensureQR().then(() => {
      if (!alive || !ref.current) return;
      ref.current.innerHTML = "";
      new window.QRCode(ref.current, { text, width: size, height: size, colorDark: dark, colorLight: light, correctLevel: window.QRCode.CorrectLevel.M });
      setOk(true);
    }).catch(() => setOk(false));
    return () => { alive = false; };
  }, [text, size, light, dark]);
  return <div ref={ref} style={bare ? { width: size, height: size, display: ok ? "block" : "none" } : { width: size, height: size, background: "#FFFFFF", padding: 10, borderRadius: 10, border: `1.5px solid ${LBLUE}`, display: ok ? "block" : "none" }} />;
}

// ── TITLE : QR join panel, styled as a boarding pass (dark slides) ──
function FigJoinQR() {
  const room = Room.usePresenter();
  const url = room.participantUrl();
  const n = Object.keys(room.state.roster || {}).length;
  const copy = () => { try { navigator.clipboard.writeText(url); } catch (e) {} };
  const fresh = () => {
    if (!confirm("Start a new session code? Participants on the current code will have to rejoin.")) return;
    const u = new URL(location.href); u.searchParams.set("session", Room.newSession()); location.href = u.toString();
  };
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const dep = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0") + " / " + String(now.getDate()).padStart(2, "0") + " " + MON[now.getMonth()];
  const CREAM = "#FFFFFF", TEAL = "#00A1DE", WARM = "#FFFFFF", DIM = "rgba(255,255,255,0.85)";
  const BAR = "'Barlow', sans-serif";
  const lbl = { fontFamily: BAR, fontSize: 15, color: DIM, fontWeight: 500 };
  const big = { fontFamily: BAR, fontSize: 23, fontWeight: 600, color: WARM, lineHeight: 1.15 };
  const code = { fontFamily: BAR, fontSize: 60, fontWeight: 500, color: WARM, lineHeight: 1, letterSpacing: -0.5 };
  const op = room.status === "connected" ? "light · live room relay" : room.status === "connecting" ? "light · connecting…" : room.status === "error" ? "light · relay error, local only" : "light · local mode, this device only";
  const pill = { background: WARM, color: TEAL, border: "none", borderRadius: 999, padding: "9px 18px", fontFamily: BAR, fontSize: 16, fontWeight: 700, cursor: "pointer" };
  const dots = (k) => <span key={k} style={{ display: "inline-block", width: 5, height: 5, borderRadius: 999, background: WARM }} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div style={{ background: TEAL, borderRadius: 14, width: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.4)", overflow: "hidden", fontFamily: BAR, textAlign: "left" }}>
      <div style={{ background: CREAM, color: TEAL, padding: "16px 20px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: BAR, fontSize: 24, fontWeight: 800, letterSpacing: 1, lineHeight: 1 }}>QB</span>
        <span style={{ fontSize: 19, fontWeight: 600, letterSpacing: 0.2 }}>Quantum Bit Airlines</span>
      </div>
      <div style={{ padding: "20px 20px 0", display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><span style={lbl}>Seat holder</span><span style={{ fontSize: 26, fontWeight: 600, color: WARM, lineHeight: 1.1 }}>you</span></div>
        <div style={{ background: CREAM, borderRadius: 10, padding: "8px 8px 6px", flex: "none", display: "flex", flexDirection: "column", gap: 4 }}>
          <QR text={url} size={186} bare light="#FFFFFF" dark="#0B2A4A" />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 11.5, color: "#6B7A8F" }}><span>PNR {room.session}</span><span>SEC 001</span></div>
        </div>
      </div>
      <div style={{ padding: "18px 20px 0", display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={lbl}><span style={{ opacity: 0.45 }}>F</span>light</span>
        <span style={big}>QB{room.session}</span>
      </div>
      <div style={{ padding: "14px 20px 18px", display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={lbl}>Merritt Island</span><span style={lbl}>Ubari</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={code}>COI</span>
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              {dots(0)}{dots(1)}
              <svg width="30" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" fill={WARM} /></svg>
              {dots(2)}{dots(3)}
            </span>
            <span style={{ ...lbl, fontSize: 11.5, color: "rgba(255,255,255,0.7)", letterSpacing: 0.3 }}>via BIT (Baitadi)</span>
          </span>
          <span style={code}>QUB</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}><span style={big}>{dep}</span><span style={big}>{n === 0 ? "boarding" : n + " seated"}</span></div>
        <span style={{ ...lbl, fontSize: 13, marginTop: 6 }}>Operated by {op} · Gate Q</span>
      </div>
      <div style={{ display: "flex", gap: 10, margin: "0 14px 14px" }}>
        <button onClick={copy} style={{ ...pill, flex: 1 }}>Copy link</button>
        <button onClick={fresh} style={{ ...pill, flex: 1, background: "transparent", color: WARM, border: `2px solid ${WARM}`, padding: "7px 18px" }}>New code</button>
      </div>
      </div>
    </div>
  );
}

// ── DIVIDER : the seated coins, one small row (dark slides) ──
function FigCoinsRow() {
  const room = Room.usePresenter();
  const roster = room.state.roster || {};
  const phones = Object.keys(roster).map((f) => ({ from: f, ...roster[f] })).sort((a, b) => a.slot - b.slot);
  if (!phones.length) return <div style={{ fontFamily: MONO, fontSize: 18, color: LBLUE, textAlign: "center" }}>no one seated yet — the join code is on the first slide</div>;
  return (
    <div style={{ display: "flex", gap: 18, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
      {phones.map((p) => (
        <div key={p.from} style={{ width: 52, height: 52, borderRadius: "50%", background: "#FDEFE3", border: `2px solid ${GOLD}`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Fraunces', Georgia, serif", fontSize: 24, fontWeight: 600, color: INK }}>{p.tag}</div>
      ))}
    </div>
  );
}

// ── DIVIDER II : the seated beams, one small row — angles stay secret (dark slides) ──
function FigBeamsRow() {
  const room = Room.usePresenter();
  const roster = room.state.roster || {};
  const phones = Object.keys(roster).map((f) => ({ from: f, ...roster[f] })).sort((a, b) => a.slot - b.slot);
  if (!phones.length) return <div style={{ fontFamily: MONO, fontSize: 18, color: LBLUE, textAlign: "center" }}>no one seated yet — the join code is on the first slide</div>;
  return (
    <div style={{ display: "flex", gap: 18, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
      {phones.map((p) => (
        <div key={p.from} style={{ position: "relative", width: 52, height: 52, boxSizing: "border-box", border: `2px solid ${TEAL}`, background: "repeating-linear-gradient(90deg, rgba(0,161,222,0.35) 0 3px, transparent 3px 8px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#FDEFE3", border: `2px solid ${GOLD}`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Fraunces', Georgia, serif", fontSize: 15, fontWeight: 600, color: INK }}>{p.tag}</div>
        </div>
      ))}
    </div>
  );
}

// ── SCENE 0c : join ──
function FigJoin() {
  const room = Room.usePresenter();
  const url = room.participantUrl();
  const roster = room.state.roster || {};
  const phones = Object.keys(roster).map((f) => ({ from: f, ...roster[f] })).sort((a, b) => a.slot - b.slot);
  const copy = () => { try { navigator.clipboard.writeText(url); } catch (e) {} };
  const fresh = () => {
    if (!confirm("Start a new session code? Participants on the current code will have to rejoin.")) return;
    const u = new URL(location.href); u.searchParams.set("session", Room.newSession()); location.href = u.toString();
  };
  return (
    <div style={{ display: "flex", gap: 28, alignItems: "stretch", width: "100%" }}>
      <div style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <QR text={url} />
        <div style={{ fontFamily: MONO, fontSize: 44, fontWeight: 700, color: INK, letterSpacing: 6 }}>{room.session}</div>
        <div style={{ fontFamily: MONO, fontSize: 12, color: SOFT, maxWidth: 280, wordBreak: "break-all", textAlign: "center" }}>{url}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button ghost onClick={copy}>copy link</Button>
          <Button ghost onClick={fresh}>new code</Button>
        </div>
        <StatusPill status={room.status} crossDevice={room.transport ? room.transport.crossDevice : false} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <svg viewBox="0 0 700 420" style={svgStyle}>
          <Txt x={350} y={40} size={22} fill={INK} bold>
            {phones.length === 0 ? "scan to join — waiting for the first participant" : `${phones.length} joined`}
          </Txt>
          {phones.map((p, i) => {
            const cols = 5, cx = 70 + (i % cols) * 140, cy = 110 + Math.floor(i / cols) * 90;
            return (
              <g key={p.from}>
                <circle cx={cx} cy={cy} r="29" fill="#FDEFE3" stroke={GOLD} strokeWidth="2" />
                <circle cx={cx} cy={cy} r="23" fill="none" stroke={GOLD} strokeWidth="1" strokeDasharray="2.5 3" opacity="0.7" />
                <text x={cx} y={cy + 9} textAnchor="middle" fontFamily="'Fraunces', Georgia, serif" fontSize="26" fontWeight="600" fill={INK}>{p.tag}</text>
                <Txt x={cx} y={cy + 50} size={13}>{`#${p.slot}`}</Txt>
              </g>
            );
          })}
          {phones.length > 0 && <Txt x={350} y={405} size={14}>each participant gets a seat number — it decides the secrets they will carry later</Txt>}
        </svg>
      </div>
    </div>
  );
}

// ── SCENE 1 : two coins, one prediction — pooled flips from the room ──
function FigFlipRoom() {
  const room = Room.usePresenter();
  const round = room.state.round || "A";
  const T = room.tallies(round);
  const key = "hist:" + round;
  const hist = room.memo[key] || [];
  const sdMode = room.memo.sdMode || "n";             // "n": √f(1−f)/n · "raw": √f(1−f) · "exp": mean of participants' sds
  const setSdMode = (m) => room.setMemo("sdMode", m);
  // every slide starts on ± sd/√n; each band choice replays the same flips from the start
  useEffect(() => { if (room.memo.sdMode && room.memo.sdMode !== "n") room.setMemo("sdMode", "n"); }, [round]);
  // the replay opens paused (▶ / ❙❙); live flips keep arriving while the round is at rev 1
  const wrap = useRef(null);
  const flipEnter = useSlideEnter(wrap);
  const { rev, playing, toggle } = useReplay(hist.length > 0, flipEnter, [sdMode, round]);
  const pkey = "phist:" + round;
  const phist = room.memo[pkey] || {};                // per participant: [[pooledN, ownFrac, ownN], …]
  // append a point whenever the pooled count changes (history survives slide changes: it lives in the store)
  useEffect(() => {
    const last = hist.length ? hist[hist.length - 1] : null;
    if (T.n > 0 && (!last || last[0] !== T.n)) {
      room.setMemo(key, [...hist, [T.n, T.frac]].slice(-2000));
      const next = { ...phist };
      T.phones.forEach((p) => { const h = next[p.from] || [], l = h.length ? h[h.length - 1] : null; if (!l || l[2] !== p.n) next[p.from] = [...h, [T.n, p.frac, p.n]].slice(-400); });
      room.setMemo(pkey, next);
    }
    if (T.n === 0 && (hist.length || Object.keys(phist).length)) { room.setMemo(key, []); room.setMemo(pkey, {}); }
  }, [T.n, T.heads, round]);

  // main pooled plot on the left; a shared-scale vertical lane on the right holds each participant's own fraction
  const X0 = 90, X1 = 793, Y0 = 460, Y1 = 90;             // 37 units = 0.1 in f; 19 cells wide
  const maxN = Math.max(60, T.n);
  const X = (n) => X0 + (n / maxN) * (X1 - X0), Y = (f) => Y0 - f * (Y0 - Y1);
  // replay window: the visible prefix of the history, and every participant's state at that moment
  const live = rev >= 1;
  const vis = live ? hist : hist.slice(0, Math.ceil(rev * hist.length));
  const cutN = vis.length ? vis[vis.length - 1][0] : 0;
  const Ln = live ? T.n : cutN, Lf = live ? T.frac : (vis.length ? vis[vis.length - 1][1] : 0);
  const parts = T.phones.map((p) => {
    if (live) return { from: p.from, tag: p.tag, frac: p.frac, n: p.n };
    let l = null; for (const q of phist[p.from] || []) { if (q[0] <= cutN) l = q; else break; }
    return { from: p.from, tag: p.tag, frac: l ? l[1] : 0, n: l ? l[2] : 0 };
  });
  const path = vis.map(([n, f]) => `${X(n).toFixed(1)},${Y(f).toFixed(1)}`).join(" ");
  // ±1 sd band of the pooled flips (all flips together, no participant split)
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const sd = ([n, f]) => Math.sqrt(sdMode === "n" ? (f * (1 - f)) / n : f * (1 - f));
  const isExp = sdMode === "exp";
  // "exp": each participant gets ±√pᵢ(1−pᵢ) from their own flips; the pooled band is the n-weighted mean of those sds
  const expSd = (N) => { let s = 0, w = 0; Object.keys(phist).forEach((f) => { const h = phist[f]; let l = null; for (const q of h) { if (q[0] <= N) l = q; else break; } if (l) { s += Math.sqrt(l[1] * (1 - l[1])) * l[2]; w += l[2]; } }); return w ? s / w : 0; };
  const sdAt = (h) => (isExp ? expSd(h[0]) : sd(h));
  const bandOf = (pts, sdf) => pts.length > 1 ? [...pts.map((h) => `${X(h[0]).toFixed(1)},${Y(clamp(h[1] + sdf(h))).toFixed(1)}`), ...pts.slice().reverse().map((h) => `${X(h[0]).toFixed(1)},${Y(clamp(h[1] - sdf(h))).toFixed(1)}`)].join(" ") : "";
  const band = bandOf(vis, sdAt);
  const view = "arrivals";        // plane view (sd vs p) now lives on scene 2 · FigRoundPlane
  const setView = () => {};
  // re-anchor the host panel's raster to the plot axes: one tile = 0.1 in f (arrivals) / 0.05 in p and sd (plane)
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const svg = el.querySelector("svg"); if (!svg) return;
    let panel = el.parentElement;
    while (panel && getComputedStyle(panel).backgroundImage === "none") panel = panel.parentElement;
    if (!panel) return;
    const A = view === "plane" ? { x: 130, y: 460, g: 32 } : { x: X0, y: Y0, g: 37 };
    const fit = () => {
      const pr = panel.getBoundingClientRect(), sr = svg.getBoundingClientRect();
      if (!pr.width || !sr.width) return;
      const k = panel.offsetWidth / pr.width;              // undo the deck's transform scale
      const s = (sr.width * k) / 900;                      // css px per viewBox unit
      const tile = A.g * s;
      const ox = (sr.left - pr.left) * k - panel.clientLeft + A.x * s - 0.75;
      const oy = (sr.top - pr.top) * k - panel.clientTop + A.y * s - 0.75;
      panel.style.backgroundImage = "linear-gradient(to right, #E1F3FC 0 1.5px, transparent 1.5px), linear-gradient(to bottom, #E1F3FC 0 1.5px, transparent 1.5px)";
      panel.style.backgroundSize = `${tile}px ${tile}px`;
      panel.style.backgroundPosition = `${ox}px ${oy}px`;
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(svg); ro.observe(panel);
    return () => ro.disconnect();
  }, [view]);
  const controls = (
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
        <Button ghost onClick={toggle}>{playing ? "❙❙" : "▶"}</Button>
        {[["n", "± sd/√n"], ["raw", "± sd"], ["exp", "± E(sd)"]].map(([m, lbl]) => <Button key={m} active={sdMode === m} onClick={() => setSdMode(m)}>{lbl}</Button>)}
        <Button ghost onClick={() => room.resetRound(round)}>{`reset round ${round}`}</Button>
      </div>
  );

  if (view === "plane") {
    // sd on y, p on x — each participant at (own f, own sd); the room at (pooled f, selected sd); faint trail of the pooled point
    const psd = (f, n) => Math.sqrt(sdMode === "n" ? (f * (1 - f)) / n : f * (1 - f));
    const pool = vis.length ? { p: Lf, w: sdAt(vis[vis.length - 1]) } : null;
    const trail = vis.length > 1 ? vis.filter((h) => h[0] >= 3) : [];
    // mixture: flip-weighted mean of the participants' end points (p_i, sd_i) — the "mixed beliefs" centroid
    const act = parts.filter((p) => p.n > 0);
    const W = act.reduce((s, p) => s + p.n, 0);
    const mix = W > 0 ? { p: act.reduce((s, p) => s + p.n * p.frac, 0) / W, w: act.reduce((s, p) => s + p.n * psd(p.frac, p.n), 0) / W } : null;
    const plane = Plane({ showArc: sdMode !== "n", children: ({ X, Y }) => (<>
      {T.phones.map((p) => {
        const ph = (phist[p.from] || []).filter((h) => h[2] >= 2 && (live || h[0] <= cutN));
        return ph.length > 1 && <polyline key={"t" + p.from} points={ph.map((h) => `${X(h[1]).toFixed(1)},${Y(psd(h[1], h[2])).toFixed(1)}`).join(" ")} fill="none" stroke={ROUND[round].col} strokeWidth="1.25" opacity="0.22" strokeLinejoin="round" />;
      })}
      {mix && act.map((p) => <line key={"s" + p.from} x1={X(p.frac)} y1={Y(psd(p.frac, p.n))} x2={X(mix.p)} y2={Y(mix.w)} stroke={INK} strokeWidth="1" opacity="0.14" />)}
      {parts.map((p) => p.n > 0 && (<g key={p.from} opacity="0.45">
        <circle cx={X(p.frac)} cy={Y(psd(p.frac, p.n))} r={7 + Math.min(6, p.n / 5)} fill={ROUND[round].col} stroke="#FFFFFF" strokeWidth={1.5} />
        <text x={X(p.frac)} y={Y(psd(p.frac, p.n)) + 5} textAnchor="middle" fontSize="15">{p.tag}</text>
      </g>))}
      {trail.length > 1 && <polyline points={trail.map((h) => `${X(h[1]).toFixed(1)},${Y(sdAt(h)).toFixed(1)}`).join(" ")} fill="none" stroke="#FFFFFF" strokeWidth="6" opacity="0.9" strokeLinejoin="round" strokeLinecap="round" />}
      {trail.length > 1 && <polyline points={trail.map((h) => `${X(h[1]).toFixed(1)},${Y(sdAt(h)).toFixed(1)}`).join(" ")} fill="none" stroke={ROUND[round].col} strokeWidth="3" opacity="1" strokeLinejoin="round" strokeLinecap="round" />}
      {pool && <circle cx={X(pool.p)} cy={Y(pool.w)} r="12" fill={ROUND[round].col} stroke="#FFFFFF" strokeWidth={2.25} />}
      {pool && <Txt x={X(pool.p)} y={Y(pool.w) - 20} size={14} fill={INK} bold>room</Txt>}
      {mix && <circle cx={X(mix.p)} cy={Y(mix.w)} r="11" fill="none" stroke={INK} strokeWidth={2.25} />}
      {mix && <circle cx={X(mix.p)} cy={Y(mix.w)} r="2.5" fill={INK} />}
      {mix && <Txt x={X(mix.p)} y={Y(mix.w) + 30} size={14} fill={INK}>mixture</Txt>}
      {T.n === 0 && <Txt x={X(0.5)} y={Y(0.3)} size={17}>{`no flips yet — participants: tap Flip (round ${round})`}</Txt>}
      <Txt x={X(0.5)} y={34} size={16} fill={INK} bold>{`${ROUND[round].name} — ${ROUND[round].title}`}</Txt>
    </>) });
    return <div ref={wrap}>{plane.svg}{controls}</div>;
  }

  return (
    <div ref={wrap}>
      <svg viewBox="0 0 900 520" style={svgStyle}>
        <Txt x={(X0 + X1) / 2} y={34} size={16} fill={INK} bold>{`${ROUND[round].name} — ${ROUND[round].title}`}</Txt>
        {/* shared vertical axis: 0 at bottom, 1 at top */}
        <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke={INK} strokeWidth="2.25" />
        <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke={INK} strokeWidth="2.25" opacity="0.25" />
        <line x1={X0} y1={Y(0.5)} x2={X1} y2={Y(0.5)} stroke={SOFT} strokeWidth="1.75" strokeDasharray="8 7" />
        <Txt x={X0 - 28} y={Y0 + 6} anchor="end">0</Txt>
        <Txt x={X0 - 28} y={Y(0.5) + 6} anchor="end">½</Txt>
        <Txt x={X0 - 28} y={Y1 + 6} anchor="end">1</Txt>
        <Txt x={(X0 + X1) / 2} y={Y1 - 22} size={15}>pooled fraction of heads, flip by flip, as they arrive</Txt>
        {/* each participant's own running fraction, faint, on the same arrival axis */}
        {Object.keys(phist).map((f) => {
          const h = live ? phist[f] : phist[f].filter((q) => q[0] <= cutN); if (!h.length) return null;
          const pts = h.map(([n, fr]) => `${X(n).toFixed(1)},${Y(fr).toFixed(1)}`);
          if (h[h.length - 1][0] < Ln) pts.push(`${X(Ln).toFixed(1)},${Y(h[h.length - 1][1]).toFixed(1)}`);
          const lf = h[h.length - 1][1], p = parts.find((q) => q.from === f && q.n > 0);
          return (<g key={f} opacity="0.22">
            <polyline points={pts.join(" ")} fill="none" stroke={ROUND[round].col} strokeWidth="1.5" strokeLinejoin="round" />
            {p && <circle cx={X(Ln)} cy={Y(lf)} r={7 + Math.min(6, p.n / 5)} fill={ROUND[round].col} stroke="#FFFFFF" strokeWidth={1.5} />}
            {p && <text x={X(Ln)} y={Y(lf) + 5} textAnchor="middle" fontSize="15">{p.tag}</text>}
          </g>);
        })}
        {band && <polygon points={band} fill={ROUND[round].col} opacity="0.12" stroke="none" />}
        {vis.length > 1 && <polyline points={path} fill="none" stroke={ROUND[round].col} strokeWidth="3.5" strokeLinejoin="round" />}
        {Ln > 0 && <circle cx={X(Ln)} cy={Y(Lf)} r="10" fill={ROUND[round].col} stroke="#FFFFFF" strokeWidth={2.25} />}
        {Ln > 0 && <Txt x={Math.min(X(Ln), X1 - 40)} y={Y(Lf) - 18} size={14} fill={INK} bold>{Lf.toFixed(2)}</Txt>}
        {T.n === 0 && <Txt x={(X0 + X1) / 2} y={Y(0.5) - 20} size={17}>{`no flips yet — participants: tap Flip (round ${round})`}</Txt>}
        <Txt x={(X0 + X1) / 2} y={498} size={14}>{`${T.n} flips from ${T.phones.length} participants`}</Txt>
      </svg>
      {controls}
    </div>
  );
}


// ───────────────────────── shared geometry (Bernoulli half-plane) ─────────────────────────
/* p on x, bandwidth on y; the circle of radius ½ centred at (½, 0). */
function Plane({ W = 900, H = 520, S = 640, cy: cyP, lower = 0, showBand = true, showArc = true, left = "always-T", right = "always-H", children }) {
  const cx = W / 2, cy = cyP ?? H - 60;                   // px per unit p; origin p=½ at cx
  const X = (p) => cx + (p - 0.5) * S, Y = (w) => cy - w * S;
  // lower ∈ 0…1: the hidden half swings open about the floor like a page — its rim is an ellipse that flattens, then opens downward
  const fold = Math.cos(Math.PI * lower), below = Math.max(0, -fold), ry = Math.max(0.01, (S / 2) * Math.abs(fold));
  return { X, Y, S, cx, cy, svg: (
    <svg viewBox={`0 0 ${W} ${H}`} style={svgStyle}>
      <line x1={X(0)} y1={cy} x2={X(1)} y2={cy} stroke={INK} strokeWidth="2.25" strokeDasharray={lower > 0.02 ? "8 6" : undefined} opacity={1 - 0.45 * lower} />
      <g opacity={1 - lower}>
        <Txt x={X(0)} y={cy + 30} size={15} fill={INK} bold>{left}</Txt>
        <Txt x={X(1)} y={cy + 30} size={15} fill={INK} bold>{right}</Txt>
        <Txt x={X(0.5)} y={cy + 30} size={15}>fair · p = ½</Txt>
      </g>
      {lower > 0 && <g opacity={lower}>
        <Txt x={X(0) - 14} y={cy + 5} anchor="end" size={14} fill={INK} bold>{left}</Txt>
        <Txt x={X(1) + 14} y={cy + 5} anchor="start" size={14} fill={INK} bold>{right}</Txt>
        <line x1={X(0.5)} y1={cy - 5} x2={X(0.5)} y2={cy + 5} stroke={INK} strokeWidth="1.5" />
      </g>}
      {showBand && <>
        <line x1={X(0)} y1={cy} x2={X(0)} y2={Y(0.6)} stroke={INK} strokeWidth="2.25" opacity="0.5" />
        <Txt x={X(0) - 14} y={Y(0.5) + 6} anchor="end" size={14}>½</Txt>
        <Txt x={X(0) - 14} y={Y(0.25) + 6} anchor="end" size={14}>¼</Txt>
        <g opacity={1 - lower}><Txt x={X(0.5)} y={Y(0.6) - 14} size={15}>bandwidth — the spread you expect</Txt></g>
        {lower > 0 && <g opacity={lower}><Txt x={X(0) + 10} y={Y(0.6) - 10} anchor="start" size={14}>bandwidth</Txt></g>}
      </>}
      {showBand && below > 0 && <g opacity={below}>
        <line x1={X(0)} y1={cy} x2={X(0)} y2={Y(-0.6)} stroke={INK} strokeWidth="2.25" opacity="0.5" />
        <Txt x={X(0) - 14} y={Y(-0.5) + 6} anchor="end" size={14}>−½</Txt>
        <Txt x={X(0) - 14} y={Y(-0.25) + 6} anchor="end" size={14}>−¼</Txt>
      </g>}
      {showArc && <path d={`M ${X(0)} ${cy} A ${S / 2} ${S / 2} 0 0 1 ${X(1)} ${cy}`} fill="none" stroke={INK} strokeWidth="1.75" strokeDasharray="7 6" opacity="0.6" />}
      {showArc && lower > 0 && <path d={`M ${X(0)} ${cy} A ${S / 2} ${ry.toFixed(2)} 0 0 ${fold > 0 ? 1 : 0} ${X(1)} ${cy}`} fill="none" stroke={INK} strokeWidth="1.75" strokeDasharray="7 6" opacity={0.6 * Math.min(1, lower * 4)} />}
      {children({ X, Y, S, cx, cy })}
    </svg>
  ) };
}
const ROUND = {
  A: { col: TEAL, name: "round A", title: "everyone flips the same fair coin", short: "fair coin" },
  B: { col: PURP, name: "round B", title: "everyone flips a mystery coin — it always lands the same way, but nobody knows which", short: "mystery coin" },
  C: { col: GOLD, name: "round C", title: "everyone flips their own secret coin", short: "secret coin" },
};
const sig = (p) => Math.sqrt(Math.max(0, p * (1 - p)));
const phoneDots = (T) => T.phones.map((x) => ({ ...x, p: x.frac, w: sig(x.frac) }));
const pooled = (dots) => dots.length ? { p: dots.reduce((a, d) => a + d.p, 0) / dots.length, w: dots.reduce((a, d) => a + d.w, 0) / dots.length } : null;

// ── SCENE 2 : two sources of uncertainty — every phone's own fraction, round A over round B ──
function FigBarsRoom() {
  const room = Room.usePresenter();
  const T = { A: room.tallies("A"), B: room.tallies("B"), C: room.tallies("C") };
  const slots = {};
  ["A", "B", "C"].forEach((r) => T[r].phones.forEach((x) => { slots[x.slot] = { ...(slots[x.slot] || {}), tag: x.tag, [r]: x }; }));
  const rows = Object.keys(slots).map(Number).sort((a, b) => a - b);
  const W = 900, x0 = 150, x1 = 860, bw = Math.min(24, 600 / Math.max(1, rows.length));
  const X = (f) => x0 + f * (x1 - x0);
  const Row = ({ y, r }) => (
    <g>
      <Txt x={x0 - 16} y={y + 5} anchor="end" size={14} fill={INK} bold>{ROUND[r].name}</Txt>
      <Txt x={x0 - 16} y={y + 24} anchor="end" size={12}>{ROUND[r].short}</Txt>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={SOFT} strokeWidth="1.5" />
      <line x1={X(0.5)} y1={y - 44} x2={X(0.5)} y2={y + 16} stroke={SOFT} strokeWidth="1.5" strokeDasharray="6 5" />
      {rows.map((sl) => { const d = slots[sl][r]; if (!d) return null;
        const x = X(d.frac), h = Math.min(36, d.n * 3);
        return (<g key={sl}>
          <rect x={x - bw / 2} y={y - 6 - h} width={bw} height={h} fill={ROUND[r].col} opacity="0.35" stroke={ROUND[r].col} strokeWidth="1.5" />
          <text x={x} y={y - 12 - h} textAnchor="middle" fontSize="18">{slots[sl].tag}</text>
        </g>); })}
      {T[r].frac !== null && <g>
        <polygon points={`${X(T[r].frac)},${y + 2} ${X(T[r].frac) - 9},${y + 18} ${X(T[r].frac) + 9},${y + 18}`} fill={INK} />
        <Txt x={X(T[r].frac)} y={y + 34} size={13} fill={INK} bold>{`room ${T[r].frac.toFixed(2)}`}</Txt>
      </g>}
    </g>
  );
  return (
    <div>
      <svg viewBox={`0 0 ${W} 520`} style={svgStyle}>
        <Txt x={W / 2} y={36} size={16} fill={INK} bold>each participant's fraction of heads · ten flips each</Txt>
        <Row y={150} r="A" />
        <Row y={290} r="B" />
        <Row y={430} r="C" />
        <Txt x={x0} y={480} size={14}>0</Txt><Txt x={X(0.5)} y={480} size={14}>½</Txt><Txt x={x1} y={480} size={14}>1</Txt>
        <Txt x={W / 2} y={508} size={14}>A: same coin, only the throws differ. B: no throw at all — only ignorance. C: both. All three rooms average ≈ ½.</Txt>
      </svg>
    </div>
  );
}

// ── SCENE 3 : one number is not enough → the bandwidth axis ──
function FigHalfPlaneRoom() {
  const room = Room.usePresenter();
  const showBand = !!room.state.showBandAxis, reveal = !!room.state.revealCoins, showPooled = !!room.state.showPooled;
  const [round, setRound] = useState("A");
  const on = (r) => round === r;
  const RS = ["A", "B", "C"].filter(on);
  const D = { A: phoneDots(room.tallies("A")), B: phoneDots(room.tallies("B")), C: phoneDots(room.tallies("C")) };
  const P = { A: pooled(D.A), B: pooled(D.B), C: pooled(D.C) };
  const plane = Plane({ showBand, showArc: showBand, children: ({ X, Y }) => (<>
    {RS.map((r) => D[r].map((d) => (<g key={r + d.slot}>
      <circle cx={X(d.p)} cy={showBand ? Y(d.w) : Y(0)} r="9" fill={ROUND[r].col} opacity="0.7" stroke="#FFFFFF" strokeWidth={1.5} />
      {r === "C" && <text x={X(d.p)} y={(showBand ? Y(d.w) : Y(0)) - 14} textAnchor="middle" fontSize="16">{d.tag}</text>}
      {r === "C" && reveal && showBand && (() => { const b = Room.secrets(d.slot).bias; return <circle cx={X(b)} cy={Y(sig(b))} r="7" fill="none" stroke={GOLD} strokeWidth="1.75" strokeDasharray="3 3" />; })()}
    </g>)))}
    {showPooled && showBand && RS.map((r) => P[r] && (<g key={"p" + r}>
      {D[r].map((d) => <line key={"m" + d.slot} x1={X(d.p)} y1={Y(d.w)} x2={X(P[r].p)} y2={Y(P[r].w)} stroke={ROUND[r].col} strokeWidth="1.25" strokeDasharray="4 5" opacity="0.35" />)}
      <circle cx={X(P[r].p)} cy={Y(P[r].w)} r="15" fill={ROUND[r].col} stroke="#FFFFFF" strokeWidth={2.25} />
      <Txt x={X(P[r].p)} y={Y(P[r].w) + (r === "A" ? -24 : r === "B" ? 40 : 34)} size={15} fill={INK} bold>{`room, ${ROUND[r].name}`}</Txt>
    </g>))}
  </>) });
  const pub = (k) => () => room.publish({ [k]: !room.state[k] }, true);
  return (
    <div>
      {plane.svg}
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
        {["A", "B", "C"].map((r) => <Button key={r} active={round === r} onClick={() => setRound(r)}>{ROUND[r].name}</Button>)}
        <Button active={showBand} onClick={pub("showBandAxis")}>{showBand ? "bandwidth axis: on" : "add the second number"}</Button>
        <Button active={showPooled} onClick={pub("showPooled")}>{showPooled ? "room dots: on" : "pool each round"}</Button>
        <Button ghost onClick={pub("revealCoins")}>{reveal ? "hide the true coins" : "reveal the true coins (round C)"}</Button>
      </div>
    </div>
  );
}

// ── SCENE 4 : the Bernoulli circle — one synced dot rides the arc ──
function FigArcRoom() {
  const room = Room.usePresenter();
  const p = room.state.p ?? 0.5;
  const B = phoneDots(room.tallies("C"));
  const plane = Plane({ children: ({ X, Y, cx, cy }) => (<>
    {B.map((d) => <circle key={d.slot} cx={X(d.p)} cy={Y(d.w)} r="7" fill={GOLD} opacity="0.25" />)}
    <path d={`M ${X(0)} ${cy} A ${320} ${320} 0 0 1 ${X(1)} ${cy}`} fill="none" stroke={INK} strokeWidth="3" />
    <line x1={X(p)} y1={cy} x2={X(p)} y2={Y(sig(p))} stroke={PURP} strokeWidth="1.5" strokeDasharray="5 4" />
    <circle cx={X(p)} cy={Y(sig(p))} r="13" fill={PURP} stroke="#FFFFFF" strokeWidth={2.25} />
    <Txt x={X(p)} y={Y(sig(p)) - 24} size={14} fill={INK} bold>{`p = ${p.toFixed(2)} · bandwidth ${sig(p).toFixed(2)}`}</Txt>
  </>) });
  return (
    <div>
      {plane.svg}
      <div style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "center", marginTop: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 15, color: SOFT }}>p (every participant follows)</span>
        <input type="range" min="0" max="1" step="0.01" value={p} onChange={(e) => room.publish({ p: parseFloat(e.target.value) })} style={{ width: 420, accentColor: GOLD }} />
      </div>
    </div>
  );
}

// ── SCENE 5 : from the state's own point of view — pointer (angle 2θ) and needle (angle θ) ──
function FigNeedleRoom() {
  const room = Room.usePresenter();
  const p = room.state.p ?? 0.5;
  const show = !!room.state.halfCircle;
  const th = Math.atan2(Math.sqrt(1 - p), Math.sqrt(p));            // angle at the coin between pointer and blue chord; cos θ = √p
  const deg = (r) => (r * 180 / Math.PI).toFixed(0);
  // geometry: diameter 600 px, so ½ ↦ 300 px
  const cx = 450, cy = 420, R = 300;
  const X = (q) => cx + (q - 0.5) * 2 * R, Y = (w) => cy - w * 2 * R;
  const Tx = X(0), Hx = X(1), Px = X(p), Py = Y(sig(p));
  const near = (a, b) => Math.abs(a - b) < 0.02;
  // T′ and H′: ½ along the chords from the coin
  const lenT = Math.hypot(Px - Tx, Py - cy), lenH = Math.hypot(Px - Hx, Py - cy);
  const T2 = [Px + (Tx - Px) * (R / lenT), Py + (cy - Py) * (R / lenT)];
  const H2 = [Px + (Hx - Px) * (R / lenH), Py + (cy - Py) * (R / lenH)];
  // θ at the coin: between the pointer (to the centre) and the blue chord (to T)
  const aC = Math.atan2(cy - Py, cx - Px), aT = Math.atan2(cy - Py, Tx - Px);
  const a0 = Math.min(aC, aT), a1 = Math.max(aC, aT), ar = 44, am = (a0 + a1) / 2;
  // drag the coin along the arc
  const onDown = (e) => {
    const svg = e.currentTarget.ownerSVGElement || e.currentTarget.closest("svg");
    const move = (ev) => {
      const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
      const x = (ev.clientX - r.left) * vb.width / r.width, y = (ev.clientY - r.top) * vb.height / r.height;
      const ang = Math.atan2(cy - y, x - cx);                      // 0 at always-H, π at always-T
      const q = Math.min(1, Math.max(0, 0.5 + 0.5 * Math.cos(Math.min(Math.PI, Math.max(0, ang)))));
      room.publish({ p: Math.round(q * 100) / 100 });
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); swallowClick(); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); e.preventDefault();
  };
  // right-angle marker at the coin
  const uT = [(Tx - Px) / lenT, (cy - Py) / lenT], uH = [(Hx - Px) / lenH, (cy - Py) / lenH], m = 16;
  const sq = `M ${Px + uT[0] * m} ${Py + uT[1] * m} L ${Px + (uT[0] + uH[0]) * m} ${Py + (uT[1] + uH[1]) * m} L ${Px + uH[0] * m} ${Py + uH[1] * m}`;
  // inset: the coin's own frame — blue (toward T′) horizontal, orange (toward H′) vertical, needle at θ
  const I = { x: 700, y: 4, w: 196, h: 196, ox: 742, oy: 154, S: 110 };
  const nx = I.ox + I.S * Math.cos(th), ny = I.oy - I.S * Math.sin(th);
  return (
    <div>
      <svg viewBox="0 0 900 520" style={svgStyle}>
        {/* axes */}
        <line x1={Tx} y1={cy} x2={Hx + 60} y2={cy} stroke={INK} strokeWidth="2.25" />
        <line x1={Tx} y1={cy} x2={Tx} y2={80} stroke={INK} strokeWidth="1.75" />
        <Txt x={Tx + 16} y={104} anchor="start" size={15} fill={INK} bold>band width</Txt>
        <Txt x={Hx + 20} y={cy - 18} anchor="start" size={15} fill={INK} bold>p = P(heads)</Txt>
        <Txt x={Tx} y={cy + 32} size={14}>always T (p=0)</Txt>
        <Txt x={Hx} y={cy + 32} size={14}>always H (p=1)</Txt>
        {/* the Bernoulli circle */}
        <path d={`M ${Tx} ${cy} A ${R} ${R} 0 0 1 ${Hx} ${cy}`} fill="none" stroke={GOLD} strokeWidth={2.5} strokeDasharray="7 7" />
        <circle cx={Tx} cy={cy} r={6} fill={INK} /><circle cx={Hx} cy={cy} r={6} fill={INK} />
        <circle cx={cx} cy={cy} r={5} fill={SOFT} />
        {/* chords and pointer */}
        <line x1={Tx} y1={cy} x2={Px} y2={Py} stroke={TEAL} strokeWidth="3" />
        <line x1={Hx} y1={cy} x2={Px} y2={Py} stroke={GOLD} strokeWidth="3" />
        <line x1={Px} y1={Py} x2={cx} y2={cy} stroke={PURP} strokeWidth="3" markerEnd="url(#arrowPurp)" />
        <defs><marker id="arrowPurp" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,1.2 L9,5 L0,8.8 L2.4,5 z" fill={PURP} /></marker></defs>
        <path d={sq} fill="none" stroke={INK} strokeWidth="1.5" />
        <Txt x={(Tx + Px) / 2 - 22} y={(cy + Py) / 2 - 10} size={17} fill={TEAL} bold>√p</Txt>
        <Txt x={(Hx + Px) / 2 + 30} y={(cy + Py) / 2 - 10} size={17} fill={GOLD} bold>√(1−p)</Txt>
        <Txt x={(Px + cx) / 2 - 20} y={(Py + cy) / 2} anchor="end" size={15} fill={PURP} bold>½</Txt>
        {/* central angle 2θ */}
        <path d={`M ${cx + 60} ${cy} A 60 60 0 0 0 ${cx + 60 * Math.cos(2 * th)} ${cy - 60 * Math.sin(2 * th)}`} fill="none" stroke={RED} strokeWidth="1.75" />
        <Txt x={cx + 84} y={cy - 40} anchor="start" size={15} fill={RED} bold>{near(p, 0.5) ? "90°" : `2θ = ${deg(2 * th)}°`}</Txt>
        {/* θ at the coin, shown with the ½-circle */}
        {show && <>
          <path d={`M ${Px + ar * Math.cos(a0)} ${Py + ar * Math.sin(a0)} A ${ar} ${ar} 0 0 1 ${Px + ar * Math.cos(a1)} ${Py + ar * Math.sin(a1)}`} fill="none" stroke={PURP} strokeWidth="1.75" />
          <Txt x={Px + (ar + 18) * Math.cos(am)} y={Py + (ar + 18) * Math.sin(am) + 5} size={14} fill={PURP} bold>θ</Txt>
          <path d={`M ${T2[0]} ${T2[1]} A ${R} ${R} 0 0 0 ${H2[0]} ${H2[1]}`} fill="none" stroke={PURP} strokeWidth="2.5" strokeDasharray="10 8" opacity="0.8" />
          <circle cx={T2[0]} cy={T2[1]} r="8" fill={PURP} /><Txt x={T2[0] - 14} y={T2[1] + 28} size={15} fill={PURP} bold>T′</Txt>
          <circle cx={H2[0]} cy={H2[1]} r="8" fill={PURP} /><Txt x={H2[0] + 14} y={H2[1] + 28} size={15} fill={PURP} bold>H′</Txt>
          {/* inset */}
          <rect x={I.x} y={I.y} width={I.w} height={I.h} rx={8} fill="#FFFFFF" stroke={LBLUE} strokeWidth="1.5" />
          <Txt x={I.x + 12} y={I.y + I.h - 12} anchor="start" size={12}>the needle, at θ</Txt>
          <line x1={I.ox} y1={I.oy} x2={I.ox + I.S + 26} y2={I.oy} stroke={TEAL} strokeWidth="2.25" />
          <line x1={I.ox} y1={I.oy} x2={I.ox} y2={I.oy - I.S - 26} stroke={GOLD} strokeWidth="2.25" />
          <circle cx={I.ox + I.S} cy={I.oy} r="5" fill={INK} /><Txt x={I.ox + I.S + 4} y={I.oy + 20} size={13} fill={INK} bold>T′</Txt>
          <circle cx={I.ox} cy={I.oy - I.S} r="5" fill={INK} /><Txt x={I.ox - 16} y={I.oy - I.S + 5} anchor="end" size={13} fill={INK} bold>H′</Txt>
          <path d={`M ${I.ox + I.S} ${I.oy} A ${I.S} ${I.S} 0 0 0 ${I.ox} ${I.oy - I.S}`} fill="none" stroke={SOFT} strokeWidth="1.5" strokeDasharray="5 4" />
          <path d={`M ${I.ox + 40} ${I.oy} A 40 40 0 0 0 ${I.ox + 40 * Math.cos(th)} ${I.oy - 40 * Math.sin(th)}`} fill="none" stroke={RED} strokeWidth="1.5" />
          <Txt x={I.ox + 58 * Math.cos(th / 2) + 8} y={I.oy - 58 * Math.sin(th / 2) + 5} anchor="start" size={13} fill={RED} bold>{`${deg(th)}°`}</Txt>
          <line x1={I.ox} y1={I.oy} x2={nx} y2={ny} stroke={PURP} strokeWidth="3" markerEnd="url(#arrowPurp)" />
        </>}
        {/* the coin */}
        <g style={{ cursor: "grab" }} onPointerDown={onDown}>
          <circle cx={Px} cy={Py} r="30" fill="rgba(0,0,0,0)" />
          <circle cx={Px} cy={Py} r={13} fill={GOLD} stroke="#FFFFFF" strokeWidth={2.5} />
        </g>
        <Txt x={Px + (p > 0.6 ? -26 : 26)} y={Py - 22} anchor={p > 0.6 ? "end" : "start"} size={16} fill={TEAL} bold>{near(p, 0.5) ? "fair coin (½, ½)" : `your coin (${p.toFixed(2)}, ${sig(p).toFixed(2)})`}</Txt>
                <Txt x={cx} y={cy + 66} size={14}>{`(p − ½)² + bandwidth² = ¼ · drag the coin`}</Txt>
      </svg>
      <div style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "center", marginTop: 6 }}>
        <Button active={show} ghost={!show} onClick={() => room.publish({ halfCircle: !show }, true)}>{show ? "hide the ½-circle" : "circle of radius ½ around your coin"}</Button>
        <span style={{ fontFamily: MONO, fontSize: 14, color: SOFT }}>p</span>
        <input type="range" min="0" max="1" step="0.01" value={p} onChange={(e) => room.publish({ p: parseFloat(e.target.value) })} style={{ width: 260, accentColor: GOLD }} />
      </div>
    </div>
  );
}

// ── SCENE 6 : two doubts — one circle: any interior point is many blends; on the axis only one — unless the disk is unfolded ──
function FigDoubtsRoom() {
  const [Q, setQ] = useState({ p: 0.5, w: 0.3 });
  // the disk: 0 folded (the half-disk) … 1 unfolded — the same swing-open as the light rounds (slides 21–24)
  const [wantFull, setWantFull] = useState(false);
  const [unf, setUnf] = useState(0);
  const unfRef = useRef(0); unfRef.current = unf;
  useEffect(() => {
    const u0 = unfRef.current, u1 = wantFull ? 1 : 0; if (u0 === u1) return;
    let raf; const t0 = performance.now(), D = 1500;
    const tick = (t) => { const u = Math.min(1, (t - t0) / D), e = u * u * (3 - 2 * u); setUnf(u0 + (u1 - u0) * e); if (u < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [wantFull]);
  const full = unf >= 0.999, fold = Math.cos(Math.PI * unf), below = Math.max(0, -fold);
  const W = 900, H = 470, S = 360, cx = 450, cy = 235, R = S / 2, ry = Math.max(0.01, R * Math.abs(fold));
  const X = (p) => cx + (p - 0.5) * S, Y = (w) => cy - w * S;
  const uy = (w) => (w < 0 ? -w * Math.cos(Math.PI * unf) : w);             // a lower-half point: folded it is mirrored up onto the half-disk, then swings about the floor as the disk unfolds
  const ok = (P) => wantFull || P.w >= -0.002;
  // chords through Q: from a rim point P1 the line P1→Q meets the circle again at P2; keep the pair if both ends are allowed
  const chords = [];
  for (let a = 0; a < 360; a += 15) {
    const P1 = { p: 0.5 + 0.5 * Math.cos(a * DEG), w: 0.5 * Math.sin(a * DEG) }, d = { p: Q.p - P1.p, w: Q.w - P1.w };
    const dd = d.p * d.p + d.w * d.w; if (dd < 1e-6) continue;
    const t = -2 * (d.p * (P1.p - 0.5) + d.w * P1.w) / dd;
    const P2 = { p: P1.p + t * d.p, w: P1.w + t * d.w };
    if (t > 1.001 && ok(P1) && ok(P2) && (P1.p < P2.p - 1e-6 || (Math.abs(P1.p - P2.p) < 1e-6 && P1.w > P2.w))) chords.push([P1, P2]);
  }
  const onAxis = Math.abs(Q.w) < 0.005;
  const dragQ = (e) => {
    const svg = e.currentTarget;
    const move = (ev) => {
      const r = svg.getBoundingClientRect();
      const mx = ((ev.clientX - r.left) / r.width) * W, my = ((ev.clientY - r.top) / r.height) * H;
      let dp = (mx - cx) / S, w = (cy - my) / S;
      if (!wantFull) w = Math.max(0, w);
      if (Math.abs(w) < 0.02) w = 0;                                   // snap onto the axis
      const rr = Math.hypot(dp, w); if (rr > 0.46) { dp *= 0.46 / rr; w *= 0.46 / rr; }
      setQ({ p: 0.5 + dp, w });
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); swallowClick(); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); move(e); e.preventDefault();
  };
  const n = chords.length;
  const caption = n === 0 ? "no pair of coins reaches this point" : n === 1 ? "exactly one pair blends to a point on the axis: always-T with always-H" : `${n} different pairs of coins all blend to this one point`;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ ...svgStyle, cursor: "grab" }} onPointerDown={dragQ}>
        <line x1={X(0) - 24} y1={cy} x2={X(1) + 24} y2={cy} stroke={INK} strokeWidth="2.25" strokeDasharray={unf > 0.02 ? "8 6" : undefined} opacity={1 - 0.45 * unf} />
        <path d={`M ${X(0)} ${cy} A ${R} ${R} 0 0 1 ${X(1)} ${cy}`} fill="none" stroke={INK} strokeWidth="2.25" />
        {/* the hidden half swings open about the floor like a page: its rim is an ellipse that flattens, then opens downward */}
        <path d={`M ${X(0)} ${cy} A ${R} ${ry.toFixed(2)} 0 0 ${fold > 0 ? 1 : 0} ${X(1)} ${cy}`} fill="none" stroke={PURP} strokeWidth="2.25" strokeDasharray={unf > 0.5 ? "none" : "8 6"} opacity={0.3 + 0.7 * below} />
        <circle cx={X(0)} cy={cy} r={6} fill={INK} /><circle cx={X(1)} cy={cy} r={6} fill={INK} />
        <Txt x={X(0) - 30} y={cy + 5} anchor="end" size={14} fill={INK} bold>always T</Txt>
        <Txt x={X(1) + 30} y={cy + 5} anchor="start" size={14} fill={INK} bold>always H</Txt>
        <Txt x={cx} y={Y(0.5) - 22} size={15} fill={INK}>bandwidth — or some other second number?</Txt>
        <g opacity={below}><Txt x={cx} y={Y(-0.5) + 30} size={15} fill={PURP}>negative bandwidth — the floor was a fold</Txt></g>
        <g opacity={1 - below}><Txt x={cx} y={Y(-0.5) + 30} size={15} fill={PURP} bold>half a disk — half of what?</Txt></g>
        {chords.map(([a, b], i) => (<g key={i} opacity={a.w < -0.002 || b.w < -0.002 ? below : 1}>
          <line x1={X(a.p)} y1={Y(uy(a.w))} x2={X(b.p)} y2={Y(uy(b.w))} stroke={SOFT} strokeWidth={1.5} strokeDasharray="5 4" opacity="0.8" />
          <circle cx={X(a.p)} cy={Y(uy(a.w))} r={6} fill={TEAL} stroke="#FFFFFF" strokeWidth={1.5} />
          <circle cx={X(b.p)} cy={Y(uy(b.w))} r={6} fill={RED} stroke="#FFFFFF" strokeWidth={1.5} />
        </g>))}
        <circle cx={X(Q.p)} cy={Y(uy(Q.w))} r={13} fill={GOLD} stroke="#FFFFFF" strokeWidth={2.5} />
        <Txt x={X(Q.p) + (Q.p > 0.5 ? -24 : 24)} y={Y(uy(Q.w)) + 5} anchor={Q.p > 0.5 ? "end" : "start"} size={14} fill={INK} bold>{`(${Q.p.toFixed(2)}, ${Q.w.toFixed(2)}) · drag me`}</Txt>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", justifyContent: "center", marginTop: 6 }}>
        <span style={{ fontFamily: MONO, fontSize: 15, color: onAxis && !wantFull ? RED : INK, textAlign: "center" }}>{caption}</span>
        <Button ghost onClick={() => { const next = !wantFull; setWantFull(next); if (!next && Q.w < 0) setQ({ p: Q.p, w: -Q.w }); }}>{wantFull ? "fold the disk" : "unfold the disk"}</Button>
      </div>
    </div>
  );
}

// ═══════════════════════════ PART II — LIGHT ═══════════════════════════
const DEG = Math.PI / 180;
const beamsOf = (room) => room.beams();
const pAt = (b, angle) => Room.pOf(b.q, angle);
const hasQ = (b, angle) => pAt(b, angle) !== null;

/* a polarizing sheet drawn as a square with hatching at angle `a` (deg, 0 = horizontal) */
function Sheet({ x, y, size = 90, a, label, color = INK, onDown }) {
  const lines = [], r = size * 0.42;
  for (let k = -4; k <= 4; k++) {
    const off = k * (size / 10), hl = Math.sqrt(Math.max(0, r * r - off * off));
    lines.push(<line key={k} x1={-hl} y1={off} x2={hl} y2={off} stroke={color} strokeWidth={1.4} opacity={0.55} />);
  }
  return (
    <g transform={`translate(${x},${y})`} style={onDown ? { cursor: "grab" } : undefined} onPointerDown={onDown}>
      <rect x={-size / 2} y={-size / 2} width={size} height={size} rx={7} fill="#FFFFFF" stroke={color} strokeWidth={2} />
      <g transform={`rotate(${-a})`}>{lines}</g>
      {label && <Txt x={0} y={size / 2 + 24} size={13} fill={color} bold>{label}</Txt>}
    </g>
  );
}
/* knob: a sheet drawn as a round dial you could turn — one bold pointer at angle a, faint grating behind it, pill label below */
function Knob({ x, y, r = 24, a, label, color = INK, tint = "#F2F6FB", len = 1 }) {
  const c = Math.cos(a * DEG), s = Math.sin(a * DEG), gl = [], L = (r - 5) * Math.max(0, Math.min(1, len));
  for (let k = -2; k <= 2; k++) { if (!k) continue; const off = k * (r / 3), hl = Math.sqrt(Math.max(0, (r - 4) ** 2 - off * off)); gl.push(<line key={k} x1={-hl} y1={off} x2={hl} y2={off} stroke={color} strokeWidth={1} opacity={0.28} />); }
  const lw = label ? label.length * 7.6 + 14 : 0;
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={r} fill={tint} stroke={color} strokeWidth={2} />
      <g transform={`rotate(${-a})`}>{gl}</g>
      {len < 1 && <line x1={-(r - 5) * c} y1={(r - 5) * s} x2={(r - 5) * c} y2={-(r - 5) * s} stroke={color} strokeWidth={1.25} strokeDasharray="2 3" opacity={0.45} />}
      {L > 0.5 && <line x1={-L * c} y1={L * s} x2={L * c} y2={-L * s} stroke={color} strokeWidth={3.5} strokeLinecap="round" />}
      <circle r={3} fill={color} />
      {label && <g><rect x={-lw / 2} y={r + 8} width={lw} height={20} rx={10} fill="#FFFFFF" stroke={color} strokeWidth={1.5} /><Txt x={0} y={r + 22} size={12} fill={color} bold>{label}</Txt></g>}
    </g>
  );
}
/* dial chip: a small round "turn" knob (pointer at angle a, faint grating) fused to a pill label — a control, drawn in HTML so it sits with the other buttons */
function DialChip({ a, label, color = INK, tint = "#FFFFFF", onTurn }) {
  const r = 17, c = Math.cos(a * DEG), sn = Math.sin(a * DEG), gl = [];
  for (let k = -2; k <= 2; k++) { if (!k) continue; const off = k * (r / 3), hl = Math.sqrt(Math.max(0, (r - 3) ** 2 - off * off)); gl.push(<line key={k} x1={-hl} y1={off} x2={hl} y2={off} stroke={color} strokeWidth={1} opacity={0.3} />); }
  return (
    <div onClick={onTurn} style={{ display: "inline-flex", alignItems: "center", height: 36, borderRadius: 999, border: `1.5px solid ${color}`, background: tint, paddingRight: 16, paddingLeft: 2, cursor: onTurn ? "pointer" : "default", userSelect: "none" }}>
      <svg width={36} height={36} viewBox="-18 -18 36 36" style={{ display: "block" }}>
        <circle r={r} fill="#FFFFFF" stroke={color} strokeWidth={1.75} />
        <g transform={`rotate(${-a})`}>{gl}</g>
        <line x1={-(r - 4) * c} y1={(r - 4) * sn} x2={(r - 4) * c} y2={-(r - 4) * sn} stroke={color} strokeWidth={3} strokeLinecap="round" />
        <circle r={2.5} fill={color} />
      </svg>
      <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, letterSpacing: 0.2, color, marginLeft: 8 }}>{label}</span>
    </div>
  );
}
/* wave between sheets: arrow of amplitude at angle a (front view) */
function WaveArrow({ x, y, a, amp = 1, color = GOLD }) {
  const L = 40 * amp;
  const dx = Math.cos(a * DEG) * L, dy = -Math.sin(a * DEG) * L;
  return (
    <g>
      <circle cx={x} cy={y} r={42} fill="none" stroke={LBLUE} strokeWidth={1} strokeDasharray="4 4" />
      <line x1={x - dx} y1={y - dy} x2={x + dx} y2={y + dy} stroke={color} strokeWidth={3.5} strokeLinecap="round" opacity={0.25 + 0.75 * amp} />
    </g>
  );
}
/* unpolarized lamplight: wiggles in every direction at once — a faint star, no frame */
function WaveStar({ x, y, color = SOFT }) {
  return (
    <g>
      {[0, 30, 60, 90, 120, 150].map((a) => { const dx = Math.cos(a * DEG) * 34, dy = -Math.sin(a * DEG) * 34; return <line key={a} x1={x - dx} y1={y - dy} x2={x + dx} y2={y + dy} stroke={color} strokeWidth={2.5} strokeLinecap="round" opacity={0.45} />; })}
      <Txt x={x} y={y + 62} size={13}>every direction</Txt>
    </g>
  );
}
function BrightnessBar({ x, y, v, w = 46, h = 170 }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#FFFFFF" stroke={INK} strokeWidth={1.5} rx={5} />
      <rect x={x + 4} y={y + 4 + (h - 8) * (1 - v)} width={w - 8} height={(h - 8) * v} fill={GOLD} rx={3} />
      <Txt x={x + w / 2} y={y + h + 24} size={14} fill={INK} bold>{`${Math.round(v * 100)}%`}</Txt>
    </g>
  );
}
function useDragAngle(setter, cx, cy) {
  return (e) => {
    const svg = e.currentTarget.ownerSVGElement || e.currentTarget.closest("svg");
    const move = (ev) => {
      const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
      const x = (ev.clientX - r.left) * vb.width / r.width, y = (ev.clientY - r.top) * vb.height / r.height;
      let a = Math.atan2(-(y - cy), x - cx) / DEG; a = ((a % 180) + 180) % 180;
      setter(Math.round(a));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); swallowClick(); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); e.preventDefault();
  };
}

// ── SCENE 7 : two pairs of sunglasses ──
function FigLensRoom() {
  const room = Room.usePresenter();
  const a1 = room.state.lens1 ?? 0;
  const a2 = room.state.lens2 ?? 90;
  const visited = room.memo["lens2:visited"] || [];
  const rel = (((a2 - a1) % 180) + 180) % 180;
  useEffect(() => { if (!visited.includes(rel)) room.setMemo("lens2:visited", [...visited, rel].slice(-200)); }, [rel]);
  const T = Room.malus(a1, a2);
  const drag1 = useDragAngle((a) => room.publish({ lens1: a }), 330, 250);
  const drag = useDragAngle((a) => room.publish({ lens2: a }), 560, 250);
  const X0 = 90, X1 = 810, Y0 = 470, Y1 = 380;
  return (
    <div>
      <svg viewBox="0 0 900 520" style={svgStyle}>
                <Txt x={450} y={30} size={15}>lamp → sheet 1 (drag it) → sheet 2 (drag it) → detector</Txt>
        <circle cx={90} cy={250} r={20} fill="#FDEFE3" stroke={GOLD} strokeWidth="2.25" />
        <Txt x={90} y={310} size={14}>lamp</Txt>
        <line x1={125} y1={250} x2={780} y2={250} stroke={LBLUE} strokeWidth="4" />
        <Sheet x={330} y={250} a={a1} label={`sheet 1 · ${a1}°`} onDown={drag1} />
        <WaveArrow x={445} y={250} a={a1} amp={1} />
        <Sheet x={560} y={250} a={a2} label={`sheet 2 · ${a2}°`} color={GOLD} onDown={drag} />
        <WaveArrow x={675} y={250} a={a2} amp={Math.sqrt(T)} />
        <BrightnessBar x={800} y={165} v={T} />
        {/* the cos² curve of the angle BETWEEN the sheets, revealed by the angles the presenter has visited */}
        <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke={SOFT} strokeWidth="1.5" />
        <Txt x={X0} y={Y0 + 18} size={12}>0°</Txt><Txt x={(X0 + X1) / 2} y={Y0 + 18} size={12}>90°</Txt><Txt x={X1} y={Y0 + 18} size={12}>180°</Txt>
        <Txt x={(X0 + X1) / 2} y={Y0 + 36} size={12}>angle between the sheets</Txt>
        {visited.map((v) => <circle key={v} cx={X0 + (v / 180) * (X1 - X0)} cy={Y0 - Room.malus(0, v) * (Y0 - Y1)} r="4" fill={GOLD} />)}
        <circle cx={X0 + (rel / 180) * (X1 - X0)} cy={Y0 - T * (Y0 - Y1)} r="8" fill={GOLD} stroke="#FFFFFF" strokeWidth={1.75} />
        <Txt x={X1 + 30} y={Y1 + 4} anchor="start" size={12}>100%</Txt><Txt x={X1 + 30} y={Y0 + 4} anchor="start" size={12}>0%</Txt>
      </svg>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 14, color: SOFT }}>sheet 2</span>
        {[0, 45, 90, 135].map((a) => <Button key={a} ghost={a2 !== a} onClick={() => room.publish({ lens2: a }, true)}>{`${a}°`}</Button>)}
        <Button ghost onClick={() => room.publish({ lens1: 0 }, true)}>sheet 1 → 0°</Button>
        <Button ghost onClick={() => room.setMemo("lens2:visited", [])}>clear trail</Button>
      </div>
    </div>
  );
}

// ── SCENE 7 (v2) : the sunglasses bench in 3D — a beam of light, two striped sheets, a detector. No theory yet: only what the detector reads. ──
function FigTwoSheets3D() {
  const room = Room.usePresenter();
  const a1 = room.state.lens1 ?? 0, a2 = room.state.lens2 ?? 90;
  const view = ["side view", "3D"].includes(room.state.waveView) ? room.state.waveView : "3D";   // shared with the next slide
  const [st, setSt] = useState({ run: true, yaw: 64, pitch: 16 });
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; const T = { "side view": { yaw: 90, pitch: 22 }, "3D": { yaw: 64, pitch: 16 }, "down the axis": { yaw: 0, pitch: 0 } }[view]; setSt((s) => ({ ...s, ...T })); return; } tgt.current = { "side view": { yaw: 90, pitch: 22 }, "3D": { yaw: 64, pitch: 16 }, "down the axis": { yaw: 0, pitch: 0 } }[view]; }, [view]);
  const [t, setT] = useState(0);
  const stRef = useRef(st); stRef.current = st;
  const tgt = useRef(null), drag = useRef(null);
  useEffect(() => {
    let id;
    const loop = () => {
      if (stRef.current.run) setT((x) => x + 0.016);
      if (tgt.current) {
        const g = tgt.current, v = stRef.current;
        const ny = v.yaw + (g.yaw - v.yaw) * 0.14, np = v.pitch + (g.pitch - v.pitch) * 0.14;
        if (Math.abs(g.yaw - ny) < 0.25 && Math.abs(g.pitch - np) < 0.25) { tgt.current = null; setSt((s) => ({ ...s, yaw: g.yaw, pitch: g.pitch })); }
        else setSt((s) => ({ ...s, yaw: ny, pitch: np }));
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);
  const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const onDown = (e) => { if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId); tgt.current = null; drag.current = { x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch }; };
  const onMove = (e) => { if (!drag.current) return; const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y; setSt((s) => ({ ...s, yaw: cl(drag.current.yaw - dx * 0.35, 10, 100), pitch: cl(drag.current.pitch + dy * 0.35, -22, 22) })); };
  const onUp = (e) => { if (drag.current && e && Math.hypot(e.clientX - drag.current.x, e.clientY - drag.current.y) > 2) swallowClick(); drag.current = null; };
  const c12 = Math.cos((a2 - a1) * DEG);
  const I0 = 1, I1 = 0.5, I2 = I1 * c12 * c12;                       // what the detector would read after the lamp · sheet 1 · sheet 2
  const T2 = c12 * c12, pct = Math.round(T2 * 100);                   // the detector compares with what reached sheet 2: aligned → 100 %
  const name = (g) => ((g % 180) + 180) % 180 === 0 ? "horizontal" : g === 90 ? "vertical" : g === 45 || g === 135 ? "diagonal" : g + "°";
  const ps = st.yaw * DEG, phv = st.pitch * DEG;
  const cps = Math.cos(ps), sps = Math.sin(ps), cph = Math.cos(phv), sph = Math.sin(phv);
  const cx = 450, cyy = 240, S = 140;
  const proj = (x, y, z) => { const px = x * cps + z * sps, z1 = -x * sps + z * cps; return [cx + S * px, cyy - S * (y * cph - z1 * sph)]; };
  const L = 3.04, z1 = -L / 3, z2 = L / 3, hs = 0.8;
  const Iat = (z) => z < z1 ? I0 : z < z2 ? I1 : I2;
  const P = (z) => proj(0, 0, z);
  // the beam: three straight pieces, each as wide and as bright as the light in it
  const seg = (za, zb, I, key) => { const A = P(za), B = P(zb); return (<g key={key}>
    {I < 0.01 && <line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={LBLUE} strokeWidth={1.5} strokeDasharray="4 6" />}
    {I >= 0.01 && <line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={GOLD} strokeWidth={6 + 26 * Math.sqrt(I)} strokeLinecap="butt" opacity={0.14 + 0.2 * I} />}
    {I >= 0.01 && <line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={GOLD} strokeWidth={2 + 6 * Math.sqrt(I)} strokeLinecap="butt" opacity={0.45 + 0.45 * I} />}
  </g>); };
  // grains of light riding the beam: each carries a fixed lot; a sheet lets a grain through only if its lot is under the fraction that passes
  const ND = 64, rnd = (k, m) => { const x = Math.sin(k * 127.1 + m * 311.7) * 43758.5453; return x - Math.floor(x); };
  const grains = Array.from({ length: ND }, (_, k) => {
    const z = -L + ((k / ND + t * 0.55) % 1) * 2 * L;
    const lot = rnd(k, 1), ox = (rnd(k, 2) - 0.5) * 0.34, oy = (rnd(k, 3) - 0.5) * 0.34;
    if (lot >= Iat(z)) return null;
    const q = proj(ox, oy, z);
    return <circle key={k} cx={q[0]} cy={q[1]} r={3.2} fill="#FFFFFF" stroke={GOLD} strokeWidth={1.5} opacity={0.95} />;
  });
  const sqAt = (z) => [[-hs, -hs], [hs, -hs], [hs, hs], [-hs, hs]].map((c) => proj(c[0], c[1], z).map((v) => v.toFixed(1)).join(",")).join(" ");
  const SheetG = ({ z, ang, col, label }) => { const ca = Math.cos(ang * DEG), sa = Math.sin(ang * DEG); const lb = proj(0, -hs - 0.42, z); return (<g>
    <polygon points={sqAt(z)} fill="#FFFFFF" fillOpacity={0.55} stroke={col} strokeWidth={2.5} />
    {[-3, -2, -1, 0, 1, 2, 3].map((k) => { const off = k * 0.2; const px = -sa * off, py = ca * off; const half = Math.sqrt(Math.max(0, hs * hs - off * off)) * 0.98; const A = proj(px - ca * half, py - sa * half, z), B = proj(px + ca * half, py + sa * half, z); return <line key={k} x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={col} strokeWidth={k === 0 ? 3 : 1.6} opacity={k === 0 ? 0.7 : 0.4} strokeLinecap="round" />; })}
    <Txt x={lb[0]} y={lb[1]} size={14} fill={col} bold>{label}</Txt>
  </g>); };
  const lamp = P(-L), det = P(L), detLb = proj(0, -hs - 0.42, L), lampLb = proj(0, -hs - 0.42, -L);
  const BH = 120, BW = 22;
  return (
    <div style={{ width: "100%" }}>
      <svg viewBox="0 0 900 470" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        style={{ width: "100%", display: "block", touchAction: "none", userSelect: "none", cursor: "grab" }}>
        {seg(-L, z1, I0, "b0")}{seg(z1, z2, I1, "b1")}{seg(z2, L, I2, "b2")}
        {grains}
        <circle cx={lamp[0]} cy={lamp[1]} r={22} fill="#FDEFE3" stroke={GOLD} strokeWidth={2.5} />
        <circle cx={lamp[0]} cy={lamp[1]} r={9} fill={GOLD} />
        <Txt x={lampLb[0]} y={lampLb[1]} size={14} fill={INK} bold>lamp</Txt>
        <SheetG z={z1} ang={a1} col={TEAL} label={"sheet 1 · " + name(a1)} />
        <SheetG z={z2} ang={a2} col={INK} label={"sheet 2 · " + name(a2)} />
        <g>
          <rect x={det[0] - BW / 2} y={det[1] - BH / 2} width={BW} height={BH} fill="#FFFFFF" stroke={INK} strokeWidth={2} />
          <rect x={det[0] - BW / 2} y={det[1] - BH / 2 + BH * (1 - T2)} width={BW} height={BH * T2} fill={GOLD} />
          <Txt x={det[0]} y={det[1] + BH / 2 + 20} size={14} fill={INK} bold>{pct + "%"}</Txt>
          <Txt x={Math.min(det[0], 900 - 36)} y={det[1] - BH / 2 - 12} size={14} fill={INK} bold>detector</Txt>
        </g>
        <text x={25} y={30} fontFamily={MONO} fontSize="16">
          <tspan fill={INK}>lamp → sheet 1 (</tspan><tspan fill={INK} fontWeight="700">{name(a1)}</tspan><tspan fill={INK}>) → sheet 2 (</tspan><tspan fill={INK} fontWeight="700">{name(a2)}</tspan><tspan fill={INK}>) → detector: </tspan><tspan fill={GOLD} fontWeight="700">{pct + "%"}</tspan><tspan fill={INK}> of what left sheet 1</tspan>
        </text>
        <text x={25} y={454} fontFamily={MONO} fontSize="14" fill={SOFT}>{"sheet 1: about half gets through · sheet 2: " + pct + "% of that — " + (pct >= 99 ? "same stripes, nothing more lost" : pct === 0 ? "crossed stripes, all lost" : "turned stripes, part lost")}</text>
      </svg>
      <div style={{ width: "100%", marginTop: 6, boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
          <span style={{ fontFamily: MONO, fontSize: 15, color: SOFT }}>sheet 1 — the stripes' direction</span>
          <span style={{ fontFamily: MONO, fontSize: 15, color: INK, fontWeight: 700 }}>{a1 + "° · " + name(a1) + " → about half gets through"}</span>
        </div>
        <input type="range" min="0" max="180" step="1" value={a1} onChange={(e) => room.publish({ lens1: +e.target.value })} style={{ width: "100%", accentColor: TEAL, marginTop: 2 }} />
      </div>
      <div style={{ width: "100%", marginTop: 2, boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
          <span style={{ fontFamily: MONO, fontSize: 15, color: SOFT }}>sheet 2 — the stripes' direction</span>
          <span style={{ fontFamily: MONO, fontSize: 15, color: INK, fontWeight: 700 }}>{a2 + "° · " + name(a2) + " → " + pct + "% of that"}</span>
        </div>
        <input type="range" min="0" max="180" step="1" value={a2} onChange={(e) => room.publish({ lens2: +e.target.value })} style={{ width: "100%", accentColor: INK, marginTop: 2 }} />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 6 }}>
        <Button ghost onClick={() => setSt((s) => ({ ...s, run: !s.run }))}>{st.run ? "❙❙" : "▶"}</Button>
        <Menu label={"sheet 1 · " + name(a1)} value={a1} items={[[0, "horizontal"], [90, "vertical"]]} onPick={(g) => room.publish({ lens1: g }, true)} />
        <Menu label={"sheet 2 · " + name(a2)} value={a2} items={[[0, "horizontal"], [45, "diagonal"], [90, "vertical"]]} onPick={(g) => room.publish({ lens2: g }, true)} />
        <Menu label={"light · " + ((room.state.lightMode ?? "wave") === "beam" ? "beam" : "wave")} value={room.state.lightMode ?? "wave"} items={[["beam", "beam of light"], ["wave", "the wave (next slide)"]]} onPick={(v) => room.publish({ lightMode: v }, true)} />
        <Menu label={"view · " + view} value={view} items={[["side view", "side view"], ["3D", "3D view"]]} onPick={(v) => room.publish({ waveView: v }, true)} />
      </div>
    </div>
  );
}

// ── SCENE 8 : the polarizer is the coin toss — every phone's fraction behind the H-sheet ──
function FigPhotonRoom() {
  const room = Room.usePresenter();
  const q = room.state.question ?? 0;
  const bs = beamsOf(room).filter((b) => hasQ(b, q));
  const N = bs.reduce((a, b) => a + b.q[String(q)].n, 0);
  const X0 = 100, X1 = 800;
  return (
    <div>
      <svg viewBox="0 0 900 400" style={svgStyle}>
                <Txt x={450} y={30} size={15}>{`one photon at a time through the ${q}° sheet — pass or blocked, heads or tails`}</Txt>
        <circle cx={90} cy={120} r={18} fill="#FDEFE3" stroke={GOLD} strokeWidth="2.25" />
        <line x1={115} y1={120} x2={520} y2={120} stroke={LBLUE} strokeWidth="3.5" />
        <Sheet x={330} y={120} size={70} a={q} label={`${q}° sheet`} />
        <rect x={540} y={90} width={70} height={60} rx="8" fill="#FFFFFF" stroke={INK} strokeWidth="1.75" />
        <Txt x={575} y={127} size={14} fill={INK} bold>click?</Txt>
        <Txt x={760} y={112} size={15} fill={INK} bold>{`${N} photons`}</Txt>
        <Txt x={760} y={136} size={13}>{`from ${bs.length} beams`}</Txt>
        <line x1={X0} y1={300} x2={X1} y2={300} stroke={INK} strokeWidth="2.25" />
        <Txt x={X0} y={330} size={13}>0 · never passes</Txt><Txt x={(X0 + X1) / 2} y={330} size={13}>½</Txt><Txt x={X1} y={330} size={13}>1 · always passes</Txt>
        <Txt x={450} y={230} size={14}>each beam's fraction passed · secret angles, nothing revealed yet</Txt>
        {bs.map((b) => { const f = pAt(b, q), x = X0 + f * (X1 - X0); return (<g key={b.slot}>
          <circle cx={x} cy={300} r={8 + Math.min(6, b.q[String(q)].n / 10)} fill={GOLD} opacity="0.6" stroke="#FFFFFF" strokeWidth={1.5} />
          <text x={x} y={280} textAnchor="middle" fontSize="18">{b.tag}</text>
        </g>); })}
      </svg>
    </div>
  );
}

// ── SCENE 8 (rounds in light) : replay the three coins with photons — fraction and bandwidth on the Bernoulli disk, and the photon's own view ──
const LROUND = {
  A: { col: TEAL, name: "round A", title: "everyone's beam tilts the same way, 45° — equal H and V parts", short: "the fair beam", sub: "same 45° beam for everyone" },
  B: { col: PURP, name: "round B", title: "everyone's beam is horizontal or vertical — nobody knows which", short: "the mystery beam", sub: "H or V — nobody knows which" },
  C: { col: GOLD, name: "round C", title: "everyone's own beam, tilted by a secret angle", short: "the secret beam", sub: "a secret angle per seat" },
};
const RNAME = { A: "fair", B: "mystery", C: "secret" }, RKEY = { fair: "A", mystery: "B", secret: "C" };
function FigLightRound({ phi: phiProp, ghost, pick, pickSheet: pickSheetProp, recap }) {
  const room = Room.usePresenter();
  const round = ["A", "B", "C"].includes(room.state.lround) ? room.state.lround : "A";
  const BEAMS = [30, 45, 60, 90], SHEETS = [0, 45];
  const pickable = pick === true || pick === "true";                        // two dials with a menu: round A's beam (30°, 45°, 60°, 90°) and the sheet (0°, 45°)
  const recapOn = recap === true || recap === "true";                        // recap: the sheet dial is fixed on compare, the beam dial picks the ROUND (fair · mystery · secret), and the sheet can be turned to show the 90° turn
  const sheetPick = pickable || recapOn || pickSheetProp === true || pickSheetProp === "true"; // pick-sheet: only the sheet dial gets the menu
  const [openMenu, setOpenMenu] = useState(null);                           // "beam" | "sheet" | null
  const [phiSel, setPhiSel] = useState(Number(phiProp ?? 0));
  const [cmp, setCmp] = useState(recapOn);                                     // compare: the same beam through BOTH sheets, side by side on one disk
  // the picked beam is the room's, the picked sheet is the room's question: publish both so the participants' photons leave at that tilt and meet that sheet
  const pickBeam = (v) => { room.publish({ abeam: v }, true); };
  const pickSheet = (v) => { if (v === "compare") { setCmp(true); setWantFull(true); return; } setCmp(false); setPhiSel(v); room.publish({ question: v }, true); };
  const keep = (e) => { e.stopPropagation(); e.preventDefault(); };          // the dropdown's clicks are not taps-to-advance
  useEffect(() => { if (sheetPick && SHEETS.includes(Number(room.state.question))) setPhiSel(Number(room.state.question)); }, [sheetPick, room.state.question]);
  const phi = sheetPick ? phiSel : Number(phiProp ?? 0);                     // the sheet's angle — one question per slide
  const abeam = [30, 45, 60, 90].includes(Number(room.state.abeam)) ? Number(room.state.abeam) : 45;
  const beta = round === "A" ? abeam : null;                                // the one known tilt (round A) — 45° unless the dial says otherwise
  const lk = (alpha) => round === "A" && beta !== 45 ? alpha + "@" + beta : String(alpha); // tallies keyed by sheet, and by beam when it is not the usual 45°
  const LR = room.lightRound(round, lk(phi));
  const col = LROUND[round].col;
  // the disk: 0 folded (the half-disk, bandwidth unsigned) … 1 unfolded (the full circle — the floor was a fold, bandwidth keeps its sign)
  const [wantFull, setWantFull] = useState(recapOn);
  const [unf, setUnf] = useState(recapOn ? 1 : 0);
  const unfRef = useRef(recapOn ? 1 : 0); unfRef.current = unf;
  useEffect(() => {
    const u0 = unfRef.current, u1 = wantFull ? 1 : 0; if (u0 === u1) return;
    let raf; const t0 = performance.now(), D = 1500;
    const tick = (t) => { const u = Math.min(1, (t - t0) / D), e = u * u * (3 - 2 * u); setUnf(u0 + (u1 - u0) * e); if (u < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [wantFull]);
  // the sign the half-disk hides: each beam's own tilt against the sheet decides the side — the sign of sin 2(θ − φ)
  const tilt = (slot) => round === "A" ? beta : round === "B" ? (slot % 2 === 1 ? 0 : 90) : Room.secrets(slot).theta;
  const sgnOf = (slot, alpha) => Math.sin(2 * (tilt(slot) - alpha) * DEG) < -1e-9 ? -1 : 1;
  const sgn = {}; LR.phones.forEach((p) => { sgn[p.from] = sgnOf(p.slot, phi); });
  const uy = (s, sg) => (sg < 0 ? s * Math.cos(Math.PI * unf) : s);          // a lower-half point swings about the floor as the disk unfolds
  // the room's secret (round C): the mixture of the seated beams is the centroid of their rim points — Σ(cos 2(θ−φ), sin 2(θ−φ)·cos δ) weighted by photons
  const [revealed, setRevealed] = useState(false);
  useEffect(() => { setRevealed(false); }, [round]);
  const secret = (() => {
    if (round !== "C" || !LR.phones.length) return null;
    let c = 0, s = 0, n = 0;
    LR.phones.forEach((p) => { const sc = Room.secrets(p.slot), w = p.n || 1, a = 2 * (sc.theta - phi) * DEG; c += w * Math.cos(a); s += w * Math.sin(a) * Math.cos(sc.delta * DEG); n += w; });
    c /= n; s /= n;
    const len = Math.hypot(c, s), two = Math.atan2(s, c) / DEG;             // length: purity (1 pure … 0 fully mixed) · direction: 2× the room's tilt against the sheet
    const th = ((two / 2) % 180 + 180) % 180;
    return { p: 0.5 + c / 2, w: uy(Math.abs(s) / 2, s < 0 ? -1 : 1), len, th, thAbs: ((th + phi) % 180 + 180) % 180, near: len < 0.2 };
  })();
  const arcFrom0 = (ox, oy, r, ang) => `M ${ox + r} ${oy} A ${r} ${r} 0 ${Math.abs(ang) > 180 ? 1 : 0} ${ang > 0 ? 0 : 1} ${(ox + r * Math.cos(ang * DEG)).toFixed(1)} ${(oy - r * Math.sin(ang * DEG)).toFixed(1)}`;
  // photon-by-photon history, as for the coins: pooled [N, frac] and per participant [N, ownFrac, ownN]; one pair of keys per round and sheet angle
  const hk = "lhist:" + round + ":" + lk(phi), pk = "lphist:" + round + ":" + lk(phi);
  const hist = room.memo[hk] || [], phist = room.memo[pk] || {};
  useEffect(() => {
    const last = hist.length ? hist[hist.length - 1] : null;
    if (LR.n > 0 && (!last || last[0] !== LR.n)) {
      room.setMemo(hk, [...hist, [LR.n, LR.frac]].slice(-3000));
      const next = { ...phist };
      LR.phones.forEach((p) => { const h = next[p.from] || [], l = h.length ? h[h.length - 1] : null; if (!l || l[2] !== p.n) next[p.from] = [...h, [LR.n, p.frac, p.n]].slice(-400); });
      room.setMemo(pk, next);
    }
    if (LR.n === 0 && (hist.length || Object.keys(phist).length)) { room.setMemo(hk, []); room.setMemo(pk, {}); }
  }, [LR.n, LR.passed, round, hk]);
  // replay of the paths on entry and on demand — same choreography as scene 2
  const wrap = useRef(null);
  const enter = useSlideEnter(wrap, () => { const el = wrap.current && wrap.current.querySelector("svg"); if (el) el.style.visibility = "hidden"; });
  // recap: no replay — the final pointers only
  const { rev, playing, toggle } = useReplay(hist.length > 0 && !recapOn, enter, [round], () => { const el = wrap.current && wrap.current.querySelector("svg"); if (el) el.style.visibility = ""; });
  const live = rev >= 1;
  const vis = live ? hist : hist.slice(0, Math.ceil(rev * hist.length));
  const cutN = live ? LR.n : (vis.length ? vis[vis.length - 1][0] : 0);
  const at = (h, N) => { let l = null; for (const q of h) { if (q[0] <= N) l = q; else break; } return l; };
  const parts = LR.phones.map((p) => {
    if (live) return { from: p.from, tag: p.tag, frac: p.frac, n: p.n };
    const l = at(phist[p.from] || [], cutN);
    return { from: p.from, tag: p.tag, frac: l ? l[1] : 0, n: l ? l[2] : 0 };
  }).filter((p) => p.n > 0);
  // the room's second number: photon-weighted mean of every beam's own bandwidth (± E(sd), as in the coin rounds)
  const expSd = (N) => { let s = 0, w = 0; Object.keys(phist).forEach((k) => { const l = at(phist[k], N); if (l) { s += uy(sig(l[1]), sgn[k] ?? 1) * l[2]; w += l[2]; } }); return w ? s / w : 0; };
  const Lf = live ? LR.frac : (vis.length ? vis[vis.length - 1][1] : 0);
  const pool = cutN > 0 ? { p: Lf, w: expSd(cutN) } : null;
  const trail = recapOn ? [] : vis.filter((h) => h[0] >= 3);
  const defined = pool && Math.hypot(pool.p - 0.5, pool.w) >= 0.05;        // a pointer needs length: at the centre no direction is defined
  const twoTh = defined ? Math.atan2(pool.w, pool.p - 0.5) / DEG : null;   // the pointer's angle on the disk, centre → room (0…180)
  const plen = pool ? Math.min(1, Math.hypot(pool.p - 0.5, pool.w) / 0.5) : 0; // the pointer's length, rim = 1 — the needle shares it
  const thLive = twoTh === null ? null : twoTh / 2;                          // the needle: half of it
  const settled = live && LR.n >= 60;                                        // reveal the exact angle once the room has settled
  const pth = beta === null ? null : Math.cos((phi - beta) * DEG) ** 2;     // Malus: where the fair beam should land
  const sgM = beta === null ? 1 : (Math.sin(2 * (beta - phi) * DEG) < -1e-9 ? -1 : 1);
  // faint: the same round through the 0° sheet (the previous slides' result)
  // compare: the other sheet's room — hollow dots, dashed path and pointer; the two pointers stand 90° apart (2 × 45°)
  const cmpOn = sheetPick && cmp, other = SHEETS.find((s) => s !== phi);
  const LR2 = cmpOn ? room.lightRound(round, lk(other)) : null;
  const sgn2 = {}; if (LR2) LR2.phones.forEach((p) => { sgn2[p.from] = sgnOf(p.slot, other); });
  const hist2 = cmpOn ? room.memo["lhist:" + round + ":" + lk(other)] || [] : [], phist2 = cmpOn ? room.memo["lphist:" + round + ":" + lk(other)] || {} : {};
  const expSd2 = (N) => { let s = 0, w = 0; Object.keys(phist2).forEach((k) => { const l = at(phist2[k], N); if (l) { s += uy(sig(l[1]), sgn2[k] ?? 1) * l[2]; w += l[2]; } }); return w ? s / w : 0; };
  const pool2 = LR2 && LR2.n > 0 ? { p: LR2.frac, w: expSd2(LR2.n) } : null;
  const trail2 = recapOn ? [] : hist2.filter((h) => h[0] >= 3);
  const defined2 = !!pool2 && Math.hypot(pool2.p - 0.5, pool2.w) >= 0.05;
  const twoTh2 = defined2 ? Math.atan2(pool2.w, pool2.p - 0.5) / DEG : null;
  const plen2 = pool2 ? Math.min(1, Math.hypot(pool2.p - 0.5, pool2.w) / 0.5) : 0;
  const thLive2 = twoTh2 === null ? null : twoTh2 / 2;
  const pth2 = beta === null || !cmpOn ? null : Math.cos((other - beta) * DEG) ** 2;
  const sgM2 = beta === null ? 1 : (Math.sin(2 * (beta - other) * DEG) < -1e-9 ? -1 : 1);
  const hidden = cmpOn && unf < 0.5 && beta !== null && sgM !== sgM2;         // folded, one of the two rooms is mirrored up — the turn only shows unfolded
  // recap: turn the sheet α (0…45°) — a copy of the 0° room turns 2α clockwise about the centre and lands on the 45° room
  const [al, setAl] = useState(0);
  const alRef = useRef(0); alRef.current = al;
  const turnAnim = useRef(null);
  useEffect(() => () => cancelAnimationFrame(turnAnim.current), []);
  const turnTo = (target) => {
    cancelAnimationFrame(turnAnim.current);
    const a0 = alRef.current, t0 = performance.now(), D = 300 + 2400 * Math.abs(target - a0) / 45;
    const tick = (t) => { const u = Math.min(1, (t - t0) / D), e = u * u * (3 - 2 * u); setAl(a0 + (target - a0) * e); if (u < 1) turnAnim.current = requestAnimationFrame(tick); };
    turnAnim.current = requestAnimationFrame(tick);
  };
  const turning = recapOn && al > 0.3;
  const recapCap = al < 0.5 ? `${LROUND[round].short} · 0° sheet solid, 45° sheet dashed · pointers ${defined && defined2 ? Math.round(Math.abs(twoTh2 - twoTh)) + "°" : "…"} apart — turn the sheet` : al < 44 ? `sheet turned ${Math.round(al)}° → the pointer turns ${Math.round(2 * al)}° — twice as far` : `sheet turned 45° → the pointer turned 90° and lands on the 45° sheet's pointer`;
  const arcBetween = (ox, oy, r, a1, a2) => `M ${(ox + r * Math.cos(a1 * DEG)).toFixed(1)} ${(oy - r * Math.sin(a1 * DEG)).toFixed(1)} A ${r} ${r} 0 ${Math.abs(a2 - a1) > 180 ? 1 : 0} ${a2 > a1 ? 0 : 1} ${(ox + r * Math.cos(a2 * DEG)).toFixed(1)} ${(oy - r * Math.sin(a2 * DEG)).toFixed(1)}`;
  // faint: the same round through the 0° sheet (the previous slides' result)
  const G = ghost && phi !== 0 ? room.lightRound(round, lk(0)) : null;
  const gW = G && G.n ? G.phones.reduce((s, g) => s + uy(sig(g.frac), sgnOf(g.slot, 0)) * g.n, 0) / G.n : 0;
  const Sg = 640 - 180 * unf, cyg = 460 - 160 * unf, Hg = 520 + 80 * unf;      // unfolded: 900×600, centre (450,300), diameter 460 — the twins figure's disk
  // re-anchor the host panel's raster to the plane axes: one tile = 0.05 in p and in bandwidth
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const svg = el.querySelector("svg"); if (!svg) return;
    let panel = el.parentElement;
    while (panel && getComputedStyle(panel).backgroundImage === "none") panel = panel.parentElement;
    if (!panel) return;
    panel.style.overflow = "visible";                                        // the bench is drawn above the panel's top edge
    // unfolded, the disk is smaller: coarsen the tile to 0.1 so the raster stays as wide as on the folded slides
    const A = { x: 450 - Sg / 2, y: cyg, g: Sg * (Sg * 0.05 < 28 ? 0.1 : 0.05) };
    const fit = () => {
      const pr = panel.getBoundingClientRect(), sr = svg.getBoundingClientRect();
      if (!pr.width || !sr.width) return;
      const k = panel.offsetWidth / pr.width;
      const s = (sr.width * k) / 900;
      const tile = A.g * s;
      const ox = (sr.left - pr.left) * k - panel.clientLeft + A.x * s - 0.75;
      const oy = (sr.top - pr.top) * k - panel.clientTop + A.y * s - 0.75;
      panel.style.backgroundImage = "linear-gradient(to right, #E1F3FC 0 1.5px, transparent 1.5px), linear-gradient(to bottom, #E1F3FC 0 1.5px, transparent 1.5px)";
      panel.style.backgroundSize = `${tile}px ${tile}px`;
      panel.style.backgroundPosition = `${ox}px ${oy}px`;
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(svg); ro.observe(panel);
    return () => ro.disconnect();
  }, [unf]);
  const plane = Plane({ H: Hg, S: Sg, cy: cyg, lower: unf, showBand: true, showArc: true, left: "no click · p = 0", right: "click · p = 1", children: ({ X, Y }) => (<>
    {/* bench, top right: the beam's own tilt, the sheet — and the needle between them, θ = beam − sheet */}
    {(() => {
      const BX = 596, SX = 722, NX = 848, KY = 34, R = 26;
      const pill = (x, w, c, t) => { const W = t.length * 7.6 + 14; return (<g><rect x={x - W / 2} y={KY + R + 8} width={W} height={20} rx={10} fill="#FFFFFF" stroke={c} strokeWidth={1.5} /><Txt x={x} y={KY + R + 22} size={12} fill={c} bold>{t}</Txt></g>); };
      const star = (x, c) => [0, 30, 60, 90, 120, 150].map((d) => <line key={d} x1={x - 20 * Math.cos(d * DEG)} y1={KY + 20 * Math.sin(d * DEG)} x2={x + 20 * Math.cos(d * DEG)} y2={KY - 20 * Math.sin(d * DEG)} stroke={c} strokeWidth={2} strokeLinecap="round" opacity={0.25} />);
      const two = (x, c, a1, a2) => [a1, a2].map((d) => <line key={d} x1={x - 21 * Math.cos(d * DEG)} y1={KY + 21 * Math.sin(d * DEG)} x2={x + 21 * Math.cos(d * DEG)} y2={KY - 21 * Math.sin(d * DEG)} stroke={c} strokeWidth={3.5} strokeLinecap="round" opacity={0.4} />);
      const pur = pool ? ` · ${Math.round(plen * 100)}%` : "";                 // the needle's length is the room's purity: rim 100%, centre 0%
      const nB = (phi === 45 ? "needle · ±45°" : `needle · ${phi}° or ${90 - phi}°`) + pur;
      const dash = (x, a, L, c) => <line x1={x - L * Math.cos(a * DEG)} y1={KY + L * Math.sin(a * DEG)} x2={x + L * Math.cos(a * DEG)} y2={KY - L * Math.sin(a * DEG)} stroke={c} strokeWidth={2.5} strokeLinecap="round" strokeDasharray="4 3" />;
      const menu = (x, c, tint, opts, cur, onPick) => (<g>
        <rect x={x - 44} y={KY + R + 34} width={88} height={opts.length * 24 + 6} rx={10} fill="#FFFFFF" stroke={c} strokeWidth={1.5} />
        {opts.map((v, i) => (<g key={v} role="button" style={{ cursor: "pointer" }} onPointerDown={keep} onPointerUp={keep} onClick={(e) => { keep(e); onPick(v); setOpenMenu(null); }}>
          <rect x={x - 40} y={KY + R + 38 + i * 24} width={80} height={22} rx={7} fill={cur === v ? tint : "#FFFFFF"} />
          <Txt x={x} y={KY + R + 53 + i * 24} size={12} fill={cur === v ? c : INK} bold={cur === v}>{typeof v === "number" ? `${v}°` : v}</Txt>
        </g>))}
      </g>);
      const caret = (k) => openMenu === k ? "\u25B4" : "\u25BE";
      const toggle = (k) => (e) => { keep(e); setOpenMenu((o) => (o === k ? null : k)); };
      const cr = recapOn ? ` ${caret("beam")}` : "";                             // recap: the beam dial opens the round menu
      const clickable = (child) => recapOn ? <g role="button" style={{ cursor: "pointer" }} onPointerDown={keep} onPointerUp={keep} onClick={toggle("beam")}>{child}</g> : child;
      return (<g transform={`translate(0,${-158 + 40 * unf})`}>{/* the bench sits above the panel: dials level with the kicker, labels with the title */}
        <line x1={554} y1={KY} x2={766} y2={KY} stroke={LBLUE} strokeWidth="4" />
        {beta !== null && !pickable && clickable(<Knob x={BX} y={KY} r={R} a={beta} color={col} tint="#FDEFE3" label={`beam · ${beta}°${cr}`} />)}
        {beta !== null && pickable && <g role="button" style={{ cursor: "pointer" }} onPointerDown={keep} onPointerUp={keep} onClick={toggle("beam")}>
          <Knob x={BX} y={KY} r={R} a={beta} color={col} tint="#FDEFE3" label={`beam · ${beta}° ${caret("beam")}`} />
        </g>}
        {beta === null && round === "B" && clickable(<g><circle cx={BX} cy={KY} r={R} fill="#FFFFFF" stroke={col} strokeWidth={2} /><g opacity={0.35}>{two(BX, col, 0, 90)}</g><circle cx={BX} cy={KY} r={5} fill={col} />{pill(BX, 92, col, "beam · H or V" + cr)}</g>)}
        {beta === null && round !== "B" && !(revealed && secret) && clickable(<g><circle cx={BX} cy={KY} r={R} fill="#FDEFE3" stroke={col} strokeWidth={2} />{star(BX, col)}<Txt x={BX} y={KY + 7} size={20} fill={col} bold>?</Txt>{pill(BX, 88, col, "beam · secret" + cr)}</g>)}
        {beta === null && round !== "B" && revealed && secret && clickable(<g>
          <circle cx={BX} cy={KY} r={R} fill="#FFFFFF" stroke={col} strokeWidth={2} />
          <g opacity={0.35}>{star(BX, col)}</g>
          <line x1={BX - R * secret.len * Math.cos(secret.thAbs * DEG)} y1={KY + R * secret.len * Math.sin(secret.thAbs * DEG)} x2={BX + R * secret.len * Math.cos(secret.thAbs * DEG)} y2={KY - R * secret.len * Math.sin(secret.thAbs * DEG)} stroke={col} strokeWidth={3} strokeLinecap="round" />
          <circle cx={BX} cy={KY} r={4} fill={col} />
          {pill(BX, 92, col, `room · ${Math.round(secret.thAbs)}° · ${Math.round(secret.len * 100)}%${cr}`)}
        </g>)}
        {!sheetPick && <Knob x={SX} y={KY} r={R} a={phi} label={`sheet · ${phi}°`} />}
        {recapOn && <g>
          <Knob x={SX} y={KY} r={R} a={phi} label={`sheet · ${phi}° & ${other}°`} />
          {dash(SX, other, R - 5, INK)}
          {turning && <line x1={SX - (R - 5) * Math.cos(al * DEG)} y1={KY + (R - 5) * Math.sin(al * DEG)} x2={SX + (R - 5) * Math.cos(al * DEG)} y2={KY - (R - 5) * Math.sin(al * DEG)} stroke={GOLD} strokeWidth={3.5} strokeLinecap="round" />}
          {turning && <path d={arcFrom0(SX, KY, R + 8, al)} fill="none" stroke={GOLD} strokeWidth={3} strokeLinecap="round" />}
          {turning && <Txt x={SX + R + 14} y={KY - 14} anchor="start" size={12} fill={GOLD} bold>{`${Math.round(al)}°`}</Txt>}
        </g>}
        {sheetPick && !recapOn && <g role="button" style={{ cursor: "pointer" }} onPointerDown={keep} onPointerUp={keep} onClick={toggle("sheet")}>
          <Knob x={SX} y={KY} r={R} a={phi} label={cmpOn ? `sheet · ${phi}° & ${other}° ${caret("sheet")}` : `sheet · ${phi}° ${caret("sheet")}`} />
          {cmpOn && dash(SX, other, R - 5, INK)}
        </g>}
        <Txt x={786} y={KY + 7} size={20} fill={SOFT}>→</Txt>
        {/* the needle follows the room: half the angle of the pointer centre → room on the disk; the number only once the room has settled */}
        {!cmpOn && <Knob x={NX} y={KY} r={R} a={thLive ?? 0} len={defined ? plen : 0} color={GOLD} tint="#FFFFFF" label={settled ? `needle · ${Math.round(thLive)}°${pur}` : thLive === null ? "needle · ?" : `needle · …${pur}`} />}
        {!cmpOn && thLive !== null && !settled && Math.abs(thLive) > 1 && <path d={arcFrom0(NX, KY, R, thLive)} fill="none" stroke={GOLD} strokeWidth={4} strokeLinecap="round" opacity={0.5} />}
        {cmpOn && <g>
          <Knob x={NX} y={KY} r={R} a={thLive ?? 0} len={defined ? plen : 0} color={GOLD} tint="#FFFFFF" label={thLive !== null && thLive2 !== null ? `needle · ${Math.round(thLive)}° & ${Math.round(thLive2)}°` : "needle · ? & ?"} />
          {defined2 && dash(NX, thLive2, (R - 5) * plen2, GOLD)}
          {thLive !== null && thLive2 !== null && <path d={arcBetween(NX, KY, R + 5, thLive, thLive2)} fill="none" stroke={GOLD} strokeWidth={3} strokeLinecap="round" opacity={0.5} />}
        </g>}
        {beta !== null && pickable && openMenu === "beam" && menu(BX, col, "#FDEFE3", BEAMS, beta, pickBeam)}
        {recapOn && openMenu === "beam" && menu(BX, col, "#FDEFE3", ["fair", "mystery", "secret"], RNAME[round], (v) => { setAl(0); room.publish({ lround: RKEY[v] }, true); })}
        {sheetPick && !recapOn && openMenu === "sheet" && menu(SX, INK, "#F2F6FB", [...SHEETS, "compare"], cmpOn ? "compare" : phi, pickSheet)}
      </g>);
    })()}
    {pth2 !== null && <circle cx={X(pth2)} cy={Y(uy(sig(pth2), sgM2))} r={9} fill="none" stroke={col} strokeWidth="2" strokeDasharray="3 3" opacity={0.6} />}
    {pth !== null && <g>
      <circle cx={X(pth)} cy={Y(uy(sig(pth), sgM))} r={9} fill="none" stroke={col} strokeWidth="2" strokeDasharray="3 3" />
      {(!pool || Math.abs(pool.p - pth) > 0.08) && <Txt x={pth > 0.5 ? X(pth) - 16 : X(pth) + 16} y={Y(uy(sig(pth), sgM)) - 16} anchor={pth > 0.5 ? "end" : "start"} size={13} fill={col}>{`Malus · cos²(${phi}° − ${beta}°) = ${pth.toFixed(2)}`}</Txt>}
    </g>}
    {revealed && secret && <g>
      <line x1={X(0.5)} y1={Y(0)} x2={X(secret.p)} y2={Y(secret.w)} stroke={col} strokeWidth={2} strokeDasharray="4 4" />
      <circle cx={X(secret.p)} cy={Y(secret.w)} r={10} fill="none" stroke={col} strokeWidth="2" strokeDasharray="3 3" />
      <line x1={X(secret.p) - 15} y1={Y(secret.w)} x2={X(secret.p) + 15} y2={Y(secret.w)} stroke={col} strokeWidth={1.5} />
      <line x1={X(secret.p)} y1={Y(secret.w) - 15} x2={X(secret.p)} y2={Y(secret.w) + 15} stroke={col} strokeWidth={1.5} />
      <Txt x={X(secret.p) + (secret.near ? 22 : secret.p > 0.5 ? -20 : 20)} y={Y(secret.w) + (secret.near ? -40 : secret.w >= 0 ? 32 : -24)} anchor={secret.near ? "start" : secret.p > 0.5 ? "end" : "start"} size={14} fill={col} bold>{`the room's beam · ${Math.round(secret.thAbs)}° · ${Math.round(secret.len * 100)}% pure`}</Txt>
    </g>}
    {G && G.phones.map((g) => <circle key={"g" + g.from} cx={X(g.frac)} cy={Y(uy(sig(g.frac), sgnOf(g.slot, 0)))} r={7} fill="none" stroke={col} strokeWidth={1.5} strokeDasharray="3 2" opacity="0.3" />)}
    {G && G.n > 0 && <g opacity="0.4"><circle cx={X(G.frac)} cy={Y(gW)} r={11} fill="none" stroke={col} strokeWidth={2} strokeDasharray="4 3" /><Txt x={X(G.frac)} y={Y(gW) - 18} size={12} fill={col}>room · 0° sheet</Txt></g>}
    {/* compare: the other sheet's room — dashed path, dashed pointer, hollow room dot (no seats) */}
    {LR2 && live && <g>
      {trail2.length > 1 && <polyline points={trail2.map((h) => `${X(h[1]).toFixed(1)},${Y(expSd2(h[0])).toFixed(1)}`).join(" ")} fill="none" stroke="#FFFFFF" strokeWidth="6" opacity="0.9" strokeLinejoin="round" strokeLinecap="round" />}
      {trail2.length > 1 && <polyline points={trail2.map((h) => `${X(h[1]).toFixed(1)},${Y(expSd2(h[0])).toFixed(1)}`).join(" ")} fill="none" stroke={col} strokeWidth="2.5" strokeDasharray="7 6" strokeLinejoin="round" strokeLinecap="round" />}
      {defined2 && <line x1={X(0.5)} y1={Y(0)} x2={X(pool2.p)} y2={Y(pool2.w)} stroke={GOLD} strokeWidth={2.5} strokeLinecap="round" strokeDasharray="7 6" opacity={0.85} />}
      {pool2 && <circle cx={X(pool2.p)} cy={Y(pool2.w)} r="12" fill="#FFFFFF" stroke={col} strokeWidth={3} />}
      {pool2 && <Txt x={X(pool2.p)} y={Y(pool2.w) + (pool2.w >= 0 || unf < 0.5 ? -20 : 32)} size={14} fill={INK} bold>{`room · ${other}° sheet`}</Txt>}
      {!pool2 && <Txt x={X(0.5)} y={Y(0.42)} size={14} fill={SOFT}>{`no photons through the ${other}° sheet yet`}</Txt>}
      {defined && defined2 && Math.abs(twoTh2 - twoTh) > 2 && <g>
        <path d={arcBetween(X(0.5), Y(0), 56, twoTh, twoTh2)} fill="none" stroke={GOLD} strokeWidth={2.5} />
        {!turning && <Txt x={X(0.5) + 80 * Math.cos((twoTh + twoTh2) / 2 * DEG)} y={Y(0) - 80 * Math.sin((twoTh + twoTh2) / 2 * DEG) + 5} size={14} fill={GOLD} bold>{`${Math.round(Math.abs(twoTh2 - twoTh))}°`}</Txt>}
      </g>}
    </g>}
    {/* recap: the 0° room, turned 2α clockwise as the sheet turns α — path, pointer and dot as a lighter copy, the turned angle at the centre */}
    {/* recap: a ghost of the 0° pointer sweeps 2α clockwise as the sheet turns α — no path, just the pointer and the swept arc */}
    {turning && live && pool && defined && (() => {
      const a = 2 * al * DEG, rot = (x, y) => [x * Math.cos(a) + y * Math.sin(a), -x * Math.sin(a) + y * Math.cos(a)];
      const [gx, gy] = rot(pool.p - 0.5, pool.w);
      const a2 = twoTh - 2 * al, am = (twoTh + a2) / 2 * DEG;
      return (<g>
        <line x1={X(0.5)} y1={Y(0)} x2={X(0.5 + gx)} y2={Y(gy)} stroke={GOLD} strokeWidth={3.5} strokeLinecap="round" />
        <circle cx={X(0.5 + gx)} cy={Y(gy)} r="12" fill={col} stroke="#FFFFFF" strokeWidth={2.25} opacity={0.6} />
        <path d={arcBetween(X(0.5), Y(0), 56, twoTh, a2)} fill="none" stroke={GOLD} strokeWidth={5} strokeLinecap="round" />
        <Txt x={X(0.5) + 84 * Math.cos(am)} y={Y(0) - 84 * Math.sin(am) + 5} size={14} fill={GOLD} bold>{`${Math.round(2 * al)}°`}</Txt>
      </g>);
    })()}
    {/* every beam's own path: (own fraction, own bandwidth) as its photons arrive */}
    {!cmpOn && LR.phones.map((p) => {
      const ph = (phist[p.from] || []).filter((h) => h[2] >= 2 && h[0] <= cutN);
      return ph.length > 1 && <polyline key={"t" + p.from} points={ph.map((h) => `${X(h[1]).toFixed(1)},${Y(uy(sig(h[1]), sgn[p.from] ?? 1)).toFixed(1)}`).join(" ")} fill="none" stroke={col} strokeWidth="1.25" opacity="0.22" strokeLinejoin="round" />;
    })}
    {!cmpOn && parts.map((p) => (<g key={p.from} opacity="0.45">
      <circle cx={X(p.frac)} cy={Y(uy(sig(p.frac), sgn[p.from] ?? 1))} r={7 + Math.min(6, p.n / 5)} fill={col} stroke="#FFFFFF" strokeWidth={1.5} />
      <text x={X(p.frac)} y={Y(uy(sig(p.frac), sgn[p.from] ?? 1)) + 5} textAnchor="middle" fontSize="15">{p.tag}</text>
    </g>))}
    {/* the room's path: pooled fraction, ± E(sd) */}
    {trail.length > 1 && <polyline points={trail.map((h) => `${X(h[1]).toFixed(1)},${Y(expSd(h[0])).toFixed(1)}`).join(" ")} fill="none" stroke="#FFFFFF" strokeWidth="6" opacity="0.9" strokeLinejoin="round" strokeLinecap="round" />}
    {trail.length > 1 && <polyline points={trail.map((h) => `${X(h[1]).toFixed(1)},${Y(expSd(h[0])).toFixed(1)}`).join(" ")} fill="none" stroke={col} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
    {defined && <line x1={X(0.5)} y1={Y(0)} x2={X(pool.p)} y2={Y(pool.w)} stroke={GOLD} strokeWidth={2.5} strokeLinecap="round" opacity={0.85} />}
    {defined && Math.abs(twoTh) > 2 && Math.abs(twoTh) < 178 && <path d={arcFrom0(X(0.5), Y(0), 40, twoTh)} fill="none" stroke={GOLD} strokeWidth={2} />}
    {defined && settled && !cmpOn && <Txt x={X(0.5) + 62 * Math.cos(twoTh / 2 * DEG)} y={Y(0) - 62 * Math.sin(twoTh / 2 * DEG) + 5} anchor={Math.abs(twoTh) < 70 ? "start" : Math.abs(twoTh) > 110 ? "end" : "middle"} size={13} fill={GOLD} bold>{`2θ = ${Math.round(twoTh)}°`}</Txt>}
    {pool && <circle cx={X(pool.p)} cy={Y(pool.w)} r="12" fill={col} stroke="#FFFFFF" strokeWidth={2.25} />}
    {pool && <Txt x={X(pool.p)} y={Y(pool.w) + (defined || Math.abs(pool.w) > 0.05 || Math.abs(pool.p - 0.5) < 0.12 ? -20 : 30)} size={14} fill={INK} bold>{cmpOn ? `room · ${phi}° sheet` : "room"}</Txt>}
    {LR.n === 0 && <Txt x={X(0.5)} y={Y(0.3)} size={17}>send photons through the sheet, one at a time (click = 1, no click = 0)</Txt>}
    {!cmpOn && pool && live && unf < 0.5 && <g opacity={1 - 2 * unf}><Txt x={X(0.5)} y={514 + 80 * unf} size={14} fill={INK}>{`± E(sd): each beam's own bandwidth — the room's is their average · ${LR.n} photons fired by ${LR.phones.length} beams`}</Txt></g>}
    {!cmpOn && pool && live && unf >= 0.5 && <g opacity={2 * unf - 1}><Txt x={X(0.5)} y={514 + 80 * unf} size={14} fill={INK}>{`the floor was a fold — each beam's tilt against the sheet gives its bandwidth a sign · ${LR.n} photons`}</Txt></g>}
    {cmpOn && live && hidden && <g opacity={1 - 2 * unf}><Txt x={X(0.5)} y={514 + 80 * unf} size={14} fill={RED}>{`folded, the ${sgM < 0 ? phi : other}° room is mirrored up onto the half-disk — unfold the disk to see the 90° turn`}</Txt></g>}
    {cmpOn && live && !hidden && <g opacity={unf < 0.5 ? 1 : 1}><Txt x={X(0.5)} y={514 + 80 * unf} size={14} fill={INK}>{recapOn ? recapCap : `same ${beta ?? ""}° beam, two sheets: the sheet turns 45°, the room's pointer turns 90° · ${LR.n} + ${LR2 ? LR2.n : 0} photons`}</Txt></g>}
  </>) });
  useEffect(() => { const el = wrap.current && wrap.current.querySelector("svg"); if (el) el.style.overflow = "visible"; }, []);
  return (
    <div ref={wrap} style={{ position: "relative" }}>
      {plane.svg}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: -44, display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <Button ghost onClick={toggle}>{playing ? "❙❙" : "▶"}</Button>
        {round === "C" && !recapOn && <Button ghost onClick={() => setRevealed((v) => !v)} disabled={!secret}>{revealed ? "hide the room's beam" : "reveal the room's beam"}</Button>}
        {!recapOn && <Button ghost onClick={() => setWantFull((v) => !v)}>{wantFull ? "fold the disk" : "unfold the disk"}</Button>}
        {recapOn && <Button active={al >= 44} onClick={() => turnTo(al < 44 ? 45 : 0)}>{al < 44 ? "turn the sheet 0° → 45°" : "turn it back"}</Button>}
        {!recapOn && <Button ghost onClick={() => room.resetLightRound(round)}>{`reset ${LROUND[round].name}`}</Button>}
      </div>
    </div>
  );
}


// ── SCENE 8 (turn the sheet) : the three rooms through the 0° sheet turn 2α as the sheet turns α — and the floor turns out to be a fold ──
function FigTurnRoom() {
  const room = Room.usePresenter();
  const [al, setAl] = useState(0);                       // the sheet's angle α, 0…45
  const [unf, setUnf] = useState(0);                     // how far the lower half has unfolded, 0…1
  const [showM, setShowM] = useState(false);             // rings: what the room measured through the 45° sheet
  const alRef = useRef(0); alRef.current = al;
  const wrap = useRef(null);
  const enter = useSlideEnter(wrap);
  const anim = useRef(null), anim2 = useRef(null);
  useEffect(() => { cancelAnimationFrame(anim.current); cancelAnimationFrame(anim2.current); setAl(0); setUnf(0); setShowM(false); }, [enter]);
  useEffect(() => () => { cancelAnimationFrame(anim.current); cancelAnimationFrame(anim2.current); }, []);
  const turning = al > 0.01;
  useEffect(() => {
    if (!turning || unf >= 1) return;
    cancelAnimationFrame(anim2.current);
    const u0 = unf, t0 = performance.now(), D = 900;
    const tick = (t) => { const u = Math.min(1, (t - t0) / D); setUnf(u0 + (1 - u0) * (u * u * (3 - 2 * u))); if (u < 1) anim2.current = requestAnimationFrame(tick); };
    anim2.current = requestAnimationFrame(tick);
  }, [turning]);
  const turnTo = (target) => {
    cancelAnimationFrame(anim.current);
    if (target === 0) setShowM(false);
    const a0 = alRef.current, t0 = performance.now(), D = 200 + 2400 * Math.abs(target - a0) / 45;
    const tick = (t) => { const u = Math.min(1, (t - t0) / D), e = u * u * (3 - 2 * u); setAl(a0 + (target - a0) * e); if (u < 1) anim.current = requestAnimationFrame(tick); else if (target >= 44) setShowM(true); else if (target === 0) setUnf(0); };
    anim.current = requestAnimationFrame(tick);
  };
  // the sheet dial, top right — drag it
  const KX = 812, KY = 64, KR = 30;
  const onKnob = (e) => {
    cancelAnimationFrame(anim.current);
    const svg = e.currentTarget.ownerSVGElement;
    const move = (ev) => { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; const q = pt.matrixTransform(svg.getScreenCTM().inverse()); let a = Math.atan2(-(q.y - KY), q.x - KX) / DEG; a = ((a % 180) + 180) % 180; if (a > 90) a -= 180; a = Math.max(0, Math.min(45, a)); if (a < 2.5) a = 0; if (a > 42.5) a = 45; setAl(a); if (a === 45) setShowM(true); };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); swallowClick(); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); move(e);
  };
  // the three rooms through the 0° sheet: one point per beam — with the sign the half-disk hid, from the beam's own tilt
  const DEMO = { A: [45, 45, 45], B: [0, 90, 0, 90], C: [10, 30, 45, 60, 80, 100, 120, 135, 150, 170] };
  let demo = false;
  const rounds = ["A", "B", "C"].map((r) => {
    const L0 = room.lightRound(r, 0), L45 = room.lightRound(r, 45);
    let pts;
    if (L0.phones.length) pts = L0.phones.map((b) => { const th = r === "A" ? 45 : r === "B" ? (b.slot % 2 === 1 ? 0 : 90) : Room.secrets(b.slot).theta; const m = L45.phones.find((q) => q.from === b.from); return { key: b.from, tag: b.tag, n: b.n, p: b.frac, th, p45: m ? m.frac : null }; });
    else { demo = true; pts = DEMO[r].map((th, i) => ({ key: r + i, tag: "", n: 1, p: Math.cos(th * DEG) ** 2, th, p45: Math.cos((th - 45) * DEG) ** 2 })); }
    return { r, col: LROUND[r].col, pts };
  });
  const cx = 450, cy = 268, S = 400;
  const X = (p) => cx + (p - 0.5) * S, Y = (s) => cy - s * S;
  const clamp1 = (v) => Math.max(-1, Math.min(1, v));
  const psi0 = (pt) => (Math.sin(2 * pt.th * DEG) < -1e-9 ? -1 : 1) * Math.acos(clamp1(2 * pt.p - 1));
  const at = (pt, a, u) => { const ps = psi0(pt) - 2 * a * DEG; const ys = 0.5 * Math.sin(ps); return { x: 0.5 + 0.5 * Math.cos(ps), y: (1 - u) * Math.abs(ys) + u * ys, ps }; };
  const centroid = (pts, a, u) => { let W = 0, sx = 0, sy = 0; pts.forEach((pt) => { const q = at(pt, a, u); W += pt.n; sx += q.x * pt.n; sy += q.y * pt.n; }); return W ? { x: sx / W, y: sy / W } : null; };
  const arc = (ox, oy, r, a1, a2) => { const x1 = ox + r * Math.cos(a1), y1 = oy - r * Math.sin(a1), x2 = ox + r * Math.cos(a2), y2 = oy - r * Math.sin(a2); const d = Math.abs(a2 - a1); return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${d > Math.PI ? 1 : 0} ${a2 < a1 ? 1 : 0} ${x2.toFixed(1)} ${y2.toFixed(1)}`; };
  const lower = unf, rot = -2 * al * DEG;
  const caption = al < 0.5 ? "the three rooms through the 0° sheet — turn the sheet" : al < 44 ? `sheet turned ${Math.round(al)}° → the disk turns ${Math.round(2 * al)}°, clockwise` : showM ? "rings: what the room measured through the 45° sheet — right where the turn put them" : "sheet at 45° — the disk has turned 90°";
  return (
    <div ref={wrap} style={{ position: "relative" }}>
      <svg viewBox="0 0 900 560" style={svgStyle}>
        {/* the disk: floor and upper rim; the lower rim and the signed axis appear as it unfolds */}
        <path d={`M ${X(0)} ${cy} A ${S / 2} ${S / 2} 0 0 1 ${X(1)} ${cy}`} fill="none" stroke={INK} strokeWidth="1.75" strokeDasharray="7 6" opacity="0.6" />
        <g opacity={lower}>
          <path d={`M ${X(0)} ${cy} A ${S / 2} ${S / 2} 0 0 0 ${X(1)} ${cy}`} fill="none" stroke={INK} strokeWidth="1.75" strokeDasharray="7 6" opacity="0.6" />
          <line x1={X(0)} y1={cy} x2={X(0)} y2={Y(-0.55)} stroke={INK} strokeWidth="2.25" opacity="0.5" />
          <Txt x={X(0) - 14} y={Y(-0.5) + 6} anchor="end" size={14}>−½</Txt>
          <Txt x={X(0.5)} y={Y(-0.55) + 26} size={14} fill={INK}>the floor was a fold — bandwidth has a sign</Txt>
        </g>
        <line x1={X(0)} y1={cy} x2={X(1)} y2={cy} stroke={INK} strokeWidth="2.25" strokeDasharray={lower > 0.02 ? "8 6" : undefined} opacity={1 - 0.45 * lower} />
        <line x1={X(0)} y1={cy} x2={X(0)} y2={Y(0.55)} stroke={INK} strokeWidth="2.25" opacity="0.5" />
        <Txt x={X(0) - 14} y={Y(0.5) + 6} anchor="end" size={14}>½</Txt>
        <Txt x={X(0) + 10} y={Y(0.55) - 12} anchor="start" size={14}>bandwidth</Txt>
        <Txt x={X(0) - 14} y={cy + 5} anchor="end" size={14} fill={INK} bold>no click · p = 0</Txt>
        <Txt x={X(1) + 14} y={cy + 5} anchor="start" size={14} fill={INK} bold>click · p = 1</Txt>
        <line x1={X(0.5)} y1={cy - 5} x2={X(0.5)} y2={cy + 5} stroke={INK} strokeWidth="1.5" />
        {/* 2α at the disk's centre */}
        {al > 0.5 && <g>
          <path d={arc(cx, cy, 44, 0, rot)} fill="none" stroke={INK} strokeWidth="2.5" />
          <line x1={cx} y1={cy} x2={cx + 44 * Math.cos(rot)} y2={cy - 44 * Math.sin(rot)} stroke={INK} strokeWidth="1.5" />
          <line x1={cx} y1={cy} x2={cx + 44} y2={cy} stroke={INK} strokeWidth="1.5" />
          <Txt x={cx + 58} y={cy - 44 * Math.sin(rot) / 2 + 5} anchor="start" size={14} fill={INK} bold>{`2α = ${Math.round(2 * al)}°`}</Txt>
        </g>}
        {/* legend */}
        {rounds.map((R, i) => <g key={R.r}><circle cx={26} cy={26 + i * 24} r={6} fill={R.col} /><Txt x={40} y={31 + i * 24} anchor="start" size={13} fill={INK}>{`${LROUND[R.r].name} · ${LROUND[R.r].short}`}</Txt></g>)}
        {/* the beams and each room's dot */}
        {rounds.map((R) => (<g key={R.r}>
          {R.pts.map((pt) => { const q0 = at(pt, 0, 1), q = at(pt, al, unf); return (<g key={pt.key}>
            {al > 0.3 && <path d={arc(cx, cy, S / 2, q0.ps, q.ps)} fill="none" stroke={R.col} strokeWidth={1.25} opacity={0.3} />}
            <circle cx={X(q.x)} cy={Y(q.y)} r={8} fill={R.col} stroke="#FFFFFF" strokeWidth={1.5} opacity={0.85} />
            {pt.tag && <text x={X(q.x)} y={Y(q.y) + 4} textAnchor="middle" fontSize="11">{pt.tag}</text>}
          </g>); })}
          {(() => { const c = centroid(R.pts, al, unf); if (!c) return null; const tr = []; for (let a = 0; a < al; a += 1.5) { const k = centroid(R.pts, a, unf); tr.push(`${X(k.x).toFixed(1)},${Y(k.y).toFixed(1)}`); } tr.push(`${X(c.x).toFixed(1)},${Y(c.y).toFixed(1)}`); return (<g>
            {tr.length > 1 && <polyline points={tr.join(" ")} fill="none" stroke="#FFFFFF" strokeWidth={5} opacity={0.9} strokeLinejoin="round" />}
            {tr.length > 1 && <polyline points={tr.join(" ")} fill="none" stroke={R.col} strokeWidth={2.5} strokeLinejoin="round" />}
            <circle cx={X(c.x)} cy={Y(c.y)} r={11} fill={R.col} stroke="#FFFFFF" strokeWidth={2.25} />
          </g>); })()}
          {showM && R.pts.filter((pt) => pt.p45 !== null).map((pt) => { const sg = Math.sin(2 * (pt.th - 45) * DEG) < -1e-9 ? -1 : 1; const ys = sg * sig(pt.p45); const y = (1 - unf) * Math.abs(ys) + unf * ys; return <circle key={"m" + pt.key} cx={X(pt.p45)} cy={Y(y)} r={12} fill="none" stroke={R.col} strokeWidth={2} strokeDasharray="3 3" />; })}
        </g>))}
        {/* the sheet dial */}
        {al > 0.5 && <path d={arc(KX, KY, KR + 10, 0, al * DEG)} fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />}
        {al > 0.5 && <Txt x={KX - KR - 18} y={KY - 10} anchor="end" size={14} fill={GOLD} bold>{`α = ${Math.round(al)}°`}</Txt>}
        <Knob x={KX} y={KY} r={KR} a={al} label={`sheet · ${Math.round(al)}°`} />
        <circle cx={KX} cy={KY} r={KR + 14} fill="transparent" style={{ cursor: "grab" }} onPointerDown={onKnob} />
        <Txt x={KX} y={KY + KR + 44} size={11}>drag to turn</Txt>
        <Txt x={450} y={546} size={14} fill={INK}>{caption}</Txt>
        {demo && <Txt x={450} y={526} size={12}>demo beams — no photons through the 0° sheet in the room yet</Txt>}
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: -44, display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <Button ghost onClick={() => turnTo(0)}>sheet 0°</Button>
        <Button ghost onClick={() => turnTo(45)}>turn to 45°</Button>
        <Button active={showM} onClick={() => setShowM((v) => !v)}>measured rings</Button>
      </div>
    </div>
  );
}

// ── SCENE 9 : the half circle, in glass — and the needle is the wave ──
function FigSurveyRoom() {
  const room = Room.usePresenter();
  const reveal = !!room.state.reveal;
  const bs = beamsOf(room).filter((b) => hasQ(b, 0));
  const X = (q) => 150 + 600 * q, BY = 400;
  return (
    <div style={{ width: "100%" }}>
      <svg viewBox="0 0 900 470" style={svgStyle}>
        <line x1="90" y1={BY} x2="810" y2={BY} stroke={INK} strokeWidth="3" />
        <line x1={X(0)} y1="40" x2={X(0)} y2="445" stroke={INK} strokeWidth="2.5" />
        <Txt x={X(0) + 26} y={64} size={17} fill={INK} bold anchor="start">band width</Txt>
        <Txt x={885} y={BY - 22} size={17} fill={INK} bold anchor="end">p̂ per beam</Txt>
        <path d={`M ${X(0)} ${BY} A 300 300 0 0 1 ${X(1)} ${BY}`} fill="none" stroke={GOLD} strokeWidth="4" strokeDasharray="10 9" opacity="0.55" />
        <circle cx={X(0)} cy={BY} r="8" fill={INK} /><circle cx={X(1)} cy={BY} r="8" fill={INK} />
        <Txt x={X(0)} y={BY + 40} size={15}>never passes</Txt>
        <Txt x={X(1)} y={BY + 40} size={15}>always passes</Txt>
        {bs.map((b) => { const p = pAt(b, 0), w = sig(p), n = b.q["0"].n, th = Room.secrets(b.slot).theta;
          const nx = Math.abs(Math.cos(th * DEG)), ny = Math.abs(Math.sin(th * DEG));
          return (<g key={b.slot}>
            <circle cx={X(p)} cy={BY - 600 * w} r={7 + Math.min(4, n / 12)} fill={b.noise > 0.05 ? SOFT : GOLD} opacity="0.75" stroke="#FFFFFF" strokeWidth={1.5} />
            <text x={X(p)} y={BY - 600 * w - 16} textAnchor="middle" fontSize="16">{b.tag}</text>
            {reveal && b.noise < 0.05 && <line x1={X(p)} y1={BY - 600 * w} x2={X(p) + 40 * nx} y2={BY - 600 * w - 40 * ny} stroke={PURP} strokeWidth="3" strokeLinecap="round" />}
          </g>); })}
        {bs.length === 0 && <Txt x={450} y={210} size={16}>every run: your 25 photons through the same horizontal sheet — waiting for the room</Txt>}
        <Txt x={480} y={462} size={16} fill={INK}>the coin's semicircle — redrawn by lamplight, one dot per participant</Txt>
      </svg>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 8, alignItems: "center" }}>
        <Button active={reveal} onClick={() => room.publish({ reveal: !reveal }, true)}>{reveal ? "hide the beams' angles" : "reveal each beam's angle"}</Button>
        <span style={{ fontFamily: MONO, fontSize: 14, color: SOFT }}>{reveal ? "purple: the direction each beam actually wiggles in — it is the needle (√p, √(1−p))" : "grey dots: beams whose polarization wanders (scene 10)"}</span>
      </div>
    </div>
  );
}

// ── SCENE 10 : mixed light — the paradox returns ──
function FigMixRoom() {
  const room = Room.usePresenter();
  const bs = beamsOf(room).filter((b) => hasQ(b, 0));
  const spot = room.state.spotlight || [];
  const pickPair = () => {
    const pure45 = bs.find((b) => Room.secrets(b.slot).theta === 45 && b.noise < 0.05);
    const noisy = bs.slice().sort((a, b) => b.noise - a.noise)[0];
    room.publish({ spotlight: [pure45 ? pure45.slot : null, noisy && noisy.noise > 0.5 ? noisy.slot : null].filter((x) => x !== null) }, true);
  };
  const plane = Plane({ W: 900, H: 520, left: "always-V", right: "always-H", children: ({ X, Y }) => (<>
    {bs.map((b) => { const p = pAt(b, 0), w = sig(p) * (1 - b.noise), on = spot.includes(b.slot);
      return (<g key={b.slot}>
        {on && <circle cx={X(p)} cy={Y(w)} r="22" fill="none" stroke={RED} strokeWidth="2.25"><animate attributeName="r" values="16;26;16" dur="1.2s" repeatCount="indefinite" /></circle>}
        <circle cx={X(p)} cy={Y(w)} r="9" fill={b.noise > 0.05 ? SOFT : GOLD} opacity="0.85" stroke="#FFFFFF" strokeWidth={1.5} />
        <text x={X(p)} y={Y(w) - 14} textAnchor="middle" fontSize="16">{b.tag}</text>
        {on && <Txt x={X(p)} y={Y(w) + 34} size={14} fill={RED} bold>{b.noise > 0.5 ? "unpolarized — the mystery coin" : "45° — the fair coin"}</Txt>}
      </g>); })}
    <Txt x={X(0.5)} y={Y(0.62)} size={14} fill={INK}>placed by each participant's noise knob for now — in scene 11 Nature places it herself</Txt>
  </>) });
  return (
    <div>
      {plane.svg}
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 8 }}>
        <Button onClick={pickPair}>spotlight: a 45° beam and an unpolarized one</Button>
        <Button ghost onClick={() => room.publish({ spotlight: [] }, true)}>clear</Button>
      </div>
    </div>
  );
}

// ── SCENE 11a : ask a different question — the presenter owns the sheet angle ──
function FigQuestionRoom() {
  const room = Room.usePresenter();
  const q = room.state.question ?? 0;
  const bs = beamsOf(room);
  const spot = room.state.spotlight || [];
  const X0 = 100, X1 = 800;
  const withQ = bs.filter((b) => hasQ(b, q));
  const both = bs.filter((b) => hasQ(b, 0) && hasQ(b, 45));
  return (
    <div>
      <svg viewBox="0 0 900 520" style={svgStyle}>
                <Txt x={450} y={28} size={15}>{`the question is now: do you pass a ${q}° sheet?`}</Txt>
        <Sheet x={90} y={126} size={64} a={q} label={`${q}°`} color={GOLD} />
        <line x1={X0 + 100} y1={130} x2={X1} y2={130} stroke={INK} strokeWidth="2.25" />
        <Txt x={X0 + 100} y={160} size={12}>0</Txt><Txt x={(X0 + 100 + X1) / 2} y={160} size={12}>½</Txt><Txt x={X1} y={160} size={12}>1</Txt>
        {withQ.map((b) => { const f = pAt(b, q), x = X0 + 100 + f * (X1 - X0 - 100), on = spot.includes(b.slot); return (<g key={b.slot}>
          {on && <circle cx={x} cy={130} r="20" fill="none" stroke={RED} strokeWidth="2.25" />}
          <circle cx={x} cy={130} r="8" fill={b.noise > 0.05 ? SOFT : GOLD} opacity="0.7" stroke="#FFFFFF" strokeWidth={1.5} />
          <text x={x} y={110} textAnchor="middle" fontSize="18">{b.tag}</text>
        </g>); })}
        {/* the line plot: T45 − ½ against the bandwidth measured with the 0° sheet */}
                <Txt x={450} y={222} size={14}>the 45° answer minus ½, against the bandwidth from the 0° sheet</Txt>
        <line x1={450} y1={250} x2={450} y2={490} stroke={SOFT} strokeWidth="1.5" />
        <line x1={250} y1={370} x2={650} y2={370} stroke={SOFT} strokeWidth="1.5" />
        <line x1={450} y1={370} x2={450 + 200} y2={370 - 200} stroke={LBLUE} strokeWidth="1.5" strokeDasharray="6 5" />
        <line x1={450} y1={370} x2={450 + 200} y2={370 + 200} stroke={LBLUE} strokeWidth="1.5" strokeDasharray="6 5" />
        <Txt x={660} y={374} anchor="start" size={12}>bandwidth ½</Txt><Txt x={440} y={374} anchor="end" size={12}>0</Txt>
        <Txt x={295} y={310} size={13}>pure beams land on the two lines</Txt>
        <Txt x={295} y={332} size={13}>wandering beams fall inside</Txt>
        <Txt x={450} y={244} size={12}>+½</Txt><Txt x={450} y={508} size={12}>−½</Txt>
        {both.map((b) => { const s0 = sig(pAt(b, 0)), s45 = pAt(b, 45) - 0.5;
          const x = 450 + s0 * 400, y = 370 - s45 * 400;
          return (<g key={b.slot}><circle cx={x} cy={y} r="8" fill={b.noise > 0.05 ? SOFT : GOLD} opacity="0.85" stroke="#FFFFFF" strokeWidth={1.5} /><text x={x} y={y - 12} textAnchor="middle" fontSize="15">{b.tag}</text></g>); })}
      </svg>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 6, flexWrap: "wrap" }}>
        {[0, 45, 90, 135].map((a) => <Button key={a} ghost={q !== a} onClick={() => room.publish({ question: a }, true)}>{`ask ${a}°`}</Button>)}
        <span style={{ fontFamily: MONO, fontSize: 13, color: SOFT, alignSelf: "center" }}>participants: send 25 photons after each change</span>
      </div>
    </div>
  );
}

// ── SCENE 11 (swap) : the 0° numbers (p, E) turn into the 45° numbers (E + ½, ½ − p) — the disk's 90° turn, read as bookkeeping ──
function FigSwapRoom() {
  const room = Room.usePresenter();
  const round = ["A", "B", "C"].includes(room.state.lround) ? room.state.lround : "A";
  const col = LROUND[round].col;
  const abeam = [30, 45, 60, 90].includes(Number(room.state.abeam)) ? Number(room.state.abeam) : 45;
  const beta = round === "A" ? abeam : null;
  const lk = (a) => round === "A" && beta !== 45 ? a + "@" + beta : String(a);
  const tilt = (slot) => round === "A" ? beta : round === "B" ? (slot % 2 === 1 ? 0 : 90) : Room.secrets(slot).theta;
  // the room through one sheet: pooled fraction p and the signed, photon-weighted mean of every beam's own bandwidth E(sd)
  const stats = (alpha) => { const L = room.lightRound(round, lk(alpha)); if (!L.n) return null; let s = 0, w = 0; L.phones.forEach((q) => { const sg = Math.sin(2 * (tilt(q.slot) - alpha) * DEG) < -1e-9 ? -1 : 1; s += sg * sig(q.frac) * q.n; w += q.n; }); return { p: L.frac, e: w ? s / w : 0, n: L.n }; };
  const Q0 = stats(0), Q45 = stats(45);
  const P45 = Q0 ? { p: 0.5 + Q0.e, e: 0.5 - Q0.p } : null;                 // what the turn predicts for the 45° sheet
  // the 45° sheet's L (p₄₅ − ½ along the floor, E₄₅ up) turns 90° anti-clockwise about the centre — and lands on the 0° point: its floor leg stands up as E(sd)
  const [rot, setRot] = useState(0);
  const rotRef = useRef(0); rotRef.current = rot;
  const anim = useRef(null);
  useEffect(() => () => cancelAnimationFrame(anim.current), []);
  useEffect(() => { cancelAnimationFrame(anim.current); setRot(0); }, [round]);
  const turnTo = (t) => { cancelAnimationFrame(anim.current); const a0 = rotRef.current, t0 = performance.now(), D = 300 + 1500 * Math.abs(t - a0) / 90; const tick = (now) => { const u = Math.min(1, (now - t0) / D), e = u * u * (3 - 2 * u); setRot(a0 + (t - a0) * e); if (u < 1) anim.current = requestAnimationFrame(tick); }; anim.current = requestAnimationFrame(tick); };
  const turned = rot > 89;
  const cx = 450, cy = 300, S = 460;                                             // same disk as the twins figure
  const X = (p) => cx + (p - 0.5) * S, Y = (w) => cy - w * S;
  const f2 = (v) => (v < 0 ? "−" : "+") + Math.abs(v).toFixed(2);
  const rotP = (x, y, a) => [x * Math.cos(a) + y * Math.sin(a), -x * Math.sin(a) + y * Math.cos(a)];  // clockwise by a
  const arcBetween = (ox, oy, r, a1, a2) => `M ${(ox + r * Math.cos(a1 * DEG)).toFixed(1)} ${(oy - r * Math.sin(a1 * DEG)).toFixed(1)} A ${r} ${r} 0 ${Math.abs(a2 - a1) > 180 ? 1 : 0} ${a2 > a1 ? 0 : 1} ${(ox + r * Math.cos(a2 * DEG)).toFixed(1)} ${(oy - r * Math.sin(a2 * DEG)).toFixed(1)}`;
  const ang = (Q) => Q && Math.hypot(Q.p - 0.5, Q.e) >= 0.05 ? Math.atan2(Q.e, Q.p - 0.5) / DEG : null;
  const a0 = ang(Q0), a45 = ang(Q45);
  const Lshape = (Q, a, c, dash, labels) => { if (!Q) return null; const A = rotP(Q.p - 0.5, 0, a), B = rotP(Q.p - 0.5, Q.e, a); const mA = rotP((Q.p - 0.5) / 2, 0, a), mB = rotP(Q.p - 0.5, Q.e / 2, a); const far = (q) => [X(0.5 + q[0] * 1) + (q[0] >= 0 ? 1 : -1) * 0, Y(q[1])]; return (<g>
    <line x1={X(0.5)} y1={Y(0)} x2={X(0.5 + A[0])} y2={Y(A[1])} stroke={c} strokeWidth={4} strokeLinecap="round" strokeDasharray={dash} />
    <line x1={X(0.5 + A[0])} y1={Y(A[1])} x2={X(0.5 + B[0])} y2={Y(B[1])} stroke={c} strokeWidth={4} strokeLinecap="round" strokeDasharray={dash} />
    {labels && labels[0] && Math.abs(Q.p - 0.5) > 0.06 && <Txt x={X(0.5 + mA[0]) + (Math.abs(mA[1]) > 1e-6 ? (mA[0] >= 0 ? 0 : 0) : 0) + (Math.abs(A[1]) > 1e-6 ? 14 : 0)} y={Y(mA[1]) + (Math.abs(A[1]) > 1e-6 ? 5 : 22)} anchor={Math.abs(A[1]) > 1e-6 ? "start" : "middle"} size={13} fill={c} bold>{labels[0]}</Txt>}
    {labels && labels[1] && Math.abs(Q.e) > 0.06 && <Txt x={X(0.5 + mB[0]) + (Math.abs(B[1] - A[1]) > 1e-6 ? (B[0] >= 0 ? 14 : -14) : 0)} y={Y(mB[1]) + (Math.abs(B[1] - A[1]) > 1e-6 ? 5 : (B[1] >= 0 ? -12 : 24))} anchor={Math.abs(B[1] - A[1]) > 1e-6 ? (B[0] >= 0 ? "start" : "end") : "middle"} size={13} fill={c} bold>{labels[1]}</Txt>}
  </g>); };
  const T = (Q) => { if (!Q) return null; const q = rotP(Q.p - 0.5, Q.e, -rot * DEG); return { x: X(0.5 + q[0]), y: Y(q[1]) }; };
  const G = T(Q45);
  const turnedLabel = turned ? ["E(sd) = p₄₅ − ½", null] : null;
  const wrap = useRef(null);
  useEffect(() => { let p = wrap.current && wrap.current.parentElement; while (p && getComputedStyle(p).backgroundImage === "none") p = p.parentElement; if (p) p.style.overflow = "visible"; }, []);
  return (
    <div ref={wrap} style={{ position: "relative" }}>
      <svg viewBox="0 0 900 600" style={{ ...svgStyle, overflow: "visible" }}>
        {/* the unfolded disk */}
        <circle cx={cx} cy={cy} r={S / 2} fill="none" stroke={INK} strokeWidth="1.75" strokeDasharray="7 6" opacity="0.6" />
        <line x1={X(0)} y1={cy} x2={X(1)} y2={cy} stroke={INK} strokeWidth="2.25" />
        <line x1={X(0.5)} y1={Y(0.55)} x2={X(0.5)} y2={Y(-0.55)} stroke={SOFT} strokeWidth="1.25" strokeDasharray="5 4" />
        <Txt x={X(0) - 12} y={cy + 5} anchor="end" size={13} fill={INK} bold>p = 0</Txt>
        <Txt x={X(1) + 12} y={cy + 5} anchor="start" size={13} fill={INK} bold>p = 1</Txt>
        <Txt x={X(0.5) + 10} y={Y(0.5) - 8} anchor="start" size={13}>+½ · bandwidth</Txt>
        <Txt x={X(0.5) + 10} y={Y(-0.5) + 20} anchor="start" size={13}>−½</Txt>
        <Txt x={X(0.5)} y={cy + 20} size={12}>½</Txt>
        {/* the L of the 0° numbers; the 45° sheet's L, turning back 90° onto it */}
        {Lshape(Q0, 0, col, undefined, turned ? ["p − ½ = ½ − E₄₅", null] : ["p − ½", "E(sd)"])}
        {Lshape(Q45, -rot * DEG, GOLD, "7 5", rot > 0.5 ? turnedLabel : ["p₄₅ − ½", "E₄₅"])}
        {rot > 0.5 && a45 !== null && <path d={arcBetween(X(0.5), Y(0), 48, a45, a45 + rot)} fill="none" stroke={GOLD} strokeWidth={3} strokeLinecap="round" />}
        {rot > 0.5 && a45 !== null && <Txt x={X(0.5) + 72 * Math.cos((a45 + rot / 2) * DEG)} y={Y(0) - 72 * Math.sin((a45 + rot / 2) * DEG) + 5} size={14} fill={GOLD} bold>{`${Math.round(rot)}°`}</Txt>}
        {/* the two measured rooms */}
        {Q45 && <g>
          <line x1={X(0.5)} y1={Y(0)} x2={X(Q45.p)} y2={Y(Q45.e)} stroke={GOLD} strokeWidth={2.5} strokeLinecap="round" strokeDasharray="7 6" opacity={0.85} />
          <circle cx={X(Q45.p)} cy={Y(Q45.e)} r="12" fill="#FFFFFF" stroke={col} strokeWidth={3} />
          <Txt x={X(Q45.p)} y={Y(Q45.e) + (Q45.e >= 0 ? -20 : 32)} size={14} fill={INK} bold>room · 45° sheet</Txt>
        </g>}
        {Q0 && <g>
          <line x1={X(0.5)} y1={Y(0)} x2={X(Q0.p)} y2={Y(Q0.e)} stroke={GOLD} strokeWidth={2.5} strokeLinecap="round" opacity={0.85} />
          <circle cx={X(Q0.p)} cy={Y(Q0.e)} r="12" fill={col} stroke="#FFFFFF" strokeWidth={2.25} />
          <Txt x={X(Q0.p)} y={Y(Q0.e) + (Q0.e >= 0 ? -20 : 32)} size={14} fill={INK} bold>room · 0° sheet</Txt>
        </g>}
        {G && rot > 0.5 && <circle cx={G.x} cy={G.y} r="12" fill="#FFFFFF" stroke={col} strokeWidth={3} opacity={0.6} />}
        {!Q0 && <Txt x={X(0.5)} y={Y(0.15)} size={15}>no photons through the 0° sheet yet</Txt>}
        {Q0 && !Q45 && <Txt x={X(0.5)} y={Y(-0.42)} size={14} fill={SOFT}>no photons through the 45° sheet yet</Txt>}
        {Q0 && Q45 && a0 === null && <Txt x={X(0.5)} y={Y(-0.42)} size={14} fill={SOFT}>both rooms sit at the centre — p = ½ and E(sd) = 0 through either sheet</Txt>}
        {/* one legend: the two measured pairs, and the pair they make once the 45° L has turned back */}
        {(() => {
          const PW = 270, PH = 120, PY = -142, LX = 915 - PW, t = Math.min(1, rot / 90), pair = (p, e) => `(${p.toFixed(2)}, ${f2(e)})`;
          const row = (y, icon, label, value, c, bold, op) => (<g opacity={op ?? 1}>
            {icon}
            <Txt x={LX + 32} y={y} anchor="start" size={12} fill={INK} bold>{label}</Txt>
            <Txt x={LX + PW - 14} y={y} anchor="end" size={13} fill={c} bold={bold}>{value}</Txt>
          </g>);
          const R1 = PY + 46, R2 = PY + 74, R3 = PY + 102;
          return (<g>
            <rect x={LX} y={PY} width={PW} height={PH} rx={10} fill="#FFFFFF" stroke={LBLUE} strokeWidth={1.5} />
            <Txt x={LX + 14} y={PY + 20} anchor="start" size={11} fill={SOFT}>measured (p, E(sd))</Txt>
            {row(R1, <circle cx={LX + 20} cy={R1 - 4} r={6} fill={col} stroke="#FFFFFF" strokeWidth={1.5} />, "0° sheet", Q0 ? pair(Q0.p, Q0.e) : "(…, …)", col)}
            {row(R2, <circle cx={LX + 20} cy={R2 - 4} r={6} fill="#FFFFFF" stroke={col} strokeWidth={2.5} />, "45° sheet", Q45 ? pair(Q45.p, Q45.e) : "(…, …)", col)}
            <line x1={LX + 14} y1={R2 + 10} x2={LX + PW - 14} y2={R2 + 10} stroke={LBLUE} strokeWidth={1} />
            {row(R3, <circle cx={LX + 20} cy={R3 - 4} r={6} fill={INK} />, "so (p, E)", Q0 && Q45 && rot > 0.5 ? pair(Q0.p, Q45.p - 0.5) : "(p, p₄₅ − ½)", INK, turned, Q0 && Q45 ? 0.55 + 0.45 * t : 0.25)}
          </g>);
        })()}
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: -44, display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <CollectButton />
        {["A", "B", "C"].map((r) => <Button key={r} active={round === r} onClick={() => room.publish({ lround: r }, true)}>{RNAME[r]}</Button>)}
        <Button ghost onClick={() => turnTo(turned ? 0 : 90)}>{turned ? "undo the turn" : "turn the 45° L back 90°"}</Button>
      </div>
    </div>
  );
}

// ── SCENE 11b : why — the sheet projects the needle: add the components, then square ──
function FigProjectRoom() {
  const [th, setTh] = useState(30);
  const room = Room.usePresenter();
  const al = room.state.question ?? 45;
  const ox = 265, oy = 335, S = 235;
  const nx = ox + S * Math.cos(th * DEG), ny = oy - S * Math.sin(th * DEG);
  const ax = Math.cos(al * DEG), ay = Math.sin(al * DEG);
  const proj = Math.cos((th - al) * DEG);
  const px = ox + S * proj * ax, py = oy - S * proj * ay;
  const drag = useDragAngle(setTh, ox, oy);
  return (
    <div>
      <svg viewBox="0 0 900 420" style={svgStyle}>
        <circle cx={ox} cy={oy} r={S} fill="none" stroke={LBLUE} strokeWidth="1.5" strokeDasharray="5 5" />
        <line x1={ox} y1={oy} x2={ox + S + 30} y2={oy} stroke={INK} strokeWidth="1.5" />
        <line x1={ox} y1={oy} x2={ox} y2={oy - S - 30} stroke={INK} strokeWidth="1.5" />
        <Txt x={ox + S + 40} y={oy + 5} anchor="start" size={13}>H</Txt><Txt x={ox} y={oy - S - 38} size={13}>V</Txt>
        <line x1={ox - S * ax} y1={oy + S * ay} x2={ox + (S + 30) * ax} y2={oy - (S + 30) * ay} stroke={GOLD} strokeWidth="2.25" />
        <Txt x={ox + (S + 50) * ax} y={oy - (S + 50) * ay} size={13} fill={GOLD} bold>{`sheet ${al}°`}</Txt>
        <line x1={ox} y1={oy} x2={nx} y2={ny} stroke={PURP} strokeWidth="3.5" strokeLinecap="round" />
        <line x1={nx} y1={ny} x2={px} y2={py} stroke={SOFT} strokeWidth="1.5" strokeDasharray="4 4" />
        <line x1={ox} y1={oy} x2={px} y2={py} stroke={TEAL} strokeWidth="4" strokeLinecap="round" opacity="0.8" />
        <g style={{ cursor: "grab" }} onPointerDown={drag}><circle cx={nx} cy={ny} r="24" fill="rgba(0,0,0,0)" /><circle cx={nx} cy={ny} r="11" fill={PURP} stroke="#FFFFFF" strokeWidth={2.25} /></g>
        <Txt x={600} y={110} anchor="start" size={14} fill={INK} bold>{`needle at θ = ${th}° (drag it)`}</Txt>
        <Txt x={600} y={150} anchor="start" size={14}>{`H-part: cos θ = ${Math.cos(th * DEG).toFixed(2)}`}</Txt>
        <Txt x={600} y={176} anchor="start" size={14}>{`V-part: sin θ = ${Math.sin(th * DEG).toFixed(2)}`}</Txt>
        <Txt x={600} y={220} anchor="start" size={14} fill={TEAL} bold>{`add along the sheet → ${proj.toFixed(2)}`}</Txt>
        <Txt x={600} y={248} anchor="start" size={14} fill={GOLD} bold>{`then square → ${(proj * proj).toFixed(2)} = cos²(θ − ${al}°)`}</Txt>
        <Txt x={600} y={296} anchor="start" size={13}>{al === 45 ? `cos²(θ−45°) = ½ + signed bandwidth` : `ask 45° on the previous slide`}</Txt>
      </svg>
    </div>
  );
}

// ── SCENE 11c : three sheets — light back through an obstacle ──
function FigThreeLensRoom() {
  const room = Room.usePresenter();
  const mid = room.state.mid ?? 45;
  const midIn = !!room.state.midIn;
  const T1 = midIn ? Room.malus(0, mid) : 1, T2 = midIn ? Room.malus(mid, 90) : Room.malus(0, 90);
  const T = T1 * T2;
  const drag = useDragAngle((a) => room.publish({ mid: a }), 450, 220);
  return (
    <div>
      <svg viewBox="0 0 900 400" style={svgStyle}>
                <Txt x={450} y={30} size={15}>two crossed sheets block everything — slide a third between them</Txt>
        <circle cx={80} cy={220} r={20} fill="#FDEFE3" stroke={GOLD} strokeWidth="2.25" />
        <line x1={110} y1={220} x2={780} y2={220} stroke={LBLUE} strokeWidth="4" />
        <Sheet x={250} y={220} a={0} label="0°" />
        <WaveArrow x={350} y={220} a={0} amp={1} />
        {midIn ? <Sheet x={450} y={220} a={mid} label={`${mid}° · drag`} color={GOLD} onDown={drag} /> : <g><rect x={405} y={150} width={90} height={140} rx={7} fill="none" stroke={LBLUE} strokeWidth={1.5} strokeDasharray="6 5" /><Txt x={450} y={318} size={13}>(empty)</Txt></g>}
        <WaveArrow x={550} y={220} a={midIn ? mid : 0} amp={Math.sqrt(T1)} />
        <Sheet x={650} y={220} a={90} label="90°" />
        <WaveArrow x={740} y={220} a={90} amp={Math.sqrt(T)} />
        <BrightnessBar x={800} y={120} v={T} />
      </svg>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 6 }}>
        <Button active={midIn} onClick={() => room.publish({ midIn: !midIn, mid: 45 }, true)}>{midIn ? "take the middle sheet out" : "slide the middle sheet in"}</Button>
        <span style={{ fontFamily: MONO, fontSize: 14, color: SOFT, alignSelf: "center" }}>{midIn ? `cos²(${mid}°) · cos²(90°−${mid}°) = ${(T * 100).toFixed(0)}%` : "cos²(90°) = 0"}</span>
      </div>
    </div>
  );
}

// ── SCENE 12 : angle doubling — turn the sheet by 45°, the dot turns by 90° ──
function FigDoubleRoom() {
  const [th, setTh] = useState(30);
  const room = Room.usePresenter();
  const q = room.state.question ?? 0;
  // same grammar as scene 5: big circle as the hero, the needle in a square inset top-right
  const I = { x: 700, y: 4, w: 196, h: 196, ox: 798, oy: 102, S: 74 };
  const drag = useDragAngle(setTh, I.ox, I.oy);
  const cx = 400, cy = 250, R = 195;
  const pq = Room.malus(th, q);
  const ang = ((2 * (th - q)) % 360 + 360) % 360;           // Bernoulli angle for the question q
  const nx = I.ox + I.S * Math.cos(th * DEG), ny = I.oy - I.S * Math.sin(th * DEG);
  const mid = (th - q) / 2 + q;                             // bisector for the inset's red arc
  return (
    <div>
      <svg viewBox="0 0 900 520" style={svgStyle}>
        {/* the Bernoulli circle — full, because light can be asked every question */}
        <line x1={cx - R - 40} y1={cy} x2={cx + R + 40} y2={cy} stroke={INK} strokeWidth={2.25} />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={GOLD} strokeWidth={2.5} strokeDasharray="7 7" />
        <circle cx={cx - R} cy={cy} r={6} fill={INK} /><circle cx={cx + R} cy={cy} r={6} fill={INK} />
        <circle cx={cx} cy={cy} r={5} fill={SOFT} />
        <line x1={cx} y1={cy - R - 20} x2={cx} y2={cy + R + 20} stroke={SOFT} strokeWidth={1.25} strokeDasharray="5 4" />
        <Txt x={cx + R} y={cy + 32} size={14}>{`always passes ${q}° (p=1)`}</Txt>
        <Txt x={cx - R} y={cy + 32} size={14}>{`never (p=0)`}</Txt>
        {/* pointer at 2(θ − q), exactly the scene-5 pointer seen from the centre */}
        <line x1={cx} y1={cy} x2={cx + R * Math.cos(ang * DEG)} y2={cy - R * Math.sin(ang * DEG)} stroke={PURP} strokeWidth={3} markerEnd="url(#arrowPurpD)" />
        <defs><marker id="arrowPurpD" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,1.2 L9,5 L0,8.8 L2.4,5 z" fill={PURP} /></marker></defs>
        <circle cx={cx + R * Math.cos(ang * DEG)} cy={cy - R * Math.sin(ang * DEG)} r={11} fill={GOLD} stroke="#FFFFFF" strokeWidth={2.25} />
        <path d={`M ${cx + 62} ${cy} A 62 62 0 ${ang > 180 ? 1 : 0} 0 ${cx + 62 * Math.cos(ang * DEG)} ${cy - 62 * Math.sin(ang * DEG)}`} fill="none" stroke={RED} strokeWidth={1.75} />
        <Txt x={cx + 96 * Math.cos(ang / 2 * DEG)} y={cy - 96 * Math.sin(ang / 2 * DEG) + 5} size={15} fill={RED} bold>{`2(θ − ${q}°) = ${ang.toFixed(0)}°`}</Txt>
        <Txt x={cx} y={cy + R + 46} size={14} fill={INK}>{`turn the sheet by 45° → the dot turns by 90° · passes ${(pq * 100).toFixed(0)}%`}</Txt>
        {/* inset: the beam's needle against the sheet, scene-5 style */}
        <rect x={I.x} y={I.y} width={I.w} height={I.h} rx={8} fill="#FFFFFF" stroke={LBLUE} strokeWidth={1.5} />
        <circle cx={I.ox} cy={I.oy} r={I.S} fill="none" stroke={SOFT} strokeWidth={1.25} strokeDasharray="4 4" />
        <line x1={I.ox - (I.S + 14) * Math.cos(q * DEG)} y1={I.oy + (I.S + 14) * Math.sin(q * DEG)} x2={I.ox + (I.S + 14) * Math.cos(q * DEG)} y2={I.oy - (I.S + 14) * Math.sin(q * DEG)} stroke={TEAL} strokeWidth={2.25} />
        <path d={`M ${I.ox + 34 * Math.cos(q * DEG)} ${I.oy - 34 * Math.sin(q * DEG)} A 34 34 0 0 ${th > q ? 0 : 1} ${I.ox + 34 * Math.cos(th * DEG)} ${I.oy - 34 * Math.sin(th * DEG)}`} fill="none" stroke={RED} strokeWidth={1.5} />
        <Txt x={I.ox + 52 * Math.cos(mid * DEG) + 2} y={I.oy - 52 * Math.sin(mid * DEG) + 5} size={12} fill={RED} bold>{`${th - q}°`}</Txt>
        <line x1={I.ox} y1={I.oy} x2={nx} y2={ny} stroke={PURP} strokeWidth={3} markerEnd="url(#arrowPurpD)" />
        <g style={{ cursor: "grab" }} onPointerDown={drag}><circle cx={nx} cy={ny} r={22} fill="rgba(0,0,0,0)" /><circle cx={nx} cy={ny} r={7} fill={PURP} stroke="#FFFFFF" strokeWidth={2} /></g>
        <Txt x={I.x + 12} y={I.y + I.h - 30} anchor="start" size={12} fill={TEAL} bold>{`sheet at ${q}°`}</Txt>
        <Txt x={I.x + 12} y={I.y + I.h - 12} anchor="start" size={11}>{`needle θ = ${th}° · drag`}</Txt>
      </svg>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 6 }}>
        {[0, 45, 90].map((a) => <Button key={a} ghost={q !== a} onClick={() => room.publish({ question: a }, true)}>{`sheet at ${a}°`}</Button>)}
      </div>
    </div>
  );
}

// ── SCENE 13 : the twins split — the full disk ──
function FigTwinsRoom() {
  const room = Room.usePresenter();
  const bs = beamsOf(room).filter((b) => hasQ(b, 0));
  const full = !!room.state.fullDisk;
  const pair = room.state.pair || [];
  const pickPair = () => {
    const ok = (sl) => { const b = bs.find((x) => x.slot === sl); return b && b.noise < 0.05 && hasQ(b, 45); };
    for (let sl = 1; sl <= 10; sl += 2) if (ok(sl) && ok(sl + 1)) { room.publish({ pair: [sl, sl + 1] }, true); return; }
    room.publish({ pair: [] }, true);
  };
  const cx = 300, cy = 260, R = 200;
  const X = (p) => cx + (p - 0.5) * 2 * R, Y = (s) => cy - s * 2 * R;
  const N = { ox: 640, oy: 260, S: 190 };
  return (
    <div>
      <svg viewBox="0 0 900 520" style={svgStyle}>
        <Txt x={300} y={34} size={15} fill={INK} bold>Bernoulli disk · x = passes 0°, y = (passes 45°) − ½</Txt>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={INK} strokeWidth="2.25" opacity={full ? 1 : 0.15} />
        <path d={`M ${X(0)} ${cy} A ${R} ${R} 0 0 1 ${X(1)} ${cy}`} fill="none" stroke={INK} strokeWidth="2.25" />
        <line x1={X(0)} y1={cy} x2={X(1)} y2={cy} stroke={INK} strokeWidth="1.75" />
        <Txt x={X(0)} y={cy + 24} size={13} fill={INK} bold>always-V</Txt><Txt x={X(1)} y={cy + 24} size={13} fill={INK} bold>always-H</Txt>
        {bs.map((b) => { const p = pAt(b, 0), s45 = hasQ(b, 45) ? pAt(b, 45) - 0.5 : null;
          const y = full && s45 !== null ? Y(s45) : Y(sig(p) * (1 - b.noise));
          const on = pair.includes(b.slot);
          return (<g key={b.slot}>
            {on && <circle cx={X(p)} cy={y} r="20" fill="none" stroke={RED} strokeWidth="2.25" />}
            <circle cx={X(p)} cy={y} r="9" fill={b.noise > 0.05 ? SOFT : GOLD} opacity="0.85" stroke="#FFFFFF" strokeWidth={1.5} />
            <text x={X(p)} y={y - 14} textAnchor="middle" fontSize="16">{b.tag}</text>
          </g>); })}
        {/* the needle's frame: quarter circle → half circle */}
        <Txt x={640} y={34} size={15} fill={INK} bold>the needle · quarter circle → half circle</Txt>
        <line x1={N.ox} y1={N.oy} x2={N.ox + N.S + 20} y2={N.oy} stroke={GOLD} strokeWidth="2.25" />
        <line x1={N.ox} y1={N.oy - N.S - 10} x2={N.ox} y2={N.oy + (full ? N.S + 10 : 0)} stroke={TEAL} strokeWidth="2.25" />
        <path d={`M ${N.ox + N.S} ${N.oy} A ${N.S} ${N.S} 0 0 0 ${N.ox} ${N.oy - N.S}`} fill="none" stroke={SOFT} strokeWidth="1.5" strokeDasharray="6 5" />
        {full && <path d={`M ${N.ox + N.S} ${N.oy} A ${N.S} ${N.S} 0 0 1 ${N.ox} ${N.oy + N.S}`} fill="none" stroke={SOFT} strokeWidth="1.5" strokeDasharray="6 5" />}
        <Txt x={N.ox + N.S + 30} y={N.oy + 5} anchor="start" size={12} fill={GOLD} bold>H</Txt>
        <Txt x={N.ox} y={N.oy - N.S - 20} size={12} fill={TEAL} bold>V</Txt>
        {full && <Txt x={N.ox} y={N.oy + N.S + 28} size={12} fill={TEAL} bold>−V · negative bandwidth</Txt>}
        {pair.map((sl) => { const th = Room.secrets(sl).theta, b = bs.find((x) => x.slot === sl); if (!b) return null;
          const a = th > 90 && full ? -(180 - th) : (th > 90 ? 180 - th : th);
          return (<g key={sl}><line x1={N.ox} y1={N.oy} x2={N.ox + N.S * Math.cos(a * DEG)} y2={N.oy - N.S * Math.sin(a * DEG)} stroke={PURP} strokeWidth="3.5" strokeLinecap="round" /><text x={N.ox + (N.S + 26) * Math.cos(a * DEG)} y={N.oy - (N.S + 26) * Math.sin(a * DEG) + 6} textAnchor="middle" fontSize="18">{b.tag}</text></g>); })}
      </svg>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 6 }}>
        <CollectButton />
        <Button ghost onClick={pickPair}>spotlight a twin pair</Button>
        <Button active={!full} onClick={() => room.publish({ fullDisk: false, question: 0 }, true)}>with the 0° question</Button>
        <Button active={full} onClick={() => room.publish({ fullDisk: true, question: 45 }, true)}>with the 45° question</Button>
      </div>
    </div>
  );
}

// ═══════════════════════════ PART III — THE MISSING DIMENSION ═══════════════════════════
function useClock(running = true, speed = 1) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!running) return;
    let id, t0 = performance.now();
    const tick = (now) => { setT(((now - t0) / 1000) * speed); id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [running, speed]);
  return t;
}

// ── SCENE 15 : the clocks — a bounce on a line is the shadow of a circle; Fresnel's guess: the glass makes the V-clock run late ──
function FigShadowRoom() {
  const room = Room.usePresenter();
  const [running, setRunning] = useState(false);
  const shadowWrap = useRef(null);
  const shadowEnter = useSlideEnter(shadowWrap);
  useEffect(() => { setRunning(false); }, [shadowEnter]);
  const off = room.state.clockOffset ?? 0;                 // degrees the V-clock lags
  const t = useClock(running, 1);
  const w = 2 * Math.PI * 0.4, ph = w * t;
  const th = 35 * DEG;
  // left: the field tip of a linear beam at θ bounces on a diameter
  const L = { cx: 170, cy: 250, R: 120 };
  const ex = Math.cos(th) * Math.cos(ph), ey = Math.sin(th) * Math.cos(ph);
  // middle: a point going round a circle and its shadow on the same diameter
  const M = { cx: 450, cy: 250, R: 120 };
  const px = Math.cos(ph), py = Math.sin(ph);
  const sx = Math.cos(th) * px * Math.cos(th) + Math.sin(th) * px * Math.sin(th);   // projection of (px, 0) onto the θ line: px·cosθ, px·sinθ
  // right: the needle with a clock on each component; V lags by `off`
  const N = { ox: 640, oy: 330, S: 190 };
  const hx = Math.cos(th) * Math.cos(ph), vy = Math.sin(th) * Math.cos(ph - off * DEG);
  const Clock = ({ x, y, a, col }) => (<g><circle cx={x} cy={y} r="22" fill="#FFFFFF" stroke={col} strokeWidth="1.75" /><line x1={x} y1={y} x2={x + 18 * Math.cos(a)} y2={y - 18 * Math.sin(a)} stroke={col} strokeWidth="2.25" strokeLinecap="round" /></g>);
  return (
    <div ref={shadowWrap}>
      <svg viewBox="0 0 900 480" style={svgStyle}>
        <Txt x={L.cx} y={40} size={14} fill={INK} bold>a linear beam's field tip</Txt>
        <circle cx={L.cx} cy={L.cy} r={L.R} fill="none" stroke={LBLUE} strokeWidth="1.5" strokeDasharray="5 5" />
        <line x1={L.cx - L.R * Math.cos(th)} y1={L.cy + L.R * Math.sin(th)} x2={L.cx + L.R * Math.cos(th)} y2={L.cy - L.R * Math.sin(th)} stroke={SOFT} strokeWidth="1.5" />
        <line x1={L.cx} y1={L.cy} x2={L.cx + L.R * ex} y2={L.cy - L.R * ey} stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx={L.cx + L.R * ex} cy={L.cy - L.R * ey} r="9" fill={GOLD} stroke="#FFFFFF" strokeWidth={1.75} />
        <Txt x={L.cx} y={L.cy + L.R + 40} size={13}>it bounces along a line</Txt>

        <Txt x={M.cx} y={40} size={14} fill={INK} bold>a point going round — and its shadow</Txt>
        <circle cx={M.cx} cy={M.cy} r={M.R} fill="none" stroke={INK} strokeWidth="1.5" />
        <line x1={M.cx - M.R * Math.cos(th)} y1={M.cy + M.R * Math.sin(th)} x2={M.cx + M.R * Math.cos(th)} y2={M.cy - M.R * Math.sin(th)} stroke={SOFT} strokeWidth="1.5" />
        <circle cx={M.cx + M.R * (px * Math.cos(th) - py * Math.sin(th))} cy={M.cy - M.R * (px * Math.sin(th) + py * Math.cos(th))} r="9" fill={PURP} stroke="#FFFFFF" strokeWidth={1.75} />
        <line x1={M.cx + M.R * (px * Math.cos(th) - py * Math.sin(th))} y1={M.cy - M.R * (px * Math.sin(th) + py * Math.cos(th))} x2={M.cx + M.R * px * Math.cos(th)} y2={M.cy - M.R * px * Math.sin(th)} stroke={SOFT} strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx={M.cx + M.R * px * Math.cos(th)} cy={M.cy - M.R * px * Math.sin(th)} r="9" fill={GOLD} stroke="#FFFFFF" strokeWidth={1.75} />
        <Txt x={M.cx} y={M.cy + M.R + 40} size={13}>the same bounce — as a shadow</Txt>

        <Txt x={N.ox + 80} y={40} size={14} fill={INK} bold>the needle, with a clock on each part</Txt>
        <line x1={N.ox} y1={N.oy} x2={N.ox + N.S} y2={N.oy} stroke={GOLD} strokeWidth="2.25" />
        <line x1={N.ox} y1={N.oy} x2={N.ox} y2={N.oy - N.S} stroke={TEAL} strokeWidth="2.25" />
        <Txt x={N.ox + N.S} y={N.oy + 22} size={12} fill={GOLD} bold>H-part</Txt>
        <Txt x={N.ox - 8} y={N.oy - N.S + 4} anchor="end" size={12} fill={TEAL} bold>V-part</Txt>
        <line x1={N.ox} y1={N.oy} x2={N.ox + N.S * hx} y2={N.oy - N.S * vy} stroke={PURP} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx={N.ox + N.S * hx} cy={N.oy - N.S * vy} r="9" fill={PURP} stroke="#FFFFFF" strokeWidth={1.75} />
        <Clock x={N.ox + N.S + 50} y={N.oy} a={ph} col={GOLD} />
        <Clock x={N.ox} y={N.oy - N.S - 50} a={ph - off * DEG} col={TEAL} />
        <Txt x={N.ox + 100} y={N.oy + 60} size={13}>{off === 0 ? "both clocks tick in step → the tip bounces on a line" : off === 90 ? "a quarter turn late → the tip goes round a circle" : off === 180 ? "half a turn late → a line again, mirrored: the twin" : `V-clock ${off}° late → the tip goes round an ellipse`}</Txt>
      </svg>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
        <Button ghost onClick={() => setRunning((r) => !r)}>{running ? "❙❙" : "▶"}</Button>
        <span style={{ fontFamily: MONO, fontSize: 14, color: INK }}>the glass delays the V-clock by</span>
        <input type="range" min="0" max="180" step="5" value={off} onChange={(e) => room.publish({ clockOffset: parseInt(e.target.value) })} style={{ width: 240, accentColor: TEAL }} />
        <span style={{ fontFamily: MONO, fontSize: 13, color: SOFT }}>{`${off}°`}</span>
      </div>
    </div>
  );
}

// ── SCENE 14 : Fresnel's bench — the sunglasses bench again (sheet 1 at 45°, sheet 2 turnable, detector), with a block of glass that can go in between. No theory: only what the detector reads. ──
function FigGlassBench({ preset = "full" }) {
  // presets: one step of the walkthrough each — what the bench starts with and which controls are on the board
  const solo = preset === "lamp", s2 = solo ? "the sheet" : "sheet 2";   // the scene-7 opener: one sheet on the bench, before sheet 1 / sheet 2 exist in the story
  const ALL = solo ? ["phi", "view"] : ["a1", "mid", "am", "delay", "undo", "phi", "light", "view"];
  const PRE = {
    full:    { a1: 45, mid: "none", undo: false, light: "beam" },
    striped: { a1: 45, mid: "none", undo: false, light: "beam" },
    lamp:    { a1: -1, mid: "none", undo: false, light: "beam" },
    third:   { a1: 0, mid: "sheet", am: 45, phi: 90, undo: false, light: "beam" },
    turn:    { a1: 45, mid: "glass", delay: 180, phi: 135, undo: false, light: "beam" },
    glass:   { a1: 45, mid: "glass", undo: false, light: "beam" },
    undo:    { a1: 45, mid: "glass", undo: true, light: "beam" },
    wave:    { a1: 45, mid: "glass", undo: false, light: "wave" },
  };
  const pre = PRE[preset] || PRE.full, has = (k) => ALL.includes(k);
  const [mid, setMid] = useState(pre.mid);                              // what stands between the two sheets: nothing, the glass, or a third striped sheet
  const [a1, setA1] = useState(pre.a1), [am, setAm] = useState(pre.am ?? 0);        // sheet 1's stripes (−1: no sheet 1, plain lamplight) · the middle sheet's stripes
  const unpol = a1 === -1;
  const glass = mid === "glass", midSheet = mid === "sheet", cam = Math.cos(am * DEG), sam = Math.sin(am * DEG);
  const [phi, setPhi] = useState(pre.phi ?? 45);
  const [light, setLight] = useState(pre.light);
  const [delay, setDelay] = useState(pre.delay ?? 90), [undo, setUndo] = useState(pre.undo);   // the glass's delay of the V wiggle (¼, ½ or a full turn) · a second glass with the delay reversed
  const undoOn = glass && undo, dName = delay === 90 ? "¼ turn" : delay === 180 ? "½ turn" : "full turn";
  const wave = light === "wave";
  // the bench laid out as on the sunglasses slide: lamp at −L, sheet 1 a third of the way in, exit face at +L. Nothing in between: sheet 2 halfway to the exit. Something in: sheet 1 · object(s) · sheet 2 · exit equally spaced
  const L = 3.04, z1 = -2 * L / 3, hs = 0.8, gw = 0.22;
  const posOf = (m, u) => { const n = m === "none" ? 0 : m === "glass" && u ? 2 : 1; const stp = (L - z1) / (n + 2); return n === 0 ? { zg: z1 + (L - z1) / 3, zu: z1 + 2 * (L - z1) / 3, z2: (z1 + L) / 2 } : { zg: z1 + stp, zu: z1 + 2 * stp, z2: z1 + (n + 1) * stp }; };
  const VIEWS = { "side view": { yaw: 90, pitch: 22 }, "3D": { yaw: 64, pitch: 16 } };   // the same two views as the sunglasses bench
  const [view, setView] = useState("side view");
  const [st, setSt] = useState({ run: false, yaw: 90, pitch: 22, ...posOf(pre.mid, pre.undo) });
  const wrap = useRef(null);
  const enter = useSlideEnter(wrap);
  const tgt = useRef(null), drag = useRef(null), posTgt = useRef(posOf(pre.mid, pre.undo));
  useEffect(() => { setMid(pre.mid); setUndo(pre.undo); setDelay(pre.delay ?? 90); posTgt.current = posOf(pre.mid, pre.undo); setPhi(pre.phi ?? 45); setA1(pre.a1); setAm(pre.am ?? 0); setLight(pre.light); setView("side view"); tgt.current = VIEWS["side view"]; setSt((s) => ({ ...s, run: false, ...posOf(pre.mid, pre.undo) })); }, [enter]);
  const pickMid = (m) => { setMid(m); posTgt.current = posOf(m, undo); };
  const pickUndo = () => { const u = !undo; setUndo(u); posTgt.current = posOf(mid, u); };
  const pickView = (v) => { setView(v); tgt.current = VIEWS[v]; };
  const [t, setT] = useState(0);
  const stRef = useRef(st); stRef.current = st;
  useEffect(() => { let id; const loop = () => {
    if (stRef.current.run) setT((x) => x + (stRef.current.wave ? 0.045 : 0.016));
    { const g = posTgt.current, v = stRef.current; const d = Math.max(Math.abs(g.z2 - v.z2), Math.abs(g.zg - v.zg), Math.abs(g.zu - v.zu)); if (d > 1e-4) { const lerp = (a, b) => d < 0.004 ? b : a + (b - a) * 0.12; setSt((s) => ({ ...s, z2: lerp(s.z2, g.z2), zg: lerp(s.zg, g.zg), zu: lerp(s.zu, g.zu) })); } }
    if (tgt.current) { const g = tgt.current, v = stRef.current; const ny = v.yaw + (g.yaw - v.yaw) * 0.14, np = v.pitch + (g.pitch - v.pitch) * 0.14;
      if (Math.abs(g.yaw - ny) < 0.25 && Math.abs(g.pitch - np) < 0.25) { tgt.current = null; setSt((s) => ({ ...s, yaw: g.yaw, pitch: g.pitch })); } else setSt((s) => ({ ...s, yaw: ny, pitch: np })); }
    id = requestAnimationFrame(loop); }; id = requestAnimationFrame(loop); return () => cancelAnimationFrame(id); }, []);
  stRef.current = { ...st, wave };
  const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const onDown = (e) => { if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId); tgt.current = null; drag.current = { x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch }; };
  const onMove = (e) => { if (!drag.current) return; const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y; setSt((s) => ({ ...s, yaw: cl(drag.current.yaw - dx * 0.35, 10, 100), pitch: cl(drag.current.pitch + dy * 0.35, -22, 22) })); };
  const onUp = (e) => { if (drag.current && e && Math.hypot(e.clientX - drag.current.x, e.clientY - drag.current.y) > 2) swallowClick(); drag.current = null; };
  const c12 = Math.cos((phi - a1) * DEG);
  const cm1 = Math.cos((am - a1) * DEG), c2m = Math.cos((phi - am) * DEG);
  const ca1 = Math.cos(a1 * DEG), sa1 = Math.sin(a1 * DEG), cp2 = Math.cos(phi * DEG), sp2 = Math.sin(phi * DEG);
  // the bar reads what reaches the exit as a fraction of what left sheet 1: nothing between → cos²; glass with delay δ → (a·cosφ)² + (b·sinφ)² + 2ab·cosφ·sinφ·cosδ (half at every angle for δ = ¼ turn and sheet 1 diagonal); a second glass reverses δ; a middle sheet → cos² twice
  const dEff = undoOn ? 0 : delay * DEG, cdel = Math.cos(dEff);
  const Tg = (ca1 * cp2) ** 2 + (sa1 * sp2) ** 2 + 2 * ca1 * sa1 * cp2 * sp2 * cdel, oneWiggle = a1 === 0 || a1 === 90;
  const T2 = unpol ? (midSheet ? 0.5 * c2m * c2m : 0.5) : glass ? Tg : midSheet ? cm1 * cm1 * c2m * c2m : c12 * c12, pct = Math.round(T2 * 100);
  // plain lamplight (no sheet 1): nothing is lost at z1, any striped sheet keeps half, the glass keeps everything
  const I0 = 1, I1 = unpol ? 1 : 0.5, Im = midSheet ? (unpol ? 0.5 : I1 * cm1 * cm1) : I1, I2 = I1 * T2;
  const name = (g) => g === -1 ? "none" : g === 0 ? "horizontal" : g === 135 ? "other diagonal" : g === 90 ? "vertical" : g === 45 ? "diagonal" : g === 135 ? "other diagonal" : g + "°";
  const ps = st.yaw * DEG, phv = st.pitch * DEG;
  const cps = Math.cos(ps), sps = Math.sin(ps), cph = Math.cos(phv), sph = Math.sin(phv);
  const cx = 450, cyy = 235, S = 140;
  const proj = (x, y, z) => { const px = x * cps + z * sps, z1 = -x * sps + z * cps; return [cx + S * px, cyy - S * (y * cph - z1 * sph)]; };
  const z2 = st.z2, zg = st.zg, zu = st.zu;
  const Iat = (z) => z < z1 ? I0 : z < zg ? I1 : z < z2 ? Im : I2;
  const P = (z) => proj(0, 0, z);
  const seg = (za, zb, I, key) => { const A = P(za), B = P(zb); return (<g key={key}>
    {I < 0.01 && <line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={LBLUE} strokeWidth={1.5} strokeDasharray="4 6" />}
    {I >= 0.01 && <line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={GOLD} strokeWidth={6 + 26 * Math.sqrt(I)} strokeLinecap="butt" opacity={0.14 + 0.2 * I} />}
    {I >= 0.01 && <line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={GOLD} strokeWidth={2 + 6 * Math.sqrt(I)} strokeLinecap="butt" opacity={0.45 + 0.45 * I} />}
  </g>); };
  const ND = 64, rnd = (k, m) => { const x = Math.sin(k * 127.1 + m * 311.7) * 43758.5453; return x - Math.floor(x); };
  const grains = Array.from({ length: ND }, (_, k) => {
    const z = -L + ((k / ND + t * 0.55) % 1) * 2 * L;
    const lot = rnd(k, 1), ox = (rnd(k, 2) - 0.5) * 0.34, oy = (rnd(k, 3) - 0.5) * 0.34;
    if (lot >= Iat(z)) return null;
    const q = proj(ox, oy, z);
    return <circle key={k} cx={q[0]} cy={q[1]} r={3.2} fill="#FFFFFF" stroke={GOLD} strokeWidth={1.5} opacity={0.95} />;
  });
  const sqAt = (z, h = hs) => [[-h, -h], [h, -h], [h, h], [-h, h]].map((c) => proj(c[0], c[1], z).map((v) => v.toFixed(1)).join(",")).join(" ");
  const SheetG = ({ z, ang, col, label }) => { const ca = Math.cos(ang * DEG), sa = Math.sin(ang * DEG); const lb = proj(0, -hs - 0.42, z); return (<g>
    <polygon points={sqAt(z)} fill="#FFFFFF" fillOpacity={0.55} stroke={col} strokeWidth={2.5} />
    {[-3, -2, -1, 0, 1, 2, 3].map((k) => { const off = k * 0.2; const px = -sa * off, py = ca * off; const half = Math.sqrt(Math.max(0, hs * hs - off * off)) * 0.98; const A = proj(px - ca * half, py - sa * half, z), B = proj(px + ca * half, py + sa * half, z); return <line key={k} x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={col} strokeWidth={k === 0 ? 3 : 1.6} opacity={k === 0 ? 0.7 : 0.4} strokeLinecap="round" />; })}
    <Txt x={lb[0]} y={lb[1]} size={14} fill={col} bold>{label}</Txt>
  </g>); };
  // the glass: a slab, two faces and four edges — no stripes, nothing to absorb. On the entry face its two axes: the fast one solid, the slow one dashed (H gold, V teal, as the wiggles)
  const GlassG = ({ z, label, rev }) => { const gh = hs * 0.78, zA = z - gw, zB = z + gw; const C = [[-gh, -gh], [gh, -gh], [gh, gh], [-gh, gh]]; const lb = proj(0, -hs - 0.42, z); const ax = gh * 0.8; const H = [proj(-ax, 0, zA), proj(ax, 0, zA)], V = [proj(0, -ax, zA), proj(0, ax, zA)]; return (<g>
    <polygon points={sqAt(zA, gh)} fill="#EAF3FA" fillOpacity={0.7} stroke={INK} strokeWidth={2} />
    <line x1={H[0][0]} y1={H[0][1]} x2={H[1][0]} y2={H[1][1]} stroke={GOLD} strokeWidth={3} strokeLinecap="round" strokeDasharray={rev ? "4 6" : undefined} opacity={0.85} />
    <line x1={V[0][0]} y1={V[0][1]} x2={V[1][0]} y2={V[1][1]} stroke={TEAL} strokeWidth={3} strokeLinecap="round" strokeDasharray={rev ? undefined : "4 6"} opacity={0.85} />
    {C.map((c, i) => { const A = proj(c[0], c[1], zA), B = proj(c[0], c[1], zB); return <line key={i} x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={INK} strokeWidth={1.5} />; })}
    <polygon points={sqAt(zB, gh)} fill="#EAF3FA" fillOpacity={0.45} stroke={INK} strokeWidth={2} />
    <Txt x={lb[0]} y={lb[1]} size={14} fill={INK} bold>{label}</Txt>
    <text x={lb[0]} y={lb[1] + 18} textAnchor="middle" fontFamily={MONO} fontSize="12"><tspan fill={GOLD} fontWeight="700">H</tspan><tspan fill={SOFT}>{rev ? " slow · " : " fast · "}</tspan><tspan fill={TEAL} fontWeight="700">V</tspan><tspan fill={SOFT}>{rev ? " fast" : " slow"}</tspan></text>
  </g>); };
  const lamp = P(-L), det = P(L), lampLb = proj(0, -hs - 0.42, -L);
  // the wave: an H wiggle (size a) and a V wiggle (size b) riding the beam from sheet 1 on; the glass lets the V wiggle run δ late, a second glass lets it catch up again; sheet 2 keeps the part along φ. Lamplight: sizes and timing jump at random
  const rj = Math.floor(t / 2.4), rA = unpol ? rnd(rj, 7) * 180 : a1, rD = unpol ? rnd(rj, 8) * 2 * Math.PI : 0;
  const A3 = 0.62, aW = Math.cos(rA * DEG), bW = Math.sin(rA * DEG), del = glass ? delay * DEG : 0, cphi = Math.cos(phi * DEG), sphi = Math.sin(phi * DEG);
  const KW = 6.2, zGe = zg + gw, zUe = zu + gw;
  const lagAt = (z) => rD + (z <= zGe ? 0 : undoOn && z > zUe ? 0 : del);
  const field = (z, tt) => { const ph = tt - KW * z; let ex = A3 * aW * Math.sin(ph), ey = A3 * bW * Math.sin(ph - lagAt(z)); if (midSheet && z > zGe) { const km = ex * cam + ey * sam; ex = km * cam; ey = km * sam; } if (z <= z2) return [ex, ey]; const k = ex * cphi + ey * sphi; return [k * cphi, k * sphi]; };
  const zsW = (() => { const out = []; const N = 110; for (let i = 0; i <= N; i++) { const z = z1 + ((L - z1) * i) / N; out.push(z); } [zGe, zUe, z2].forEach((zc) => out.push(zc - 1e-4, zc + 1e-4)); return out.sort((p, q) => p - q); })();
  const plW = (fn) => zsW.map((z) => { const q = fn(z); return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" ");
  const trailAt = (z, col) => Array.from({ length: 30 }, (_, kk) => { const tt = t - kk * 0.13; const f = field(z, tt); const q = proj(f[0], f[1], z); return <circle key={col + kk} cx={q[0]} cy={q[1]} r={kk === 0 ? 7 : 3.4} fill={col} opacity={kk === 0 ? 1 : 0.28 * (1 - kk / 32)} />; });
  const zTrail = zGe + 0.16, zE = L;                            // just behind the glass: a line without it, a circle with it · the exit face
  const frameAt = (z, col) => (<g><polygon points={sqAt(z)} fill="none" stroke={col} strokeWidth={1.5} strokeDasharray="3 4" />{(() => { const A = proj(-hs, 0, z), B = proj(hs, 0, z), C = proj(0, -hs, z), D = proj(0, hs, z); return <><line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={GRID} strokeWidth={1.5} /><line x1={C[0]} y1={C[1]} x2={D[0]} y2={D[1]} stroke={GRID} strokeWidth={1.5} /></>; })()}</g>);
  const pm = Math.round(cm1 * cm1 * 100), p2m = Math.round(c2m * c2m * 100);
  const glassWave = oneWiggle ? `only the ${a1 === 0 ? "H" : "V"} wiggle: the glass has nothing to delay it against — the tip still swings on a line`
    : undoOn ? "a second glass, delay reversed: the V wiggle catches up — the line is back, as if no glass stood there"
    : delay === 90 ? "glass: the V wiggle runs ¼ turn late — the tip goes round; any sheet keeps half a circle"
    : delay === 180 ? `half a turn: the V wiggle is flipped — the tip swings on a line at ${180 - a1}°: striped light, turned by 90°`
    : "a full turn: H and V are back in step — the glass changes nothing";
  const glassBeam = oneWiggle ? `sheet 1 ${name(a1)}: one wiggle only — the glass changes nothing, sheet 2 reads ${pct}% as without it`
    : undoOn ? (delay === 180 ? "a second glass turns the stripes back: as without any glass — a turn can be undone, a sheet's loss cannot" : "the second glass undoes the first: as without any glass — a delay can be undone, noise cannot")
    : delay === 90 ? "glass in: 50% — at every angle. Like lamplight. Yet the glass has no stripes and took nothing away"
    : delay === 180 ? `half-turn glass: the direction turned by 90° — sheet 2 reads ${pct}%, mirrored. Every photon still here`
    : `full-turn glass: nothing changes — sheet 2 reads ${pct}%, as without it`;
  const lampWave = midSheet ? "lamplight: sizes and timing jump at random — the striped sheet keeps one line of it: order, from here on"
    : glass ? "lamplight: sizes and timing jump at random — a delay on top of random timing is still random"
    : "lamplight: the wiggles' sizes and timing jump at random — no line, no circle to hold on to";
  const lampBeam = midSheet ? `lamplight through a striped sheet: half — and sheet 2 now reads cos² from there: ${pct}%`
    : glass ? (undoOn ? "lamplight, glass and reversed glass: still 50% at every angle — there was no order to undo" : "lamplight through the glass: 50% at every angle — the same reading as the diagonal beam gave")
    : solo ? "50% whichever way the sheet turns — a grey filter?" : "plain lamplight: 50% at every angle — no direction to find";
  const verdict = unpol ? (wave ? lampWave : lampBeam) : wave
    ? (glass ? glassWave
      : midSheet ? (pm === 0 ? "the middle sheet is crossed with sheet 1: nothing gets through it" : `the middle sheet keeps only the part along ${am}°: the tip swings on a line at ${am}° — striped again`)
      : `H and V in step: the tip swings on a line at ${a1}° — sheet 2 keeps the part along its slots`)
    : glass ? glassBeam
    : midSheet ? (pm === 0 ? "the middle sheet is crossed with sheet 1: nothing reaches sheet 2" : pm >= 99 ? `the middle sheet lies along sheet 1: it changes nothing — sheet 2 reads ${pct}%` : p2m >= 99 ? "a striped sheet halves the light — sheet 2 along its stripes passes all of that: striped again" : p2m === 0 ? "a striped sheet halves the light — sheet 2 crossed with it stops the rest: striped, not lamplight" : "a striped sheet halves the light — sheet 2 at 45°: half of that. Turn it: you find 0% and 50%")
    : pct >= 99 ? "same direction as sheet 1: everything through" : pct === 0 ? "crossed with sheet 1: nothing through" : "turned by 45° from sheet 1: half through";
  return (
    <div ref={wrap} style={{ width: "100%" }}>
      <svg viewBox="0 0 900 470" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        style={{ width: "100%", display: "block", touchAction: "none", userSelect: "none", cursor: "grab" }}>
        {wave ? seg(-L, z1, I0, "b0") : [seg(-L, z1, I0, "b0"), seg(z1, zg, I1, "b1"), seg(zg, z2, Im, "bm"), seg(z2, L, I2, "b2")]}
        {!wave && grains}
        {wave && <line x1={P(z1)[0]} y1={P(z1)[1]} x2={det[0]} y2={det[1]} stroke={LBLUE} strokeWidth={2} />}
        {wave && frameAt(zTrail, GOLD)}{wave && frameAt(zE, PURP)}
        {!wave && <polygon points={sqAt(zE)} fill="none" stroke={LBLUE} strokeWidth={2} strokeDasharray="3 4" />}
        <circle cx={lamp[0]} cy={lamp[1]} r={22} fill="#FDEFE3" stroke={GOLD} strokeWidth={2.5} />
        <circle cx={lamp[0]} cy={lamp[1]} r={9} fill={GOLD} />
        <Txt x={lampLb[0]} y={lampLb[1]} size={14} fill={INK} bold>lamp</Txt>
        {!unpol && <SheetG z={z1} ang={a1} col={TEAL} label={"sheet 1 · " + name(a1)} />}
        {glass && <GlassG z={zg} label={"glass · " + dName} />}
        {undoOn && <GlassG z={zu} label="glass 2 · reversed" rev />}
        {midSheet && <SheetG z={zg} ang={am} col={INK} label={"sheet · " + name(am)} />}
        <SheetG z={z2} ang={phi} col={INK} label={s2 + " · " + name(phi)} />
        {wave && <g>
          {zsW.filter((_, i) => i % 7 === 0).map((z, i) => { const f = field(z, t), qa = proj(0, 0, z), qh = proj(f[0], 0, z), qv = proj(0, f[1], z), q2 = proj(f[0], f[1], z); return (<g key={"s" + i}>
            <line x1={qa[0]} y1={qa[1]} x2={qh[0]} y2={qh[1]} stroke={GOLD} strokeWidth={1.6} strokeDasharray="3 5" opacity={0.5} />
            <line x1={qa[0]} y1={qa[1]} x2={qv[0]} y2={qv[1]} stroke={TEAL} strokeWidth={1.6} strokeDasharray="3 5" opacity={0.5} />
            <line x1={qa[0]} y1={qa[1]} x2={q2[0]} y2={q2[1]} stroke={INK} strokeWidth={1.6} opacity={0.13} /></g>); })}
          <polyline points={plW((z) => proj(field(z, t)[0], 0, z))} fill="none" stroke={GOLD} strokeWidth={3} strokeLinejoin="round" opacity={0.9} />
          <polyline points={plW((z) => proj(0, field(z, t)[1], z))} fill="none" stroke={TEAL} strokeWidth={3} strokeLinejoin="round" opacity={0.9} />
          <polyline points={plW((z) => { const f = field(z, t); return proj(f[0], f[1], z); })} fill="none" stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />
          {trailAt(zTrail, INK)}{trailAt(zE, PURP)}
        </g>}
        <g>
          <rect x={859} y={40} width={16} height={90} fill="none" stroke={SOFT} strokeWidth={1.5} />
          <rect x={859} y={40 + 90 * (1 - T2)} width={16} height={90 * T2} fill={GOLD} />
          <Txt x={867} y={148} size={12}>{pct + "%"}</Txt>
        </g>
        <text x={25} y={30} fontFamily={MONO} fontSize="16">
          {wave ? <><tspan fill={GOLD}>H</tspan><tspan fill={INK}> + </tspan><tspan fill={TEAL}>V</tspan><tspan fill={INK}>{" = the wave (dark) · " + (glass ? (oneWiggle ? "glass: nothing to delay · " : undoOn ? "glass + reversed glass · " : `glass: V ${dName} late · `) : midSheet ? `mid sheet: ${name(am)} · ` : "") + "after sheet 2 (purple): "}</tspan><tspan fill={GOLD} fontWeight="700">{pct + "%"}</tspan></>
          : <><tspan fill={INK}>{unpol ? "lamp → " : `lamp → sheet 1 (${name(a1)}) → `}</tspan>{glass && <tspan fill={INK} fontWeight="700">{undoOn ? "glass → glass⁻¹ → " : "glass → "}</tspan>}{midSheet && <tspan fill={INK} fontWeight="700">{`sheet (${name(am)}) → `}</tspan>}<tspan fill={INK}>{s2 + " ("}</tspan><tspan fill={INK} fontWeight="700">{name(phi)}</tspan><tspan fill={INK}>) → </tspan><tspan fill={GOLD} fontWeight="700">{pct + "%"}</tspan><tspan fill={INK}>{unpol ? " of the lamp's light" : midSheet || undoOn ? "" : " of what left sheet 1"}</tspan></>}
        </text>
        <text x={25} y={454} fontFamily={MONO} fontSize="14" fill={glass ? PURP : SOFT}>{verdict}</text>
      </svg>
      {/* same footer height as the wave bench (two slider rows + buttons), so lamp, sheets and beam sit at one height across scene 7 */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 6, minHeight: 130, alignContent: "flex-end" }}>
        <Button ghost onClick={() => setSt((s) => ({ ...s, run: !s.run }))}>{st.run ? "❙❙" : "▶"}</Button>
        {has("a1") && <Menu label={"sheet 1 · " + name(a1)} value={a1} items={[[-1, "none · plain lamplight"], [0, "horizontal"], [45, "diagonal"], [90, "vertical"]]} onPick={(g) => setA1(g)} />}
        {has("mid") && <Menu label={"between · " + (glass ? "glass" : midSheet ? "striped sheet" : "nothing")} value={mid} items={[["none", "nothing"], ["glass", "the glass"], ["sheet", "a striped sheet"]]} onPick={pickMid} />}
        {has("am") && midSheet && <Menu label={"middle sheet · " + name(am)} value={am} items={[[0, "horizontal"], [45, "diagonal"], [90, "vertical"]]} onPick={(g) => setAm(g)} />}
        {has("delay") && glass && <Menu label={"delay · " + dName} value={delay} items={[[90, "¼ turn"], [180, "½ turn"], [360, "a full turn"]]} onPick={(d) => setDelay(d)} />}
        {has("undo") && glass && <Button active={undo} ghost={!undo} onClick={pickUndo}>{undo ? "second glass: in" : delay === 180 ? "add a glass that turns back" : "add a reversed glass"}</Button>}
        {has("phi") && <Menu label={s2 + " · " + name(phi)} value={phi} items={[[0, "horizontal"], [45, "diagonal"], [90, "vertical"], [135, "other diagonal · crossed"]]} onPick={(g) => setPhi(g)} />}
        {has("light") && <Menu label={"light · " + light} value={light} items={[["beam", "beam"], ["wave", "wave"]]} onPick={(v) => setLight(v)} />}
        {has("view") && <Menu label={"view · " + view} value={view} items={[["side view", "side view"], ["3D", "3D view"]]} onPick={pickView} />}
      </div>
    </div>
  );
}

// ── SCENE 14 : the impostor — Fresnel's glass (1817): a pure beam that lands at the centre of the disk, where round B's mystery room pooled ──
function FigImpostorRoom() {
  const room = Room.usePresenter();
  const q = room.state.question === 45 ? 45 : 0;
  const bs = beamsOf(room).filter((b) => hasQ(b, 0));
  const both = bs.filter((b) => hasQ(b, 45));
  const isInside = (b) => { const st = Room.stokesOf(b.q); return b.noise < 0.05 && st.s2 !== null && Math.hypot(st.s1, st.s2) < 0.42; };
  const nIn = both.filter(isInside).length;
  const cx = 450, cy = 252, R = 150;
  const X = (u) => cx + u * 2 * R, Y = (v) => cy - v * 2 * R;
  return (
    <div>
      <svg viewBox="0 0 900 520" style={svgStyle}>
        <Txt x={cx} y={26} size={14} fill={INK} bold>every beam through Fresnel's glass · across: the 0° sheet, up: the 45° sheet</Txt>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={INK} strokeWidth="2.25" />
        <line x1={X(-0.55)} y1={cy} x2={X(0.55)} y2={cy} stroke={SOFT} strokeWidth="1.5" /><line x1={cx} y1={Y(-0.55)} x2={cx} y2={Y(0.55)} stroke={SOFT} strokeWidth="1.5" />
        <Txt x={X(0.55) + 16} y={cy + 5} anchor="start" size={12} fill={GOLD} bold>H</Txt><Txt x={X(-0.55) - 16} y={cy + 5} anchor="end" size={12} fill={GOLD} bold>V</Txt>
        <Txt x={cx} y={Y(0.55) - 12} size={12} fill={TEAL} bold>45°</Txt><Txt x={cx} y={Y(-0.55) + 22} size={12} fill={TEAL} bold>135°</Txt>
        {/* round B's mystery room pooled here: the same point */}
        <circle cx={cx} cy={cy} r="13" fill="none" stroke={PURP} strokeWidth="2" strokeDasharray="4 3" />
        <Txt x={cx + 20} y={cy + 32} anchor="start" size={12} fill={PURP}>round B pooled here</Txt>
        {bs.map((b) => { const st = Room.stokesOf(b.q), y = st.s2 === null ? 0 : st.s2, inside = isInside(b);
          return (<g key={b.slot} opacity={st.s2 === null ? 0.45 : 1}>
            {inside && <circle cx={X(st.s1)} cy={Y(y)} r="22" fill="none" stroke={RED} strokeWidth="2.25"><animate attributeName="r" values="16;26;16" dur="1.2s" repeatCount="indefinite" /></circle>}
            <circle cx={X(st.s1)} cy={Y(y)} r="9" fill={b.noise > 0.05 ? SOFT : GOLD} opacity="0.85" stroke="#FFFFFF" strokeWidth={1.5} />
            <text x={X(st.s1)} y={Y(y) - 14} textAnchor="middle" fontSize="16">{b.tag}</text>
          </g>); })}
        <Txt x={cx} y={482} size={13} fill={nIn ? RED : SOFT} bold>{!bs.length ? "waiting for the 0° sheet" : both.length < bs.length ? `${both.length} of ${bs.length} beams have answered the 45° sheet too` : nIn ? `red rings: ${nIn} pure beam${nIn > 1 ? "s" : ""}, yet at the centre` : "every beam has answered both sheets"}</Txt>
        <Txt x={cx} y={504} size={13}>grey: noisy beams · gold: no noise at all</Txt>
      </svg>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 6 }}>
        <CollectButton />
        <Button active={q === 0} onClick={() => room.publish({ question: 0 }, true)}>ask the 0° sheet</Button>
        <Button active={q === 45} onClick={() => room.publish({ question: 45 }, true)}>ask the 45° sheet</Button>
      </div>
    </div>
  );
}

// ── shared: the ball ──
function Ball({ cx, cy, R, view, children, axes = true, lower = 1, dashed = false }) {
  // lower ∈ 0…1 (only face-on): the hidden half swings open about the floor like a page — the same choreography as the coin plane
  const fold = Math.cos(Math.PI * lower), ry = Math.max(0.01, R * Math.abs(fold));
  const P = (sv) => { const q = Room.project(sv, view); return { x: cx + q.x * 2 * R, y: cy - q.y * 2 * R, depth: q.depth }; };
  const ring = (fn, n = 72) => Array.from({ length: n + 1 }, (_, i) => { const a = (i / n) * 2 * Math.PI; const q = P(fn(a)); return `${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join(" ");
  const eq = ring((a) => ({ s1: 0.5 * Math.cos(a), s2: 0.5 * Math.sin(a), s3: 0 }));
  const mer = ring((a) => ({ s1: 0.5 * Math.cos(a), s2: 0, s3: 0.5 * Math.sin(a) }));
  const ax = (sv, label, col) => { const q = P(sv), len = Math.hypot(q.x - cx, q.y - cy); return (<g key={label}><line x1={cx} y1={cy} x2={q.x} y2={q.y} stroke={col} strokeWidth="1.5" opacity={q.depth < 0 ? 0.35 : 0.9} />{len > 0.3 * R && <Txt x={q.x + (q.x - cx) * 0.12} y={q.y + (q.y - cy) * 0.12 + 5} size={12} fill={col} bold>{label}</Txt>}</g>); };
  return (
    <g>
      {lower >= 1 && <g>
        <circle cx={cx} cy={cy} r={R} fill={dashed ? "none" : "#FFFFFF"} stroke={INK} strokeWidth="1.75" strokeDasharray={dashed ? "7 6" : undefined} opacity={dashed ? 0.6 : 1} />
        <polyline points={eq} fill="none" stroke={SOFT} strokeWidth="1.5" strokeDasharray="5 4" />
        <polyline points={mer} fill="none" stroke={SOFT} strokeWidth="1" strokeDasharray="3 4" />
      </g>}
      {lower < 1 && <g>
        <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`} fill="none" stroke={INK} strokeWidth="1.75" strokeDasharray="7 6" opacity="0.6" />
        {lower > 0 && <path d={`M ${cx - R} ${cy} A ${R} ${ry.toFixed(2)} 0 0 ${fold > 0 ? 1 : 0} ${cx + R} ${cy}`} fill="none" stroke={INK} strokeWidth="1.75" strokeDasharray="7 6" opacity={0.6 * Math.min(1, lower * 4)} />}
        <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke={INK} strokeWidth="2.25" strokeDasharray={lower > 0.02 ? "8 6" : undefined} opacity={1 - 0.45 * lower} />
      </g>}
      {axes && [ax({ s1: 0.6, s2: 0, s3: 0 }, "H", GOLD), ax({ s1: -0.6, s2: 0, s3: 0 }, "V", GOLD), ax({ s1: 0, s2: 0.6, s3: 0 }, "45°", TEAL), ax({ s1: 0, s2: -0.6, s3: 0 }, "135°", TEAL), ax({ s1: 0, s2: 0, s3: 0.6 }, "circular ↺", PURP), ax({ s1: 0, s2: 0, s3: -0.6 }, "circular ↻", PURP)]}
      {children(P)}
    </g>
  );
}

// ── SCENE 16 : the undo test — a second glass, then the 45° sheet: noise cannot be undone, a delay can; the answer minus ½ is the third number (Stokes 1852) ──
function FigUndoRoom() {
  const room = Room.usePresenter();
  const second = room.state.question === "C";
  const bs = beamsOf(room).filter((b) => hasQ(b, 0) && hasQ(b, 45));
  const withC = bs.filter((b) => hasQ(b, "C"));
  const col = (b) => (b.noise > 0.05 ? SOFT : GOLD);
  const isImp = (b) => { const st = Room.stokesOf(b.q); return b.noise < 0.05 && Math.hypot(st.s1, st.s2) < 0.42; };
  const nUp = withC.filter((b) => Room.stokesOf(b.q).s3 > 0.25).length, nDn = withC.filter((b) => Room.stokesOf(b.q).s3 < -0.25).length;
  const by = 90;                                              // the bench
  const dx = 300, dy = 352, R = 100;                          // the disk, face-on
  const X = (u) => dx + u * 2 * R, Y = (v) => dy - v * 2 * R;
  const tx = 760, Yc = (v) => 290 - v * 330;                  // the column
  const Glass = ({ x, on = true, label }) => (<g opacity={on ? 1 : 0.35}><path d={`M ${x - 22} ${by - 44} L ${x + 22} ${by - 44} L ${x + 6} ${by + 44} L ${x - 38} ${by + 44} Z`} fill="#EAF3FA" stroke={INK} strokeWidth="2.25" strokeDasharray={on ? undefined : "5 4"} /><Txt x={x - 8} y={by + 66} size={12} fill={INK} bold>{label}</Txt></g>);
  const cap = !second ? "second glass, then the 45° sheet — noise cannot be undone, a delay can"
    : !withC.length ? "second glass in · waiting for 25 photons per beam"
    : `${withC.length} of ${bs.length} answered · ${nUp} up, ${nDn} down · the rest stay at 50%`;
  return (
    <div>
      <svg viewBox="0 0 900 520" style={svgStyle}>
        <Txt x={300} y={30} size={14} fill={INK} bold>Fresnel's bench, one glass more</Txt>
        <circle cx={36} cy={by} r={16} fill="#FDEFE3" stroke={GOLD} strokeWidth="2.25" />
        <line x1={54} y1={by} x2={590} y2={by} stroke={LBLUE} strokeWidth="4" />
        <WaveArrow x={90} y={by} a={45} />
        <Txt x={90} y={by + 66} size={12}>45° beam</Txt>
        <Glass x={160} label="glass" />
        <circle cx={232} cy={by} r={28} fill="none" stroke={PURP} strokeWidth="2.25" />
        <Txt x={232} y={by + 7} size={18} fill={PURP} bold>↺</Txt>
        <Txt x={232} y={by + 66} size={12} fill={PURP}>goes round</Txt>
        <Glass x={340} on={second} label="glass № 2" />
        <g opacity={second ? 1 : 0.35}><WaveArrow x={440} y={by} a={135} /><Txt x={440} y={by + 66} size={12}>{second ? "a line again" : "?"}</Txt></g>
        <Sheet x={525} y={by} size={78} a={45} label="45° sheet" />
        <BrightnessBar x={574} y={by - 70} v={second ? 0 : 0.5} w={26} h={140} />

        <Txt x={dx} y={212} size={14} fill={INK} bold>the disk, as the room left it</Txt>
        <circle cx={dx} cy={dy} r={R} fill="none" stroke={INK} strokeWidth="2" />
        <line x1={X(-0.55)} y1={dy} x2={X(0.55)} y2={dy} stroke={SOFT} strokeWidth="1.25" /><line x1={dx} y1={Y(-0.55)} x2={dx} y2={Y(0.55)} stroke={SOFT} strokeWidth="1.25" />
        <Txt x={X(0.55) + 14} y={dy + 4} anchor="start" size={11} fill={GOLD} bold>H</Txt><Txt x={X(-0.55) - 14} y={dy + 4} anchor="end" size={11} fill={GOLD} bold>V</Txt>
        <Txt x={dx} y={Y(0.55) - 8} size={11} fill={TEAL} bold>45°</Txt>
        {bs.map((b) => { const st = Room.stokesOf(b.q), imp = isImp(b), done = hasQ(b, "C");
          return (<g key={b.slot} opacity={imp && done ? 0.45 : 1}>
            {imp && !done && <circle cx={X(st.s1)} cy={Y(st.s2)} r="18" fill="none" stroke={RED} strokeWidth="2" />}
            <circle cx={X(st.s1)} cy={Y(st.s2)} r="7" fill={col(b)} opacity="0.85" stroke="#FFFFFF" strokeWidth={1.25} />
            <text x={X(st.s1)} y={Y(st.s2) - 11} textAnchor="middle" fontSize="14">{b.tag}</text>
          </g>); })}
        <Txt x={dx} y={dy + R + 22} size={12}>{second && withC.length ? "the impostors leave the disk — see the column" : "red rings: pure, yet at the centre"}</Txt>

        <Txt x={tx} y={30} size={14} fill={INK} bold>the third number</Txt>
        <Txt x={tx} y={50} size={12}>glass № 2 + 45° sheet · p − ½</Txt>
        <line x1={tx} y1={Yc(0.5)} x2={tx} y2={Yc(-0.5)} stroke={PURP} strokeWidth="1.5" />
        {[0.5, 0, -0.5].map((v) => (<g key={v}><line x1={tx - 8} y1={Yc(v)} x2={tx + 8} y2={Yc(v)} stroke={PURP} strokeWidth="1.5" /><Txt x={tx - 16} y={Yc(v) + 5} anchor="end" size={12} fill={PURP}>{v === 0 ? "50% · 0" : v > 0 ? "100% · +½" : "0% · −½"}</Txt></g>))}
        <Txt x={tx + 14} y={Yc(0.5) - 2} anchor="start" size={11} fill={PURP}>circular ↺</Txt><Txt x={tx + 14} y={Yc(-0.5) + 14} anchor="start" size={11} fill={PURP}>circular ↻</Txt>
        {second && <><Txt x={tx + 14} y={Yc(0) - 10} anchor="start" size={11} fill={SOFT}>linear beams</Txt><Txt x={tx + 14} y={Yc(0) + 20} anchor="start" size={11} fill={SOFT}>and noise</Txt></>}
        {withC.map((b, i) => { const s3 = Room.stokesOf(b.q).s3; return (<g key={b.slot}><circle cx={tx + 20 + (i % 4) * 14} cy={Yc(s3)} r="6" fill={col(b)} stroke="#FFFFFF" strokeWidth={1.25} />{Math.abs(s3) > 0.25 && <text x={tx + 20 + (i % 4) * 14} y={Yc(s3) - 10} textAnchor="middle" fontSize="12">{b.tag}</text>}</g>); })}
        {!second && <Txt x={tx} y={Yc(-0.5) + 42} size={12} fill={SOFT}>— not asked yet —</Txt>}
        <Txt x={450} y={512} size={13} fill={INK}>{cap}</Txt>
      </svg>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 6, alignItems: "center" }}>
        <CollectButton />
        <Button active={second} onClick={() => room.publish({ question: second ? 45 : "C" }, true)}>{second ? "second glass in" : "add a second glass"}</Button>
      </div>
    </div>
  );
}

// ── SCENE 16 : the ball — the disk, with every beam's third number, swings out of its plane (Poincaré 1892) ──
function FigBallRoom() {
  const room = Room.usePresenter();
  const wrap = useRef(null);
  const enter = useSlideEnter(wrap);
  const [wantTilt, setWantTilt] = useState(false);
  const [tilt, setTilt] = useState(0);                                     // 0 the disk face-on … 1 the ball
  useEffect(() => { setWantTilt(false); setTilt(0); }, [enter]);
  useEffect(() => {
    const from = tilt, to = wantTilt ? 1 : 0; if (from === to) return;
    const t0 = performance.now(), D = 1800 * Math.abs(to - from); let id;
    const step = (t) => { const u = Math.min(1, (t - t0) / D); setTilt(from + (to - from) * u); if (u < 1) id = requestAnimationFrame(step); };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [wantTilt]);
  useEffect(() => { room.publish({ tilted: wantTilt }, true); }, [wantTilt]);
  const view0 = room.state.view || { az: -35, el: 22 };
  const ease = tilt * tilt * (3 - 2 * tilt);
  const view = { az: view0.az * ease, el: -90 + (view0.el + 90) * ease };  // el −90: the disk seen face-on (0° across, 45° up)
  const bs = beamsOf(room).filter((b) => hasQ(b, 0) && hasQ(b, 45));
  const nUp = bs.filter((b) => hasQ(b, "C")).length;
  const th = room.state.theta ?? 45, de = room.state.delta ?? 0;
  const demo = Room.stokes(th, de);
  const cx = 450, cy = 262, R = 210;
  const col = (b) => (b.noise > 0.05 ? SOFT : GOLD);
  const cap = tilt < 0.5 ? (nUp ? `${nUp} beam${nUp > 1 ? "s" : ""} carry a third number the disk cannot show — tilt it` : "lamplight and the glass-light sit on one point — every striped sheet reads 50% from both. Tilt the disk")
    : "pure beams on the surface, mixtures inside · Bernoulli ball = Poincaré sphere (1892) = Bloch ball (1946)";
  // the three reference lights: lamplight (a mixture, the centre) and the glass-light with its twin (pure, the poles) — one point face-on, three once tilted
  const refs = [{ s: { s1: 0, s2: 0, s3: 0 }, fill: SOFT, lb: "lamplight · inside" }, { s: { s1: 0, s2: 0, s3: 0.5 }, fill: GOLD, lb: "after the glass · on the surface" }, { s: { s1: 0, s2: 0, s3: -0.5 }, fill: GOLD, lb: "after the reversed glass" }];
  const sep = Math.max(0, (tilt - 0.35) / 0.65);
  return (
    <div ref={wrap}>
      <svg viewBox="0 0 900 520" style={svgStyle}>
        <Txt x={cx} y={34} size={15} fill={INK} bold>{tilt < 0.5 ? "the disk · across: the 0° sheet, up: the 45° sheet · the third number points at you" : "three questions, three numbers, one ball"}</Txt>
        <Ball cx={cx} cy={cy} R={R} view={view} axes={tilt > 0.03}>{(P) => (<>
          {tilt > 0.5 && <polyline points={Array.from({ length: 73 }, (_, i) => { const q = P(Room.stokes(th, (i / 72) * 360)); return `${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join(" ")} fill="none" stroke={PURP} strokeWidth="1.5" strokeDasharray="6 4" opacity={(tilt - 0.5) * 1.4} />}
          {bs.map((b) => { const st = Room.stokesOf(b.q); const s3 = st.s3 === null ? 0 : st.s3; const q = P({ s1: st.s1, s2: st.s2, s3 }), f = P({ s1: st.s1, s2: st.s2, s3: 0 });
            return (<g key={b.slot} opacity={q.depth < 0 ? 0.45 : 1}>
              {Math.abs(s3) > 0.08 && <line x1={f.x} y1={f.y} x2={q.x} y2={q.y} stroke={PURP} strokeWidth="1.5" strokeDasharray="4 3" />}
              <circle cx={q.x} cy={q.y} r="8" fill={col(b)} stroke="#FFFFFF" strokeWidth={1.5} /><text x={q.x} y={q.y - 12} textAnchor="middle" fontSize="15">{b.tag}</text>
            </g>); })}
          {refs.map((r, i) => { const q = P(r.s), c = P({ s1: 0, s2: 0, s3: 0 }); return (<g key={i} opacity={i === 0 || sep > 0 ? 1 : 0}>
            {i > 0 && sep > 0.2 && <line x1={c.x} y1={c.y} x2={q.x} y2={q.y} stroke={GOLD} strokeWidth="1.5" strokeDasharray="4 3" opacity={sep} />}
            <circle cx={q.x} cy={q.y} r={i === 0 ? 11 : 9} fill={r.fill} stroke="#FFFFFF" strokeWidth={2} />
          </g>); })}
          {tilt > 0.5 && (() => { const q = P(demo); return (<g opacity={(tilt - 0.5) * 2}><line x1={cx} y1={cy} x2={q.x} y2={q.y} stroke={PURP} strokeWidth="3" /><circle cx={q.x} cy={q.y} r="11" fill={PURP} stroke="#FFFFFF" strokeWidth={2.25} /></g>); })()}
        </>)}</Ball>
        <Txt x={cx} y={505} size={13} fill={INK}>{cap}</Txt>
        <g transform="translate(24 54)">
          <rect x="0" y="0" width="212" height={tilt > 0.5 ? 150 : 118} rx="8" fill="#FFFFFF" stroke={LBLUE} strokeWidth="1.5" opacity="0.96" />
          <Txt x={14} y={22} anchor="start" size={12} fill={SOFT} bold>{tilt < 0.35 ? "ONE POINT, THREE LIGHTS" : "THREE LIGHTS"}</Txt>
          {[["lamplight · inside", SOFT, 11], ["glass · top pole", GOLD, 9], ["reversed glass · bottom", GOLD, 9]].map(([lb, fill, r], i) => (<g key={i}>
            <circle cx={22} cy={46 + i * 24} r={r} fill={fill} stroke="#FFFFFF" strokeWidth={2} />
            <Txt x={40} y={50 + i * 24} anchor="start" size={11} fill={INK}>{lb}</Txt>
          </g>))}
          {tilt > 0.5 && <g><circle cx={22} cy={118} r="9" fill={PURP} stroke="#FFFFFF" strokeWidth={2} /><Txt x={40} y={122} anchor="start" size={11} fill={INK}>demo beam · θ, delay</Txt></g>}
          {tilt > 0.5 && <g><line x1={14} y1={138} x2={30} y2={138} stroke={GOLD} strokeWidth="1.5" strokeDasharray="4 3" /><Txt x={40} y={142} anchor="start" size={11} fill={INK}>third number · up / down</Txt></g>}
        </g>
      </svg>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
        <Button onClick={() => setWantTilt((v) => !v)}>{wantTilt ? "lay the disk flat" : "tilt the disk"}</Button>
        {tilt > 0.5 && <><span style={{ fontFamily: MONO, fontSize: 13, color: SOFT }}>θ</span><input type="range" min="0" max="180" step="1" value={th} onChange={(e) => room.publish({ theta: parseInt(e.target.value) })} style={{ width: 150, accentColor: GOLD }} />
        <span style={{ fontFamily: MONO, fontSize: 13, color: SOFT }}>delay</span><input type="range" min="0" max="360" step="5" value={de} onChange={(e) => room.publish({ delta: parseInt(e.target.value) })} style={{ width: 150, accentColor: PURP }} />
        <span style={{ fontFamily: MONO, fontSize: 13, color: SOFT }}>turn</span><input type="range" min="-180" max="180" step="5" value={view0.az} onChange={(e) => room.publish({ view: { ...view0, az: parseInt(e.target.value) } })} style={{ width: 110, accentColor: INK }} />
        <span style={{ fontFamily: MONO, fontSize: 13, color: SOFT }}>tilt</span><input type="range" min="-80" max="80" step="5" value={view0.el} onChange={(e) => room.publish({ view: { ...view0, el: parseInt(e.target.value) } })} style={{ width: 110, accentColor: INK }} /></>}
      </div>
    </div>
  );
}

// ── SCENE 16 (rounds on the ball) : replay the three rounds with three questions — 0° sheet, 45° sheet, reversed glass + 45° sheet — and tilt the disk to see where each path really went ──
const SEALED = [[20, 60], [70, 300], [40, 120], [110, 240], [55, 50], [135, 110], [70, 230], [160, 310], [30, 250], [115, 70], [125, 320], [60, 150]].map(([th, de]) => ({ th, de }));   // twelve sealed secrets spread over the whole ball — every one has a height, so every shadow lands short of the rim
const sealedOf = (slot) => SEALED[((slot - 1) % SEALED.length + SEALED.length) % SEALED.length];   // like Room.secrets: derived from the seat, so the same seat always holds the same sealed beam
const BROUND = {
  fair:     { col: TEAL, name: "round A", short: "the fair beam", sub: "every seat: the same 45° beam", seat: () => ({ th: 45, de: 0 }), rec: "A" },
  mystery:  { col: PURP, name: "round B", short: "the mystery beam", sub: "every seat: H or V, unknown", seat: (slot) => ({ th: slot % 2 === 1 ? 0 : 90, de: 0 }), rec: "B" },   // odd seats H, even seats V — as in act II
  sealed:   { col: GOLD, name: "round C · sealed", short: "the secret beam, sealed", sub: "every seat: its own sealed beam", seat: (slot) => sealedOf(slot) },
  circular: { col: GOLD, name: "round C", short: "the circular beam", sub: "every seat: 45° + the glass", seat: () => ({ th: 45, de: 90 }) },
};
function FigBallRound({ round: roundProp = "fair" }) {
  const round = BROUND[roundProp] ? roundProp : "fair";
  const RD = BROUND[round];
  // the seats are the room's own: the roster that flipped the coins and fired the beams. Rounds A and B replay the 0° and 45° answers the room actually gave in act II; the glass question is new, so those photons are fresh. No room yet → twelve demo seats.
  const roomSt = Room.usePresenter();
  const roster = roomSt.state.roster || {};
  const liveSeats = Object.keys(roster).map((f) => ({ from: f, slot: roster[f].slot, tag: roster[f].tag })).sort((a, b) => a.slot - b.slot).slice(0, 24);
  const L0 = RD.rec ? roomSt.lightRound(RD.rec, "0") : null, L45 = RD.rec ? roomSt.lightRound(RD.rec, "45") : null;
  const recOf = (L, from) => { if (!L || !from) return null; const p = L.phones.find((q) => q.from === from); return p && p.n > 0 ? p.frac : null; };
  const seatDefs = (liveSeats.length >= 2 ? liveSeats : Array.from({ length: 12 }, (_, i) => ({ from: null, slot: i + 1, tag: String(i + 1) }))).map((s) => ({ ...s, rec: [recOf(L0, s.from), recOf(L45, s.from), null] }));
  const seatKey = JSON.stringify(seatDefs.map((s) => [s.slot, s.tag, s.rec]));
  const replayed = seatDefs.some((s) => s.rec[0] !== null || s.rec[1] !== null);
  const SEATS = seatDefs.length, PER = 90, N = 3 * PER;                        // 90 photons per seat and question, interleaved
  const paths = React.useMemo(() => {
    let s = 0x9e3779b9 ^ (round.length * 7919);
    const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const seats = seatDefs.map((sd) => {
      const { th, de } = RD.seat(sd.slot);
      const p = [Room.passProb(th, de, 0), Room.passProb(th, de, 45), Room.passProb(th, de, 'C')];   // the three questions' odds: 0° sheet · 45° sheet · reversed glass + 45° sheet
      // a question the seat already answered in act II replays that very fraction (its clicks reshuffled); the others draw fresh photons
      const seq = p.map((_, q) => { const r = sd.rec[q]; if (r === null) return null; const hits = Math.round(PER * r), arr = Array.from({ length: PER }, (_, j) => j < hits ? 1 : 0); for (let j = PER - 1; j > 0; j--) { const m = Math.floor(rnd() * (j + 1)); const t = arr[j]; arr[j] = arr[m]; arr[m] = t; } return arr; });
      const hit = [0, 0, 0], n = [0, 0, 0], pts = [];
      for (let k = 0; k < N; k++) { const q = k % 3, j = n[q]; n[q]++; hit[q] += seq[q] ? seq[q][j] : (rnd() < p[q] ? 1 : 0); let sv = k >= 2 ? { s1: hit[0] / n[0] - 0.5, s2: hit[1] / n[1] - 0.5, s3: hit[2] / n[2] - 0.5 } : null;
        if (sv) { const L = Math.hypot(sv.s1, sv.s2, sv.s3); if (L > 0.5) sv = { s1: sv.s1 * 0.5 / L, s2: sv.s2 * 0.5 / L, s3: sv.s3 * 0.5 / L }; }   // a running estimate can leave the ball; no light can
        pts.push(sv); }
      return { tag: sd.tag, pts };
    });
    const room = Array.from({ length: N }, (_, k) => k < 2 ? null : { s1: seats.reduce((a, q) => a + q.pts[k].s1, 0) / SEATS, s2: seats.reduce((a, q) => a + q.pts[k].s2, 0) / SEATS, s3: seats.reduce((a, q) => a + q.pts[k].s3, 0) / SEATS });
    const exact = seatDefs.reduce((a, sd) => { const { th, de } = RD.seat(sd.slot), sv = Room.stokes(th, de); return { s1: a.s1 + sv.s1 / SEATS, s2: a.s2 + sv.s2 / SEATS, s3: a.s3 + sv.s3 / SEATS }; }, { s1: 0, s2: 0, s3: 0 });   // where the room should land: the prediction
    return { seats, room, exact };
  }, [round, seatKey]);
  const wrap = useRef(null);
  const enter = useSlideEnter(wrap);
  const [k, setK] = useState(0), [playing, setPlaying] = useState(false);
  const kRef = useRef(0); kRef.current = k;
  const [wantTilt, setWantTilt] = useState(false), [tilt, setTilt] = useState(0);
  const [wantFull, setWantFull] = useState(false), [unf, setUnf] = useState(0);   // 0 the half-disk (bandwidth unsigned, lower points mirrored up) … 1 the full disk
  const [view0, setView0] = useState({ az: -35, el: 22 });
  useEffect(() => { setK(0); setPlaying(true); setWantTilt(false); setTilt(0); setWantFull(false); setUnf(0); }, [enter, round]);
  useEffect(() => {
    const from = unf, to = wantFull ? 1 : 0; if (from === to) return;
    const t0 = performance.now(), D = 1500 * Math.abs(to - from); let id;
    const step = (t) => { const u = Math.min(1, (t - t0) / D), e = u * u * (3 - 2 * u); setUnf(from + (to - from) * e); if (u < 1) id = requestAnimationFrame(step); };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [wantFull]);
  const F = (sv) => ({ s1: sv.s1, s2: sv.s2 < 0 ? -sv.s2 * Math.cos(Math.PI * unf) : sv.s2, s3: sv.s3 });   // a lower-half point swings about the floor as the disk unfolds
  useEffect(() => {
    if (!playing) return;
    let id; const t0 = performance.now(), k0 = kRef.current, D = 7000 * (1 - k0 / N);
    const step = (t) => { const u = Math.min(1, (t - t0) / D); setK(Math.round(k0 + (N - k0) * u)); if (u < 1) id = requestAnimationFrame(step); else setPlaying(false); };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [playing]);
  useEffect(() => {
    const from = tilt, to = wantTilt ? 1 : 0; if (from === to) return;
    const t0 = performance.now(), D = 1800 * Math.abs(to - from); let id;
    const step = (t) => { const u = Math.min(1, (t - t0) / D); setTilt(from + (to - from) * u); if (u < 1) id = requestAnimationFrame(step); };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [wantTilt]);
  useEffect(() => { const el = wrap.current && wrap.current.querySelector("svg"); if (el) el.style.overflow = "visible"; }, []);
  const ease = tilt * tilt * (3 - 2 * tilt);
  const view = { az: view0.az * ease, el: -90 + (view0.el + 90) * ease };
  const cx = 450, cy = 460 - 198 * unf, R = 320 - 110 * unf, col = RD.col;   // the half-disk sits large and low, as for the coins; it shrinks and rises as it unfolds, so the full disk and the ball fit the panel
  const upto = Math.min(k, N), live = upto >= N;
  const pl = (pts, P) => pts.slice(0, upto).filter(Boolean).map((sv) => { const q = P(F(sv)); return `${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join(" ");
  const last = (pts) => { for (let i = upto - 1; i >= 0; i--) if (pts[i]) return pts[i]; return null; };
  const qLabel = upto < N ? ["0° sheet", "45° sheet", "glass⁻¹ + 45° sheet"][upto % 3] : null;
  const flat = tilt < 0.5, folded = unf < 0.5;
  const capFolded = {
    fair: "fraction ½, bandwidth ½ — the top of the rim, where the fair coin went",
    mystery: "seats in the corners, the room at the centre of the floor — the mystery coin's place",
    sealed: "seats scattered inside the half-disk, short of the rim — not where a tilted sheet lands",
    circular: "fraction ½, bandwidth 0 — the centre of the floor, the mystery coin's place",
  }[round];
  const cap = folded ? capFolded : {
    fair:     flat ? "½ across, 1 up — the room climbs to the top of the rim, as the fair coin did" : "tilted: nothing lifts — a linear beam has no third number; pure, on the equator",
    mystery:  flat ? "1 or 0 across, ½ up — seats to the corners, the room pools at the centre" : "tilted: the room is still at the centre — inside the ball, a mixture",
    sealed:   flat ? "unfolded: every seat still inside — on the disk, each one looks like a small mystery room. Tilt the disk" : "tilted: every seat lifts to the surface — pure from the start. Only the room, not knowing which seat, stays inside",
    circular: flat ? "½ across, ½ up — every seat at the centre, where the mystery room pooled. Tilt the disk" : "tilted: the third question answers 1 — the room was at the pole all along; pure, on the surface",
  }[round];
  return (
    <div ref={wrap}>
      <svg viewBox="0 0 900 520" style={svgStyle}>
        {tilt < 0.5 && (() => { const KY = 34, BX = 620, SX = 800, R = 26, q = upto < N ? upto % 3 : 2, qa = [0, 45, 45][q]; return (<g transform="translate(0,-44)" opacity={1 - 2 * tilt}>
          <line x1={BX - 44} y1={KY} x2={SX + 36} y2={KY} stroke={LBLUE} strokeWidth="4" />
          {round === "mystery" ? <g><circle cx={BX} cy={KY} r={R} fill="#FFFFFF" stroke={col} strokeWidth={2} />{[0, 90].map((d) => <line key={d} x1={BX - 21 * Math.cos(d * DEG)} y1={KY + 21 * Math.sin(d * DEG)} x2={BX + 21 * Math.cos(d * DEG)} y2={KY - 21 * Math.sin(d * DEG)} stroke={col} strokeWidth={3.5} strokeLinecap="round" opacity={0.4} />)}<circle cx={BX} cy={KY} r={5} fill={col} /><rect x={BX - 52} y={KY + R + 8} width={104} height={20} rx={10} fill="#FFFFFF" stroke={col} strokeWidth={1.5} /><Txt x={BX} y={KY + R + 22} size={12} fill={col} bold>beam · H or V</Txt></g>
            : round === "sealed" ? <g><circle cx={BX} cy={KY} r={R} fill="#FDEFE3" stroke={col} strokeWidth={2} /><Txt x={BX} y={KY + 8} size={24} fill={col} bold>?</Txt><rect x={BX - 52} y={KY + R + 8} width={104} height={20} rx={10} fill="#FFFFFF" stroke={col} strokeWidth={1.5} /><Txt x={BX} y={KY + R + 22} size={12} fill={col} bold>beam · sealed</Txt></g>
            : <Knob x={BX} y={KY} r={R} a={45} color={col} tint="#FDEFE3" label={round === "circular" ? "beam · 45° · glass" : "beam · 45°"} />}
          <Knob x={SX} y={KY} r={R} a={qa} label={["sheet · 0°", "sheet · 45°", "glass⁻¹ + 45°"][q]} />
        </g>); })()}
        {tilt < 0.5 && (() => { const X = (p) => cx + (p - 0.5) * 2 * R, Y = (w) => cy - w * 2 * R, op = 1 - 2 * tilt; return (<g opacity={op}>
          <g opacity={1 - unf}><Txt x={X(0)} y={cy + 30} size={15} fill={INK} bold>no click · p = 0</Txt><Txt x={X(1)} y={cy + 30} size={15} fill={INK} bold>click · p = 1</Txt><Txt x={X(0.5)} y={cy + 30} size={15}>fair · p = ½</Txt></g>
          {unf > 0 && <g opacity={unf}><Txt x={X(0) - 14} y={cy + 5} anchor="end" size={14} fill={INK} bold>no click · p = 0</Txt><Txt x={X(1) + 14} y={cy + 5} anchor="start" size={14} fill={INK} bold>click · p = 1</Txt></g>}
          <line x1={X(0)} y1={cy} x2={X(0)} y2={Y(0.6)} stroke={INK} strokeWidth="2.25" opacity="0.5" />
          <Txt x={X(0) - 14} y={Y(0.5) + 6} anchor="end" size={14}>½</Txt><Txt x={X(0) - 14} y={Y(0.25) + 6} anchor="end" size={14}>¼</Txt>
          <g opacity={1 - unf}><Txt x={X(0.5)} y={Y(0.6) - 14} size={15}>bandwidth — the spread you expect</Txt></g>
          {unf > 0 && <g opacity={unf}><Txt x={X(0) + 10} y={Y(0.6) - 10} anchor="start" size={14}>bandwidth · the 45° sheet, minus ½</Txt></g>}
          {unf > 0.5 && <g opacity={2 * unf - 1}><line x1={X(0)} y1={cy} x2={X(0)} y2={Y(-0.6)} stroke={INK} strokeWidth="2.25" opacity="0.5" /><Txt x={X(0) - 14} y={Y(-0.5) + 6} anchor="end" size={14}>−½</Txt><Txt x={X(0) - 14} y={Y(-0.25) + 6} anchor="end" size={14}>−¼</Txt></g>}
        </g>); })()}
        <Ball cx={cx} cy={cy} R={R} view={view} axes={tilt > 0.03} lower={unf} dashed={tilt < 0.03}>{(P) => (<>
          {paths.seats.map((s, i) => { const l = last(s.pts); if (!l) return null; const q = P(F(l)); return (<g key={i} opacity={q.depth < 0 ? 0.5 : 1}>
            <polyline points={pl(s.pts, P)} fill="none" stroke={col} strokeWidth="1.25" opacity="0.22" strokeLinejoin="round" />
            <g opacity="0.45"><circle cx={q.x} cy={q.y} r={7 + Math.min(6, upto / 45)} fill={col} stroke="#FFFFFF" strokeWidth={1.5} /><text x={q.x} y={q.y + 5} textAnchor="middle" fontSize="15">{s.tag}</text></g>
          </g>); })}
          {(() => { const l = last(paths.room); if (!l) return null; const q = P(F(l)), c = P({ s1: 0, s2: 0, s3: 0 }); return (<g>
            <polyline points={pl(paths.room, P)} fill="none" stroke="#FFFFFF" strokeWidth="6" opacity="0.9" strokeLinejoin="round" strokeLinecap="round" />
            <polyline points={pl(paths.room, P)} fill="none" stroke={col} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            {tilt > 0.5 && Math.abs(l.s3) > 0.08 && <line x1={c.x} y1={c.y} x2={q.x} y2={q.y} stroke={PURP} strokeWidth="2" strokeDasharray="5 4" opacity={(tilt - 0.5) * 2} />}
            {tilt < 0.5 && Math.hypot(l.s1, F(l).s2) >= 0.05 && <line x1={c.x} y1={c.y} x2={q.x} y2={q.y} stroke={GOLD} strokeWidth={2.5} strokeLinecap="round" opacity={0.85 * (1 - 2 * tilt)} />}
            <circle cx={q.x} cy={q.y} r="12" fill={col} stroke="#FFFFFF" strokeWidth={2.25} />
            <Txt x={q.x} y={q.y < cy - R + 30 ? q.y + 30 : q.y - 20} size={14} fill={INK} bold>room</Txt>
          </g>); })()}
        </>)}</Ball>
        <Txt x={450} y={505} size={13} fill={INK}>{`${cap} · ${upto * SEATS} photons`}</Txt>
        <Txt x={24} y={30} anchor="start" size={12} fill={SOFT}>{liveSeats.length >= 2 ? (replayed ? `${SEATS} seats · the room's roster · 0° and 45°: the room's own photons from act II` : `${SEATS} seats · the room's roster`) : "12 demo seats · no room joined"}</Txt>
        {tilt > 0.5 && <g transform="translate(24 54)" opacity={2 * tilt - 1}>
          <rect x="0" y="0" width="212" height="96" rx="8" fill="#FFFFFF" stroke={LBLUE} strokeWidth="1.5" opacity="0.96" />
          <Txt x={14} y={22} anchor="start" size={12} fill={SOFT} bold>THREE QUESTIONS</Txt>
          {[["across · 0° sheet", GOLD], [folded ? "up · bandwidth, unsigned" : "up · 45° sheet", TEAL], [flat ? "at you · glass⁻¹ + 45°" : "poles · glass⁻¹ + 45°", PURP]].map(([lb, c], i) => (<g key={i}>
            <line x1={14} y1={46 + i * 22} x2={30} y2={46 + i * 22} stroke={c} strokeWidth="2.5" />
            <Txt x={40} y={50 + i * 22} anchor="start" size={11} fill={INK}>{lb}</Txt>
          </g>))}
        </g>}
      </svg>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 6, alignItems: "center", flexWrap: "wrap", minHeight: 42 }}>
        <Button ghost onClick={() => { if (live) { setK(0); } setPlaying((p) => (live ? true : !p)); }}>{playing ? "❙❙" : live ? "replay" : "▶"}</Button>
        {tilt < 0.03 && <Button ghost={wantFull} onClick={() => setWantFull((v) => !v)}>{wantFull ? "fold the disk" : "unfold the disk"}</Button>}
        {unf > 0.97 && <Button onClick={() => setWantTilt((v) => !v)}>{wantTilt ? "lay the disk flat" : "tilt the disk"}</Button>}
        {tilt > 0.5 && <><span style={{ fontFamily: MONO, fontSize: 13, color: SOFT }}>turn</span><input type="range" min="-180" max="180" step="5" value={view0.az} onChange={(e) => setView0({ ...view0, az: parseInt(e.target.value) })} style={{ width: 110, accentColor: INK }} />
        <span style={{ fontFamily: MONO, fontSize: 13, color: SOFT }}>tilt</span><input type="range" min="-80" max="80" step="5" value={view0.el} onChange={(e) => setView0({ ...view0, el: parseInt(e.target.value) })} style={{ width: 110, accentColor: INK }} /></>}
      </div>
    </div>
  );
}

// ═══════════════════════════ PART IV — CONCLUSION ═══════════════════════════
// ── SCENE 17 : one photon at a time — Mach–Zehnder with crowd photons ──
function FigMZRoom() {
  const room = Room.usePresenter();
  const phi = room.state.mzPhi ?? 0, src = room.state.mzSource || "amplitudes", rid = room.state.mzRound ?? 0, armed = !!room.state.armed;
  const R = room.rounds();
  const cur = R[rid];
  const list = Object.keys(R).map((k) => R[k]).sort((a, b) => a.round - b.round);
  const nPhones = Object.keys(room.state.roster || {}).length;
  const X0 = 520, X1 = 860, Y0 = 470, Y1 = 330;
  return (
    <div>
      <svg viewBox="0 0 900 520" style={svgStyle}>
        <Txt x={40} y={34} anchor="start" size={14} fill={INK} bold>{`interferometer · φ = ${phi}° · ${src === "mixture" ? "mixture" : "both routes"}`}</Txt>
        {/* schematic: source → half-mirror → two routes → half-mirror → D1 / D2 */}
        <circle cx={60} cy={200} r="18" fill="#FDEFE3" stroke={GOLD} strokeWidth="2.25" />
        <line x1={80} y1={200} x2={140} y2={200} stroke={LBLUE} strokeWidth="3.5" />
        <line x1={125} y1={215} x2={155} y2={185} stroke={INK} strokeWidth="3" />
        <path d="M 140 200 L 140 110 L 360 110 L 360 200" fill="none" stroke={src === "mixture" ? LBLUE : GOLD} strokeWidth="3.5" opacity="0.8" />
        <path d="M 140 200 L 140 290 L 360 290 L 360 200" fill="none" stroke={src === "mixture" ? LBLUE : TEAL} strokeWidth="3.5" opacity="0.8" />
        <rect x={230} y={270} width="60" height="40" rx="6" fill="#F2E8F5" stroke={PURP} strokeWidth="1.75" /><Txt x={260} y={296} size={13} fill={PURP} bold>{`φ`}</Txt>
        <line x1={345} y1={215} x2={375} y2={185} stroke={INK} strokeWidth="3" />
        <line x1={360} y1={200} x2={440} y2={200} stroke={LBLUE} strokeWidth="3.5" /><rect x={440} y={182} width="36" height="36" rx="6" fill="#FFFFFF" stroke={INK} strokeWidth="1.75" /><Txt x={458} y={240} size={13} fill={INK} bold>D1</Txt>
        <line x1={360} y1={200} x2={360} y2={40} stroke={LBLUE} strokeWidth="3.5" /><rect x={342} y={20} width="36" height="36" rx="6" fill="#FFFFFF" stroke={INK} strokeWidth="1.75" /><Txt x={400} y={45} size={13} fill={INK} bold>D2</Txt>
        <Txt x={260} y={340} size={13}>{src === "mixture" ? "each photon takes one route — we don't know which" : "amplitudes for both routes, added, then squared"}</Txt>
        {/* this round's clicks */}
        <Txt x={250} y={380} size={14} fill={INK} bold>{armed ? `round ${rid} · armed · ${cur ? cur.n : 0} of ${nPhones} participants pressed` : `round ${rid} · closed`}</Txt>
        {cur && cur.clicks.slice(-24).map((c, i) => (<g key={i}><circle cx={40 + (i % 12) * 36} cy={410 + Math.floor(i / 12) * 34} r="11" fill={c.detector === 1 ? GOLD : "#FFFFFF"} stroke="#FFFFFF" strokeWidth={1.5} /><text x={40 + (i % 12) * 36} y={415 + Math.floor(i / 12) * 34} textAnchor="middle" fontSize="12">{c.tag}</text></g>))}
        <Txt x={250} y={500} size={13}>{cur ? `D1: ${cur.d1} · D2: ${cur.n - cur.d1} · fraction to D1 = ${(cur.d1 / cur.n).toFixed(2)}` : "gold = D1, white = D2"}</Txt>
        {/* the fringe from the rounds */}
        <Txt x={(X0 + X1) / 2} y={300} size={14} fill={INK} bold>fraction to D1, round by round</Txt>
        <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke={INK} strokeWidth="1.5" /><line x1={X0} y1={Y0} x2={X0} y2={Y1} stroke={INK} strokeWidth="1.5" />
        <Txt x={X0} y={Y0 + 18} size={11}>0°</Txt><Txt x={(X0 + X1) / 2} y={Y0 + 18} size={11}>180°</Txt><Txt x={X1} y={Y0 + 18} size={11}>360°</Txt><Txt x={X0 - 8} y={Y1 + 4} anchor="end" size={11}>1</Txt><Txt x={X0 - 8} y={Y0 + 4} anchor="end" size={11}>0</Txt>
        <polyline points={Array.from({ length: 73 }, (_, i) => `${X0 + (i / 72) * (X1 - X0)},${Y0 - Room.mzP1((i / 72) * 360) * (Y0 - Y1)}`).join(" ")} fill="none" stroke={GOLD} strokeWidth="1.5" strokeDasharray="6 4" opacity="0.6" />
        <line x1={X0} y1={Y0 - 0.5 * (Y0 - Y1)} x2={X1} y2={Y0 - 0.5 * (Y0 - Y1)} stroke={LBLUE} strokeWidth="1.5" strokeDasharray="6 4" />
        {list.map((r) => (<g key={r.round}><circle cx={X0 + (r.phi / 360) * (X1 - X0)} cy={Y0 - (r.d1 / r.n) * (Y0 - Y1)} r={7 + Math.min(6, r.n / 4)} fill={r.source === "mixture" ? SOFT : GOLD} stroke="#FFFFFF" strokeWidth={1.75} opacity="0.9" /><Txt x={X0 + (r.phi / 360) * (X1 - X0)} y={Y0 - (r.d1 / r.n) * (Y0 - Y1) - 16} size={11}>{`#${r.round}`}</Txt></g>))}
        <Txt x={(X0 + X1) / 2} y={505} size={12}>gold dots: both-routes source · grey: mixture · dashed: cos²(φ/2) and ½</Txt>
      </svg>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
        {[0, 90, 180, 270].map((a) => <Button key={a} ghost={phi !== a} onClick={() => room.publish({ mzPhi: a }, true)}>{`φ = ${a}°`}</Button>)}
        <Button ghost onClick={() => room.publish({ mzSource: src === "mixture" ? "amplitudes" : "mixture" }, true)}>{src === "mixture" ? "source: mixture → both routes" : "source: both routes → mixture"}</Button>
        <Button active={armed} onClick={() => armed ? room.publish({ armed: false }, true) : room.publish({ armed: true, mzRound: rid + 1 }, true)}>{armed ? "close the round" : "arm a new round"}</Button>
      </div>
    </div>
  );
}

// ── SCENE 18 : the receipt (presenter-only text slide; this figure is the ladder) ──
function FigReceiptRoom() {
  const rows = [["a coin, one question", "half a disk", "odds + bandwidth"], ["light, every sheet angle", "the disk", "+ a sign"], ["light, plus a delay", "the ball", "+ a third number"], ["ℝ → ℂ", "rebit → qubit", "Bernoulli = Poincaré = Bloch ball"]];
  const claims = ["№ 1 nature's rule is probabilistic", "№ 2 little quantities: add, then square", "№ 3 qubits live anywhere on the surface", "№ 4 parallelism + interference"];
  return (
    <svg viewBox="0 0 900 460" style={svgStyle}>
      {rows.map((r, i) => (<g key={i}>
        <rect x={40} y={40 + i * 70} width={820} height={54} rx="10" fill={i === 3 ? PEACH : "#FFFFFF"} stroke={LBLUE} strokeWidth="1.5" />
        <Txt x={60} y={74 + i * 70} anchor="start" size={14} fill={INK} bold>{r[0]}</Txt>
        <Txt x={450} y={74 + i * 70} size={16} fill={GOLD} bold>{r[1]}</Txt>
        <Txt x={840} y={74 + i * 70} anchor="end" size={14}>{r[2]}</Txt>
      </g>))}
      {claims.map((c, i) => (<g key={i}>
        <circle cx={70} cy={350 + i * 28} r="9" fill={GOLD} stroke="#FFFFFF" strokeWidth={1.5} />
        <Txt x={92} y={355 + i * 28} anchor="start" size={14} fill={INK}>{c + " — redeemed"}</Txt>
      </g>))}
    </svg>
  );
}

// ── SCENE 19 : the room decoheres — each phone adds a random delay; the average shrinks to the axis ──
function FigDecohereRoom() {
  const room = Room.usePresenter();
  const view = room.state.view || { az: -35, el: 22 };
  const th = room.state.theta ?? 45, de = room.state.delta ?? 0;
  const ns = room.noises();
  const pure = Room.stokes(th, de);
  const pts = ns.map((n) => ({ ...n, sv: Room.stokes(th, de + n.delta) }));
  const avg = pts.length ? { s1: pts.reduce((a, p) => a + p.sv.s1, 0) / pts.length, s2: pts.reduce((a, p) => a + p.sv.s2, 0) / pts.length, s3: pts.reduce((a, p) => a + p.sv.s3, 0) / pts.length } : null;
  const len = avg ? Math.hypot(avg.s1, avg.s2, avg.s3) : 0.5;
  return (
    <div>
      <svg viewBox="0 0 900 520" style={svgStyle}>
        <Txt x={450} y={34} size={15} fill={INK} bold>{`the presenter's pure beam (θ = ${th}°) · ${ns.length} participants have added noise`}</Txt>
        <Ball cx={450} cy={270} R={210} view={view}>{(P) => (<>
          {pts.map((p) => { const q = P(p.sv); return <circle key={p.slot} cx={q.x} cy={q.y} r="6" fill={SOFT} opacity={q.depth < 0 ? 0.3 : 0.6} />; })}
          {(() => { const q = P(pure); return <g opacity="0.5"><line x1={450} y1={270} x2={q.x} y2={q.y} stroke={PURP} strokeWidth="2.25" strokeDasharray="6 4" /><circle cx={q.x} cy={q.y} r="9" fill="none" stroke={PURP} strokeWidth="1.75" /></g>; })()}
          {avg && (() => { const q = P(avg); return <g><line x1={450} y1={270} x2={q.x} y2={q.y} stroke={RED} strokeWidth="3.5" /><circle cx={q.x} cy={q.y} r="12" fill={RED} stroke="#FFFFFF" strokeWidth={2.25} /></g>; })()}
        </>)}</Ball>
        <Txt x={450} y={505} size={14}>{avg ? `the room's average pointer has length ${(len * 2).toFixed(2)} (pure = 1.00) — it is sinking toward the axis` : "participants: press ‘add my noise’"}</Txt>
      </svg>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 6, alignItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 13, color: SOFT }}>θ</span><input type="range" min="0" max="180" step="1" value={th} onChange={(e) => room.publish({ theta: parseInt(e.target.value) })} style={{ width: 200, accentColor: GOLD }} />
        <CollectButton />
        <Button ghost onClick={() => room.publish({ noiseReset: (room.state.noiseReset || 0) + 1 }, true)}>clear the noise</Button>
      </div>
    </div>
  );
}

/* FigBlendRoom — mixing beliefs: two candidate coins on the rim, the blend slides the chord.
   Drag either candidate along the rim; drag the blend dot (or use the buttons) to set the weight. */
function FigBlendRoom() {
  const { useState } = React;
  const room = Room.usePresenter();
  const [showRoom, setShowRoom] = useState(false);
  const [p1, setP1] = useState(1);
  const [p2, setP2] = useState(0);
  const [w, setW] = useState(0.5);
  const x0 = 130, x1 = 770, y0 = 430, RX = (x1 - x0) / 2;
  const X = (p) => x0 + p * (x1 - x0), Y = (s) => y0 - s * (x1 - x0);
  const sg = (p) => Math.sqrt(Math.max(0, p * (1 - p)));
  const A = { x: X(p1), y: Y(sg(p1)) }, B = { x: X(p2), y: Y(sg(p2)) };
  const M = { x: w * A.x + (1 - w) * B.x, y: w * A.y + (1 - w) * B.y };
  const avg = w * p1 + (1 - w) * p2, spread = (y0 - M.y) / (x1 - x0);
  const roster = room.state.roster || {};
  const pure = Object.values(roster).map((m) => Room.secrets(m.slot).bias);
  const mix = pure.length ? {
    x: pure.reduce((a, q) => a + X(q), 0) / pure.length,
    y: pure.reduce((a, q) => a + Y(sg(q)), 0) / pure.length,
    p: pure.reduce((a, q) => a + q, 0) / pure.length,
  } : null;
  const svgPt = (e) => {
    const r = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 900, y: ((e.clientY - r.top) / r.height) * 520 };
  };
  const dragRim = (set) => (e) => {
    const svg = e.currentTarget.ownerSVGElement;
    const move = (ev) => {
      const r = svg.getBoundingClientRect();
      const mx = ((ev.clientX - r.left) / r.width) * 900, my = ((ev.clientY - r.top) / r.height) * 520;
      const ang = Math.atan2(y0 - my, mx - X(0.5));                   // 0 at always-H, π at always-T
      const q = 0.5 + 0.5 * Math.cos(Math.min(Math.PI, Math.max(0, ang)));
      set(Math.min(1, Math.max(0, Math.round(q * 100) / 100)));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); swallowClick(); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); e.preventDefault();
  };
  const dragChord = (e) => {
    const svg = e.currentTarget.ownerSVGElement;
    const move = (ev) => {
      const r = svg.getBoundingClientRect();
      const q = { x: ((ev.clientX - r.left) / r.width) * 900, y: ((ev.clientY - r.top) / r.height) * 520 };
      const dx = A.x - B.x, dy = A.y - B.y, L2 = dx * dx + dy * dy || 1;
      const t = ((q.x - B.x) * dx + (q.y - B.y) * dy) / L2;
      setW(Math.min(1, Math.max(0, Math.round(t * 100) / 100)));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); swallowClick(); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); e.preventDefault();
  };
  const rimPath = (() => { let s = ""; for (let i = 0; i <= 72; i++) { const p = i / 72; s += (i ? " L " : "M ") + X(p).toFixed(1) + " " + Y(sg(p)).toFixed(1); } return s; })();
  return (
    <div>
      <svg viewBox="0 0 900 520" style={svgStyle}>
        <path d={rimPath + ` L ${x1} ${y0} Z`} fill={PEACH} opacity={0.45} />
        <path d={rimPath} fill="none" stroke={GOLD} strokeWidth={2.5} strokeDasharray="9 8" />
        <line x1={x0 - 40} y1={y0} x2={x1 + 40} y2={y0} stroke={INK} strokeWidth={2.25} />
        <circle cx={x0} cy={y0} r={6} fill={INK} /><circle cx={x1} cy={y0} r={6} fill={INK} />
        <Txt x={x0} y={y0 + 30} size={14}>always T</Txt>
        <Txt x={x1} y={y0 + 30} size={14}>always H</Txt>
        <circle cx={X(0.5)} cy={y0} r={5} fill={SOFT} />
        <Txt x={X(0.5)} y={y0 + 30} size={13}>mystery coin</Txt>
        {!showRoom && <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={SOFT} strokeWidth={1.5} strokeDasharray="5 5" />}
        {showRoom && mix && pure.map((q, i) => <line key={"l" + i} x1={X(q)} y1={Y(sg(q))} x2={mix.x} y2={mix.y} stroke={PURP} strokeWidth={1} opacity={0.22} />)}
        {showRoom && pure.map((q, i) => <circle key={"d" + i} cx={X(q)} cy={Y(sg(q))} r={5} fill={PURP} stroke="#FFFFFF" strokeWidth={1.5} />)}
        {showRoom && mix && (<g>
          <circle cx={mix.x} cy={mix.y} r={13} fill={PURP} stroke="#FFFFFF" strokeWidth={2.5} />
          <Txt x={mix.x} y={mix.y + 36} size={14} fill={PURP} bold>the room's shared belief</Txt>
        </g>)}
        {showRoom && !pure.length && <Txt x={450} y={150} size={14} fill={SOFT}>no participants yet — join with the QR code or the SIM pill</Txt>}
        {!showRoom && (<g>
        <g style={{ cursor: "grab" }} onPointerDown={dragRim(setP1)}>
          <circle cx={A.x} cy={A.y} r={26} fill="rgba(0,0,0,0)" />
          <circle cx={A.x} cy={A.y} r={11} fill={TEAL} stroke="#FFFFFF" strokeWidth={2.25} />
        </g>
        <Txt x={A.x} y={A.y - 24} size={14} fill={TEAL} bold>{`candidate 1 · q₁ = ${p1.toFixed(2)}`}</Txt>
        <g style={{ cursor: "grab" }} onPointerDown={dragRim(setP2)}>
          <circle cx={B.x} cy={B.y} r={26} fill="rgba(0,0,0,0)" />
          <circle cx={B.x} cy={B.y} r={11} fill={RED} stroke="#FFFFFF" strokeWidth={2.25} />
        </g>
        <Txt x={B.x} y={B.y - 24} size={14} fill={RED} bold>{`candidate 2 · q₂ = ${p2.toFixed(2)}`}</Txt>
        <g style={{ cursor: "grab" }} onPointerDown={dragChord}>
          <circle cx={M.x} cy={M.y} r={28} fill="rgba(0,0,0,0)" />
          <circle cx={M.x} cy={M.y} r={13} fill={GOLD} stroke="#FFFFFF" strokeWidth={2.5} />
        </g>
        <Txt x={M.x} y={M.y + 34} size={14} fill={GOLD} bold>your blend (drag it)</Txt>
        </g>)}
        <Txt x={450} y={505} size={15} fill={INK}>{showRoom && mix ? `${pure.length} pure beliefs on the rim · avg ${mix.p.toFixed(2)}` : `weight ${w.toFixed(2)} · average ${avg.toFixed(2)} · spread ${spread.toFixed(2)}`}</Txt>
      </svg>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 6, flexWrap: "wrap" }}>
        {!showRoom && [0, 0.25, 0.5, 0.75, 1].map((v) => <Button key={v} ghost={w !== v} onClick={() => setW(v)}>{`w = ${v}`}</Button>)}
        <Button ghost={!showRoom} onClick={() => setShowRoom(!showRoom)}>{showRoom ? "back to two candidates" : "show the room"}</Button>
        {!showRoom && <Button ghost onClick={() => { setP1(0.85); setP2(0.25); setW(0.5); }}>reset</Button>}
      </div>
    </div>
  );
}

/* FigWaveRoom — the wave in space: two side-on wiggles + drag-to-turn 3D (port of the original FigWave3D). */
function FigWaveRoom() {
  const [st, setSt] = useState({ beta: 30, delta: 0, run: true, yaw: 64, pitch: 16, mode: "wiggles" });
  const [t, setT] = useState(0);
  const stRef = useRef(st); stRef.current = st;
  const tgt = useRef(null), drag = useRef(null);
  useEffect(() => {
    let id;
    const loop = () => {
      if (stRef.current.run) setT((x) => x + 0.045);
      if (tgt.current) {
        const g = tgt.current, v = stRef.current;
        const ny = v.yaw + (g.yaw - v.yaw) * 0.14, np = v.pitch + (g.pitch - v.pitch) * 0.14;
        if (Math.abs(g.yaw - ny) < 0.25 && Math.abs(g.pitch - np) < 0.25) { tgt.current = null; setSt((s) => ({ ...s, yaw: g.yaw, pitch: g.pitch })); }
        else setSt((s) => ({ ...s, yaw: ny, pitch: np }));
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);
  const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const onDown = (e) => { if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId); tgt.current = null; drag.current = { x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch }; };
  const onMove = (e) => { if (!drag.current) return; const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y; setSt((s) => ({ ...s, yaw: cl(drag.current.yaw - dx * 0.35, -6, 100), pitch: cl(drag.current.pitch + dy * 0.35, -22, 22) })); };
  const onUp = (e) => { if (drag.current && e && Math.hypot(e.clientX - drag.current.x, e.clientY - drag.current.y) > 2) swallowClick(); drag.current = null; };
  const br = st.beta * DEG, a = Math.cos(br), b = Math.sin(br), d = st.delta * DEG;
  const tipH = (tt) => a * Math.sin(tt), tipV = (tt) => b * Math.sin(tt - d);
  const ux = a, uy = b * Math.cos(d);
  const N2 = 44, x0 = 25, x1 = 875, yH = 130, yV = 330, amp = 70;
  const pts = (A, ph) => Array.from({ length: N2 + 1 }, (_, i) => { const x = x0 + (i * (x1 - x0)) / N2; return x.toFixed(1) + "," + (-A * amp * Math.sin(i * 0.32 - t + ph)).toFixed(1); }).join(" ");
  const ps = st.yaw * DEG, phv = st.pitch * DEG;
  const cps = Math.cos(ps), sps = Math.sin(ps), cph = Math.cos(phv), sph = Math.sin(phv);
  const cx = 450, cyy = 235, S = 140;
  const proj = (x, y, z) => { const px = x * cps + z * sps, z1 = -x * sps + z * cps; return [cx + S * px, cyy - S * (y * cph - z1 * sph)]; };
  const L = 3.04, A3 = 0.62, N3 = 72, KW = 0.32 * S / ((x1 - x0) / N2), C0 = 0.32 * (cx - x0) / ((x1 - x0) / N2);
  const zs = Array.from({ length: N3 + 1 }, (_, i) => -L + (2 * L * i) / N3);
  const Ex = (z, tt) => A3 * tipH(tt - (KW * z + C0)), Ey = (z, tt) => A3 * tipV(tt - (KW * z + C0));
  const pl = (fn) => zs.map((z) => { const q = fn(z); return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" ");
  const hPts = pl((z) => proj(Ex(z, t), 0, z));
  const vPts = pl((z) => proj(0, Ey(z, t), z));
  const sPts = pl((z) => proj(Ex(z, t), Ey(z, t), z));
  const stems = zs.filter((_, i) => i % 6 === 0).map((z, i) => {
    const qa = proj(0, 0, z), qh = proj(Ex(z, t), 0, z), qv = proj(0, Ey(z, t), z), q2 = proj(Ex(z, t), Ey(z, t), z);
    return (
      <g key={"s" + i}>
        <line x1={qa[0]} y1={qa[1]} x2={qh[0]} y2={qh[1]} stroke={GOLD} strokeWidth={1.6} strokeDasharray="3 5" opacity={0.5} />
        <line x1={qa[0]} y1={qa[1]} x2={qv[0]} y2={qv[1]} stroke={TEAL} strokeWidth={1.6} strokeDasharray="3 5" opacity={0.5} />
        <line x1={qa[0]} y1={qa[1]} x2={q2[0]} y2={q2[1]} stroke={INK} strokeWidth={1.6} opacity={0.13} />
      </g>
    );
  });
  const hs = 0.8;
  const sq = [[-hs, -hs], [hs, -hs], [hs, hs], [-hs, hs]].map((c) => proj(c[0], c[1], -L).map((v) => v.toFixed(1)).join(",")).join(" ");
  const hoF = Math.max(0, 1 - Math.abs(st.yaw) / 26) * Math.max(0, 1 - Math.abs(st.pitch) / 26);
  const cr1 = [proj(-hs, 0, -L), proj(hs, 0, -L)], cr2 = [proj(0, -hs, -L), proj(0, hs, -L)];
  const uc = Array.from({ length: 49 }, (_, i) => { const th2 = (2 * Math.PI * i) / 48; return proj(A3 * Math.cos(th2), A3 * Math.sin(th2), -L).map((v) => v.toFixed(1)).join(","); }).join(" ");
  const trail3 = Array.from({ length: 30 }, (_, kk) => { const tt = t - kk * 0.13; const q = proj(Ex(-L, tt), Ey(-L, tt), -L); return [q[0], q[1], 1 - kk / 32]; });
  const axA = proj(0, 0, -L), axB = proj(0, 0, L);
  const tipQ = proj(A3 * ux, A3 * uy, -L);
  return (
    <div style={{ width: "100%" }}>
      {st.mode === "wiggles" ? (
      <svg viewBox="0 0 900 470" style={svgStyle}>
        <line x1={x0} y1={yH} x2={x1} y2={yH} stroke={LBLUE} strokeWidth={1} />
        <line x1={x0} y1={yV} x2={x1} y2={yV} stroke={LBLUE} strokeWidth={1} />
        <g transform={"translate(0 " + yH + ")"}><polyline points={pts(a, Math.PI)} fill="none" stroke={GOLD} strokeWidth={4} strokeLinejoin="round" /></g>
        <g transform={"translate(0 " + yV + ")"}><polyline points={pts(b, Math.PI + d)} fill="none" stroke={TEAL} strokeWidth={4} strokeLinejoin="round" /></g>
        <Txt x={x0} y={34} anchor="start" size={16} fill={GOLD} bold>{"H wiggle · size a = " + a.toFixed(2)}</Txt>
        <Txt x={x0} y={232} anchor="start" size={16} fill={TEAL} bold>{"V wiggle · size b = " + (st.delta === 180 ? "\u2212" : "+") + b.toFixed(2)}</Txt>
        <Txt x={x0} y={454} anchor="start" size={15}>the two wiggles, side-on · flying to the right →</Txt>
      </svg>
      ) : (
      <svg viewBox="0 0 900 470" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        style={{ width: "100%", display: "block", touchAction: "none", userSelect: "none", cursor: "grab" }}>
        <line x1={axA[0]} y1={axA[1]} x2={axB[0]} y2={axB[1]} stroke={LBLUE} strokeWidth={2} />
        <polygon points={sq} fill="none" stroke={LBLUE} strokeWidth={2.5} />
        <line x1={cr1[0][0]} y1={cr1[0][1]} x2={cr1[1][0]} y2={cr1[1][1]} stroke={GRID} strokeWidth={2} />
        <line x1={cr2[0][0]} y1={cr2[0][1]} x2={cr2[1][0]} y2={cr2[1][1]} stroke={GRID} strokeWidth={2} />
        <polygon points={uc} fill="none" stroke={GOLD} strokeWidth={1.6} strokeDasharray="4 6" opacity={0.4} />
        {stems}
        <polyline points={hPts} fill="none" stroke={GOLD} strokeWidth={3} strokeLinejoin="round" opacity={0.9} />
        <polyline points={vPts} fill="none" stroke={TEAL} strokeWidth={3} strokeLinejoin="round" opacity={0.9} />
        <polyline points={sPts} fill="none" stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />
        {hoF > 0.01 && (
          <g opacity={hoF}>
            <polygon points={sq} fill="#FFFFFF" fillOpacity={0.92} stroke={LBLUE} strokeWidth={2.5} />
            <line x1={cr1[0][0]} y1={cr1[0][1]} x2={cr1[1][0]} y2={cr1[1][1]} stroke={GRID} strokeWidth={2} />
            <line x1={cr2[0][0]} y1={cr2[0][1]} x2={cr2[1][0]} y2={cr2[1][1]} stroke={GRID} strokeWidth={2} />
            <polygon points={uc} fill="none" stroke={GOLD} strokeWidth={1.6} strokeDasharray="4 6" opacity={0.4} />
          </g>
        )}
        {trail3.map((q, kk) => (
          <circle key={kk} cx={q[0]} cy={q[1]} r={kk === 0 ? 8 : 3.8} fill={INK} opacity={kk === 0 ? 1 : 0.28 * q[2]} />
        ))}
        <circle cx={tipQ[0]} cy={tipQ[1]} r={5} fill="none" stroke={GOLD} strokeWidth={2.2} opacity={0.8} />
        <text x={25} y={30} fontFamily={MONO} fontSize="16">
          <tspan fill={INK}>in space — </tspan><tspan fill={GOLD}>H</tspan><tspan fill={INK}> + </tspan><tspan fill={TEAL}>V</tspan><tspan fill={INK}> = the wave (dark)</tspan>
        </text>
        <text x={25} y={454} fontFamily={MONO} fontSize="15" fill={SOFT}>drag to turn · framed square = the front view</text>
      </svg>
      )}
      <div style={{ width: "100%", marginTop: 10, boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
          <span style={{ fontFamily: MONO, fontSize: 15, color: SOFT }}>β — the wave's tilt (sets both wiggle sizes)</span>
          <span style={{ fontFamily: MONO, fontSize: 15, color: INK, fontWeight: 700 }}>{"β=" + Math.round(st.beta) + "° → a=" + a.toFixed(2) + ", b=" + (st.delta === 180 ? "\u2212" : "+") + b.toFixed(2)}</span>
        </div>
        <input type="range" min="0" max="90" step="1" value={st.beta} onChange={(e) => setSt((s) => ({ ...s, beta: +e.target.value }))} style={{ width: "100%", accentColor: GOLD, marginTop: 6 }} />
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
        <Button onClick={() => setSt((s) => ({ ...s, delta: s.delta === 0 ? 180 : 0 }))}>
          {st.delta === 0 ? "wiggles: in step → flip one" : "opposite step → put back"}
        </Button>
        <Button ghost onClick={() => setSt((s) => ({ ...s, run: !s.run }))}>{st.run ? "pause" : "play"}</Button>
        <Button ghost={st.mode !== "wiggles"} onClick={() => setSt((s) => ({ ...s, mode: "wiggles" }))}>the two wiggles</Button>
        <Button ghost onClick={() => { setSt((s) => ({ ...s, mode: "space" })); tgt.current = { yaw: 90, pitch: 22 }; }}>side view</Button>
        <Button ghost onClick={() => { setSt((s) => ({ ...s, mode: "space" })); tgt.current = { yaw: 64, pitch: 16 }; }}>3D view</Button>
        <Button ghost onClick={() => { setSt((s) => ({ ...s, mode: "space" })); tgt.current = { yaw: 0, pitch: 0 }; }}>look down the axis</Button>
      </div>
    </div>
  );
}

/* FigWaveRoom2 — slide 19 (v2): the same wave, with an optional linear sheet half-way along the axis.
   Before the sheet the wiggles are (a, ±b); the sheet at φ keeps only the projection k = a·cosφ ± b·sinφ and
   re-emits it along its own axis: (k·cosφ, k·sinφ). Brightness after = k². */
/* re-arms an animation whenever the slide that holds `ref` becomes the current slide (deck-stage fires 'slidechange') */
function useSlideEnter(ref, onFlip) {
  const [n, setN] = useState(0);
  const cb = useRef(onFlip); cb.current = onFlip;
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const stage = el.closest("deck-stage"); if (!stage) return;
    const mySlide = el.closest("section");
    const isCur = () => { const cur = stage.querySelectorAll("section")[stage.index ?? stage._index ?? -1]; return !!cur && cur === mySlide; };
    let was = isCur();
    const onChange = () => {
      const now = isCur();
      if (now !== was && cb.current) cb.current(now);         // synchronous: blank the figure before the newly shown slide paints
      if (now && !was) setN((k) => k + 1);
      was = now;
    };
    stage.addEventListener("slidechange", onChange);
    if (was) setN((k) => k + 1);
    return () => stage.removeEventListener("slidechange", onChange);
  }, []);
  return n;
}
/* run / pause for a slide: ▶ replays the paths (rev 0→1 over D ms) and then stays in run mode — live data keeps arriving —
   until ❙❙. Entering the slide (`enter`) re-arms it paused with nothing drawn; a change of `deps` (round, band) replays from 0
   without leaving run mode. The mode is published as state.collect: phones and bots only flip / fire while it is on. */
function useReplay(ready, enter, deps, onArm, D = 2200) {
  const [u, setU] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [arm, setArm] = useState(0);
  const uRef = useRef(0); uRef.current = u;
  const raf = useRef(0);
  const all = [enter, ...deps];
  React.useLayoutEffect(() => { cancelAnimationFrame(raf.current); setU(0); setArm((a) => a + 1); }, all);
  React.useLayoutEffect(() => { setPlaying(false); }, [enter]);
  useEffect(() => { if (onArm) onArm(); }, all);
  useEffect(() => {
    if (!playing || uRef.current >= 1) return;
    const t0 = performance.now() - uRef.current * D;
    const tick = (t) => { const v = Math.min(1, (t - t0) / D); setU(v); if (v < 1) raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, arm]);
  useEffect(() => { const p = Room.presenter && Room.presenter(); if (p && p.publish) p.publish({ collect: playing }, true); }, [playing]);
  const rev = !ready ? 1 : u < 1 ? u * u * (3 - 2 * u) : 1;
  return { rev, playing, toggle: () => setPlaying((p) => !p) };
}
/* the same ▶ / ❙❙ for slides that collect without a replay: toggles state.collect (every slide change resets it to off) */
function CollectButton() {
  const room = Room.usePresenter();
  const on = !!room.state.collect;
  return <Button ghost onClick={() => room.publish({ collect: !on }, true)}>{on ? "❙❙" : "▶"}</Button>;
}
/* a compact drop-down: one button, a list of options above it (click-away closes) */
function Menu({ label, value, items, onPick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { if (!open) return; const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener("pointerdown", h); return () => document.removeEventListener("pointerdown", h); }, [open]);
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <Button ghost onClick={() => setOpen((o) => !o)}>{label + (open ? " ▴" : " ▾")}</Button>
      {open && <div style={{ position: "absolute", left: 0, bottom: "calc(100% + 6px)", minWidth: "100%", background: "#FFFFFF", border: "1.5px solid #AFE0F7", borderRadius: 12, padding: 6, display: "flex", flexDirection: "column", gap: 2, zIndex: 30, boxShadow: "0 6px 18px rgba(0,33,87,0.12)", whiteSpace: "nowrap" }}>
        {items.map(([v, l]) => <button key={v} onClick={() => { onPick(v); setOpen(false); }} style={{ font: "inherit", fontFamily: MONO, fontSize: 14, textAlign: "left", padding: "6px 12px", border: "none", borderRadius: 8, cursor: "pointer", background: v === value ? GOLD : "transparent", color: v === value ? "#FFFFFF" : INK, fontWeight: v === value ? 700 : 500 }}>{l}</button>)}
      </div>}
    </div>
  );
}

function FigWaveRoom2({ preset }) {
  // synced with the sunglasses bench (previous slide): sheet 1's stripes set the wave's tilt β, sheet 2 is the inserted sheet φ
  const room = Room.usePresenter();
  // the bench slide mounts this same figure with preset="bench": open as the plain experiment — beam of light, sheet 1 horizontal, sheet 2 not yet inserted
  // re-open as the plain bench every time this slide is entered (not only on first mount) — sheet 2 out, sheet 1 horizontal
  const benchWrap = useRef(null);
  const benchEnter = useSlideEnter(benchWrap);
  // preset "lamp" (the scene-7 opener): the same bench with ONE sheet — the front sheet, turnable; nothing else on the board
  const solo = preset === "lamp";
  useEffect(() => { if (solo) room.publish({ lightMode: "beam", lens1: 0, lens2: 0, sheetIn: false, waveView: "side view" }, true); else if (preset === "bench") room.publish({ lightMode: "beam", lens1: 0, lens2: 0, sheetIn: true, waveView: "side view" }, true); setSt((s) => ({ ...s, run: false })); }, [benchEnter]);
  const beta = room.state.lens1 ?? 30, phi = room.state.lens2 ?? 0, sheetIn = room.state.sheetIn ?? true;
  const view0 = room.state.waveView ?? "wiggles", beamMode0 = (room.state.lightMode ?? "wave") === "beam", view = beamMode0 && view0 === "wiggles" ? "3D" : view0, mode = view === "wiggles" ? "wiggles" : "space";
  const light = room.state.lightMode ?? "wave";                       // "beam": the bench picture (beam + grains) · "wave": the two wiggles
  const beamMode = light === "beam";
  const [st, setSt] = useState({ delta: 0, run: false, yaw: 64, pitch: 16 });
  const first = useRef(true);
  useEffect(() => { const T = { "side view": { yaw: 90, pitch: 22 }, "3D": { yaw: 64, pitch: 16 }, "down the axis": { yaw: 0, pitch: 0 } }[view]; if (!T) return; if (first.current) { first.current = false; setSt((s) => ({ ...s, ...T })); return; } tgt.current = T; }, [view]);
  const [t, setT] = useState(0);
  const stRef = useRef(st); stRef.current = st;
  const tgt = useRef(null), drag = useRef(null);
  useEffect(() => {
    let id;
    const loop = () => {
      if (stRef.current.run) setT((x) => x + 0.045);
      if (tgt.current) {
        const g = tgt.current, v = stRef.current;
        const ny = v.yaw + (g.yaw - v.yaw) * 0.14, np = v.pitch + (g.pitch - v.pitch) * 0.14;
        if (Math.abs(g.yaw - ny) < 0.25 && Math.abs(g.pitch - np) < 0.25) { tgt.current = null; setSt((s) => ({ ...s, yaw: g.yaw, pitch: g.pitch })); }
        else setSt((s) => ({ ...s, yaw: ny, pitch: np }));
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);
  const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const onDown = (e) => { if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId); tgt.current = null; drag.current = { x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch }; };
  const onMove = (e) => { if (!drag.current) return; const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y; setSt((s) => ({ ...s, yaw: cl(drag.current.yaw - dx * 0.35, -6, 100), pitch: cl(drag.current.pitch + dy * 0.35, -22, 22) })); };
  const onUp = (e) => { if (drag.current && e && Math.hypot(e.clientX - drag.current.x, e.clientY - drag.current.y) > 2) swallowClick(); drag.current = null; };
  const br = beta * DEG, a = Math.cos(br), b = Math.sin(br), d = st.delta * DEG;
  const bS = b * Math.cos(d);                                         // signed V size (the flip switch)
  const on = sheetIn, ph = phi * DEG, cphi = Math.cos(ph), sphi = Math.sin(ph);
  const k = on ? a * cphi + bS * sphi : null;                         // amplitude that survives the sheet
  const a2 = on ? k * cphi : a, b2 = on ? k * sphi : bS;              // wiggle sizes after the sheet
  const bright = on ? k * k : 1;
  const N2 = 44, x0 = 25, x1 = 875, yH = 130, yV = 330, amp = 70, xm = (x0 + x1) / 2;
  // side-on wiggle: amplitude switches at the sheet (x = xm); the phase form is continuous
  const xsIn = Array.from({ length: N2 + 1 }, (_, i) => x0 + (i * (x1 - x0)) / N2);
  const xs2 = on ? [...xsIn.filter((x) => x < xm - 1e-3), xm - 1e-3, xm + 1e-3, ...xsIn.filter((x) => x > xm + 1e-3)] : xsIn;
  const ptsIn = (A1, A2, sel) => xs2.map((x) => ({ x, A: on && x > xm ? A2 : A1 })).filter((p) => sel(p.x)).map((p) => p.x.toFixed(1) + "," + (-p.A * amp * Math.sin(((p.x - x0) / (x1 - x0)) * N2 * 0.32 - t + Math.PI)).toFixed(1)).join(" ");
  const pts = (A1, A2) => ptsIn(A1, A2, () => true);
  const ps = st.yaw * DEG, phv = st.pitch * DEG;
  const cps = Math.cos(ps), sps = Math.sin(ps), cph = Math.cos(phv), sph = Math.sin(phv);
  const cx = 450, cyy = 235, S = 140;
  const proj = (x, y, z) => { const px = x * cps + z * sps, z1 = -x * sps + z * cps; return [cx + S * px, cyy - S * (y * cph - z1 * sph)]; };
  const L = 3.04, A3 = 0.62, N3 = 72, KW = 0.32 * S / ((x1 - x0) / N2), C0 = 0.32 * (cx - x0) / ((x1 - x0) / N2);
  const zs0 = Array.from({ length: N3 + 1 }, (_, i) => -L + (2 * L * i) / N3);
  // with the sheet in, sample both sides of z = 0 exactly so the curve switches AT the sheet, not on a slanted joint between two samples
  const ZF = -2 * L / 3;
  const ZS = (ZF + L) / 2;                                            // the sheet stands halfway between the front frame and the exit face                                              // the front frame: the wave picture starts here — before it, the lamp's plain beam (as on the bench slide)
  const zs1 = zs0.filter((z) => z >= ZF);
  const zs = on ? [ZF, ...zs1.filter((z) => z < ZS - 1e-6), ZS - 1e-6, ZS + 1e-6, ...zs1.filter((z) => z > ZS + 1e-6)] : [ZF, ...zs1];
  const wv = (z, tt) => Math.sin(tt - (KW * z + C0));
  const Ex = (z, tt) => A3 * (on && z > ZS ? a2 : a) * wv(z, tt), Ey = (z, tt) => A3 * (on && z > ZS ? b2 : bS) * wv(z, tt);
  const pl = (fn) => zs.map((z) => { const q = fn(z); return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" ");
  // occlusion by the sheet: a sample is hidden only when it lies behind the sheet (z < 0) AND its screen point falls inside the sheet's square
  const hsq = 0.8, sheetPoly = [[-hsq, -hsq], [hsq, -hsq], [hsq, hsq], [-hsq, hsq]].map((c) => proj(c[0], c[1], ZS));
  const inSheet = (q) => { let ins = false; for (let i = 0, j = 3; i < 4; j = i++) { const a = sheetPoly[i], b = sheetPoly[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < ((b[0] - a[0]) * (q[1] - a[1])) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };
  const hidden = (z, q) => on && z < ZS && inSheet(q);
  // split a curve into visible runs and hidden runs (boundary samples belong to both, so the line stays continuous)
  const runs = (fn) => { const vis = [], hid = []; let cv = [], ch = []; let prev = null;
    zs.forEach((z) => { const q = fn(z), h = hidden(z, q), p = q[0].toFixed(1) + "," + q[1].toFixed(1);
      if (prev !== null && h !== prev) { if (h) { cv.push(p); vis.push(cv.join(" ")); cv = []; ch = [p]; } else { ch.push(p); hid.push(ch.join(" ")); ch = []; cv = [p]; } }
      else (h ? ch : cv).push(p);
      prev = h; });
    if (cv.length > 1) vis.push(cv.join(" ")); if (ch.length > 1) hid.push(ch.join(" "));
    return { vis, hid }; };
  const hR = runs((z) => proj(Ex(z, t), 0, z)), vR = runs((z) => proj(0, Ey(z, t), z)), sR = runs((z) => proj(Ex(z, t), Ey(z, t), z));
  const FAR = 0.38;
  const stems = zs.filter((_, i) => i % 6 === 0).map((z, i) => {
    const qa = proj(0, 0, z), qh = proj(Ex(z, t), 0, z), qv = proj(0, Ey(z, t), z), q2 = proj(Ex(z, t), Ey(z, t), z);
    const f = hidden(z, q2) ? 0.38 : 1;
    return (
      <g key={"s" + i}>
        <line x1={qa[0]} y1={qa[1]} x2={qh[0]} y2={qh[1]} stroke={GOLD} strokeWidth={1.6} strokeDasharray="3 5" opacity={0.5 * f} />
        <line x1={qa[0]} y1={qa[1]} x2={qv[0]} y2={qv[1]} stroke={TEAL} strokeWidth={1.6} strokeDasharray="3 5" opacity={0.5 * f} />
        <line x1={qa[0]} y1={qa[1]} x2={q2[0]} y2={q2[1]} stroke={INK} strokeWidth={1.6} opacity={0.13 * f} />
      </g>
    );
  });
  const hs = 0.8;
  const sqAt = (z) => [[-hs, -hs], [hs, -hs], [hs, hs], [-hs, hs]].map((c) => proj(c[0], c[1], z).map((v) => v.toFixed(1)).join(",")).join(" ");
  const sq = sqAt(ZF), sqS = sqAt(ZS), sqE = sqAt(L);
  const hoF = Math.max(0, 1 - Math.abs(st.yaw) / 26) * Math.max(0, 1 - Math.abs(st.pitch) / 26);
  const cr1 = [proj(-hs, 0, ZF), proj(hs, 0, ZF)], cr2 = [proj(0, -hs, ZF), proj(0, hs, ZF)];
  const uc = Array.from({ length: 49 }, (_, i) => { const th2 = (2 * Math.PI * i) / 48; return proj(A3 * Math.cos(th2), A3 * Math.sin(th2), ZF).map((v) => v.toFixed(1)).join(","); }).join(" ");
  const trail3 = Array.from({ length: 30 }, (_, kk) => { const tt = t - kk * 0.13; const q = proj(Ex(ZF, tt), Ey(ZF, tt), ZF); return [q[0], q[1], 1 - kk / 32]; });
  const trailE = on ? Array.from({ length: 30 }, (_, kk) => { const tt = t - kk * 0.13; const q = proj(Ex(L, tt), Ey(L, tt), L); return [q[0], q[1], 1 - kk / 32]; }) : [];
  const axA = proj(0, 0, -L), axB = proj(0, 0, L);
  const tipQ = proj(A3 * a, A3 * bS, ZF);
  const sAx = [proj(-hs * cphi, -hs * sphi, ZS), proj(hs * cphi, hs * sphi, ZS)];
  const Stripes = ({ z, ang, col }) => { const ca = Math.cos(ang * DEG), sa = Math.sin(ang * DEG); return (<g>
    {[-3, -2, -1, 0, 1, 2, 3].map((k) => { const off = k * 0.2; const px = -sa * off, py = ca * off; const half = Math.sqrt(Math.max(0, hs * hs - off * off)) * 0.98; const A = proj(px - ca * half, py - sa * half, z), B = proj(px + ca * half, py + sa * half, z); return <line key={k} x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={col} strokeWidth={k === 0 ? 3 : 1.6} opacity={k === 0 ? 0.7 : 0.4} strokeLinecap="round" />; })}
  </g>); };       // the sheet's slot direction
  const tipE = on ? proj(A3 * a2, A3 * b2, L) : null;
  const bv = on ? bright : 0.5;
  const Bright = ({ x, y }) => (on || solo) && (<g><rect x={x} y={y} width={16} height={90} fill="none" stroke={SOFT} strokeWidth={1.5} /><rect x={x} y={y + 90 * (1 - bv)} width={16} height={90 * bv} fill={GOLD} /><Txt x={x + 8} y={y + 108} size={12}>{Math.round(bv * 100) + "%"}</Txt></g>);
  return (
    <div ref={benchWrap} style={{ width: "100%" }}>
      {mode === "wiggles" ? (
      <svg viewBox="0 0 900 470" style={svgStyle}>
        <line x1={x0} y1={yH} x2={x1} y2={yH} stroke={LBLUE} strokeWidth={1} />
        <line x1={x0} y1={yV} x2={x1} y2={yV} stroke={LBLUE} strokeWidth={1} />
        {on && <g>
          <rect x={xm - 4} y={40} width={8} height={370} fill={INK} opacity={0.08} />
          <line x1={xm} y1={40} x2={xm} y2={410} stroke={INK} strokeWidth={2} strokeDasharray="6 5" />
          <Txt x={xm} y={430} size={14} fill={INK} bold>{`sheet · ${phi}°`}</Txt>
        </g>}
        <g transform={"translate(0 " + yH + ")"}><polyline points={pts(a, a2)} fill="none" stroke={GOLD} strokeWidth={4} strokeLinejoin="round" /></g>
        <g transform={"translate(0 " + yV + ")"}><polyline points={pts(bS, b2)} fill="none" stroke={TEAL} strokeWidth={4} strokeLinejoin="round" /></g>
        <Txt x={x0} y={34} anchor="start" size={16} fill={GOLD} bold>{"H wiggle · size a = " + a.toFixed(2) + (on ? " → " + a2.toFixed(2) : "")}</Txt>
        <Txt x={x0} y={232} anchor="start" size={16} fill={TEAL} bold>{"V wiggle · size b = " + (bS < 0 ? "−" : "+") + b.toFixed(2) + (on ? " → " + (b2 < 0 ? "−" : "+") + Math.abs(b2).toFixed(2) : "")}</Txt>
        <Txt x={x0} y={454} anchor="start" size={14}>{on ? `keeps the part along ${phi}° (${k.toFixed(2)}) → re-emits along its axis · ${Math.round(bright * 100)}% bright` : "the two wiggles, side-on · flying to the right →"}</Txt>
        <Bright x={x1 - 16} y={40} />
      </svg>
      ) : (
      <svg viewBox="0 0 900 470" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        style={{ width: "100%", display: "block", touchAction: "none", userSelect: "none", cursor: "grab" }}>
        <line x1={axA[0]} y1={axA[1]} x2={axB[0]} y2={axB[1]} stroke={LBLUE} strokeWidth={2} />
        {(() => {
          // occlusion by the front frame: the beam's samples that lie behind it (z < ZF) and project inside its square are drawn faint
          const framePoly = [[-hs, -hs], [hs, -hs], [hs, hs], [-hs, hs]].map((c) => proj(c[0], c[1], ZF));
          const inFrame = (q) => { let ins = false; for (let i = 0, j = 3; i < 4; j = i++) { const a = framePoly[i], b = framePoly[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < ((b[0] - a[0]) * (q[1] - a[1])) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };
          // find where the beam's axis enters the frame's square (first sample from the lamp that is hidden)
          const NB = 60; let zCut = ZF;
          for (let i = 0; i <= NB; i++) { const z = -L + ((ZF + L) * i) / NB; if (inFrame(proj(0, 0, z))) { zCut = z; break; } }
          const A = axA, C = proj(0, 0, zCut), B = proj(0, 0, ZF);
          return (<g opacity={1 - hoF}>
            <line x1={A[0]} y1={A[1]} x2={C[0]} y2={C[1]} stroke={GOLD} strokeWidth={32} strokeLinecap="butt" opacity={0.32} />
            <line x1={A[0]} y1={A[1]} x2={C[0]} y2={C[1]} stroke={GOLD} strokeWidth={8} strokeLinecap="butt" opacity={0.85} />
            {zCut < ZF - 1e-6 && <line x1={C[0]} y1={C[1]} x2={B[0]} y2={B[1]} stroke={GOLD} strokeWidth={8} strokeLinecap="butt" opacity={0.3} strokeDasharray="7 6" />}
            {Array.from({ length: 22 }, (_, k) => { const r = (m) => { const x = Math.sin(k * 127.1 + m * 311.7) * 43758.5453; return x - Math.floor(x); }; const z = -L + ((k / 22 + t * 0.09) % 1) * (ZF + L); const q = proj((r(2) - 0.5) * 0.34, (r(3) - 0.5) * 0.34, z); const hid = inFrame(q); return <circle key={k} cx={q[0]} cy={q[1]} r={3.2} fill="#FFFFFF" stroke={GOLD} strokeWidth={1.5} opacity={hid ? 0.3 : 0.95} />; })}
          </g>);
        })()}
        <circle cx={axA[0]} cy={axA[1]} r={22} fill="#FDEFE3" stroke={GOLD} strokeWidth={2.5} opacity={1 - hoF} />
        <circle cx={axA[0]} cy={axA[1]} r={9} fill={GOLD} opacity={1 - hoF} />
        <polygon points={sq} fill="#FFFFFF" fillOpacity={0.45} stroke={TEAL} strokeWidth={2.5} />
        <line x1={cr1[0][0]} y1={cr1[0][1]} x2={cr1[1][0]} y2={cr1[1][1]} stroke={GRID} strokeWidth={2} />
        <line x1={cr2[0][0]} y1={cr2[0][1]} x2={cr2[1][0]} y2={cr2[1][1]} stroke={GRID} strokeWidth={2} />
        <polygon points={uc} fill="none" stroke={GOLD} strokeWidth={1.6} strokeDasharray="4 6" opacity={0.4} />
        <Stripes z={ZF} ang={beta} col={TEAL} />
        {beamMode && (() => {
          const I1 = 0.5, I2 = on ? 0.5 * k * k : 0.5;
          const Iat = (z) => z < ZF ? 1 : (on && z >= ZS) ? I2 : I1;
          // occlusion by sheet 2 (when in) and by the exit face: samples behind a square whose screen point falls inside it are drawn faint and dashed
          const polyAt = (z0) => [[-hs, -hs], [hs, -hs], [hs, hs], [-hs, hs]].map((c) => proj(c[0], c[1], z0));
          const inPoly = (P, q) => { let ins = false; for (let i = 0, j = 3; i < 4; j = i++) { const a = P[i], b = P[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < ((b[0] - a[0]) * (q[1] - a[1])) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };
          const occl = [[L, polyAt(L)]]; if (on) occl.push([ZS, polyAt(ZS)]);
          const hid = (z, q) => occl.some(([z0, P]) => z < z0 - 1e-6 && inPoly(P, q));
          const seg = (za, zb, I, key) => {
            if (I < 0.01) { const A = proj(0, 0, za), B = proj(0, 0, zb); return <line key={key} x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={LBLUE} strokeWidth={1.5} strokeDasharray="4 6" />; }
            const NB = 48, runs = []; let cur = null;
            for (let i = 0; i <= NB; i++) { const z = za + ((zb - za) * i) / NB, q = proj(0, 0, z), h = hid(z, q); if (!cur || cur.h !== h) { if (cur) cur.pts.push(q); cur = { h, pts: [q] }; runs.push(cur); } else cur.pts.push(q); }
            return (<g key={key}>{runs.map((r, i) => { const A = r.pts[0], B = r.pts[r.pts.length - 1]; return r.h
              ? <line key={i} x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={GOLD} strokeWidth={2 + 6 * Math.sqrt(I)} strokeLinecap="butt" opacity={0.3} strokeDasharray="7 6" />
              : (<g key={i}>
                <line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={GOLD} strokeWidth={6 + 26 * Math.sqrt(I)} strokeLinecap="butt" opacity={0.14 + 0.2 * I} />
                <line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={GOLD} strokeWidth={2 + 6 * Math.sqrt(I)} strokeLinecap="butt" opacity={0.45 + 0.45 * I} />
              </g>); })}</g>);
          };
          const rnd = (kk, m) => { const x = Math.sin(kk * 127.1 + m * 311.7) * 43758.5453; return x - Math.floor(x); };
          const grains = Array.from({ length: 64 }, (_, kk) => { const z = ZF + ((kk / 64 + t * 0.09) % 1) * (L - ZF); const lot = rnd(kk, 1); if (lot >= Iat(z)) return null; const q = proj((rnd(kk, 2) - 0.5) * 0.34, (rnd(kk, 3) - 0.5) * 0.34, z); return <circle key={kk} cx={q[0]} cy={q[1]} r={3.2} fill="#FFFFFF" stroke={GOLD} strokeWidth={1.5} opacity={hid(z, q) ? 0.3 : 0.95} />; });
          return (<g opacity={1 - hoF}>
            <polygon points={sqE} fill="none" stroke={LBLUE} strokeWidth={2} strokeDasharray="3 4" />
            {on && <polygon points={sqS} fill="#FFFFFF" fillOpacity={0.45} stroke={INK} strokeWidth={2.5} />}
            {on && <Stripes z={ZS} ang={phi} col={INK} />}
            {on ? [seg(ZF, ZS, I1, "b1"), seg(ZS, L, I2, "b2")] : seg(ZF, L, I1, "b1")}{grains}
          </g>);
        })()}
        {on && !beamMode && <g>
          <polygon points={sqE} fill="none" stroke={LBLUE} strokeWidth={2} strokeDasharray="3 4" />
          {!beamMode && hR.hid.map((p, i) => <polyline key={"hh" + i} points={p} fill="none" stroke={GOLD} strokeWidth={3} strokeLinejoin="round" opacity={0.9 * FAR} strokeDasharray="7 6" />)}
          {!beamMode && vR.hid.map((p, i) => <polyline key={"vh" + i} points={p} fill="none" stroke={TEAL} strokeWidth={3} strokeLinejoin="round" opacity={0.9 * FAR} strokeDasharray="7 6" />)}
          {!beamMode && sR.hid.map((p, i) => <polyline key={"sh" + i} points={p} fill="none" stroke={INK} strokeWidth={4.5} strokeLinejoin="round" opacity={FAR} strokeDasharray="7 6" />)}
          <polygon points={sqS} fill="#FFFFFF" fillOpacity={0.45} stroke={INK} strokeWidth={2.5} />
          <Stripes z={ZS} ang={phi} col={INK} />
        </g>}
        {!beamMode && stems}
        {!beamMode && hR.vis.map((p, i) => <polyline key={"hv" + i} points={p} fill="none" stroke={GOLD} strokeWidth={3} strokeLinejoin="round" opacity={0.9} />)}
        {!beamMode && vR.vis.map((p, i) => <polyline key={"vv" + i} points={p} fill="none" stroke={TEAL} strokeWidth={3} strokeLinejoin="round" opacity={0.9} />)}
        {!beamMode && sR.vis.map((p, i) => <polyline key={"sv" + i} points={p} fill="none" stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />)}
        {hoF > 0.01 && (
          <g opacity={hoF}>
            <polygon points={sq} fill="#FFFFFF" fillOpacity={0.92} stroke={LBLUE} strokeWidth={2.5} />
            <line x1={cr1[0][0]} y1={cr1[0][1]} x2={cr1[1][0]} y2={cr1[1][1]} stroke={GRID} strokeWidth={2} />
            <line x1={cr2[0][0]} y1={cr2[0][1]} x2={cr2[1][0]} y2={cr2[1][1]} stroke={GRID} strokeWidth={2} />
            <polygon points={uc} fill="none" stroke={GOLD} strokeWidth={1.6} strokeDasharray="4 6" opacity={0.4} />
            <Stripes z={ZF} ang={beta} col={TEAL} />
            {on && <Stripes z={ZS} ang={phi} col={INK} />}
          </g>
        )}
        {!beamMode && trail3.map((q, kk) => (
          <circle key={kk} cx={q[0]} cy={q[1]} r={kk === 0 ? 8 : 3.8} fill={INK} opacity={(kk === 0 ? 1 : 0.28 * q[2]) * (on && hoF > 0.5 ? 0.45 : 1)} />
        ))}
        {!beamMode && trailE.map((q, kk) => (
          <circle key={"e" + kk} cx={q[0]} cy={q[1]} r={kk === 0 ? 8 : 3.8} fill={PURP} opacity={kk === 0 ? 1 : 0.28 * q[2]} />
        ))}
        {!beamMode && <circle cx={tipQ[0]} cy={tipQ[1]} r={5} fill="none" stroke={GOLD} strokeWidth={2.2} opacity={0.8} />}
        {!beamMode && tipE && <circle cx={tipE[0]} cy={tipE[1]} r={5} fill="none" stroke={PURP} strokeWidth={2.2} opacity={0.8} />}
        <text x={25} y={30} fontFamily={MONO} fontSize="16">
          {beamMode ? <tspan fill={INK}>{solo ? "the beam — the sheet lets about half through, whichever way it turns" : "the beam — sheet 1 lets about half through" + (on ? " · sheet 2: " + Math.round(bright * 100) + "% of that" : "")}</tspan>
            : <><tspan fill={INK}>in space — </tspan><tspan fill={GOLD}>H</tspan><tspan fill={INK}> + </tspan><tspan fill={TEAL}>V</tspan><tspan fill={INK}> = the wave (dark)</tspan>
          {on && <tspan fill={PURP}>{` · after the ${phi}° sheet (purple): ${Math.round(bright * 100)}%`}</tspan>}</>}
        </text>
        <text x={25} y={454} fontFamily={MONO} fontSize="14" fill={SOFT}>{on ? "drag to turn · dashed = hidden behind the sheet · bar = slots · dotted = exit face" : "drag to turn · framed square = the front view"}</text>
        <Bright x={859} y={40} />
      </svg>
      )}
      {solo ? (<>
      {/* the two slider rows the full bench shows, kept as invisible spacers so the bench sits at the same height on every slide */}
      <div style={{ width: "100%", marginTop: 6, boxSizing: "border-box", visibility: "hidden" }} aria-hidden="true">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}><span style={{ fontFamily: MONO, fontSize: 15 }}>·</span></div>
        <input type="range" min="0" max="1" readOnly value="0" style={{ width: "100%", marginTop: 2 }} />
      </div>
      <div style={{ width: "100%", marginTop: 2, boxSizing: "border-box", visibility: "hidden" }} aria-hidden="true">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}><span style={{ fontFamily: MONO, fontSize: 15 }}>·</span></div>
        <input type="range" min="0" max="1" readOnly value="0" style={{ width: "100%", marginTop: 2 }} />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 6 }}>
        <Button ghost onClick={() => setSt((s) => ({ ...s, run: !s.run }))}>{st.run ? "❙❙" : "▶"}</Button>
        <Menu label={"the sheet · " + (beta === 0 ? "horizontal" : beta === 90 ? "vertical" : beta === 45 ? "diagonal" : beta + "°")} value={[0, 45, 90].includes(beta) ? beta : null} items={[[0, "horizontal"], [45, "diagonal"], [90, "vertical"]]} onPick={(g) => room.publish({ lens1: g }, true)} />
        <Menu label={"view · " + view} value={view} items={[["side view", "side view"], ["3D", "3D view"]]} onPick={(v) => room.publish({ waveView: v }, true)} />
      </div>
      </>) : (<>
      <div style={{ width: "100%", marginTop: 6, boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
          <span style={{ fontFamily: MONO, fontSize: 15, color: SOFT }}>β — the wave's tilt (sets both wiggle sizes)</span>
          <span style={{ fontFamily: MONO, fontSize: 15, color: INK, fontWeight: 700 }}>{"β=" + Math.round(beta) + "° → a=" + a.toFixed(2) + ", b=" + (bS < 0 ? "−" : "+") + b.toFixed(2)}</span>
        </div>
        <input type="range" min="0" max="180" step="1" value={beta} onChange={(e) => room.publish({ lens1: +e.target.value })} style={{ width: "100%", accentColor: GOLD, marginTop: 2 }} />
      </div>
      <div style={{ width: "100%", marginTop: 2, boxSizing: "border-box", opacity: on ? 1 : 0.35, pointerEvents: on ? "auto" : "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
          <span style={{ fontFamily: MONO, fontSize: 15, color: SOFT }}>φ — the sheet's slot direction</span>
          <span style={{ fontFamily: MONO, fontSize: 15, color: INK, fontWeight: 700 }}>{on ? `φ=${phi}° → keeps ${k.toFixed(2)} · brightness cos² = ${Math.round(bright * 100)}%` : "sheet 2 is out"}</span>
        </div>
        <input type="range" min="0" max="180" step="1" value={phi} onChange={(e) => room.publish({ lens2: +e.target.value })} style={{ width: "100%", accentColor: INK, marginTop: 2 }} />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 6 }}>
        <Button ghost onClick={() => setSt((s) => ({ ...s, run: !s.run }))}>{st.run ? "❙❙" : "▶"}</Button>
        <Menu label={"sheet 1 · " + beta + "°"} value={[0, 45, 90].includes(beta) ? beta : null} items={[[0, "0° · horizontal"], [45, "45° · diagonal"], [90, "90° · vertical"]]} onPick={(g) => room.publish({ lens1: g }, true)} />
        <Menu label={"light · " + (beamMode ? "beam" : "wave")} value={light} items={[["beam", "beam"], ["wave", "wave"]]} onPick={(v) => { room.publish({ lightMode: v }, true); if (v === "beam" && view === "wiggles") room.publish({ waveView: "3D" }, true); }} />
        <Button active={on} ghost={!on} onClick={() => room.publish(sheetIn ? { sheetIn: false } : { sheetIn: true, lens2: beta }, true)}>{on ? "sheet 2: out" : "sheet 2: in"}</Button>
        {on && <Menu label={"sheet 2 · " + phi + "°"} value={[0, 45, 90].includes(phi) ? phi : null} items={[[0, "0° · horizontal"], [45, "45° · diagonal"], [90, "90° · vertical"]]} onPick={(g) => room.publish({ lens2: g }, true)} />}
        <Button onClick={() => setSt((s) => ({ ...s, delta: s.delta === 0 ? 180 : 0 }))}>
          {st.delta === 0 ? "flip a wiggle" : "unflip"}
        </Button>
        <Menu label={"view · " + (view === "wiggles" ? "wiggles" : view)} value={view}
          items={[["wiggles", "the two wiggles"], ["side view", "side view"], ["3D", "3D view"], ["down the axis", "look down the axis"]]}
          onPick={(v) => room.publish(v === "wiggles" ? { waveView: v, lightMode: "wave" } : { waveView: v }, true)} />
      </div>
      </>)}
    </div>
  );
}

/* FigMalusRoom — slide after 7b: the detector reading as a function of the two angles.
   Shares β (lens1) and φ (lens2) with the wave slide. Top-left: the view down the axis (needle at β, sheet slots at φ,
   the surviving projection). Top-right: the detector bar. Main: brightness = cos²(φ − β) against φ, with β movable. */
function FigMalusRoom({ inset }) {
  const [showInset, setShowInset] = useState(inset === true || inset === "true");
  const room = Room.usePresenter();
  useEffect(() => { room.publish({ sheetIn: true }, true); }, []);
  const beta = room.state.lens1 ?? 30, phi = room.state.lens2 ?? 0;
  const br = beta * DEG, ph = phi * DEG;
  const k = Math.cos(ph - br), bright = k * k;
  const a = Math.cos(br), b = Math.sin(br);
  // main plot geometry
  const PX0 = 70, PX1 = 790, PY0 = 60, PY1 = 400;
  const X = (d) => PX0 + (d / 180) * (PX1 - PX0), Y = (v) => PY1 - v * (PY1 - PY0);
  const curve = Array.from({ length: 181 }, (_, i) => X(i).toFixed(1) + "," + Y(Math.cos((i - beta) * DEG) ** 2).toFixed(1)).join(" ");
  const dragPlot = (setter) => (e) => {
    const svg = e.currentTarget.ownerSVGElement || e.currentTarget.closest("svg");
    const move = (ev) => { const r = svg.getBoundingClientRect(); const x = ((ev.clientX - r.left) / r.width) * 900; setter(Math.max(0, Math.min(180, Math.round(((x - PX0) / (PX1 - PX0)) * 180)))); };
    move(e);
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); swallowClick(); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  // down-the-axis inset
  const ix = 70, iy = 70, R = 52;
  const nx = ix + R * a, ny = iy - R * b;                      // the needle (β)
  const px = ix + R * k * Math.cos(ph), py = iy - R * k * Math.sin(ph); // its part along the slots (φ)
  const slots = [-3, -2, -1, 0, 1, 2, 3].map((j) => { const off = j * 0.2 * R; const half = Math.sqrt(Math.max(0, R * R - off * off)); const ex = -Math.sin(ph) * off, ey = Math.cos(ph) * off; return [ix + ex - Math.cos(ph) * half, iy - (ey - Math.sin(ph) * half), ix + ex + Math.cos(ph) * half, iy - (ey + Math.sin(ph) * half), j]; });
  return (
    <div style={{ width: "100%" }}>
      <svg viewBox="0 0 900 470" style={svgStyle}>
        {/* detector, top right */}
        <rect x={840} y={PY0} width={22} height={PY1 - PY0} fill="none" stroke={SOFT} strokeWidth={1.5} />
        <rect x={840} y={Y(bright)} width={22} height={PY1 - Y(bright)} fill={GOLD} />
        <line x1={X(phi)} y1={Y(bright)} x2={840} y2={Y(bright)} stroke={GOLD} strokeWidth={1.5} strokeDasharray="3 5" opacity={0.7} />
        <Txt x={851} y={PY0 - 22} size={13} fill={SOFT}>detector</Txt>
        <Txt x={851} y={PY1 + 24} size={16} fill={GOLD} bold>{Math.round(bright * 100) + "%"}</Txt>
        {/* main plot */}
        <line x1={PX0} y1={PY1} x2={PX1} y2={PY1} stroke={INK} strokeWidth={1.5} />
        <line x1={PX0} y1={PY0} x2={PX0} y2={PY1} stroke={INK} strokeWidth={1.5} />
        {[0, 0.5].map((v) => <g key={v}><line x1={PX0 - 6} y1={Y(v)} x2={PX1} y2={Y(v)} stroke={v === 0 ? INK : GRID} strokeWidth={v === 0 ? 0 : 1.5} /><Txt x={PX0 - 12} y={Y(v) + 5} size={13} anchor="end">{v === 0.5 ? "½" : v}</Txt></g>)}
        <line x1={PX0 - 6} y1={Y(1)} x2={PX1} y2={Y(1)} stroke={GRID} strokeWidth={1.5} />
        {[0, 45, 90, 135, 180].map((d) => <g key={d}><line x1={X(d)} y1={PY1} x2={X(d)} y2={PY1 + 6} stroke={INK} strokeWidth={1.5} /><Txt x={X(d)} y={PY1 + 24} size={13}>{d + "°"}</Txt></g>)}
        <Txt x={PX1} y={PY1 + 50} size={14} fill={INK} anchor="end">φ — the sheet's slot direction →</Txt>
        <Txt x={PX0 - 12} y={PY0 + 5} size={14} fill={INK} anchor="end">1</Txt>
        <polyline points={curve} fill="none" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
        {/* β: the peak, draggable */}
        <line x1={X(beta)} y1={PY0} x2={X(beta)} y2={PY1} stroke={TEAL} strokeWidth={2} strokeDasharray="6 5" />
        <g onPointerDown={dragPlot((v) => room.publish({ lens1: v }))} style={{ cursor: "ew-resize" }}>
          <circle cx={X(beta)} cy={PY0} r={18} fill="transparent" />
          <circle cx={X(beta)} cy={PY0} r={7} fill="#FFFFFF" stroke={TEAL} strokeWidth={3} />
        </g>
        <Txt x={Math.max(PX0 + 30, Math.min(PX1 - 30, X(beta)))} y={PY0 + 30} size={14} fill={TEAL} bold>{"β = " + Math.round(beta) + "°"}</Txt>
        {/* φ: the reading, draggable */}
        <line x1={X(phi)} y1={Y(bright)} x2={X(phi)} y2={PY1} stroke={GOLD} strokeWidth={2} />
        <g onPointerDown={dragPlot((v) => room.publish({ lens2: v }))} style={{ cursor: "ew-resize" }}>
          <circle cx={X(phi)} cy={Y(bright)} r={20} fill="transparent" />
          <circle cx={X(phi)} cy={Y(bright)} r={10} fill="#FFFFFF" stroke={GOLD} strokeWidth={4} />
        </g>
        <Txt x={X(phi) > PX1 - 90 ? X(phi) - 18 : X(phi) + 18} y={Y(bright) - 14} size={14} fill={GOLD} anchor={X(phi) > PX1 - 90 ? "end" : "start"} bold>{"φ = " + Math.round(phi) + "°"}</Txt>
        <Txt x={PX0} y={PY1 + 50} size={15} fill={INK} anchor="start" bold>{"brightness = cos²(φ − β)"}</Txt>
        {/* inset: view down the axis */}
        {showInset && <g>
        <rect x={ix - R - 10} y={iy - R - 10} width={2 * R + 20} height={2 * R + 34} rx={8} fill="#FFFFFF" stroke={LBLUE} strokeWidth={1.5} />
        <line x1={ix - R} y1={iy} x2={ix + R} y2={iy} stroke={GRID} strokeWidth={2} />
        <line x1={ix} y1={iy - R} x2={ix} y2={iy + R} stroke={GRID} strokeWidth={2} />
        <circle cx={ix} cy={iy} r={R} fill="none" stroke={GOLD} strokeWidth={1.6} strokeDasharray="4 6" opacity={0.4} />
        {slots.map(([x1, y1, x2, y2, j]) => <line key={j} x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={j === 0 ? 2.4 : 1.3} opacity={j === 0 ? 0.7 : 0.35} strokeLinecap="round" />)}
        <line x1={nx} y1={ny} x2={px} y2={py} stroke={SOFT} strokeWidth={1.3} strokeDasharray="3 4" />
        <line x1={ix} y1={iy} x2={nx} y2={ny} stroke={TEAL} strokeWidth={3.2} strokeLinecap="round" />
        <circle cx={nx} cy={ny} r={4.5} fill={TEAL} />
        <line x1={ix} y1={iy} x2={px} y2={py} stroke={PURP} strokeWidth={3.2} strokeLinecap="round" />
        <circle cx={px} cy={py} r={4.5} fill={PURP} />
        <Txt x={ix} y={iy + R + 18} size={12} fill={SOFT}>down the axis</Txt>
        </g>}
      </svg>
      <div style={{ width: "100%", marginTop: 6, boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
          <span style={{ fontFamily: MONO, fontSize: 15, color: SOFT }}>β — the wave's tilt (sets both wiggle sizes)</span>
          <span style={{ fontFamily: MONO, fontSize: 15, color: INK, fontWeight: 700 }}>{"β=" + Math.round(beta) + "° → a=" + a.toFixed(2) + ", b=" + b.toFixed(2)}</span>
        </div>
        <input type="range" min="0" max="180" step="1" value={beta} onChange={(e) => room.publish({ lens1: +e.target.value })} style={{ width: "100%", accentColor: TEAL, marginTop: 2 }} />
      </div>
      <div style={{ width: "100%", marginTop: 2, boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
          <span style={{ fontFamily: MONO, fontSize: 15, color: SOFT }}>φ — the sheet's slot direction</span>
          <span style={{ fontFamily: MONO, fontSize: 15, color: INK, fontWeight: 700 }}>{`φ=${Math.round(phi)}° → keeps ${k.toFixed(2)} · brightness cos² = ${Math.round(bright * 100)}%`}</span>
        </div>
        <input type="range" min="0" max="180" step="1" value={phi} onChange={(e) => room.publish({ lens2: +e.target.value })} style={{ width: "100%", accentColor: GOLD, marginTop: 2 }} />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 6 }}>
        <Menu label={"sheet 1 · " + Math.round(beta) + "°"} value={[0, 45, 90].includes(beta) ? beta : null} items={[[0, "0° · horizontal"], [45, "45° · diagonal"], [90, "90° · vertical"]]} onPick={(g) => room.publish({ lens1: g }, true)} />
        <Menu label={"sheet 2 · " + Math.round(phi) + "°"} value={[0, 45, 90].includes(phi) ? phi : null} items={[[0, "0° · horizontal"], [45, "45° · diagonal"], [90, "90° · vertical"]]} onPick={(g) => room.publish({ lens2: g }, true)} />
        <Button ghost onClick={() => room.publish({ lens2: beta }, true)}>align sheet 2 with β</Button>
        <Button ghost onClick={() => room.publish({ lens2: (beta + 90) % 180 }, true)}>cross them</Button>
        <Button active={showInset} ghost={!showInset} onClick={() => setShowInset((v) => !v)}>{showInset ? "hide the axis view" : "view down the axis"}</Button>
      </div>
    </div>
  );
}

// ── SCENE 2a : two sources — each round on the (p, bandwidth) plane: first every end point projected on the p-axis, then the paths (E(sd)) ──
function FigRoundPlane() {
  const room = Room.usePresenter();
  const [round, setRound] = useState("A");
  const stage = "paths", mode = "exp";                 // always the replay, always ± E(sd)
  const T = room.tallies(round);
  const hist = room.memo["hist:" + round] || [];
  const phist = room.memo["phist:" + round] || {};
  const paths = true, col = ROUND[round].col;
  const pick = (r) => setRound(r);
  const wrap = useRef(null);
  const enter = useSlideEnter(wrap, () => { const el = wrap.current && wrap.current.querySelector("svg"); if (el) el.style.visibility = "hidden"; });
  // the svg was blanked on slide change; it is shown again once re-armed at rev 0
  const { rev, playing, toggle } = useReplay(paths && hist.length > 0, enter, [round], () => { const el = wrap.current && wrap.current.querySelector("svg"); if (el) el.style.visibility = ""; });
  const live = rev >= 1;
  const vis = live ? hist : hist.slice(0, Math.ceil(rev * hist.length));
  const cutN = live ? T.n : (vis.length ? vis[vis.length - 1][0] : 0);
  const psd = (f) => Math.sqrt(Math.max(0, f * (1 - f)));
  const at = (h, N) => { let l = null; for (const q of h) { if (q[0] <= N) l = q; else break; } return l; };
  const parts = T.phones.map((p) => {
    if (live) return { from: p.from, tag: p.tag, frac: p.frac, n: p.n };
    const l = at(phist[p.from] || [], cutN);
    return { from: p.from, tag: p.tag, frac: l ? l[1] : 0, n: l ? l[2] : 0 };
  }).filter((p) => p.n > 0);
  // E(sd) at pooled count N: flip-weighted mean of every participant's own √f(1−f) — the room's second number
  const expSd = (N) => { let s = 0, w = 0; Object.keys(phist).forEach((f) => { const l = at(phist[f], N); if (l) { s += psd(l[1]) * l[2]; w += l[2]; } }); return w ? s / w : 0; };
  const roomW = (h) => mode === "exp" ? expSd(h[0]) : psd(h[1]);
  const Lf = live ? T.frac : (vis.length ? vis[vis.length - 1][1] : 0);
  const pool = cutN > 0 ? { p: Lf, w: mode === "exp" ? expSd(cutN) : psd(Lf) } : null;
  const trail = vis.filter((h) => h[0] >= 3);
  // re-anchor the host panel's raster to the plane axes: one tile = 0.05 in p and in bandwidth
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const svg = el.querySelector("svg"); if (!svg) return;
    let panel = el.parentElement;
    while (panel && getComputedStyle(panel).backgroundImage === "none") panel = panel.parentElement;
    if (!panel) return;
    const A = { x: 130, y: 460, g: 32 };
    const fit = () => {
      const pr = panel.getBoundingClientRect(), sr = svg.getBoundingClientRect();
      if (!pr.width || !sr.width) return;
      const k = panel.offsetWidth / pr.width;
      const s = (sr.width * k) / 900;
      const tile = A.g * s;
      const ox = (sr.left - pr.left) * k - panel.clientLeft + A.x * s - 0.75;
      const oy = (sr.top - pr.top) * k - panel.clientTop + A.y * s - 0.75;
      panel.style.backgroundImage = "linear-gradient(to right, #E1F3FC 0 1.5px, transparent 1.5px), linear-gradient(to bottom, #E1F3FC 0 1.5px, transparent 1.5px)";
      panel.style.backgroundSize = `${tile}px ${tile}px`;
      panel.style.backgroundPosition = `${ox}px ${oy}px`;
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(svg); ro.observe(panel);
    return () => ro.disconnect();
  }, []);
  const plane = Plane({ showBand: paths, showArc: paths, children: ({ X, Y }) => (<>
    {paths && T.phones.map((p) => {
      const ph = (phist[p.from] || []).filter((h) => h[2] >= 2 && h[0] <= cutN);
      return ph.length > 1 && <polyline key={"t" + p.from} points={ph.map((h) => `${X(h[1]).toFixed(1)},${Y(psd(h[1])).toFixed(1)}`).join(" ")} fill="none" stroke={col} strokeWidth="1.25" opacity="0.22" strokeLinejoin="round" />;
    })}
    {paths && parts.map((p) => <circle key={"s" + p.from} cx={X(p.frac)} cy={Y(0)} r={7 + Math.min(6, p.n / 5)} fill={col} opacity="0.12" />)}
    {paths && pool && <circle cx={X(pool.p)} cy={Y(0)} r="12" fill={col} opacity="0.2" />}
    {parts.map((p) => { const y = Y(paths ? psd(p.frac) : 0); return (<g key={p.from} opacity="0.45">
      <circle cx={X(p.frac)} cy={y} r={7 + Math.min(6, p.n / 5)} fill={col} stroke="#FFFFFF" strokeWidth={1.5} />
      <text x={X(p.frac)} y={y + 5} textAnchor="middle" fontSize="15">{p.tag}</text>
    </g>); })}
    {paths && trail.length > 1 && <polyline points={trail.map((h) => `${X(h[1]).toFixed(1)},${Y(roomW(h)).toFixed(1)}`).join(" ")} fill="none" stroke="#FFFFFF" strokeWidth="6" opacity="0.9" strokeLinejoin="round" strokeLinecap="round" />}
    {paths && trail.length > 1 && <polyline points={trail.map((h) => `${X(h[1]).toFixed(1)},${Y(roomW(h)).toFixed(1)}`).join(" ")} fill="none" stroke={col} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
    {pool && <circle cx={X(pool.p)} cy={Y(paths ? pool.w : 0)} r="12" fill={col} stroke="#FFFFFF" strokeWidth={2.25} />}
    {pool && <Txt x={X(pool.p)} y={Y(paths ? pool.w : 0) - 20} size={14} fill={INK} bold>room</Txt>}
    {T.n === 0 && <Txt x={X(0.5)} y={Y(0.3)} size={17}>{`no flips yet — flip in ${ROUND[round].name} first (scene 1)`}</Txt>}
    <Txt x={X(0.5)} y={34} size={16} fill={INK} bold>{`${ROUND[round].name} — ${ROUND[round].title}`}</Txt>
    {T.n > 0 && !paths && <Txt x={X(0.5)} y={Y(0.3)} size={15}>one number each: the fraction of heads — the room's is their average</Txt>}
    {T.n > 0 && paths && live && <Txt x={X(0.5)} y={Y(0) + 54} size={14} fill={INK}>{mode === "exp" ? `± E(sd): each coin's own bandwidth — the room's is their average · ${T.n} flips · ${T.phones.length} participants` : `± sd: one anonymous bag of flips — √F(1−F) of the pooled fraction · ${T.n} flips · ${T.phones.length} participants`}</Txt>}
  </>) });
  return (
    <div ref={wrap}>
      {plane.svg}
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
        <Button ghost onClick={toggle}>{playing ? "❙❙" : "▶"}</Button>
        {["A", "B", "C"].map((r) => <Button key={r} active={round === r} onClick={() => pick(r)}>{ROUND[r].name}</Button>)}
      </div>
    </div>
  );
}

// ── SCENE 2b : two words — both room paths at once: ± sd (anonymous bag) and ± E(sd) (whose flip is whose) ──
function FigTwoBands() {
  const room = Room.usePresenter();
  const [round, setRound] = useState("A");
  const T = room.tallies(round);
  const hist = room.memo["hist:" + round] || [];
  const phist = room.memo["phist:" + round] || {};
  const col = ROUND[round].col;
  const wrap = useRef(null);
  const enter = useSlideEnter(wrap, () => { const el = wrap.current && wrap.current.querySelector("svg"); if (el) el.style.visibility = "hidden"; });
  const { rev, playing, toggle } = useReplay(hist.length > 0, enter, [round], () => { const el = wrap.current && wrap.current.querySelector("svg"); if (el) el.style.visibility = ""; });
  const live = rev >= 1;
  const vis = live ? hist : hist.slice(0, Math.ceil(rev * hist.length));
  const cutN = live ? T.n : (vis.length ? vis[vis.length - 1][0] : 0);
  const psd = (f) => Math.sqrt(Math.max(0, f * (1 - f)));
  const at = (h, N) => { let l = null; for (const q of h) { if (q[0] <= N) l = q; else break; } return l; };
  const parts = T.phones.map((p) => {
    if (live) return { from: p.from, tag: p.tag, frac: p.frac, n: p.n };
    const l = at(phist[p.from] || [], cutN);
    return { from: p.from, tag: p.tag, frac: l ? l[1] : 0, n: l ? l[2] : 0 };
  }).filter((p) => p.n > 0);
  const expSd = (N) => { let s = 0, w = 0; Object.keys(phist).forEach((f) => { const l = at(phist[f], N); if (l) { s += psd(l[1]) * l[2]; w += l[2]; } }); return w ? s / w : 0; };
  const trail = vis.filter((h) => h[0] >= 3);
  const Lf = live ? T.frac : (vis.length ? vis[vis.length - 1][1] : 0);
  const end = cutN > 0 ? { p: Lf, raw: psd(Lf), exp: expSd(cutN) } : null;
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const svg = el.querySelector("svg"); if (!svg) return;
    let panel = el.parentElement;
    while (panel && getComputedStyle(panel).backgroundImage === "none") panel = panel.parentElement;
    if (!panel) return;
    const A = { x: 130, y: 460, g: 32 };
    const fit = () => {
      const pr = panel.getBoundingClientRect(), sr = svg.getBoundingClientRect();
      if (!pr.width || !sr.width) return;
      const k = panel.offsetWidth / pr.width;
      const s = (sr.width * k) / 900;
      const tile = A.g * s;
      const ox = (sr.left - pr.left) * k - panel.clientLeft + A.x * s - 0.75;
      const oy = (sr.top - pr.top) * k - panel.clientTop + A.y * s - 0.75;
      panel.style.backgroundImage = "linear-gradient(to right, #E1F3FC 0 1.5px, transparent 1.5px), linear-gradient(to bottom, #E1F3FC 0 1.5px, transparent 1.5px)";
      panel.style.backgroundSize = `${tile}px ${tile}px`;
      panel.style.backgroundPosition = `${ox}px ${oy}px`;
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(svg); ro.observe(panel);
    return () => ro.disconnect();
  }, []);
  const pts = (wf) => trail.map((h) => `${X_(h[1]).toFixed(1)},${Y_(wf(h)).toFixed(1)}`).join(" ");
  let X_ = (v) => v, Y_ = (v) => v;
  const plane = Plane({ showBand: true, showArc: true, children: ({ X, Y }) => { X_ = X; Y_ = Y; return (<>
    {T.phones.map((p) => {
      const ph = (phist[p.from] || []).filter((h) => h[2] >= 2 && h[0] <= cutN);
      return ph.length > 1 && <polyline key={"t" + p.from} points={ph.map((h) => `${X(h[1]).toFixed(1)},${Y(psd(h[1])).toFixed(1)}`).join(" ")} fill="none" stroke={col} strokeWidth="1.25" opacity="0.22" strokeLinejoin="round" />;
    })}
    {parts.map((p) => <circle key={"s" + p.from} cx={X(p.frac)} cy={Y(0)} r={7 + Math.min(6, p.n / 5)} fill={col} opacity="0.12" />)}
    {end && <circle cx={X(end.p)} cy={Y(0)} r="12" fill={col} opacity="0.2" />}
    {parts.map((p) => (<g key={p.from} opacity="0.45">
      <circle cx={X(p.frac)} cy={Y(psd(p.frac))} r={7 + Math.min(6, p.n / 5)} fill={col} stroke="#FFFFFF" strokeWidth={1.5} />
      <text x={X(p.frac)} y={Y(psd(p.frac)) + 5} textAnchor="middle" fontSize="15">{p.tag}</text>
    </g>))}
    {trail.length > 1 && <polyline points={pts((h) => psd(h[1]))} fill="none" stroke="#FFFFFF" strokeWidth="6" opacity="0.9" strokeLinejoin="round" strokeLinecap="round" />}
    {trail.length > 1 && <polyline points={pts((h) => psd(h[1]))} fill="none" stroke={col} strokeWidth="3" strokeDasharray="9 7" strokeLinejoin="round" strokeLinecap="round" />}
    {trail.length > 1 && <polyline points={pts((h) => expSd(h[0]))} fill="none" stroke="#FFFFFF" strokeWidth="6" opacity="0.9" strokeLinejoin="round" strokeLinecap="round" />}
    {trail.length > 1 && <polyline points={pts((h) => expSd(h[0]))} fill="none" stroke={col} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
    {end && <circle cx={X(end.p)} cy={Y(end.raw)} r="12" fill="#FFFFFF" stroke={col} strokeWidth={3} strokeDasharray="5 4" />}
    {end && <circle cx={X(end.p)} cy={Y(end.exp)} r="12" fill={col} stroke="#FFFFFF" strokeWidth={2.25} />}
    {end && <g>
      <rect x={X(0.78)} y={Y(0.6) - 4} width={X(1) + 62 - X(0.78)} height={Y(0.52) - Y(0.6) + 8} fill="#FFFFFF" stroke="#C9E5F5" strokeWidth="1.5" rx="6" />
      <line x1={X(0.795)} y1={Y(0.58)} x2={X(0.85)} y2={Y(0.58)} stroke={col} strokeWidth="3" strokeDasharray="9 7" strokeLinecap="round" />
      <Txt x={X(0.865)} y={Y(0.58) + 5} anchor="start" size={14} fill={INK} bold>± sd · who?</Txt>
      <line x1={X(0.795)} y1={Y(0.54)} x2={X(0.85)} y2={Y(0.54)} stroke={col} strokeWidth="3" strokeLinecap="round" />
      <Txt x={X(0.865)} y={Y(0.54) + 5} anchor="start" size={14} fill={INK} bold>± E(sd) · known</Txt>
    </g>}
    {T.n === 0 && <Txt x={X(0.5)} y={Y(0.3)} size={17}>{`no flips yet — flip in ${ROUND[round].name} first (scene 1)`}</Txt>}
    <Txt x={X(0.5)} y={34} size={16} fill={INK} bold>{`${ROUND[round].name} — ${ROUND[round].title}`}</Txt>
    {end && live && <Txt x={X(0.5)} y={Y(0) + 54} size={14} fill={INK}>{`dashed: ± sd, one anonymous bag · solid: ± E(sd), whose flip is whose · the gap is what knowing removes`}</Txt>}
  </>); } });
  return (
    <div ref={wrap}>
      {plane.svg}
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
        <Button ghost onClick={toggle}>{playing ? "❙❙" : "▶"}</Button>
        {["A", "B", "C"].map((r) => <Button key={r} active={round === r} onClick={() => setRound(r)}>{ROUND[r].name}</Button>)}
      </div>
    </div>
  );
}

// ── (retired) statistical vs systematic bars — kept for reference ──
function FigSplitRoom() {
  const room = Room.usePresenter();
  const knowWho = !!room.state.knowWho;
  const stats = {};
  ["A", "B", "C"].forEach((r) => {
    const ps = room.tallies(r).phones.filter((x) => x.n > 0).map((x) => x.frac);
    if (!ps.length) { stats[r] = null; return; }
    const P = ps.reduce((a, p) => a + p, 0) / ps.length;
    const within = ps.reduce((a, p) => a + p * (1 - p), 0) / ps.length;   // luck that stays
    stats[r] = { P, room: Math.sqrt(Math.max(0, P * (1 - P))), within: Math.sqrt(within) };
  });
  const any = stats.A || stats.B || stats.C;
  const W = 900, y0 = 418, SC = 540, Yb = (v) => y0 - v * SC;
  const CX = { A: 220, B: 468, C: 716 }, BW = 64, GAP = 14;
  const NOTE = { A: "barely drops — luck stays", B: "drops to zero — no luck, only a fact", C: "drops to the mixed belief's bandwidth" };
  const KIND = { A: "statistical only", B: "systematic only", C: "both at once" };
  return (
    <div>
      <svg viewBox={`0 0 ${W} 520`} style={svgStyle}>
        <Txt x={W / 2} y={34} size={16} fill={INK} bold>the room's bandwidth — before and after learning whose flip is whose</Txt>
        <line x1={100} y1={Yb(0.5)} x2={830} y2={Yb(0.5)} stroke={SOFT} strokeWidth="1.5" strokeDasharray="7 6" />
        <Txt x={86} y={Yb(0.5) + 5} anchor="end" size={14}>½</Txt>
        <Txt x={86} y={Yb(0.25) + 5} anchor="end" size={14}>¼</Txt>
        <line x1={100} y1={Yb(0.25)} x2={830} y2={Yb(0.25)} stroke={GRID} strokeWidth="1.5" />
        <line x1={100} y1={y0} x2={830} y2={y0} stroke={INK} strokeWidth="2.25" />
        {["A", "B", "C"].map((r) => {
          const s = stats[r], cx = CX[r], col = ROUND[r].col;
          const x1 = knowWho ? cx - BW - GAP / 2 : cx - BW / 2, x2 = cx + GAP / 2;
          return (
            <g key={r}>
              <Txt x={cx} y={y0 + 28} size={15} fill={INK} bold>{ROUND[r].name}</Txt>
              <Txt x={cx} y={y0 + 48} size={13}>{ROUND[r].short + " · " + KIND[r]}</Txt>
              {!s && <Txt x={cx} y={Yb(0.12)} size={14}>no flips yet</Txt>}
              {s && <g>
                <rect x={x1} y={Yb(s.room)} width={BW} height={y0 - Yb(s.room)} fill={col} opacity="0.3" stroke={col} strokeWidth="2" />
                <Txt x={x1 + BW / 2} y={Yb(s.room) - 10} size={14} fill={INK} bold>{s.room.toFixed(2)}</Txt>
                <Txt x={x1 + BW / 2} y={y0 - 8} size={12} fill={INK}>who?</Txt>
              </g>}
              {s && knowWho && <g>
                <rect x={x2} y={Yb(s.within)} width={BW} height={Math.max(0, y0 - Yb(s.within))} fill={col} opacity="0.75" stroke={col} strokeWidth="2" />
                <Txt x={x2 + BW / 2} y={Yb(s.within) - 10} size={14} fill={INK} bold>{s.within.toFixed(2)}</Txt>
                {s.within > 0.06 && <Txt x={x2 + BW / 2} y={y0 - 8} size={12} fill="#FFFFFF" bold>known</Txt>}
                <path d={`M ${x1 + BW + 4} ${Yb(s.room)} C ${cx} ${Yb(s.room) - 26}, ${cx} ${Yb(s.room) - 26}, ${x2 + BW / 2} ${Yb(s.within) - 30}`} fill="none" stroke={SOFT} strokeWidth="1.75" markerEnd="url(#splitArr)" />
                <Txt x={cx} y={Math.min(Yb(s.room), Yb(s.within)) - 44} size={13} fill={SOFT}>{NOTE[r]}</Txt>
              </g>}
            </g>
          );
        })}
        <defs><marker id="splitArr" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill={SOFT} /></marker></defs>
        {!any && <Txt x={W / 2} y={200} size={17}>flip in rounds A, B and C first (scene 1) — this figure reuses those tallies</Txt>}
        {knowWho ? <g>
          <Txt x={W / 2} y={480} size={14} fill={INK}>what vanishes when you learn whose coin = systematic (epistemic)</Txt>
          <Txt x={W / 2} y={502} size={14} fill={INK}>what survives = statistical (aleatoric)</Txt>
        </g> : <Txt x={W / 2} y={496} size={15} fill={INK}>one anonymous bag of flips: all three rounds carry the same wide bandwidth ≈ ½</Txt>}
      </svg>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
        <Button active={knowWho} onClick={() => room.publish({ knowWho: !knowWho }, true)}>{knowWho ? "forget who flipped" : "tell the bookkeeper whose flip is whose"}</Button>
      </div>
    </div>
  );
}


// ═══ SCENE 18b/c : two photons — entangled without knowing it. The laptop plays the source; two seats draw from one pair, two more share a card. ═══
const HUNT = { N: 24, ent: null, card: null, rounds: [], reveal: false, test: [], testReveal: false, ls: new Set() };
const ANGLES = [0, 60, 120], bit = () => (Math.random() < 0.5 ? 1 : 0), pick3 = () => Math.floor(Math.random() * 3);
function huntEmit() { HUNT.ls.forEach((l) => l()); }
function huntSecret() {
  const pool = Array.from({ length: HUNT.N }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [pool[i], pool[k]] = [pool[k], pool[i]]; }
  HUNT.ent = [pool[0], pool[1]].sort((a, b) => a - b); HUNT.card = [pool[2], pool[3]].sort((a, b) => a - b);
  HUNT.rounds = []; HUNT.reveal = false; HUNT.test = []; HUNT.testReveal = false;
}
function useHunt() {
  const [, tick] = useState(0);
  useEffect(() => { const l = () => tick((x) => x + 1); HUNT.ls.add(l); return () => HUNT.ls.delete(l); }, []);
  if (!HUNT.ent) huntSecret();
  return HUNT;
}
function huntRound() {
  const angle = ANGLES[pick3()], ans = Array.from({ length: HUNT.N }, bit);
  ans[HUNT.ent[1]] = ans[HUNT.ent[0]]; ans[HUNT.card[1]] = ans[HUNT.card[0]];
  HUNT.rounds.push({ angle, ans }); huntEmit();
}
function huntAgree(i, j, upto) { for (let r = 0; r < upto; r++) if (HUNT.rounds[r].ans[i] !== HUNT.rounds[r].ans[j]) return false; return true; }
function huntSurvivors() { const out = []; for (let i = 0; i < HUNT.N; i++) for (let j = i + 1; j < HUNT.N; j++) if (huntAgree(i, j, HUNT.rounds.length)) out.push([i, j]); return out; }
function huntCounts() { const c = []; for (let k = 0; k <= HUNT.rounds.length; k++) { let n = 0; for (let i = 0; i < HUNT.N; i++) for (let j = i + 1; j < HUNT.N; j++) if (huntAgree(i, j, k)) n++; c.push(n); } return c; }
function FigHuntRoom() {
  const H = useHunt();
  const R = H.rounds.length, MAXR = 12, surv = huntSurvivors(), counts = huntCounts();
  const X = (i) => 62 + i * 33, same = (p, q) => p[0] === q[0] && p[1] === q[1];
  const hint = H.reveal ? "purple: the entangled pair · gold, dashed: two seats holding one card — the hunt cannot tell them apart"
    : R > 0 && surv.length <= 2 ? "two pairs left — and no round will ever separate them. one is entangled. the other?"
    : R > 0 ? "read the row under the grid: every seat alone passes about half the time — nothing to see on any single seat" : "entangled photons asked the same question always answer alike — that is the only handle we have";
  return (
    <div>
      <svg viewBox="0 0 900 530" style={svgStyle}>
        <Txt x={450} y={30} size={15} fill={INK} bold>{R === 0 ? `${H.N} seats · two of them left one source together · nobody knows which` : `round ${R} of ${MAXR} · everyone asked the ${H.rounds[R - 1].angle}° sheet`}</Txt>
        {Array.from({ length: H.N }, (_, i) => { const inS = R > 0 && surv.some(([a, b]) => a === i || b === i), ent = H.reveal && H.ent.includes(i), card = H.reveal && H.card.includes(i);
          return <g key={i}>
            <Txt x={X(i)} y={70} size={12} fill={ent ? PURP : card ? GOLD : inS ? INK : SOFT} bold={inS || ent || card}>{i + 1}</Txt>
            {R > 0 && <Txt x={X(i)} y={406} size={10}>{`${Math.round(100 * H.rounds.filter((r) => r.ans[i]).length / R)}%`}</Txt>}
          </g>; })}
        {H.rounds.map((r, k) => <g key={k}>
          <Txt x={32} y={100 + k * 26} size={11} anchor="end">{r.angle + "°"}</Txt>
          {r.ans.map((a, i) => <rect key={i} x={X(i) - 10} y={87 + k * 26} width={20} height={18} rx="3" fill={a ? GOLD : "#FFFFFF"} stroke={a ? GOLD : LBLUE} strokeWidth="1.25" />)}
        </g>)}
        {R === 0 && <Txt x={450} y={240} size={14}>one sheet angle for the whole room · pass ■ or absorbed □ · strike every pair that disagrees</Txt>}
        {R > 0 && surv.length <= 16 && surv.map(([i, j]) => { const ent = same([i, j], H.ent), card = same([i, j], H.card), d = Math.min(56, 14 + (j - i) * 2.4);
          return <path key={i + "-" + j} d={`M ${X(i)} 414 Q ${(X(i) + X(j)) / 2} ${414 + d * 2} ${X(j)} 414`} fill="none" stroke={H.reveal ? (ent ? PURP : card ? GOLD : SOFT) : INK} strokeWidth={H.reveal && (ent || card) ? 3 : 1.5} strokeDasharray={H.reveal && card ? "6 4" : undefined} opacity={H.reveal && !ent && !card ? 0.35 : 0.9} />; })}
        {R > 0 && surv.length > 16 && <Txt x={450} y={450} size={14}>{surv.length + " pairs still agree on every round — too many to draw. keep asking"}</Txt>}
        <Txt x={450} y={500} size={14} fill={INK} bold>{R === 0 ? counts[0] + " pairs could be the one" : "pairs still agreeing on every round: " + counts.join(" → ")}</Txt>
        <Txt x={450} y={521} size={13}>{hint}</Txt>
      </svg>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 6, flexWrap: "wrap" }}>
        <Button onClick={() => R < MAXR && huntRound()} active={R < MAXR}>ask everyone the same angle</Button>
        <Button ghost onClick={() => { HUNT.reveal = !HUNT.reveal; huntEmit(); }}>{H.reveal ? "hide the source's secret" : "reveal the source's secret"}</Button>
        <Button ghost onClick={() => { huntSecret(); huntEmit(); }}>new secret pair</Button>
      </div>
    </div>
  );
}
function bellRound() {
  const e = { a1: pick3(), a2: pick3() }, v = bit(); e.r1 = v; e.r2 = e.a1 === e.a2 ? v : (Math.random() < 0.25 ? v : 1 - v);   // cos²(60°) = ¼
  const c = { a1: pick3(), a2: pick3() }, odd = pick3(), w = bit(); c.r1 = c.a1 === odd ? 1 - w : w; c.r2 = c.a2 === odd ? 1 - w : w; // the best card: two alike, one odd
  HUNT.test.push({ e, c });
}
function bellStats(key) {
  let nd = 0, sd = 0, ns = 0, ss = 0, p1 = 0; const hist = [];
  HUNT.test.forEach((t) => { const r = t[key]; if (r.a1 === r.a2) { ns++; if (r.r1 === r.r2) ss++; } else { nd++; if (r.r1 === r.r2) sd++; } p1 += r.r1; hist.push(nd ? sd / nd : null); });
  return { nd, sd, ns, ss, p1, hist };
}
function BellPanel({ x, seats, st, n, reveal, isEnt }) {
  const top = 92, bot = 320, L = x + 44, W = 332, Y = (f) => bot - (Math.min(f, 0.62) / 0.62) * (bot - top), NN = Math.max(40, n);
  const pts = st.hist.map((f, k) => (f == null ? null : [L + (k / (NN - 1)) * W, Y(f)])).filter(Boolean);
  const col = reveal ? (isEnt ? PURP : GOLD) : INK, pct = (a, b) => (b ? Math.round((100 * a) / b) + " %" : "—");
  return (
    <g>
      <Txt x={x + 200} y={64} size={15} fill={col} bold>{`seats ${seats[0] + 1} & ${seats[1] + 1}${reveal ? (isEnt ? " · the entangled pair" : " · one shared card") : ""}`}</Txt>
      <rect x={L} y={top} width={W} height={bot - top} fill="none" stroke={LBLUE} strokeWidth="1.5" />
      {[0, 0.25, 1 / 3, 0.5].map((f, i) => <Txt key={i} x={L - 8} y={Y(f) + 4} size={11} anchor="end">{["0", "¼", "⅓", "½"][i]}</Txt>)}
      <line x1={L} x2={L + W} y1={Y(1 / 3)} y2={Y(1 / 3)} stroke={SOFT} strokeWidth="1.5" strokeDasharray="6 4" />
      <Txt x={L + W - 6} y={Y(1 / 3) - 6} size={11} anchor="end">any card: ⅓ or more</Txt>
      <line x1={L} x2={L + W} y1={Y(0.25)} y2={Y(0.25)} stroke={GOLD} strokeWidth="1.5" />
      <Txt x={L + W - 6} y={Y(0.25) + 15} size={11} anchor="end" fill={GOLD}>photons: cos²60° = ¼</Txt>
      {pts.length > 1 && <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={col} strokeWidth="2.5" />}
      {pts.length > 0 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="6" fill={col} stroke="#FFFFFF" strokeWidth="1.5" />}
      <Txt x={L} y={352} size={13} fill={INK} anchor="start" bold>{`different angles · same answer ${st.sd} of ${st.nd} · ${pct(st.sd, st.nd)}`}</Txt>
      <Txt x={L} y={376} size={13} anchor="start">{`same angle · same answer ${st.ss} of ${st.ns} · ${pct(st.ss, st.ns)}`}</Txt>
      <Txt x={L} y={400} size={13} anchor="start">{`seat ${seats[0] + 1} alone · passes ${pct(st.p1, n)} — a fair coin`}</Txt>
    </g>
  );
}
function FigBellRoom() {
  const H = useHunt();
  const n = H.test.length;
  const pairs = [{ key: "e", seats: H.ent }, { key: "c", seats: H.card }].sort((a, b) => a.seats[0] - b.seats[0]);
  const run = (k) => { for (let i = 0; i < k; i++) bellRound(); huntEmit(); };
  return (
    <div>
      <svg viewBox="0 0 900 450" style={svgStyle}>
        <Txt x={450} y={30} size={15} fill={INK} bold>{n === 0 ? "the two pairs the hunt left · now each seat is asked its own angle: 0°, 60° or 120°" : `${n} rounds · how often do the two seats answer alike when asked different angles?`}</Txt>
        {pairs.map((p, i) => <BellPanel key={p.key} x={40 + i * 420} seats={p.seats} st={bellStats(p.key)} n={n} reveal={H.testReveal} isEnt={p.key === "e"} />)}
        <Txt x={450} y={438} size={13}>{H.testReveal ? "the hunt could not separate them; this question can — and no single seat ever showed a thing" : "a card with three answers has at least two alike: ⅓ is the floor for anything written in advance"}</Txt>
      </svg>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 6, flexWrap: "wrap" }}>
        <Button onClick={() => run(1)}>one round</Button>
        <Button onClick={() => run(20)}>+ 20 rounds</Button>
        <Button ghost onClick={() => { HUNT.testReveal = !HUNT.testReveal; huntEmit(); }}>{H.testReveal ? "hide which is which" : "reveal which is which"}</Button>
        <Button ghost onClick={() => { HUNT.test = []; HUNT.testReveal = false; huntEmit(); }}>start over</Button>
      </div>
    </div>
  );
}

// bundled builds may evaluate this module before ../room/*.js has run: hold each figure until window.Room exists
function whenRoom(Fig) {
  return function RoomGate(props) {
    const [ok, setOk] = useState(!!window.Room);
    useEffect(() => { if (ok) return; const t = setInterval(() => { if (window.Room) { setOk(true); clearInterval(t); } }, 100); return () => clearInterval(t); }, [ok]);
    return ok ? React.createElement(Fig, props) : null;
  };
}
const FIGS = { FigJoin, FigJoinQR, FigCoinsRow, FigBeamsRow, FigFlipRoom, FigRoundPlane, FigTwoBands, FigSplitRoom, FigTwoSheets3D, FigBlendRoom, FigDoubtsRoom, FigWaveRoom, FigWaveRoom2, FigMalusRoom, FigBarsRoom, FigHalfPlaneRoom, FigArcRoom, FigNeedleRoom,
  FigLensRoom, FigPhotonRoom, FigLightRound, FigTurnRoom, FigSurveyRoom, FigMixRoom, FigQuestionRoom, FigSwapRoom, FigProjectRoom, FigThreeLensRoom, FigDoubleRoom, FigTwinsRoom,
  FigShadowRoom, FigGlassBench, FigImpostorRoom, FigUndoRoom, FigBallRoom, FigBallRound, FigMZRoom, FigReceiptRoom, FigDecohereRoom, FigHuntRoom, FigBellRoom };
module.exports = Object.fromEntries(Object.entries(FIGS).map(([k, F]) => [k, whenRoom(F)]));
