/* room-figures.jsx — presenter figures that read the room (phones) via Room.usePresenter().
   Slice 1: FigJoin (scene 0c) and FigFlipRoom (scene 1).
   Same palette/helpers as fifteen-figures.jsx; requires ../room/{relay-config,relay-transport,room}.js
   loaded before this module (see room.dc.html). */
const { useState, useRef, useEffect } = React;

const INK = "#002157", SOFT = "#5C6E8F", GOLD = "#EE7203", TEAL = "#00A1E4",
      RED = "#F71D25", LBLUE = "#AFE0F7", PEACH = "#FDE9D3", GRID = "#E1F3FC", PURP = "#6D3FC0";
const MONO = "'IBM Plex Mono', 'Courier New', monospace";
const svgStyle = { width: "100%", display: "block", touchAction: "none", userSelect: "none" };

function Txt({ x, y, size = 16, fill = SOFT, anchor = "middle", bold, transform, children }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontFamily={MONO} fontSize={size}
      fontWeight={bold ? 600 : 400} fill={fill} transform={transform}>{children}</text>
  );
}
function Button({ onClick, ghost, active, children }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: MONO, fontSize: 15, fontWeight: 600, letterSpacing: 0.4,
      padding: "6px 12px", borderRadius: 8, cursor: "pointer",
      background: ghost ? "#FFFFFF" : active === false ? PEACH : GOLD,
      color: ghost ? INK : active === false ? INK : "#FFFFFF",
      border: ghost ? `2px solid ${LBLUE}` : `2px solid ${INK}`,
    }}>{children}</button>
  );
}
function StatusPill({ status, crossDevice }) {
  const col = status === "connected" ? TEAL : status === "error" ? RED : status === "connecting" ? GOLD : SOFT;
  const label = status === "local" ? (crossDevice ? "local" : "local mode — no Supabase configured")
    : status === "connected" ? "live — other devices can join" : status;
  return (
    <span style={{ fontFamily: MONO, fontSize: 13, color: "#FFFFFF", background: col, padding: "3px 10px", borderRadius: 12 }}>{label}</span>
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
function QR({ text, size = 260 }) {
  const ref = useRef(null);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let alive = true;
    ensureQR().then(() => {
      if (!alive || !ref.current) return;
      ref.current.innerHTML = "";
      new window.QRCode(ref.current, { text, width: size, height: size, colorDark: INK, colorLight: "#FFFFFF", correctLevel: window.QRCode.CorrectLevel.M });
      setOk(true);
    }).catch(() => setOk(false));
    return () => { alive = false; };
  }, [text, size]);
  return <div ref={ref} style={{ width: size, height: size, background: "#FFFFFF", padding: 10, borderRadius: 12, border: `2px solid ${LBLUE}`, display: ok ? "block" : "none" }} />;
}

// ── SCENE 0c : join ──
function FigJoin() {
  const room = Room.usePresenter();
  const url = room.participantUrl();
  const roster = room.state.roster || {};
  const phones = Object.keys(roster).map((f) => ({ from: f, ...roster[f] })).sort((a, b) => a.slot - b.slot);
  const copy = () => { try { navigator.clipboard.writeText(url); } catch (e) {} };
  const fresh = () => {
    if (!confirm("Start a new session code? Phones on the current code will have to rejoin.")) return;
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
            {phones.length === 0 ? "scan to join — waiting for the first phone" : `${phones.length} joined`}
          </Txt>
          {phones.map((p, i) => {
            const cols = 5, cx = 70 + (i % cols) * 140, cy = 110 + Math.floor(i / cols) * 90;
            return (
              <g key={p.from}>
                <circle cx={cx} cy={cy} r="28" fill="#FFFFFF" stroke={GOLD} strokeWidth="3" />
                <text x={cx} y={cy + 10} textAnchor="middle" fontSize="28">{p.tag}</text>
                <Txt x={cx} y={cy + 50} size={13}>{`#${p.slot}`}</Txt>
              </g>
            );
          })}
          {phones.length > 0 && <Txt x={350} y={405} size={14}>each phone gets a seat number — it decides the secrets it will carry later</Txt>}
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
  // append a point whenever the pooled count changes (history survives slide changes: it lives in the store)
  useEffect(() => {
    const last = hist.length ? hist[hist.length - 1] : null;
    if (T.n > 0 && (!last || last[0] !== T.n)) room.setMemo(key, [...hist, [T.n, T.frac]].slice(-2000));
    if (T.n === 0 && hist.length) room.setMemo(key, []);
  }, [T.n, T.heads, round]);

  const X0 = 90, X1 = 810, Y0 = 400, Y1 = 120;
  const maxN = Math.max(60, T.n);
  const X = (n) => X0 + (n / maxN) * (X1 - X0), Y = (f) => Y0 - f * (Y0 - Y1);
  const path = hist.map(([n, f]) => `${X(n).toFixed(1)},${Y(f).toFixed(1)}`).join(" ");
  const own = T.phones.slice().sort((a, b) => a.slot - b.slot);

  return (
    <div>
      <svg viewBox="0 0 900 520" style={svgStyle}>
        <Txt x={450} y={36} size={19} fill={INK} bold>{`${ROUND[round].name} — ${ROUND[round].title}`}</Txt>
        <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke={INK} strokeWidth="3" />
        <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke={INK} strokeWidth="3" opacity="0.25" />
        <line x1={X0} y1={Y(0.5)} x2={X1} y2={Y(0.5)} stroke={SOFT} strokeWidth="2.5" strokeDasharray="8 7" />
        <Txt x={X0 - 28} y={Y0 + 6} anchor="end">0</Txt>
        <Txt x={X0 - 28} y={Y(0.5) + 6} anchor="end">½</Txt>
        <Txt x={X0 - 28} y={Y1 + 6} anchor="end">1</Txt>
        <Txt x={X1} y={Y0 + 30} anchor="end" size={14}>{`${T.n} flips from ${T.phones.length} phones`}</Txt>
        <Txt x={450} y={Y1 - 26} size={15}>pooled fraction of heads, flip by flip, as they arrive</Txt>
        {hist.length > 1 && <polyline points={path} fill="none" stroke={ROUND[round].col} strokeWidth="4" strokeLinejoin="round" />}
        {T.n > 0 && <circle cx={X(T.n)} cy={Y(T.frac)} r="10" fill={ROUND[round].col} stroke={INK} strokeWidth="3" />}
        {T.n > 0 && <Txt x={Math.min(X(T.n), X1 - 40)} y={Y(T.frac) - 18} size={16} fill={INK} bold>{T.frac.toFixed(2)}</Txt>}
        {T.n === 0 && <Txt x={450} y={260} size={17}>{`no flips yet — phones: tap Flip (round ${round})`}</Txt>}
        {/* strip: each phone's own fraction (preview of scene 2) */}
        <line x1={X0} y1={480} x2={X1} y2={480} stroke={SOFT} strokeWidth="2" />
        <Txt x={X0} y={505} size={13}>0</Txt><Txt x={(X0 + X1) / 2} y={505} size={13}>½</Txt><Txt x={X1} y={505} size={13}>1</Txt>
        <Txt x={450} y={452} size={13}>each phone's own fraction</Txt>
        {own.map((p) => (
          <g key={p.from}>
            <circle cx={X0 + p.frac * (X1 - X0)} cy={480} r={7 + Math.min(6, p.n / 5)} fill={ROUND[round].col} opacity="0.55" stroke={INK} strokeWidth="1.5" />
            <text x={X0 + p.frac * (X1 - X0)} y={472} textAnchor="middle" fontSize="16">{p.tag}</text>
          </g>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
        {["A", "B", "C"].map((r) => <Button key={r} active={round === r} onClick={() => room.publish({ round: r }, true)}>{`${ROUND[r].name} · ${ROUND[r].short}`}</Button>)}
        <Button ghost onClick={() => room.resetRound(round)}>{`reset round ${round}`}</Button>
      </div>
    </div>
  );
}


// ───────────────────────── shared geometry (Bernoulli half-plane) ─────────────────────────
/* p on x, bandwidth on y; the circle of radius ½ centred at (½, 0). */
function Plane({ W = 900, H = 520, showBand = true, showArc = true, left = "always-T", right = "always-H", children }) {
  const S = 640, cx = W / 2, cy = H - 60;                 // px per unit p; origin p=½ at cx
  const X = (p) => cx + (p - 0.5) * S, Y = (w) => cy - w * S;
  const lines = [];
  for (let u = 0; u <= 1.0001; u += 0.125) {
    const bold = Math.abs((u * 2) % 1) < 1e-6;
    lines.push(<line key={"v" + u} x1={X(u)} y1={Y(0.6)} x2={X(u)} y2={cy} stroke={bold ? LBLUE : GRID} strokeWidth={bold ? 1.5 : 1} />);
  }
  if (showBand) for (let v = 0.125; v <= 0.6; v += 0.125) {
    const bold = Math.abs((v * 2) % 1) < 1e-6;
    lines.push(<line key={"h" + v} x1={X(0)} y1={Y(v)} x2={X(1)} y2={Y(v)} stroke={bold ? LBLUE : GRID} strokeWidth={bold ? 1.5 : 1} />);
  }
  return { X, Y, S, cx, cy, svg: (
    <svg viewBox={`0 0 ${W} ${H}`} style={svgStyle}>
      {lines}
      <line x1={X(0)} y1={cy} x2={X(1)} y2={cy} stroke={INK} strokeWidth="3" />
      <Txt x={X(0)} y={cy + 30} size={15} fill={INK} bold>{left}</Txt>
      <Txt x={X(1)} y={cy + 30} size={15} fill={INK} bold>{right}</Txt>
      <Txt x={X(0.5)} y={cy + 30} size={15}>fair · p = ½</Txt>
      {showBand && <>
        <line x1={X(0)} y1={cy} x2={X(0)} y2={Y(0.6)} stroke={INK} strokeWidth="3" opacity="0.5" />
        <Txt x={X(0) - 14} y={Y(0.5) + 6} anchor="end" size={14}>½</Txt>
        <Txt x={X(0) - 14} y={Y(0.25) + 6} anchor="end" size={14}>¼</Txt>
        <Txt x={X(0.5)} y={Y(0.6) - 14} size={15}>bandwidth — the spread you expect</Txt>
      </>}
      {showArc && <path d={`M ${X(0)} ${cy} A ${S / 2} ${S / 2} 0 0 1 ${X(1)} ${cy}`} fill="none" stroke={INK} strokeWidth="2.5" strokeDasharray="7 6" opacity="0.6" />}
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
      <Txt x={x0 - 16} y={y + 5} anchor="end" size={16} fill={INK} bold>{ROUND[r].name}</Txt>
      <Txt x={x0 - 16} y={y + 24} anchor="end" size={12}>{ROUND[r].short}</Txt>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={SOFT} strokeWidth="2" />
      <line x1={X(0.5)} y1={y - 44} x2={X(0.5)} y2={y + 16} stroke={SOFT} strokeWidth="2" strokeDasharray="6 5" />
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
        <Txt x={W / 2} y={36} size={19} fill={INK} bold>each phone's fraction of heads · ten flips each</Txt>
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
  const D = { A: phoneDots(room.tallies("A")), B: phoneDots(room.tallies("B")), C: phoneDots(room.tallies("C")) };
  const P = { A: pooled(D.A), B: pooled(D.B), C: pooled(D.C) };
  const plane = Plane({ showBand, showArc: showBand, children: ({ X, Y }) => (<>
    {["A", "B", "C"].map((r) => D[r].map((d) => (<g key={r + d.slot}>
      <circle cx={X(d.p)} cy={showBand ? Y(d.w) : Y(0)} r="9" fill={ROUND[r].col} opacity="0.7" stroke={INK} strokeWidth="1.5" />
      {r === "C" && <text x={X(d.p)} y={(showBand ? Y(d.w) : Y(0)) - 14} textAnchor="middle" fontSize="16">{d.tag}</text>}
      {r === "C" && reveal && showBand && (() => { const b = Room.secrets(d.slot).bias; return <circle cx={X(b)} cy={Y(sig(b))} r="7" fill="none" stroke={GOLD} strokeWidth="2.5" strokeDasharray="3 3" />; })()}
    </g>)))}
    {showPooled && showBand && ["A", "B", "C"].map((r) => P[r] && (<g key={"p" + r}>
      <circle cx={X(P[r].p)} cy={Y(P[r].w)} r="15" fill={ROUND[r].col} stroke={INK} strokeWidth="3" />
      <Txt x={X(P[r].p)} y={Y(P[r].w) + (r === "A" ? -24 : r === "B" ? 40 : 34)} size={15} fill={INK} bold>{`room, ${ROUND[r].name}`}</Txt>
    </g>))}
  </>) });
  const pub = (k) => () => room.publish({ [k]: !room.state[k] }, true);
  return (
    <div>
      {plane.svg}
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
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
    <path d={`M ${X(0)} ${cy} A ${320} ${320} 0 0 1 ${X(1)} ${cy}`} fill="none" stroke={INK} strokeWidth="4" />
    <line x1={X(p)} y1={cy} x2={X(p)} y2={Y(sig(p))} stroke={PURP} strokeWidth="2" strokeDasharray="5 4" />
    <circle cx={X(p)} cy={Y(sig(p))} r="13" fill={PURP} stroke={INK} strokeWidth="3" />
    <Txt x={X(p)} y={Y(sig(p)) - 24} size={16} fill={INK} bold>{`p = ${p.toFixed(2)} · bandwidth ${sig(p).toFixed(2)}`}</Txt>
  </>) });
  return (
    <div>
      {plane.svg}
      <div style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "center", marginTop: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 15, color: SOFT }}>p (every phone follows)</span>
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
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); e.preventDefault();
  };
  // right-angle marker at the coin
  const uT = [(Tx - Px) / lenT, (cy - Py) / lenT], uH = [(Hx - Px) / lenH, (cy - Py) / lenH], m = 16;
  const sq = `M ${Px + uT[0] * m} ${Py + uT[1] * m} L ${Px + (uT[0] + uH[0]) * m} ${Py + (uT[1] + uH[1]) * m} L ${Px + uH[0] * m} ${Py + uH[1] * m}`;
  // inset: the coin's own frame — blue (toward T′) horizontal, orange (toward H′) vertical, needle at θ
  const I = { x: 660, y: 40, w: 220, h: 180, ox: 700, oy: 190, S: 120 };
  const nx = I.ox + I.S * Math.cos(th), ny = I.oy - I.S * Math.sin(th);
  return (
    <div>
      <svg viewBox="0 0 900 520" style={svgStyle}>
        {/* axes */}
        <line x1={Tx} y1={cy} x2={Hx + 60} y2={cy} stroke={INK} strokeWidth="3" />
        <line x1={Tx} y1={cy} x2={Tx} y2={80} stroke={INK} strokeWidth="2.5" />
        <Txt x={Tx + 16} y={104} anchor="start" size={15} fill={INK} bold>band width</Txt>
        <Txt x={Hx + 20} y={cy - 18} anchor="start" size={15} fill={INK} bold>p = P(heads)</Txt>
        <Txt x={Tx} y={cy + 32} size={14}>always T (p=0)</Txt>
        <Txt x={Hx} y={cy + 32} size={14}>always H (p=1)</Txt>
        {/* the Bernoulli circle */}
        <path d={`M ${Tx} ${cy} A ${R} ${R} 0 0 1 ${Hx} ${cy}`} fill="none" stroke={GOLD} strokeWidth="4" strokeDasharray="10 9" />
        <circle cx={Tx} cy={cy} r="9" fill={INK} /><circle cx={Hx} cy={cy} r="9" fill={INK} />
        <circle cx={cx} cy={cy} r="7" fill={SOFT} />
        {/* chords and pointer */}
        <line x1={Tx} y1={cy} x2={Px} y2={Py} stroke={TEAL} strokeWidth="4" />
        <line x1={Hx} y1={cy} x2={Px} y2={Py} stroke={GOLD} strokeWidth="4" />
        <line x1={Px} y1={Py} x2={cx} y2={cy} stroke={PURP} strokeWidth="4" markerEnd="url(#arrowPurp)" />
        <defs><marker id="arrowPurp" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill={PURP} /></marker></defs>
        <path d={sq} fill="none" stroke={INK} strokeWidth="2" />
        <Txt x={(Tx + Px) / 2 - 22} y={(cy + Py) / 2 - 10} size={17} fill={TEAL} bold>√p</Txt>
        <Txt x={(Hx + Px) / 2 + 30} y={(cy + Py) / 2 - 10} size={17} fill={GOLD} bold>√(1−p)</Txt>
        <Txt x={(Px + cx) / 2 - 20} y={(Py + cy) / 2} anchor="end" size={15} fill={PURP} bold>½</Txt>
        {/* central angle 2θ */}
        <path d={`M ${cx + 60} ${cy} A 60 60 0 0 0 ${cx + 60 * Math.cos(2 * th)} ${cy - 60 * Math.sin(2 * th)}`} fill="none" stroke={RED} strokeWidth="2.5" />
        <Txt x={cx + 84} y={cy - 40} anchor="start" size={15} fill={RED} bold>{near(p, 0.5) ? "90°" : `2θ = ${deg(2 * th)}°`}</Txt>
        {/* θ at the coin, shown with the ½-circle */}
        {show && <>
          <path d={`M ${Px + ar * Math.cos(a0)} ${Py + ar * Math.sin(a0)} A ${ar} ${ar} 0 0 1 ${Px + ar * Math.cos(a1)} ${Py + ar * Math.sin(a1)}`} fill="none" stroke={PURP} strokeWidth="2.5" />
          <Txt x={Px + (ar + 18) * Math.cos(am)} y={Py + (ar + 18) * Math.sin(am) + 5} size={14} fill={PURP} bold>θ</Txt>
          <path d={`M ${T2[0]} ${T2[1]} A ${R} ${R} 0 0 0 ${H2[0]} ${H2[1]}`} fill="none" stroke={PURP} strokeWidth="3.5" strokeDasharray="10 8" opacity="0.8" />
          <circle cx={T2[0]} cy={T2[1]} r="8" fill={PURP} /><Txt x={T2[0] - 14} y={T2[1] + 28} size={15} fill={PURP} bold>T′</Txt>
          <circle cx={H2[0]} cy={H2[1]} r="8" fill={PURP} /><Txt x={H2[0] + 14} y={H2[1] + 28} size={15} fill={PURP} bold>H′</Txt>
          {/* inset */}
          <rect x={I.x} y={I.y} width={I.w} height={I.h} rx="12" fill="#FFFFFF" stroke={LBLUE} strokeWidth="2" />
          <line x1={I.ox} y1={I.oy} x2={I.ox + I.S + 30} y2={I.oy} stroke={TEAL} strokeWidth="3" />
          <line x1={I.ox} y1={I.oy} x2={I.ox} y2={I.oy - I.S - 30} stroke={GOLD} strokeWidth="3" />
          <circle cx={I.ox + I.S} cy={I.oy} r="5" fill={INK} /><Txt x={I.ox + I.S + 4} y={I.oy + 20} size={13} fill={INK} bold>T′</Txt>
          <circle cx={I.ox} cy={I.oy - I.S} r="5" fill={INK} /><Txt x={I.ox - 16} y={I.oy - I.S + 5} anchor="end" size={13} fill={INK} bold>H′</Txt>
          <path d={`M ${I.ox + I.S} ${I.oy} A ${I.S} ${I.S} 0 0 0 ${I.ox} ${I.oy - I.S}`} fill="none" stroke={SOFT} strokeWidth="1.5" strokeDasharray="5 4" />
          <path d={`M ${I.ox + 40} ${I.oy} A 40 40 0 0 0 ${I.ox + 40 * Math.cos(th)} ${I.oy - 40 * Math.sin(th)}`} fill="none" stroke={RED} strokeWidth="2" />
          <Txt x={I.ox + 58 * Math.cos(th / 2) + 8} y={I.oy - 58 * Math.sin(th / 2) + 5} anchor="start" size={13} fill={RED} bold>{`${deg(th)}°`}</Txt>
          <line x1={I.ox} y1={I.oy} x2={nx} y2={ny} stroke={PURP} strokeWidth="4" markerEnd="url(#arrowPurp)" />
        </>}
        {/* the coin */}
        <g style={{ cursor: "grab" }} onPointerDown={onDown}>
          <circle cx={Px} cy={Py} r="30" fill="rgba(0,0,0,0)" />
          <circle cx={Px} cy={Py} r="20" fill="none" stroke={GOLD} strokeWidth="1.5" opacity="0.5" />
          <circle cx={Px} cy={Py} r="13" fill={GOLD} stroke={INK} strokeWidth="3" />
        </g>
        <Txt x={Px + 26} y={Py - 22} anchor="start" size={16} fill={TEAL} bold>{near(p, 0.5) ? "fair coin (½, ½)" : `your coin (${p.toFixed(2)}, ${sig(p).toFixed(2)})`}</Txt>
        <Txt x={cx} y={cy + 66} size={15} fill={INK}>{`(p − ½)² + band width² = ¼ — the Bernoulli circle · drag the coin`}</Txt>
        {show && <Txt x={cx} y={cy + 90} size={13}>{`centre–coin–T is isosceles, so the angle at the coin between pointer and blue chord is θ · cos θ = √p`}</Txt>}
      </svg>
      <div style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "center", marginTop: 6 }}>
        <Button active={show} ghost={!show} onClick={() => room.publish({ halfCircle: !show }, true)}>{show ? "hide the ½-circle" : "circle of radius ½ around your coin"}</Button>
        <span style={{ fontFamily: MONO, fontSize: 14, color: SOFT }}>p</span>
        <input type="range" min="0" max="1" step="0.01" value={p} onChange={(e) => room.publish({ p: parseFloat(e.target.value) })} style={{ width: 260, accentColor: GOLD }} />
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
function Sheet({ x, y, size = 110, a, label, color = INK, onDown }) {
  const lines = [], r = size * 0.42;
  for (let k = -4; k <= 4; k++) {
    const off = k * (size / 10), hl = Math.sqrt(Math.max(0, r * r - off * off));
    lines.push(<line key={k} x1={-hl} y1={off} x2={hl} y2={off} stroke={color} strokeWidth="2" opacity="0.7" />);
  }
  return (
    <g transform={`translate(${x},${y})`} style={onDown ? { cursor: "grab" } : undefined} onPointerDown={onDown}>
      <rect x={-size / 2} y={-size / 2} width={size} height={size} rx="10" fill="#FFFFFF" stroke={color} strokeWidth="3" />
      <g transform={`rotate(${-a})`}>{lines}</g>
      {label && <Txt x={0} y={size / 2 + 26} size={15} fill={color} bold>{label}</Txt>}
    </g>
  );
}
/* wave between sheets: arrow of amplitude at angle a (front view) */
function WaveArrow({ x, y, a, amp = 1, color = GOLD }) {
  const L = 48 * amp;
  const dx = Math.cos(a * DEG) * L, dy = -Math.sin(a * DEG) * L;
  return (
    <g>
      <circle cx={x} cy={y} r="52" fill="none" stroke={LBLUE} strokeWidth="1.5" strokeDasharray="4 4" />
      <line x1={x - dx} y1={y - dy} x2={x + dx} y2={y + dy} stroke={color} strokeWidth="5" strokeLinecap="round" opacity={0.25 + 0.75 * amp} />
    </g>
  );
}
function BrightnessBar({ x, y, v, w = 60, h = 200 }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#FFFFFF" stroke={INK} strokeWidth="2" rx="6" />
      <rect x={x + 4} y={y + 4 + (h - 8) * (1 - v)} width={w - 8} height={(h - 8) * v} fill={GOLD} rx="4" />
      <Txt x={x + w / 2} y={y + h + 26} size={16} fill={INK} bold>{`${Math.round(v * 100)}%`}</Txt>
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
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); e.preventDefault();
  };
}

// ── SCENE 7 : two pairs of sunglasses ──
function FigLensRoom() {
  const room = Room.usePresenter();
  const a2 = room.state.lens2 ?? 90;
  const visited = room.memo["lens2:visited"] || [];
  useEffect(() => { if (!visited.includes(a2)) room.setMemo("lens2:visited", [...visited, a2].slice(-200)); }, [a2]);
  const T = Room.malus(0, a2);
  const drag = useDragAngle((a) => room.publish({ lens2: a }), 560, 250);
  const X0 = 90, X1 = 810, Y0 = 470, Y1 = 380;
  return (
    <div>
      <svg viewBox="0 0 900 520" style={svgStyle}>
        <Txt x={450} y={34} size={19} fill={INK} bold>lamp → sheet 1 (horizontal) → sheet 2 (drag to rotate) → how much light gets through?</Txt>
        <circle cx={90} cy={250} r="30" fill="#FFF4E8" stroke={GOLD} strokeWidth="3" />
        <Txt x={90} y={310} size={14}>lamp</Txt>
        <line x1={125} y1={250} x2={780} y2={250} stroke={LBLUE} strokeWidth="6" />
        <WaveArrow x={210} y={250} a={45} amp={1} color={SOFT} />
        <Sheet x={330} y={250} a={0} label="sheet 1 · 0°" />
        <WaveArrow x={445} y={250} a={0} amp={1} />
        <Sheet x={560} y={250} a={a2} label={`sheet 2 · ${a2}°`} color={GOLD} onDown={drag} />
        <WaveArrow x={675} y={250} a={a2} amp={Math.sqrt(T)} />
        <BrightnessBar x={790} y={150} v={T} />
        {/* the cos² curve, revealed by the angles the presenter has visited */}
        <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke={SOFT} strokeWidth="1.5" />
        <Txt x={X0} y={Y0 + 18} size={12}>0°</Txt><Txt x={(X0 + X1) / 2} y={Y0 + 18} size={12}>90°</Txt><Txt x={X1} y={Y0 + 18} size={12}>180°</Txt>
        {visited.map((v) => <circle key={v} cx={X0 + (v / 180) * (X1 - X0)} cy={Y0 - Room.malus(0, v) * (Y0 - Y1)} r="4" fill={GOLD} />)}
        <circle cx={X0 + (a2 / 180) * (X1 - X0)} cy={Y0 - T * (Y0 - Y1)} r="8" fill={GOLD} stroke={INK} strokeWidth="2" />
        <Txt x={X1 + 30} y={Y1 + 4} anchor="start" size={12}>100%</Txt><Txt x={X1 + 30} y={Y0 + 4} anchor="start" size={12}>0%</Txt>
      </svg>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 6 }}>
        {[0, 45, 90, 135].map((a) => <Button key={a} ghost={a2 !== a} onClick={() => room.publish({ lens2: a }, true)}>{`${a}°`}</Button>)}
        <Button ghost onClick={() => room.setMemo("lens2:visited", [])}>clear trail</Button>
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
        <Txt x={450} y={34} size={19} fill={INK} bold>{`one photon at a time through the ${q}° sheet — pass or blocked, heads or tails`}</Txt>
        <circle cx={90} cy={120} r="22" fill="#FFF4E8" stroke={GOLD} strokeWidth="3" />
        <line x1={115} y1={120} x2={520} y2={120} stroke={LBLUE} strokeWidth="5" />
        <Sheet x={330} y={120} size={80} a={q} label={`${q}° sheet`} />
        <rect x={540} y={90} width={70} height={60} rx="8" fill="#FFFFFF" stroke={INK} strokeWidth="2.5" />
        <Txt x={575} y={127} size={14} fill={INK} bold>click?</Txt>
        <Txt x={760} y={112} size={15} fill={INK} bold>{`${N} photons`}</Txt>
        <Txt x={760} y={136} size={13}>{`from ${bs.length} beams`}</Txt>
        <line x1={X0} y1={300} x2={X1} y2={300} stroke={INK} strokeWidth="3" />
        <Txt x={X0} y={330} size={13}>0 · never passes</Txt><Txt x={(X0 + X1) / 2} y={330} size={13}>½</Txt><Txt x={X1} y={330} size={13}>1 · always passes</Txt>
        <Txt x={450} y={230} size={14}>each beam's fraction passed · secret angles, nothing revealed yet</Txt>
        {bs.map((b) => { const f = pAt(b, q), x = X0 + f * (X1 - X0); return (<g key={b.slot}>
          <circle cx={x} cy={300} r={8 + Math.min(6, b.q[String(q)].n / 10)} fill={GOLD} opacity="0.6" stroke={INK} strokeWidth="1.5" />
          <text x={x} y={280} textAnchor="middle" fontSize="18">{b.tag}</text>
        </g>); })}
      </svg>
    </div>
  );
}

// ── SCENE 9 : the half circle, in glass — and the needle is the wave ──
function FigSurveyRoom() {
  const room = Room.usePresenter();
  const reveal = !!room.state.reveal;
  const bs = beamsOf(room).filter((b) => hasQ(b, 0));
  const plane = Plane({ W: 900, H: 520, left: "always-V", right: "always-H", children: ({ X, Y, cx, cy }) => (<>
    <path d={`M ${X(0)} ${cy} A 320 320 0 0 1 ${X(1)} ${cy}`} fill="none" stroke={INK} strokeWidth="3.5" />
    <Txt x={X(0.5)} y={Y(0.55)} size={14} fill={INK}>Malus: fraction = cos²θ · bandwidth = |cos θ sin θ| — the same arc</Txt>
    {bs.map((b) => { const p = pAt(b, 0), w = sig(p), th = Room.secrets(b.slot).theta;
      const nx = Math.cos(th * DEG), ny = Math.sin(th * DEG);
      return (<g key={b.slot}>
        <circle cx={X(p)} cy={Y(w)} r="9" fill={b.noise > 0.05 ? SOFT : GOLD} opacity="0.8" stroke={INK} strokeWidth="1.5" />
        <text x={X(p)} y={Y(w) - 14} textAnchor="middle" fontSize="16">{b.tag}</text>
        {reveal && b.noise < 0.05 && <line x1={X(p)} y1={Y(w)} x2={X(p) + 34 * Math.abs(nx)} y2={Y(w) - 34 * Math.abs(ny)} stroke={PURP} strokeWidth="4" strokeLinecap="round" />}
      </g>); })}
  </>) });
  return (
    <div>
      {plane.svg}
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
        {on && <circle cx={X(p)} cy={Y(w)} r="22" fill="none" stroke={RED} strokeWidth="3"><animate attributeName="r" values="16;26;16" dur="1.2s" repeatCount="indefinite" /></circle>}
        <circle cx={X(p)} cy={Y(w)} r="9" fill={b.noise > 0.05 ? SOFT : GOLD} opacity="0.85" stroke={INK} strokeWidth="1.5" />
        <text x={X(p)} y={Y(w) - 14} textAnchor="middle" fontSize="16">{b.tag}</text>
        {on && <Txt x={X(p)} y={Y(w) + 34} size={14} fill={RED} bold>{b.noise > 0.5 ? "unpolarized — the mystery coin" : "45° — the fair coin"}</Txt>}
      </g>); })}
    <Txt x={X(0.5)} y={Y(0.62)} size={14} fill={INK}>placed by each phone's noise knob for now — in scene 11 Nature places it herself</Txt>
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
        <Txt x={450} y={34} size={19} fill={INK} bold>{`the question is now: do you pass a ${q}° sheet?`}</Txt>
        <Sheet x={90} y={130} size={90} a={q} label={`${q}°`} color={GOLD} />
        <line x1={X0 + 100} y1={130} x2={X1} y2={130} stroke={INK} strokeWidth="3" />
        <Txt x={X0 + 100} y={160} size={12}>0</Txt><Txt x={(X0 + 100 + X1) / 2} y={160} size={12}>½</Txt><Txt x={X1} y={160} size={12}>1</Txt>
        {withQ.map((b) => { const f = pAt(b, q), x = X0 + 100 + f * (X1 - X0 - 100), on = spot.includes(b.slot); return (<g key={b.slot}>
          {on && <circle cx={x} cy={130} r="20" fill="none" stroke={RED} strokeWidth="3" />}
          <circle cx={x} cy={130} r="8" fill={b.noise > 0.05 ? SOFT : GOLD} opacity="0.7" stroke={INK} strokeWidth="1.5" />
          <text x={x} y={110} textAnchor="middle" fontSize="18">{b.tag}</text>
        </g>); })}
        {/* the line plot: T45 − ½ against the bandwidth measured with the 0° sheet */}
        <Txt x={450} y={220} size={15} fill={INK} bold>the 45° answer minus ½, against the bandwidth from the 0° sheet</Txt>
        <line x1={450} y1={250} x2={450} y2={490} stroke={SOFT} strokeWidth="1.5" />
        <line x1={250} y1={370} x2={650} y2={370} stroke={SOFT} strokeWidth="1.5" />
        <line x1={450} y1={370} x2={450 + 200} y2={370 - 200} stroke={LBLUE} strokeWidth="2" strokeDasharray="6 5" />
        <line x1={450} y1={370} x2={450 + 200} y2={370 + 200} stroke={LBLUE} strokeWidth="2" strokeDasharray="6 5" />
        <Txt x={660} y={374} anchor="start" size={12}>bandwidth ½</Txt><Txt x={440} y={374} anchor="end" size={12}>0</Txt>
        <Txt x={300} y={300} size={13} fill={INK}>pure beams land on the two lines:</Txt>
        <Txt x={300} y={322} size={13} fill={INK}>the 0° sheet gives the size,</Txt>
        <Txt x={300} y={344} size={13} fill={INK}>the 45° sheet gives the sign.</Txt>
        <Txt x={300} y={380} size={13}>wandering beams fall inside</Txt>
        <Txt x={450} y={244} size={12}>+½</Txt><Txt x={450} y={508} size={12}>−½</Txt>
        {both.map((b) => { const s0 = sig(pAt(b, 0)), s45 = pAt(b, 45) - 0.5;
          const x = 450 + s0 * 400, y = 370 - s45 * 400;
          return (<g key={b.slot}><circle cx={x} cy={y} r="8" fill={b.noise > 0.05 ? SOFT : GOLD} opacity="0.85" stroke={INK} strokeWidth="1.5" /><text x={x} y={y - 12} textAnchor="middle" fontSize="15">{b.tag}</text></g>); })}
      </svg>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 6, flexWrap: "wrap" }}>
        {[0, 45, 90, 135].map((a) => <Button key={a} ghost={q !== a} onClick={() => room.publish({ question: a }, true)}>{`ask ${a}°`}</Button>)}
        <span style={{ fontFamily: MONO, fontSize: 13, color: SOFT, alignSelf: "center" }}>phones: send 25 photons after each change</span>
      </div>
    </div>
  );
}

// ── SCENE 11b : why — the sheet projects the needle: add the components, then square ──
function FigProjectRoom() {
  const [th, setTh] = useState(30);
  const room = Room.usePresenter();
  const al = room.state.question ?? 45;
  const ox = 300, oy = 330, S = 260;
  const nx = ox + S * Math.cos(th * DEG), ny = oy - S * Math.sin(th * DEG);
  const ax = Math.cos(al * DEG), ay = Math.sin(al * DEG);
  const proj = Math.cos((th - al) * DEG);
  const px = ox + S * proj * ax, py = oy - S * proj * ay;
  const drag = useDragAngle(setTh, ox, oy);
  return (
    <div>
      <svg viewBox="0 0 900 420" style={svgStyle}>
        <Txt x={450} y={34} size={19} fill={INK} bold>Malus's law is "first add, then square"</Txt>
        <circle cx={ox} cy={oy} r={S} fill="none" stroke={LBLUE} strokeWidth="1.5" strokeDasharray="5 5" />
        <line x1={ox} y1={oy} x2={ox + S + 30} y2={oy} stroke={INK} strokeWidth="2" />
        <line x1={ox} y1={oy} x2={ox} y2={oy - S - 30} stroke={INK} strokeWidth="2" />
        <Txt x={ox + S + 40} y={oy + 5} anchor="start" size={13}>H</Txt><Txt x={ox} y={oy - S - 38} size={13}>V</Txt>
        <line x1={ox - S * ax} y1={oy + S * ay} x2={ox + (S + 30) * ax} y2={oy - (S + 30) * ay} stroke={GOLD} strokeWidth="3" />
        <Txt x={ox + (S + 50) * ax} y={oy - (S + 50) * ay} size={13} fill={GOLD} bold>{`sheet ${al}°`}</Txt>
        <line x1={ox} y1={oy} x2={nx} y2={ny} stroke={PURP} strokeWidth="5" strokeLinecap="round" />
        <line x1={nx} y1={ny} x2={px} y2={py} stroke={SOFT} strokeWidth="1.5" strokeDasharray="4 4" />
        <line x1={ox} y1={oy} x2={px} y2={py} stroke={TEAL} strokeWidth="6" strokeLinecap="round" opacity="0.8" />
        <g style={{ cursor: "grab" }} onPointerDown={drag}><circle cx={nx} cy={ny} r="24" fill="rgba(0,0,0,0)" /><circle cx={nx} cy={ny} r="11" fill={PURP} stroke={INK} strokeWidth="3" /></g>
        <Txt x={640} y={120} anchor="start" size={16} fill={INK} bold>{`needle at θ = ${th}° (drag it)`}</Txt>
        <Txt x={640} y={160} anchor="start" size={15}>{`its H-part: cos θ = ${Math.cos(th * DEG).toFixed(2)}`}</Txt>
        <Txt x={640} y={186} anchor="start" size={15}>{`its V-part: sin θ = ${Math.sin(th * DEG).toFixed(2)}`}</Txt>
        <Txt x={640} y={230} anchor="start" size={15} fill={TEAL} bold>{`add along the sheet: ${Math.cos(th * DEG).toFixed(2)}·${ax.toFixed(2)} + ${Math.sin(th * DEG).toFixed(2)}·${ay.toFixed(2)} = ${proj.toFixed(2)}`}</Txt>
        <Txt x={640} y={270} anchor="start" size={15} fill={GOLD} bold>{`then square: ${proj.toFixed(2)}² = ${(proj * proj).toFixed(2)} = cos²(θ − ${al}°)`}</Txt>
        <Txt x={640} y={320} anchor="start" size={14}>{al === 45 ? `and cos²(θ−45°) = ½ + cos θ sin θ = ½ + signed bandwidth` : `change the question on the previous slide to 45°`}</Txt>
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
        <Txt x={450} y={34} size={19} fill={INK} bold>0° and 90° block everything — slide a 45° sheet between them</Txt>
        <circle cx={80} cy={220} r="28" fill="#FFF4E8" stroke={GOLD} strokeWidth="3" />
        <line x1={110} y1={220} x2={780} y2={220} stroke={LBLUE} strokeWidth="6" />
        <Sheet x={250} y={220} a={0} label="0°" />
        <WaveArrow x={350} y={220} a={0} amp={1} />
        {midIn ? <Sheet x={450} y={220} a={mid} label={`${mid}° · drag`} color={GOLD} onDown={drag} /> : <g><rect x={400} y={140} width={100} height={160} rx="10" fill="none" stroke={LBLUE} strokeWidth="2" strokeDasharray="6 5" /><Txt x={450} y={330} size={13}>(empty)</Txt></g>}
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
  const cx = 620, cy = 260, R = 170;
  const drag = useDragAngle(setTh, 230, 260);
  const p0 = Room.malus(th, 0), pq = Room.malus(th, q);
  const ang = 2 * (th - q);                                 // Bernoulli angle for the question q
  return (
    <div>
      <svg viewBox="0 0 900 460" style={svgStyle}>
        <Txt x={450} y={34} size={19} fill={INK} bold>one turn of the sheet, two laps of the dot</Txt>
        <circle cx={230} cy={260} r={130} fill="none" stroke={LBLUE} strokeWidth="1.5" strokeDasharray="5 5" />
        <line x1={230 - 150 * Math.cos(q * DEG)} y1={260 + 150 * Math.sin(q * DEG)} x2={230 + 150 * Math.cos(q * DEG)} y2={260 - 150 * Math.sin(q * DEG)} stroke={GOLD} strokeWidth="3" />
        <Txt x={230} y={430} size={14}>{`beam at θ = ${th}° (drag) · sheet at ${q}°`}</Txt>
        <line x1={230} y1={260} x2={230 + 130 * Math.cos(th * DEG)} y2={260 - 130 * Math.sin(th * DEG)} stroke={PURP} strokeWidth="5" strokeLinecap="round" />
        <g style={{ cursor: "grab" }} onPointerDown={drag}><circle cx={230 + 130 * Math.cos(th * DEG)} cy={260 - 130 * Math.sin(th * DEG)} r="22" fill="rgba(0,0,0,0)" /><circle cx={230 + 130 * Math.cos(th * DEG)} cy={260 - 130 * Math.sin(th * DEG)} r="10" fill={PURP} stroke={INK} strokeWidth="3" /></g>
        {/* Bernoulli circle for the question q: x = fraction passed, y = signed bandwidth */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={INK} strokeWidth="3" />
        <line x1={cx - R - 20} y1={cy} x2={cx + R + 20} y2={cy} stroke={INK} strokeWidth="2" />
        <line x1={cx} y1={cy - R - 20} x2={cx} y2={cy + R + 20} stroke={SOFT} strokeWidth="1.5" strokeDasharray="5 4" />
        <Txt x={cx + R + 30} y={cy + 5} anchor="start" size={13} fill={INK} bold>{`always passes ${q}°`}</Txt>
        <Txt x={cx - R - 30} y={cy + 5} anchor="end" size={13} fill={INK} bold>never</Txt>
        <line x1={cx} y1={cy} x2={cx + R * Math.cos(ang * DEG)} y2={cy - R * Math.sin(ang * DEG)} stroke={PURP} strokeWidth="4" />
        <circle cx={cx + R * Math.cos(ang * DEG)} cy={cy - R * Math.sin(ang * DEG)} r="11" fill={PURP} stroke={INK} strokeWidth="3" />
        <Txt x={cx} y={430} size={14}>{`dot at 2(θ − ${q}°) = ${((ang % 360) + 360) % 360}° · passes ${(pq * 100).toFixed(0)}%`}</Txt>
        <Txt x={450} y={455} size={14} fill={INK}>{`the 0° question and the 45° question use the same circle, turned by 90°`}</Txt>
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
        <Txt x={300} y={34} size={17} fill={INK} bold>Bernoulli disk · x = passes 0°, y = (passes 45°) − ½</Txt>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={INK} strokeWidth="3" opacity={full ? 1 : 0.15} />
        <path d={`M ${X(0)} ${cy} A ${R} ${R} 0 0 1 ${X(1)} ${cy}`} fill="none" stroke={INK} strokeWidth="3" />
        <line x1={X(0)} y1={cy} x2={X(1)} y2={cy} stroke={INK} strokeWidth="2.5" />
        <Txt x={X(0)} y={cy + 24} size={13} fill={INK} bold>always-V</Txt><Txt x={X(1)} y={cy + 24} size={13} fill={INK} bold>always-H</Txt>
        {bs.map((b) => { const p = pAt(b, 0), s45 = hasQ(b, 45) ? pAt(b, 45) - 0.5 : null;
          const y = full && s45 !== null ? Y(s45) : Y(sig(p) * (1 - b.noise));
          const on = pair.includes(b.slot);
          return (<g key={b.slot}>
            {on && <circle cx={X(p)} cy={y} r="20" fill="none" stroke={RED} strokeWidth="3" />}
            <circle cx={X(p)} cy={y} r="9" fill={b.noise > 0.05 ? SOFT : GOLD} opacity="0.85" stroke={INK} strokeWidth="1.5" />
            <text x={X(p)} y={y - 14} textAnchor="middle" fontSize="16">{b.tag}</text>
          </g>); })}
        {/* the needle's frame: quarter circle → half circle */}
        <Txt x={640} y={34} size={17} fill={INK} bold>the needle · quarter circle → half circle</Txt>
        <line x1={N.ox} y1={N.oy} x2={N.ox + N.S + 20} y2={N.oy} stroke={GOLD} strokeWidth="3" />
        <line x1={N.ox} y1={N.oy - N.S - 10} x2={N.ox} y2={N.oy + (full ? N.S + 10 : 0)} stroke={TEAL} strokeWidth="3" />
        <path d={`M ${N.ox + N.S} ${N.oy} A ${N.S} ${N.S} 0 0 0 ${N.ox} ${N.oy - N.S}`} fill="none" stroke={SOFT} strokeWidth="2" strokeDasharray="6 5" />
        {full && <path d={`M ${N.ox + N.S} ${N.oy} A ${N.S} ${N.S} 0 0 1 ${N.ox} ${N.oy + N.S}`} fill="none" stroke={SOFT} strokeWidth="2" strokeDasharray="6 5" />}
        <Txt x={N.ox + N.S + 30} y={N.oy + 5} anchor="start" size={12} fill={GOLD} bold>H</Txt>
        <Txt x={N.ox} y={N.oy - N.S - 20} size={12} fill={TEAL} bold>V</Txt>
        {full && <Txt x={N.ox} y={N.oy + N.S + 28} size={12} fill={TEAL} bold>−V · negative bandwidth</Txt>}
        {pair.map((sl) => { const th = Room.secrets(sl).theta, b = bs.find((x) => x.slot === sl); if (!b) return null;
          const a = th > 90 && full ? -(180 - th) : (th > 90 ? 180 - th : th);
          return (<g key={sl}><line x1={N.ox} y1={N.oy} x2={N.ox + N.S * Math.cos(a * DEG)} y2={N.oy - N.S * Math.sin(a * DEG)} stroke={PURP} strokeWidth="5" strokeLinecap="round" /><text x={N.ox + (N.S + 26) * Math.cos(a * DEG)} y={N.oy - (N.S + 26) * Math.sin(a * DEG) + 6} textAnchor="middle" fontSize="18">{b.tag}</text></g>); })}
      </svg>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 6 }}>
        <Button ghost onClick={pickPair}>spotlight a twin pair</Button>
        <Button active={!full} onClick={() => room.publish({ fullDisk: false, question: 0 }, true)}>with the 0° question</Button>
        <Button active={full} onClick={() => room.publish({ fullDisk: true, question: 45 }, true)}>with the 45° question</Button>
      </div>
    </div>
  );
}

module.exports = { FigJoin, FigFlipRoom, FigBarsRoom, FigHalfPlaneRoom, FigArcRoom, FigNeedleRoom,
  FigLensRoom, FigPhotonRoom, FigSurveyRoom, FigMixRoom, FigQuestionRoom, FigProjectRoom, FigThreeLensRoom, FigDoubleRoom, FigTwinsRoom };
