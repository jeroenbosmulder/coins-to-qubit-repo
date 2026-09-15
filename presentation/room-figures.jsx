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
function QR({ text, size = 260, bare }) {
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
  const AZ = "#00A1DE", DK = "#0B2A4A";
  const lbl = { fontFamily: "'Barlow', sans-serif", fontSize: 14, color: "#5E6A85" };
  const big = { fontFamily: "'Barlow', sans-serif", fontSize: 21, fontWeight: 700, color: DK };
  const op = room.status === "connected" ? "LIVE ROOM RELAY" : room.status === "connecting" ? "CONNECTING…" : room.status === "error" ? "RELAY ERROR — LOCAL ONLY" : "LOCAL MODE — THIS DEVICE ONLY";
  const pill = { background: AZ, color: "#FFFFFF", border: "none", borderRadius: 999, padding: "10px 20px", fontFamily: "'Barlow', sans-serif", fontSize: 17, fontWeight: 700, cursor: "pointer" };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div style={{ background: "#FFFFFF", borderRadius: 14, width: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.4)", overflow: "hidden", fontFamily: "'Barlow', sans-serif", textAlign: "left" }}>
      <div style={{ background: AZ, color: "#FFFFFF", padding: "12px 22px", fontSize: 19, fontWeight: 700, letterSpacing: 0.5 }}>Boarding pass</div>
      <div style={{ padding: "20px 22px 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <QR text={url} size={218} bare />
        <div style={{ fontFamily: MONO, fontSize: 12, color: "#5E6A85", marginTop: 6, alignSelf: "flex-end" }}>SEC. QB{room.session}:001</div>
      </div>
      <div style={{ padding: "2px 22px 14px", fontSize: 30, fontWeight: 600, color: DK }}>Seat holder: <span style={{ fontWeight: 700 }}>you</span></div>
      <div style={{ borderTop: "1.5px solid #D8DEE8", margin: "0 22px", padding: "14px 0 16px", display: "flex", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: "none" }}>
          <span style={lbl}>Flight</span>
          <span style={big}>QB{room.session}</span>
          <span style={{ ...lbl, marginTop: 8 }}>Departure</span>
          <span style={big}>{dep}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={lbl}>Merritt Island</span><span style={lbl}>Baitadi</span><span style={lbl}>Ubari</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 29, fontWeight: 600, color: AZ, letterSpacing: 0.5 }}>COI</span>
            <svg width="20" height="16" viewBox="0 0 30 22"><path d="M2 11 h20 M16 4 l8 7 -8 7" fill="none" stroke={AZ} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 29, fontWeight: 600, color: AZ, letterSpacing: 0.5 }}>BIT</span>
            <svg width="20" height="16" viewBox="0 0 30 22"><path d="M2 11 h20 M16 4 l8 7 -8 7" fill="none" stroke={AZ} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 29, fontWeight: 600, color: AZ, letterSpacing: 0.5 }}>QUB</span>
          </div>
          <span style={{ ...lbl, fontSize: 12.5 }}>Operated in {op}</span>
        </div>
      </div>
      <div style={{ background: AZ, color: "#FFFFFF", margin: "0 14px 14px", borderRadius: 999, padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 17, fontWeight: 700 }}>
        <span>● Boarding</span>
        <span style={{ fontWeight: 500 }}>{n === 0 ? "scan to take your seat" : n + " seated"}</span>
        <span style={{ fontWeight: 500 }}>Gate 1</span>
      </div>
      <div style={{ display: "flex", gap: 10, margin: "0 14px 14px" }}>
        <button onClick={copy} style={{ ...pill, flex: 1 }}>Copy link</button>
        <button onClick={fresh} style={{ ...pill, flex: 1, background: "#FFFFFF", color: AZ, border: `2px solid ${AZ}`, padding: "8px 20px" }}>New code</button>
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
        <Txt x={450} y={36} size={16} fill={INK} bold>{`${ROUND[round].name} — ${ROUND[round].title}`}</Txt>
        <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke={INK} strokeWidth="2.25" />
        <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke={INK} strokeWidth="2.25" opacity="0.25" />
        <line x1={X0} y1={Y(0.5)} x2={X1} y2={Y(0.5)} stroke={SOFT} strokeWidth="1.75" strokeDasharray="8 7" />
        <Txt x={X0 - 28} y={Y0 + 6} anchor="end">0</Txt>
        <Txt x={X0 - 28} y={Y(0.5) + 6} anchor="end">½</Txt>
        <Txt x={X0 - 28} y={Y1 + 6} anchor="end">1</Txt>
        <Txt x={X1} y={Y0 + 30} anchor="end" size={14}>{`${T.n} flips from ${T.phones.length} participants`}</Txt>
        <Txt x={450} y={Y1 - 26} size={15}>pooled fraction of heads, flip by flip, as they arrive</Txt>
        {hist.length > 1 && <polyline points={path} fill="none" stroke={ROUND[round].col} strokeWidth="3" strokeLinejoin="round" />}
        {T.n > 0 && <circle cx={X(T.n)} cy={Y(T.frac)} r="10" fill={ROUND[round].col} stroke="#FFFFFF" strokeWidth={2.25} />}
        {T.n > 0 && <Txt x={Math.min(X(T.n), X1 - 40)} y={Y(T.frac) - 18} size={14} fill={INK} bold>{T.frac.toFixed(2)}</Txt>}
        {T.n === 0 && <Txt x={450} y={260} size={17}>{`no flips yet — participants: tap Flip (round ${round})`}</Txt>}
        {/* strip: each phone's own fraction (preview of scene 2) */}
        <line x1={X0} y1={480} x2={X1} y2={480} stroke={SOFT} strokeWidth="1.5" />
        <Txt x={X0} y={505} size={13}>0</Txt><Txt x={(X0 + X1) / 2} y={505} size={13}>½</Txt><Txt x={X1} y={505} size={13}>1</Txt>
        <Txt x={450} y={452} size={13}>each participant's own fraction</Txt>
        {own.map((p) => (
          <g key={p.from}>
            <circle cx={X0 + p.frac * (X1 - X0)} cy={480} r={7 + Math.min(6, p.n / 5)} fill={ROUND[round].col} opacity="0.55" stroke="#FFFFFF" strokeWidth={1.5} />
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
      <line x1={X(0)} y1={cy} x2={X(1)} y2={cy} stroke={INK} strokeWidth="2.25" />
      <Txt x={X(0)} y={cy + 30} size={15} fill={INK} bold>{left}</Txt>
      <Txt x={X(1)} y={cy + 30} size={15} fill={INK} bold>{right}</Txt>
      <Txt x={X(0.5)} y={cy + 30} size={15}>fair · p = ½</Txt>
      {showBand && <>
        <line x1={X(0)} y1={cy} x2={X(0)} y2={Y(0.6)} stroke={INK} strokeWidth="2.25" opacity="0.5" />
        <Txt x={X(0) - 14} y={Y(0.5) + 6} anchor="end" size={14}>½</Txt>
        <Txt x={X(0) - 14} y={Y(0.25) + 6} anchor="end" size={14}>¼</Txt>
        <Txt x={X(0.5)} y={Y(0.6) - 14} size={15}>bandwidth — the spread you expect</Txt>
      </>}
      {showArc && <path d={`M ${X(0)} ${cy} A ${S / 2} ${S / 2} 0 0 1 ${X(1)} ${cy}`} fill="none" stroke={INK} strokeWidth="1.75" strokeDasharray="7 6" opacity="0.6" />}
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
  const D = { A: phoneDots(room.tallies("A")), B: phoneDots(room.tallies("B")), C: phoneDots(room.tallies("C")) };
  const P = { A: pooled(D.A), B: pooled(D.B), C: pooled(D.C) };
  const plane = Plane({ showBand, showArc: showBand, children: ({ X, Y }) => (<>
    {["A", "B", "C"].map((r) => D[r].map((d) => (<g key={r + d.slot}>
      <circle cx={X(d.p)} cy={showBand ? Y(d.w) : Y(0)} r="9" fill={ROUND[r].col} opacity="0.7" stroke="#FFFFFF" strokeWidth={1.5} />
      {r === "C" && <text x={X(d.p)} y={(showBand ? Y(d.w) : Y(0)) - 14} textAnchor="middle" fontSize="16">{d.tag}</text>}
      {r === "C" && reveal && showBand && (() => { const b = Room.secrets(d.slot).bias; return <circle cx={X(b)} cy={Y(sig(b))} r="7" fill="none" stroke={GOLD} strokeWidth="1.75" strokeDasharray="3 3" />; })()}
    </g>)))}
    {showPooled && showBand && ["A", "B", "C"].map((r) => P[r] && (<g key={"p" + r}>
      <circle cx={X(P[r].p)} cy={Y(P[r].w)} r="15" fill={ROUND[r].col} stroke="#FFFFFF" strokeWidth={2.25} />
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
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
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
                <Txt x={450} y={30} size={15}>lamp → sheet 1 (0°) → sheet 2 (drag it) → detector</Txt>
        <circle cx={90} cy={250} r={20} fill="#FDEFE3" stroke={GOLD} strokeWidth="2.25" />
        <Txt x={90} y={310} size={14}>lamp</Txt>
        <line x1={125} y1={250} x2={780} y2={250} stroke={LBLUE} strokeWidth="4" />
        <WaveArrow x={210} y={250} a={45} amp={1} color={SOFT} />
        <Sheet x={330} y={250} a={0} label="sheet 1 · 0°" />
        <WaveArrow x={445} y={250} a={0} amp={1} />
        <Sheet x={560} y={250} a={a2} label={`sheet 2 · ${a2}°`} color={GOLD} onDown={drag} />
        <WaveArrow x={675} y={250} a={a2} amp={Math.sqrt(T)} />
        <BrightnessBar x={800} y={165} v={T} />
        {/* the cos² curve, revealed by the angles the presenter has visited */}
        <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke={SOFT} strokeWidth="1.5" />
        <Txt x={X0} y={Y0 + 18} size={12}>0°</Txt><Txt x={(X0 + X1) / 2} y={Y0 + 18} size={12}>90°</Txt><Txt x={X1} y={Y0 + 18} size={12}>180°</Txt>
        {visited.map((v) => <circle key={v} cx={X0 + (v / 180) * (X1 - X0)} cy={Y0 - Room.malus(0, v) * (Y0 - Y1)} r="4" fill={GOLD} />)}
        <circle cx={X0 + (a2 / 180) * (X1 - X0)} cy={Y0 - T * (Y0 - Y1)} r="8" fill={GOLD} stroke="#FFFFFF" strokeWidth={1.75} />
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

// ── SCENE 14 : the shadow — a bounce on a line is the shadow of a circle; the needle gets two clocks ──
function FigShadowRoom() {
  const room = Room.usePresenter();
  const running = room.state.shadowRun !== false;
  const off = room.state.clockOffset ?? 0;                 // degrees the V-clock lags; locked at 0 until scene 15
  const unlocked = !!room.state.unlockDelay;
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
    <div>
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
        <Txt x={N.ox + 100} y={N.oy + 60} size={13}>{off === 0 ? "both clocks tick in step → the tip bounces on a line" : `V-clock lags by ${off}° → the tip goes round`}</Txt>
      </svg>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
        <Button ghost onClick={() => room.publish({ shadowRun: !running }, true)}>{running ? "pause" : "play"}</Button>
        <span style={{ fontFamily: MONO, fontSize: 14, color: unlocked ? INK : SOFT }}>offset the clocks</span>
        <input type="range" min="0" max="180" step="5" value={off} disabled={!unlocked} onChange={(e) => room.publish({ clockOffset: parseInt(e.target.value) })} style={{ width: 240, accentColor: TEAL }} />
        <span style={{ fontFamily: MONO, fontSize: 13, color: SOFT }}>{unlocked ? `${off}°` : "locked until the next scene"}</span>
      </div>
    </div>
  );
}

// ── SCENE 15 : the impostor — pure beams inside the disk; the delay question lifts them out ──
function FigImpostorRoom() {
  const room = Room.usePresenter();
  const bs = beamsOf(room).filter((b) => hasQ(b, 0) && hasQ(b, 45));
  const lift = !!room.state.lift;
  const cx = 250, cy = 260, R = 190;
  const X = (u) => cx + u * 2 * R, Y = (v) => cy - v * 2 * R;
  const cx2 = 660;
  const withC = bs.filter((b) => hasQ(b, "C"));
  return (
    <div>
      <svg viewBox="0 0 900 520" style={svgStyle}>
        <Txt x={cx} y={34} size={14} fill={INK} bold>the disk · x from the 0° sheet, y from the 45° sheet</Txt>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={INK} strokeWidth="2.25" />
        <line x1={X(-0.55)} y1={cy} x2={X(0.55)} y2={cy} stroke={SOFT} strokeWidth="1.5" /><line x1={cx} y1={Y(-0.55)} x2={cx} y2={Y(0.55)} stroke={SOFT} strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r="6" fill={SOFT} />
        {bs.map((b) => { const st = Room.stokesOf(b.q), r = Math.hypot(st.s1, st.s2), inside = b.noise < 0.05 && r < 0.42;
          return (<g key={b.slot}>
            {inside && <circle cx={X(st.s1)} cy={Y(st.s2)} r="22" fill="none" stroke={RED} strokeWidth="2.25"><animate attributeName="r" values="16;26;16" dur="1.2s" repeatCount="indefinite" /></circle>}
            <circle cx={X(st.s1)} cy={Y(st.s2)} r="9" fill={b.noise > 0.05 ? SOFT : GOLD} opacity="0.85" stroke="#FFFFFF" strokeWidth={1.5} />
            <text x={X(st.s1)} y={Y(st.s2) - 14} textAnchor="middle" fontSize="16">{b.tag}</text>
          </g>); })}
        <Txt x={cx} y={478} size={13} fill={RED} bold>{bs.some((b) => b.noise < 0.05 && Math.hypot(Room.stokesOf(b.q).s1, Room.stokesOf(b.q).s2) < 0.42) ? "red rings: pure, yet inside the disk" : "waiting for beams with both tallies"}</Txt>

        <Txt x={cx2} y={34} size={14} fill={INK} bold>{lift ? "side view · y from the 45° sheet, up from the delay question" : "the third question: delay, then a sheet"}</Txt>
        {lift ? <>
          <circle cx={cx2} cy={cy} r={R} fill="none" stroke={INK} strokeWidth="2.25" />
          <line x1={cx2 - R - 20} y1={cy} x2={cx2 + R + 20} y2={cy} stroke={SOFT} strokeWidth="1.5" /><line x1={cx2} y1={cy - R - 20} x2={cx2} y2={cy + R + 20} stroke={SOFT} strokeWidth="1.5" />
          <Txt x={cx2 + R + 30} y={cy + 5} anchor="start" size={12}>45°</Txt><Txt x={cx2} y={cy - R - 28} size={12}>delay question</Txt>
          {withC.map((b) => { const st = Room.stokesOf(b.q); return (<g key={b.slot}>
            <line x1={cx2 + st.s2 * 2 * R} y1={cy} x2={cx2 + st.s2 * 2 * R} y2={cy - st.s3 * 2 * R} stroke={PURP} strokeWidth="1.5" strokeDasharray="4 3" />
            <circle cx={cx2 + st.s2 * 2 * R} cy={cy - st.s3 * 2 * R} r="9" fill={b.noise > 0.05 ? SOFT : GOLD} opacity="0.85" stroke="#FFFFFF" strokeWidth={1.5} />
            <text x={cx2 + st.s2 * 2 * R} y={cy - st.s3 * 2 * R - 14} textAnchor="middle" fontSize="16">{b.tag}</text>
          </g>); })}
          <Txt x={cx2} y={490} size={14} fill={INK}>the impostors leave the plane: the disk was a slice of something bigger</Txt>
        </> : <>
          <circle cx={cx2 - 190} cy={cy} r={18} fill="#FDEFE3" stroke={GOLD} strokeWidth="2.25" />
          <line x1={cx2 - 160} y1={cy} x2={cx2 + 190} y2={cy} stroke={LBLUE} strokeWidth="4" />
          <rect x={cx2 - 90} y={cy - 60} width="36" height="120" rx="8" fill="#F2E8F5" stroke={PURP} strokeWidth="2.25" />
          <Txt x={cx2 - 72} y={cy + 90} size={13} fill={PURP} bold>delay</Txt>
          <Txt x={cx2 - 72} y={cy + 108} size={12}>V lags H by ¼ turn</Txt>
          <Sheet x={cx2 + 60} y={cy} size={90} a={0} label="0° sheet" />
          <Txt x={cx2} y={cy - 110} size={14}>{`${withC.length} of ${bs.length} beams have answered it`}</Txt>
          <Txt x={cx2} y={478} size={13} fill={INK}>participants: ask the delay question — 25 photons</Txt>
        </>}
      </svg>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 6 }}>
        <Button active={room.state.question === "C"} onClick={() => room.publish({ question: "C", unlockDelay: true }, true)}>ask the delay question</Button>
        <Button active={lift} onClick={() => room.publish({ lift: !lift }, true)}>{lift ? "back to the disk" : "lift"}</Button>
      </div>
    </div>
  );
}

// ── shared: the ball ──
function Ball({ cx, cy, R, view, children, axes = true }) {
  const P = (sv) => { const q = Room.project(sv, view); return { x: cx + q.x * 2 * R, y: cy - q.y * 2 * R, depth: q.depth }; };
  const ring = (fn, n = 72) => Array.from({ length: n + 1 }, (_, i) => { const a = (i / n) * 2 * Math.PI; const q = P(fn(a)); return `${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join(" ");
  const eq = ring((a) => ({ s1: 0.5 * Math.cos(a), s2: 0.5 * Math.sin(a), s3: 0 }));
  const mer = ring((a) => ({ s1: 0.5 * Math.cos(a), s2: 0, s3: 0.5 * Math.sin(a) }));
  const ax = (sv, label, col) => { const q = P(sv); return (<g key={label}><line x1={cx} y1={cy} x2={q.x} y2={q.y} stroke={col} strokeWidth="1.5" opacity={q.depth < 0 ? 0.35 : 0.9} /><Txt x={q.x + (q.x - cx) * 0.12} y={q.y + (q.y - cy) * 0.12 + 5} size={12} fill={col} bold>{label}</Txt></g>); };
  return (
    <g>
      <circle cx={cx} cy={cy} r={R} fill="#FFFFFF" stroke={INK} strokeWidth="1.75" />
      <polyline points={eq} fill="none" stroke={SOFT} strokeWidth="1.5" strokeDasharray="5 4" />
      <polyline points={mer} fill="none" stroke={SOFT} strokeWidth="1" strokeDasharray="3 4" />
      {axes && [ax({ s1: 0.6, s2: 0, s3: 0 }, "H", GOLD), ax({ s1: -0.6, s2: 0, s3: 0 }, "V", GOLD), ax({ s1: 0, s2: 0.6, s3: 0 }, "45°", TEAL), ax({ s1: 0, s2: 0, s3: 0.6 }, "circular", PURP)]}
      {children(P)}
    </g>
  );
}

// ── SCENE 16 : the ball — the delay dial sweeps the disk out of the plane ──
function FigBallRoom() {
  const room = Room.usePresenter();
  const view = room.state.view || { az: -35, el: 22 };
  const th = room.state.theta ?? 45, de = room.state.delta ?? 0;
  const bs = beamsOf(room).filter((b) => hasQ(b, 0) && hasQ(b, 45));
  const demo = Room.stokes(th, de);
  return (
    <div>
      <svg viewBox="0 0 900 520" style={svgStyle}>
        <Txt x={450} y={34} size={15} fill={INK} bold>three questions, three numbers, one ball — the Bernoulli ball</Txt>
        <Ball cx={450} cy={270} R={210} view={view}>{(P) => (<>
          {/* the ring swept by the delay dial at the presenter's θ */}
          <polyline points={Array.from({ length: 73 }, (_, i) => { const q = P(Room.stokes(th, (i / 72) * 360)); return `${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join(" ")} fill="none" stroke={PURP} strokeWidth="1.5" strokeDasharray="6 4" opacity="0.7" />
          {bs.map((b) => { const st = Room.stokesOf(b.q); const sv = { s1: st.s1, s2: st.s2, s3: st.s3 === null ? 0 : st.s3 }; const q = P(sv);
            return (<g key={b.slot} opacity={q.depth < 0 ? 0.45 : 1}><circle cx={q.x} cy={q.y} r="8" fill={b.noise > 0.05 ? SOFT : GOLD} stroke="#FFFFFF" strokeWidth={1.5} /><text x={q.x} y={q.y - 12} textAnchor="middle" fontSize="15">{b.tag}</text></g>); })}
          {(() => { const q = P(demo); return (<g><line x1={450} y1={270} x2={q.x} y2={q.y} stroke={PURP} strokeWidth="3" /><circle cx={q.x} cy={q.y} r="11" fill={PURP} stroke="#FFFFFF" strokeWidth={2.25} /></g>); })()}
        </>)}</Ball>
        <Txt x={450} y={505} size={14}>{`demo beam: θ = ${th}°, delay ${de}° → (${demo.s1.toFixed(2)}, ${demo.s2.toFixed(2)}, ${demo.s3.toFixed(2)}) · dots: the room's beams (height from the delay question, 0 if not asked)`}</Txt>
      </svg>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontFamily: MONO, fontSize: 13, color: SOFT }}>θ</span><input type="range" min="0" max="180" step="1" value={th} onChange={(e) => room.publish({ theta: parseInt(e.target.value) })} style={{ width: 180, accentColor: GOLD }} />
        <span style={{ fontFamily: MONO, fontSize: 13, color: SOFT }}>delay</span><input type="range" min="0" max="360" step="5" value={de} onChange={(e) => room.publish({ delta: parseInt(e.target.value) })} style={{ width: 180, accentColor: PURP }} />
        <span style={{ fontFamily: MONO, fontSize: 13, color: SOFT }}>turn</span><input type="range" min="-180" max="180" step="5" value={view.az} onChange={(e) => room.publish({ view: { ...view, az: parseInt(e.target.value) } })} style={{ width: 120, accentColor: INK }} />
        <span style={{ fontFamily: MONO, fontSize: 13, color: SOFT }}>tilt</span><input type="range" min="-80" max="80" step="5" value={view.el} onChange={(e) => room.publish({ view: { ...view, el: parseInt(e.target.value) } })} style={{ width: 120, accentColor: INK }} />
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
  const [p1, setP1] = useState(0.85);
  const [p2, setP2] = useState(0.25);
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
      const px = (((ev.clientX - r.left) / r.width) * 900 - x0) / (x1 - x0);
      set(Math.min(0.98, Math.max(0.02, Math.round(px * 100) / 100)));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
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
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
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
  const onUp = () => { drag.current = null; };
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

// ── SCENE 2b : statistical vs systematic — the bandwidth splits when you learn whose flip is whose ──
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

module.exports = { FigJoin, FigJoinQR, FigCoinsRow, FigFlipRoom, FigSplitRoom, FigBlendRoom, FigWaveRoom, FigBarsRoom, FigHalfPlaneRoom, FigArcRoom, FigNeedleRoom,
  FigLensRoom, FigPhotonRoom, FigSurveyRoom, FigMixRoom, FigQuestionRoom, FigProjectRoom, FigThreeLensRoom, FigDoubleRoom, FigTwinsRoom,
  FigShadowRoom, FigImpostorRoom, FigBallRoom, FigMZRoom, FigReceiptRoom, FigDecohereRoom };
