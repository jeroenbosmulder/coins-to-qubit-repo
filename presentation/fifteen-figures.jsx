/* Interactive figures for the Fifteen Steps deck — grab points directly, no sliders.
   Geometry + palette follow the tutorial's interactives (next/build-your-own-qubit.jsx).
   Sync: drags in the presenter window broadcast state; the ?present mirror applies it. */
const { useState, useRef, useEffect } = React;

const figBC = 'BroadcastChannel' in window ? new BroadcastChannel('three-arches-figs') : null;
const isMirror = /[?&]present/.test(location.search) || location.hash.indexOf('present') >= 0;
const figCache = {};
if (figBC) {
  if (isMirror) figBC.postMessage({ hello: true });
  else figBC.addEventListener('message', (e) => {
    if (e.data && e.data.hello) Object.keys(figCache).forEach((k) => figBC.postMessage({ fig: k, state: figCache[k] }));
  });
}
function useSynced(figKey, initial) {
  const [st, setSt] = useState(initial);
  useEffect(() => {
    if (!figBC || !isMirror) return;
    const fn = (e) => { const d = e.data; if (d && d.fig === figKey) setSt(d.state); };
    figBC.addEventListener('message', fn);
    return () => figBC.removeEventListener('message', fn);
  }, []);
  const set = (updater) => setSt((prev) => {
    const next = typeof updater === 'function' ? updater(prev) : updater;
    if (figBC && !isMirror) { figCache[figKey] = next; figBC.postMessage({ fig: figKey, state: next }); }
    return next;
  });
  return [st, set];
}

const INK = "#002157", SOFT = "#5C6E8F", GOLD = "#EE7203", TEAL = "#00A1E4",
      RED = "#F71D25", LBLUE = "#AFE0F7", PEACH = "#FDE9D3", GRID = "#E1F3FC";
const MONO = "'IBM Plex Mono', 'Courier New', monospace";
const PURP = "#6D3FC0";
const DEG = 180 / Math.PI;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const norm360 = (a) => ((a % 360) + 360) % 360;

function useFig(onMove) {
  const ref = useRef(null);
  const act = useRef(null);
  const loc = (e) => {
    const s = ref.current, r = s.getBoundingClientRect(), vb = s.viewBox.baseVal;
    return { x: (e.clientX - r.left) * vb.width / r.width, y: (e.clientY - r.top) * vb.height / r.height };
  };
  return {
    ref,
    down: (id) => (e) => { act.current = id; e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); e.preventDefault(); },
    move: (e) => { if (act.current != null) onMove(act.current, loc(e)); },
    up: () => { act.current = null; },
  };
}

function Grab({ x, y, r = 11, fill, stroke = INK, onDown }) {
  return (
    <g style={{ cursor: "grab" }} onPointerDown={onDown}>
      <circle cx={x} cy={y} r={30} fill="rgba(0,0,0,0)" />
      <circle cx={x} cy={y} r={r + 7} fill="none" stroke={fill === "#FFFFFF" ? stroke : fill} strokeWidth="1.5" opacity="0.45" />
      <circle cx={x} cy={y} r={r} fill={fill} stroke={stroke} strokeWidth="3" />
    </g>
  );
}

function Txt({ x, y, size = 16, fill = SOFT, anchor = "middle", bold, transform, children }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontFamily={MONO} fontSize={size}
      fontWeight={bold ? 600 : 400} fill={fill} transform={transform}>{children}</text>
  );
}

function Button({ onClick, ghost, children }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: MONO, fontSize: 15, fontWeight: 600, letterSpacing: 0.4,
      padding: "6px 12px", borderRadius: 8, cursor: "pointer",
      background: ghost ? "#FFFFFF" : GOLD, color: ghost ? INK : "#FFFFFF",
      border: ghost ? `2px solid ${LBLUE}` : `2px solid ${INK}`,
    }}>{children}</button>
  );
}

const svgStyle = { width: "100%", display: "block", touchAction: "none", userSelect: "none" };

/* deterministic pseudo-random from a seed so both windows draw identical outcomes */
function seeded(seed) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
}

// ── STEP 1 : flip a fair coin ──
function FigFlip() {
  const [st, setSt] = useSynced("s1flip", { n: 0, seed: 7 });
  const rnd = seeded(st.seed);
  const flips = Array.from({ length: st.n }, () => (rnd() < 0.5 ? 1 : 0));
  const nH = flips.reduce((a, b) => a + b, 0);
  // running fraction path
  let run = "", h = 0;
  flips.forEach((v, i) => { h += v; const x = 90 + (i / Math.max(1, st.n - 1)) * 720; run += `${x.toFixed(1)},${(430 - 280 * (h / (i + 1))).toFixed(1)} `; });
  const shown = flips.slice(-40);
  return (
    <div>
      <svg viewBox="0 0 900 500" style={svgStyle}>
        <line x1="90" y1="430" x2="810" y2="430" stroke={INK} strokeWidth="3" />
        <line x1="90" y1="150" x2="810" y2="150" stroke={INK} strokeWidth="3" opacity="0.25" />
        <line x1="90" y1="290" x2="810" y2="290" stroke={SOFT} strokeWidth="2.5" strokeDasharray="8 7" />
        <Txt x={62} y={438} anchor="end">0</Txt>
        <Txt x={62} y={298} anchor="end">½</Txt>
        <Txt x={62} y={158} anchor="end">1</Txt>
        <Txt x={450} y={478} size={16}>running fraction of heads, flip by flip</Txt>
        {st.n > 1 && <polyline points={run} fill="none" stroke={GOLD} strokeWidth="4" strokeLinejoin="round" />}
        {st.n > 0 && (() => { const x = 810, y = 430 - 280 * (nH / st.n); return <circle cx={x - 0} cy={y} r="10" fill={GOLD} stroke={INK} strokeWidth="3" />; })()}
        {shown.map((v, i) => (
          <circle key={i} cx={110 + i * 17.5} cy={80} r={7} fill={v ? GOLD : "#FFFFFF"} stroke={v ? INK : SOFT} strokeWidth="2.5" />
        ))}
        <Txt x={450} y={40} size={17} fill={INK} bold>
          {st.n === 0 ? "no flips yet — what do you expect to see?" : `${st.n} flips · heads ${nH} · fraction ${(nH / st.n).toFixed(2)}`}
        </Txt>
      </svg>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 6 }}>
        <Button onClick={() => setSt((s) => ({ ...s, n: s.n + 1 }))}>flip once</Button>
        <Button onClick={() => setSt((s) => ({ ...s, n: s.n + 25 }))}>flip ×25</Button>
        <Button ghost onClick={() => setSt({ n: 0, seed: (Math.random() * 1e9) | 0 })}>reset</Button>
      </div>
    </div>
  );
}

// ── STEP 2 : three mystery coins ──
function FigMystery() {
  const [st, setSt] = useSynced("s2myst", { seed: 11, seqs: [[], [], []], guess: ["", "", ""], revealed: false });
  const r0 = seeded(st.seed);
  const order = [0, 1, 2].sort(() => r0() - 0.5); // which slot is fair / biased / deterministic
  const detSide = r0() < 0.5 ? 1 : 0;
  const kinds = ["fair", "biased", "deterministic"];
  const pOf = (slot) => (order[slot] === 0 ? 0.5 : order[slot] === 1 ? 0.8 : detSide);
  const detail = (slot) => (order[slot] === 0 ? "p = ½" : order[slot] === 1 ? "p = 0.8" : detSide ? "always H" : "always T");
  const flip = (slot) => setSt((s) => {
    const seqs = s.seqs.map((x) => x.slice());
    const rr = seeded((s.seed ^ (slot * 7919)) + seqs[slot].length * 131);
    for (let i = 0; i < 10; i++) seqs[slot].push(rr() < pOf(slot) ? 1 : 0);
    return { ...s, seqs: seqs.map((q) => q.slice(-30)) };
  });
  const setGuess = (slot, o) => setSt((s) => ({ ...s, guess: s.guess.map((g, j) => (j === slot ? o : g)) }));
  const chip = (v, j) => (
    <span key={j} style={{ width: 40, height: 40, boxSizing: "border-box", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 18, fontWeight: 600, background: v ? GOLD : "#FFFFFF", color: v ? "#FFFFFF" : INK, border: `2px solid ${v ? GOLD : LBLUE}` }}>{v ? "H" : "T"}</span>
  );
  return (
    <div style={{ fontFamily: MONO, color: INK, display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", gap: 36 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", justifyContent: "center" }}>
        {[0, 1, 2].map((i) => {
          const q = st.seqs[i], n = q.length, h = q.reduce((a, b) => a + b, 0);
          const right = st.guess[i] === kinds[order[i]];
          return (
            <div key={i} style={{ flex: "none", width: 308, boxSizing: "border-box", background: "#FFFFFF", border: `2px solid ${LBLUE}`, borderRadius: 12, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 13, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%" }}>
                <span style={{ fontSize: 20, fontWeight: 600 }}>{`Coin ${"ABC"[i]}`}</span>
                <Button onClick={() => flip(i)}>flip ×10</Button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 40px)", gridAutoRows: "40px", gap: 6, height: 224, flex: "none", justifyContent: "center" }}>{q.map(chip)}</div>
              <div style={{ fontSize: 18, color: n ? INK : "#8AA0BE", whiteSpace: "nowrap", flex: "none" }}>{n ? `${n} flips · %H = ${Math.round((100 * h) / n)}%` : "unflipped"}</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "nowrap", flex: "none" }}>
                {kinds.map((o) => (
                  <button key={o} onClick={() => setGuess(i, o)} style={{ fontFamily: MONO, fontSize: 14, padding: "4px 8px", borderRadius: 14, whiteSpace: "nowrap", border: `2px solid ${st.guess[i] === o ? GOLD : LBLUE}`, background: st.guess[i] === o ? PEACH : "transparent", color: INK, cursor: "pointer" }}>{o}</button>
                ))}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, minHeight: 26, flex: "none", whiteSpace: "nowrap", color: right ? TEAL : RED }}>
                {st.revealed ? `${right ? "✓" : "✗"} ${kinds[order[i]]} · ${detail(i)}` : " "}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
        <Button onClick={() => setSt((s) => ({ ...s, revealed: true }))}>reveal</Button>
        <Button ghost onClick={() => setSt({ seed: (Math.random() * 1e9) | 0, seqs: [[], [], []], guess: ["", "", ""], revealed: false })}>new coins</Button>
      </div>
    </div>
  );
}

// ── STEP 3 : two numbers per run ──
function FigScatter() {
  const [st, setSt] = useSynced("s3scat", { runs: [] });
  const run = () => setSt((s) => {
    const one = (kind, p) => {
      let h = 0;
      for (let i = 0; i < 30; i++) if (Math.random() < p) h++;
      const ph = h / 30;
      return { p: ph, s: Math.sqrt(ph * (1 - ph)), kind };
    };
    const pts = [];
    for (let k = 0; k < 8; k++) {
      pts.push(one("fair", 0.5), one("bias", 0.8), one("det", Math.random() < 0.5 ? 0 : 1));
    }
    return { runs: [...s.runs, ...pts].slice(-240) };
  });
  const X = (p) => 150 + 600 * p, Y = (s) => 430 - 600 * s;
  return (
    <div>
      <svg viewBox="0 0 900 500" style={svgStyle}>
        <line x1="90" y1="430" x2="810" y2="430" stroke={INK} strokeWidth="3" />
        <line x1="150" y1="430" x2="150" y2="115" stroke={INK} strokeWidth="3" />
        <Txt x={150} y={474}>0</Txt><Txt x={450} y={474}>½</Txt><Txt x={750} y={474}>1</Txt>
        <circle cx="150" cy="430" r="9" fill={INK} /><circle cx="750" cy="430" r="9" fill={INK} />
        <circle cx="450" cy="430" r="7" fill={SOFT} />
        <Txt x={450} y={498} size={16}>average p̂ (fraction of heads)</Txt>
        <Txt x={126} y={136} anchor="end">½</Txt>
        <Txt x={60} y={280} size={16} transform="rotate(-90 60 280)">band width</Txt>
        {st.runs.map((r, i) => (
          <circle key={i} cx={X(r.p)} cy={Y(r.s)} r={7} fill={r.kind === "fair" ? TEAL : r.kind === "bias" ? GOLD : "#FFFFFF"}
            stroke={r.kind === "fair" ? TEAL : r.kind === "bias" ? GOLD : RED} strokeWidth="2.5" opacity="0.55" />
        ))}
        {/* belief markers: expectations, fixed before flipping (white-ring crosses) */}
        <g>
          {[{ p: 0.5, s: 0.5, c: TEAL, l: "fair-coin belief", dx: 0, dy: -26 },
            { p: 0.8, s: 0.4, c: GOLD, l: "biased-coin belief", dx: 118, dy: 6 },
            { p: 0.5, s: 0, c: RED, l: "mystery-coin belief — inside!", dx: 0, dy: -24 }].map((m, i) => (
            <g key={i}>
              <circle cx={X(m.p)} cy={Y(m.s)} r={13} fill="#FFFFFF" stroke={m.c} strokeWidth="3" />
              <line x1={X(m.p) - 16} y1={Y(m.s)} x2={X(m.p) + 16} y2={Y(m.s)} stroke={m.c} strokeWidth="4" />
              <line x1={X(m.p)} y1={Y(m.s) - 16} x2={X(m.p)} y2={Y(m.s) + 16} stroke={m.c} strokeWidth="4" />
              <Txt x={X(m.p) + m.dx} y={Y(m.s) + m.dy} size={15} fill={m.c} bold>{m.l}</Txt>
            </g>
          ))}
        </g>
      </svg>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 6 }}>
        <Button onClick={run}>run 8 experiments of each coin</Button>
        <Button ghost onClick={() => setSt({ runs: [] })}>clear</Button>
      </div>
    </div>
  );
}

// ── STEP 4 : the semicircle ──
function FigArc() {
  const [st, setSt] = useSynced("s4arc", { p: 0.5, ring: false });
  const p = st.p;
  const f = useFig((id, pt) => setSt((s) => ({ ...s, p: clamp((pt.x - 150) / 600, 0, 1) })));
  const X = (q) => 150 + 600 * q, BY = 400;
  const sd = Math.sqrt(Math.max(0, p * (1 - p)));
  const P = { x: X(p), y: BY - 600 * sd };
  const T = { x: X(0), y: BY }, H = { x: X(1), y: BY };
  const u1 = { x: T.x - P.x, y: T.y - P.y }, u2 = { x: H.x - P.x, y: H.y - P.y };
  const L1 = Math.hypot(u1.x, u1.y) || 1, L2 = Math.hypot(u2.x, u2.y) || 1;
  const m = 22, a1 = { x: P.x + m * u1.x / L1, y: P.y + m * u1.y / L1 }, a2 = { x: P.x + m * u2.x / L2, y: P.y + m * u2.y / L2 };
  const a3 = { x: a1.x + m * u2.x / L2, y: a1.y + m * u2.y / L2 };
  const RR = 300;
  const Tp = { x: P.x + RR * u1.x / L1, y: P.y + RR * u1.y / L1 };
  const Hp = { x: P.x + RR * u2.x / L2, y: P.y + RR * u2.y / L2 };
  return (
    <div style={{ width: "100%" }}>
    <svg ref={f.ref} viewBox="0 -44 900 514" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
      <line x1="90" y1={BY} x2="810" y2={BY} stroke={INK} strokeWidth="3" />
      <line x1={X(0)} y1="40" x2={X(0)} y2="445" stroke={INK} strokeWidth="2.5" />
      <Txt x={X(0) + 26} y={64} size={17} fill={INK} bold anchor="start">band width</Txt>
      <Txt x={885} y={BY - 22} size={17} fill={INK} bold anchor="end">p = P(heads)</Txt>
      <path d={`M ${X(0)} ${BY} A 300 300 0 0 1 ${X(1)} ${BY}`} fill="none" stroke={GOLD} strokeWidth="5" strokeDasharray="10 9" />
      {st.ring && (() => {
        const C = { x: X(0.5), y: BY };
        const thP = Math.atan2(BY - P.y, P.x - C.x); // standard angle of C→P, 0..π
        const ang = thP * 180 / Math.PI;              // angle H–C–P in degrees
        const r1 = 58, mid = thP / 2;
        const ax1 = C.x + r1, ay1 = C.y;
        const ax2 = C.x + r1 * Math.cos(thP), ay2 = C.y - r1 * Math.sin(thP);
        return (<g>
        <path d={`M ${Tp.x} ${Tp.y} A ${RR} ${RR} 0 0 0 ${Hp.x} ${Hp.y}`} fill="none" stroke={PURP} strokeWidth="4.5" strokeDasharray="12 10" opacity="0.85" />
        <circle cx={Tp.x} cy={Tp.y} r={8} fill={PURP} />
        <circle cx={Hp.x} cy={Hp.y} r={8} fill={PURP} />
        <Txt x={Tp.x - 14} y={Tp.y + 34} size={17} fill={PURP} bold>T′</Txt>
        <Txt x={Hp.x + 14} y={Hp.y + 34} size={17} fill={PURP} bold>H′</Txt>
      </g>);
      })()}
      {(() => {
        const C = { x: X(0.5), y: BY };
        const thP = Math.atan2(BY - P.y, P.x - C.x);
        const ang = thP * 180 / Math.PI, r1 = 58, mid = thP / 2;
        const ax2 = C.x + r1 * Math.cos(thP), ay2 = C.y - r1 * Math.sin(thP);
        return (<g>
          <path d={`M ${C.x + r1} ${C.y} A ${r1} ${r1} 0 0 0 ${ax2} ${ay2}`} fill="none" stroke={RED} strokeWidth="3" />
          <Txt x={C.x + 92 * Math.cos(mid)} y={C.y - 92 * Math.sin(mid) + 6} size={15} fill={RED} bold>{`${Math.round(ang)}°`}</Txt>
        </g>);
      })()}
      <line x1={T.x} y1={T.y} x2={P.x} y2={P.y} stroke={TEAL} strokeWidth="5" strokeLinecap="round" />
      <line x1={H.x} y1={H.y} x2={P.x} y2={P.y} stroke={GOLD} strokeWidth="5" strokeLinecap="round" />
      {sd > 0.1 && <path d={`M ${a1.x} ${a1.y} L ${a3.x} ${a3.y} L ${a2.x} ${a2.y}`} fill="none" stroke={INK} strokeWidth="2" />}
      {(() => { const mx = (T.x + P.x) / 2, my = (T.y + P.y) / 2; return <Txt x={mx - 30} y={my - 14} size={19} fill={TEAL} bold>√p</Txt>; })()}
      {(() => { const mx = (H.x + P.x) / 2, my = (H.y + P.y) / 2; return <Txt x={mx + 44} y={my - 14} size={19} fill={GOLD} bold>√(1−p)</Txt>; })()}
      {(() => {
        const C = { x: X(0.5), y: BY };
        const dx = C.x - P.x, dy = C.y - P.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
        const tipx = C.x - 2 * ux, tipy = C.y - 2 * uy;
        return (<g>
          <line x1={P.x + 16 * ux} y1={P.y + 16 * uy} x2={tipx - 10 * ux} y2={tipy - 10 * uy} stroke={PURP} strokeWidth="4" />
          <polygon points={`${tipx},${tipy} ${tipx - 16 * ux - 8 * uy},${tipy - 16 * uy + 8 * ux} ${tipx - 16 * ux + 8 * uy},${tipy - 16 * uy - 8 * ux}`} fill={PURP} />
          <Txt x={(P.x + C.x) / 2 - 18 * uy - 6} y={(P.y + C.y) / 2 + 18 * ux + 6} size={16} fill={PURP} bold anchor="end">½</Txt>
        </g>);
      })()}
      <circle cx={T.x} cy={T.y} r="9" fill={INK} /><circle cx={H.x} cy={H.y} r="9" fill={INK} />
      <circle cx={X(0.5)} cy={BY} r="7" fill={SOFT} />
      <Txt x={T.x} y={BY + 42} size={16}>always T (p=0)</Txt>
      <Txt x={H.x} y={BY + 42} size={16}>always H (p=1)</Txt>
      <Grab x={P.x} y={P.y} fill={GOLD} onDown={f.down("p")} />
      {(() => {
        const fair = Math.abs(p - 0.5) < 0.02;
        const lbl = fair ? "fair coin (½, ½)" : `your coin (${p.toFixed(2)}, ${sd.toFixed(2)})`;
        return <Txt x={fair || p < 0.5 ? P.x + 28 : P.x - 28} y={P.y - 22} size={17} fill={TEAL} bold anchor={fair || p < 0.5 ? "start" : "end"}>{lbl}</Txt>;
      })()}
      <Txt x={480} y={462} size={16} fill={INK}>{`(p − ½)² + band width² = ¼ — the Bernoulli circle · drag the coin`}</Txt>
      {st.ring && (() => {
        const a = Math.sqrt(Math.max(0, p)) / 2, b = Math.sqrt(Math.max(0, 1 - p)) / 2;
        const ox2 = 740, oy2 = 112, S2 = 230;
        const nx2 = ox2 + a * S2, ny2 = oy2 - b * S2;
        const dl = Math.hypot(nx2 - ox2, ny2 - oy2) || 1, ux2 = (nx2 - ox2) / dl, uy2 = (ny2 - oy2) / dl;
        const bx = nx2 - 11 * ux2, by = ny2 - 11 * uy2;
        return (<g>
          <rect x="698" y="-44" width="200" height="188" rx="12" fill="#FFFFFF" stroke={LBLUE} strokeWidth="2.5" />
          <line x1={ox2} y1={oy2} x2={ox2 + 0.62 * S2} y2={oy2} stroke={GOLD} strokeWidth="3" />
          <line x1={ox2} y1={oy2} x2={ox2} y2={oy2 - 0.62 * S2} stroke={TEAL} strokeWidth="3" />
          <path d={`M ${ox2} ${oy2 - 0.5 * S2} A ${0.5 * S2} ${0.5 * S2} 0 0 1 ${ox2 + 0.5 * S2} ${oy2}`} fill="none" stroke={SOFT} strokeWidth="2" strokeDasharray="6 6" />
          <circle cx={ox2} cy={oy2 - 0.5 * S2} r="5" fill={INK} />
          <Txt x={ox2 - 9} y={oy2 - 0.5 * S2 + 5} size={13} fill={INK} bold anchor="end">T′</Txt>
          <circle cx={ox2 + 0.5 * S2} cy={oy2} r="5" fill={INK} />
          <Txt x={ox2 + 0.5 * S2} y={oy2 + 22} size={13} fill={INK} bold>H′</Txt>
          {(() => {
            const t = Math.atan2(-uy2, ux2); // needle standard angle
            const r2 = 44, m2 = t / 2;
            const half = t * 180 / Math.PI;
            return (<g>
              <path d={`M ${ox2 + r2} ${oy2} A ${r2} ${r2} 0 0 0 ${ox2 + r2 * Math.cos(t)} ${oy2 - r2 * Math.sin(t)}`} fill="none" stroke={RED} strokeWidth="2.5" />
              <Txt x={ox2 + 68 * Math.cos(m2)} y={oy2 - 68 * Math.sin(m2) + 5} size={12} fill={RED} bold>{`${Math.round(half)}°`}</Txt>
            </g>);
          })()}
          <line x1={ox2} y1={oy2} x2={bx} y2={by} stroke={PURP} strokeWidth="4" strokeLinecap="round" />
          <polygon points={`${nx2},${ny2} ${bx - 6 * uy2},${by + 6 * ux2} ${bx + 6 * uy2},${by - 6 * ux2}`} fill={PURP} />
        </g>);
      })()}
    </svg>
    <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 10 }}>
      <Button ghost={!st.ring} onClick={() => setSt((s) => ({ ...s, ring: !s.ring }))}>{st.ring ? "hide the ½-circle" : "circle of radius ½ around your coin"}</Button>
    </div>
    </div>
  );
}

// ── STEP 6c : one fixed question, many beams ──
function FigSurvey() {
  const [st, setSt] = useSynced("s6surv", { beta: 63, pts: [] });
  const run30 = (beta) => {
    const pr = Math.cos(beta / DEG) ** 2;
    let h = 0;
    for (let i = 0; i < 30; i++) if (Math.random() < pr) h++;
    const ph = h / 30;
    return { p: ph, s: Math.sqrt(ph * (1 - ph)), mine: false };
  };
  const measure = () => setSt((s) => ({ ...s, pts: [...s.pts, { ...run30(s.beta), mine: true }].slice(-160) }));
  const survey = () => setSt((s) => {
    const add = Array.from({ length: 12 }, (_, k) => run30(4 + (k * 82) / 11));
    return { ...s, pts: [...s.pts, ...add].slice(-160) };
  });
  const X = (q) => 150 + 600 * q, BY = 400;
  return (
    <div style={{ width: "100%" }}>
    <svg viewBox="0 0 900 470" style={svgStyle}>
      <line x1="90" y1={BY} x2="810" y2={BY} stroke={INK} strokeWidth="3" />
      <line x1={X(0)} y1="40" x2={X(0)} y2="445" stroke={INK} strokeWidth="2.5" />
      <Txt x={X(0) + 26} y={64} size={17} fill={INK} bold anchor="start">band width</Txt>
      <Txt x={885} y={BY - 22} size={17} fill={INK} bold anchor="end">p̂ per run</Txt>
      <path d={`M ${X(0)} ${BY} A 300 300 0 0 1 ${X(1)} ${BY}`} fill="none" stroke={GOLD} strokeWidth="4" strokeDasharray="10 9" opacity="0.55" />
      <circle cx={X(0)} cy={BY} r="8" fill={INK} /><circle cx={X(1)} cy={BY} r="8" fill={INK} />
      <Txt x={X(0)} y={BY + 40} size={15}>never passes</Txt>
      <Txt x={X(1)} y={BY + 40} size={15}>always passes</Txt>
      {st.pts.map((r, i) => (
        <circle key={i} cx={X(r.p)} cy={BY - 600 * r.s} r={r.mine ? 9 : 7}
          fill={r.mine ? PURP : GOLD} stroke={r.mine ? INK : "none"} strokeWidth="2" opacity={r.mine ? 0.95 : 0.6} />
      ))}
      {st.pts.length === 0 && <Txt x={450} y={210} size={16}>every run: 30 photons through the same horizontal sheet</Txt>}
      <Txt x={480} y={462} size={16} fill={INK}>the coin's semicircle — redrawn by lamplight</Txt>
    </svg>
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
      <span style={{ fontFamily: MONO, fontSize: 15, color: SOFT, flex: "none" }}>β — your beam's tilt</span>
      <input type="range" min="0" max="90" step="1" value={st.beta} onChange={(ev) => setSt((s) => ({ ...s, beta: +ev.target.value }))} style={{ flex: 1, accentColor: PURP }} />
      <span style={{ fontFamily: MONO, fontSize: 15, color: INK, fontWeight: 700, flex: "none" }}>{`β = ${Math.round(st.beta)}°`}</span>
    </div>
    <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 10 }}>
      <Button onClick={measure}>{`measure your beam (β=${Math.round(st.beta)}°)`}</Button>
      <Button onClick={survey}>survey 12 beam tilts</Button>
      <Button ghost onClick={() => setSt((s) => ({ ...s, pts: [] }))}>reset</Button>
    </div>
    </div>
  );
}

// ── STEP 5 : mixing beliefs (chords fill the half-disk) ──
function FigMix() {
  const [st, setSt] = useSynced("mix", { q1: 0, q2: 1, lam: 0.5 });
  const { q1, q2, lam } = st;
  const A = (q) => ({ x: 150 + 600 * q, y: 430 - 600 * Math.sqrt(Math.max(0, q * (1 - q))) });
  const P1 = A(q1), P2 = A(q2);
  const f = useFig((id, pt) => {
    if (id === "q1") setSt((s) => ({ ...s, q1: clamp((pt.x - 150) / 600, 0, 1) }));
    else if (id === "q2") setSt((s) => ({ ...s, q2: clamp((pt.x - 150) / 600, 0, 1) }));
    else {
      const dx = P1.x - P2.x, dy = P1.y - P2.y, L2 = dx * dx + dy * dy || 1;
      setSt((s) => ({ ...s, lam: clamp(((pt.x - P2.x) * dx + (pt.y - P2.y) * dy) / L2, 0, 1) }));
    }
  });
  const B = { x: P2.x + lam * (P1.x - P2.x), y: P2.y + lam * (P1.y - P2.y) };
  const m = lam * q1 + (1 - lam) * q2;
  const spread = (430 - B.y) / 600;
  return (
    <svg ref={f.ref} viewBox="0 0 900 520" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
      <path d="M 150 430 A 300 300 0 0 1 750 430 Z" fill={PEACH} fillOpacity="0.5" />
      <line x1="90" y1="430" x2="810" y2="430" stroke={INK} strokeWidth="3" />
      <path d="M 150 430 A 300 300 0 0 1 750 430" fill="none" stroke={GOLD} strokeWidth="5" strokeDasharray="10 9" />
      <line x1={P1.x} y1={P1.y} x2={P2.x} y2={P2.y} stroke={SOFT} strokeWidth="2.5" strokeDasharray="6 5" />
      <circle cx="150" cy="430" r="9" fill={INK} /><circle cx="750" cy="430" r="9" fill={INK} />
      <Txt x={150} y={474}>always T</Txt><Txt x={750} y={474}>always H</Txt>
      <Txt x={P1.x} y={P1.y - 32} fill={TEAL} bold>candidate 1</Txt>
      <Txt x={P2.x - 18} y={P2.y - 40} fill={RED} bold>candidate 2</Txt>
      <Txt x={B.x} y={B.y + 48} fill={GOLD} bold size={17}>your blend</Txt>
      <Grab x={P1.x} y={P1.y} fill={TEAL} onDown={f.down("q1")} />
      <Grab x={P2.x} y={P2.y} fill={RED} onDown={f.down("q2")} />
      <Grab x={B.x} y={B.y} fill={GOLD} onDown={f.down("lam")} />
      <Txt x={450} y={510} size={17} fill={INK}>{`weight ${lam.toFixed(2)} · average ${m.toFixed(2)} · spread ${spread.toFixed(2)}`}</Txt>
    </svg>
  );
}

// ── STEPS 6 & 12 : the two-wiggle wave (step 12 unlocks the timing dial δ) ──
function WaveCore({ figKey, withDelay }) {
  const [st, setSt] = useSynced(figKey, { beta: 30, delta: withDelay ? 90 : 0, run: true });
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!st.run) return;
    let id;
    const loop = () => { setT((x) => x + 0.045); id = requestAnimationFrame(loop); };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [st.run]);
  const beta = st.beta, delta = st.delta;
  const br = beta / DEG, a = Math.cos(br), b = Math.sin(br), d = delta / DEG;
  const N = 46, x0 = 40, x1 = 470, yH = 120, yV = 300, amp = 66;
  const pts = (A, ph) => Array.from({ length: N + 1 }, (_, i) => {
    const x = x0 + (i * (x1 - x0)) / N;
    return `${x.toFixed(1)},${(-A * amp * Math.sin(i * 0.3 - t - ph)).toFixed(1)}`;
  }).join(" ");
  const fcx = 690, fcy = 210, fr = 130;
  const trail = Array.from({ length: 36 }, (_, k) => {
    const tt = t - k * 0.13;
    return [fcx + fr * a * Math.sin(tt), fcy - fr * b * Math.sin(tt - d), 1 - k / 38];
  });
  // drag: front-view handle sets beta (line angle); outer ring sets delta
  const bh = { x: fcx + (fr + 34) * Math.cos(br), y: fcy - (fr + 34) * Math.sin(br) };
  const dh = { x: fcx + (fr + 70) * Math.cos(d), y: fcy - (fr + 70) * Math.sin(d) };
  const f = useFig((id, pt) => {
    const ang = norm360(Math.atan2(fcy - pt.y, pt.x - fcx) * DEG);
    if (id === "beta") setSt((s) => ({ ...s, beta: clamp(ang > 180 ? 0 : ang, 0, 90) }));
    else setSt((s) => ({ ...s, delta: ang }));
  });
  const shape = !withDelay || delta % 180 === 0 ? "a tilted line" :
    (Math.abs(beta - 45) < 3 && (Math.abs(delta - 90) < 4 || Math.abs(delta - 270) < 4)) ? "a circle!" : "an ellipse";
  // sheet-reading curve I(θ) for the current wave — the rotating sheet's verdict
  const I = (thd) => {
    const c = Math.cos(thd / DEG), s = Math.sin(thd / DEG);
    return a * a * c * c + b * b * s * s + 2 * a * b * Math.cos(d) * s * c;
  };
  let breath = "";
  for (let tt = 0; tt <= 180; tt += 2) breath += `${(90 + tt * 4).toFixed(1)},${(250 - 180 * I(tt)).toFixed(1)} `;
  const flat = Math.abs(a * a - 0.5) < 0.02 && Math.abs(Math.cos(d)) < 0.06;
  return (
    <div style={withDelay ? { display: "flex", gap: 14, alignItems: "center" } : undefined}>
      <div style={{ flex: 1, minWidth: 0 }}>
      <svg ref={f.ref} viewBox="0 0 900 430" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
        <line x1={x0} y1={yH} x2={x1} y2={yH} stroke={LBLUE} strokeWidth="1.5" />
        <line x1={x0} y1={yV} x2={x1} y2={yV} stroke={LBLUE} strokeWidth="1.5" />
        <g transform={`translate(0 ${yH})`}><polyline points={pts(a, 0)} fill="none" stroke={GOLD} strokeWidth="5" strokeLinejoin="round" /></g>
        <g transform={`translate(0 ${yV})`}><polyline points={pts(b, d)} fill="none" stroke={TEAL} strokeWidth="5" strokeLinejoin="round" /></g>
        <Txt x={x0} y={34} anchor="start" size={16} fill={GOLD} bold>{`H wiggle · a = ${a.toFixed(2)}`}</Txt>
        <Txt x={x0} y={222} anchor="start" size={16} fill={TEAL} bold>{`V wiggle · b = ${b.toFixed(2)}`}</Txt>
        <Txt x={x0} y={412} anchor="start" size={14}>the wave, flying to the right →</Txt>
        <rect x={fcx - fr - 14} y={fcy - fr - 14} width={2 * fr + 28} height={2 * fr + 28} rx={14} fill="#FFFFFF" stroke={LBLUE} strokeWidth="2.5" />
        <line x1={fcx - fr} y1={fcy} x2={fcx + fr} y2={fcy} stroke={GRID} strokeWidth="2" />
        <line x1={fcx} y1={fcy - fr} x2={fcx} y2={fcy + fr} stroke={GRID} strokeWidth="2" />
        {trail.map(([x, y, o], k) => (
          <circle key={k} cx={x} cy={y} r={k === 0 ? 9 : 4.5} fill={INK} opacity={k === 0 ? 1 : 0.3 * o} />
        ))}
        <Txt x={fcx} y={fcy + fr + 42} size={14}>{`front view · ${shape}`}</Txt>
        <path d={`M ${fcx + fr + 34} ${fcy} A ${fr + 34} ${fr + 34} 0 0 0 ${fcx} ${fcy - fr - 34}`} fill="none" stroke={GOLD} strokeWidth="2" strokeDasharray="3 6" opacity="0.6" />
        <Grab x={bh.x} y={bh.y} r={10} fill={GOLD} onDown={f.down("beta")} />
        <Txt x={bh.x + 20} y={bh.y - 12} anchor="start" size={14} fill={GOLD} bold>β</Txt>
        {withDelay && <>
          <circle cx={fcx} cy={fcy} r={fr + 70} fill="none" stroke={TEAL} strokeWidth="2" strokeDasharray="3 6" opacity="0.6" />
          <Grab x={dh.x} y={dh.y} r={10} fill={TEAL} onDown={f.down("delta")} />
          <Txt x={dh.x} y={dh.y - 22} size={14} fill={TEAL} bold>δ</Txt>
        </>}
      </svg>
      {withDelay && (
        <svg viewBox="0 0 900 300" style={{ ...svgStyle, marginTop: 10 }}>
          <line x1="90" y1="250" x2="810" y2="250" stroke={INK} strokeWidth="3" />
          <line x1="90" y1="70" x2="810" y2="70" stroke={INK} strokeWidth="2" opacity="0.25" />
          <line x1="90" y1="160" x2="810" y2="160" stroke={SOFT} strokeWidth="2" strokeDasharray="7 6" />
          <text x="62" y="258" textAnchor="end" fontFamily={MONO} fontSize="14" fill={SOFT}>0</text>
          <text x="62" y="168" textAnchor="end" fontFamily={MONO} fontSize="14" fill={SOFT}>½</text>
          <text x="62" y="78" textAnchor="end" fontFamily={MONO} fontSize="14" fill={SOFT}>1</text>
          <polyline points={breath} fill="none" stroke={flat ? RED : GOLD} strokeWidth="5" strokeLinejoin="round" />
          <Txt x={450} y={290} size={14}>sheet reading vs. sheet angle θ (0°…180°)</Txt>
          <Txt x={450} y={38} size={16} fill={flat ? RED : INK} bold>
            {flat ? "FLAT — every sheet reads: \u201cdead center, same as the bulb\u201d" : "breathing — a rotating sheet can see this beam"}
          </Txt>
        </svg>
      )}
      </div>
      <div style={withDelay ? { width: 170, flex: "none", display: "flex", flexDirection: "column", gap: 12, alignItems: "stretch", textAlign: "center" } : { display: "flex", gap: 14, justifyContent: "center", alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
        {!withDelay && <Button onClick={() => setSt((s) => ({ ...s, delta: s.delta === 0 ? 180 : 0 }))}>
          {delta === 0 ? "wiggles in step → flip one" : "opposite step → put back in step"}
        </Button>}
        <Button ghost onClick={() => setSt((s) => ({ ...s, run: !s.run }))}>{st.run ? "pause" : "play"}</Button>
        <span style={{ fontFamily: MONO, fontSize: 15, color: INK }}>
          {withDelay ? `β = ${Math.round(beta)}° · δ = ${Math.round(delta)}°` : `β = ${Math.round(beta)}° · b = ${delta === 180 ? "−" : "+"}${b.toFixed(2)}`}
        </span>
      </div>
    </div>
  );
}
function FigWave() { return <WaveCore figKey="s6wave" withDelay={false} />; }

// ── STEP 6a : the wave in space — side-on wiggles + front view, plus drag-to-turn 3D ──
function FigWave3D() {
  const [st, setSt] = useSynced("s6wave3d", { beta: 30, delta: 0, run: false, yaw: 64, pitch: 16, mode: "wiggles" });
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
        if (Math.abs(g.yaw - ny) < 0.25 && Math.abs(g.pitch - np) < 0.25) {
          tgt.current = null; setSt((s) => ({ ...s, yaw: g.yaw, pitch: g.pitch }));
        } else setSt((s) => ({ ...s, yaw: ny, pitch: np }));
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);
  const onDown = (e) => { e.currentTarget.setPointerCapture?.(e.pointerId); tgt.current = null; drag.current = { x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch }; };
  const onMove = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
    setSt((s) => ({ ...s, yaw: clamp(drag.current.yaw - dx * 0.35, -6, 100), pitch: clamp(drag.current.pitch + dy * 0.35, -22, 22) }));
  };
  const onUp = () => { drag.current = null; };
  const br = st.beta / DEG, a = Math.cos(br), b = Math.sin(br), d = st.delta / DEG;
  const tipH = (tt) => a * Math.sin(tt), tipV = (tt) => b * Math.sin(tt - d);
  const ux = a, uy = b * Math.cos(d);
  // top panel: side-on wiggles + front view
  const N2 = 44, x0 = 25, x1 = 875, yH = 130, yV = 330, amp = 70;
  const pts = (A, ph) => Array.from({ length: N2 + 1 }, (_, i) => {
    const x = x0 + (i * (x1 - x0)) / N2;
    return `${x.toFixed(1)},${(-A * amp * Math.sin(i * 0.32 - t + ph)).toFixed(1)}`;
  }).join(" ");
  const fcx = 66, fcy = 62, fr = 48;
  const trail2 = Array.from({ length: 34 }, (_, k2) => {
    const tt = t - k2 * 0.13;
    return [fcx + fr * tipH(tt), fcy - fr * tipV(tt), 1 - k2 / 36];
  });
  const grid2 = [];
  for (let gx = 20; gx <= 400; gx += 30) grid2.push(<line key={"v" + gx} x1={gx} y1={0} x2={gx} y2={150} stroke={GRID} strokeWidth={0.8} />);
  for (let gy = 15; gy <= 115; gy += 30) grid2.push(<line key={"h" + gy} x1={0} y1={gy} x2={420} y2={gy} stroke={GRID} strokeWidth={0.8} />);
  // bottom panel: the wave in space
  const ps = (st.yaw * Math.PI) / 180, phv = (st.pitch * Math.PI) / 180;
  const cps = Math.cos(ps), sps = Math.sin(ps), cph = Math.cos(phv), sph = Math.sin(phv);
  const W = 900, H = 470, cx = 450, cyy = 235, S = 140;
  const proj = (x, y, z) => {
    const px = x * cps + z * sps, z1 = -x * sps + z * cps;
    return [cx + S * px, cyy - S * (y * cph - z1 * sph)];
  };
  const L = 3.04, A3 = 0.62, N3 = 72, KW = 0.32 * S / ((x1 - x0) / N2), C0 = 0.32 * (cx - x0) / ((x1 - x0) / N2);
  const zs = Array.from({ length: N3 + 1 }, (_, i) => -L + (2 * L * i) / N3);
  const Ex = (z, tt) => A3 * tipH(tt - (KW * z + C0)), Ey = (z, tt) => A3 * tipV(tt - (KW * z + C0));
  const pl = (f) => zs.map((z) => { const [X, Y] = f(z); return `${X.toFixed(1)},${Y.toFixed(1)}`; }).join(" ");
  const hPts = pl((z) => proj(Ex(z, t), 0, z));
  const vPts = pl((z) => proj(0, Ey(z, t), z));
  const sPts = pl((z) => proj(Ex(z, t), Ey(z, t), z));
  const stems = zs.filter((_, i) => i % 6 === 0).map((z, i) => {
    const [xa, ya] = proj(0, 0, z), [xh, yh] = proj(Ex(z, t), 0, z), [xv, yv] = proj(0, Ey(z, t), z), [x2, y2] = proj(Ex(z, t), Ey(z, t), z);
    return (
      <g key={"s" + i}>
        <line x1={xa} y1={ya} x2={xh} y2={yh} stroke={GOLD} strokeWidth={1.6} strokeDasharray="3 5" opacity={0.5} />
        <line x1={xa} y1={ya} x2={xv} y2={yv} stroke={TEAL} strokeWidth={1.6} strokeDasharray="3 5" opacity={0.5} />
        <line x1={xa} y1={ya} x2={x2} y2={y2} stroke={INK} strokeWidth={1.6} opacity={0.13} />
      </g>
    );
  });
  const hs = 0.8;
  const sq = [[-hs, -hs], [hs, -hs], [hs, hs], [-hs, hs]].map(([x, y]) => proj(x, y, -L).map((v) => v.toFixed(1)).join(",")).join(" ");
  const hoF = Math.max(0, 1 - Math.abs(st.yaw) / 26) * Math.max(0, 1 - Math.abs(st.pitch) / 26);
  const cr1 = [proj(-hs, 0, -L), proj(hs, 0, -L)], cr2 = [proj(0, -hs, -L), proj(0, hs, -L)];
  const uc = Array.from({ length: 49 }, (_, i) => {
    const th = (2 * Math.PI * i) / 48;
    return proj(A3 * Math.cos(th), A3 * Math.sin(th), -L).map((v) => v.toFixed(1)).join(",");
  }).join(" ");
  const trail3 = Array.from({ length: 30 }, (_, kk) => {
    const tt = t - kk * 0.13;
    const [X, Y] = proj(Ex(-L, tt), Ey(-L, tt), -L);
    return [X, Y, 1 - kk / 32];
  });
  const axA = proj(0, 0, -L), axB = proj(0, 0, L);
  const grid3 = [];
  return (
    <div style={{ width: "100%" }}>
      {st.mode === "wiggles" ? (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        {grid3}
        <line x1={x0} y1={yH} x2={x1} y2={yH} stroke={LBLUE} strokeWidth={1} />
        <line x1={x0} y1={yV} x2={x1} y2={yV} stroke={LBLUE} strokeWidth={1} />
        <g transform={`translate(0 ${yH})`}><polyline points={pts(a, Math.PI)} fill="none" stroke={GOLD} strokeWidth={4} strokeLinejoin="round" /></g>
        <g transform={`translate(0 ${yV})`}><polyline points={pts(b, Math.PI + d)} fill="none" stroke={TEAL} strokeWidth={4} strokeLinejoin="round" /></g>
        <text x={x0} y={34} fontFamily={MONO} fontSize="16" fill={GOLD} fontWeight="600">H wiggle · size a = {a.toFixed(2)}</text>
        <text x={x0} y={232} fontFamily={MONO} fontSize="16" fill={TEAL} fontWeight="600">V wiggle · size b = {b.toFixed(2)}</text>
        <text x={x0} y={H - 16} fontFamily={MONO} fontSize="15" fill={SOFT}>the two wiggles, side-on · flying to the right →</text>
      </svg>
      ) : (
      <svg viewBox={`0 0 ${W} ${H}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        style={{ width: "100%", display: "block", touchAction: "none", cursor: "grab" }}>
        {grid3}
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
            <polygon points={sq} fill="#fff" fillOpacity={0.92} stroke={LBLUE} strokeWidth={2.5} />
            <line x1={cr1[0][0]} y1={cr1[0][1]} x2={cr1[1][0]} y2={cr1[1][1]} stroke={GRID} strokeWidth={2} />
            <line x1={cr2[0][0]} y1={cr2[0][1]} x2={cr2[1][0]} y2={cr2[1][1]} stroke={GRID} strokeWidth={2} />
            <polygon points={uc} fill="none" stroke={GOLD} strokeWidth={1.6} strokeDasharray="4 6" opacity={0.4} />
          </g>
        )}
        {trail3.map(([X, Y, o], kk) => (
          <circle key={kk} cx={X} cy={Y} r={kk === 0 ? 8 : 3.8} fill={INK} opacity={kk === 0 ? 1 : 0.28 * o} />
        ))}
        {(() => { const [X, Y] = proj(A3 * ux, A3 * uy, -L); return <circle cx={X} cy={Y} r={5} fill="none" stroke={GOLD} strokeWidth={2.2} opacity={0.8} />; })()}
        <text x={25} y={30} fontFamily={MONO} fontSize="16">
          <tspan fill={INK}>in space — </tspan><tspan fill={GOLD}>H</tspan><tspan fill={INK}> + </tspan><tspan fill={TEAL}>V</tspan><tspan fill={INK}> = the wave (dark)</tspan>
        </text>
        <text x={25} y={H - 16} fontFamily={MONO} fontSize="15" fill={SOFT}>drag to turn · framed square = the front view</text>
      </svg>
      )}
      <div style={{ width: "100%", marginTop: 10, boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
          <span style={{ fontFamily: MONO, fontSize: 15, color: SOFT }}>β — the wave's tilt (sets both wiggle sizes)</span>
          <span style={{ fontFamily: MONO, fontSize: 15, color: INK, fontWeight: 700 }}>{`β=${Math.round(st.beta)}° → a=${a.toFixed(2)}, b=${st.delta === 180 ? "−" : "+"}${b.toFixed(2)}`}</span>
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
function FigWaveDelay() { return <WaveCore figKey="s12wave" withDelay={true} />; }

// ── STEP 6 companion : dim the lamp — photons ──
function FigPhoton() {
  const [st, setSt] = useSynced("s6phot", { beta: 30, theta: 0, log: [] });
  const th = st.theta || 0;
  const pPass = Math.cos((th - st.beta) / DEG) ** 2;
  const fire = (n) => setSt((s) => ({ ...s, log: [...s.log, ...Array.from({ length: n }, () => (Math.random() < Math.cos(((s.theta || 0) - s.beta) / DEG) ** 2 ? 1 : 0))].slice(-300) }));
  const nT = st.log.filter((v) => v).length;
  const shown = st.log.slice(-60);
  const DC = { x: 235, y: 235 }, DR = 130;
  const f = useFig((id, pt) => {
    if (id === "th") setSt((s) => ({ ...s, theta: clamp(Math.round(norm360(Math.atan2(DC.y - pt.y, pt.x - 612) * DEG)), 0, 90), log: [] }));
    else setSt((s) => ({ ...s, beta: clamp(Math.round(norm360(Math.atan2(DC.y - pt.y, pt.x - DC.x) * DEG)), 0, 90), log: [] }));
  });
  const br = st.beta / DEG;
  const bh = { x: DC.x + DR * Math.cos(br), y: DC.y - DR * Math.sin(br) };
  return (
    <div>
      <svg ref={f.ref} viewBox="0 0 900 470" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
        <line x1={95} y1={DC.y} x2={600} y2={DC.y} stroke={GOLD} strokeWidth="7" opacity="0.75" />
        <line x1={624} y1={DC.y} x2={700} y2={DC.y} stroke={GOLD} strokeWidth="7" opacity={0.15 + 0.6 * pPass} />
        <rect x={30} y={DC.y - 26} width={64} height={52} rx={10} fill={INK} />
        <Txt x={62} y={DC.y + 62} size={14} fill={INK} bold>dim lamp</Txt>
        <Txt x={62} y={DC.y + 84} size={13}>one grain</Txt>
        <Txt x={62} y={DC.y + 104} size={13}>at a time</Txt>
        <circle cx={DC.x} cy={DC.y} r={DR} fill="#FFFFFF" fillOpacity="0.75" stroke={LBLUE} strokeWidth="2.5" />
        <line x1={DC.x - DR + 14} y1={DC.y} x2={DC.x + DR - 14} y2={DC.y} stroke={SOFT} strokeWidth="2" strokeDasharray="5 6" />
        <path d={`M ${DC.x + DR} ${DC.y} A ${DR} ${DR} 0 0 0 ${DC.x} ${DC.y - DR}`} fill="none" stroke={GOLD} strokeWidth="2" strokeDasharray="3 7" opacity="0.7" />
        <line x1={DC.x - DR * Math.cos(br) * 0.86} y1={DC.y + DR * Math.sin(br) * 0.86} x2={DC.x + DR * Math.cos(br) * 0.86} y2={DC.y - DR * Math.sin(br) * 0.86} stroke={GOLD} strokeWidth="6" strokeLinecap="round" />
        <Grab x={bh.x} y={bh.y} r={12} fill={GOLD} onDown={f.down("b")} />
        <Txt x={DC.x} y={DC.y + DR + 34} size={16} fill={INK} bold>{`fully polarized beam · wiggle at β = ${Math.round(st.beta)}°`}</Txt>
        <Txt x={DC.x} y={DC.y + DR + 58} size={14}>{`a = ${Math.cos(br).toFixed(2)} · b = ${Math.sin(br).toFixed(2)} — drag the handle`}</Txt>
        <rect x={600} y={DC.y - 145} width={24} height={290} rx={10} fill="#FFFFFF" stroke={INK} strokeWidth="4" />
        <line x1={612 - 34 * Math.cos(th / DEG)} y1={DC.y + 34 * Math.sin(th / DEG)} x2={612 + 34 * Math.cos(th / DEG)} y2={DC.y - 34 * Math.sin(th / DEG)} stroke={INK} strokeWidth="6" strokeLinecap="round" />
        <path d={`M 668 ${DC.y} A 56 56 0 0 0 612 ${DC.y - 56}`} fill="none" stroke={INK} strokeWidth="1.5" strokeDasharray="3 6" opacity="0.5" />
        <Grab x={612 + 56 * Math.cos(th / DEG)} y={DC.y - 56 * Math.sin(th / DEG)} r={9} fill="#FFFFFF" onDown={f.down("th")} />
        <Txt x={612} y={DC.y - 168} size={15} fill={INK} bold>polarizer sheet</Txt>
        <Txt x={612} y={DC.y + 172} size={14}>{`slots at θ = ${Math.round(th)}°${th === 0 ? " (H)" : ""}`}</Txt>
        <Txt x={612} y={DC.y + 198} size={13} fill={GOLD} bold>{`keeps cos²(θ−β) = ${(100 * pPass).toFixed(0)}%`}</Txt>
        <rect x={700} y={40} width={180} height={390} rx={12} fill="#FFFFFF" stroke={LBLUE} strokeWidth="2.5" />
        <Txt x={790} y={72} size={15} fill={INK} bold>detector</Txt>
        {shown.map((v, i) => (
          <circle key={i} cx={726 + (i % 6) * 26} cy={100 + Math.floor(i / 6) * 26} r={9}
            fill={v ? GOLD : "#FFFFFF"} stroke={v ? INK : SOFT} strokeWidth="2.5" opacity={v ? 1 : 0.5} />
        ))}
        {shown.length === 0 && <Txt x={790} y={230} size={14}>…waiting…</Txt>}
        {!st.log.length && <Txt x={790} y={400} size={13} fill={INK} bold>grain: whole,</Txt>}
        {!st.log.length && <Txt x={790} y={422} size={13} fill={INK} bold>or not at all</Txt>}
        {st.log.length > 0 && <Txt x={790} y={412} size={14} fill={INK} bold>{`${nT}/${st.log.length} = ${((100 * nT) / st.log.length).toFixed(0)}% pass`}</Txt>}
      </svg>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 16 }}>
        <Button onClick={() => fire(1)}>send 1 photon</Button>
        <Button onClick={() => fire(25)}>send 25</Button>
        <Button ghost onClick={() => setSt((s) => ({ ...s, log: [] }))}>reset</Button>
      </div>
    </div>
  );
}

// ── STEP 7 : the same disk, in glass — drag the beam anywhere in the disk ──
function FigDisk() {
  const [st, setSt] = useSynced("s7disk", { ang: 60, V: 1, theta: 30 });
  const CX = 300, CY = 280, R = 210;
  const S = { x: CX + st.V * R * Math.cos(st.ang / DEG), y: CY - st.V * R * Math.sin(st.ang / DEG) };
  const th = { x: 740, y: 120 };
  const thh = { x: th.x + 84 * Math.cos(st.theta / DEG), y: th.y - 84 * Math.sin(st.theta / DEG) };
  const f = useFig((id, pt) => {
    if (id === "S") {
      const dx = pt.x - CX, dy = CY - pt.y;
      setSt((s) => ({ ...s, ang: norm360(Math.atan2(dy, dx) * DEG), V: clamp(Math.hypot(dx, dy) / R, 0, 1) }));
    } else setSt((s) => ({ ...s, theta: clamp(norm360(Math.atan2(th.y - pt.y, pt.x - th.x) * DEG) % 180, 0, 180) }));
  });
  const beta = st.ang / 2; // lab angle: drawing angle counts double
  const frac = st.V * Math.cos((st.theta - beta) / DEG) ** 2 + (1 - st.V) * 0.5;
  const lower = st.ang > 180;
  return (
    <svg ref={f.ref} viewBox="0 0 900 560" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
      <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY} Z`} fill={PEACH} fillOpacity="0.45" />
      <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`} fill="none" stroke={GOLD} strokeWidth="4.5" strokeDasharray="9 8" />
      <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 0 ${CX + R} ${CY}`} fill="none" stroke={RED} strokeWidth="4" strokeDasharray="4 9" opacity="0.8" />
      <line x1={CX - R - 45} y1={CY} x2={CX + R + 45} y2={CY} stroke={INK} strokeWidth="3" />
      <circle cx={CX - R} cy={CY} r="9" fill={INK} /><circle cx={CX + R} cy={CY} r="9" fill={INK} />
      <circle cx={CX} cy={CY} r="7" fill={SOFT} />
      <Txt x={CX - R} y={CY + 44}>always T</Txt><Txt x={CX + R} y={CY + 44} anchor="middle">always H</Txt>
      <Txt x={CX} y={CY + 44} size={14}>bulb</Txt>
      {lower && <Txt x={CX} y={CY + R + 44} size={15} fill={RED} bold>below the axis — no seat drawn yet…</Txt>}
      <line x1={CX} y1={CY} x2={S.x} y2={S.y} stroke={SOFT} strokeWidth="2" strokeDasharray="5 5" />
      <Grab x={S.x} y={S.y} fill={lower ? RED : GOLD} onDown={f.down("S")} />
      <Txt x={CX} y={54} size={16} fill={INK} bold>{`β = ${Math.round(norm360(beta))}° lab → ${Math.round(st.ang)}° drawn · purity ${st.V.toFixed(2)}`}</Txt>
      {/* asking sheet dial + meter */}
      <circle cx={th.x} cy={th.y} r={84} fill="#FFFFFF" stroke={LBLUE} strokeWidth="2.5" />
      <line x1={th.x - 84 * Math.cos(st.theta / DEG)} y1={th.y + 84 * Math.sin(st.theta / DEG)} x2={thh.x} y2={thh.y} stroke={INK} strokeWidth="4" />
      <Grab x={thh.x} y={thh.y} r={9} fill="#FFFFFF" onDown={f.down("th")} />
      <Txt x={th.x} y={th.y + 130} size={15} fill={INK} bold>{`asking sheet · θ = ${Math.round(st.theta)}°`}</Txt>
      <rect x={620} y={300} width={240} height={44} rx={10} fill="#FFFFFF" stroke={LBLUE} strokeWidth="2.5" />
      <rect x={620} y={300} width={240 * frac} height={44} rx={10} fill={GOLD} opacity="0.85" />
      <Txt x={740} y={378} size={17} fill={INK} bold>{`meter: ${(100 * frac).toFixed(0)}%`}</Txt>
      <Txt x={740} y={416} size={14}>V·cos²(θ−β) + (1−V)/2</Txt>
      <Txt x={450} y={540} size={16} fill={INK}>drag the beam in the disk · drag the sheet's axis</Txt>
    </svg>
  );
}

// ── STEP 8 : the mirror twins ──
function FigTwin() {
  const [st, setSt] = useSynced("twin", { th: 40 });
  const th = st.th;
  const f = useFig((id, pt) => {
    const a = norm360(Math.atan2(300 - pt.y, pt.x - 450) * DEG);
    setSt({ th: id === "twin" ? norm360(-a) : a });
  });
  const ar = th / DEG;
  const P = { x: 450 + 230 * Math.cos(ar), y: 300 - 230 * Math.sin(ar) };
  const Q = { x: P.x, y: 600 - P.y };
  const T = { x: 220, y: 300 }, H = { x: 680, y: 300 };
  const out = (pt) => { const dx = pt.x - 450, dy = pt.y - 300, L = Math.hypot(dx, dy) || 1; return { x: pt.x + 38 * dx / L, y: pt.y + 38 * dy / L + 8 }; };
  const pl = out(P), ql = out(Q);
  return (
    <svg ref={f.ref} viewBox="0 0 900 600" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
      <line x1="140" y1="300" x2="760" y2="300" stroke={SOFT} strokeWidth="2.5" strokeDasharray="6 6" />
      <path d="M 220 300 A 230 230 0 0 1 680 300" fill="none" stroke={GOLD} strokeWidth="4.5" strokeDasharray="9 8" />
      <path d="M 220 300 A 230 230 0 0 0 680 300" fill="none" stroke={RED} strokeWidth="4.5" strokeDasharray="9 8" />
      <line x1={T.x} y1={T.y} x2={P.x} y2={P.y} stroke={GOLD} strokeWidth="3" />
      <line x1={H.x} y1={H.y} x2={P.x} y2={P.y} stroke={TEAL} strokeWidth="3" />
      <line x1={T.x} y1={T.y} x2={Q.x} y2={Q.y} stroke={GOLD} strokeWidth="2.5" strokeDasharray="6 5" />
      <line x1={H.x} y1={H.y} x2={Q.x} y2={Q.y} stroke={TEAL} strokeWidth="2.5" strokeDasharray="6 5" />
      <text x="499" y="256" textAnchor="middle" fontSize="32" fill={GOLD}>↺</text>
      <text x="499" y="386" textAnchor="middle" fontSize="32" fill={RED}>↻</text>
      <circle cx={T.x} cy={T.y} r="9" fill={INK} /><circle cx={H.x} cy={H.y} r="9" fill={INK} />
      <Txt x={196} y={342} anchor="end">T</Txt><Txt x={704} y={342} anchor="start">H</Txt>
      <Txt x={pl.x} y={pl.y} size={17} fill={INK} bold>P · the 45°-side beam</Txt>
      <Txt x={ql.x} y={ql.y} size={17} fill={INK} bold>P′ · the 135° twin</Txt>
      <Grab x={P.x} y={P.y} fill={GOLD} onDown={f.down("p")} />
      <Grab x={Q.x} y={Q.y} fill="#FFFFFF" onDown={f.down("twin")} />
      <Txt x={450} y={586} size={17} fill={INK}>same odds, opposite turning = the sign · drag P</Txt>
    </svg>
  );
}

// ── STEPS 9 & 10 : measuring is asking / why the sign hides ──
function AskCore({ figKey, showTwin }) {
  const [st, setSt] = useSynced(figKey, { th: 55, eta: showTwin ? 0 : 30 });
  const CX = 430, CY = 300, R = 230;
  const ar = st.th / DEG, er = st.eta / DEG;
  const P = { x: CX + R * Math.cos(ar), y: CY - R * Math.sin(ar) };
  const Q = { x: P.x, y: 2 * CY - P.y };
  const E1 = { x: CX + R * Math.cos(er), y: CY - R * Math.sin(er) };
  const E2 = { x: 2 * CX - E1.x, y: 2 * CY - E1.y };
  const f = useFig((id, pt) => {
    const a = norm360(Math.atan2(CY - pt.y, pt.x - CX) * DEG);
    if (id === "P") setSt((s) => ({ ...s, th: a }));
    else setSt((s) => ({ ...s, eta: a }));
  });
  const d2 = (A, B) => ((A.x - B.x) ** 2 + (A.y - B.y) ** 2) / (2 * R) ** 2;
  const p1 = d2(P, E2); // odds of answering E1 = squared distance to opposite end
  const q1 = d2(Q, E2);
  const bar = (x, y, v, col, lab) => (
    <g key={lab}>
      <rect x={x} y={y} width={170} height={30} rx={8} fill="#FFFFFF" stroke={LBLUE} strokeWidth="2" />
      <rect x={x} y={y} width={170 * clamp(v, 0, 1)} height={30} rx={8} fill={col} opacity="0.85" />
      <Txt x={x + 184} y={y + 23} anchor="start" size={13} fill={INK} bold>{lab} {(100 * v).toFixed(0)}%</Txt>
    </g>
  );
  const flat = Math.abs(((st.eta % 180) + 180) % 180) < 3 || Math.abs(((st.eta % 180) + 180) % 180) > 177;
  return (
    <svg ref={f.ref} viewBox="0 0 900 600" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
      <circle cx={CX} cy={CY} r={R} fill={PEACH} fillOpacity="0.35" stroke={GOLD} strokeWidth="4" strokeDasharray="9 8" />
      <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke={SOFT} strokeWidth="2" strokeDasharray="5 6" />
      <line x1={E1.x} y1={E1.y} x2={E2.x} y2={E2.y} stroke={INK} strokeWidth="3.5" />
      <line x1={P.x} y1={P.y} x2={E1.x} y2={E1.y} stroke={TEAL} strokeWidth="3" />
      <line x1={P.x} y1={P.y} x2={E2.x} y2={E2.y} stroke={GOLD} strokeWidth="3" />
      {showTwin && <>
        <line x1={Q.x} y1={Q.y} x2={E1.x} y2={E1.y} stroke={TEAL} strokeWidth="2.5" strokeDasharray="6 5" />
        <line x1={Q.x} y1={Q.y} x2={E2.x} y2={E2.y} stroke={GOLD} strokeWidth="2.5" strokeDasharray="6 5" />
        <Grab x={Q.x} y={Q.y} r={10} fill="#FFFFFF" onDown={f.down("P")} />
        <Txt x={Q.x + 30} y={Q.y + 30} size={17} fill={INK} bold>P′</Txt>
      </>}
      <circle cx={E1.x} cy={E1.y} r="10" fill={INK} />
      <circle cx={E2.x} cy={E2.y} r="10" fill="#FFFFFF" stroke={INK} strokeWidth="3" />
      <Grab x={E1.x} y={E1.y} r={9} fill={INK} onDown={f.down("E")} />
      <Grab x={P.x} y={P.y} fill={GOLD} onDown={f.down("P")} />
      <Txt x={P.x + 30} y={P.y - 18} size={17} fill={INK} bold>P</Txt>
      <Txt x={E1.x + (E1.x >= CX ? -22 : 22)} y={E1.y - 26} anchor={E1.x >= CX ? "end" : "start"} size={14} fill={INK} bold>this end?</Txt>
      {!showTwin && <>
        {bar(620, 420, p1, TEAL, "yes")}
        {bar(620, 470, 1 - p1, GOLD, "no ")}
        <Txt x={620} y={396} anchor="start" size={14} fill={INK} bold>odds = squared chord</Txt>
      </>}
      {showTwin && <>
        <Txt x={636} y={90} anchor="start" size={14} fill={INK} bold>{`P answers yes: ${(100 * p1).toFixed(0)}%`}</Txt>
        <Txt x={636} y={124} anchor="start" size={14} fill={INK} bold>{`P′ answers yes: ${(100 * q1).toFixed(0)}%`}</Txt>
        <Txt x={450} y={36} size={16} fill={flat ? RED : TEAL} bold>{flat ? "identical — the flip is blind" : "different — the tilt sees the sign"}</Txt>
      </>}
      <Txt x={450} y={586} size={17} fill={INK}>
        {showTwin ? "drag the black diameter end: flat = blind, tilted = telling" : "drag P and drag the diameter — every diameter is a question"}
      </Txt>
    </svg>
  );
}
function FigAsk() { return <AskCore figKey="s9ask" showTwin={false} />; }
function FigSign() { return <AskCore figKey="s10sign" showTwin={true} />; }

// ── STEP 11 : the view from the state — amplitudes, α → 2α, double cover ──
function FigEmbed() {
  const [st, setSt] = useSynced("embed", { alpha: 40 });
  const alpha = st.alpha;
  const f = useFig((id, pt) => {
    if (id === "amp") {
      setSt({ alpha: norm360(Math.atan2(300 - pt.y, pt.x - 450) * DEG) });
    } else {
      const a = norm360(Math.atan2(300 - pt.y, pt.x - 565) * DEG);
      const c1 = a / 2, c2 = a / 2 + 180;
      const d = (x) => Math.abs(((x - alpha + 540) % 360) - 180);
      setSt({ alpha: d(c1) <= d(c2) ? c1 : c2 });
    }
  });
  const ar = alpha / DEG;
  const U = { x: 450 + 230 * Math.cos(ar), y: 300 - 230 * Math.sin(ar) };
  const B = { x: 565 + 115 * Math.cos(2 * ar), y: 300 - 115 * Math.sin(2 * ar) };
  const two = 2 * alpha;
  const lap2 = alpha >= 180;
  const aLab = { x: 450 + 84 * Math.cos(ar / 2), y: 300 - 84 * Math.sin(ar / 2) + 8 };
  const bLab = { x: 565 + 76 * Math.cos((norm360(two) / 2) / DEG), y: 300 - 76 * Math.sin((norm360(two) / 2) / DEG) + 8 };
  const arcPath = (cx, cy, r, a0, a1) => {
    const d = norm360(a1 - a0);
    const p = (a) => [cx + r * Math.cos(a / DEG), cy - r * Math.sin(a / DEG)];
    const [x0, y0] = p(a0), [x1, y1] = p(a0 + d);
    return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${d > 180 ? 1 : 0} 0 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };
  return (
    <svg ref={f.ref} viewBox="0 0 900 596" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
      <line x1="180" y1="300" x2="720" y2="300" stroke={SOFT} strokeWidth="2" strokeDasharray="4 5" />
      <circle cx="450" cy="300" r="230" fill="none" stroke={TEAL} strokeWidth="4" />
      <circle cx="565" cy="300" r="115" fill="none" stroke={GOLD} strokeWidth="4" strokeDasharray="9 8" />
      <line x1="450" y1="300" x2={U.x} y2={U.y} stroke={INK} strokeWidth="3" />
      <line x1="450" y1="300" x2={B.x} y2={B.y} stroke={TEAL} strokeWidth="4" />
      <line x1="680" y1="300" x2={B.x} y2={B.y} stroke={GOLD} strokeWidth="4" />
      <line x1="565" y1="300" x2={B.x} y2={B.y} stroke={GOLD} strokeWidth="3" />
      <path d={arcPath(450, 300, 55, 0, alpha)} fill="none" stroke={INK} strokeWidth="2.5" />
      <path d={arcPath(565, 300, 48, 0, norm360(two))} fill="none" stroke={GOLD} strokeWidth="2.5" />
      <Txt x={aLab.x} y={aLab.y} size={17} fill={INK} bold>α</Txt>
      <Txt x={bLab.x} y={bLab.y} size={17} fill={GOLD} bold>2α</Txt>
      <circle cx="450" cy="300" r="9" fill={INK} />
      <circle cx="680" cy="300" r="9" fill={INK} />
      <Txt x={434} y={338}>0</Txt>
      <Txt x={692} y={338} anchor="start">1</Txt>
      <Txt x={U.x + 34 * Math.cos(ar)} y={U.y - 34 * Math.sin(ar) + 8} size={16} fill={TEAL} bold>(a, b)</Txt>
      <Txt x={B.x + 44 * Math.cos(2 * ar)} y={B.y + (B.y < 300 ? 42 : -26)} size={16} fill={GOLD} bold>state</Txt>
      <Grab x={U.x} y={U.y} fill={TEAL} onDown={f.down("amp")} />
      <Grab x={B.x} y={B.y} fill={GOLD} onDown={f.down("coin")} />
      <Txt x={240} y={56} fill={TEAL}>amplitudes · unit circle</Txt>
      <Txt x={480} y={458} fill={GOLD}>states · Bernoulli circle</Txt>
      <Txt x={450} y={584} size={17} fill={lap2 ? RED : INK}>
        {`α = ${Math.round(alpha)}° → 2α = ${Math.round(two)}°${lap2 ? " ≡ " + Math.round(norm360(two)) + "° — second lap: (a,b) and (−a,−b), one state" : ""} — drag either point`}
      </Txt>
    </svg>
  );
}

// ── STEP 13 : the delay dial — the standing wheel, disk to ball ──
function FigBloch() {
  const [st, setSt] = useSynced("bloch", { p: 0.73, phi: 0 });
  const { p, phi } = st;
  const sb = -50 / 240, cb = Math.sqrt(1 - sb * sb), se = 62 / 240, ce = Math.sqrt(1 - se * se);
  const X = 240 * (2 * p - 1);
  const Rw = Math.sqrt(240 * 240 - X * X);
  const pr = phi / DEG;
  const wpt = (a) => ({
    x: 450 + X * cb - Rw * sb * Math.cos(a),
    y: 300 - Rw * ce * Math.sin(a) - X * sb * se - Rw * cb * se * Math.cos(a),
  });
  const S = wpt(pr), P = wpt(0), Q = wpt(Math.PI);
  const T = { x: 450 - 240 * cb, y: 300 + 240 * sb * se }, H = { x: 450 + 240 * cb, y: 300 - 240 * sb * se };
  const knob = { x: 450 + X * cb, y: 300 + X * sb * se * -1 };
  const f = useFig((id, pt) => {
    if (id === "phi") {
      setSt((prev) => {
        const X2 = 240 * (2 * prev.p - 1), R2 = Math.sqrt(240 * 240 - X2 * X2);
        const c = clamp((pt.x - 450 - X2 * cb) / (-sb * R2), -1, 1);
        const s = (300 - pt.y - X2 * sb * se - R2 * cb * se * c) / (R2 * ce);
        return { ...prev, phi: norm360(Math.atan2(s, c) * DEG) };
      });
    } else {
      setSt((prev) => ({ ...prev, p: clamp(((pt.x - 450) / cb / 240 + 1) / 2, 0.01, 0.99) }));
    }
  });
  let wh = "";
  for (let t = 0; t <= 360; t += 4) {
    const w = wpt(t / DEG);
    wh += `${w.x.toFixed(1)},${w.y.toFixed(1)} `;
  }
  return (
    <svg ref={f.ref} viewBox="0 0 900 620" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
      <defs>
        <radialGradient id="figball15" cx="0.36" cy="0.3" r="0.95">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#EDF7FD" />
          <stop offset="80%" stopColor="#CFEAF9" />
          <stop offset="100%" stopColor="#AFD9F2" />
        </radialGradient>
      </defs>
      <circle cx="450" cy="300" r="240" fill="url(#figball15)" stroke={LBLUE} strokeWidth="2.5" />
      <ellipse cx="450" cy="300" rx="240" ry="62" fill="none" stroke={GOLD} strokeWidth="3" strokeDasharray="9 8" />
      <line x1={T.x} y1={T.y} x2={H.x} y2={H.y} stroke={SOFT} strokeWidth="2" strokeDasharray="4 5" />
      <polyline points={wh} fill="none" stroke={TEAL} strokeWidth="3.5" />
      <circle cx={T.x} cy={T.y} r="8" fill={INK} />
      <circle cx={H.x} cy={H.y} r="8" fill={INK} />
      <Txt x={T.x - 25} y={T.y + 6} anchor="end" fill={INK}>always T</Txt>
      <Txt x={H.x + 25} y={H.y + 6} anchor="start" fill={INK}>always H</Txt>
      <line x1="450" y1="300" x2={S.x} y2={S.y} stroke={INK} strokeWidth="2.5" />
      <circle cx="450" cy="300" r="6" fill={SOFT} />
      <circle cx={P.x} cy={P.y} r="7" fill={INK} />
      <circle cx={Q.x} cy={Q.y} r="7" fill={INK} />
      <Txt x={P.x + 24} y={P.y + 8} anchor="start" size={17} fill={INK} bold>P</Txt>
      <Txt x={Q.x - 20} y={Q.y + 34} anchor="end" size={17} fill={INK} bold>P′</Txt>
      <Txt x={S.x} y={S.y - 32} size={17} fill={INK} bold>state</Txt>
      <Grab x={knob.x} y={knob.y} r={10} fill="#FFFFFF" onDown={f.down("p")} />
      <Grab x={S.x} y={S.y} r={12} fill={GOLD} onDown={f.down("phi")} />
      <Txt x={850} y={62} anchor="end" size={17} fill={TEAL} bold>φ — the delay dial</Txt>
      <Txt x={180} y={568} anchor="start" size={16} fill={GOLD}>φ=0 is P · φ=180° the twin · φ=±90° circular light</Txt>
      <Txt x={450} y={606} size={16} fill={INK}>
        {`p = ${p.toFixed(2)} · φ = ${Math.round(norm360(phi))}° — drag the state or the axle knob`}
      </Txt>
    </svg>
  );
}

// ── STEP 14 : three sheets — light resurrected ──
function FigSheets() {
  const [st, setSt] = useSynced("s14sheets", { m: 45, midIn: false });
  const mr = st.m / DEG;
  const out = st.midIn ? Math.cos(mr) ** 2 * Math.sin(mr) ** 2 : 0;
  const mid1 = Math.cos(mr) ** 2;
  const f = useFig((id, pt) => setSt((s) => ({ ...s, m: clamp(norm360(Math.atan2(210 - pt.y, pt.x - 450) * DEG), 0, 90) })));
  const sheet = (x, ang, col, lab, ghost) => {
    const a = (ang - 90) / DEG;
    return (
      <g opacity={ghost ? 0.35 : 1} key={lab}>
        <rect x={x - 12} y={80} width={24} height={260} rx={10} fill="#FFFFFF" stroke={col} strokeWidth="4" />
        <line x1={x - 40 * Math.cos(a)} y1={210 - 40 * Math.sin(a)} x2={x + 40 * Math.cos(a)} y2={210 + 40 * Math.sin(a)} stroke={col} strokeWidth="6" strokeLinecap="round" />
        <Txt x={x} y={378} size={15} fill={INK} bold>{lab}</Txt>
      </g>
    );
  };
  const seg = (x1, x2, I) => I > 0.004
    ? <line x1={x1} y1={210} x2={x2} y2={210} stroke={GOLD} strokeWidth={4 + 22 * I} strokeLinecap="round" opacity={0.45 + 0.55 * I} />
    : <line x1={x1} y1={210} x2={x2} y2={210} stroke={LBLUE} strokeWidth="3" strokeDasharray="6 9" />;
  const mh = { x: 450 + 96 * Math.cos(mr), y: 210 - 96 * Math.sin(mr) };
  return (
    <div>
      <svg ref={f.ref} viewBox="0 0 900 420" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
        <line x1="30" y1="210" x2="150" y2="210" stroke={INK} strokeWidth="12" strokeLinecap="round" opacity="0.85" />
        <Txt x={40} y={160} anchor="start" size={14}>lamp</Txt>
        {seg(160, 240, 1)}
        {sheet(250, 0, INK, "P1 · 0°")}
        {seg(262, 438, 1)}
        {sheet(450, st.m, TEAL, `middle · ${Math.round(st.m)}°`, !st.midIn)}
        {seg(462, 638, st.midIn ? mid1 : 1)}
        {sheet(650, 90, INK, "P2 · 90°")}
        {seg(662, 800, out)}
        <text x="836" y="222" textAnchor="middle" fontFamily={MONO} fontSize="18" fontWeight="600" fill={out > 0.004 ? GOLD : SOFT}>{(100 * out).toFixed(0)}%</text>
        {st.midIn && <>
          <circle cx={450} cy={210} r={96} fill="none" stroke={TEAL} strokeWidth="2" strokeDasharray="3 7" opacity="0.6" />
          <Grab x={mh.x} y={mh.y} r={10} fill={TEAL} onDown={f.down("m")} />
        </>}
      </svg>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", alignItems: "center", marginTop: 4 }}>
        <Button onClick={() => setSt((s) => ({ ...s, midIn: !s.midIn }))}>{st.midIn ? "remove middle sheet" : "insert middle sheet at 45°"}</Button>
        <span style={{ fontFamily: MONO, fontSize: 15, color: INK }}>
          {st.midIn ? `output = cos²·sin² of ${Math.round(st.m)}° — drag the teal axis` : "crossed sheets: darkness"}
        </span>
      </div>
    </div>
  );
}

// ── STEP 15 : one photon at a time — two paths, the delay dial in distance ──
function FigMZ() {
  const [st, setSt] = useSynced("s15mz", { phi: 0, bs2: true, mix: false });
  const pr = st.phi / DEG;
  const pTop = st.bs2 ? (st.mix ? 0.5 : Math.cos(pr / 2) ** 2) : 0.5;
  const f = useFig((id, pt) => setSt((s) => ({ ...s, phi: norm360(Math.atan2(120 - pt.y, pt.x - 760) * DEG) })));
  const dh = { x: 760 + 80 * Math.cos(pr), y: 120 - 80 * Math.sin(pr) };
  let curve = "";
  for (let t = 0; t <= 360; t += 3) curve += `${(90 + t * 2).toFixed(1)},${(560 - 130 * (st.bs2 ? (st.mix ? 0.5 : Math.cos(t / DEG / 2) ** 2) : 0.5)).toFixed(1)} `;
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
      <svg ref={f.ref} viewBox="0 0 900 600" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
        {/* routes */}
        <line x1="60" y1="240" x2="180" y2="240" stroke={INK} strokeWidth="9" strokeLinecap="round" opacity="0.85" />
        <Txt x={62} y={210} anchor="start" size={14}>{st.mix ? "mystery-mixture source" : "one photon"}</Txt>
        <rect x="180" y="222" width="36" height="36" rx="6" fill={LBLUE} stroke={INK} strokeWidth="2.5" transform="rotate(45 198 240)" />
        <path d="M 216 240 L 380 240 L 380 110 L 520 110" fill="none" stroke={GOLD} strokeWidth="5" opacity="0.8" />
        <path d="M 216 240 L 380 240 L 380 370 L 520 370" fill="none" stroke={TEAL} strokeWidth="5" opacity="0.8" />
        <Txt x={452} y={92} size={14} fill={GOLD} bold>route A</Txt>
        <Txt x={452} y={404} size={14} fill={TEAL} bold>route B · + path length φ</Txt>
        {st.bs2 && <rect x="520" y="222" width="36" height="36" rx="6" fill={LBLUE} stroke={INK} strokeWidth="2.5" transform="rotate(45 538 240)" />}
        <path d="M 520 110 L 538 110 L 538 222" fill="none" stroke={GOLD} strokeWidth="4" opacity="0.6" />
        <path d="M 520 370 L 538 370 L 538 258" fill="none" stroke={TEAL} strokeWidth="4" opacity="0.6" />
        <line x1="556" y1="240" x2="600" y2="240" stroke={GOLD} strokeWidth="4" opacity={pTop} />
        <line x1="538" y1="258" x2="538" y2="300" stroke={TEAL} strokeWidth="4" opacity={1 - pTop} />
        <rect x="600" y="218" width="20" height="44" rx="5" fill={pTop > 0.02 ? GOLD : "#FFFFFF"} stroke={INK} strokeWidth="2.5" />
        <rect x="516" y="300" width="44" height="20" rx="5" fill={1 - pTop > 0.02 ? TEAL : "#FFFFFF"} stroke={INK} strokeWidth="2.5" />
        <Txt x={652} y={246} anchor="start" size={15} fill={INK} bold>{`D1 · ${(100 * pTop).toFixed(0)}%`}</Txt>
        <Txt x={538} y={352} size={15} fill={INK} bold>{`D2 · ${(100 * (1 - pTop)).toFixed(0)}%`}</Txt>
        {/* phi dial */}
        <circle cx="760" cy="120" r="80" fill="#FFFFFF" stroke={TEAL} strokeWidth="2.5" strokeDasharray="3 7" />
        <line x1="760" y1="120" x2={dh.x} y2={dh.y} stroke={TEAL} strokeWidth="4" />
        <Grab x={dh.x} y={dh.y} r={10} fill={TEAL} onDown={f.down("phi")} />
        <Txt x={760} y={26} size={15} fill={INK} bold>{`φ = ${Math.round(st.phi)}°`}</Txt>
        {/* fringe curve */}
        <line x1="90" y1="560" x2="810" y2="560" stroke={INK} strokeWidth="3" />
        <line x1="90" y1="430" x2="810" y2="430" stroke={SOFT} strokeWidth="2" strokeDasharray="6 6" opacity="0.5" />
        <polyline points={curve} fill="none" stroke={st.mix || !st.bs2 ? RED : GOLD} strokeWidth="4.5" />
        <circle cx={90 + st.phi * 2} cy={560 - 130 * pTop} r="9" fill={GOLD} stroke={INK} strokeWidth="3" />
        <Txt x={450} y={592} size={15}>D1 clicks vs φ — {st.mix ? "the mixture never fringes" : st.bs2 ? "fringes: cos²(φ/2)" : "no second mirror: flat 50/50"}</Txt>
      </svg>
      </div>
      <div style={{ width: 170, flex: "none", display: "flex", flexDirection: "column", gap: 12, alignItems: "stretch" }}>
        <Button onClick={() => setSt((s) => ({ ...s, bs2: !s.bs2 }))}>{st.bs2 ? "remove 2nd half-mirror" : "insert 2nd half-mirror"}</Button>
        <Button onClick={() => setSt((s) => ({ ...s, mix: !s.mix }))}>{st.mix ? "source: amplitudes" : "source: mystery mixture"}</Button>
      </div>
    </div>
  );
}

module.exports = {
  FigFlip, FigMystery, FigScatter, FigArc, FigMix,
  FigWave, FigWave3D, FigPhoton, FigSurvey, FigDisk, FigTwin, FigAsk, FigSign,
  FigEmbed, FigWaveDelay, FigBloch, FigSheets, FigMZ,
};
