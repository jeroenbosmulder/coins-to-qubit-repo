import { useState, useMemo, useEffect, useRef } from "react";

// ---------- palette ----------
const C = {
  paper: "#FFFFFF",
  grid: "#E1F3FC",
  gridBold: "#AFE0F7",
  ink: "#002157",
  inkSoft: "#5C6E8F",
  gold: "#EE7203",
  goldSoft: "#FDE9D3",
  red: "#F71D25",
  redSoft: "#FDE0E1",
  teal: "#00A1E4",
  violet: "#5F3DC4",
};

const serif = "'Fraunces', Georgia, 'Times New Roman', serif";
const mono = "'IBM Plex Mono', 'Courier New', monospace";

// ---------- helpers ----------
const flipOne = (p) => (Math.random() < p ? 1 : 0); // 1 = H, 0 = T
const flipSeq = (p, n) => Array.from({ length: n }, () => flipOne(p));
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const sampleStd = (a) => {
  const m = mean(a);
  return Math.sqrt(Math.max(0, mean(a.map((v) => v * v)) - m * m));
};
const fmt = (x, d = 2) => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(d);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- small UI pieces ----------
function CoinChip({ v }) {
  const isH = v === 1;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: "50%",
        margin: 2,
        fontFamily: mono,
        fontSize: 11,
        fontWeight: 600,
        color: isH ? "#fff" : C.ink,
        background: isH ? C.gold : "#fff",
        border: `1.5px solid ${isH ? C.gold : C.gridBold}`,
      }}
    >
      {isH ? "H" : "T"}
    </span>
  );
}

function Btn({ children, onClick, kind = "solid", disabled }) {
  const solid = kind === "solid";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: mono,
        fontSize: 13,
        padding: "8px 14px",
        borderRadius: 6,
        cursor: disabled ? "default" : "pointer",
        border: `1.5px solid ${C.ink}`,
        background: solid ? C.ink : "transparent",
        color: solid ? C.paper : C.ink,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

function Notice({ children }) {
  return (
    <div
      style={{
        marginTop: 16,
        padding: "10px 14px",
        borderLeft: `3px solid ${C.gold}`,
        background: "#FFF4E8",
        fontSize: 14,
        lineHeight: 1.55,
      }}
    >
      <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: 1, color: C.gold }}>
        WHAT TO NOTICE —{" "}
      </span>
      {children}
    </div>
  );
}

function Formula({ children }) {
  return (
    <div
      style={{
        fontFamily: mono,
        fontSize: 15,
        textAlign: "center",
        padding: "10px 0",
        color: C.ink,
      }}
    >
      {children}
    </div>
  );
}

function Slider({ value, min, max, step, onChange, label, readout }) {
  return (
    <div style={{ margin: "14px 0" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: mono,
          fontSize: 12,
          marginBottom: 4,
          color: C.inkSoft,
        }}
      >
        <span>{label}</span>
        <span style={{ color: C.ink, fontWeight: 600 }}>{readout}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: C.gold }}
      />
    </div>
  );
}

// ---------- graph-paper state plot (Bernoulli circle) ----------
// p (heads probability) on horizontal axis in [0,1]; band width w on vertical axis.
// The state curve is (p - 1/2)^2 + w^2 = 1/4 : a circle of radius 1/2 centered at p = 1/2.
function StatePlot({
  W = 340,
  showLower = false,
  point = null, // [p, w]
  scatter = [], // [{p, w, color}]
  centroids = [], // [{p, w, color}] rendered as target markers
  segment = null, // [[p1,w1],[p2,w2]] chord between two candidate states
  showSemicircle = true,
  showFullCircle = false,
  showChords = false,
  showCenterVector = false,
  labels = true,
}) {
  const S = 240; // px per unit of p
  const r = S / 2; // circle radius in px (= 1/2 unit)
  const H = showLower ? 2 * r + 70 : r + 78;
  const cx = W / 2; // p = 1/2
  const cy = showLower ? H / 2 : H - 44;
  const px = (p, w) => [cx + (p - 0.5) * S, cy - w * S];
  const x0 = px(0, 0)[0], x1 = px(1, 0)[0];

  // graph paper lines every 0.125 units, bold every 0.5
  const lines = [];
  const stepU = 0.125;
  const umin = 0.5 - cx / S, umax = 0.5 + (W - cx) / S;
  const vmin = -(H - cy) / S, vmax = cy / S;
  for (let u = Math.ceil(umin / stepU) * stepU; u <= umax; u += stepU) {
    const bold = Math.abs((u * 2) % 1) < 1e-6;
    lines.push(
      <line
        key={"v" + u.toFixed(3)}
        x1={px(u, 0)[0]} y1={0} x2={px(u, 0)[0]} y2={H}
        stroke={bold ? C.gridBold : C.grid} strokeWidth={bold ? 1 : 0.6}
      />
    );
  }
  for (let v = Math.ceil(vmin / stepU) * stepU; v <= vmax; v += stepU) {
    const bold = Math.abs((v * 2) % 1) < 1e-6;
    lines.push(
      <line
        key={"h" + v.toFixed(3)}
        x1={0} y1={cy - v * S} x2={W} y2={cy - v * S}
        stroke={bold ? C.gridBold : C.grid} strokeWidth={bold ? 1 : 0.6}
      />
    );
  }

  const semiPath = `M ${x0} ${cy} A ${r} ${r} 0 0 1 ${x1} ${cy}`;
  const lowerPath = `M ${x0} ${cy} A ${r} ${r} 0 0 0 ${x1} ${cy}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#FFFFFF", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
      {lines}
      {/* axes: horizontal at w=0, vertical at p=0 */}
      <line x1={0} y1={cy} x2={W} y2={cy} stroke={C.ink} strokeWidth={1.4} />
      <line x1={x0} y1={0} x2={x0} y2={H} stroke={C.ink} strokeWidth={1.4} />
      {showSemicircle && (
        <path d={semiPath} fill="none" stroke={C.gold} strokeWidth={2} strokeDasharray="5 4" />
      )}
      {showLower && showFullCircle && (
        <path d={lowerPath} fill="none" stroke={C.red} strokeWidth={2} strokeDasharray="5 4" />
      )}
      {/* anchor labels */}
      {labels && (
        <>
          <text x={x1} y={cy + 16} textAnchor="middle" fontFamily={mono} fontSize="10" fill={C.inkSoft}>always H (p=1)</text>
          <text x={x0} y={cy + 16} textAnchor="middle" fontFamily={mono} fontSize="10" fill={C.inkSoft}>always T (p=0)</text>
          <text x={cx + 6} y={cy - r - 6} fontFamily={mono} fontSize="10" fill={C.teal}>fair coin (½, ½)</text>
          <circle cx={cx} cy={cy - r} r={3.5} fill={C.teal} />
          <circle cx={x1} cy={cy} r={3.5} fill={C.ink} />
          <circle cx={x0} cy={cy} r={3.5} fill={C.ink} />
        </>
      )}
      {/* axis captions */}
      <text x={W - 6} y={cy - 8} textAnchor="end" fontFamily={mono} fontSize="11" fill={C.ink}>p = P(heads)</text>
      <text x={x0 + 8} y={14} fontFamily={mono} fontSize="11" fill={C.ink}>band width</text>
      {segment && (
        <>
          <line
            x1={px(segment[0][0], segment[0][1])[0]} y1={px(segment[0][0], segment[0][1])[1]}
            x2={px(segment[1][0], segment[1][1])[0]} y2={px(segment[1][0], segment[1][1])[1]}
            stroke={C.inkSoft} strokeWidth={1.4}
          />
          <circle cx={px(segment[0][0], segment[0][1])[0]} cy={px(segment[0][0], segment[0][1])[1]} r={4} fill={C.teal} stroke={C.ink} strokeWidth={1.2} />
          <circle cx={px(segment[1][0], segment[1][1])[0]} cy={px(segment[1][0], segment[1][1])[1]} r={4} fill={C.red} stroke={C.ink} strokeWidth={1.2} />
        </>
      )}
      {scatter.map((s, i) => {
        const [sx, sy] = px(s.p, s.w);
        return <circle key={i} cx={sx} cy={sy} r={3} fill={s.color} fillOpacity={0.55} />;
      })}
      {centroids.map((c, i) => {
        const [sx, sy] = px(c.p, c.w);
        return (
          <g key={"c" + i}>
            <circle cx={sx} cy={sy} r={7.5} fill={c.color} stroke="#fff" strokeWidth={2} />
            <circle cx={sx} cy={sy} r={2.5} fill="#fff" />
          </g>
        );
      })}
      {point && showChords && (
        <>
          {(() => {
            const [Px, Py] = px(point[0], point[1]);
            const [Tx2, Ty2] = px(0, 0);
            const [Hx2, Hy2] = px(1, 0);
            // right-angle marker at the state, legs toward the two corners
            const l1 = Math.hypot(point[0], point[1]), l2 = Math.hypot(1 - point[0], point[1]);
            const s = 0.045;
            const e1 = [(-point[0] / l1) * s, (-point[1] / l1) * s];
            const e2 = [((1 - point[0]) / l2) * s, (-point[1] / l2) * s];
            const q = (dx, dy) => px(point[0] + dx, point[1] + dy);
            const sq = [q(e1[0], e1[1]), q(e1[0] + e2[0], e1[1] + e2[1]), q(e2[0], e2[1])];
            return (
              <>
                <line x1={Tx2} y1={Ty2} x2={Px} y2={Py} stroke={C.teal} strokeWidth={2.2} />
                <line x1={Hx2} y1={Hy2} x2={Px} y2={Py} stroke={C.gold} strokeWidth={2.2} />
                {point[1] > 0.03 && l1 > 0.1 && l2 > 0.1 && (
                  <polyline points={`${sq[0].join(",")} ${sq[1].join(",")} ${sq[2].join(",")}`} fill="none" stroke={C.ink} strokeWidth={1} />
                )}
                <text x={(Tx2 + Px) / 2 - 8} y={(Ty2 + Py) / 2 - 6} textAnchor="end" fontFamily={mono} fontSize="11" fontWeight="600" fill={C.teal}>√p</text>
                <text x={(Hx2 + Px) / 2 + 8} y={(Hy2 + Py) / 2 - 6} fontFamily={mono} fontSize="11" fontWeight="600" fill={C.gold}>√(1−p)</text>
              </>
            );
          })()}
        </>
      )}
      {point && showCenterVector && (() => {
        const [Px, Py] = px(point[0], point[1]);
        const dx = cx - Px, dy = cy - Py;
        const L = Math.hypot(dx, dy) || 1;
        const ux = dx / L, uy = dy / L;
        const hx = cx - 9 * ux, hy = cy - 9 * uy; // arrowhead base, just short of center
        const wx = -uy, wy = ux;
        return (
          <g>
            <line x1={Px} y1={Py} x2={hx} y2={hy} stroke={C.violet} strokeWidth={3.2} strokeLinecap="round" opacity={0.9} />
            <polygon
              points={`${cx},${cy} ${hx + 5 * wx},${hy + 5 * wy} ${hx - 5 * wx},${hy - 5 * wy}`}
              fill={C.violet} opacity={0.9}
            />
            <text x={(Px + cx) / 2 + 10 * wx} y={(Py + cy) / 2 + 10 * wy + 4} fontFamily={mono} fontSize="10" fontWeight="600" fill={C.violet}>½</text>
          </g>
        );
      })()}
      {point && (
        <>
          <line x1={cx} y1={cy} x2={px(point[0], point[1])[0]} y2={px(point[0], point[1])[1]} stroke={C.ink} strokeWidth={1.2} />
          <circle cx={px(point[0], point[1])[0]} cy={px(point[0], point[1])[1]} r={6} fill={C.gold} stroke={C.ink} strokeWidth={1.5} />
        </>
      )}
    </svg>
  );
}

function Tech({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 12, border: `1.5px dashed ${C.gridBold}`, borderRadius: 8, background: "#FAFDFF" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: "9px 12px", fontFamily: mono, fontSize: 11, letterSpacing: 1, color: C.inkSoft }}
      >
        {open ? "▾" : "▸"} FOR THE CURIOUS — {title}
      </button>
      {open && <div style={{ padding: "0 14px 12px", fontSize: 14, lineHeight: 1.55 }}>{children}</div>}
    </div>
  );
}

// ---------- amplitude bars ----------
function AmpBars({ a, b, title, color = C.gold }) {
  const bar = (val, label) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "5px 0" }}>
      <span style={{ fontFamily: mono, fontSize: 12, width: 64, color: C.inkSoft }}>{label}</span>
      <div style={{ position: "relative", flex: 1, height: 16, background: "#fff", border: `1px solid ${C.gridBold}`, borderRadius: 3 }}>
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: C.gridBold }} />
        <div
          style={{
            position: "absolute",
            top: 2,
            bottom: 2,
            left: val >= 0 ? "50%" : `${50 + val * 48}%`,
            width: `${Math.abs(val) * 48}%`,
            background: val >= 0 ? color : C.red,
            borderRadius: 2,
            transition: "all .15s",
          }}
        />
      </div>
      <span style={{ fontFamily: mono, fontSize: 12, width: 52, textAlign: "right" }}>{fmt(val)}</span>
    </div>
  );
  return (
    <div style={{ padding: "10px 12px", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, marginBottom: 10 }}>
      {title && <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 1, color: C.inkSoft, marginBottom: 6 }}>{title}</div>}
      {bar(a, "a (heads)")}
      {bar(b, "b (tails)")}
    </div>
  );
}

// ================= STEP 1 =================
function Step1() {
  const [runs, setRuns] = useState([]);
  return (
    <div>
      <p>
        Take a fair coin. Before you flip it ten times, ask yourself: <em>which sequences do you expect to see?</em> All heads? A regular pattern? Something messy? Write down a few guesses, then flip.
      </p>
      <Btn onClick={() => setRuns((r) => [flipSeq(0.5, 10), ...r].slice(0, 6))}>
        Flip 10 times
      </Btn>
      <div style={{ marginTop: 14 }}>
        {runs.length === 0 && (
          <div style={{ fontFamily: mono, fontSize: 12, color: C.inkSoft }}>
            no flips yet — the page is your lab bench
          </div>
        )}
        {runs.map((seq, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div>{seq.map((v, j) => <CoinChip key={j} v={v} />)}</div>
            <span style={{ fontFamily: mono, fontSize: 12, color: C.inkSoft }}>
              {seq.filter((v) => v === 1).length}H
            </span>
          </div>
        ))}
      </div>
      <Notice>
        Every particular sequence is equally likely — HHHHHHHHHH is exactly as likely as HTHHTTHTHT. What differs is how <em>many</em> sequences look "mixed" and how many look "pure". Your expectations are about the whole collection of possible runs, not about any single run.
      </Notice>
    </div>
  );
}

// ================= STEP 2 =================
function Step2() {
  const coins = useMemo(() => {
    const detSide = Math.random() < 0.5 ? 1 : 0;
    return shuffle([
      { kind: "fair", p: 0.5 },
      { kind: "biased", p: 0.8 },
      { kind: "deterministic", p: detSide },
    ]);
  }, []);
  const [seqs, setSeqs] = useState([[], [], []]);
  const [guess, setGuess] = useState(["", "", ""]);
  const [revealed, setRevealed] = useState(false);
  const names = ["Coin A", "Coin B", "Coin C"];
  const opts = ["fair", "biased", "deterministic"];

  return (
    <div>
      <p>
        Now three <strong>mystery coins</strong>. One is fair. One is biased. One is deterministic: it has already made up its mind, but you do not know which side it favors. Flip each one and try to identify it.
      </p>
      {coins.map((c, i) => (
        <div key={i} style={{ padding: "10px 12px", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <strong style={{ fontFamily: mono, fontSize: 13 }}>{names[i]}</strong>
            <Btn kind="outline" onClick={() =>
              setSeqs((s) => s.map((q, j) => (j === i ? [...q, ...flipSeq(c.p, 10)].slice(-20) : q)))
            }>
              flip ×10
            </Btn>
          </div>
          <div style={{ marginTop: 6, minHeight: 26 }}>
            {seqs[i].map((v, j) => <CoinChip key={j} v={v} />)}
          </div>
          <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {opts.map((o) => (
              <button
                key={o}
                onClick={() => setGuess((g) => g.map((v, j) => (j === i ? o : v)))}
                style={{
                  fontFamily: mono, fontSize: 11, padding: "4px 8px", borderRadius: 12,
                  border: `1.5px solid ${guess[i] === o ? C.gold : C.gridBold}`,
                  background: guess[i] === o ? C.goldSoft : "transparent",
                  cursor: "pointer", color: C.ink,
                }}
              >
                {o}
              </button>
            ))}
            {revealed && (
              <span style={{ fontFamily: mono, fontSize: 12, color: guess[i] === c.kind ? C.teal : C.red }}>
                {guess[i] === c.kind ? "✓" : "✗"} it's {c.kind}
                {c.kind === "deterministic" ? (c.p === 1 ? " (heads)" : " (tails)") : ""}
              </span>
            )}
          </div>
        </div>
      ))}
      <Btn onClick={() => setRevealed(true)} disabled={guess.some((g) => !g)}>
        Reveal
      </Btn>
      <Notice>
        Before its first flip, what odds would you give the deterministic coin? You do not know its side, so: 50/50 — <em>the same as the fair coin</em>. The expected outcome alone cannot tell them apart. You need a second indicator.
      </Notice>
    </div>
  );
}

// ================= STEP 3 =================
function Step3() {
  const [scatter, setScatter] = useState([]);
  const runExperiments = () => {
    const pts = [];
    for (let k = 0; k < 8; k++) {
      const f = flipSeq(0.5, 30);
      pts.push({ p: mean(f), w: sampleStd(f), color: C.teal });
      const bz = flipSeq(0.8, 30); // step 2's biased coin
      pts.push({ p: mean(bz), w: sampleStd(bz), color: C.gold });
      const side = Math.random() < 0.5 ? 1 : 0; // fresh mystery deterministic coin
      const d = flipSeq(side, 30);
      pts.push({ p: mean(d), w: sampleStd(d), color: C.red });
    }
    setScatter((s) => [...s, ...pts].slice(-240));
  };
  const centroidOf = (color) => {
    const s = scatter.filter((x) => x.color === color);
    if (!s.length) return null;
    return { p: mean(s.map((x) => x.p)), w: mean(s.map((x) => x.w)), color };
  };
  const centroids = [centroidOf(C.teal), centroidOf(C.gold), centroidOf(C.red)].filter(Boolean);
  const [shown, setShown] = useState([false, false, false]);
  const EXS = [
    {
      seq: [1, 0, 1, 0],
      sol: "p̂ = 2/4 = ½. Deviations: +½, −½, +½, −½. Squares: ¼ each → average ¼ → band width √¼ = ½. (Shortcut: √(½·½) = ½.)",
    },
    {
      seq: [1, 1, 1, 1],
      sol: "p̂ = 1. Every deviation is 0 → band width 0. A sequence without surprises has no spread. (Shortcut: √(1·0) = 0.)",
    },
    {
      seq: [1, 1, 1, 0],
      sol: "p̂ = ¾. Deviations: +¼, +¼, +¼, −¾. Squares: 3·(1/16) + 9/16 = 12/16 → average 3/16 → band width √(3/16) ≈ 0.43. (Shortcut: √(¾·¼) ≈ 0.43.)",
    },
  ];
  return (
    <div>
      <p>
        Give each run of 30 flips <strong>two numbers</strong>: its average outcome (count H = 1 and T = 0, so the average is simply the observed heads-fraction p) and its spread — we call it the <strong>band width</strong> of the sequence. Then bring back all three coins of step 2 and run many experiments with each: the fair coin <span style={{ color: C.teal }}>●</span>, the biased coin <span style={{ color: C.gold }}>●</span>, and fresh mystery deterministic coins <span style={{ color: C.red }}>●</span>. Drop each run on the chart.
      </p>
      <p>
        Here is the important move: your <em>belief</em> about a coin is fixed <strong>before you start flipping</strong>. So its two numbers are <em>expectations over everything that might happen</em>: the average over the whole cloud of possible runs, not the one run you happen to get. Each belief is one point — the center of its cloud (the markers with a white ring).
      </p>
      <Btn onClick={runExperiments}>Run 8 experiments of each</Btn>
      <div style={{ marginTop: 12 }}>
        <StatePlot scatter={scatter} centroids={centroids} showSemicircle={scatter.length > 40} labels={false} />
      </div>
      <Notice>
        The fair coin's possible runs all behave alike, so its belief marker settles on the curve, near (½, ½). So does the biased coin's — at a different seat, near (0.8, 0.4): <em>every</em> coin with definite odds earns a seat on this one curve, fairness is not special. The mystery deterministic coin's possible worlds <em>disagree</em>: each single world lands at a corner, (0, 0) or (1, 0). Averaging over both possibilities pulls the belief to (½, 0): the same expected outcome as the fair coin, zero expected band width, and strictly <em>inside</em> the region that the curve encloses. Definite coins live on the curve; uncertainty about <em>which</em> coin you hold pulls the belief into the interior. (If you had first peeked at one flip, you would have learned the coin's side and jumped to a corner. The interior point describes you <em>before</em> learning anything.) And save one question for later: the fair coin and the mystery coin now sit at different points — but how far apart are they, <em>really</em>? That simple, completely non-quantum question drives this whole tutorial. First we find the exact shape of the curve. Then we return for the interior.
      </Notice>
      <Tech title="how to compute the band width — try it yourself">
        <p style={{ margin: "0 0 8px" }}>
          The band width measures how far the flips scatter around their own average.
          The recipe: <strong>(1)</strong> write each flip as a number, H&nbsp;=&nbsp;1
          and T&nbsp;=&nbsp;0; <strong>(2)</strong> compute the average p̂ (just the
          fraction of heads); <strong>(3)</strong> write down each flip's deviation from
          that average; <strong>(4)</strong> square the deviations, average the squares,
          and take the square root. For 0/1 flips this always boils down to the shortcut
          √(p̂(1−p̂)) — verify it in the exercises below.
        </p>
        {EXS.map((ex, i) => (
          <div key={i} style={{ padding: "8px 0", borderTop: `1px solid ${C.grid}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: mono, fontSize: 12, color: C.inkSoft }}>{i + 1}.</span>
              <span>{ex.seq.map((v, j) => <CoinChip key={j} v={v} />)}</span>
              <button
                onClick={() => setShown((s) => s.map((x, j) => (j === i ? !x : x)))}
                style={{ fontFamily: mono, fontSize: 11, padding: "4px 10px", borderRadius: 12, border: `1.5px solid ${C.gridBold}`, background: shown[i] ? C.goldSoft : "#fff", color: C.ink, cursor: "pointer" }}
              >
                {shown[i] ? "hide solution" : "show solution"}
              </button>
            </div>
            {shown[i] && (
              <div style={{ marginTop: 6, fontFamily: mono, fontSize: 12.5, lineHeight: 1.6, color: C.ink }}>
                {ex.sol}
              </div>
            )}
          </div>
        ))}
      </Tech>
      <Tech title="why the square root — and not the variance?">
        Choosing the square-rooted spread — rather than, say, the squared one (statisticians' <em>variance</em>), or some other summary — may look like taste. Two defenses. First, the spread is not invented but <em>measured</em>: it is what the runs themselves report. Second, only the square root has the same units as p itself, so the two numbers may honestly share one drawing. The deeper defense — that this choice, and no other, makes distances on the drawing tell the statistical truth — has its own bench waiting in the evidence room (Playground A).
      </Tech>
    </div>
  );
}

// The needle's-eye view: P's private frame, axes = the two chords; the needle
// sweeps the first quarter of the circle of radius 1/2 as p goes 0 -> 1.
function NeedleView({ p }) {
  const a = Math.sqrt(Math.max(0, p)) / 2;
  const b = Math.sqrt(Math.max(0, 1 - p)) / 2;
  const W = 340, H = 240, S = 300, ox = 54, oy = H - 44;
  const px = (u, v) => [ox + u * S, oy - v * S];
  const [Hx, Hy] = px(0.5, 0);
  const [Tx, Ty] = px(0, 0.5);
  const [Fx, Fy] = px(Math.SQRT1_2 / 2, Math.SQRT1_2 / 2);
  const [Nx, Ny] = px(a, b);
  const grid = [];
  for (let u = 0.125; u <= 0.6; u += 0.125) {
    const bold = Math.abs((u * 4) % 1) < 1e-6;
    grid.push(<line key={"v" + u} x1={px(u, 0)[0]} y1={px(0, 0.62)[1]} x2={px(u, 0)[0]} y2={oy} stroke={bold ? C.gridBold : C.grid} strokeWidth={bold ? 1 : 0.6} />);
    grid.push(<line key={"h" + u} x1={ox} y1={px(0, u)[1]} x2={px(0.78, 0)[0]} y2={px(0, u)[1]} stroke={bold ? C.gridBold : C.grid} strokeWidth={bold ? 1 : 0.6} />);
  }
  // arrowhead for the needle
  const L = Math.hypot(Nx - ox, Ny - oy) || 1;
  const ux = (Nx - ox) / L, uy = (Ny - oy) / L;
  const hx = Nx - 10 * ux, hy = Ny - 10 * uy;
  const wx = -uy, wy = ux;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block", marginTop: 10 }}>
      {grid}
      {/* axes = the two chords, from where you stand */}
      <line x1={ox} y1={oy} x2={px(0.78, 0)[0]} y2={oy} stroke={C.ink} strokeWidth={1.4} />
      <line x1={ox} y1={oy} x2={ox} y2={px(0, 0.62)[1]} stroke={C.ink} strokeWidth={1.4} />
      <text x={px(0.78, 0)[0]} y={oy + 16} textAnchor="end" fontFamily={mono} fontSize="10" fill={C.teal}>toward T</text>
      <text x={ox + 6} y={px(0, 0.6)[1]} fontFamily={mono} fontSize="10" fill={C.gold}>toward H</text>
      <text x={ox - 6} y={oy + 16} textAnchor="middle" fontFamily={mono} fontSize="10" fill={C.inkSoft}>you</text>
      {/* the quarter circle of radius 1/2 */}
      <path d={`M ${Hx} ${Hy} A ${0.5 * S} ${0.5 * S} 0 0 0 ${Tx} ${Ty}`} fill="none" stroke={C.inkSoft} strokeWidth={1.5} strokeDasharray="5 4" />
      {/* landmarks */}
      <circle cx={Hx} cy={Hy} r={4} fill={C.ink} />
      <text x={Hx + 6} y={Hy - 8} fontFamily={mono} fontSize="10" fontWeight="600" fill={C.ink}>H′ (½, 0)</text>
      <circle cx={Tx} cy={Ty} r={4} fill={C.ink} />
      <text x={Tx + 8} y={Ty + 4} fontFamily={mono} fontSize="10" fontWeight="600" fill={C.ink}>T′ (0, ½)</text>
      <circle cx={Fx} cy={Fy} r={3.5} fill={C.teal} />
      <text x={Fx + 8} y={Fy - 4} fontFamily={mono} fontSize="10" fill={C.teal}>fair coin (45°)</text>
      {/* the needle */}
      <line x1={ox} y1={oy} x2={hx} y2={hy} stroke={C.violet} strokeWidth={3.2} strokeLinecap="round" opacity={0.9} />
      <polygon points={`${Nx},${Ny} ${hx + 5 * wx},${hy + 5 * wy} ${hx - 5 * wx},${hy - 5 * wy}`} fill={C.violet} opacity={0.9} />
      <circle cx={Nx} cy={Ny} r={4.5} fill={C.violet} stroke={C.ink} strokeWidth={1.2} />
      <text x={W - 8} y={18} textAnchor="end" fontFamily={mono} fontSize="10.5" fontWeight="600" fill={C.violet}>
        needle tip = ({a.toFixed(2)}, {b.toFixed(2)})
      </text>
    </svg>
  );
}

// ================= STEP 4 =================
function Step4() {
  const [p, setP] = useState(0.5);
  const w = Math.sqrt(Math.max(0, p * (1 - p)));
  return (
    <div>
      <p>
        Step 3's curve is no accident. It is a perfect <strong>circle</strong> — half of one — with the fair coin at the top of the arc and the two certain coins at its ends: the <strong>Bernoulli circle</strong>. Slide the bias and watch where your belief lives.
      </p>
      <Slider
        value={p} min={0} max={1} step={0.01} onChange={setP}
        label="P(heads)"
        readout={`p=${p.toFixed(2)}   σ=${w.toFixed(2)}   chords: √p=${Math.sqrt(p).toFixed(2)}, √(1−p)=${Math.sqrt(1 - p).toFixed(2)}`}
      />
      <StatePlot point={[p, w]} showChords showCenterVector />
      <p style={{ marginTop: 14 }}>
        Look closely at the picture: a thin dark line runs from the circle's center out to your state — a pointer from the center to <em>you</em>. Useful, but it is <em>not</em> a compass. A compass needle works the other way around: it sits in <em>your</em> hand, and points from wherever <em>you</em> stand toward a fixed landmark. So make the move <strong>Copernicus</strong> made, and flip the arrow. Stand at your state — <em>you</em> are the center of the universe now — and let the needle point at the one landmark that never changes its distance: the <strong>center</strong> of the Bernoulli circle, always exactly one radius away — length <strong>½</strong>, whoever you are. That is the violet arrow: fixed length, only its <em>direction</em> carries the news. Every inch a compass needle. Call it the <strong>Bernoulli vector</strong>.
      </p>
      <p>
        A needle alone is not enough; a compass needs a <em>rose</em> — reference directions to read the bearing against. You own two natural ones: the direction toward always-T and the direction toward always-H, the two certain coins. And here geometry hands you a gift: from <em>every</em> seat on the circle, those two directions stand exactly at a <strong>right angle</strong> to each other — the little square in the picture, guaranteed by a theorem twenty-six centuries old (Thales). Your rose is a proper one, wherever you sit. Here is your needle's-eye view — driven by the same slider:
      </p>
      <NeedleView p={p} />
      <p style={{ marginTop: 14 }}>
        Watch the map get drawn — no formula, just sliding. Push p to 1: <strong>always-H lands at H′ = (½, 0)</strong>, the needle flat along your toward-T axis. Push p to 0: <strong>always-T lands at T′ = (0, ½)</strong>, straight up the toward-H axis. Park at p = ½: the <strong>fair coin</strong> sits exactly halfway between, at 45°, tip at ≈ (0.35, 0.35). And in between, the tip <em>sweeps out the first quarter of a circle of radius ½</em> around you. Textbooks introduce this square-root map by formula, and it frightens people. You have just drawn it with a slider.
      </p>
      <p>
        Say this step's lesson in one line, because it is the bridge the whole tutorial will cross. <strong>Stop thinking of always-H and always-T as merely <em>opposite</em>. Think of them as <em>orthogonal</em></strong> — at right angles, like two perpendicular directions in space. On the drawing they are the two ends of a diameter, as far apart as beliefs can get; their needles, H′ and T′, point at 90°. "As different as possible" has become "perpendicular". Today that sounds like wordplay. But nature runs a system that takes it <em>literally</em>: light, whose two basic wiggles — horizontal and vertical — really are two perpendicular directions in the room. Two steps from now, that turns out to be no coincidence at all.
      </p>
      <ClaimBadge n="2 & 3" who="COX + MIT" status="FIRST SIGHTING">
        The needle is your first sighting of both films at once. It is a little quantity computed <em>beneath</em> the probabilities — exactly the kind Cox adds up — and it is a needle free to point anywhere along an arc, the first sliver of the globe that MIT reserves for qubits. So far it commands a quarter turn; the rest of the planet is the business of steps 12–14.
      </ClaimBadge>
      <Notice>
        Every possible coin-belief lands on the <em>upper half of the Bernoulli circle</em>. The fair coin sits at the top of the arc, at (½, ½); the two deterministic coins sit at the two ends. You have just drawn a state space — but one puzzle remains open. In step 3, the belief marker fell <em>inside</em> this curve. We fill the interior next — and then this whole drawing will step off the paper and into hardware. When it does, keep a hand on your needle. Its two coordinates look like idle bookkeeping today; in two steps, nature will hand exactly this pair back to you — <em>flying</em>.
      </Notice>
      <Tech title="the circle's equation">
        A coin with heads-probability p has band width σ = √(p(1 − p)), so every state satisfies (p − ½)² + σ² = ¼: a circle of radius ½, centered on fair odds.
      </Tech>
      <Tech title="the two chords — √p, √(1−p), and what the right angle buys">
        Measure the two lines of your rose: the chord to T has length exactly <strong>√p</strong>, the chord to H exactly <strong>√(1−p)</strong> (test the ends: at p = 1 the chord to H shrinks to nothing). This pair of lengths, <strong>(√p, √(1−p))</strong> — the <strong>square-root pair</strong> — is the needle's secret identity, and it will quietly become the hero of the tutorial (official physics name: step 11). The right angle between the chords is Thales' circle theorem: a diameter is seen at 90° from any point of its circle. So the chords form a right triangle on the base T–H, and computing its area twice — half base times height gives σ/2, half leg times leg gives √p·√(1−p)/2 — <em>re-derives</em> step 3's formula, factored: σ = √p · √(1−p). Pythagoras on the two chords reads p + (1 − p) = 1. And should the band width still feel like one choice among many — step 3's admission — Playground A of the evidence room settles it: it is the <em>unique</em> vertical axis under which the drawing's plain ruler measures true distinguishability.
      </Tech>
      <Tech title="the needle's coordinates — the same map as a formula">
        On the rose's axes, T sits at (√p, 0) and H at (0, √(1−p)) — the chord lengths from the panel above. The center of the Bernoulli circle is the <em>midpoint</em> of the diameter T–H, and a midpoint is an average of endpoints, so the needle's tip is at <strong>(√p, √(1−p))/2</strong>: half the square-root pair. Check the length: p + (1−p) = 1, so the tip's distance from you is √1/2 = ½, always — it really stays on the quarter circle. Statisticians know the doubled version of this map as the <em>square-root embedding</em>; step 11 performs the doubling.
      </Tech>
    </div>
  );
}

// ================= STEP 5 : MIXING BELIEFS =================
function StepMix() {
  const sig = (q) => Math.sqrt(Math.max(0, q * (1 - q)));
  const [q1, setQ1] = useState(0.9);
  const [q2, setQ2] = useState(0.2);
  const [conf, setConf] = useState(0.6);
  const bp = conf * q1 + (1 - conf) * q2;
  const bw = conf * sig(q1) + (1 - conf) * sig(q2);
  return (
    <div>
      <p>
        The curve holds every <em>definite</em> coin. But step 3 left an open point: the mystery deterministic coin's belief marker settled <em>inside</em> the curve. Time to fill the interior — by mixing beliefs by hand.
      </p>
      <p>
        Suppose you hold a coin. With weight c you believe its bias is q₁ <span style={{ color: C.teal }}>●</span>, and with weight 1−c you believe its bias is q₂ <span style={{ color: C.red }}>●</span>. Your two numbers — expected outcome and expected band width — are the c-weighted averages. So as you turn c, your belief slides along the straight chord between the two candidate coins: on top of one candidate at c=1, on top of the other at c=0, and strictly <em>inside</em> the curve everywhere in between. Try it:
      </p>
      <Slider value={q1} min={0} max={1} step={0.01} onChange={setQ1}
        label="q₁ — first candidate bias" readout={`q₁=${q1.toFixed(2)}`} />
      <Slider value={q2} min={0} max={1} step={0.01} onChange={setQ2}
        label="q₂ — second candidate bias" readout={`q₂=${q2.toFixed(2)}`} />
      <Slider value={conf} min={0} max={1} step={0.01} onChange={setConf}
        label="c — confidence in the first candidate"
        readout={`c=${conf.toFixed(2)}  →  belief (${bp.toFixed(2)}, ${bw.toFixed(2)})`} />
      <StatePlot segment={[[q1, sig(q1)], [q2, sig(q2)]]} point={[bp, bw]} labels={false} />
      <p>
        The picture now separates the <strong>two kinds of not-knowing</strong> at a glance. A point <em>on the curve</em> is a coin you know exactly — and it is still uncertain! Each flip stays genuinely random; there is nothing left to learn. That is <strong>statistical</strong> uncertainty, and it is there to stay. A point <em>inside</em> the curve carries a second ingredient on top: you also don't know <em>which</em> coin you hold. That is <strong>systematic</strong> uncertainty — and it is curable. Watch the coin's flips long enough and they betray their maker: your confidence c drifts toward the coin you actually hold, and your belief point slides along the chord until it reaches the curve. There it stops, because a definite coin has nothing more to teach.
      </p>
      <p>
        So the geometry itself sorts your ignorance: <em>how far along the arc</em> you sit is a statement about the coin; <em>how deep inside</em> you sit is a statement about you — the part of the uncertainty that is your own missing knowledge rather than the coin's genuine randomness. Set q₁=1, q₂=0, c=½ and you rebuild the mystery deterministic coin from step 3, landing at the exact center of the disk: a coin with no randomness at all, seen through maximal ignorance.
      </p>
      <Notice>
        Two candidate biases plus one confidence reach <em>every</em> point of the upper disk — and no belief can ever leave it, since chords stay inside the circle that they span. So the state space of beliefs is not the curve but the whole disk inside it: <em>definite</em> coins on the rim, <em>uncertainty about the coin</em> in the interior, total ignorance at the exact center. The rim position carries the statistical part, which no data can remove; the depth into the interior is the systematic part, which flips can teach away. Our two main characters sit at the two extremes of the same odds: the fair coin is pure statistics, the mystery coin is pure ignorance. And with that, the drawing is finished — as far as coins alone can take it. Which forces the question a careful person cannot help asking: is this disk our private bookkeeping, or does nature keep books this way? There is hardware that answers: this very half-disk has been built in glass since 1852. The next step assembles it out of lamplight — and remember the introduction's warning. Light comes not only to rebuild the drawing, but to <em>audit</em> it.
      </Notice>
    </div>
  );
}

// ================= STEP 6 : A COIN MADE OF LIGHT =================
// Animated two-component wave, shown twice from one shared clock:
// top panel — the two wiggles side-on plus the front view (as in the original lab);
// bottom panel — the same wave as one object in 3D space, drag to turn.
// Sizes from beta; delta is the relative timing (0 = in step, 180 = opposite step,
// 90 = quarter-beat delay -> circle). Steps own the sliders.
function WaveDuo({ beta, delta = 0 }) {
  const [t, setT] = useState(0);
  const [run, setRun] = useState(true);
  const [view, setView] = useState({ yaw: 64, pitch: 16 });
  const runRef = useRef(run);
  runRef.current = run;
  const tgt = useRef(null); // preset 3D view we are easing toward
  const drag = useRef(null);

  useEffect(() => {
    let id;
    const loop = () => {
      if (runRef.current) setT((x) => x + 0.045);
      if (tgt.current) {
        setView((v) => {
          const g = tgt.current;
          if (!g) return v;
          const ny = v.yaw + (g.yaw - v.yaw) * 0.14;
          const np = v.pitch + (g.pitch - v.pitch) * 0.14;
          if (Math.abs(g.yaw - ny) < 0.25 && Math.abs(g.pitch - np) < 0.25) {
            tgt.current = null;
            return { yaw: g.yaw, pitch: g.pitch };
          }
          return { yaw: ny, pitch: np };
        });
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  const onDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    tgt.current = null;
    drag.current = { x: e.clientX, y: e.clientY, yaw: view.yaw, pitch: view.pitch };
  };
  const onMove = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    setView({
      yaw: Math.max(-6, Math.min(100, drag.current.yaw - dx * 0.35)),
      pitch: Math.max(-30, Math.min(30, drag.current.pitch + dy * 0.35)),
    });
  };
  const onUp = () => { drag.current = null; };

  const br = (beta * Math.PI) / 180;
  const a = Math.cos(br), b = Math.sin(br);
  const d = (delta * Math.PI) / 180;
  // one tip, shared by both panels: H and V displacement at the wave's near end
  const tipH = (tt) => a * Math.sin(tt);
  const tipV = (tt) => b * Math.sin(tt - d);
  // when the wiggles run in step (or exactly opposite step) the tip's path is a
  // straight line, and its turning points ±(a, b·cosδ) sit on the unit circle of
  // square-root pairs (step 4's circle). For other δ the path is an ellipse that
  // never reaches these points, so the markers hide.
  const lin = Math.abs(Math.sin(d)) < 0.02;
  const ux = a, uy = b * Math.cos(d);

  // ---------- top panel: side-on wiggles + front view ----------
  const N2 = 44, x0 = 12, x1 = 206, yH = 42, yV = 108, amp = 24;
  const pts = (A, ph) =>
    Array.from({ length: N2 + 1 }, (_, i) => {
      const x = x0 + (i * (x1 - x0)) / N2;
      const y = -A * amp * Math.sin(i * 0.32 - t + ph);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  const fcx = 273, fcy = 75, fr = 44;
  const trail2 = Array.from({ length: 34 }, (_, k2) => {
    const tt = t - k2 * 0.13;
    return [fcx + fr * tipH(tt), fcy - fr * tipV(tt), 1 - k2 / 36];
  });
  const grid2 = [];
  for (let x = 20; x <= 320; x += 30) grid2.push(<line key={"v" + x} x1={x} y1={0} x2={x} y2={150} stroke={C.grid} strokeWidth={0.8} />);
  for (let y = 15; y <= 145; y += 30) grid2.push(<line key={"h" + y} x1={0} y1={y} x2={340} y2={y} stroke={C.grid} strokeWidth={0.8} />);

  // ---------- bottom panel: the wave in space ----------
  const ps = (view.yaw * Math.PI) / 180, phv = (view.pitch * Math.PI) / 180;
  const cps = Math.cos(ps), sps = Math.sin(ps);
  const cph = Math.cos(phv), sph = Math.sin(phv);
  const W = 340, H = 180, cx = 170, cyy = 90, S = 56;
  // world: z = direction of flight, x = horizontal wiggle, y = vertical wiggle
  const proj = (x, y, z) => {
    const px = x * cps + z * sps;
    const z1 = -x * sps + z * cps;
    const py = y * cph - z1 * sph;
    return [cx + S * px, cyy - S * py];
  };
  const L = 2.4, k3 = 2.6, A3 = 0.62, N3 = 72;
  const zs = Array.from({ length: N3 + 1 }, (_, i) => -L + (2 * L * i) / N3);
  // traveling toward +z; at the near end z = −L this is exactly the shared tip
  const Ex = (z, tt) => A3 * tipH(tt - k3 * (z + L));
  const Ey = (z, tt) => A3 * tipV(tt - k3 * (z + L));
  const pl = (f) =>
    zs.map((z) => { const [X, Y] = f(z); return `${X.toFixed(1)},${Y.toFixed(1)}`; }).join(" ");
  const hPts = pl((z) => proj(Ex(z, t), 0, z));
  const vPts = pl((z) => proj(0, Ey(z, t), z));
  const sPts = pl((z) => proj(Ex(z, t), Ey(z, t), z));
  // stems from the flight axis: dashed gold/teal for the two component wiggles
  // (showing each one's plane), solid ink for the actual wave
  const stems = zs.filter((_, i) => i % 6 === 0).map((z, i) => {
    const [x0s, y0s] = proj(0, 0, z);
    const [xh, yh] = proj(Ex(z, t), 0, z);
    const [xv, yv] = proj(0, Ey(z, t), z);
    const [x2, y2] = proj(Ex(z, t), Ey(z, t), z);
    return (
      <g key={"s" + i}>
        <line x1={x0s} y1={y0s} x2={xh} y2={yh} stroke={C.gold} strokeWidth={1} strokeDasharray="2 3" opacity={0.5} />
        <line x1={x0s} y1={y0s} x2={xv} y2={yv} stroke={C.teal} strokeWidth={1} strokeDasharray="2 3" opacity={0.5} />
        <line x1={x0s} y1={y0s} x2={x2} y2={y2} stroke={C.ink} strokeWidth={1} opacity={0.13} />
      </g>
    );
  });
  // front frame at the near end (z = −L); fades to solid as the view goes head-on,
  // at which point only the trail remains — exactly the front-view panel above
  const hs = 0.8;
  const sq = [[-hs, -hs], [hs, -hs], [hs, hs], [-hs, hs]]
    .map(([x, y]) => proj(x, y, -L).map((v) => v.toFixed(1)).join(","))
    .join(" ");
  const hoF = Math.max(0, 1 - Math.abs(view.yaw) / 26) * Math.max(0, 1 - Math.abs(view.pitch) / 26);
  const cr1 = [proj(-hs, 0, -L), proj(hs, 0, -L)];
  const cr2 = [proj(0, -hs, -L), proj(0, hs, -L)];
  // the unit circle of square-root pairs, drawn on the frame plane (radius = one
  // unit of wiggle size); the tip's turning points sit on it
  const uc = Array.from({ length: 49 }, (_, i) => {
    const th = (2 * Math.PI * i) / 48;
    return proj(A3 * Math.cos(th), A3 * Math.sin(th), -L)
      .map((v) => v.toFixed(1)).join(",");
  }).join(" ");
  const trail3 = Array.from({ length: 30 }, (_, kk) => {
    const tt = t - kk * 0.13;
    const [X, Y] = proj(Ex(-L, tt), Ey(-L, tt), -L);
    return [X, Y, 1 - kk / 32];
  });
  const axA = proj(0, 0, -L), axB = proj(0, 0, L);
  const grid3 = [];
  for (let x = 20; x <= 320; x += 30) grid3.push(<line key={"v" + x} x1={x} y1={0} x2={x} y2={H} stroke={C.grid} strokeWidth={0.8} />);
  for (let y = 15; y <= 175; y += 30) grid3.push(<line key={"h" + y} x1={0} y1={y} x2={W} y2={y} stroke={C.grid} strokeWidth={0.8} />);

  return (
    <div>
      <svg viewBox="0 0 340 150" style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
        {grid2}
        <line x1={x0} y1={yH} x2={x1} y2={yH} stroke={C.gridBold} strokeWidth={1} />
        <line x1={x0} y1={yV} x2={x1} y2={yV} stroke={C.gridBold} strokeWidth={1} />
        <g transform={`translate(0 ${yH})`}>
          <polyline points={pts(a, Math.PI)} fill="none" stroke={C.gold} strokeWidth={2.5} strokeLinejoin="round" />
        </g>
        <g transform={`translate(0 ${yV})`}>
          <polyline points={pts(b, Math.PI + d)} fill="none" stroke={C.teal} strokeWidth={2.5} strokeLinejoin="round" />
        </g>
        <text x={x0} y={14} fontFamily={mono} fontSize="9.5" fill={C.gold}>H wiggle · size a = {a.toFixed(2)}</text>
        <text x={x0} y={80} fontFamily={mono} fontSize="9.5" fill={C.teal}>V wiggle · size b = {b.toFixed(2)}</text>
        <text x={x0} y={146} fontFamily={mono} fontSize="9" fill={C.inkSoft}>the wave, flying to the right →</text>
        <rect x={fcx - fr - 6} y={fcy - fr - 6} width={2 * fr + 12} height={2 * fr + 12} rx={8} fill="#fff" stroke={C.gridBold} strokeWidth={1.5} />
        <line x1={fcx - fr} y1={fcy} x2={fcx + fr} y2={fcy} stroke={C.grid} strokeWidth={1.2} />
        <line x1={fcx} y1={fcy - fr} x2={fcx} y2={fcy + fr} stroke={C.grid} strokeWidth={1.2} />
        {trail2.map(([x, y, o], k2) => (
          <circle key={k2} cx={x} cy={y} r={k2 === 0 ? 4.5 : 2.2} fill={C.ink} opacity={k2 === 0 ? 1 : 0.28 * o} />
        ))}
        {lin && (
          <circle cx={fcx + fr * ux} cy={fcy - fr * uy} r={2.8} fill="none" stroke={C.gold} strokeWidth={1.4} opacity={0.8} />
        )}
        <text x={fcx} y={fcy + fr + 16} textAnchor="middle" fontFamily={mono} fontSize="9" fill={C.inkSoft}>front view — what the tip draws</text>
      </svg>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        style={{
          width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`,
          borderRadius: 8, display: "block", touchAction: "none", marginTop: 8,
          cursor: drag.current ? "grabbing" : "grab",
        }}
      >
        {grid3}
        <line x1={axA[0]} y1={axA[1]} x2={axB[0]} y2={axB[1]} stroke={C.gridBold} strokeWidth={1.2} />
        {/* frame drawn behind the waves — it sits at the near end of the axis, but the
            waves pass in front of its far edges, so painting it first reads correctly */}
        <polygon points={sq} fill="none" stroke={C.gridBold} strokeWidth={1.5} />
        <line x1={cr1[0][0]} y1={cr1[0][1]} x2={cr1[1][0]} y2={cr1[1][1]} stroke={C.grid} strokeWidth={1.2} />
        <line x1={cr2[0][0]} y1={cr2[0][1]} x2={cr2[1][0]} y2={cr2[1][1]} stroke={C.grid} strokeWidth={1.2} />
        <polygon points={uc} fill="none" stroke={C.gold} strokeWidth={1} strokeDasharray="2 3" opacity={0.4} />
        {stems}
        <polyline points={hPts} fill="none" stroke={C.gold} strokeWidth={2} strokeLinejoin="round" opacity={0.9} />
        <polyline points={vPts} fill="none" stroke={C.teal} strokeWidth={2} strokeLinejoin="round" opacity={0.9} />
        <polyline points={sPts} fill="none" stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
        {/* near head-on the plane really is in front of the whole wave: fade in a solid
            copy of the frame over the curves, leaving only the trail — the front view */}
        {hoF > 0.01 && (
          <g opacity={hoF}>
            <polygon points={sq} fill="#fff" fillOpacity={0.92} stroke={C.gridBold} strokeWidth={1.5} />
            <line x1={cr1[0][0]} y1={cr1[0][1]} x2={cr1[1][0]} y2={cr1[1][1]} stroke={C.grid} strokeWidth={1.2} />
            <line x1={cr2[0][0]} y1={cr2[0][1]} x2={cr2[1][0]} y2={cr2[1][1]} stroke={C.grid} strokeWidth={1.2} />
            <polygon points={uc} fill="none" stroke={C.gold} strokeWidth={1} strokeDasharray="2 3" opacity={0.4} />
          </g>
        )}
        {trail3.map(([X, Y, o], kk) => (
          <circle key={kk} cx={X} cy={Y} r={kk === 0 ? 4.5 : 2.2} fill={C.ink} opacity={kk === 0 ? 1 : 0.28 * o} />
        ))}
        {lin && (() => {
          const [X, Y] = proj(A3 * ux, A3 * uy, -L);
          return <circle cx={X} cy={Y} r={2.8} fill="none" stroke={C.gold} strokeWidth={1.4} opacity={0.8} />;
        })()}
        <text x={12} y={14} fontFamily={mono} fontSize="9.5">
          <tspan fill={C.ink}>in space — </tspan>
          <tspan fill={C.gold}>H</tspan>
          <tspan fill={C.ink}> + </tspan>
          <tspan fill={C.teal}>V</tspan>
          <tspan fill={C.ink}> = the wave (dark)</tspan>
        </text>
        <text x={12} y={175} fontFamily={mono} fontSize="9" fill={C.inkSoft}>
          drag to turn · framed square = the front view above
        </text>
      </svg>
      <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
        <Btn kind="ghost" onClick={() => setRun((v) => !v)}>{run ? "pause" : "play"}</Btn>
        <Btn kind="ghost" onClick={() => { tgt.current = { yaw: 64, pitch: 16 }; }}>3D view</Btn>
        <Btn kind="ghost" onClick={() => { tgt.current = { yaw: 90, pitch: 14 }; }}>side view</Btn>
        <Btn kind="ghost" onClick={() => { tgt.current = { yaw: 0, pitch: 0 }; }}>look down the axis</Btn>
      </div>
    </div>
  );
}

// Single-photon clicker: the coin flip made of light. Pass chance = cos^2(beta).
function PhotonCounter({ beta }) {
  const [log, setLog] = useState([]);
  useEffect(() => setLog([]), [beta]);
  const pPass = Math.cos((beta * Math.PI) / 180) ** 2;
  const fire = (n) =>
    setLog((L) => [...L, ...Array.from({ length: n }, () => (Math.random() < pPass ? 1 : 0))].slice(-400));
  const nT = log.filter((v) => v).length;
  const shown = log.slice(-50);
  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 1, color: C.inkSoft, marginBottom: 8 }}>
        DIM THE LAMP — ONE PHOTON AT A TIME THROUGH THE HORIZONTAL SHEET
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <Btn onClick={() => fire(1)}>send 1 photon</Btn>
        <Btn onClick={() => fire(25)}>send 25</Btn>
        <Btn kind="ghost" onClick={() => setLog([])}>reset</Btn>
      </div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap", minHeight: 14, marginBottom: 8 }}>
        {shown.map((v, i) => (
          <span key={i} style={{
            width: 10, height: 10, borderRadius: "50%",
            background: v ? C.gold : "#fff",
            border: `1.5px solid ${v ? C.gold : C.inkSoft}`,
            opacity: v ? 1 : 0.55,
          }} />
        ))}
        {shown.length === 0 && (
          <span style={{ fontFamily: mono, fontSize: 11, color: C.inkSoft }}>…the detector is waiting…</span>
        )}
      </div>
      <div style={{ fontFamily: mono, fontSize: 12, color: C.ink }}>
        through: {nT}/{log.length}
        {log.length > 0 && <> = {((100 * nT) / log.length).toFixed(0)}%</>}
        {" · "}predicted a² = {(100 * pPass).toFixed(0)}%
      </div>
    </div>
  );
}

// Step 3's experiment, rerun on lamplight: each run = 30 photons through the
// same fixed horizontal sheet — only the prepared beam's tilt varies. Runs are
// scored exactly like coin runs (heads-fraction, band width) and dropped on the
// same blank chart; the semicircle must re-emerge from the data before it is
// drawn (same reveal threshold as step 3). Violet dots: the slider-chosen beam.
function LightRunsChart({ beta }) {
  const [scatter, setScatter] = useState([]);
  const measureAt = (bDeg, color) => {
    const pPass = Math.cos((bDeg * Math.PI) / 180) ** 2;
    const seq = flipSeq(pPass, 30);
    return { p: mean(seq), w: sampleStd(seq), color };
  };
  const measureThis = () => setScatter((s) => [...s, measureAt(beta, C.violet)].slice(-240));
  const survey = () =>
    setScatter((s) =>
      [...s, ...Array.from({ length: 12 }, (_, i) => measureAt((90 * (i + Math.random())) / 12, C.gold))].slice(-240)
    );
  return (
    <div style={{ marginTop: 12, background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 1, color: C.inkSoft, marginBottom: 8 }}>
        ONE FIXED QUESTION, MANY BEAMS — EVERY RUN: 30 PHOTONS THROUGH THE SAME HORIZONTAL SHEET
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <Btn onClick={measureThis}>{`measure your beam (β=${beta}°)`}</Btn>
        <Btn onClick={survey}>survey 12 beam tilts</Btn>
        <Btn kind="ghost" onClick={() => setScatter([])}>reset</Btn>
      </div>
      <StatePlot scatter={scatter} showSemicircle={scatter.length > 30} labels={false} />
      <div style={{ fontFamily: mono, fontSize: 10.5, color: C.inkSoft, marginTop: 6 }}>
        <span style={{ color: C.violet }}>●</span> your beam, from the slider above ·{" "}
        <span style={{ color: C.gold }}>●</span> surveyed beams, tilts spread over 0–90° ·
        the sheet never turns
      </div>
    </div>
  );
}

function Step6Light() {
  const [beta, setBeta] = useState(30);
  const [flip, setFlip] = useState(false);
  return (
    <div>
      <p>
        Step 5 ended on a challenge: does nature keep books the way our disk does? To find out we need hardware — and the good news is how little of it, and how little physics, the audit takes. Two facts about light carry everything from here to step 15. Here is the first: light is a <strong>wave</strong>, like the wave that runs along a shaken
        rope: as it flies forward it <em>wiggles sideways</em>. It can wiggle horizontally, it can
        wiggle vertically — and in general it does both at once: an H&nbsp;wiggle of size{" "}
        <strong>a</strong> and a V&nbsp;wiggle of size <strong>b</strong>, riding together in
        step. Fix the brightness and the two sizes are locked together — a² + b² = 1 — so one
        knob sets them both: a tilt angle β, with a = cos&nbsp;β and b = sin&nbsp;β. Seen
        head-on, the two wiggles add up, and the wave's tip draws a single tilted line — whose
        turning point, marked by the small gold ring, is the pair (a,&nbsp;b) itself, riding
        the dashed circle of full brightness in the space view. The direction of the line and
        the pair (a,&nbsp;b) are two names for the same data. Play:
      </p>
      <WaveDuo beta={beta} delta={flip ? 180 : 0} />
      <Slider value={beta} min={0} max={90} step={1} onChange={setBeta}
        label="β — the wave's tilt (sets both wiggle sizes)"
        readout={`β=${beta}° → a=${Math.cos((beta * Math.PI) / 180).toFixed(2)}, b=${flip ? "−" : "+"}${Math.sin((beta * Math.PI) / 180).toFixed(2)}`} />
      <div style={{ display: "flex", gap: 8, margin: "2px 0 10px" }}>
        <Btn onClick={() => setFlip((v) => !v)}>{flip ? "wiggles: opposite step → put in step" : "wiggles: in step → flip one"}</Btn>
      </div>
      <p>
        Try the switch. It turns the V&nbsp;wiggle upside down — every peak becomes a dip — so the
        pair runs in <em>opposite</em> step: b becomes −b, and the front-view line tilts the
        other way. Same two wiggle <em>sizes</em>, a genuinely different wave. Park that switch in
        the back of your mind; it has a starring role two steps from now.
      </p>
      <p>
        The lower panel of the visual is the check that the upper pictures really are{" "}
        <em>one</em> object seen from two sides: it shows that object itself — the wave in space.
        The H&nbsp;wiggle rides in the horizontal plane, the V&nbsp;wiggle in the vertical one,
        and the dark curve is the actual wave: their sum, point by point.{" "}
        <strong>Grab that panel and turn it.</strong> From the side you recognize the two wiggles
        flying to the right; keep turning until you look straight down the line of flight, and
        the whole wave collapses into the front view — the tilted line, drawing itself on the
        framed square, in step with the front view above.
      </p>
      <p style={{ marginTop: 14 }}>
        Now the second fact — a few euros at any drugstore. A <strong>polarizer</strong>{" "}
        is a plastic sheet — the lens of polarizing sunglasses — that acts like a picket fence
        for light: it keeps the wiggle that runs <em>along its slots</em> and absorbs the other
        one. Hold the sheet with its slots horizontal and the wave above loses its V&nbsp;wiggle:
        what comes out is the H&nbsp;wiggle, size a. And a wave's brightness — the punch it
        packs — goes as its size <em>squared</em>. So the sheet passes the fraction{" "}
        <strong>a²</strong> of the brightness: 100% for a horizontal wave, 0% for a vertical one,
        exactly 50% at β = 45°. Étienne-Louis Malus measured this law in 1808, with a crystal and
        a sunset.
      </p>
      <p>
        So far, brightness — no probability anywhere. Here is the turn. In 1905 Einstein showed
        that light arrives in indivisible grains: <strong>photons</strong>. Turn the lamp down,
        far enough down, and light reaches the sheet one grain at a time, with a detector behind
        it going <em>click… click…</em>. And a grain cannot 30%-pass a sheet: each photon comes
        through <em>whole</em>, or is swallowed <em>whole</em>. There is only one way the
        bright-light books can still balance: each photon passes with <strong>chance a²</strong>.
        The brightness fraction was a probability in disguise all along. A beam, a sheet, and a
        click: that is a coin flip — step&nbsp;1's coin, made of light.
      </p>
      <PhotonCounter beta={beta} />
      <p style={{ marginTop: 14 }}>
        Read the tally against the prediction: the clicks scatter, the fraction settles — your
        step&nbsp;1 experience, run on grains of light. But if light can replay step&nbsp;1, it
        can replay <strong>step&nbsp;3</strong>. Keep the question fixed — the horizontal sheet
        never turns — and vary only the <em>beam</em>, just as step&nbsp;3 kept one scoring rule
        and varied the coin. Give each run of 30 photons the same two scores a coin run got —
        its heads-fraction and its band width — and drop it on the blank chart, exactly as you
        dropped the coins. Measure the beam your slider has prepared; then survey beams at many
        tilts, and keep dropping:
      </p>
      <LightRunsChart beta={beta} />
      <p style={{ marginTop: 14 }}>
        There it is. Out of clicks of lamplight — no coin anywhere in the room — your
        semicircle has drawn <em>itself</em> again: same axes, same seats, the summit that
        belonged to the fair coin now held by the β&nbsp;=&nbsp;45° beam. Step&nbsp;5 ended by
        asking whether the disk is private bookkeeping or nature's own; the rim of nature's
        books just surfaced, one photon at a time. And an honest auditor now has to ask the
        question in reverse: the drawing was built from coin statistics alone, two steps before
        any lamp was lit. <em>Where does light keep this circle?</em>
      </p>
      <p>
        Look hard at what the beam physically <em>is</em>: a flying pair of numbers (a, b),
        squares summing to one — whose squares are the odds, and whose product is the band
        width. Check it against the chart: the seat every beam earned is (a², |a·b|); the
        wiggle sizes <em>compute their own seat</em>. You have held this pair before. It is
        your needle's coordinate pair, doubled — step&nbsp;4's{" "}
        <strong>square-root pair</strong> — born on your semicircle out of pure
        bookkeeping. Say the surprise slowly, because it is the
        deepest one in the tutorial: this pair was <em>not</em> invented to describe light.
        Statistics forced it — telling your two kinds of not-knowing apart forced two scores,
        and geometry fused the scores into this pair. Light did not create the pair; light
        turns out to be <strong>built of it</strong>: your statistics coordinates, physically
        traveling through the room as a wave. (Step&nbsp;11 makes the match exact, chord for
        chord — and finally hands the pair its official name.)
      </p>
      <ClaimBadge n={2} who="COX" status="CAUGHT IN THE WILD">
        Cox's little quantities have just been found flying through the room — and half his
        rule with them. The beam <em>is</em> a sum: a of the H wiggle plus b of the V wiggle,
        added point by point in the space view — and the flip switch shows an added piece can
        carry a minus sign. Light computes with the pair and squares it into odds only at the
        detector. The rule's other half — adding the pairs of two separate <em>routes</em> —
        needs a second route: step&nbsp;15 splits the beam, and answers interfere.
      </ClaimBadge>
      <Notice>
        One definite wave is one fully specified state — nothing about it is unknown, and still
        the clicks come out random. That is step&nbsp;5's first kind of not-knowing (the
        statistical kind, the rim) in its purest form. The next step adds the second kind — beams
        that are <em>blends</em> — and with it builds your entire half-disk out of glass, sheet by
        sheet.
      </Notice>
    </div>
  );
}

// ================= STEP 7 : THE SAME DISK, IN GLASS =================
// One prepared beam, one rotating sheet, one meter — Malus's law read as answer odds.
function LightBench({ beta, theta, mix = 1 }) {
  const W = 340, H = 150;
  const grid = [];
  for (let x = 20; x <= 320; x += 30) grid.push(<line key={"v" + x} x1={x} y1={0} x2={x} y2={H} stroke={C.grid} strokeWidth={0.8} />);
  for (let y = 15; y <= 145; y += 30) grid.push(<line key={"h" + y} x1={0} y1={y} x2={W} y2={y} stroke={C.grid} strokeWidth={0.8} />);
  const beamY = 75;
  const frac = mix * Math.cos(((theta - beta) * Math.PI) / 180) ** 2 + (1 - mix) * 0.5;
  const sheet = (x, angDeg, color, label) => {
    const a = ((angDeg - 90) * Math.PI) / 180;
    return (
      <g key={label}>
        <rect x={x - 5} y={22} width={10} height={106} rx={4} fill="#fff" stroke={color} strokeWidth={2.5} />
        <line
          x1={x - 14 * Math.cos(a)} y1={beamY - 14 * Math.sin(a)}
          x2={x + 14 * Math.cos(a)} y2={beamY + 14 * Math.sin(a)}
          stroke={color} strokeWidth={3} strokeLinecap="round"
        />
        <text x={x} y={142} textAnchor="middle" fontFamily={mono} fontSize="9.5" fill={C.inkSoft}>{label}</text>
      </g>
    );
  };
  const seg = (x1, x2, I) =>
    I > 0.004 ? (
      <line x1={x1} y1={beamY} x2={x2} y2={beamY} stroke={C.gold} strokeWidth={2 + 9 * I} strokeLinecap="round" opacity={0.45 + 0.55 * I} />
    ) : (
      <line x1={x1} y1={beamY} x2={x2} y2={beamY} stroke={C.gridBold} strokeWidth={1.4} strokeDasharray="3 5" />
    );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
      {grid}
      <text x={16} y={beamY - 22} fontFamily={mono} fontSize="9.5" fill={C.inkSoft}>lamp</text>
      <line x1={14} y1={beamY} x2={94} y2={beamY} stroke={C.ink} strokeWidth={7} strokeLinecap="round" opacity={0.85} />
      {seg(100, 214, 1)}
      {seg(226, 306, frac)}
      {sheet(97, beta, C.teal, mix < 1 ? `beam+bulb · ${beta}°` : `beam · ${beta}°`)}
      {sheet(220, theta, C.ink, `sheet · ${theta}°`)}
      <text x={322} y={beamY - 14} textAnchor="end" fontFamily={mono} fontSize="10" fontWeight="600" fill={frac > 0.004 ? C.gold : C.inkSoft}>
        {(100 * frac).toFixed(0)}%
      </text>
      <text x={322} y={beamY + 20} textAnchor="end" fontFamily={mono} fontSize="9" fill={C.inkSoft}>meter</text>
    </svg>
  );
}

function StepLightDisk() {
  const [beta, setBeta] = useState(0);
  const [theta, setTheta] = useState(30);
  const [mix, setMix] = useState(100);
  const V = mix / 100;
  const br = (beta * Math.PI) / 180;
  const p = Math.cos(br) ** 2;
  const w = Math.sin(br) * Math.cos(br);
  const frac = V * Math.cos(((theta - beta) * Math.PI) / 180) ** 2 + (1 - V) * 0.5;
  return (
    <div>
      <p>
        Step&nbsp;6 caught the rim returning, dot by dot. Two sheets and a meter now rebuild the
        whole drawing — interior included. The first sheet{" "}
        <em>prepares</em>: whatever the lamp sends, what leaves the sheet is one definite wave at
        the sheet's angle β. The second sheet, at an angle θ of your choice, <em>asks</em> — and
        by step&nbsp;6, its meter fraction is the odds that each photon answers "yes". Malus's
        law says the odds depend only on the angle <em>between</em> them: cos²(θ−β). Aligned:
        100%, certainty. Crossed at 90°: 0%, the other certainty. 45° apart: exactly 50/50 — a
        fair coin, asked of light.
      </p>
      <LightBench beta={beta} theta={theta} mix={V} />
      <Slider value={beta} min={0} max={180} step={1} onChange={setBeta}
        label="β — the prepared beam (first sheet)"
        readout={`β=${beta}°`} />
      <Slider value={theta} min={0} max={180} step={1} onChange={setTheta}
        label="θ — the asking sheet"
        readout={`θ=${theta}° → passes ${(100 * frac).toFixed(0)}%`} />
      <Slider value={mix} min={0} max={100} step={1} onChange={setMix}
        label="blend — share of steady beam vs. plain bulb light"
        readout={`${mix}% beam · ${100 - mix}% bulb`} />
      <p>
        Now make step&nbsp;6's discovery systematic — the dictionary. Call a horizontal beam
        (β=0°) "always&nbsp;H" and a vertical beam
        (β=90°) "always&nbsp;T", and let the horizontal sheet play the coin flip. Then every pure
        beam gets a seat on your drawing: its heads-odds p is what the horizontal sheet reads, and
        its band width follows from p as always. Keep the blend at 100% and slide β from 0° to
        90°: the beam's seat walks the <em>entire upper arc</em> — the curve your photon runs
        dotted in, now traced continuously — always-H, through the fair
        coin at β=45°, to always-T. Note one curiosity for later: a <em>quarter</em> turn of the
        lab dial walks <em>half</em> the circle. Lab angles count double on the drawing. (Why,
        exactly, is a beautiful piece of geometry — step 11 derives it.)
      </p>
      <StatePlot point={[0.5 + V * (p - 0.5), V * w]} showLower showFullCircle labels={false} />
      <p>
        And the interior is in the lab too — that is the third slider. A pure belief was one
        definite state held with certainty; a pure beam is one definite wave: the rim. A mixed
        belief was a blend of candidates; a mixed beam is a blend of waves — and real lamps are
        exactly that: a hot crowd of atoms, each firing its own tilt, the meter averaging over the
        flicker. Averaged readings blend with the blend's weights — the chords of step&nbsp;5,
        drawn by a light meter. Slide the blend down and watch both effects at once: the meter's
        breathing gets shallower, and the marker slides straight down its radius toward the
        center. At 0% beam you hold the plain <strong>bulb</strong>: a stubborn, flat 50% at{" "}
        <em>every</em> θ — the dead center, total ignorance, sold at every supermarket. Partly
        blended light — <em>partially polarized</em>, the physicists say — fills the interior,
        and the distance from the center, which they call the <em>degree of polarization</em>, is
        precisely your confidence score, measured in glass. In 1852 George Stokes showed a
        handful of sheet-and-meter readings pins down any beam's seat exactly. Even your two
        kinds of not-knowing are both here: the rim's clicks stay random with the wave fully
        known (statistical), and the blend adds ignorance of <em>which wave</em> (systematic) —
        the two scores of step&nbsp;3, running on lamplight.
      </p>
      <p>
        And now, blend back at 100%, turn the beam's mount <em>past</em> 90° — nothing stops you
        — to β=135°. This is precisely the flipped wave of step&nbsp;6's switch: same wiggle
        sizes, opposite step. The horizontal sheet still reads 50/50 — same heads-odds as the
        fair coin at 45°. Same seat on your drawing, then? Test it: set the asking sheet to
        θ=45°. The 45° beam sails through, 100%. The 135° beam goes <strong>dark — 0%</strong>.
        Two beams, identical to the coin flip, perfectly told apart by a tilted question. They
        are <em>not</em> the same state — yet your half-disk has only one seat at 50/50 to offer.
        Watch the marker above as you slide β past 90°: it dives below the axis, into ground your
        bookkeeping never drew.
      </p>
      <Notice>
        Light has caught the drawing being too small. For every beam on the upper arc there is a
        second beam — its mirror twin across the axis, the flip switch made real — with identical
        heads-odds but opposite answers to tilted sheets. Nature runs a <em>full</em> circle of
        pure states; our coin bookkeeping kept half. The next step finds out what, in coin
        language, we silently threw away.
      </Notice>
    </div>
  );
}

// ================= PLAYGROUND D : THE VIEW FROM THE STATE =================
function StepFrame() {
  const [alpha, setAlpha] = useState(35); // degrees 0..360
  const al = (alpha * Math.PI) / 180;
  const a = Math.cos(al);
  const b = Math.sin(al);
  const p = a * a;
  const w = a * b;
  const W = 340, H = 340, cx = 160, cy = 170, R = 120;
  const px = (u, v) => [cx + u * R, cy - v * R];
  const [Ax, Ay] = px(a, b);
  const [Fx, Fy] = px(p, w);
  const [Ox, Oy] = px(0, 0);
  const [Ux, Uy] = px(1, 0);
  // grid every 0.25
  const lines = [];
  for (let u = -1.25; u <= 1.5001; u += 0.25) {
    const bold = Math.abs(u % 1) < 1e-6;
    lines.push(<line key={"v" + u} x1={px(u, 0)[0]} y1={0} x2={px(u, 0)[0]} y2={H} stroke={bold ? C.gridBold : C.grid} strokeWidth={bold ? 1 : 0.6} />);
    lines.push(<line key={"h" + u} x1={0} y1={px(0, u)[1]} x2={W} y2={px(0, u)[1]} stroke={bold ? C.gridBold : C.grid} strokeWidth={bold ? 1 : 0.6} />);
  }
  // quadrant-I arc of the unit circle (classical lifts), sampled
  const q1 = Array.from({ length: 31 }, (_, i) => px(Math.cos((i / 30) * Math.PI / 2), Math.sin((i / 30) * Math.PI / 2)).join(",")).join(" ");
  // right-angle marker at F (legs toward O and toward (1,0))
  const s = 0.07;
  const sg = b >= 0 ? 1 : -1;
  const e1 = [-a * s, -b * s];
  const e2 = [b * s * sg, -a * s * sg];
  const sq = [
    px(p + e1[0], w + e1[1]),
    px(p + e1[0] + e2[0], w + e1[1] + e2[1]),
    px(p + e2[0], w + e2[1]),
  ];
  const showRA = Math.abs(w) > 0.03;
  return (
    <div>
      <p>
        Every state carries its own private compass — step 4 built it, and this step lets it run. Recall the <strong>Bernoulli vector</strong>, the compass needle of step 4: stand at P, adopt the two Thales chords as your axes (the little square in the picture), and the needle points at the center of the Bernoulli circle — the same landmark spot for every state,
      </p>
      <Formula>Bernoulli vector&nbsp;=&nbsp;(√p, √(1−p))/2&nbsp;&nbsp;&nbsp;&nbsp;length ½, always</Formula>
      <p>
        One cosmetic step remains, and it is the last naming ceremony of the tutorial. A landmark arrow of length ½ is nobody's favorite unit; <em>normalize</em> it — stretch it to length 1, i.e. double it — and its tip lands on the <strong>unit circle</strong>, at the teal point <strong>(√p, √(1−p))</strong>: step 4's square-root pair, reborn as a direction of size one. This normalized Bernoulli vector is what physicists call the (real) <strong>probability amplitudes</strong>. The doubling added nothing — a compass needle's <em>direction</em> is its content, the length a convention — and that is exactly how physics treats its states: as directions, with lengths pinned to 1 for bookkeeping.
      </p>
      <Slider
        value={alpha} min={0} max={360} step={1} onChange={setAlpha}
        label="α — bearing of the amplitude point (the state sits at 2α)"
        readout={`α=${alpha}°   Bernoulli angle=2α=${2 * alpha}°`}
      />
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
        {lines}
        <line x1={0} y1={cy} x2={W} y2={cy} stroke={C.ink} strokeWidth={1.4} />
        <line x1={cx} y1={0} x2={cx} y2={H} stroke={C.ink} strokeWidth={1.4} />
        {/* unit circle */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.inkSoft} strokeWidth={1.2} />
        <polyline points={q1} fill="none" stroke={C.teal} strokeWidth={2.5} />
        {/* Bernoulli circle: upper gold, lower red */}
        <path d={`M ${Ox} ${Oy} A ${R / 2} ${R / 2} 0 0 1 ${Ux} ${Uy}`} fill="none" stroke={C.gold} strokeWidth={2} strokeDasharray="5 4" />
        <path d={`M ${Ox} ${Oy} A ${R / 2} ${R / 2} 0 0 0 ${Ux} ${Uy}`} fill="none" stroke={C.red} strokeWidth={2} strokeDasharray="5 4" />
        {/* lifted direction (the stretched T-chord) and the two right-angled chords */}
        <line x1={Ox} y1={Oy} x2={px(1.12 * a, 1.12 * b)[0]} y2={px(1.12 * a, 1.12 * b)[1]} stroke={C.inkSoft} strokeWidth={1.1} strokeDasharray="3 3" />
        <line x1={Ox} y1={Oy} x2={Fx} y2={Fy} stroke={C.teal} strokeWidth={2.2} />
        <line x1={Ux} y1={Uy} x2={Fx} y2={Fy} stroke={C.gold} strokeWidth={2.2} />
        <text x={px(p * 0.5, w * 0.5)[0] - 8} y={px(p * 0.5, w * 0.5)[1] - 6} textAnchor="end" fontFamily={mono} fontSize="11" fontWeight="600" fill={C.teal}>√p</text>
        <text x={px((1 + p) * 0.5, w * 0.5)[0] + 8} y={px((1 + p) * 0.5, w * 0.5)[1] - 6} textAnchor="start" fontFamily={mono} fontSize="11" fontWeight="600" fill={C.gold}>√(1−p)</text>
        {showRA && <polyline points={`${sq[0].join(",")} ${sq[1].join(",")} ${sq[2].join(",")}`} fill="none" stroke={C.ink} strokeWidth={1} />}
        {/* anchors */}
        <circle cx={Ox} cy={Oy} r={3.5} fill={C.ink} />
        <circle cx={Ux} cy={Uy} r={3.5} fill={C.ink} />
        <text x={Ux + 4} y={Uy + 16} fontFamily={mono} fontSize="10" fill={C.inkSoft}>H (1,0)</text>
        <text x={Ox - 4} y={Oy + 16} textAnchor="end" fontFamily={mono} fontSize="10" fill={C.inkSoft}>T (0,0)</text>
        {/* points */}
        <circle cx={Ax} cy={Ay} r={5.5} fill={C.teal} stroke={C.ink} strokeWidth={1.3} />
        <text x={px(1.22 * a, 1.22 * b)[0]} y={px(1.22 * a, 1.22 * b)[1] + 4} textAnchor="middle" fontFamily={mono} fontSize="10" fill={C.teal}>
          {a >= 0 && b >= 0 ? "(√p, √(1−p))" : "(a, b)"}
        </text>
        <circle cx={Fx} cy={Fy} r={6} fill={C.gold} stroke={C.ink} strokeWidth={1.5} />
        <text x={Fx + 9} y={Fy + 15} fontFamily={mono} fontSize="10" fontWeight="600" fill={C.ink}>state</text>
      </svg>
      <p style={{ marginTop: 14 }}>
        And with that, step 4's bridge is fully built: opposite beliefs — always-H and always-T, the two ends of a diameter — have become <strong>orthogonal amplitudes</strong>, (1, 0) and (0, 1), two perpendicular directions. Sweep the slider and watch the needle turn at <em>half</em> the state's speed: the drawing and the amplitudes are two views of one object, geared 2:1. Two deeper treasures are folded below for the curious — where step 8's minus sign comes from, and why one full lap of beliefs secretly takes two.
      </p>
      <ClaimBadge n={2} who="COX" status="REDEEMED">
        The little quantities beneath probability now have their official name — <strong>amplitudes</strong> — and their bookkeeping is the one Cox recited inside his sixty seconds: computed first, added as quantities, converted to odds only at the very end, by squaring.
      </ClaimBadge>
      <p>
        And now the payoff that closes a loop seven steps wide. Step&nbsp;4 built the pair (√p,
        √(1−p)) out of pure statistics; step&nbsp;6 found the same pair flying through the room as
        a beam's wiggle sizes; this step has given it a geometric life of its own. The match is
        exact: for a wave at lab angle α, the wiggles cos&nbsp;α and sin&nbsp;α are exactly the
        Thales chords of its seat on the disk — the amplitudes are not a description laid over the
        light, they are <em>the light itself</em>, and Malus's 1808 law is the squared-chord rule
        of step 9, measured with a crystal and a sunset. Even the minus sign is on display: the
        135° beam's vertical wiggle points <em>opposite</em> to the 45° beam's — b = −√½ instead
        of +√½ — which is precisely why a 45° sheet, which adds the two wiggles, gets everything
        from one beam and nothing from the other.
      </p>
      <Notice>
        Sweep α and watch the readout: the amplitude point turns at <em>half</em> the state's speed — the Bernoulli angle is 2α, so one lap of the state is half a lap of the amplitudes. And there is step 7's curiosity, derived: the lab angle α is the <em>amplitude's</em> angle, the state's seat on the disk turns at 2α — a quarter turn of the sheet, half a lap of the circle. Lab angles count double because the lab dial turns amplitudes, and states are their squares.
      </Notice>
      <Tech title="a second reading of the teal point">
        The dashed ray gives a second reading of the same teal point: it is also the <em>direction in which the T-corner sees the state</em>, at distance √p — the two viewpoints agree because the triangle corner–center–state is isosceles, two of its sides being radii.
      </Tech>
      <Tech title="where the minus sign comes from">
        Run the construction for a state <em>below</em> the axis: the chord lengths are the same, so the Bernoulli vector reads the same (√p, √(1−p))/2 — frame coordinates are twin-blind, like every length. The difference hides in the frame itself: above the axis the ordered pair of axes (toward-T, toward-H) is right-handed, below it left-handed — the handedness <em>is</em> the triangle orientation of step 8, met from inside. Now insist, as physicists always do, that your frame keep a <em>fixed</em> handedness. Crossing always-H or always-T — exactly where one chord shrinks to zero — one axis must then reverse, pointing <em>away</em> from its corner, and the coordinate along it comes out <strong>negative</strong>. A "negative length" is nothing mysterious: an ordinary coordinate along an axis that happens to face the other way. The normalized Bernoulli vector now reads the <em>signed</em> amplitude pair (a, b), produced by bookkeeping alone.
      </Tech>
      <Tech title="one lap or two — the double cover">
        Follow the fixed-handedness rule continuously all the way around: crossing H flips one axis, crossing T flips the other — so you come home with <em>both</em> axes reversed and coordinates <strong>−(a, b)</strong>. Same state, opposite amplitude vector; only a <em>second</em> lap restores the frame. That is the <strong>double cover</strong>, live: a state and its overall negative are one and the same object, and only <em>relative</em> signs can ever be physical. Playground D of the evidence room shows the same fact mechanically (ψ and −ψ build the identical table). Physicists will recognize here the seed of the <em>geometric phase</em>: a sign picked up purely by traveling a closed loop.
      </Tech>
    </div>
  );
}


// ================= STEP 6 : THE MIRROR TWINS =================
function StepTwins() {
  const [theta, setTheta] = useState(50);
  const th = (theta * Math.PI) / 180;
  const p = 0.5 + 0.5 * Math.cos(th);
  const w = 0.5 * Math.sin(th);
  return (
    <div>
      <p>
        Light has just handed us states below the axis — beams that match a coin's odds exactly and still answer tilted sheets the opposite way. Now we owe those states a meaning in <em>coin language</em>. And the meaning was there all along: our own bookkeeping has been quietly throwing a detail away. Recall step 4's <strong>triangle</strong>: the T–H segment as base, the state as apex, the two chords √p and √(1−p) as slanted sides, meeting at Thales' right angle. Everything a coin flip can ever teach you is the number p — and p fixes all three side lengths.
      </p>
      <p>
        But a triangle with these side lengths on this base exists in <em>two</em> copies: apex above the axis — or apex below. Mirror images. Same lengths, and one genuine difference: <strong>orientation</strong>. Walk the corners in the fixed order T → apex → H, and the upper triangle turns one way around, the lower one the other (the two arrows in the picture). Your plots have silently kept only the upper copy. Honest bookkeeping keeps both — and gives the band width the job of remembering which:
      </p>
      <Formula>w = ±√(p(1−p))&nbsp;&nbsp;&nbsp;&nbsp;size: twice the triangle's area&nbsp;&nbsp;·&nbsp;&nbsp;sign: its orientation</Formula>
      <p>
        So the semicircle completes to the full <strong>Bernoulli circle</strong>: every set of odds appears twice, once with each orientation. The lower twin of the fair coin, at (½, −½), we call the <strong>anti-coin</strong> — and you have already met it in the flesh: it is the 135° beam of step 7, the one that matched the fair coin's odds and then went dark behind the tilted sheet. Slide P around and watch its mirror twin P′ shadow it below:
      </p>
      <Slider value={theta} min={5} max={175} step={1} onChange={setTheta}
        label="where P sits on the upper half (P′ mirrors it below)"
        readout={`p=${p.toFixed(2)}   w=${fmt(w)} for P,  ${fmt(-w)} for P′`} />
      <MeasurePlot theta={theta} delta={0} showMirror showOrientation />
      <p style={{ marginTop: 14 }}>
        A physicist's favorite move is a <em>change of coordinate system</em> — to the center of mass, to the rotating frame, to the falling elevator. It pays off here too — and step 4 already made it. Stand at the state, take its two triangle sides as your own axes, and the center of the Bernoulli circle hangs at the <em>same</em> landmark spot for every state: step 4's <strong>Bernoulli vector</strong>, (√p, √(1−p))/2 — the compass needle. The twins share this needle to the last digit; what distinguishes them is the <em>handedness</em> of their frames. Now insist — as physics always may — that your frame keep one fixed handedness, and the sign takes care of itself: for the twin, one axis must then point <em>away</em> from its corner, and the coordinate along it comes out <strong>negative</strong>. A "negative length" is nothing deeper than that: an ordinary coordinate along an axis that faces the other way. Keep this picture — it is what every minus sign in the coming steps quietly means. Step 11 completes the story (follow the frame around one full lap, and there is a surprise).
      </p>
      <Notice>
        Is the twin a real state, or a bookkeeping fiction? The flip cannot say: the twins' triangles have identical side lengths, and side lengths are all a bet on heads-or-tails can feel. But light has already voted: the 45° and 135° beams — coin and anti-coin — were told apart by a <em>tilted sheet</em>, a question that is not heads-or-tails. What such tilted questions mean in coin language, and why the plain flip is blind to the twins forever, is what the next two steps settle.
      </Notice>
    </div>
  );
}

// ---------- shared pieces for the measurement steps ----------
function endLabels(delta) {
  const d = ((delta % 360) + 360) % 360;
  if (d === 0) return ["H", "T"];
  if (d === 90) return ["coin", "anti-coin"];
  if (d === 180) return ["T", "H"];
  if (d === 270) return ["anti-coin", "coin"];
  return ["end ⊕", "end ⊖"];
}

function MeasurePlot({ theta, delta, showMirror = false, showOrientation = false }) {
  const W = 340, H = 264, S = 240;
  const ox = 50, oy = 132;
  const toPx = (x, y) => [ox + x * S, oy - y * S];
  const th = (theta * Math.PI) / 180, dl = (delta * Math.PI) / 180;
  const P = [0.5 + 0.5 * Math.cos(th), 0.5 * Math.sin(th)];
  const Pm = [P[0], -P[1]];
  const Np = [0.5 + 0.5 * Math.cos(dl), 0.5 * Math.sin(dl)];
  const Nm = [0.5 - 0.5 * Math.cos(dl), -0.5 * Math.sin(dl)];
  const [O0x, O0y] = toPx(0, 0);
  const [O1x, O1y] = toPx(1, 0);
  const [Px, Py] = toPx(P[0], P[1]);
  const [Pmx, Pmy] = toPx(Pm[0], Pm[1]);
  const [Npx, Npy] = toPx(Np[0], Np[1]);
  const [Nmx, Nmy] = toPx(Nm[0], Nm[1]);
  const [cxp, cyp] = toPx(0.5, 0);
  const [labP, labM] = endLabels(delta);
  const lines = [];
  for (let u = -0.25; u <= 1.3; u += 0.25) {
    lines.push(<line key={"v" + u} x1={toPx(u, 0)[0]} y1={0} x2={toPx(u, 0)[0]} y2={H} stroke={C.grid} strokeWidth={0.6} />);
  }
  for (let v = -0.5; v <= 0.55; v += 0.25) {
    lines.push(<line key={"h" + v} x1={0} y1={toPx(0, v)[1]} x2={W} y2={toPx(0, v)[1]} stroke={C.grid} strokeWidth={0.6} />);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
      {lines}
      <line x1={0} y1={oy} x2={W} y2={oy} stroke={C.ink} strokeWidth={1} />
      <path d={`M ${O0x} ${O0y} A ${S / 2} ${S / 2} 0 0 1 ${O1x} ${O1y}`} fill="none" stroke={C.gold} strokeWidth={2} strokeDasharray="5 4" />
      <path d={`M ${O0x} ${O0y} A ${S / 2} ${S / 2} 0 0 0 ${O1x} ${O1y}`} fill="none" stroke={C.red} strokeWidth={2} strokeDasharray="5 4" />
      {/* orientation triangles: same lengths, opposite way around */}
      {showOrientation && showMirror && (() => {
        const sgnA = (A, B, Cc) => 0.5 * (A[0] * (B[1] - Cc[1]) + B[0] * (Cc[1] - A[1]) + Cc[0] * (A[1] - B[1]));
        const cent = (A, B, Cc) => [(A[0] + B[0] + Cc[0]) / 3, (A[1] + B[1] + Cc[1]) / 3];
        const tri = (A, B, Cc) => `${toPx(...A).join(",")} ${toPx(...B).join(",")} ${toPx(...Cc).join(",")}`;
        const g1 = sgnA(Nm, P, Np), g2 = sgnA(Nm, Pm, Np);
        const c1 = toPx(...cent(Nm, P, Np)), c2 = toPx(...cent(Nm, Pm, Np));
        return (
          <>
            <polygon points={tri(Nm, P, Np)} fill={C.gold} fillOpacity={0.16} />
            <polygon points={tri(Nm, Pm, Np)} fill={C.red} fillOpacity={0.13} />
            <text x={c1[0]} y={c1[1] + 6} textAnchor="middle" fontSize="17" fill={C.gold}>{g1 < 0 ? "↻" : "↺"}</text>
            <text x={c2[0]} y={c2[1] + 6} textAnchor="middle" fontSize="17" fill={C.red}>{g2 < 0 ? "↻" : "↺"}</text>
          </>
        );
      })()}
      {/* the question: a diameter */}
      <line x1={Nmx} y1={Nmy} x2={Npx} y2={Npy} stroke={C.ink} strokeWidth={1.8} />
      <circle cx={cxp} cy={cyp} r={2.5} fill={C.inkSoft} />
      {/* chords from P to the two ends */}
      <line x1={Nmx} y1={Nmy} x2={Px} y2={Py} stroke={C.teal} strokeWidth={2} />
      <line x1={Npx} y1={Npy} x2={Px} y2={Py} stroke={C.gold} strokeWidth={2} />
      {showMirror && (
        <>
          <line x1={Nmx} y1={Nmy} x2={Pmx} y2={Pmy} stroke={C.teal} strokeWidth={1.2} strokeDasharray="4 3" />
          <line x1={Npx} y1={Npy} x2={Pmx} y2={Pmy} stroke={C.gold} strokeWidth={1.2} strokeDasharray="4 3" />
          <circle cx={Pmx} cy={Pmy} r={6} fill="#fff" stroke={C.ink} strokeWidth={2} />
          <text x={Pmx + 10} y={Pmy + 14} fontFamily={mono} fontSize="12" fontWeight="600" fill={C.ink}>P′</text>
        </>
      )}
      {/* ends of the diameter */}
      <circle cx={Npx} cy={Npy} r={4.5} fill={C.gold} stroke={C.ink} strokeWidth={1.2} />
      <circle cx={Nmx} cy={Nmy} r={4.5} fill={C.teal} stroke={C.ink} strokeWidth={1.2} />
      <text x={Npx + (Npx < cxp ? -8 : 8)} y={Npy + (Npy > cyp ? 15 : -8)} textAnchor={Npx < cxp ? "end" : "start"} fontFamily={mono} fontSize="10" fontWeight="600" fill={C.gold}>{labP}</text>
      <text x={Nmx + (Nmx < cxp ? -8 : 8)} y={Nmy + (Nmy > cyp ? 15 : -8)} textAnchor={Nmx < cxp ? "end" : "start"} fontFamily={mono} fontSize="10" fontWeight="600" fill={C.teal}>{labM}</text>
      {/* the state */}
      <circle cx={Px} cy={Py} r={6.5} fill={C.ink} stroke="#fff" strokeWidth={2} />
      <text x={Px + 10} y={Py - 8} fontFamily={mono} fontSize="12" fontWeight="600" fill={C.ink}>P</text>
    </svg>
  );
}

function ProbBars({ title, probs, labels, dim = false }) {
  const bar = (q, lab, color) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0" }}>
      <span style={{ fontFamily: mono, fontSize: 11, width: 78, color: C.inkSoft, textAlign: "right" }}>{lab}</span>
      <div style={{ flex: 1, height: 14, background: "#fff", border: `1px solid ${C.gridBold}`, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${q * 100}%`, background: color, opacity: dim ? 0.45 : 1, transition: "width .12s" }} />
      </div>
      <span style={{ fontFamily: mono, fontSize: 11, width: 40, textAlign: "right" }}>{(q * 100).toFixed(0)}%</span>
    </div>
  );
  return (
    <div style={{ padding: "8px 12px", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, marginTop: 8 }}>
      {title && <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 1, color: C.inkSoft, marginBottom: 4 }}>{title}</div>}
      {bar(probs[0], labels[0], C.gold)}
      {bar(probs[1], labels[1], C.teal)}
    </div>
  );
}

// ================= STEP 7 : MEASURING IS ASKING =================
function StepMeasure() {
  const [theta, setTheta] = useState(50);
  const [delta, setDelta] = useState(0);
  const th = (theta * Math.PI) / 180, dl = (delta * Math.PI) / 180;
  const pPlus = Math.cos((th - dl) / 2) ** 2; // = squared distance from P to the opposite end
  const [labP, labM] = endLabels(delta);
  return (
    <div>
      <p>
        Time to say what "flipping the coin" really is — and to discover that it is only one question among many. Here is the rule of the game. You may never ask a state "where are you?". You may only pick a <strong>diameter</strong> of the circle and ask: "<em>which end?</em>" The state must answer with one of the diameter's two endpoints. The odds of each answer are already drawn in your picture: the chance of an answer is the <strong>squared distance to the opposite end</strong>. Far from "always T" means: probably answers H. (The right angle at P — Thales again, now for <em>any</em> diameter — plus Pythagoras makes the two squared chords sum to 1: the chances of the two answers add up automatically. For the horizontal diameter the chords are exactly the triangle sides √p and √(1−p) of step 8.)
      </p>
      <p>
        The horizontal diameter is the <em>raw</em> question, heads-or-tails: that one is the coin flip. Tilted diameters ask <em>combined</em> questions. Compare it to traffic: sometimes the revealing question is not "which weekday is it?" but "weekend or midweek?" — a contrast built out of the raw days. The vertical diameter asks exactly such a contrast: "coin or anti-coin?". And tilted questions are not a fantasy — you asked one in step 7. A polarizer sheet turned to θ <em>is</em> a tilted diameter (turned by 2θ, lab angles counting double), and Malus's meter fraction is exactly the squared-distance rule below, running on lamplight since 1808.
      </p>
      <Slider value={theta} min={0} max={360} step={1} onChange={setTheta}
        label="where the state sits on the circle" readout={`state angle ${theta}°`} />
      <Slider value={delta} min={0} max={360} step={1} onChange={setDelta}
        label="which question you ask (rotate the diameter)"
        readout={`δ=${delta}°${delta % 180 === 0 ? " — the coin flip" : delta % 180 === 90 ? " — the contrast question" : ""}`} />
      <MeasurePlot theta={theta} delta={delta} />
      <ProbBars title="THE STATE'S ANSWER ODDS" probs={[pPlus, 1 - pPlus]} labels={[`answers ${labP}`, `answers ${labM}`]} />
      <Notice>
        Rotate the question dial until the diameter passes straight through the state: suddenly the state answers with 100% certainty. <em>Every</em> state on the circle is completely certain about exactly one question — and spread out over all the others. The fair coin is certain too: not about heads-or-tails, but about coin-or-anti-coin. No state is "random" in itself. Randomness is a mismatch between the state and the question you happened to ask. And notice the payoff for step 8: a <em>tilted</em> diameter sees P and its mirror twin P′ at different distances from its ends — tilted questions can tell the twins apart, exactly as the 45° sheet told the two beams apart. Why the flip alone never can, and how the twins finally split, is the next step.
      </Notice>
    </div>
  );
}

// ================= STEP 8 : WHY THE SIGN HIDES =================
function StepSign() {
  const [theta, setTheta] = useState(50);
  const [delta, setDelta] = useState(0);
  const th = (theta * Math.PI) / 180, dl = (delta * Math.PI) / 180;
  const pPlus = Math.cos((th - dl) / 2) ** 2;
  const pPlusMirror = Math.cos((-th - dl) / 2) ** 2;
  const [labP, labM] = endLabels(delta);
  return (
    <div>
      <p>
        Now we can finally answer the question this tutorial has been circling: why do ordinary coin flips never show the sign? Take a state P and its mirror twin P′ on the lower half. Look at the horizontal diameter: <em>both of its endpoints lie on the mirror line itself</em>. The mirror does not move them. So P and P′ are at identical distances from "always T" and from "always H" — and they give identical answer odds to the coin flip. Forever. The flip is not weak; it is <em>symmetric</em> under exactly the reflection that the sign encodes.
      </p>
      <p>
        There is a sharper way to say it. From any state, the pair of chords to a diameter's two ends carries <em>two</em> kinds of information. First, their <strong>lengths</strong> — squared, these are the answer odds of step 9. Second, their <strong>orientation</strong>: walking end → state → end, you pass around the diameter one way or the other. The mirror keeps every length and reverses the orientation; the flip reads only lengths. Set the dial to 0° and look at the two shaded triangles below: identical side lengths, opposite turning arrows. Orientation is the <em>only</em> difference, and it is exactly what the sign stores. That is precisely the sign step 8 gave the band width: size from the lengths (twice the triangle's area), sign from the orientation. The signed band width keeps track of both; probabilities keep only the lengths.
      </p>
      <p>
        Any tilted diameter breaks that symmetry. Turn the dial to the contrast question and watch the twins split apart: P leans toward one end, P′ toward the other. At δ=90° they disagree as strongly as possible.
      </p>
      <Slider value={theta} min={5} max={175} step={1} onChange={setTheta}
        label="where P sits on the upper half (P′ mirrors it below)" readout={`state angle ${theta}°`} />
      <Slider value={delta} min={0} max={90} step={1} onChange={setDelta}
        label="which question you ask"
        readout={`δ=${delta}°${delta === 0 ? " — the coin flip" : delta === 90 ? " — the contrast question" : ""}`} />
      <MeasurePlot theta={theta} delta={delta} showMirror showOrientation />
      <ProbBars title="P — ANSWER ODDS" probs={[pPlus, 1 - pPlus]} labels={[`answers ${labP}`, `answers ${labM}`]} />
      <ProbBars title="P′ (MIRROR TWIN) — ANSWER ODDS" probs={[pPlusMirror, 1 - pPlusMirror]} labels={[`answers ${labP}`, `answers ${labM}`]} dim />
      <p style={{ marginTop: 14 }}>
        Three last rules complete the picture. <strong>Asking a tilted question is
        physically possible</strong>: rotate the whole system first, then flip — that is
        all an interferometer or a polarizer does. <strong>After answering, the state
        becomes its answer</strong>: it jumps to the endpoint it named, so repeating the
        same question repeats the same answer, while a fresh question meets fresh chance.
        (Note this jump is <em>not</em> the learning of step 5 — there, flips could
        only move a belief that still had something to learn; a pure state has nothing
        left to learn about, yet it jumps anyway. That difference is where
        quantum truly begins.) And so <strong>no single question can reveal the whole of
        P</strong>: one
        diameter yields one number, but P is two numbers — you need two different
        questions to pin a state down.
      </p>
      <Notice>
        The lower half of the circle was never hidden from physics — only from one instrument, the coin flip, which is blind to it by symmetry. Classical probability is simply the physics of owning only that one instrument; a rotating polarizer sheet is what owning <em>all</em> the diameters looks like, and step 7's twin test was exactly this picture running in glass. The full disk, with its diameters as questions, is a complete and self-consistent world: linear-polarized light explored with polarizer sheets lives entirely inside it. Before asking whether nature keeps even more, we look underneath the sign — where do those square-root chord lengths, and their minus signs, actually <em>live</em>? That is the next step.
      </Notice>
    </div>
  );
}

// ================= STEP 11 : THE STATE THAT ISN'T THERE =================
function CircularBench() {
  const [alpha, setAlpha] = useState(0);
  const [plate, setPlate] = useState(false);
  const t = (alpha * Math.PI) / 180;
  const pMystery = plate ? Math.cos(t - Math.PI / 4) ** 2 : 0.5;
  return (
    <div>
      <Slider
        value={alpha} min={0} max={360} step={1} onChange={setAlpha}
        label="θ — rotate the testing sheet"
        readout={`θ=${alpha}°`}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "4px 0 8px" }}>
        <Btn onClick={() => setPlate((v) => !v)}>
          {plate ? "remove the crystal plate" : "insert the crystal plate"}
        </Btn>
      </div>
      <ProbBars
        title={plate ? "MYSTERY BEAM — BEHIND THE PLATE" : "MYSTERY BEAM"}
        probs={[pMystery, 1 - pMystery]}
        labels={["through", "blocked"]}
      />
      <ProbBars
        title={plate ? "PLAIN BULB — BEHIND THE PLATE" : "PLAIN BULB"}
        probs={[0.5, 0.5]}
        labels={["through", "blocked"]}
        dim
      />
    </div>
  );
}

function StepCircular() {
  const [beta, setBeta] = useState(45);
  const [delta, setDelta] = useState(90);
  return (
    <div>
      <p>
        Your rotating sheet is, by now, a complete detective kit for the disk. Point it at any
        beam and sweep θ: a <em>pure</em> beam breathes fully, swelling to 100% at its own angle
        and dying to 0% a quarter-turn away; a <em>blend</em> breathes shallower, and the depth of
        breathing measures how far from the center it sits; the bulb — dead center — holds a flat
        50% at every angle. Breathing depth is the radius, the angle of the swell is the seat on
        the rim. Nothing on the disk can hide from a patient sheet.
      </p>
      <p>
        Now a mystery. In the 1820s Augustin Fresnel prepared a beam — using a cleverly cut piece
        of glass — that answers the sheet with a perfectly <strong>flat 50% at every angle</strong>.
        The detective kit is categorical: dead center, total blend, indistinguishable from the
        bulb. Case closed?
      </p>
      <p>
        One more piece of equipment says no. A <strong>quarter-wave plate</strong> is a thin slab
        of crystal with one odd talent: light waving along one of its axes travels through it a
        touch slower, arriving a quarter of a wave-beat late. It absorbs nothing — every bit of
        light comes out — and it asks nothing: no question, no answer, just a delay. Insert it in
        front of each source and sweep the sheet again:
      </p>
      <CircularBench />
      <p style={{ marginTop: 14 }}>
        The bulb doesn't care: flat before, flat after — a true blend has no timing to adjust.
        But the mystery beam snaps into <strong>full breathing</strong>: behind the plate it is a
        perfect, pure 45° beam, 100% through at one angle, dark at the crossed one. And that is
        flatly impossible for anything on your disk. A genuine blend is <em>missing knowledge</em>
        — and a passive slab of crystal cannot know things for you. (Sharper: a lossless plate is
        a <em>reversible</em> move, and every reversible move of the disk is a turn or a flip —
        all of which leave the center exactly where it is. No plate can carry the center to the
        rim.) So the mystery beam was never at the center. It is a <strong>pure state</strong>, at
        full strength, whose sheet-readings happen to match total ignorance — a state with{" "}
        <em>no seat anywhere on the disk</em>.
      </p>
      <p>
        What is it, physically? Step 6 gave a beam its two wiggles, one along H and one along V,
        with sizes (a, b) — and a switch that could flip one wiggle to run in opposite step. This
        beam has both wiggles at <em>equal size</em> — that is why every sheet reads 50% — but a
        quarter-beat <strong>out of step</strong>: when the horizontal wiggle peaks, the vertical
        one is passing through zero. Take the wave toy back out and unlock what was a switch into
        a free <strong>timing dial</strong> δ:
      </p>
      <WaveDuo beta={beta} delta={delta} />
      <Slider value={delta} min={0} max={360} step={1} onChange={setDelta}
        label="δ — the timing between the wiggles (was: the flip switch)"
        readout={`δ=${delta}° ${delta === 0 || delta === 360 ? "· in step — a tilted line" : delta === 180 ? "· opposite step — the twin's line" : delta === 90 || delta === 270 ? (beta === 45 ? "· quarter beat — a circle!" : "· quarter beat — an ellipse") : "· part-way — an ellipse"}`} />
      <Slider value={beta} min={0} max={90} step={1} onChange={setBeta}
        label="β — the wiggle sizes, as before"
        readout={`β=${beta}°`} />
      <p>
        Set β=45° and δ=90°: the front view rounds into a <em>circle</em> — the tip of the
        light's arrow corkscrews as the beam flies. Turn the wave in space and the corkscrew is
        there whole, a genuine <em>helix</em>; look down the axis and the helix becomes the
        circle. This is <strong>circular light</strong>, and
        its secret is now on your screen: not the size of the wiggles, not their sign, but their
        relative <em>delay</em>. Notice what else the dial shows. δ=0° is the plain tilted line;
        δ=180° is exactly step&nbsp;6's flip switch — the mirror twin's line; and everything in
        between is a slanted <em>ellipse</em>, a whole family of states the disk never met. Our
        amplitude pair (a, b) records sizes and signs — it owns no clock.
      </p>
      <Notice>
        For the second time, light has caught the bookkeeping being too small — and this time the
        message is sharper. The first time, a missing <em>sign</em> unfolded the half-disk into the
        disk. Now a missing <em>delay</em> — which can be a quarter beat, a half beat, or anything
        in between — demands not one extra copy of each state but a whole <em>dial's worth</em>.
        The disk is a flat slice of something round. The next step builds the rest of it.
      </Notice>
    </div>
  );
}

// ================= STEP 9 : THE COMPLEX DIAL — THE BLOCH SPHERE =================
function StepBloch() {
  const [thetaDeg, setThetaDeg] = useState(64);
  const [phiDeg, setPhiDeg] = useState(0);
  const th = (thetaDeg * Math.PI) / 180;
  const ph = (phiDeg * Math.PI) / 180;
  const p = Math.cos(th / 2) ** 2;
  const ab = Math.sin(th) / 2; // band-width magnitude = radius of the phase wheel
  // 3D layout = the table scene: X = p−½ (T left, H right), Y = band width pointing
  // AWAY from the viewer (P on the far half), Z = the new complex direction (up)
  const P3 = [p - 0.5, ab * Math.cos(ph), ab * Math.sin(ph)];
  const T3 = [p - 0.5, -ab * Math.cos(ph), -ab * Math.sin(ph)]; // the twin: far side of the wheel

  const psi = 0.55, eps = 0.5; // same camera as the hemisphere scene
  const W = 340, H = 340, cx = 170, cy = 172, S = 252;
  const px3 = ([X, Y, Z]) => {
    const sx = X * Math.cos(psi) + Y * Math.sin(psi);
    const u = -X * Math.sin(psi) + Y * Math.cos(psi);
    const sy = Z * Math.cos(eps) + u * Math.sin(eps);
    const d = u * Math.cos(eps) - Z * Math.sin(eps); // front iff d < 0
    return [cx + sx * S, cy - sy * S, d];
  };
  const circleSegs = (fn, n = 90) => {
    const pts = Array.from({ length: n + 1 }, (_, i) => {
      const v = fn((2 * Math.PI * i) / n);
      return { q: px3(v), v };
    });
    const front = [], back = [];
    for (let i = 0; i < n; i++) {
      const seg = { a: pts[i].q, b: pts[i + 1].q, mid: pts[i].v };
      ((pts[i].q[2] + pts[i + 1].q[2]) / 2 < 0 ? front : back).push(seg);
    }
    return { front, back };
  };
  const segLines = (segs, stroke, wdt, dash, opac = 1, colorFn = null) =>
    segs.map((s, i) => (
      <line key={i} x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]}
        stroke={colorFn ? colorFn(s.mid) : stroke} strokeWidth={wdt}
        strokeDasharray={dash} strokeOpacity={opac} strokeLinecap="round" />
    ));

  // wireframe: Bernoulli circle in the table plane, the standing phase wheel,
  // two reference wheels along the axle, and two horizontal latitudes above/below
  const bern = circleSegs((s) => [0.5 * Math.cos(s), 0.5 * Math.sin(s), 0]);
  const bernColor = (v) => (v[1] >= 0 ? C.gold : C.red);
  const wheel = circleSegs((s) => [p - 0.5, ab * Math.cos(s), ab * Math.sin(s)]);
  const rw = Math.sqrt(3) / 4;
  const ringR = circleSegs((s) => [0.25, rw * Math.cos(s), rw * Math.sin(s)]);
  const ringL = circleSegs((s) => [-0.25, rw * Math.cos(s), rw * Math.sin(s)]);
  const latU = circleSegs((s) => [rw * Math.cos(s), rw * Math.sin(s), 0.25]);
  const latD = circleSegs((s) => [rw * Math.cos(s), rw * Math.sin(s), -0.25]);

  const [Ppx, Ppy] = px3(P3);
  const [Tpx, Tpy, Td] = px3(T3);
  const [Hx, Hy] = px3([0.5, 0, 0]);
  const [Tx, Ty] = px3([-0.5, 0, 0]);

  return (
    <div>
      <p>
        Light has told us exactly what is missing: a <strong>delay</strong> between the two
        wiggles. And here is the unifying surprise — <em>the sign was a delay all along</em>.
        Delay the vertical wiggle by <em>half</em> a beat and it points opposite at every moment:
        b becomes −b, the 45° beam becomes the 135° beam, a state becomes its mirror twin. The
        sign of step 8 — a two-position switch — was the special case "half a beat exactly". But a
        delay is not a switch; it is a <strong>dial</strong>, an angle φ that turns smoothly
        through a full beat: φ=0° is the state itself, φ=180° is its twin, and φ=90° — a quarter
        beat — is precisely the corkscrewing beam of step 12, the shade <em>between</em> a state
        and its twin that the disk had no seat for. (In amplitude language: keeping a size and a
        turnable delay-angle together is exactly what mathematicians call a <em>complex
        number</em> — "complex" is nothing but a sign that has learned to turn. The picture below
        needs no coordinates at all.)
      </p>
      <p>
        The picture first lays everything on a table. Your Bernoulli circle lies flat, exactly as you know it — always T on the left, always H on the right, the state P on the far half, its mirror twin on the near half. Read the T–H diameter as an <strong>axle</strong> lying on the table. At each set of odds, a <span style={{ color: C.teal }}>wheel</span> stands upright on that axle, and the dial φ turns the state around it: at φ=0° the state rests at the far edge of the table (that is P); at φ=180° it rests at the near edge (exactly the mirror twin of step 8); and in between it swings <em>up above the table, or down below it</em> — circular light lives at the very top and bottom of each wheel. One wheel for every p, and the circle inflates into a <strong>sphere</strong>: pure states on the glassy surface, mixed beliefs filling the ball, total ignorance at the center. Henri Poincaré drew exactly this ball for light in 1892; quantum physicists redrew it in 1946, centered at zero with radius one, and call it the <strong>Bloch sphere</strong>. Same ball.
      </p>
      <Slider value={thetaDeg} min={0} max={180} step={1} onChange={setThetaDeg}
        label="θ — sets the odds (moves the wheel along the axle)" readout={`p=${p.toFixed(2)}`} />
      <Slider value={phiDeg} min={0} max={360} step={1} onChange={setPhiDeg}
        label="φ — the delay dial (spins the wheel up out of the table)" readout={`φ=${phiDeg}°`} />
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
        <defs>
          <radialGradient id="ballshade" cx="0.36" cy="0.3" r="0.95">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="45%" stopColor="#EDF7FD" />
            <stop offset="80%" stopColor="#CFEAF9" />
            <stop offset="100%" stopColor="#AFD9F2" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={0.5 * S} fill="url(#ballshade)" stroke={C.gridBold} strokeWidth={1.5} />
        {/* back halves (dim, dashed) */}
        {segLines(latU.back, C.gridBold, 1, "3 3", 0.65)}
        {segLines(latD.back, C.gridBold, 1, "3 3", 0.65)}
        {segLines(ringR.back, C.gridBold, 1, "3 3", 0.65)}
        {segLines(ringL.back, C.gridBold, 1, "3 3", 0.65)}
        {segLines(bern.back, null, 1.6, "3 3", 0.5, bernColor)}
        {segLines(wheel.back, C.teal, 1.5, "3 3", 0.5)}
        {/* the axle on the table */}
        <line x1={Tx} y1={Ty} x2={Hx} y2={Hy} stroke={C.inkSoft} strokeWidth={1} strokeDasharray="2 3" />
        {/* front halves */}
        {segLines(latU.front, C.gridBold, 1, null, 0.85)}
        {segLines(latD.front, C.gridBold, 1, null, 0.85)}
        {segLines(ringR.front, C.gridBold, 1, null, 0.85)}
        {segLines(ringL.front, C.gridBold, 1, null, 0.85)}
        {segLines(bern.front, null, 2.6, null, 1, bernColor)}
        {segLines(wheel.front, C.teal, 2.4, null, 1)}
        {/* poles of the axle */}
        <circle cx={Hx} cy={Hy} r={3.5} fill={C.ink} />
        <circle cx={Tx} cy={Ty} r={3.5} fill={C.ink} />
        <text x={Hx + 8} y={Hy + 4} fontFamily={mono} fontSize="10" fill={C.ink}>always H (p=1)</text>
        <text x={Tx - 8} y={Ty + 4} textAnchor="end" fontFamily={mono} fontSize="10" fill={C.ink}>always T (p=0)</text>
        {/* the twin, hollow */}
        <circle cx={Tpx} cy={Tpy} r={5.5} fill="#fff" stroke={C.ink} strokeWidth={1.8} strokeOpacity={Td < 0.05 ? 1 : 0.5} fillOpacity={Td < 0.05 ? 1 : 0.6} />
        <text x={Tpx + 9} y={Tpy + 13} fontFamily={mono} fontSize="10" fontWeight="600" fill={C.inkSoft} opacity={Td < 0.05 ? 1 : 0.55}>twin</text>
        {/* the state: always drawn solid — the glass sphere doesn't hide the star */}
        <line x1={cx} y1={cy} x2={Ppx} y2={Ppy} stroke={C.ink} strokeWidth={1.4} />
        <circle cx={Ppx} cy={Ppy} r={6.5} fill={C.gold} stroke={C.ink} strokeWidth={1.6} />
        <text x={Ppx + 10} y={Ppy - 8} fontFamily={mono} fontSize="12" fontWeight="600" fill={C.ink}>P</text>
        {/* legend */}
        <text x={8} y={H - 22} fontFamily={mono} fontSize="9.5" fill={C.gold}>gold/red: your Bernoulli circle, flat on the table (φ=0/180)</text>
        <text x={8} y={H - 9} fontFamily={mono} fontSize="9.5" fill={C.teal}>blue: the standing wheel of twins — same odds, different dial</text>
      </svg>
      <p style={{ marginTop: 14 }}>
        Questions are still diameters — there are just more of them now. The flip is the
        T–H axle itself; the contrast question of step 10 is the table's far–near
        diameter; and the dial φ picks among the <em>infinitely many</em> tilted
        contrast questions rising out of the table. Every state on the surface is still
        perfectly certain about exactly one diameter — the one that runs through it.
      </p>
      <ClaimBadge n={3} who="MIT" status="REDEEMED">
        Oliver's planet Earth is on your screen. The poles are the two certain states — a transistor is pinned to them; a qubit may sit anywhere on the surface, and everywhere off the poles is a superposition. And notice the fine print his metaphor quietly carries: <em>opposite</em> points of the globe are <em>orthogonal</em> states — step 4's bridge, completed on a planet.
      </ClaimBadge>
      <Notice>
        Everything you built survives in 3D: answer odds are still squared distances to a diameter's ends, mixing still pulls inward, purity is still the distance from the center. One phenomenon is new. With three axes, certainty about one diameter forces a 50/50 spread over every diameter perpendicular to it: no state can answer two independent questions sharply at the same time. That trade-off has a famous name: <strong>uncertainty</strong>. (This is Heisenberg's uncertainty principle, in its qubit form.) This ball, with its diameters, is the complete qubit — built from a coin, with light twice forcing your hand: once for the sign, once for the dial. The next step assembles the full dictionary between ball and light, and puts the ball — quite literally — in your hands.
      </Notice>
    </div>
  );
}


// ================= STEP 10 : THE BALL, IN YOUR HANDS =================
// Three-polarizer bench: lamp → P1(0°) → [optional middle sheet(θ)] → P2(90°)
function PolarizerBench({ theta, midIn }) {
  const W = 340, H = 150;
  const grid = [];
  for (let x = 20; x <= 320; x += 30) grid.push(<line key={"v" + x} x1={x} y1={0} x2={x} y2={H} stroke={C.grid} strokeWidth={0.8} />);
  for (let y = 15; y <= 145; y += 30) grid.push(<line key={"h" + y} x1={0} y1={y} x2={W} y2={y} stroke={C.grid} strokeWidth={0.8} />);
  const beamY = 75;
  const t = (theta * Math.PI) / 180;
  const Imid = midIn ? Math.cos(t) * Math.cos(t) : 0;
  const Iout = midIn ? Math.cos(t) * Math.cos(t) * Math.sin(t) * Math.sin(t) : 0;
  const sheet = (x, angDeg, color, label) => {
    const a = ((angDeg - 90) * Math.PI) / 180;
    return (
      <g key={label}>
        <rect x={x - 5} y={22} width={10} height={106} rx={4} fill="#fff" stroke={color} strokeWidth={2.5} />
        <line
          x1={x - 14 * Math.cos(a)} y1={beamY - 14 * Math.sin(a)}
          x2={x + 14 * Math.cos(a)} y2={beamY + 14 * Math.sin(a)}
          stroke={color} strokeWidth={3} strokeLinecap="round"
        />
        <text x={x} y={142} textAnchor="middle" fontFamily={mono} fontSize="9.5" fill={C.inkSoft}>{label}</text>
      </g>
    );
  };
  const seg = (x1, x2, I) =>
    I > 0.004 ? (
      <line x1={x1} y1={beamY} x2={x2} y2={beamY} stroke={C.gold} strokeWidth={2 + 9 * I} strokeLinecap="round" opacity={0.45 + 0.55 * I} />
    ) : (
      <line x1={x1} y1={beamY} x2={x2} y2={beamY} stroke={C.gridBold} strokeWidth={1.4} strokeDasharray="3 5" />
    );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
      {grid}
      <text x={16} y={beamY - 22} fontFamily={mono} fontSize="9.5" fill={C.inkSoft}>lamp</text>
      <line x1={14} y1={beamY} x2={74} y2={beamY} stroke={C.ink} strokeWidth={7} strokeLinecap="round" opacity={0.85} />
      {seg(80, midIn ? 164 : 250, 1)}
      {midIn && seg(176, 250, Imid)}
      {seg(262, 322, Iout)}
      {sheet(77, 0, C.ink, "P1 · 0°")}
      {midIn && sheet(170, theta, C.teal, `P · ${theta}°`)}
      {sheet(256, 90, C.ink, "P2 · 90°")}
      <text x={322} y={beamY - 14} textAnchor="end" fontFamily={mono} fontSize="9.5" fontWeight="600" fill={Iout > 0.004 ? C.gold : C.inkSoft}>
        {Iout > 0.004 ? `light! ${(100 * Iout).toFixed(0)}%` : "dark"}
      </text>
    </svg>
  );
}

// Single rotating sheet against two sources: a surface state vs the center of the ball
function AnalyzerDemo() {
  const [alpha, setAlpha] = useState(0);
  const t = (alpha * Math.PI) / 180;
  const pPure = Math.cos(t) * Math.cos(t);
  return (
    <div>
      <Slider
        value={alpha} min={0} max={360} step={1} onChange={setAlpha}
        label="α — turn the sheet in your hand"
        readout={`α=${alpha}°`}
      />
      <ProbBars
        title="POLARIZED LIGHT — A SURFACE STATE"
        probs={[pPure, 1 - pPure]}
        labels={["through", "blocked"]}
      />
      <ProbBars
        title="PLAIN BULB — THE CENTER OF THE BALL"
        probs={[0.5, 0.5]}
        labels={["through", "blocked"]}
        dim
      />
    </div>
  );
}

// Turnable Poincaré ball: the three polarization pairs as three perpendicular diameters
function PolarBall() {
  const [rot, setRot] = useState({ yaw: -0.7, pitch: 0.35 });
  const dragRef = useRef(null);
  const W = 340, H = 290, cx = 170, cy = 145, R = 112;
  const proj = (v) => {
    const [x, y, z] = v;
    const cy1 = Math.cos(rot.yaw), sy1 = Math.sin(rot.yaw);
    const x1 = x * cy1 - y * sy1, y1 = x * sy1 + y * cy1, z1 = z;
    const cp = Math.cos(rot.pitch), sp = Math.sin(rot.pitch);
    const depth = y1 * cp - z1 * sp, up = y1 * sp + z1 * cp;
    return { X: cx + R * x1, Y: cy - R * up, front: depth <= 0 };
  };
  const circleSegs = (fn, color) => {
    const segs = [];
    const N = 60;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * 2 * Math.PI, b = ((i + 1) / N) * 2 * Math.PI;
      const p1 = proj(fn(a)), p2 = proj(fn(b));
      segs.push(
        <line key={color + i} x1={p1.X} y1={p1.Y} x2={p2.X} y2={p2.Y}
          stroke={color} strokeWidth={1.6}
          opacity={p1.front && p2.front ? 0.85 : 0.18} />
      );
    }
    return segs;
  };
  const axis = (v, color) => {
    const p1 = proj(v), p2 = proj([-v[0], -v[1], -v[2]]);
    return <line x1={p1.X} y1={p1.Y} x2={p2.X} y2={p2.Y} stroke={color} strokeWidth={1.2} strokeDasharray="4 4" opacity={0.5} />;
  };
  const marks = [
    { v: [1, 0, 0], c: C.ink, t: "H-pol · always H" },
    { v: [-1, 0, 0], c: C.ink, t: "V-pol · always T" },
    { v: [0, 1, 0], c: C.gold, t: "+45° · coin" },
    { v: [0, -1, 0], c: C.gold, t: "−45° · anti-coin" },
    { v: [0, 0, 1], c: C.teal, t: "L-circular · φ=+90°" },
    { v: [0, 0, -1], c: C.teal, t: "R-circular · φ=−90°" },
  ];
  const onDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, yaw: rot.yaw, pitch: rot.pitch };
  };
  const onMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const pitch = Math.max(-1.35, Math.min(1.35, d.pitch + (e.clientY - d.y) * 0.008));
    setRot({ yaw: d.yaw + (e.clientX - d.x) * 0.008, pitch });
  };
  const onUp = () => { dragRef.current = null; };
  return (
    <svg viewBox={`0 0 ${W} ${H}`}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block", touchAction: "none", cursor: "grab" }}>
      <circle cx={cx} cy={cy} r={R} fill="#fff" stroke={C.gridBold} strokeWidth={1.5} />
      {circleSegs((a) => [Math.cos(a), Math.sin(a), 0], C.inkSoft)}
      {circleSegs((a) => [Math.cos(a), 0, Math.sin(a)], C.teal)}
      {axis([1, 0, 0], C.ink)}
      {axis([0, 1, 0], C.gold)}
      {axis([0, 0, 1], C.teal)}
      {marks.map((m, i) => {
        const p = proj(m.v);
        return (
          <g key={i} opacity={p.front ? 1 : 0.3}>
            <circle cx={p.X} cy={p.Y} r={6.5} fill={p.front ? m.c : "#fff"} stroke={m.c} strokeWidth={2} />
            <text x={p.X + (p.X > cx ? 10 : -10)} y={p.Y + 3.5} textAnchor={p.X > cx ? "start" : "end"}
              fontFamily={mono} fontSize="9" fontWeight="600" fill={m.c}>{m.t}</text>
          </g>
        );
      })}
      <text x={10} y={H - 10} fontFamily={mono} fontSize="9" fill={C.inkSoft}>drag to turn · grey wheel: the table circle · teal wheel: the standing wheel</text>
    </svg>
  );
}

// The interferometer's flight recorder: the state's trajectory on the ball of routes
function MZBall({ phi = 0, bs2 = true, mix = false }) {
  const [rot, setRot] = useState({ yaw: -0.7, pitch: 0.35 });
  const dragRef = useRef(null);
  const W = 340, H = 290, cx = 170, cy = 145, R = 112;
  const proj = (v) => {
    const [x, y, z] = v;
    const cy1 = Math.cos(rot.yaw), sy1 = Math.sin(rot.yaw);
    const x1 = x * cy1 - y * sy1, y1 = x * sy1 + y * cy1, z1 = z;
    const cp = Math.cos(rot.pitch), sp = Math.sin(rot.pitch);
    const depth = y1 * cp - z1 * sp, up = y1 * sp + z1 * cp;
    return { X: cx + R * x1, Y: cy - R * up, front: depth <= 0 };
  };
  const seg = (fn, t0, t1, color, wdt, N) => {
    const out = [];
    for (let i = 0; i < N; i++) {
      const a = t0 + ((t1 - t0) * i) / N, b = t0 + ((t1 - t0) * (i + 1)) / N;
      const p1 = proj(fn(a)), p2 = proj(fn(b));
      out.push(
        <line key={color + wdt + i} x1={p1.X} y1={p1.Y} x2={p2.X} y2={p2.Y}
          stroke={color} strokeWidth={wdt}
          opacity={p1.front && p2.front ? 0.9 : 0.18} />
      );
    }
    return out;
  };
  const ph = (phi * Math.PI) / 180;
  const q = Math.PI / 2;
  // trajectory: gate 1 (about vertical axis), dial (about the axle), gate 2 (back)
  const arcGate1 = (t) => [Math.cos(t), Math.sin(t), 0];                       // t: 0→90°
  const arcDial = (u) => [0, Math.cos(u), Math.sin(u)];                        // u: 0→φ
  const arcGate2 = (s) => [Math.cos(ph) * Math.sin(s), Math.cos(ph) * Math.cos(s), Math.sin(ph)]; // s: 0→90°
  const state = mix ? [0, 0, 0] : !bs2 ? arcDial(ph) : arcGate2(q);
  const pState = proj(state);
  const marks = [
    { v: [1, 0, 0], c: C.ink, t: "certainly route A" },
    { v: [-1, 0, 0], c: C.ink, t: "certainly route B" },
  ];
  const onDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, yaw: rot.yaw, pitch: rot.pitch };
  };
  const onMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const pitch = Math.max(-1.35, Math.min(1.35, d.pitch + (e.clientY - d.y) * 0.008));
    setRot({ yaw: d.yaw + (e.clientX - d.x) * 0.008, pitch });
  };
  const onUp = () => { dragRef.current = null; };
  const start = proj([1, 0, 0]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block", touchAction: "none", cursor: "grab" }}>
      <circle cx={cx} cy={cy} r={R} fill="#fff" stroke={C.gridBold} strokeWidth={1.5} />
      {seg((a) => [Math.cos(a), Math.sin(a), 0], 0, 2 * Math.PI, C.inkSoft, 1.2, 60)}
      {seg((a) => [0, Math.cos(a), Math.sin(a)], 0, 2 * Math.PI, C.gridBold, 1.2, 60)}
      {!mix && seg(arcGate1, 0, q, C.teal, 3, 24)}
      {!mix && Math.abs(ph) > 0.02 && seg(arcDial, 0, ph, C.gold, 3, 24)}
      {!mix && bs2 && seg(arcGate2, 0, q, C.teal, 3, 24)}
      {marks.map((m, i) => {
        const p = proj(m.v);
        return (
          <g key={i} opacity={p.front ? 1 : 0.3}>
            <circle cx={p.X} cy={p.Y} r={5.5} fill={p.front ? m.c : "#fff"} stroke={m.c} strokeWidth={2} />
            <text x={p.X + (p.X > cx ? 9 : -9)} y={p.Y + 3.5} textAnchor={p.X > cx ? "start" : "end"}
              fontFamily={mono} fontSize="9" fontWeight="600" fill={m.c}>{m.t}</text>
          </g>
        );
      })}
      <g opacity={pState.front || mix ? 1 : 0.35}>
        <circle cx={pState.X} cy={pState.Y} r={8} fill={mix ? C.inkSoft : C.gold} stroke={C.ink} strokeWidth={2} />
        <text x={pState.X} y={pState.Y - 13} textAnchor="middle" fontFamily={mono} fontSize="9" fontWeight="600" fill={mix ? C.inkSoft : C.ink}>
          {mix ? "mixture: pinned at the center" : "the state"}
        </text>
      </g>
      <circle cx={start.X} cy={start.Y} r={9} fill="none" stroke={C.gold} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.7} />
      <text x={10} y={H - 10} fontFamily={mono} fontSize="9" fill={C.inkSoft}>drag to turn · teal arcs: half-mirror quarter-turns · gold arc: the dial φ</text>
    </svg>
  );
}

function StepHands() {
  const [midIn, setMidIn] = useState(false);
  return (
    <div>
      <p>
        Thirteen steps, and coin and light have been building the same object from two sides. Time
        to assemble the full dictionary — and notice that you may already own three pieces of the
        hardware, in the form of polarizing sunglasses. Horizontally and vertically polarized
        light are the two ends of the axle: always&nbsp;H and always&nbsp;T. The +45° beam is your
        fair <strong>coin</strong>; the −45° (that is, 135°) beam is the <strong>anti-coin</strong>{" "}
        of step&nbsp;8 — same 50/50 odds, opposite sign, told apart by a tilted sheet. And a
        quarter-turn of the delay dial away from both, at φ&nbsp;=&nbsp;±90° — the top and bottom
        of step&nbsp;13's standing wheel — sit <strong>left- and right-circular</strong> light,
        the corkscrewing beams of step&nbsp;12. Three famous pairs of opposites, three
        perpendicular diameters of your ball. (The fine print of this dictionary — what
        perpendicular diameters mean for measurements — waits in the evidence room.)
      </p>
      <p>
        Here is that dictionary drawn on the ball itself — <em>drag it around</em>. The three
        pairs sit at the ends of three perpendicular diameters: the T–H axle (ink), the
        coin/anti-coin diameter across the table (gold), and the circular pair on the standing
        wheel's own axis (teal). This is the <strong>Poincaré sphere</strong> of 1892, and your
        Bloch ball of step&nbsp;13, in one picture — one ball, discovered twice (Exhibit&nbsp;G
        tells that story).
      </p>
      <PolarBall />
      <p>
        The ball now owes you a demonstration — something the sign and the dial can <em>do</em>.
        Here it is, an experiment you can run at the kitchen table with three sunglass lenses.
        Cross two polarizers, 0° and 90°: darkness — always-H is asked "always-T?", and the
        answer is never. Slide a third sheet <em>between</em> them, at 45°:
      </p>
      <PolarizerBench theta={45} midIn={midIn} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 4px" }}>
        <Btn onClick={() => setMidIn((v) => !v)}>{midIn ? "remove middle sheet" : "insert middle sheet"}</Btn>
      </div>
      <p style={{ marginTop: 14 }}>
        Light comes back: you <em>added an obstacle</em> and got <em>more light</em>. No story in
        which filters merely remove light survives this; the story that survives is yours. The
        middle sheet asks the 45° question (step&nbsp;9) and prepares its answer — and two
        contributions of opposite sign, step&nbsp;11's opposite-pointing wiggles doing real work,
        no longer cancel. This is <strong>interference</strong>, running here on bright,{" "}
        <em>classical</em> light: Stokes and Poincaré's world. The full bench — Fresnel–Arago's
        1819 blindness law, the angle formula, the waveplates, and the bulb-versus-glare test that
        answers step&nbsp;2's mystery — is <strong>Playground F</strong> of the evidence room.
      </p>
      <Notice>
        Everything on this page still runs on bright, classical beams — a wave really does carry
        two wiggles at once, so nothing here is mysterious yet. And "runs" can be taken literally:
        this whole ball fits on a kitchen table for a few tens of euros —{" "}
        <a href="lab.html">the lab companion</a> has the shopping list and nine bench cards, each
        with the readings the tutorial predicts. The genuinely strange question is the next one:
        what happens when you turn the lamp <em>down</em> — so far down that light arrives one
        indivisible particle at a time? That is the final step, and it is where the ball stops
        being a picture of light and becomes a picture of the world.
      </Notice>
    </div>
  );
}

// ---------- the roadmap: bit → interval → half-disk → disk → ball ----------
function Roadmap({ preview = false }) {
  const stages = [
    { l1: "a bit", l2: "two answers" },
    { l1: "a probability", l2: "the interval" },
    { l1: "two indicators", l2: "the half-disk" },
    { l1: "orientation kept", l2: "the full disk" },
    { l1: "a turning dial", l2: "the ball — a qubit" },
  ];
  const W = 640, H = 128, cy = 46;
  const xs = [64, 192, 320, 448, 576];
  const fadeFrom = preview ? 3 : 5;
  const op = (i) => (i >= fadeFrom ? 0.32 : 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block", margin: "14px 0" }}>
      <defs>
        <radialGradient id="roadshade" cx="0.36" cy="0.3" r="0.95">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#EDF7FD" />
          <stop offset="80%" stopColor="#CFEAF9" />
          <stop offset="100%" stopColor="#AFD9F2" />
        </radialGradient>
      </defs>

      {/* arrows */}
      {xs.slice(0, 4).map((x, i) => (
        <g key={i} opacity={op(i + 1)}>
          <line x1={x + 42} y1={cy} x2={xs[i + 1] - 44} y2={cy}
            stroke={C.inkSoft} strokeWidth={1.4}
            strokeDasharray={preview && i + 1 >= fadeFrom ? "4 4" : null} />
          <path d={`M ${xs[i + 1] - 44} ${cy} l -7 -4 v 8 z`} fill={C.inkSoft} />
        </g>
      ))}

      {/* 1 — the bit: two lone answers */}
      <g opacity={op(0)}>
        <circle cx={xs[0] - 15} cy={cy} r={8} fill={C.ink} />
        <circle cx={xs[0] + 15} cy={cy} r={8} fill={C.gold} stroke={C.ink} strokeWidth={1.2} />
        <text x={xs[0] - 15} y={cy + 3} textAnchor="middle" fontFamily={mono} fontSize="8.5" fontWeight="600" fill="#fff">T</text>
        <text x={xs[0] + 15} y={cy + 3} textAnchor="middle" fontFamily={mono} fontSize="8.5" fontWeight="600" fill="#fff">H</text>
      </g>

      {/* 2 — the interval [0,1] */}
      <g opacity={op(1)}>
        <line x1={xs[1] - 28} y1={cy + 6} x2={xs[1] + 28} y2={cy + 6} stroke={C.ink} strokeWidth={1.6} />
        <line x1={xs[1] - 28} y1={cy + 1} x2={xs[1] - 28} y2={cy + 11} stroke={C.ink} strokeWidth={1.6} />
        <line x1={xs[1] + 28} y1={cy + 1} x2={xs[1] + 28} y2={cy + 11} stroke={C.ink} strokeWidth={1.6} />
        <text x={xs[1] - 28} y={cy + 23} textAnchor="middle" fontFamily={mono} fontSize="8.5" fill={C.inkSoft}>0</text>
        <text x={xs[1] + 28} y={cy + 23} textAnchor="middle" fontFamily={mono} fontSize="8.5" fill={C.inkSoft}>1</text>
        <circle cx={xs[1] + 9} cy={cy + 6} r={4.5} fill={C.gold} stroke={C.ink} strokeWidth={1.2} />
      </g>

      {/* 3 — the upper half-disk */}
      <g opacity={op(2)}>
        <path d={`M ${xs[2] - 26} ${cy + 16} A 26 26 0 0 1 ${xs[2] + 26} ${cy + 16} Z`}
          fill={C.goldSoft} stroke="none" />
        <path d={`M ${xs[2] - 26} ${cy + 16} A 26 26 0 0 1 ${xs[2] + 26} ${cy + 16}`}
          fill="none" stroke={C.gold} strokeWidth={2.4} />
        <line x1={xs[2] - 26} y1={cy + 16} x2={xs[2] + 26} y2={cy + 16} stroke={C.inkSoft} strokeWidth={1.2} strokeDasharray="3 3" />
      </g>

      {/* 4 — the full disk: upper arc gold, lower arc red */}
      <g opacity={op(3)}>
        <circle cx={xs[3]} cy={cy} r={26} fill="#FFF7EF" />
        <path d={`M ${xs[3] - 26} ${cy} A 26 26 0 0 1 ${xs[3] + 26} ${cy}`}
          fill="none" stroke={C.gold} strokeWidth={2.4} />
        <path d={`M ${xs[3] - 26} ${cy} A 26 26 0 0 0 ${xs[3] + 26} ${cy}`}
          fill="none" stroke={C.red} strokeWidth={2.4} />
        <line x1={xs[3] - 26} y1={cy} x2={xs[3] + 26} y2={cy} stroke={C.inkSoft} strokeWidth={1} strokeDasharray="2 3" />
      </g>

      {/* 5 — the ball, with a standing wheel */}
      <g opacity={op(4)}>
        <circle cx={xs[4]} cy={cy} r={26} fill="url(#roadshade)" stroke={C.gridBold} strokeWidth={1.4} />
        <ellipse cx={xs[4]} cy={cy} rx={26} ry={8} fill="none" stroke={C.gold} strokeWidth={1.6} strokeDasharray="3 3" />
        <ellipse cx={xs[4]} cy={cy} rx={9} ry={26} fill="none" stroke={C.teal} strokeWidth={1.8} />
      </g>

      {preview && (
        <text x={(xs[3] + xs[4]) / 2} y={14} textAnchor="middle" fontFamily={mono} fontSize="9.5" letterSpacing="1" fill={C.inkSoft} opacity={0.8}>
          WHERE WE ARE HEADED
        </text>
      )}

      {/* labels */}
      {stages.map((s, i) => (
        <g key={i} opacity={op(i)}>
          <text x={xs[i]} y={H - 26} textAnchor="middle" fontFamily={mono} fontSize="9.5" fontWeight="600" fill={C.ink}>{s.l1}</text>
          <text x={xs[i]} y={H - 12} textAnchor="middle" fontFamily={mono} fontSize="9.5" fill={C.inkSoft}>{s.l2}</text>
        </g>
      ))}
    </svg>
  );
}

// ================= INTRODUCTION =================
function StepIntro() {
  return (
    <div>
      <p>
        This tutorial makes a slightly outrageous promise: starting from nothing but an ordinary coin and a little lamplight, you will build — with your own hands, on this page — a <strong>quantum bit</strong>. You will not need any physics or statistics to get there; everything is explained from scratch, and Schrödinger's famous cat — dead and alive at once, the usual doorway into all things quantum — may stay peacefully asleep in its box. The only equipment is a coin you can flip, a few plastic sheets from a pair of sunglasses, and a stubborn refusal to be sloppy.
      </p>
      <p>
        We begin as naively as possible: flip, count, bet. Plain statistics. But at every step we pause and ask the question a careful person cannot help asking. <em>Are all fifty-fifties the same fifty-fifty? Can one number really hold everything I believe? What does my bookkeeping quietly throw away?</em> Each question has one honest answer, and each answer is a door into the next room. You never leap — every step is simply the logical next one.
      </p>
      <p>
        The coin will do the building — and light will do the checking; the lamp enters at step 6 and never leaves. Twice along the way, a simple experiment with lamplight will catch our coin bookkeeping being <em>too small</em>: light will calmly display a state our drawing has no seat for, and honest bookkeeping will have to grow. Each time, the growth is not magic but the recovery of a detail we had silently thrown away — first a lost <em>sign</em>, then a hidden <em>dial</em>. After fifteen such steps the coin's plain statistics has grown, forced twice by nature's own hand, into the strange and beautiful geometry physicists call a qubit. Quantum, it turns out, is not statistics plus magic. It is statistics with the details kept.
      </p>
      <Notice>
        This is a laboratory, not a lecture. Every step has coins to flip, guesses to commit to, and sliders to turn — the page is your lab bench. Flip first, guess second, read third: the geometry lands much harder when your own data drew it.
      </Notice>
    </div>
  );
}

// ================= EPILOGUE =================
function StepEpilogue({ openExtra }) {
  return (
    <div>
      <p>
        Look back at what you just did. You flipped a coin and admitted a bet. You met two kinds of not-knowing and invented two scores to keep them apart. The scores drew you a state space — the half-disk with the Bernoulli circle as its rim. Then you built the same half-disk out of lamplight and plastic sheets — and light immediately overflowed it. A 135° beam matched the fair coin's odds and still went dark behind a tilted sheet: a state with no seat. Honest bookkeeping found the seat you had thrown away — the <em>orientation</em> of a triangle, a sign — and the half-disk became a disk. Then light overflowed the drawing a second time: a beam flat at every sheet angle, yet revived to purity by a passive slab of crystal — a pure state at the center's coordinates, impossible on any disk. The missing detail this time was a <em>delay</em>, a sign that turns; the switch became a dial, and the disk became a ball. At no point did you assume anything quantum — you only refused, twice, to stay too small for the facts.
      </p>
      <p>
        Notice the shape of both crises: each time, our instrument was the limit, not the world. The bare coin flip is blind by symmetry to everything below the mirror line, so classical probability contents itself with the upper half-disk. A rotating sheet sees the sign but is blind to the delay. Nature is more <strong>inclusive</strong> than any one instrument: she keeps same-lengths-opposite-turning as two different states, and she keeps every intermediate shade of the dial between them. And the final step showed whose bookkeeping this really is: one photon at a time, the amplitudes — sizes, signs, and dial — travel with the particle itself. The ball is not a picture of light; light was the teacher. The ball is a picture of <em>probability with every detail kept</em>.
      </p>
      <p>
        And here is the part that turns mathematics into physics: this ball is not a construction that lives only on paper — it <strong>lives in the wild</strong>. An electron's spin, a photon's polarization — the ball you held in step 14 — two energy levels of an atom: each one <em>is</em> this ball, dial and all. Nature provides the qubits; we only need to tame them. And taming means exactly the moves you learned: every diameter is an axis, every rotation a possible operation — these rotations are the <em>gates</em> of a quantum computer, and you ran your first sequence of them in step 15. More information in the state, and more ways to steer it. (Should you want the ball on your own table: <a href="lab.html">the lab companion</a> turns steps 6–15 into nine kitchen-bench experiments, for under a hundred euros.)
      </p>
      <Roadmap />
      <p>
        Read the ladder one last time, left to right: two answers, an interval of bets, a half-disk of beliefs, a disk that remembers orientation, a ball that lets it turn. Each rung was forced honestly: sometimes by a careful question about an ordinary coin — what may I believe, and what am I throwing away? — and twice by a beam of light calmly displaying a state the drawing had no seat for.
      </p>
      {openExtra && (
        <div style={{ marginTop: 16, padding: "12px 14px", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 300px" }}>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 1, color: C.inkSoft, marginBottom: 4 }}>
              THE EVIDENCE ROOM
            </div>
            <p style={{ margin: 0, fontSize: 14 }}>
              A nice story, or an actual construction? Behind this door, the professionals' machinery — density matrices, spectral decomposition, statistical distances — is shown to fit your picture without remainder. Optional, playable, and heavier than the ten steps.
            </p>
          </div>
          <Btn onClick={() => openExtra("room")}>enter ⟩</Btn>
        </div>
      )}
      <Notice>
        The stage you built contains no quantum physics — only honest bookkeeping about uncertainty, pushed as far as geometry allows. Quantum mechanics is the discovery that nature actually <em>performs</em> on this stage. You built a qubit from a coin; nature had built it first.
      </Notice>
    </div>
  );
}

// ---------- bra / ket shaped stepper buttons ----------
function BraKetBtn({ shape, label, active, visited, onClick, title }) {
  const W = 36, H = 30, notch = 9, inset = 0.75;
  const d =
    shape === "bra"
      ? `M ${W - inset} ${inset} L ${notch} ${inset} L 1 ${H / 2} L ${notch} ${H - inset} L ${W - inset} ${H - inset} Z`
      : `M ${inset} ${inset} L ${W - notch} ${inset} L ${W - 1} ${H / 2} L ${W - notch} ${H - inset} L ${inset} ${H - inset} Z`;
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: W, height: H, padding: 0, border: "none", background: "transparent",
        cursor: "pointer", display: "block",
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block" }}>
        <path
          d={d}
          fill={active ? C.gold : visited ? C.goldSoft : "#fff"}
          stroke={active ? C.gold : C.gridBold}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <text
          x={shape === "bra" ? W / 2 + 3.5 : W / 2 - 3.5}
          y={H / 2 + 4.5}
          textAnchor="middle"
          fontFamily={mono}
          fontSize="12"
          fontWeight="600"
          fill={active ? "#fff" : C.ink}
        >
          {label}
        </text>
      </svg>
    </button>
  );
}

// ============ PLAYGROUND A : HOW FAR APART ARE TWO COINS? ============
function StepDistance() {
  const [p1, setP1] = useState(0.5);
  const [p2, setP2] = useState(0.51);
  const [useVar, setUseVar] = useState(false);
  const clamp01 = (q) => Math.min(1, Math.max(0, q));
  const f = useVar ? (q) => clamp01(q) * (1 - clamp01(q)) : (q) => Math.sqrt(clamp01(q * (1 - q)));
  const naive = Math.abs(p1 - p2);
  // arc length along the curve (p, f(p)), computed numerically
  const arcNum = (a, b) => {
    const n = 400, lo = Math.min(a, b), hi = Math.max(a, b);
    let s = 0, prev = [lo, f(lo)];
    for (let i = 1; i <= n; i++) {
      const q = lo + ((hi - lo) * i) / n;
      s += Math.hypot(q - prev[0], f(q) - prev[1]);
      prev = [q, f(q)];
    }
    return s;
  };
  const arc = arcNum(p1, p2);
  const W = 340, H = 252, S = 240, ox = 50, oy = 196;
  const toPx = (x, y) => [ox + x * S, oy - y * S];
  const curvePts = (a, b, n) =>
    Array.from({ length: n + 1 }, (_, i) => toPx(a + ((b - a) * i) / n, f(a + ((b - a) * i) / n)).join(",")).join(" ");
  const semi = curvePts(0, 1, 80);
  const arcPts = curvePts(Math.min(p1, p2), Math.max(p1, p2), 60);
  const [x1b, y1b] = toPx(p1, 0);
  const [x2b, y2b] = toPx(p2, 0);
  const [x1c, y1c] = toPx(p1, f(p1));
  const [x2c, y2c] = toPx(p2, f(p2));
  const presets = [
    { label: "middle pair: 0.50 vs 0.51", a: 0.5, b: 0.51 },
    { label: "edge pair: 0.00 vs 0.01", a: 0.0, b: 0.01 },
    { label: "fair vs always-H", a: 0.5, b: 1.0 },
  ];
  return (
    <div>
      <p>
        Here is a question the tutorial has quietly prepared: how <em>far apart</em> are two coins? The lazy answer is the gap on the ruler, |p₁ − p₂|. Try to break it. A 0.50-coin and a 0.51-coin are almost impossible to tell apart — you would need thousands of flips. A 0.00-coin and a 0.01-coin? A <em>single head</em> settles it, because the first coin can never produce one. The same gap of 0.01 on the ruler, but very different real separations. The flat ruler is wrong: near the ends, it must stretch.
      </p>
      <p>
        The right ruler is one you already own. Lift both coins to the Bernoulli circle and walk <em>along the arc</em> between them. Near the middle, the circle runs almost flat, and the arc is barely longer than the gap. Near the ends, the circle turns steeply upward, and a tiny gap in p becomes a long walk.
      </p>
      <Slider value={p1} min={0} max={1} step={0.01} onChange={setP1}
        label="first coin" readout={`p₁=${p1.toFixed(2)}`} />
      <Slider value={p2} min={0} max={1} step={0.01} onChange={setP2}
        label="second coin" readout={`p₂=${p2.toFixed(2)}`} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {presets.map((q) => (
          <button key={q.label} onClick={() => { setP1(q.a); setP2(q.b); }}
            style={{ fontFamily: mono, fontSize: 11, padding: "5px 10px", borderRadius: 12, border: `1.5px solid ${C.gridBold}`, background: "#fff", color: C.ink, cursor: "pointer" }}>
            {q.label}
          </button>
        ))}
        <button onClick={() => setUseVar((v) => !v)}
          style={{ fontFamily: mono, fontSize: 11, padding: "5px 10px", borderRadius: 12, border: `1.5px solid ${useVar ? C.red : C.gridBold}`, background: useVar ? C.redSoft : "#fff", color: C.ink, cursor: "pointer" }}>
          {useVar ? "axis: variance (parabola) — back to band width" : "axis: band width (circle) — try the variance"}
        </button>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
        <polyline points={semi} fill="none" stroke={useVar ? C.red : C.gold} strokeWidth={1.6} strokeDasharray="5 4" />
        {/* the flat ruler */}
        <line x1={toPx(0, 0)[0]} y1={oy} x2={toPx(1, 0)[0]} y2={oy} stroke={C.ink} strokeWidth={2} />
        {[0, 0.5, 1].map((q) => (
          <g key={q}>
            <line x1={toPx(q, 0)[0]} y1={oy - 4} x2={toPx(q, 0)[0]} y2={oy + 4} stroke={C.ink} strokeWidth={1.4} />
            <text x={toPx(q, 0)[0]} y={oy + 18} textAnchor="middle" fontFamily={mono} fontSize="10" fill={C.inkSoft}>{q === 0.5 ? "½" : q}</text>
          </g>
        ))}
        {/* naive gap highlighted on the ruler */}
        <line x1={x1b} y1={oy} x2={x2b} y2={oy} stroke={C.red} strokeWidth={4} />
        {/* lifts */}
        <line x1={x1b} y1={y1b} x2={x1c} y2={y1c} stroke={C.inkSoft} strokeWidth={1} strokeDasharray="3 3" />
        <line x1={x2b} y1={y2b} x2={x2c} y2={y2c} stroke={C.inkSoft} strokeWidth={1} strokeDasharray="3 3" />
        {/* true distance: the arc along the chosen curve */}
        <polyline points={arcPts} fill="none" stroke={C.teal} strokeWidth={4} strokeLinecap="round" />
        <circle cx={x1b} cy={y1b} r={4} fill={C.red} stroke={C.ink} strokeWidth={1} />
        <circle cx={x2b} cy={y2b} r={4} fill={C.red} stroke={C.ink} strokeWidth={1} />
        <circle cx={x1c} cy={y1c} r={5} fill={C.teal} stroke={C.ink} strokeWidth={1.4} />
        <circle cx={x2c} cy={y2c} r={5} fill={C.teal} stroke={C.ink} strokeWidth={1.4} />
        <text x={8} y={16} fontFamily={mono} fontSize="10" fill={C.inkSoft}>
          {useVar ? "lift to the VARIANCE parabola, walk its arc" : "lift, then walk the arc"}
        </text>
      </svg>
      <div style={{ marginTop: 10, padding: "8px 12px", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, fontFamily: mono, fontSize: 13, display: "flex", gap: 18, flexWrap: "wrap" }}>
        <span style={{ color: C.red }}>flat-ruler gap = {naive.toFixed(3)}</span>
        <span style={{ color: C.teal }}>curve distance = {arc.toFixed(3)}</span>
        <span style={{ color: C.inkSoft }}>ratio ×{naive > 0 ? (arc / naive).toFixed(1) : "—"}</span>
      </div>
      <p style={{ marginTop: 14 }}>
        This bench also settles the honest doubt planted in step 3: was the band width an <em>arbitrary</em> pick for the second coordinate? Press the axis button and re-run the presets on the <strong>variance</strong> instead. The parabola's arc stretches the edge pair by a factor of merely 1.4 over the middle pair — where the flips needed to tell them apart demand a factor of ten. The wrong curve <em>lies</em>. Now ask what a curve must look like for its plain arc to tell the truth about distinguishability, and the demand pins the slope exactly: <strong>1 + slope² = 1/(4p(1−p))</strong>. Solve it, and out comes one height and one height only: <strong>√(p(1−p))</strong> — the band width, the Bernoulli circle. (Truthful curves of other proportions exist, but all are stretched-out, strictly longer copies; the circle is the shortest drawing whose ruler does not lie.) And the choice is over-determined from two more sides: this is also the curve whose corner-chords are step 4's square-root pair — step 11's amplitudes — and the Bhattacharyya angle below is literally the <em>angle between amplitude pairs</em>: cos(angle) = √(p₁p₂) + √((1−p₁)(1−p₂)). Statistics' honest ruler, Thales' right triangle, and — two steps later — light's own wiggle sizes all demand the same square root.
      </p>
      <Notice>
        Try the two preset pairs: identical flat gaps, but a tenfold difference in circle distance. The circle is the honest ruler, because it predicts how many flips you actually need to tell the coins apart. This arc has a classical name: the <strong>Bhattacharyya angle</strong> between the two distributions (its straight-line chord is the Hellinger distance). The lesson: distances between coins are not measured through the interval, but along the Bernoulli circle. The circle is not decoration — it is the <em>ruler</em>, and the band width is not a choice — it is the unique axis that builds it. The next playground turns this claim into flips: you will race the two duels and count.
      </Notice>
    </div>
  );
}

// ============ PLAYGROUND B : COUNTING THE FLIPS (SPRT RACE) ============
const LN19 = Math.log(19); // sequential-test walls for 5% error either way

// log-likelihood increment of one flip; positive evidence favours coin 2
function llrStep(outcome, c1, c2) {
  const l1 = outcome === 1 ? c1 : 1 - c1;
  const l2 = outcome === 1 ? c2 : 1 - c2;
  if (l1 === 0 && l2 === 0) return 0;
  if (l1 === 0) return Infinity;
  if (l2 === 0) return -Infinity;
  return Math.log(l2 / l1);
}

function EvidenceMeter({ llr, c1, c2, done, verdict }) {
  const t = Math.max(-1, Math.min(1, llr / LN19));
  const pct = 50 + 50 * t;
  return (
    <div style={{ margin: "8px 0 2px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 10, color: C.inkSoft, marginBottom: 3 }}>
        <span style={{ color: C.teal, fontWeight: done && verdict === "c1" ? 700 : 400 }}>
          ← it's the {c1.toFixed(2)}-coin
        </span>
        <span>evidence</span>
        <span style={{ color: C.gold, fontWeight: done && verdict === "c2" ? 700 : 400 }}>
          it's the {c2.toFixed(2)}-coin →
        </span>
      </div>
      <div style={{ position: "relative", height: 18, background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 9 }}>
        <div style={{ position: "absolute", left: "50%", top: 2, bottom: 2, width: 1, background: C.gridBold }} />
        <div style={{ position: "absolute", left: 3, top: 2, bottom: 2, width: 3, borderRadius: 2, background: C.teal }} />
        <div style={{ position: "absolute", right: 3, top: 2, bottom: 2, width: 3, borderRadius: 2, background: C.gold }} />
        <div
          style={{
            position: "absolute", top: -3, bottom: -3, width: 4, borderRadius: 2,
            left: `calc(${pct}% - 2px)`,
            background: done ? (verdict === "c2" ? C.gold : C.teal) : C.ink,
            transition: "left .06s linear",
          }}
        />
      </div>
    </div>
  );
}

function StepFlipCount() {
  const mkLane = (name, c1, c2, theory) => ({
    name, c1, c2, theory,
    truth: Math.random() < 0.5 ? "c1" : "c2",
    flips: 0, llr: 0, hist: [], done: false, verdict: null,
  });
  const freshLanes = () => [
    mkLane("duel A — the middle pair", 0.5, 0.6, "≈ 140 flips"),
    mkLane("duel B — the edge pair", 0.0, 0.1, "≈ 20 flips"),
  ];
  const [lanes, setLanes] = useState(freshLanes);
  const [running, setRunning] = useState(false);
  const [tally, setTally] = useState({ races: 0, a: 0, b: 0 });
  const tallied = useRef(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLanes((ls) =>
        ls.map((L) => {
          if (L.done) return L;
          let { flips, llr } = L;
          const hist = [...L.hist];
          // one flip per tick while the drama lasts, then fast-forward
          const batch = flips < 30 ? 1 : 6;
          let done = false, verdict = null;
          for (let k = 0; k < batch && !done; k++) {
            const p = L.truth === "c1" ? L.c1 : L.c2;
            const x = flipOne(p);
            const d = llrStep(x, L.c1, L.c2);
            llr = d === Infinity ? LN19 : d === -Infinity ? -LN19 : llr + d;
            flips += 1;
            hist.push(x);
            if (llr >= LN19) { done = true; verdict = "c2"; llr = LN19; }
            else if (llr <= -LN19) { done = true; verdict = "c1"; llr = -LN19; }
            else if (flips >= 900) { done = true; verdict = llr >= 0 ? "c2" : "c1"; }
          }
          return { ...L, flips, llr, hist: hist.slice(-14), done, verdict };
        })
      );
    }, 60);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running && lanes.every((l) => l.done) && !tallied.current) {
      tallied.current = true;
      setRunning(false);
      setTally((t) => ({ races: t.races + 1, a: t.a + lanes[0].flips, b: t.b + lanes[1].flips }));
    }
  }, [lanes, running]);

  const start = () => { tallied.current = false; setLanes(freshLanes()); setRunning(true); };
  const avgA = tally.races ? tally.a / tally.races : null;
  const avgB = tally.races ? tally.b / tally.races : null;
  const alph = (q) => Math.acos(Math.sqrt(Math.min(1, Math.max(0, q))));
  const dthA = Math.abs(alph(0.5) - alph(0.6));
  const dthB = Math.abs(alph(0.0) - alph(0.1));

  return (
    <div>
      <p>
        The previous playground made a promise that it has not yet kept: the circle, it claimed, predicts <em>how many flips</em> you need to tell two coins apart. Let us test that. Take two duels with the <strong>same flat-ruler gap of 0.10</strong>. Duel A: a 0.50-coin against a 0.60-coin. Duel B: a 0.00-coin against a 0.10-coin. In each duel, one of the two coins is secretly chosen and handed to you. You flip it and run the honest referee — Wald's <em>sequential test</em>: every flip adds its evidence, and the moment the total crosses a wall (set here for 5% error), the verdict is final. Watch which duel finishes first.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <Btn onClick={start} disabled={running}>{tally.races ? "race again" : "start the race"}</Btn>
        <Btn kind="outline" onClick={() => { setRunning(false); tallied.current = false; setLanes(freshLanes()); setTally({ races: 0, a: 0, b: 0 }); }}>
          reset
        </Btn>
      </div>
      {lanes.map((L, i) => (
        <div key={i} style={{ padding: "10px 12px", background: "#fff", border: `1.5px solid ${L.done ? (L.verdict === "c2" ? C.gold : C.teal) : C.gridBold}`, borderRadius: 8, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 11, color: C.inkSoft }}>
            <span style={{ letterSpacing: 1 }}>{L.name.toUpperCase()} · {L.c1.toFixed(2)} vs {L.c2.toFixed(2)}</span>
            <span>theory: {L.theory}</span>
          </div>
          <EvidenceMeter llr={L.llr} c1={L.c1} c2={L.c2} done={L.done} verdict={L.verdict} />
          <div style={{ minHeight: 26, marginTop: 4 }}>
            {L.hist.map((v, j) => <CoinChip key={j + "-" + L.flips} v={v} />)}
          </div>
          <div style={{ fontFamily: mono, fontSize: 12, marginTop: 2 }}>
            flips: <strong>{L.flips}</strong>
            {L.done && (
              <span>
                {" — verdict: "}
                <span style={{ color: L.verdict === "c2" ? C.gold : C.teal, fontWeight: 600 }}>
                  the {(L.verdict === "c2" ? L.c2 : L.c1).toFixed(2)}-coin
                </span>
                {" · truth: "}{(L.truth === "c2" ? L.c2 : L.c1).toFixed(2)}
                {" "}{L.verdict === L.truth ? "✓" : "✗ (the 5% at work)"}
              </span>
            )}
          </div>
        </div>
      ))}
      {tally.races > 0 && (
        <div style={{ padding: "8px 12px", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, fontFamily: mono, fontSize: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span>races: {tally.races}</span>
          <span>avg A: {avgA.toFixed(0)} flips</span>
          <span>avg B: {avgB.toFixed(0)} flips</span>
          <span style={{ color: C.ink, fontWeight: 600 }}>observed ratio ≈ ×{(avgA / avgB).toFixed(1)}</span>
        </div>
      )}
      <p style={{ marginTop: 16 }}>
        Now the mathematics, in three moves. <strong>Move 1 — duel A by hand.</strong>{" "}
        After n flips the head-fraction wobbles around the true p with spread
        √(p(1−p)/n) ≈ 0.5/√n. Put the decision threshold midway at 0.55 and demand at
        most 5% error either way: you need the wobble to shrink below the half-gap,
        0.05&nbsp;≳&nbsp;1.645&nbsp;·&nbsp;0.5/√n, i.e. <strong>n ≈ 270 flips</strong>{" "}
        for a fixed-length test (the sequential referee above is thriftier — about 145 on
        average — but same order). <strong>Move 2 — duel B by hand.</strong> The
        0.00-coin cannot produce a head, so a single H ends the game. The only possible
        mistake is crowning the 0.00-coin while the 0.10-coin sulks through all tails,
        probability 0.9ⁿ; demanding 0.9ⁿ&nbsp;≤&nbsp;0.05 gives{" "}
        <strong>n ≈ 29 flips</strong>, worst case. Same gap on the flat ruler — a factor
        of ten in flips.
      </p>
      <p>
        <strong>Move 3 — one law behind both.</strong> For the best possible test, the error after n flips shrinks like the n-th power of the <em>overlap</em> between the two coins — the Bhattacharyya coefficient. And when you lift each coin to its angle θ = arccos √p on the circle, that overlap is simply a dot product of two unit vectors:
      </p>
      <Formula>
        √(p₁p₂) + √((1−p₁)(1−p₂)) = cos θ₁ cos θ₂ + sin θ₁ sin θ₂ = cos(θ₁ − θ₂)
      </Formula>
      <p>
        The overlap of two coins is the <em>cosine of the arc between them</em>. Errors shrink like cosⁿ(Δθ), so the number of flips needed for confidence ε is
      </p>
      <Formula>
        n ≈ ln(1/ε) / (−ln cos Δθ) ≈ 2 ln(1/ε) / (Δθ)²
      </Formula>
      <p>
        Flips ∝ 1/(arc length)². The ruler that counts flips is the arc; |p₁−p₂| appears nowhere. Check it against the race: duel A spans Δθ = {dthA.toFixed(3)}, duel B spans Δθ = {dthB.toFixed(3)}, so the circle predicts a flip ratio of ({dthB.toFixed(3)}/{dthA.toFixed(3)})² ≈ ×{((dthB / dthA) ** 2).toFixed(1)}{tally.races > 0 && avgB > 0 && (<span> — and your own races above measured ×{(avgA / avgB).toFixed(1)} (the sequential referee ends each duel a little differently, but the order of magnitude comes from the arc)</span>)}. The flat ruler predicted ×1.0.
      </p>
      <Notice>
        Why is the arc not just <em>a</em> good ruler but <em>the</em> ruler? Three reasons, each stronger than the last. <strong>Local:</strong> the distinguishing power of one flip is the Fisher information 1/(p(1−p)), which explodes at the edges — exactly the flat ruler's failure. Ask for the coordinate in which one flip buys the same progress everywhere, and you are forced to θ = arccos √p (statisticians met it long ago as the arcsine variance-stabilizing transformation). <strong>Global:</strong> over any finite separation, the operational cost is cos(Δθ) — equal arcs cost equal flips, wherever they sit on the circle. <strong>Unique:</strong> Čencov's theorem: any honest distance may only shrink when you post-process your data, and the Fisher metric — this arc — is the <em>only</em> Riemannian ruler (up to scale) with that property. Keep the cosine in mind: in the quantum picture it returns as the overlap ⟨ψ|φ⟩, and the arc becomes the Bures angle of the hemisphere playground.
      </Notice>
    </div>
  );
}

// ============ PLAYGROUND C : THE BERNOULLI HEMISPHERE ============
function StepBures() {
  const [spin, setSpin] = useState(0);
  const [raise, setRaise] = useState(0);
  const psi = 0.55 + (spin * Math.PI) / 180;
  const eps = 0.5;
  const W = 340, H = 330, cx = 170, cy = 190, S = 250;
  // 3D layout = the flat picture laid on a table: x = p−½ (T left, H right),
  // y = w pointing AWAY from the viewer (coin half at the back), z = raised height
  const px3 = ([X, Y, Z]) => {
    const sx = X * Math.cos(psi) + Y * Math.sin(psi);
    const u = -X * Math.sin(psi) + Y * Math.cos(psi);
    const sy = Z * Math.cos(eps) + u * Math.sin(eps);
    const d = u * Math.cos(eps) - Z * Math.sin(eps);
    return [cx + sx * S, cy - sy * S, d];
  };
  const hgt = (t) => raise * Math.sqrt(Math.max(0, 0.25 - t * t));
  const circleSegs3 = (fn, n = 90) => {
    const pts = Array.from({ length: n + 1 }, (_, i) => {
      const v = fn((2 * Math.PI * i) / n);
      return { q: px3(v), v };
    });
    const front = [], back = [];
    for (let i = 0; i < n; i++) {
      const seg = { a: pts[i].q, b: pts[i + 1].q, mid: pts[i].v };
      ((pts[i].q[2] + pts[i + 1].q[2]) / 2 < 0 ? front : back).push(seg);
    }
    return { front, back };
  };
  const segs = (s, stroke, wd, dash, op = 1, colorFn = null) =>
    s.map((g, i) => (
      <line key={i} x1={g.a[0]} y1={g.a[1]} x2={g.b[0]} y2={g.b[1]}
        stroke={colorFn ? colorFn(g.mid) : stroke} strokeWidth={wd} strokeDasharray={dash} strokeOpacity={op} strokeLinecap="round" />
    ));
  const path3 = (fn, n = 60) =>
    Array.from({ length: n + 1 }, (_, i) => px3(fn(i / n)).slice(0, 2).join(",")).join(" ");
  const len3 = (fn, n = 200) => {
    let L = 0, prev = fn(0);
    for (let i = 1; i <= n; i++) {
      const v = fn(i / n);
      L += Math.hypot(v[0] - prev[0], v[1] - prev[1], v[2] - prev[2]);
      prev = v;
    }
    return L;
  };
  // floor tints: coin half (w>0, back) and anti-coin half (w<0, front)
  const halfPoly = (s0, s1) => {
    const pts = Array.from({ length: 41 }, (_, i) =>
      px3([0.5 * Math.cos(s0 + ((s1 - s0) * i) / 40), 0.5 * Math.sin(s0 + ((s1 - s0) * i) / 40), 0]).slice(0, 2).join(",")
    );
    return pts.join(" ");
  };
  // rim and rising rings (purity circles of the flat disk lifting into latitudes)
  const rim = circleSegs3((s) => [0.5 * Math.cos(s), 0.5 * Math.sin(s), 0]);
  const rimColor = (v) => (v[1] >= 0 ? C.gold : C.red);
  const rings = [0.45, 0.38, 0.28, 0.15].map((t) =>
    circleSegs3((s) => [t * Math.cos(s), t * Math.sin(s), hgt(t)])
  );
  // the two routes: flat chords that inflate into geodesics as the bowl rises
  const routeFair = (u) => [0, 0.5 * Math.cos((u * Math.PI) / 2), raise * 0.5 * Math.sin((u * Math.PI) / 2)];
  const routeHT = (u) => [0.5 * Math.cos(u * Math.PI), 0, raise * 0.5 * Math.sin(u * Math.PI)];
  const dFair = len3(routeFair), dHT = len3(routeHT);
  const [fx, fy] = px3([0, 0.5, 0]);
  const [mx, my] = px3([0, 0, raise * 0.5]);
  const [c0x, c0y] = px3([0, 0, 0]);
  const [hx, hy] = px3([0.5, 0, 0]);
  const [tx, ty] = px3([-0.5, 0, 0]);
  const coinLab = px3([0, 0.27, 0]);
  const antiLab = px3([0, -0.27, 0]);
  return (
    <div>
      <p>
        One distance is still missing — the one the tutorial opened with. The fair coin and the mystery deterministic coin give the same odds, yet they are different beliefs: one on the rim, one at the center of the disk. So we need distances <em>inside</em> the disk. The flat disk fails for the same reason the flat interval did: on its rim it must reproduce the arcs of playground A, which straight lines on a flat sheet cannot do; and near the rim, tiny steps are again statistically enormous.
      </p>
      <p>
        The cure is the same as before — and here is exactly <em>why</em> it produces a hemisphere. Take any point in the disk and draw the diameter through it and the center. That diameter runs from rim to rim, so it has <strong>length 1</strong>: it is a fresh copy of the interval [0, 1], and your point sits on it at some position λ. But a diameter is a <em>measurement</em> (step 9), and the states along it are the mixtures of its two endpoint states — a Bernoulli family in λ (λ is even the probability of that measurement's ⊕ answer). Playground A told us what to do with a Bernoulli family: lift it by <strong>√(λ(1−λ))</strong>. Now do that to <em>every</em> diameter at once. Each one bends into its own Bernoulli semicircle; they all agree wherever they cross; they share one summit above the center (each has λ = ½ there); and together they form the <strong>Bernoulli hemisphere</strong> — the previous step's cure, applied to every direction of the disk at the same time. On this bowl, distance means the geodesic: the shortest walk along the surface. (Its official name: the <strong>Bures distance</strong>.)
      </p>
      <p>
        Below, your Bernoulli disk lies flat in space, exactly as you know it — always T on the left, always H on the right, the gold coin-half toward the back, the red anti-coin-half toward the front, and the purity circles drawn around the mystery coin at the center. Pull the <em>raise</em> slider and watch the construction happen: the teal T–H route <em>is</em> the base diameter bending into its Bernoulli semicircle, the purity circles rise into latitude rings, and the mystery coin climbs to the shared summit. The flat straight routes inflate into arcs, and their lengths grow into the true statistical distances.
      </p>
      <Slider value={raise} min={0} max={1} step={0.01} onChange={setRaise}
        label="raise the hemisphere out of the disk" readout={raise === 0 ? "flat disk" : raise === 1 ? "full hemisphere" : `${(raise * 100).toFixed(0)}%`} />
      <Slider value={spin} min={0} max={360} step={1} onChange={setSpin}
        label="spin (rotate the measurement basis)" readout={`${spin}° — every length stays put`} />
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
        {/* floor tints, exactly the familiar disk */}
        <polygon points={halfPoly(0, Math.PI)} fill={C.goldSoft} fillOpacity={0.55} />
        <polygon points={halfPoly(Math.PI, 2 * Math.PI)} fill={C.redSoft} fillOpacity={0.5} />
        <text x={coinLab[0]} y={coinLab[1]} textAnchor="middle" fontFamily={mono} fontSize="9" fill={C.gold} opacity={0.9}>coins</text>
        <text x={antiLab[0]} y={antiLab[1]} textAnchor="middle" fontFamily={mono} fontSize="9" fill={C.red} opacity={0.9}>anti-coins</text>
        {/* classical base T—H on the floor */}
        <line x1={tx} y1={ty} x2={hx} y2={hy} stroke={C.ink} strokeWidth={1.2} />
        {/* back parts of rim and rings */}
        {segs(rim.back, null, 1.8, "3 3", 0.55, rimColor)}
        {rings.map((r, i) => <g key={"rb" + i}>{segs(r.back, C.gridBold, 1, "3 3", 0.75)}</g>)}
        {/* the raised mystery coin's drop line back to the disk center */}
        {raise > 0.02 && <line x1={c0x} y1={c0y} x2={mx} y2={my} stroke={C.inkSoft} strokeWidth={1} strokeDasharray="2 3" />}
        {/* front parts */}
        {rings.map((r, i) => <g key={"rf" + i}>{segs(r.front, C.gridBold, 1, null, 0.95)}</g>)}
        {segs(rim.front, null, 2.6, null, 1, rimColor)}
        {/* routes */}
        <polyline points={path3(routeHT)} fill="none" stroke={C.teal} strokeWidth={2.6} strokeLinecap="round" />
        <polyline points={path3(routeFair)} fill="none" stroke={C.gold} strokeWidth={3.2} strokeLinecap="round" />
        {/* landmarks */}
        <circle cx={hx} cy={hy} r={3.5} fill={C.ink} />
        <circle cx={tx} cy={ty} r={3.5} fill={C.ink} />
        <text x={hx + 7} y={hy + 4} fontFamily={mono} fontSize="10" fill={C.ink}>always H</text>
        <text x={tx - 7} y={ty + 4} textAnchor="end" fontFamily={mono} fontSize="10" fill={C.ink}>always T</text>
        <circle cx={fx} cy={fy} r={6} fill={C.gold} stroke={C.ink} strokeWidth={1.6} />
        <text x={fx} y={fy - 10} textAnchor="middle" fontFamily={mono} fontSize="10" fontWeight="600" fill={C.ink}>fair coin</text>
        <circle cx={mx} cy={my} r={6} fill={C.ink} stroke="#fff" strokeWidth={2} />
        <text x={mx + 10} y={my - 6} fontFamily={mono} fontSize="10" fontWeight="600" fill={C.ink}>mystery coin</text>
      </svg>
      <div style={{ marginTop: 10, padding: "8px 12px", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, fontFamily: mono, fontSize: 13, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span style={{ color: C.gold }}>fair ↔ mystery route = {dFair.toFixed(3)}{raise === 1 ? " = π/4" : ""}</span>
        <span style={{ color: C.teal }}>H ↔ T route = {dHT.toFixed(3)}{raise === 1 ? " = π/2" : ""}</span>
      </div>
      <Notice>
        Here is the result the whole tutorial was waiting for: fully raised, the fair coin and the mystery deterministic coin — which give identical odds — sit exactly <strong>π/4 ≈ 0.785</strong> apart, while the flat disk would have claimed ½. Notice also that the shortest road from certain-heads to certain-tails now runs <em>over the summit</em>: through total ignorance. And spin the bowl: rotating the measurement basis turns everything rigidly, so every distance stays exactly the same. You have measured how different two beliefs are <em>without choosing any measurement at all</em>. That basis-independence is the strong hint that these distances belong to the beliefs themselves. (One caution: this bowl is the flat disk <em>bent into the right ruler</em> — its height is an aid for measuring, not the delay dial of step 13.)
      </Notice>
    </div>
  );
}


// ============ PLAYGROUND D : UNDER THE HOOD — THE MATRIX ============
function MatrixBox({ m, highlightRow0 = false, title }) {
  const cell = (v, hot) => (
    <div style={{
      width: 62, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: mono, fontSize: 13, fontWeight: 600,
      background: hot ? C.goldSoft : "#fff", borderRadius: 4, border: `1px solid ${hot ? C.gold : C.gridBold}`,
    }}>{v.toFixed(2)}</div>
  );
  return (
    <div style={{ display: "inline-block", padding: "8px 10px", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8 }}>
      {title && <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1, color: C.inkSoft, marginBottom: 5 }}>{title}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "62px 62px", gap: 4 }}>
        {cell(m[0][0], highlightRow0)}{cell(m[0][1], highlightRow0)}
        {cell(m[1][0], false)}{cell(m[1][1], false)}
      </div>
    </div>
  );
}

function StepMatrix() {
  // squaring a pure amplitude vector
  const [alpha, setAlpha] = useState(35);
  const [flipped, setFlipped] = useState(false);
  const sgn = flipped ? -1 : 1;
  const a = sgn * Math.cos((alpha * Math.PI) / 180);
  const b = sgn * Math.sin((alpha * Math.PI) / 180);
  const Mpure = [[a * a, a * b], [a * b, b * b]];
  return (
    <div>
      <p>
        A look inside the machinery, for the mathematically curious — two secrets the pictures have been keeping. <strong>First, the maps.</strong> The whole tutorial used a pipeline: unit circle → Bernoulli circle → interval. The last part is the naive one: read the odds, p = a² and 1−p = b² — squaring each coordinate <em>separately</em>. But that map is built from degree-2 products, and there exist exactly <em>three</em> such products of (a, b): a², ab, and b². All three fit in one master object — the full multiplication table of ψ:
      </p>
      <Slider value={alpha} min={0} max={360} step={1} onChange={setAlpha}
        label="α — the amplitude vector" readout={`ψ = (${a.toFixed(2)}, ${b.toFixed(2)})`} />
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        <MatrixBox m={Mpure} highlightRow0 title="ψ ⊗ ψ — THE MULTIPLICATION TABLE" />
        <Btn kind="outline" onClick={() => setFlipped(!flipped)}>flip the sign of ψ</Btn>
      </div>
      <p>
        The pipeline is really three <em>readings</em> of this one table. Read only the diagonal, (a², b²): that is the interval — the coin flip, blind to everything else. Read the highlighted <strong>top row, (a², ab) = (p, w)</strong>: that is the Bernoulli point — the diagonal <em>plus</em> the off-diagonal ab, which is exactly the band width (and nothing more is needed, since b² = 1−a²). So the Bernoulli circle is what you get by refusing to forget the off-diagonal. And press the sign button: ψ and −ψ produce the <em>identical</em> table — a table cannot remember a global sign, only relative ones. The double cover of step 11, finally explained mechanically. (Official names, for the curious: the table map is the degree-2 <em>Veronese map</em> into Sym², the space of symmetric tensors — and any degree-2 map, coordinate-squaring included, must factor through it.)
      </p>
      <p>
        <strong>Second, the disk was matrix-space all along.</strong> Mix beliefs, and the tables average entry by entry. The result is always a symmetric table whose diagonal sums to 1 — so it carries exactly two free numbers, its top row (p, w). Your Bernoulli disk <em>is</em> the space of these tables. Physicists call them <strong>density matrices</strong>. The tutorial has been doing matrix arithmetic in disguise: mixing = averaging tables (which is linear, hence the chords); superposition = adding vectors <em>before</em> squaring (hence a different floor).
      </p>
      <Notice>
        The <strong>multiplication table</strong> builds the circle and explains the missing sign; the <strong>density matrix</strong> is the disk, hiding inside the plain coordinates (p, w) you have plotted since step 3. Everything in this tutorial was tensor algebra, dressed up as coins. But the table keeps one more secret — it chooses its own diameter — and that secret has earned a playground of its own: the next one.
      </Notice>
    </div>
  );
}

// ============ PLAYGROUND E : THE STATE'S OWN AXES — SPECTRAL MEETS PCA ============
function CloudPlot({ beta, tt }) {
  // deterministic gaussian-ish cloud via Box–Muller on hashed uniforms
  const pts = useMemo(() => {
    const fract = (x) => x - Math.floor(x);
    const out = [];
    for (let i = 0; i < 46; i++) {
      const u1 = Math.max(1e-4, fract(Math.sin((i + 1) * 127.1) * 43758.5453));
      const u2 = fract(Math.sin((i + 1) * 311.7) * 26451.2937);
      const r = Math.sqrt(-2 * Math.log(u1));
      out.push([r * Math.cos(2 * Math.PI * u2), r * Math.sin(2 * Math.PI * u2)]);
    }
    return out;
  }, []);
  const br = (beta * Math.PI) / 180;
  const sP = 52 * Math.sqrt(2 * (0.5 + tt));   // spread along the major axis
  const sM = 52 * Math.sqrt(2 * (0.5 - tt));   // spread along the minor axis
  const cx = 160, cy = 100;
  const rot = ([x, y]) => [
    cx + (x * sP * Math.cos(br) - y * sM * Math.sin(br)),
    cy - (x * sP * Math.sin(br) + y * sM * Math.cos(br)),
  ];
  const axis = (len, ang, color) => {
    const dx = len * Math.cos(ang), dy = len * Math.sin(ang);
    return <line x1={cx - dx} y1={cy + dy} x2={cx + dx} y2={cy - dy} stroke={color} strokeWidth={2.4} />;
  };
  return (
    <svg viewBox="0 0 320 200" style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
      {[40, 80, 120, 160].map((y) => <line key={y} x1={0} y1={y} x2={320} y2={y} stroke={C.grid} strokeWidth={1} />)}
      {[40, 80, 120, 160, 200, 240, 280].map((x) => <line key={x} x1={x} y1={0} x2={x} y2={200} stroke={C.grid} strokeWidth={1} />)}
      {pts.map((p, i) => {
        const [x, y] = rot(p);
        return <circle key={i} cx={x} cy={y} r={3} fill={C.inkSoft} opacity={0.55} />;
      })}
      {axis(1.55 * sP, br, C.gold)}
      {axis(1.55 * sM, br + Math.PI / 2, C.teal)}
      <text x={8} y={16} fontFamily={mono} fontSize="9.5" letterSpacing="1" fill={C.inkSoft}>THE SAME MOVE ON A DATA CLOUD — PCA</text>
      <text x={8} y={192} fontFamily={mono} fontSize="9.5" fill={C.gold}>major axis ∝ √λ₊</text>
      <text x={312} y={192} textAnchor="end" fontFamily={mono} fontSize="9.5" fill={C.teal}>minor axis ∝ √λ₋</text>
    </svg>
  );
}

function StepSpectral() {
  const [tt, setTt] = useState(0.3);
  const [beta, setBeta] = useState(40);
  const br = (beta * Math.PI) / 180;
  const pp = 0.5 + tt * Math.cos(br);
  const ww = tt * Math.sin(br);
  const Mmix = [[pp, ww], [ww, 1 - pp]];
  const Np = [0.5 + 0.5 * Math.cos(br), 0.5 * Math.sin(br)];
  const Nm = [0.5 - 0.5 * Math.cos(br), -0.5 * Math.sin(br)];
  return (
    <div>
      <p>
        Step 5's mixer left a genuine ambiguity: many different chords pass through one interior point — many ensembles, one belief. The matrix breaks the tie. Its <strong>spectral decomposition</strong> selects one canonical splitting: the <strong>diameter through the state and the center</strong>. The endpoints are the <strong>eigen-states</strong> — the only decomposition into two <em>perpendicular</em>, antipodal coins — and the weights are the <strong>eigenvalues</strong> λ± = ½ ± t, exactly the λ that lifted this same diameter into the hemisphere of playground C. Steer the state and watch its matrix, its eigenvalues, and its own diameter move together:
      </p>
      <Slider value={tt} min={0} max={0.5} step={0.01} onChange={setTt}
        label="t — how mixed (distance from center)" readout={`λ₊=${(0.5 + tt).toFixed(2)}  λ₋=${(0.5 - tt).toFixed(2)}`} />
      <Slider value={beta} min={0} max={360} step={1} onChange={setBeta}
        label="β — direction of the state" readout={`ρ top row = (${pp.toFixed(2)}, ${ww.toFixed(2)})`} />
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 8 }}>
        <MatrixBox m={Mmix} highlightRow0 title="ρ — THE DENSITY MATRIX" />
        <div style={{ fontFamily: mono, fontSize: 12, color: C.inkSoft, lineHeight: 1.7, paddingTop: 4 }}>
          eigenvalues: ½±t = {(0.5 + tt).toFixed(2)}, {(0.5 - tt).toFixed(2)}<br />
          eigen-states: the diameter's two endpoints
        </div>
      </div>
      <StatePlot showLower showFullCircle labels={false} segment={[Np, Nm]} point={[pp, ww]} />
      <p>
        Now the <strong>quantum dictionary</strong>, and it is shorter than its reputation. In quantum speech, a question — a diameter, step 9 — is called an <em>observable</em>. Its <strong>eigen-states</strong> are the diameter's two endpoints: the only states that answer that question with certainty. Its <strong>eigenvalues</strong> are the <em>measured values</em> — the numbers you attach to the two answers, say +1 for one end and −1 for the other; every measurement outcome is such an eigenvalue. The state's own matrix ρ uses the same word differently: <em>its</em> eigenvalues are the <strong>weights</strong> λ± with which the two outcomes appear when you ask the state its own diameter. One geometric object, two readings: the question's matrix stores the <em>values</em> on the endpoints, the state's matrix stores the <em>probabilities</em> over them. Whenever a physicist says "eigen-something," picture a diameter with its two endpoints — nothing more.
      </p>
      <p>
        And if this "find the object's own axes" move feels familiar, it should — data science performs it daily under the name <strong>PCA</strong>, principal component analysis. A cloud of data points has a covariance table: second moments, exactly the kind of table this room is built from. PCA diagonalizes it: the eigenvectors are the cloud's <em>own axes</em>, and the eigenvalues are the spread along each. The density matrix is such a table for a belief, so its spectral decomposition <em>is</em> PCA applied to a belief: the state's diameter is its principal axis, and λ± say how the belief's weight distributes along it. The sliders above steer this cloud too — same t, same β:
      </p>
      <CloudPlot beta={beta} tt={tt} />
      <Notice>
        Ensemble ambiguity is real — many chords through one point — but every state carries one distinguished chord: its own diameter. It is the measurement the state answers most decisively (step 9), the axis of its hemisphere lift (playground C), the eigen-basis of its matrix, and the principal axis of its cloud. Spectral decomposition is not exotic quantum machinery; it is the oldest move in data analysis — let the object choose its own axes — applied to a belief instead of a data set.
      </Notice>
    </div>
  );
}


// ================= THE EVIDENCE ROOM (landing page) =================
function StepEvidenceRoom({ openExtra }) {
  return (
    <div>
      <p>
        Is the tutorial a nice story, or an actual construction? It is a construction — and this room holds the proof: the professionals' machinery fits into your picture without leaving a remainder. The <strong>density matrix</strong>, quantum theory's standard bookkeeping object, turns out to be exactly the disk you drew, hiding inside the coordinates (p, w) you have plotted since step 3. Its <strong>spectral decomposition</strong> is geometry you already own: the diameter through a state, the two opposite endpoints as eigen-states, their weights as eigenvalues. And the statisticians' honest rulers — the <strong>Bhattacharyya angle</strong> between two coins, the <strong>Bures distance</strong> between two beliefs — are nothing but arc length on your circle and on the bowl it bends into; they even predict how many flips a duel takes. And the <strong>probability amplitudes</strong> — quantum theory's square-root coordinates — you have already seen as visible geometry, in step 11: the center of the Bernoulli circle, seen from the private frame Thales hands every state. None of this was smuggled into the fifteen steps. All of it was waiting inside them.
      </p>
      <p>
        To hold that evidence in your own hands, six playgrounds are waiting, and two history exhibits close the room. They are heavier than the fifteen steps — take them in any dose, or not at all.
      </p>
      {[
        { d: "How far apart are two coins? The flat ruler fails; the arc — the Bhattacharyya angle — is the honest one, and it singles out the band width as the unique truthful axis." },
        { d: "Counting the flips: race two duels with a sequential referee, and find flips ∝ 1/(arc length)²." },
        { d: "The Bernoulli hemisphere: bend the disk into a bowl — the Bures distance; fair ↔ mystery = π/4." },
        { d: "Under the hood: the multiplication table builds the circle, and the density matrix is the disk." },
        { d: "Spectral decomposition in pictures: eigen-states, eigenvalues as measured values and weights — and why it is PCA for beliefs." },
        { d: "The polarizer bench, in full: Fresnel–Arago, the angle formula, waveplates, the bulb-versus-glare test — and a mystery beam to pin down yourself, Stokes's 1852 measurement run with your own clicks." },
        { d: "The ball before quantum: Stokes 1852 and Poincaré 1892 — the sphere drawn from classical light, your band width as a Stokes coordinate." },
        { d: "The ball after quantum: von Neumann, Wolf, Bloch — how the interior became a statement about uncertainty, one ball got two names — and Bell posted the boundary." },
      ].map((c, i) => (
        <button
          key={i}
          onClick={() => openExtra(i)}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            textAlign: "left", cursor: "pointer", background: "#fff",
            border: `1.5px solid ${C.gridBold}`, borderRadius: 8,
            padding: "8px 10px", marginBottom: 6, fontFamily: serif,
            fontSize: 14, color: C.ink,
          }}
        >
          <span style={{
            flex: "0 0 auto", width: 26, height: 26, borderRadius: "50%",
            border: `1.5px solid ${C.gridBold}`, background: C.goldSoft,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontFamily: mono, fontSize: 12, fontWeight: 600,
          }}>{EXTRAS[i].tag}</span>
          <span><strong>{EXTRAS[i].title}.</strong> {c.d}</span>
        </button>
      ))}
      <Notice>
        Each playground stands on its own, but they read best in order: first the ruler between coins (A), then its price in flips (B), then the ruler between beliefs (C), then the machinery under the hood (D), then the state's own axes (E) — where the quantum words <em>eigen-state</em> and <em>eigenvalue</em> turn out to be old acquaintances from data analysis — and finally the polarizer bench in full (F), the fine print behind steps 7, 12 and 14. Exhibits G and H are reading rather than play: the ball's double history, before and after quantum. The navigation at the top always brings you back to the main tutorial.
      </Notice>
    </div>
  );
}


// ================= PLAYGROUND G : THE POLARIZER BENCH =================
// Stokes tomography: reconstruct a hidden beam from three balance measurements.
function randBeam() {
  // random point in the ball, radius biased outward so states are interesting
  const u = Math.random(), v = Math.random();
  const th = Math.acos(2 * u - 1), phi = 2 * Math.PI * v;
  const r = 0.5 * (0.35 + 0.63 * Math.sqrt(Math.random()));
  return {
    p: 0.5 + r * Math.sin(th) * Math.cos(phi), // axle balance
    w: r * Math.sin(th) * Math.sin(phi),       // diagonal balance − ½
    z: r * Math.cos(th),                       // circular balance − ½
  };
}

function BalanceRow({ label, sub, tally, est, se, revealTrue, color, onFire }) {
  const pct = est == null ? null : 100 * est;
  return (
    <div style={{ margin: "8px 0" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
        <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: C.ink }}>{label}</span>
        <span style={{ fontFamily: mono, fontSize: 10, color: C.inkSoft, flex: 1 }}>{sub}</span>
        <Btn onClick={onFire}>send 40</Btn>
      </div>
      <div style={{ position: "relative", height: 16, background: "#fff", border: `1px solid ${C.gridBold}`, borderRadius: 3 }}>
        {est != null && (
          <>
            <div style={{ position: "absolute", left: `${Math.max(0, 100 * (est - se))}%`, width: `${100 * 2 * se}%`, top: 0, bottom: 0, background: color, opacity: 0.22 }} />
            <div style={{ position: "absolute", left: `calc(${pct}% - 1.5px)`, width: 3, top: 0, bottom: 0, background: color }} />
          </>
        )}
        {revealTrue != null && (
          <div style={{ position: "absolute", left: `calc(${100 * revealTrue}% - 1px)`, width: 2, top: -3, bottom: -3, background: C.ink }} />
        )}
        <div style={{ position: "absolute", left: "50%", width: 1, top: 3, bottom: 3, background: C.gridBold }} />
      </div>
      <div style={{ fontFamily: mono, fontSize: 10.5, color: C.inkSoft, marginTop: 2 }}>
        {tally.n === 0 ? "…no photons spent yet…" : (
          <>through: {tally.k}/{tally.n} → balance ≈ {(100 * est).toFixed(1)}% ± {(100 * se).toFixed(1)}</>
        )}
        {revealTrue != null && <span style={{ color: C.ink }}> · true: {(100 * revealTrue).toFixed(1)}%</span>}
      </div>
    </div>
  );
}

function MysteryBeamLab() {
  const [hidden, setHidden] = useState(randBeam);
  const [tal, setTal] = useState({ h: { k: 0, n: 0 }, d: { k: 0, n: 0 }, c: { k: 0, n: 0 } });
  const [revealed, setRevealed] = useState(false);
  const truth = { h: hidden.p, d: 0.5 + hidden.w, c: 0.5 + hidden.z };
  const fire = (q) => {
    let k = 0;
    for (let i = 0; i < 40; i++) if (Math.random() < truth[q]) k++;
    setTal((t) => ({ ...t, [q]: { k: t[q].k + k, n: t[q].n + 40 } }));
  };
  const est = (q) => (tal[q].n === 0 ? null : tal[q].k / tal[q].n);
  const se = (q) => {
    if (tal[q].n === 0) return 0;
    const f = est(q);
    return Math.max(Math.sqrt((f * (1 - f)) / tal[q].n), 0.008);
  };
  const eh = est("h"), ed = est("d"), ec = est("c");
  const allMeasured = eh != null && ed != null && ec != null;
  const err = allMeasured
    ? Math.sqrt((eh - hidden.p) ** 2 + (ed - 0.5 - hidden.w) ** 2 + (ec - 0.5 - hidden.z) ** 2)
    : null;
  const reset = () => {
    setHidden(randBeam());
    setTal({ h: { k: 0, n: 0 }, d: { k: 0, n: 0 }, c: { k: 0, n: 0 } });
    setRevealed(false);
  };
  const spent = tal.h.n + tal.d.n + tal.c.n;
  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, padding: "10px 12px", marginTop: 10 }}>
      <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 1, color: C.inkSoft, marginBottom: 4 }}>
        THE MYSTERY BEAM — PHOTONS SPENT: {spent}
      </div>
      <BalanceRow label="H sheet" sub="the axle balance — reads p" color={C.gold}
        tally={tal.h} est={eh} se={se("h")} revealTrue={revealed ? truth.h : null} onFire={() => fire("h")} />
      <BalanceRow label="45° sheet" sub="the diagonal balance — reads ½ + w" color={C.red}
        tally={tal.d} est={ed} se={se("d")} revealTrue={revealed ? truth.d : null} onFire={() => fire("d")} />
      <BalanceRow label="waveplate + sheet" sub="the circular balance — reads ½ + z" color={C.teal}
        tally={tal.c} est={ec} se={se("c")} revealTrue={revealed ? truth.c : null} onFire={() => fire("c")} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 4px" }}>
        <Btn onClick={() => setRevealed(true)} disabled={!allMeasured || revealed}>reveal the hidden beam</Btn>
        <Btn kind="ghost" onClick={reset}>new mystery beam</Btn>
      </div>
      {allMeasured && (
        <StatePlot point={[eh, ed - 0.5]} centroids={revealed ? [{ p: hidden.p, w: hidden.w, color: C.ink }] : []}
          showLower showFullCircle labels={false} />
      )}
      {allMeasured && (
        <div style={{ fontFamily: mono, fontSize: 11, color: C.inkSoft, marginTop: 6, lineHeight: 1.6 }}>
          your reconstruction: (p, w, z) ≈ ({eh.toFixed(2)}, {fmt(ed - 0.5)}, {fmt(ec - 0.5)}) — the disk above shows (p, w); the circular balance z lifts the point off the page, toward you.
          {revealed && (
            <span style={{ color: C.ink }}>
              {" "}Hidden beam: ({hidden.p.toFixed(2)}, {fmt(hidden.w)}, {fmt(hidden.z)}) — your miss: {err.toFixed(3)} ball units. Spend more photons and watch it shrink.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function StepPolarBench() {
  const [theta, setTheta] = useState(45);
  const [midIn, setMidIn] = useState(true);
  const t = (theta * Math.PI) / 180;
  const Iout = midIn ? Math.cos(t) ** 2 * Math.sin(t) ** 2 : 0;
  return (
    <div>
      <p>
        Step 14 pulled the aha; this bench supplies the machinery and the dictionary's fine print —
        all of it still <em>classical</em>: bright light, the ball of Stokes and Poincaré.
      </p>
      <p>
        The fine print first. Physical angles <strong>double</strong> on the ball (step 11 derives it — its readout
        literally says Bernoulli angle = 2α). So polarizer axes 90° apart in the lab are <em>antipodal</em> on the ball, and
        antipodal means <strong>perfectly distinguishable</strong>: one question separates them
        without fail. Perpendicular <em>diameters</em>, by contrast, mean{" "}
        <strong>mutually unbiased questions</strong> — certainty on one is a plain 50/50 on the
        others: step 13's uncertainty trade-off, wearing lab clothes. And note that <em>two</em>
        orientations appear in step 14's dictionary, not one. The sign you kept in step 8 was the
        turning direction of a triangle in the picture plane — it separates the two{" "}
        <em>diagonals</em>. The handedness of circular light is a turning direction in{" "}
        <em>time</em> — it separates the two <em>circulars</em>, one dial quarter-turn away. Two
        different shadows of one hidden dial; what they share is that the plain H-or-T flip can
        see neither.
      </p>
      <p>
        Which brings us to the 1819 blindness in full. Fresnel and Arago overlapped H- and V-polarized beams at every relative
        phase and found the brightness simply <em>adds</em> — never a fringe. What does change
        with the phase is the <em>polarization state</em> of the sum: diagonal, then circular,
        then the other diagonal — a walk once around step 13's standing wheel. The dial turns in
        plain sight; brightness, the plain flip, registers nothing — exactly the blindness steps 10
        and 13 predicted, on a lab bench two centuries ago.
      </p>
      <p>
        Now the bench, with the middle sheet's angle set free. A polarizer is a{" "}
        <strong>flip along a diameter, followed by preparation at the surviving end</strong> —
        step 9's "measuring is asking", plus the note that the state jumps to the answer it gave.
        The middle sheet asks the θ-question; the always-H state passes with probability cos²θ and
        leaves <em>prepared at angle θ</em> — a state that finally has an always-T component for
        the last sheet to find:
      </p>
      <PolarizerBench theta={theta} midIn={midIn} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 4px" }}>
        <Btn onClick={() => setMidIn((v) => !v)}>{midIn ? "remove middle sheet" : "insert middle sheet"}</Btn>
      </div>
      {midIn && (
        <Slider
          value={theta} min={0} max={90} step={1} onChange={setTheta}
          label="θ — angle of the middle sheet"
          readout={`θ=${theta}° → ${(100 * Iout).toFixed(1)}% of the prepared light gets through`}
        />
      )}
      <Formula>share through = cos²θ · cos²(90°−θ)&nbsp;&nbsp;&nbsp;&nbsp;maximum ¼ at θ = 45°</Formula>
      <p>
        One question has been open since the mystery coins of step 2: is the <em>center</em> of the
        ball — total ignorance, the even mixture — truly a different thing from a surface state
        with the same 50/50 odds? The bench answers this too. An ordinary bulb emits unpolarized
        light: the center. Rotate a <em>single</em> sheet in front of it, and the transmitted
        brightness is a stubborn, flat one-half at every angle — the center is fixed by every
        rotation of the ball, so no turn of the sheet can make it breathe. In front of polarized
        light instead — glare off water, most laptop screens — the brightness swells and dies as
        cos². Same odds at one angle, completely different everywhere else: the two kinds of
        not-knowing, told apart by hardware.
      </p>
      <AnalyzerDemo />
      <p style={{ marginTop: 14 }}>
        (One honest bookkeeping note: a polarizer is a <em>question</em>, not a rotation — it
        collapses and prepares. The pure rotations of step 13 also exist as hardware: a{" "}
        <strong>waveplate</strong>, a slab of crystal that delays one component and simply turns
        the dial, measuring nothing. Optics labs are built from exactly these two parts: waveplates
        to rotate the ball, polarizers to flip it.)
      </p>
      <p>
        With both parts on the bench, you can now run Stokes's 1852 measurement <em>yourself</em>.
        Below is a mystery beam — its settings are hidden. You own three questions, one per
        diameter of step 14's dictionary: the <strong>H sheet</strong> reads the axle balance, the{" "}
        <strong>45° sheet</strong> reads the diagonal balance — and for the third there is no sheet
        that works alone. Handedness hides from every polarizer, exactly as the fine print above
        warned — so a <strong>waveplate</strong> first turns the dial a quarter, converting circular
        to linear, and only then a sheet reads the circular balance. Each press spends 40 photons.
        Spend, watch each estimate settle — its error band shrinks as 1/√N, playground B's law,
        now buying <em>coordinates</em> instead of a verdict — and when you trust your three
        numbers, reveal the beam:
      </p>
      <MysteryBeamLab />
      <p style={{ marginTop: 14 }}>
        Three balances, one point: a state <em>is</em> its list of answers, and three perpendicular
        questions are enough to write the list. What you just did by clicking, Stokes did in 1852
        with sunlight and calcite; the three re-centered balances bear his name — the{" "}
        <strong>Stokes parameters</strong> — and measuring them is a working optician's daily bread
        (<em>polarimetry</em>; in quantum labs, the same ritual on single photons is called{" "}
        <em>state tomography</em>). Note what it quietly proves: nothing about a beam's seat on the
        ball is hidden metaphysics. Every coordinate is an odds, and every odds can be bought with
        photons.
      </p>
      <Notice>
        Everything on this bench runs on bright classical light: you have just repeated with clicks
        what Stokes measured in 1852, and Poincaré drew the sphere for it in 1892 — the ball at
        work decades before quantum mechanics (Exhibits G and H tell that story). The quantum
        entrance is step 15 of the main tutorial: the same curves, drawn one click at a time.
      </Notice>
    </div>
  );
}

// ================= PLAYGROUND H : TWO PATHS, ONE PARTICLE =================
function MZPlot({ phi, mix, bs2 = true }) {
  const W = 340, H = 190;
  const grid = [];
  for (let x = 20; x <= 320; x += 30) grid.push(<line key={"v" + x} x1={x} y1={0} x2={x} y2={H} stroke={C.grid} strokeWidth={0.8} />);
  for (let y = 10; y <= 180; y += 30) grid.push(<line key={"h" + y} x1={0} y1={y} x2={W} y2={y} stroke={C.grid} strokeWidth={0.8} />);
  const yLo = 150, yUp = 60, xBS1 = 85, xBS2 = 245;
  const pPlus = !bs2 ? 0.5 : mix ? 0.5 : Math.cos((phi * Math.PI) / 360) ** 2; // cos²(φ/2)
  const beam = (x1, y1, x2, y2, I) =>
    I > 0.01 ? (
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.gold} strokeWidth={1.5 + 6 * I} strokeLinecap="round" opacity={0.4 + 0.6 * I} />
    ) : (
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.gridBold} strokeWidth={1.2} strokeDasharray="3 5" />
    );
  const halfMirror = (x, y) => (
    <line x1={x - 11} y1={y + 11} x2={x + 11} y2={y - 11} stroke={C.teal} strokeWidth={3.5} strokeLinecap="round" />
  );
  const mirror = (x, y) => (
    <line x1={x - 11} y1={y + 11} x2={x + 11} y2={y - 11} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
      {grid}
      <text x={14} y={yLo - 10} fontFamily={mono} fontSize="9.5" fill={C.inkSoft}>source</text>
      <line x1={14} y1={yLo} x2={xBS1 - 4} y2={yLo} stroke={C.ink} strokeWidth={5} strokeLinecap="round" opacity={0.85} />
      {/* arms: each carries half the light */}
      {beam(xBS1, yLo, xBS1, yUp, 0.5)}
      {beam(xBS1, yUp, xBS2, yUp, 0.5)}
      {beam(xBS1, yLo, xBS2, yLo, 0.5)}
      {beam(xBS2, yLo, xBS2, yUp, 0.5)}
      {/* outputs */}
      {beam(xBS2, yUp, 322, yUp, pPlus)}
      {beam(xBS2, yUp, xBS2, 16, 1 - pPlus)}
      {/* phase dial on upper arm */}
      <rect x={152} y={yUp - 13} width={26} height={26} rx={6} fill="#fff" stroke={C.gold} strokeWidth={2} />
      <text x={165} y={yUp + 5} textAnchor="middle" fontFamily={mono} fontSize="11" fontWeight="600" fill={C.gold}>φ</text>
      {halfMirror(xBS1, yLo)}
      {mirror(xBS1, yUp)}
      {mirror(xBS2, yLo)}
      {bs2 && halfMirror(xBS2, yUp)}
      <text x={xBS1} y={yLo + 24} textAnchor="middle" fontFamily={mono} fontSize="9" fill={C.teal}>½-mirror</text>
      {bs2 && <text x={xBS2} y={yUp + 26} textAnchor="middle" fontFamily={mono} fontSize="9" fill={C.teal}>½-mirror</text>}
      <text x={322} y={yUp - 10} textAnchor="end" fontFamily={mono} fontSize="10" fontWeight="600" fill={C.ink}>D⊕ {(100 * pPlus).toFixed(0)}%</text>
      <text x={xBS2 + 8} y={20} fontFamily={mono} fontSize="10" fontWeight="600" fill={C.ink}>D⊖ {(100 * (1 - pPlus)).toFixed(0)}%</text>
    </svg>
  );
}

function StepTwoPaths() {
  const [phi, setPhi] = useState(0);
  const [mix, setMix] = useState(false);
  const pPlus = mix ? 0.5 : Math.cos((phi * Math.PI) / 360) ** 2;
  return (
    <div>
      <p>
        Turn the lamp down. Far enough down, light stops being a stream and arrives as{" "}
        <strong>photons</strong> — indivisible particles, one at a time, each a single click on a
        single detector. And with the very first click, a question steps forward that bright beams
        never had to answer: a beam can carry two wiggles at once, but a single, indivisible
        particle — through which slot of the picket fence did <em>it</em> go? Here is the cleanest
        arena ever built for that question. Take one particle and a <strong>half-silvered
        mirror</strong>: reflected or transmitted, two routes. In ball language the dictionary is
        short. "Certainly route A" and "certainly route B" are the two ends of an axle; the
        half-mirror is a quarter-turn that carries "certainly A" to the fair coin of the routes;
        extra path length in one arm turns the <strong>delay dial</strong> φ — the same dial as
        step&nbsp;13, now made of nothing but distance; and bringing the routes back together on a
        second half-mirror in front of two detectors is the <strong>flip</strong>. Two routes, one
        qubit — this is the famous double-slit experiment, stripped to its skeleton.
      </p>
      <Slider value={phi} min={0} max={360} step={1} onChange={setPhi}
        label="φ — extra path length in the upper arm, as dial angle"
        readout={`φ=${phi}°  →  D⊕ odds ${mix ? "50% (mixture)" : (100 * pPlus).toFixed(0) + "%"}`} />
      <MZPlot phi={phi} mix={mix} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 4px" }}>
        <Btn onClick={() => setMix((v) => !v)}>{mix ? "source: mystery mixture — switch back" : "source: qubit — switch to mystery mixture"}</Btn>
      </div>
      <ProbBars title="DETECTOR ODDS" probs={[pPlus, 1 - pPlus]} labels={["D⊕ clicks", "D⊖ clicks"]} dim={mix} />
      <p style={{ marginTop: 14 }}>
        And the same run, drawn on the ball — the interferometer's flight recorder. Quarter-turn to
        the equator, a gold walk of φ around the standing wheel, quarter-turn back; the final
        point's position along the axle <em>is</em> the detector odds. Switch to the mystery
        mixture and the recorder has nothing to record: the center is fixed by every rotation.
      </p>
      <MZBall phi={phi} bs2={true} mix={mix} />
      <p style={{ marginTop: 14 }}>
        Set φ = 0: two 50/50 mirrors in a row, and yet one detector clicks <em>always</em>. The
        routes' two contributions to the other detector are equal and opposite — step 8's
        "negative lengths" again — and cancel to nothing. This is the other half of Cox's rule,
        promised back in step&nbsp;6: the pairs of two separate routes, finally <em>added</em> —
        and only the sum squared. Sweep φ and the odds trace{" "}
        <strong>cos²(φ/2)</strong>: fringes, the dial made visible. Then press the source button.
        A mystery-mixture source sends each particle definitely down <em>one</em> route — you just
        don't know which: the center of the ball. The fringes die into a flat 50/50 at every φ,
        because the center is fixed by every rotation. One bench, two verdicts: the dial and the
        sign are physically real, and the interior of the ball really is a different kind of
        not-knowing.
      </p>
      <p>
        And now the quantum part — everything above was run with photons <strong>one at a
        time</strong>, and the clicks still accumulate to cos²(φ/2). Sit with that. Each photon is
        one indivisible click at one detector; nothing ever registers "half a photon" in each arm.
        Yet no story in which the photon took <em>one</em> route survives: the mixture source is
        exactly that story, and its fringes never come. Each particle travels both routes <em>as
        amplitudes</em> — the two square-root numbers of step 11, signs, delay dial and all — and
        answers as one particle. The amplitude pair is not our description of the photon; as far as
        any experiment can tell, it is <em>what the photon is</em>.
      </p>
      <p>
        One more look at what you just operated: prepare, quarter-turn, turn a dial, quarter-turn,
        read. A choreographed sequence of rotations of the ball — physicists call them{" "}
        <strong>gates</strong> — steering amplitudes so that wrong answers cancel and right ones
        add. You have run the smallest quantum computation there is.
      </p>
      <ClaimBadge n="1 & 4" who="COX + MIT" status="REDEEMED">
        Both films, at once. Cox's opening — particles hop with a probability given by one simple rule — is your interferometer's arithmetic: one little quantity per path, added, squared last. And MIT's parallelism-plus-interference, enhancing right answers while suppressing wrong ones, is precisely what your gates just did with a single photon.
      </ClaimBadge>
      <Notice>
        Here the tutorial closes its loop. The ball was never really about light. Light was the
        teacher — it forced the sign, then forced the dial — but the single photon reveals the
        lesson's true subject: <em>probability itself</em>. Any system with two answers — a
        photon's two routes, an electron's two spins, an atom's two energy levels — carries the
        same ball, the same amplitudes, the same interference. The coin you flipped in step 1 was,
        all along, the crude shadow of this. Statistics with the details kept does not merely
        describe the world; it turns out to <em>be</em> the world's own bookkeeping. The epilogue
        takes stock.
      </Notice>
    </div>
  );
}

// ================= EXHIBIT I : THE BALL BEFORE QUANTUM =================
function StepBallBefore() {
  return (
    <div>
      <p>
        The ball has a birth certificate, and the date on it is a surprise:{" "}
        <strong>1892</strong>, half a century before quantum mechanics. Henri Poincaré drew it in
        his <em>Théorie mathématique de la lumière</em> as a map of the polarization states of
        light: linear polarizations around one great circle, the two circulars at opposite poles,
        elliptical states everywhere in between, opposite points for perfectly distinguishable
        states. He read it as <em>wave geometry</em> — a catalogue of the ellipse shapes a light
        field can trace — and his object was really only the glassy surface.
      </p>
      <p>
        The interior came from an older tradition. In <strong>1852</strong> George Stokes had
        defined four parameters of a light beam <em>operationally</em> — each an intensity
        difference you measure by holding up polarizers and comparing brightnesses: the H/V
        balance, the diagonal balance, the circular balance, and the total. Stokes's parameters
        handle <strong>partially polarized</strong> light with no extra machinery, and on the ball
        the degree of polarization becomes the <em>radius</em>: fully polarized light on the
        surface, partial light inside, and completely unpolarized light — total ignorance — at the
        dead center. Classical optics found the center of your ball without a word of quantum
        theory.
      </p>
      <p>
        Two of your own discoveries hang in this exhibit. First, the <strong>double cover</strong>:
        turn a polarizer by θ in the lab and the state moves by <em>2θ</em> on the sphere — a 90°
        physical turn lands on the antipode. Step 11's angle-doubling, running in glass and brass. Second, the <strong>signed band width</strong>. Compute the ball's three axes
        from amplitudes (a, b·e<sup>iφ</sup>): a²−b², 2ab·cosφ, 2ab·sinφ — and these are, up to a
        factor of two, exactly Stokes's three balances. With real amplitudes your band width a·b is
        half the diagonal balance: not a resemblance but a <em>coordinate</em>, a measurable
        number, read off by precisely the 45° sheet of step&nbsp;7 — and measured by Stokes forty
        years before Poincaré drew the sphere.
      </p>
      <Notice>
        An honesty note: neither man read the ball as a ledger of <em>uncertainty</em>. To Stokes,
        partial polarization was a property of a beam; to Poincaré, the sphere was geometry. The
        reading you built — two distinguishable kinds of not-knowing, surface versus interior — was
        not available to them. That reading is the next exhibit.
      </Notice>
    </div>
  );
}

// ================= EXHIBIT J : THE BALL AFTER QUANTUM =================
function StepBallAfter() {
  return (
    <div>
      <p>
        The split this tutorial <em>starts</em> from — "I don't know which state it is in" versus
        "the state itself only gives odds" — is a twentieth-century achievement. Its machinery is
        John von Neumann's <strong>density matrix</strong> (1927): the object of playground D,
        which puts pure states on the surface and mixtures in the interior <em>for statistical
        reasons</em>, and makes "unpolarized light = the even mixture at the center" a theorem
        about uncertainty rather than a description of a beam. Optics arrived at the same structure
        under its own name — the <strong>coherency matrix</strong>, through Norbert Wiener and, in
        the 1950s, Emil Wolf's theory of coherence.
      </p>
      <p>
        In <strong>1946</strong> Felix Bloch, working on nuclear magnetic resonance, described the
        states of any two-level quantum system — and drew the same ball again. Mathematically
        identical, freshly relabeled: what optics calls the <strong>Poincaré sphere</strong>,
        quantum physics calls the <strong>Bloch sphere</strong>. One ball, two names, discovered
        twice.
      </p>
      <p>
        So what, in the end, is genuinely quantum? Not the ball. Two things, and it pays to name
        them exactly. First, the <em>individual event</em>: a bright beam's place on the ball is
        classical bookkeeping, but a single photon clicking through with cos² odds — and the state
        <em>jumping</em> to its answer, though a pure state had nothing left to learn (step 10) —
        is quantum proper. Second, and deeper: <em>composition</em>. One honest clause first: your
        construction shows that statistics <em>permits</em> the sign and the dial; it does not{" "}
        <em>force</em> them — keeping only the sign gives a disk, and that nature runs exactly{" "}
        <em>one</em> dial is her choice, not a theorem. Indeed, a single ball can always be
        explained away: Bell himself wrote down a hidden ledger — a secret list of answers to
        every diameter — that reproduces one qubit's statistics completely. For one ball, "statistics
        with the details kept" is not just a reading; it is provably sufficient.
      </p>
      <p>
        Then comes the boundary, and it has a theorem's sharpness. Take <em>two</em> balls sharing
        one state, and ask whether any single ledger — one joint probability distribution over the
        answers to all questions, consulted locally — could explain what nature returns.{" "}
        <strong>Bell's inequalities</strong> are exactly the conditions such a ledger must obey
        (Fine's theorem: they hold <em>if and only if</em> the joint distribution exists), and
        entangled pairs <em>violate</em> them. Nothing about probability itself breaks — every
        chosen pair of questions still gets honest odds — but the master table behind all the
        questions is gone. The details being kept no longer fit in any classical book. That next
        rung of the ladder — two balls, one state, and the ledger that cannot exist — is a
        tutorial of its own.
      </p>
      <Notice>
        Which makes the closing thesis of the tutorial precise. History drew the ball twice{" "}
        <em>before</em> understanding what it was a picture of: first as wave geometry, then as
        laboratory bookkeeping, and only afterwards as what you built it as from the very first
        step — a ledger of two kinds of uncertainty, with every detail kept. Your route was not the
        historical route, and that is the point: the meaning came last in history, and first in
        this tutorial. And the ladder does not stop here: one ball is statistics all the way up —
        Bell's theorem is the sign at the top saying the next rung is not.
      </Notice>
    </div>
  );
}

// ================= APP =================
function ClaimBadge({ n, who, status, children }) {
  return (
    <div style={{ marginTop: 14, padding: "8px 12px", border: `1.5px solid ${C.gold}`, borderRadius: 8, background: C.goldSoft }}>
      <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: 1, color: C.gold, fontWeight: 700 }}>
        CLAIM № {n} · {who} — {status}
      </span>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, marginTop: 3 }}>{children}</div>
    </div>
  );
}

function VideoEmbed({ id, title, href }) {
  return (
    <div style={{ margin: "12px 0" }}>
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        title={title}
        allowFullScreen
        style={{ width: "100%", aspectRatio: "16 / 9", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}
      />
      <div style={{ fontFamily: mono, fontSize: 11, color: C.inkSoft, marginTop: 4 }}>
        {title} — <a href={href} target="_blank" rel="noreferrer" style={{ color: C.teal }}>open on YouTube</a>
      </div>
    </div>
  );
}

function Step0Videos() {
  const claims = [
    {
      n: 1, who: "COX",
      text: <>Nature's basic rule is probabilistic. Particles are particles, and they hop from place to place with a particular probability, given by one simple rule — that's it, and the rest of quantum mechanics follows from it.</>,
      where: "redeemed across steps 1–3 and 9–10",
    },
    {
      n: 2, who: "COX",
      text: <>The rule does not work with the probabilities directly. As Cox puts it: <em>"you basically calculate these little quantities … and you add them up."</em> Beneath every probability sits a stranger quantity — computed first, added up, turned into odds only at the end.</>,
      where: "sighted in steps 4 and 6, redeemed in steps 11 and 15",
    },
    {
      n: 3, who: "MIT",
      text: <>A transistor's bit is a switch: 0 or 1, north pole or south pole, that's it. But <em>"qubits, like humans, can be anywhere on the surface of the planet Earth."</em> Anywhere off the poles is a superposition of 0 and 1.</>,
      where: "sighted in step 4, redeemed across steps 12–14",
    },
    {
      n: 4, who: "MIT",
      text: <>The power of a quantum computer is quantum parallelism plus quantum interference — states adding like overlapping waves — arranged so that right answers are enhanced and wrong answers suppressed.</>,
      where: "sighted in steps 6–7, redeemed in steps 14–15",
    },
  ];
  return (
    <div>
      <p>
        Before building anything, watch two short films. The first is sixty seconds: physicist Brian Cox, challenged on BBC radio to state the rules of quantum mechanics inside a minute. The second is a few minutes from MIT: Will Oliver, director of MIT's Center for Quantum Engineering, and research scientist Jeff Grover, on what quantum mechanics is and why quantum computers should be powerful.
      </p>
      <VideoEmbed id="fcfQkxwz4Oo" title="Brian Cox — quantum mechanics in 60 seconds (BBC News)" href="https://youtu.be/fcfQkxwz4Oo" />
      <VideoEmbed id="jk0jWzlvA5w" title="Quantum Explained — MIT (Will Oliver & Jeff Grover)" href="https://youtu.be/jk0jWzlvA5w" />
      <p>
        Both films are honest. And both, in the nature of short films, ask you to take nearly everything on faith. Listen closely and they make four remarkable claims:
      </p>
      {claims.map((c) => (
        <div key={c.n} style={{ marginTop: 10, padding: "10px 12px", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, background: "#fff" }}>
          <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: 1, color: C.inkSoft, fontWeight: 700 }}>
            CLAIM № {c.n} · {c.who}
          </span>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 3 }}>{c.text}</div>
          <div style={{ fontFamily: mono, fontSize: 10.5, color: C.gold, marginTop: 5 }}>→ {c.where}</div>
        </div>
      ))}
      <Notice>
        Here is this tutorial's promise: <strong>you will not be asked to believe any of these.</strong> You will build all four, with your own hands, starting from nothing but coin flips — no physics until nature herself forces it. Gold badges along the way mark the moment each claim stops being a claim. When a film says <em>little quantities</em>, you will have drawn them with a slider; when it says <em>anywhere on the planet Earth</em>, the planet will be on your screen, and you will know why the poles sit where they do. Now forget quantum entirely. Step 1 is a coin.
      </Notice>
    </div>
  );
}

const STEPS = [
  { title: "Two films, four claims", comp: Step0Videos, tag: "0", label: "WATCH FIRST" },
  { title: "Just statistics — at first", comp: StepIntro, tag: "i", shape: "bra", label: "INTRODUCTION" },
  { title: "Flip a fair coin", comp: Step1, tag: "1", label: "STEP 1/15" },
  { title: "Three mystery coins", comp: Step2, tag: "2", label: "STEP 2/15" },
  { title: "Two numbers per run", comp: Step3, tag: "3", label: "STEP 3/15" },
  { title: "The semicircle", comp: Step4, tag: "4", label: "STEP 4/15" },
  { title: "Mixing beliefs", comp: StepMix, tag: "5", label: "STEP 5/15" },
  { title: "A coin made of light", comp: Step6Light, tag: "6", label: "STEP 6/15" },
  { title: "The same disk, in glass", comp: StepLightDisk, tag: "7", label: "STEP 7/15" },
  { title: "The mirror twins", comp: StepTwins, tag: "8", label: "STEP 8/15" },
  { title: "Measuring is asking", comp: StepMeasure, tag: "9", label: "STEP 9/15" },
  { title: "Why the sign hides", comp: StepSign, tag: "10", label: "STEP 10/15" },
  { title: "The view from the state", comp: StepFrame, tag: "11", label: "STEP 11/15" },
  { title: "The state that isn't there", comp: StepCircular, tag: "12", label: "STEP 12/15" },
  { title: "The delay dial — disk to ball", comp: StepBloch, tag: "13", label: "STEP 13/15" },
  { title: "The ball, in your hands", comp: StepHands, tag: "14", label: "STEP 14/15" },
  { title: "One photon at a time", comp: StepTwoPaths, tag: "15", label: "STEP 15/15" },
  { title: "The ball in the wild", comp: StepEpilogue, tag: "e", shape: "ket", label: "EPILOGUE" },
];

// hidden playgrounds — reachable only from the epilogue's evidence room
const EXTRAS = [
  { title: "How far apart are two coins?", comp: StepDistance, tag: "A", label: "PLAYGROUND A" },
  { title: "Counting the flips", comp: StepFlipCount, tag: "B", label: "PLAYGROUND B" },
  { title: "The Bernoulli hemisphere", comp: StepBures, tag: "C", label: "PLAYGROUND C" },
  { title: "Under the hood — the matrix", comp: StepMatrix, tag: "D", label: "PLAYGROUND D" },
  { title: "The state's own axes", comp: StepSpectral, tag: "E", label: "PLAYGROUND E" },
  { title: "The polarizer bench", comp: StepPolarBench, tag: "F", label: "PLAYGROUND F" },
  { title: "The ball before quantum", comp: StepBallBefore, tag: "G", label: "EXHIBIT G" },
  { title: "The ball after quantum", comp: StepBallAfter, tag: "H", label: "EXHIBIT H" },
];
const ROOM = { title: "The evidence room", comp: StepEvidenceRoom, label: "ADDITIONAL MATERIAL" };


// =====================================================================
// ROOM MODE — the tutorial as the participant page of a live session.
// Active only when the URL carries ?session=CODE and ../room/*.js is loaded.
// Scenes follow the presenter (storyboard v0.3); scenes without a room step
// yet fall back to the closest standalone tutorial step.
// =====================================================================
const useParticipantSafe = () => (typeof Room !== "undefined" && Room.useParticipant ? Room.useParticipant() : null);
const roomSession = () => (typeof Room !== "undefined" && Room.sessionFromUrl ? Room.sessionFromUrl() : null);

// scene → index into STEPS (fallback while room steps are built slice by slice)
const SCENE_TO_STEP = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 5, 6: 6, 7: 7, 8: 7, 9: 7, 10: 8, 11: 10, 12: 12, 13: 9, 14: 13, 15: 13, 16: 14, 17: 16, 18: 17, 19: 14 };
const SCENE_TITLES = {
  0: "How this works", 1: "Two coins, one prediction", 2: "Two sources of uncertainty", 3: "One number is not enough",
  4: "The Bernoulli circle", 5: "From the state's own point of view", 6: "Two doubts", 7: "Two pairs of sunglasses",
  8: "The polarizer is the coin toss", 9: "The half circle, in glass", 10: "Mixed light", 11: "Ask a different question",
  12: "Angle doubling", 13: "The twins split", 14: "The shadow", 15: "The impostor", 16: "The ball",
  17: "One photon at a time", 18: "The dictionary and the receipt", 19: "The room decoheres",
};

function RoomStatus({ status }) {
  const col = status === "connected" ? C.teal : status === "error" ? C.red : status === "connecting" ? C.gold : C.inkSoft;
  const txt = status === "connected" ? "live" : status === "local" ? "local" : status;
  return <span style={{ fontFamily: mono, fontSize: 10, color: "#fff", background: col, padding: "2px 8px", borderRadius: 10 }}>{txt}</span>;
}

function RoomJoin({ room }) {
  const [tag, setTag] = useState(null);
  const tags = (typeof Room !== "undefined" && Room.TAGS) || ["🦊", "🐙", "🦉", "🐢"];
  return (
    <div>
      <p>You are joining session <strong style={{ fontFamily: mono, letterSpacing: 2 }}>{room.session}</strong>. Pick a name — it is how your dot appears on the big screen.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "14px 0" }}>
        {tags.map((t) => (
          <button key={t} onClick={() => setTag(t)} style={{
            width: 48, height: 48, fontSize: 26, borderRadius: 10, cursor: "pointer",
            border: `2px solid ${tag === t ? C.gold : C.gridBold}`, background: tag === t ? C.goldSoft : "#fff",
          }}>{t}</button>
        ))}
      </div>
      <Btn onClick={() => tag && room.join(tag)} disabled={!tag}>join as {tag || "…"}</Btn>
      <div style={{ marginTop: 10, fontFamily: mono, fontSize: 11, color: C.inkSoft }}>
        connection: <RoomStatus status={room.status} />
      </div>
    </div>
  );
}

// ── SCENE 1 : two coins, one prediction ──
function RoomStep1({ room }) {
  const round = room.state.round || "A";
  const token = room.state.resetToken || 0;
  const storeKey = "pf-flips-" + room.session;
  const [flips, setFlips] = useState(() => {
    try { const v = JSON.parse(sessionStorage.getItem(storeKey)); if (v && v.A && v.B && v.C) return v; } catch (e) {}
    return { A: [], B: [], C: [] };
  });
  const [guess, setGuess] = useState(null);
  const lastToken = useRef(token);
  const me = room.me;

  const tallyOf = (f) => { const o = {}; ["A", "B", "C"].forEach((r) => { o[r] = { n: f[r].length, heads: f[r].filter((v) => v).length }; }); return o; };

  // every change of the local flips → persist + one snapshot to the presenter (never inside a render)
  useEffect(() => {
    try { sessionStorage.setItem(storeKey, JSON.stringify(flips)); } catch (e) {}
    room.send("tally", tallyOf(flips));
  }, [flips]);

  // presenter reset: clear the round that was reset (it is the current round in the same patch)
  useEffect(() => {
    if (token !== lastToken.current) {
      lastToken.current = token;
      setFlips((f) => ({ ...f, [round]: [] }));
    }
  }, [token]);

  const p = round === "A" ? 0.5 : me ? (round === "B" ? me.face : me.bias) : null;
  const seq = flips[round] || [];
  const roundCol = round === "A" ? C.teal : round === "B" ? C.violet : C.gold;
  const nH = seq.filter((v) => v).length;
  const flip = () => {
    if (p === null) return;
    setFlips((f) => ({ ...f, [round]: [...f[round], flipOne(p)] }));
  };

  return (
    <div>
      {round === "A" && <p>Round A. You hold a <strong>fair coin</strong>. Before you flip: what do you expect ten flips to look like — neat alternation, or something clumpier?</p>}
      {round === "B" && <p>Round B. Your phone holds a <strong>mystery coin</strong>: it always lands the same way — but which way, nobody knows, not even you. Flip it ten times.</p>}
      {round === "C" && <p>Round C. Your phone now holds <strong>its own secret coin</strong>, with a bias you cannot see. Nobody in the room has the same one. Flip it ten times.</p>}
      {round === "A" && seq.length < 10 && (
        <div style={{ margin: "10px 0" }}>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 1, color: C.gold, marginBottom: 6 }}>BEFORE YOU FLIP — what will ten flips look like?</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["mostly heads", "neat alternation", "clumpy and messy"].map((g) => (
              <button key={g} onClick={() => setGuess(g)} style={{
                fontFamily: mono, fontSize: 11, padding: "5px 10px", borderRadius: 12, cursor: "pointer",
                border: `1.5px solid ${guess === g ? C.gold : C.gridBold}`, background: guess === g ? C.goldSoft : "#fff", color: C.ink,
              }}>{g}</button>
            ))}
          </div>
        </div>
      )}
      {round === "A" && seq.length >= 10 && guess && (
        <div style={{ fontFamily: mono, fontSize: 12, color: C.inkSoft, margin: "10px 0" }}>
          you guessed <strong style={{ color: C.ink }}>{guess}</strong> — you got {seq.slice(0, 10).map((v) => (v ? "H" : "T")).join("")}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "14px 0" }}>
        <button onClick={flip} disabled={p === null} style={{
          width: 96, height: 96, borderRadius: "50%", cursor: p === null ? "default" : "pointer", fontFamily: mono, fontWeight: 700, fontSize: 18,
          color: "#fff", border: `3px solid ${C.ink}`, opacity: p === null ? 0.4 : 1,
          background: `radial-gradient(circle at 35% 30%, #FFAE5E, ${roundCol})`,
        }}>Flip</button>
        <div>
          <div style={{ fontFamily: mono, fontSize: 12, color: C.inkSoft }}>{`round ${round} · ${seq.length} flips`}</div>
          <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 600 }}>{seq.length ? `${nH} heads · ${(nH / seq.length).toFixed(2)}` : "—"}</div>
          {p === null && <div style={{ fontFamily: mono, fontSize: 11, color: C.red }}>waiting for your seat number…</div>}
          {seq.length >= 10 && <div style={{ fontFamily: mono, fontSize: 11, color: C.teal }}>ten done ✓ — look at the big screen</div>}
        </div>
      </div>
      <div style={{ minHeight: 30 }}>{seq.slice(-40).map((v, i) => <CoinChip key={i} v={v} />)}</div>
      <Notice>
        Every tap lands on the presenter's plot. Your own dot is the one with your name; the line is everybody together.
        {round === "B" && " No randomness in your coin at all — only in what you know. The room still averages ½."}
        {round === "C" && " Same forecast as rounds A and B — but is it the same belief?"}
      </Notice>
    </div>
  );
}

// helpers shared by the room steps
const sigOf = (p) => Math.sqrt(Math.max(0, p * (1 - p)));
const aggRound = (room, r) => ((room.state.agg && room.state.agg.tally && room.state.agg.tally[r]) || []);
const myAgg = (room, r) => aggRound(room, r).find((x) => room.me && x.slot === room.me.slot) || null;
const dotOf = (x, color) => ({ p: x.heads / x.n, w: sigOf(x.heads / x.n), color });
const meanDot = (arr, color) => arr.length ? { p: arr.reduce((a, d) => a + d.p, 0) / arr.length, w: arr.reduce((a, d) => a + d.w, 0) / arr.length, color } : null;

/* slider that follows the presenter's p until you touch it; "follow" snaps back */
function RoomSlider({ room, own, setOwn, label }) {
  const p = own === null ? (room.state.p ?? 0.5) : own;
  return (
    <div>
      <Slider value={p} min={0} max={1} step={0.01} onChange={setOwn} label={label || "p"} readout={p.toFixed(2)} />
      <div style={{ fontFamily: mono, fontSize: 11, color: C.inkSoft, marginTop: -8 }}>
        {own === null ? "following the presenter" : <>your own value — <button onClick={() => setOwn(null)} style={{ fontFamily: mono, fontSize: 11, border: "none", background: "none", color: C.gold, cursor: "pointer", padding: 0 }}>follow the presenter again</button></>}
      </div>
    </div>
  );
}

// ── SCENE 2 : two sources of uncertainty ──
function RoomStep2({ room }) {
  const W = 340, x0 = 30, x1 = 310, X = (f) => x0 + f * (x1 - x0);
  const COL = { A: C.teal, B: C.violet, C: C.gold };
  const NAME = { A: "A · fair coin", B: "B · mystery coin", C: "C · secret coin" };
  const Row = ({ y, r }) => {
    const all = aggRound(room, r), me = myAgg(room, r);
    const mean = all.length ? all.reduce((a, x) => a + x.heads, 0) / all.reduce((a, x) => a + x.n, 0) : null;
    return (
      <g>
        <text x={x0} y={y - 40} fontFamily={mono} fontSize="11" fill={C.ink} fontWeight="600">{NAME[r]}</text>
        <line x1={x0} y1={y} x2={x1} y2={y} stroke={C.inkSoft} strokeWidth="1.5" />
        <line x1={X(0.5)} y1={y - 30} x2={X(0.5)} y2={y + 8} stroke={C.inkSoft} strokeWidth="1" strokeDasharray="4 3" />
        {all.map((x) => <circle key={x.slot} cx={X(x.heads / x.n)} cy={y - 6} r={5} fill={COL[r]} opacity={0.25} />)}
        {me && <g><circle cx={X(me.heads / me.n)} cy={y - 6} r={7} fill={COL[r]} stroke={C.ink} strokeWidth="1.5" /><text x={X(me.heads / me.n)} y={y - 18} textAnchor="middle" fontSize="14">{room.tag}</text></g>}
        {mean !== null && <polygon points={`${X(mean)},${y + 1} ${X(mean) - 5},${y + 10} ${X(mean) + 5},${y + 10}`} fill={C.ink} />}
      </g>
    );
  };
  return (
    <div>
      <p>Three rounds, three kinds of not-knowing. Round A: the <strong>same</strong> coin for everyone; only the throws differed. Round B: coins that never vary at all — you just didn't know which side. Round C: everyone a <strong>different</strong> coin. All three rooms average about ½.</p>
      <svg viewBox={`0 0 ${W} 275`} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
        <Row y={75} r="A" />
        <Row y={160} r="B" />
        <Row y={245} r="C" />
        <text x={x0} y={270} fontFamily={mono} fontSize="10" fill={C.inkSoft}>0</text>
        <text x={X(0.5)} y={270} textAnchor="middle" fontFamily={mono} fontSize="10" fill={C.inkSoft}>½</text>
        <text x={x1} y={270} textAnchor="end" fontFamily={mono} fontSize="10" fill={C.inkSoft}>1</text>
      </svg>
      <Notice>Your dot is the marked one; the faded dots are the rest of the room. Round A huddles around ½: the coin is known, only luck differs — <em>statistical</em>. Round B sits at the two ends: no luck at all, pure ignorance — <em>systematic</em>. Round C is both. The room average cannot tell any of them apart.</Notice>
    </div>
  );
}

// ── SCENE 3 : one number is not enough → the bandwidth ──
function RoomStep3({ room }) {
  const showBand = !!room.state.showBandAxis, showPooled = !!room.state.showPooled;
  const A = aggRound(room, "A").map((x) => dotOf(x, C.teal)), B = aggRound(room, "B").map((x) => dotOf(x, C.violet)), Cc = aggRound(room, "C").map((x) => dotOf(x, C.gold));
  const mC = myAgg(room, "C");
  const scatter = [...A, ...B, ...Cc].map((d) => ({ ...d, w: showBand ? d.w : 0 }));
  const cents = showPooled && showBand ? [meanDot(A, C.teal), meanDot(B, C.violet), meanDot(Cc, C.gold)].filter(Boolean) : [];
  const mine = [mC && dotOf(mC, C.gold)].filter(Boolean);
  return (
    <div>
      <p>The room average was ½ in both rounds — one number, and it hides the difference. Add a second, honest number: the spread you <em>expect</em> from ten flips of your coin, its <strong>bandwidth</strong>.</p>
      <StatePlot showSemicircle={showBand} scatter={scatter} centroids={cents} point={mine.length ? [mine[mine.length - 1].p, showBand ? mine[mine.length - 1].w : 0] : null} />
      <div style={{ fontFamily: mono, fontSize: 11, color: C.inkSoft, marginTop: 6 }}>
        {showBand ? "second axis: bandwidth √(p(1−p))" : "waiting for the presenter to add the second axis…"}{showPooled ? " · big dots: the room pooled per round (A teal, B purple, C gold)" : ""}
      </div>
      <Notice>
        {showBand
          ? "Every coin whose p you know sits on the same arc. Round A pooled sits on the arc — at the top. Round B's coins sit in the two corners (no spread at all); pooled they land at the centre — the state of no information. Round C pooled sits inside. Pure beliefs on the rim, mixtures inside: nobody drew this shape, the second number did."
          : "On one axis, all three rounds are the same pile of dots around ½. Watch what a second number does."}
      </Notice>
    </div>
  );
}

// ── SCENE 4 : the Bernoulli circle ──
function RoomStep4({ room }) {
  const [own, setOwn] = useState(null);
  const p = own === null ? (room.state.p ?? 0.5) : own;
  const B = aggRound(room, "C").map((x) => ({ ...dotOf(x, C.gold), color: "#F3C9A0" }));
  return (
    <div>
      <p>A coin you fully know — p given — has bandwidth √(p(1−p)). Slide p and watch the dot: it never leaves the arc. That arc is the <strong>Bernoulli circle</strong>, radius ½, centred on the fair coin's foot.</p>
      <StatePlot point={[p, sigOf(p)]} scatter={B} />
      <RoomSlider room={room} own={own} setOwn={setOwn} label="p" />
      <Notice>Every coin you fully know sits on the rim. Every coin you don't sits inside. The faded gold dots are the room's round-C coins.</Notice>
      <Tech title="How far apart are two beliefs? (technical note)">
        <p>Walk along the arc from one pure belief to another. That arc length is their <em>statistical distance</em> — how well a run of throws can tell them apart. The bandwidth is essentially the only second number for which this is true (the uniqueness lemma in the paper). So the circle is not decoration: the ruler on it measures distinguishability. Playground A in the standalone tutorial lets you test it.</p>
      </Tech>
    </div>
  );
}

// ── SCENE 5 : from the state's own point of view ──
function RoomStep5({ room }) {
  const [own, setOwn] = useState(null);
  const p = own === null ? (room.state.p ?? 0.5) : own;
  const th = Math.atan2(Math.sqrt(1 - p), Math.sqrt(p)) * 180 / Math.PI;
  return (
    <div>
      <p>Two views of one arrow. On the Bernoulli circle the <strong>pointer</strong> runs from the centre — the state of no information — to your state on the rim. Stand at the state itself and the same arrow becomes the <strong>needle</strong>: always-H and always-T, opposite ends of a diameter a moment ago, are now perpendicular axes.</p>
      <StatePlot point={[p, sigOf(p)]} showChords showCenterVector />
      <NeedleView p={p} />
      <RoomSlider room={room} own={own} setOwn={setOwn} label="p" />
      <div style={{ fontFamily: mono, fontSize: 12, color: C.ink, marginTop: 6 }}>pointer angle 2θ = {(2 * th).toFixed(0)}° · needle angle θ = {th.toFixed(0)}° · needle = (√p, √(1−p)) = ({Math.sqrt(p).toFixed(2)}, {Math.sqrt(1 - p).toFixed(2)})</div>
      <Notice>The needle's two components, squared, are p and 1−p. Add the components first, square last — remember that; light will do exactly this.</Notice>
    </div>
  );
}

// ── SCENE 6 : two doubts ──
function RoomStep6({ room }) {
  return (
    <div>
      <p>Hold two doubts before we leave the coins.</p>
      <p><strong>Why two numbers?</strong> Odds and bandwidth do not capture everything you could believe about a coin — so who says the bandwidth is the right second number to keep?</p>
      <p><strong>Half a disk — half of what?</strong></p>
      <Notice>Nature is going to answer both. Next: light.</Notice>
    </div>
  );
}

// ═══════════════ PART II — LIGHT (phone side) ═══════════════
const DEG = Math.PI / 180;
const aggBeams = (room) => ((room.state.agg && room.state.agg.beam) || []);
const pQ = (q, a) => (typeof Room !== "undefined" ? Room.pOf(q, a) : null);

/* small polarizing sheet (phone size) */
function PhoneSheet({ x, y, size = 54, a, color = C.ink, label }) {
  const lines = [], r = size * 0.42;
  for (let k = -3; k <= 3; k++) { const off = k * (size / 8), hl = Math.sqrt(Math.max(0, r * r - off * off)); lines.push(<line key={k} x1={-hl} y1={off} x2={hl} y2={off} stroke={color} strokeWidth="1.5" opacity="0.7" />); }
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-size / 2} y={-size / 2} width={size} height={size} rx="6" fill="#fff" stroke={color} strokeWidth="2" />
      <g transform={`rotate(${-a})`}>{lines}</g>
      {label && <text x={0} y={size / 2 + 14} textAnchor="middle" fontFamily={mono} fontSize="10" fill={color}>{label}</text>}
    </g>
  );
}
function PhoneArrow({ x, y, a, amp = 1, color = C.gold }) {
  const L = 22 * amp, dx = Math.cos(a * DEG) * L, dy = -Math.sin(a * DEG) * L;
  return <g><circle cx={x} cy={y} r="24" fill="none" stroke={C.gridBold} strokeWidth="1" strokeDasharray="3 3" /><line x1={x - dx} y1={y - dy} x2={x + dx} y2={y + dy} stroke={color} strokeWidth="3.5" strokeLinecap="round" opacity={0.3 + 0.7 * amp} /></g>;
}

/* the phone's own beam: hidden angle from the seat, tallies per sheet angle, noise knob.
   One snapshot per change:  beam = { noise, q:{ "0":{n,passed}, "45":{…} } }                */
function useBeam(room) {
  const key = "pf-beam-" + room.session;
  const [beam, setBeam] = useState(() => { try { const v = JSON.parse(sessionStorage.getItem(key)); if (v && v.q) return v; } catch (e) {} return { noise: 0, q: {} }; });
  useEffect(() => { try { sessionStorage.setItem(key, JSON.stringify(beam)); } catch (e) {} room.send("beam", beam); }, [beam]);
  const theta = room.me ? room.me.theta : null;
  const delta = room.me ? room.me.delta : 0;
  /* results = array of 0/1 clicks already drawn with Room.photon (so the caller can also show them) */
  const addResults = (angle, results) => {
    if (theta === null || !results.length) return;
    setBeam((b) => {
      const a = String(angle), cur = b.q[a] || { n: 0, passed: 0 };
      const passed = results.reduce((x, y) => x + y, 0);
      return { ...b, q: { ...b.q, [a]: { n: cur.n + results.length, passed: cur.passed + passed } } };
    });
  };
  const setNoise = (v) => setBeam((b) => ({ noise: v, q: {} }));      // a new beam: old tallies no longer apply
  const reset = () => setBeam({ noise: 0, q: {} });
  return { beam, theta, delta, addResults, setNoise, reset };
}

function PhotonBench({ angle, tally, onOne, onMany, disabled, log }) {
  const f = tally && tally.n ? tally.passed / tally.n : null;
  return (
    <div>
      <svg viewBox="0 0 340 110" style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
        <circle cx={30} cy={50} r="13" fill="#FFF4E8" stroke={C.gold} strokeWidth="2" />
        <text x={30} y={82} textAnchor="middle" fontFamily={mono} fontSize="9" fill={C.inkSoft}>your beam</text>
        <line x1={45} y1={50} x2={250} y2={50} stroke={C.gridBold} strokeWidth="4" />
        <PhoneSheet x={150} y={50} a={angle} label={`${angle}° sheet`} />
        <rect x={255} y={35} width={40} height={30} rx="5" fill="#fff" stroke={C.ink} strokeWidth="1.5" />
        <text x={275} y={54} textAnchor="middle" fontFamily={mono} fontSize="9" fill={C.ink}>click?</text>
        {(log || []).slice(-24).map((v, i) => <circle key={i} cx={40 + i * 12.5} cy={15} r={4.5} fill={v ? C.gold : "#fff"} stroke={v ? C.ink : C.inkSoft} strokeWidth="1.2" />)}
        <text x={330} y={100} textAnchor="end" fontFamily={mono} fontSize="11" fontWeight="600" fill={C.ink}>{tally && tally.n ? `${tally.passed} of ${tally.n} passed · ${f.toFixed(2)}` : "no photons yet"}</text>
      </svg>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Btn onClick={onOne} disabled={disabled}>send 1 photon</Btn>
        <Btn onClick={onMany} disabled={disabled} kind="ghost">send 25</Btn>
      </div>
    </div>
  );
}
/* keep a short local click log for the strip (the snapshot only carries counts) */
function useClickLog() {
  const [log, setLog] = useState([]);
  return { log, push: (arr) => setLog((l) => [...l, ...arr].slice(-40)), clear: () => setLog([]) };
}

// ── SCENE 7 : two pairs of sunglasses ──
function RoomStep7({ room }) {
  const [a2, setA2] = useState(room.state.lens2 ?? 90);
  const [follow, setFollow] = useState(true);
  const a = follow ? (room.state.lens2 ?? 90) : a2;
  const T = Room.malus(0, a);
  return (
    <div>
      <p>Two polarizing sunglass lenses, one behind the other. The first only lets through the <strong>horizontal</strong> wiggle. Rotate the second: at 0° everything passes, at 90° nothing does.</p>
      <svg viewBox="0 0 340 130" style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
        <circle cx={28} cy={60} r="13" fill="#FFF4E8" stroke={C.gold} strokeWidth="2" />
        <line x1={42} y1={60} x2={290} y2={60} stroke={C.gridBold} strokeWidth="4" />
        <PhoneArrow x={70} y={60} a={45} color={C.inkSoft} />
        <PhoneSheet x={125} y={60} a={0} label="lens 1 · 0°" />
        <PhoneArrow x={175} y={60} a={0} />
        <PhoneSheet x={225} y={60} a={a} label={`lens 2 · ${a}°`} color={C.gold} />
        <PhoneArrow x={275} y={60} a={a} amp={Math.sqrt(T)} />
        <rect x={300} y={20} width={22} height={80} rx="4" fill="#fff" stroke={C.ink} strokeWidth="1.5" />
        <rect x={302} y={22 + 76 * (1 - T)} width={18} height={76 * T} fill={C.gold} rx="3" />
        <text x={311} y={118} textAnchor="middle" fontFamily={mono} fontSize="10" fontWeight="600" fill={C.ink}>{`${Math.round(T * 100)}%`}</text>
      </svg>
      <Slider value={a} min={0} max={180} step={1} onChange={(v) => { setFollow(false); setA2(v); }} label="lens 2 angle" readout={`${a}° → ${Math.round(T * 100)}%`} />
      <div style={{ fontFamily: mono, fontSize: 11, color: C.inkSoft, marginTop: -8 }}>{follow ? "following the presenter" : <button onClick={() => setFollow(true)} style={{ fontFamily: mono, fontSize: 11, border: "none", background: "none", color: C.gold, cursor: "pointer", padding: 0 }}>follow the presenter again</button>}</div>
      <Notice>After lens 1 the light is <em>always-horizontal</em>: ask it the horizontal question again and it always says yes. You just built a fully known coin out of light. Nothing passes the vertical question — that is the <em>always-T</em> of light.</Notice>
    </div>
  );
}

// ── SCENE 8 : the polarizer is the coin toss ──
function RoomStep8({ room }) {
  const B = useBeam(room);
  const L = useClickLog();
  const q = 0;
  const tally = B.beam.q["0"];
  const fire = (k) => { if (B.theta === null) return; const arr = []; for (let i = 0; i < k; i++) arr.push(Room.photon(B.theta, q, B.beam.noise, B.delta)); L.push(arr); B.addResults(q, arr); };
  return (
    <div>
      <p>Your phone now holds a <strong>beam of light</strong> with a polarization angle you cannot see — it came with your seat. Send photons one at a time through a horizontal sheet: each one either passes (a click) or is blocked. Heads or tails.</p>
      <PhotonBench angle={q} tally={tally} log={L.log} disabled={B.theta === null} onOne={() => fire(1)} onMany={() => fire(25)} />
      {B.theta === null && <div style={{ fontFamily: mono, fontSize: 11, color: C.red, marginTop: 6 }}>waiting for your seat number…</div>}
      <Notice>The fraction that passes is your beam's p for the horizontal question. Every click lands on the presenter's line; your emoji marks your beam. Nobody knows the angles yet — not even you.</Notice>
    </div>
  );
}

// ── SCENE 9 : the half circle, in glass ──
function RoomStep9({ room }) {
  const B = useBeam(room);
  const reveal = !!room.state.reveal;
  const t0 = B.beam.q["0"], p = t0 && t0.n ? t0.passed / t0.n : null;
  const others = aggBeams(room).filter((b) => pQ(b.q, 0) !== null && !(room.me && b.slot === room.me.slot)).map((b) => { const f = pQ(b.q, 0); return { p: f, w: sigOf(f) * (1 - (b.noise || 0)), color: "#F3C9A0" }; });
  const th = B.theta;
  return (
    <div>
      <p>Take your fraction p and the bandwidth √(p(1−p)) and put your beam on the coin plane. Every beam in the room lands on the same arc — the Bernoulli circle, drawn this time by glass. Malus's law says the fraction is cos²θ; the bandwidth is |cos θ sin θ|; together they trace exactly that circle.</p>
      <StatePlot point={p !== null ? [p, sigOf(p) * (1 - B.beam.noise)] : null} scatter={others} />
      {reveal && th !== null && p !== null && (
        <div>
          <p style={{ marginTop: 12 }}>Revealed: your beam wiggles at <strong>{th}°</strong>. Its direction has components (cos θ, sin θ) = ({Math.cos(th * DEG).toFixed(2)}, {Math.sin(th * DEG).toFixed(2)}). Your needle from the measurement is (√p, √(1−p)) = ({Math.sqrt(p).toFixed(2)}, {Math.sqrt(1 - p).toFixed(2)}).</p>
          <svg viewBox="0 0 340 200" style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
            <line x1={60} y1={170} x2={320} y2={170} stroke={C.gold} strokeWidth="2" /><line x1={60} y1={170} x2={60} y2={20} stroke={C.teal} strokeWidth="2" />
            <text x={318} y={186} textAnchor="end" fontFamily={mono} fontSize="10" fill={C.gold}>toward always-H</text>
            <text x={66} y={30} fontFamily={mono} fontSize="10" fill={C.teal}>toward always-V</text>
            <path d={`M 200 170 A 140 140 0 0 0 60 30`} fill="none" stroke={C.inkSoft} strokeWidth="1.2" strokeDasharray="4 3" />
            <line x1={60} y1={170} x2={60 + 140 * Math.abs(Math.cos(th * DEG))} y2={170 - 140 * Math.abs(Math.sin(th * DEG))} stroke={C.gold} strokeWidth="7" strokeLinecap="round" opacity="0.5" />
            <line x1={60} y1={170} x2={60 + 140 * Math.sqrt(p)} y2={170 - 140 * Math.sqrt(1 - p)} stroke={C.violet} strokeWidth="3" strokeLinecap="round" />
            <text x={200} y={60} fontFamily={mono} fontSize="10" fill={C.gold}>wide gold: the wave's direction</text>
            <text x={200} y={76} fontFamily={mono} fontSize="10" fill={C.violet}>thin purple: your needle</text>
          </svg>
          <Notice>The arrow we invented in scene 5 to keep the books is the direction the light actually wiggles in. Nobody put it there.</Notice>
        </div>
      )}
      {!reveal && <Notice>Waiting for the presenter to reveal the angles. Faded dots: the other beams in the room.</Notice>}
    </div>
  );
}

// ── SCENE 10 : mixed light ──
function RoomStep10({ room }) {
  const B = useBeam(room);
  const L = useClickLog();
  const t0 = B.beam.q["0"], p = t0 && t0.n ? t0.passed / t0.n : null;
  const spot = room.state.spotlight || [];
  const fire = (k) => { const arr = []; for (let i = 0; i < k; i++) arr.push(Room.photon(B.theta, 0, B.beam.noise, B.delta)); L.push(arr); B.addResults(0, arr); };
  const mine = room.me && spot.includes(room.me.slot);
  return (
    <div>
      <p>So far your beam's polarization was fixed. Now let it <strong>wander</strong>: turn up the noise and the angle jitters from photon to photon. At full noise the light is <em>unpolarized</em> — like a bulb, not a laser through a sheet.</p>
      <Slider value={B.beam.noise} min={0} max={1} step={0.05} onChange={B.setNoise} label="noise — how much the polarization wanders" readout={B.beam.noise === 0 ? "none (pure)" : B.beam.noise >= 0.95 ? "fully unpolarized" : B.beam.noise.toFixed(2)} />
      <PhotonBench angle={0} tally={t0} log={L.log} disabled={B.theta === null} onOne={() => fire(1)} onMany={() => fire(25)} />
      <StatePlot point={p !== null ? [p, sigOf(p) * (1 - B.beam.noise)] : null} />
      {mine && <div style={{ fontFamily: mono, fontSize: 12, color: C.red, marginTop: 6, fontWeight: 600 }}>the presenter is pointing at your beam</div>}
      <Notice>Changing the noise makes a new beam: your old counts are cleared. A wandering beam sinks toward the centre — unpolarized light sits at the state of no information. Notice: a pure 45° beam and an unpolarized beam both answer 50% to the horizontal question. The fair coin and the mystery coin, in glass.</Notice>
    </div>
  );
}

// ── SCENE 11 : ask a different question ──
function RoomStep11({ room }) {
  const B = useBeam(room);
  const L = useClickLog();
  const q = room.state.question ?? 0;
  const tq = B.beam.q[String(q)];
  const t0 = B.beam.q["0"], t45 = B.beam.q["45"];
  const fire = (k) => { const arr = []; for (let i = 0; i < k; i++) arr.push(Room.photon(B.theta, q, B.beam.noise, B.delta)); L.push(arr); B.addResults(q, arr); };
  const [mid, setMid] = useState(45); const [midIn, setMidIn] = useState(false);
  const T1 = midIn ? Room.malus(0, mid) : 1, T = T1 * (midIn ? Room.malus(mid, 90) : 0);
  return (
    <div>
      <p>The presenter turns the sheet. The question is now: <strong>do you pass a {q}° sheet?</strong> Send 25 photons and watch your dot jump on the big screen.</p>
      <PhotonBench angle={q} tally={tq} log={L.log} disabled={B.theta === null} onOne={() => fire(1)} onMany={() => fire(25)} />
      <div style={{ fontFamily: mono, fontSize: 12, color: C.ink, marginTop: 8 }}>
        0° sheet: {t0 && t0.n ? (t0.passed / t0.n).toFixed(2) : "—"} · 45° sheet: {t45 && t45.n ? (t45.passed / t45.n).toFixed(2) : "—"}
        {t0 && t0.n && t45 && t45.n ? <> · bandwidth from 0°: {sigOf(t0.passed / t0.n).toFixed(2)} · (45° answer − ½) = <strong>{(t45.passed / t45.n - 0.5).toFixed(2)}</strong></> : null}
      </div>
      <Notice>The 45° answer minus ½ is your bandwidth — with a sign. Nature keeps the same two numbers we chose for coins, and she signs them. Why: the sheet <em>projects</em> the needle (add the components along the sheet), and the light you see is the square. Malus's law is "first add, then square".</Notice>
      <p style={{ marginTop: 16 }}><strong>Three sheets.</strong> 0° then 90° blocks everything. Slide a middle sheet between them:</p>
      <svg viewBox="0 0 340 120" style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
        <circle cx={22} cy={55} r="11" fill="#FFF4E8" stroke={C.gold} strokeWidth="2" />
        <line x1={34} y1={55} x2={290} y2={55} stroke={C.gridBold} strokeWidth="4" />
        <PhoneSheet x={85} y={55} size={46} a={0} label="0°" />
        {midIn ? <PhoneSheet x={160} y={55} size={46} a={mid} label={`${mid}°`} color={C.gold} /> : <rect x={137} y={32} width={46} height={46} rx="5" fill="none" stroke={C.gridBold} strokeWidth="1.5" strokeDasharray="4 3" />}
        <PhoneArrow x={205} y={55} a={midIn ? mid : 0} amp={Math.sqrt(T1)} />
        <PhoneSheet x={245} y={55} size={46} a={90} label="90°" />
        <rect x={300} y={15} width={22} height={80} rx="4" fill="#fff" stroke={C.ink} strokeWidth="1.5" />
        <rect x={302} y={17 + 76 * (1 - T)} width={18} height={76 * T} fill={C.gold} rx="3" />
        <text x={311} y={112} textAnchor="middle" fontFamily={mono} fontSize="10" fontWeight="600" fill={C.ink}>{`${Math.round(T * 100)}%`}</text>
      </svg>
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
        <Btn onClick={() => setMidIn((v) => !v)} kind={midIn ? "solid" : "ghost"}>{midIn ? "take it out" : "slide it in"}</Btn>
        {midIn && <div style={{ flex: 1 }}><Slider value={mid} min={0} max={180} step={1} onChange={setMid} label="middle sheet" readout={`${mid}°`} /></div>}
      </div>
      <Notice>An extra obstacle lets light through. Each sheet projects, then the intensity squares: cos²(mid) · cos²(90° − mid). Claim № 2, caught.</Notice>
    </div>
  );
}

// ── SCENE 12 : angle doubling (technical) ──
function RoomStep12({ room }) {
  const B = useBeam(room);
  const t0 = B.beam.q["0"], t45 = B.beam.q["45"];
  const p0 = t0 && t0.n ? t0.passed / t0.n : null, p45 = t45 && t45.n ? t45.passed / t45.n : null;
  const ang = p0 !== null && p45 !== null ? Math.atan2(p45 - 0.5, p0 - 0.5) / DEG : null;
  return (
    <div>
      <p>Turn the sheet by 45° and the dot on the circle turns by 90°: the Bernoulli angle is <strong>twice</strong> the beam angle. So the 0° question and the 45° question use the same circle, turned a quarter turn.</p>
      {ang !== null && <div style={{ fontFamily: mono, fontSize: 12, color: C.ink }}>your dot: (passes 0°, passes 45° − ½) = ({p0.toFixed(2)}, {(p45 - 0.5).toFixed(2)}) → Bernoulli angle {((ang + 360) % 360).toFixed(0)}°{B.theta !== null && room.state.reveal ? ` · your beam angle ${B.theta}° · doubled: ${(2 * B.theta) % 360}°` : ""}</div>}
      <Notice>Technical aside — nothing to do here. The presenter's slide shows the doubling; your own numbers above should agree, up to the noise of 25 photons.</Notice>
    </div>
  );
}

// ── SCENE 13 : the twins split ──
function RoomStep13({ room }) {
  const B = useBeam(room);
  const full = !!room.state.fullDisk;
  const t0 = B.beam.q["0"], t45 = B.beam.q["45"];
  const p0 = t0 && t0.n ? t0.passed / t0.n : null, s45 = t45 && t45.n ? t45.passed / t45.n - 0.5 : null;
  const twinSlot = room.me ? room.me.twin : null;
  const twin = twinSlot ? aggBeams(room).find((b) => b.slot === twinSlot) : null;
  const tp0 = twin ? pQ(twin.q, 0) : null, ts45 = twin && pQ(twin.q, 45) !== null ? pQ(twin.q, 45) - 0.5 : null;
  const pair = room.state.pair || [];
  const mine = room.me && pair.includes(room.me.slot);
  const seg = p0 !== null && tp0 !== null ? [[p0, full && s45 !== null ? s45 : sigOf(p0)], [tp0, full && ts45 !== null ? ts45 : sigOf(tp0)]] : null;
  return (
    <div>
      <p>Two beams that answer the horizontal question identically can still differ: a 30° beam and a 150° beam are mirror images. The 0° sheet cannot tell them apart. The 45° sheet can — one says 93%, the other 7%.</p>
      <StatePlot showLower showSemicircle showFullCircle={full} point={p0 !== null ? [p0, full && s45 !== null ? s45 : sigOf(p0)] : null} scatter={tp0 !== null ? [{ p: tp0, w: full && ts45 !== null ? ts45 : sigOf(tp0), color: C.teal }] : []} segment={seg} />
      <div style={{ fontFamily: mono, fontSize: 12, color: C.ink, marginTop: 6 }}>
        {twin ? <>your twin is {twin.tag}{full ? " — with the 45° question you split across the diameter" : " — with the 0° question you are one dot"}</> : "you have no assigned twin in this room"}
        {mine && <span style={{ color: C.red, fontWeight: 600 }}> · the presenter is pointing at your pair</span>}
      </div>
      <Notice>Half a disk was half the questions. A coin can only be asked one thing; light can be asked at every angle, and the answers fill the whole disk. The needle's quarter circle becomes a half circle: the twin's needle points below the axis — negative bandwidth.</Notice>
    </div>
  );
}

// ═══════════════ PART III–IV (phone side) ═══════════════
function useTicker(running) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!running) return;
    let id, t0 = performance.now();
    const tick = (now) => { setT((now - t0) / 1000); id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [running]);
  return t;
}
const stokesMine = (B) => (typeof Room !== "undefined" ? Room.stokesOf(B.beam.q) : { s1: null, s2: null, s3: null });

function PhoneBall({ view, dots, demo }) {
  const cx = 170, cy = 130, R = 105;
  const P = (sv) => { const q = Room.project(sv, view); return { x: cx + q.x * 2 * R, y: cy - q.y * 2 * R, depth: q.depth }; };
  const ring = (fn) => Array.from({ length: 49 }, (_, i) => { const q = P(fn((i / 48) * 2 * Math.PI)); return `${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join(" ");
  const ax = (sv, label, col) => { const q = P(sv); return <g key={label}><line x1={cx} y1={cy} x2={q.x} y2={q.y} stroke={col} strokeWidth="1.5" opacity={q.depth < 0 ? 0.3 : 0.9} /><text x={q.x + (q.x - cx) * 0.14} y={q.y + (q.y - cy) * 0.14 + 4} textAnchor="middle" fontFamily={mono} fontSize="9" fill={col} fontWeight="600">{label}</text></g>; };
  return (
    <svg viewBox="0 0 340 260" style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
      <circle cx={cx} cy={cy} r={R} fill="#fff" stroke={C.ink} strokeWidth="1.5" />
      <polyline points={ring((a) => ({ s1: 0.5 * Math.cos(a), s2: 0.5 * Math.sin(a), s3: 0 }))} fill="none" stroke={C.inkSoft} strokeWidth="1" strokeDasharray="4 3" />
      {[ax({ s1: 0.6, s2: 0, s3: 0 }, "H", C.gold), ax({ s1: -0.6, s2: 0, s3: 0 }, "V", C.gold), ax({ s1: 0, s2: 0.6, s3: 0 }, "45°", C.teal), ax({ s1: 0, s2: 0, s3: 0.6 }, "circ", C.violet)]}
      {(dots || []).map((d, i) => { const q = P(d.sv); return <g key={i} opacity={q.depth < 0 ? 0.35 : 1}><circle cx={q.x} cy={q.y} r={d.mine ? 7 : 4} fill={d.color} stroke={d.mine ? C.ink : "none"} strokeWidth="1.5" />{d.mine && <text x={q.x} y={q.y - 10} textAnchor="middle" fontSize="12">{d.tag}</text>}</g>; })}
      {demo && (() => { const q = P(demo); return <g><line x1={cx} y1={cy} x2={q.x} y2={q.y} stroke={C.violet} strokeWidth="2.5" /><circle cx={q.x} cy={q.y} r="6" fill={C.violet} stroke={C.ink} strokeWidth="1.5" /></g>; })()}
    </svg>
  );
}

// ── SCENE 14 : the shadow ──
function RoomStep14({ room }) {
  const [run, setRun] = useState(true);
  const unlocked = !!room.state.unlockDelay;
  const [own, setOwn] = useState(null);
  const off = own === null ? (room.state.clockOffset ?? 0) : own;
  const t = useTicker(run);
  const ph = 2 * Math.PI * 0.4 * t, th = 35 * DEG;
  const hx = Math.cos(th) * Math.cos(ph), vy = Math.sin(th) * Math.cos(ph - off * DEG);
  const Clock = ({ x, y, a, col }) => <g><circle cx={x} cy={y} r="13" fill="#fff" stroke={col} strokeWidth="1.5" /><line x1={x} y1={y} x2={x + 10 * Math.cos(a)} y2={y - 10 * Math.sin(a)} stroke={col} strokeWidth="2" strokeLinecap="round" /></g>;
  return (
    <div>
      <p>Watch a linear beam's field tip: it bounces back and forth along a line. A point bouncing on a line is exactly what the <em>shadow</em> of a point going round a circle looks like. So — is the bounce the shadow of something with one more knob?</p>
      <svg viewBox="0 0 340 230" style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
        <circle cx={80} cy={110} r="60" fill="none" stroke={C.ink} strokeWidth="1.2" />
        <line x1={80 - 60 * Math.cos(th)} y1={110 + 60 * Math.sin(th)} x2={80 + 60 * Math.cos(th)} y2={110 - 60 * Math.sin(th)} stroke={C.inkSoft} strokeWidth="1.2" />
        <circle cx={80 + 60 * (Math.cos(ph) * Math.cos(th) - Math.sin(ph) * Math.sin(th))} cy={110 - 60 * (Math.cos(ph) * Math.sin(th) + Math.sin(ph) * Math.cos(th))} r="5" fill={C.violet} />
        <circle cx={80 + 60 * Math.cos(ph) * Math.cos(th)} cy={110 - 60 * Math.cos(ph) * Math.sin(th)} r="5" fill={C.gold} stroke={C.ink} strokeWidth="1" />
        <text x={80} y={200} textAnchor="middle" fontFamily={mono} fontSize="9" fill={C.inkSoft}>round trip, and its shadow</text>
        <line x1={190} y1={170} x2={320} y2={170} stroke={C.gold} strokeWidth="2" /><line x1={190} y1={170} x2={190} y2={40} stroke={C.teal} strokeWidth="2" />
        <text x={318} y={184} textAnchor="end" fontFamily={mono} fontSize="9" fill={C.gold}>H-part</text><text x={196} y={44} fontFamily={mono} fontSize="9" fill={C.teal}>V-part</text>
        <line x1={190} y1={170} x2={190 + 120 * hx} y2={170 - 120 * vy} stroke={C.violet} strokeWidth="3" strokeLinecap="round" />
        <circle cx={190 + 120 * hx} cy={170 - 120 * vy} r="5" fill={C.violet} />
        <Clock x={325} y={150} a={ph} col={C.gold} /><Clock x={210} y={25} a={ph - off * DEG} col={C.teal} />
        <text x={255} y={210} textAnchor="middle" fontFamily={mono} fontSize="9" fill={C.inkSoft}>{off === 0 ? "clocks in step → a line" : `V lags ${off}° → a loop`}</text>
      </svg>
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
        <Btn kind="ghost" onClick={() => setRun((v) => !v)}>{run ? "pause" : "play"}</Btn>
        <div style={{ flex: 1, opacity: unlocked ? 1 : 0.4 }}><Slider value={off} min={0} max={180} step={5} onChange={unlocked ? setOwn : () => {}} label={unlocked ? "offset the clocks" : "offset the clocks — locked"} readout={`${off}°`} /></div>
      </div>
      <Notice>The needle's two parts each carry a little clock, and so far the two clocks tick in step. The only knob we have not turned is the offset between them. That knob is a <em>delay</em> of one part behind the other — and it is the next scene. (This is a hint, not a proof.)</Notice>
    </div>
  );
}

// ── SCENE 15 : the impostor ──
function RoomStep15({ room }) {
  const B = useBeam(room);
  const L = useClickLog();
  const [q, setQ] = useState(0);
  const lift = !!room.state.lift;
  const st = stokesMine(B);
  const fire = (k) => { const arr = []; for (let i = 0; i < k; i++) arr.push(Room.photon(B.theta, q, B.beam.noise, B.delta)); L.push(arr); B.addResults(q, arr); };
  const r = st.s1 !== null && st.s2 !== null ? Math.hypot(st.s1, st.s2) : null;
  const pure = B.beam.noise < 0.05;
  const cx = 110, cy = 110, R = 80;
  return (
    <div>
      <p>Three questions for your beam: the 0° sheet, the 45° sheet, and a new one — a <strong>delay</strong> (the V-part lags the H-part by a quarter turn) followed by a sheet. Ask each one 25 photons.</p>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        {[0, 45, "C"].map((a) => <button key={a} onClick={() => { setQ(a); L.clear(); }} style={{ fontFamily: mono, fontSize: 11, padding: "5px 10px", borderRadius: 12, cursor: "pointer", border: `1.5px solid ${q === a ? C.gold : C.gridBold}`, background: q === a ? C.goldSoft : "#fff", color: C.ink }}>{a === "C" ? "delay + sheet" : `${a}° sheet`}</button>)}
      </div>
      <PhotonBench angle={q === "C" ? 0 : q} tally={B.beam.q[String(q)]} log={L.log} disabled={B.theta === null} onOne={() => fire(1)} onMany={() => fire(25)} />
      <div style={{ fontFamily: mono, fontSize: 12, color: C.ink, margin: "8px 0" }}>
        0°: {st.s1 === null ? "—" : (st.s1 + 0.5).toFixed(2)} · 45°: {st.s2 === null ? "—" : (st.s2 + 0.5).toFixed(2)} · delay: {st.s3 === null ? "—" : (st.s3 + 0.5).toFixed(2)}
      </div>
      <svg viewBox="0 0 340 230" style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.ink} strokeWidth="1.5" /><line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke={C.inkSoft} strokeWidth="1" /><line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke={C.inkSoft} strokeWidth="1" />
        <text x={cx} y={215} textAnchor="middle" fontFamily={mono} fontSize="9" fill={C.inkSoft}>the disk: 0° across, 45° up</text>
        {r !== null && <g><circle cx={cx + st.s1 * 2 * R} cy={cy - st.s2 * 2 * R} r="7" fill={pure ? C.gold : C.inkSoft} stroke={C.ink} strokeWidth="1.5" />{pure && r < 0.42 && <circle cx={cx + st.s1 * 2 * R} cy={cy - st.s2 * 2 * R} r="14" fill="none" stroke={C.red} strokeWidth="2" />}</g>}
        <circle cx={240} cy={cy} r={R} fill="none" stroke={C.ink} strokeWidth="1.5" opacity={lift ? 1 : 0.2} /><line x1={240 - R} y1={cy} x2={240 + R} y2={cy} stroke={C.inkSoft} strokeWidth="1" opacity={lift ? 1 : 0.2} /><line x1={240} y1={cy - R} x2={240} y2={cy + R} stroke={C.inkSoft} strokeWidth="1" opacity={lift ? 1 : 0.2} />
        <text x={240} y={215} textAnchor="middle" fontFamily={mono} fontSize="9" fill={C.inkSoft}>{lift ? "side view: 45° across, delay up" : "side view (presenter lifts)"}</text>
        {lift && st.s2 !== null && st.s3 !== null && <circle cx={240 + st.s2 * 2 * R} cy={cy - st.s3 * 2 * R} r="7" fill={pure ? C.gold : C.inkSoft} stroke={C.ink} strokeWidth="1.5" />}
      </svg>
      <Notice>{pure && r !== null && r < 0.42
        ? "Your beam has no noise at all — it is pure — and yet it sits inside the disk, where only mixtures were allowed. Every sheet you can turn says the same thing. Two different things at one point: the disk is too small."
        : "A beam that answers 50% to every sheet angle looks unpolarized — the centre of the disk. If it is pure, the delay question says 100% where unpolarized light says 50%. The disk is too small."}
      </Notice>
    </div>
  );
}

// ── SCENE 16 : the ball ──
function RoomStep16({ room }) {
  const B = useBeam(room);
  const view = room.state.view || { az: -35, el: 22 };
  const [th, setTh] = useState(null); const [de, setDe] = useState(null);
  const T = th === null ? (room.state.theta ?? 45) : th, D = de === null ? (room.state.delta ?? 0) : de;
  const st = stokesMine(B);
  const mine = st.s1 !== null && st.s2 !== null ? [{ sv: { s1: st.s1, s2: st.s2, s3: st.s3 === null ? 0 : st.s3 }, color: C.gold, mine: true, tag: room.tag }] : [];
  const others = aggBeams(room).filter((b) => !(room.me && b.slot === room.me.slot)).map((b) => { const o = Room.stokesOf(b.q); return o.s1 === null || o.s2 === null ? null : { sv: { s1: o.s1, s2: o.s2, s3: o.s3 === null ? 0 : o.s3 }, color: "#F3C9A0" }; }).filter(Boolean);
  const demo = Room.stokes(T, D);
  return (
    <div>
      <p>Three questions, three numbers, one ball. The delay dial sweeps the disk out of its plane; every pure beam sits on the surface, every mixture inside. Nothing is left to ask.</p>
      <PhoneBall view={view} dots={[...others, ...mine]} demo={demo} />
      <Slider value={T} min={0} max={180} step={1} onChange={setTh} label="demo beam θ" readout={`${T}°`} />
      <Slider value={D} min={0} max={360} step={5} onChange={setDe} label="demo beam delay" readout={`${D}°`} />
      <div style={{ fontFamily: mono, fontSize: 11, color: C.inkSoft }}>{th === null && de === null ? "demo beam follows the presenter" : <button onClick={() => { setTh(null); setDe(null); }} style={{ fontFamily: mono, fontSize: 11, border: "none", background: "none", color: C.gold, cursor: "pointer", padding: 0 }}>follow the presenter again</button>}</div>
      <Notice>Your beam is the gold dot with your name (height from the delay question; 0 if you did not ask it). This is the Bernoulli ball — the Poincaré sphere of optics, the Bloch ball of a qubit. Same ball.</Notice>
    </div>
  );
}

// ── SCENE 17 : one photon at a time — Mach–Zehnder ──
function RoomStep17({ room }) {
  const key = "pf-photon-" + room.session;
  const [mine, setMine] = useState(() => { try { return JSON.parse(sessionStorage.getItem(key)) || {}; } catch (e) { return {}; } });
  useEffect(() => { try { sessionStorage.setItem(key, JSON.stringify(mine)); } catch (e) {} room.send("photon", mine); }, [mine]);
  const rid = room.state.mzRound ?? 0, armed = !!room.state.armed, phi = room.state.mzPhi ?? 0, src = room.state.mzSource || "amplitudes";
  const done = !!mine[rid];
  const press = () => { if (!armed || done) return; const d1 = Math.random() < Room.mzP1(phi, src); setMine((m) => ({ ...m, [rid]: { phi, source: src, detector: d1 ? 1 : 2, at: Date.now() } })); };
  const rounds = (room.state.agg && room.state.agg.rounds) || [];
  return (
    <div>
      <p>You are one photon. The presenter sets the path-length dial φ and arms a round; press once, and your photon flies through the interferometer and clicks at detector 1 or 2. Over a few rounds the room's clicks draw the fringe.</p>
      <div style={{ fontFamily: mono, fontSize: 12, color: C.ink, marginBottom: 8 }}>round {rid} · φ = {phi}° · source: {src === "mixture" ? "mystery mixture (one route, unknown which)" : "both routes"}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={press} disabled={!armed || done} style={{ width: 110, height: 110, borderRadius: "50%", cursor: armed && !done ? "pointer" : "default", fontFamily: mono, fontWeight: 700, fontSize: 15, color: "#fff", border: `3px solid ${C.ink}`, opacity: armed && !done ? 1 : 0.4, background: `radial-gradient(circle at 35% 30%, #FFAE5E, ${C.gold})` }}>{done ? "flown" : armed ? "be measured" : "wait…"}</button>
        <div style={{ fontFamily: mono, fontSize: 13 }}>
          {done ? <>your click: <strong>detector {mine[rid].detector}</strong></> : armed ? "press once" : "waiting for the presenter to arm a round"}
          {rounds.length > 0 && <div style={{ marginTop: 8, fontSize: 11, color: C.inkSoft }}>{rounds.map((r) => `#${r.round} φ=${r.phi}° ${r.source === "mixture" ? "mix" : ""}: ${r.d1}/${r.n} → D1`).join(" · ")}</div>}
        </div>
      </div>
      <Notice>One photon, one indivisible click — and still, round by round, the fringe cos²(φ/2) appears, and disappears for the mixture. Each photon carries the whole ball: its needle, its two clocks. So did each coin. You have just run the smallest quantum computation there is.</Notice>
    </div>
  );
}

// ── SCENE 18 : the dictionary and the receipt ──
function RoomStep18({ room }) {
  const rows = [["a coin, one question", "half a disk"], ["light, every sheet angle", "the disk"], ["light, plus a delay", "the ball"], ["ℝ → ℂ", "rebit → qubit"]];
  return (
    <div>
      <p>You have built a qubit. Not postulated — built, from bookkeeping and sunglasses.</p>
      <div style={{ fontFamily: mono, fontSize: 12 }}>{rows.map((r, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.gridBold}` }}><span>{r[0]}</span><strong style={{ color: C.gold }}>{r[1]}</strong></div>)}</div>
      <p style={{ marginTop: 12 }}>Bernoulli ball = Poincaré ball = Bloch ball.</p>
      <Notice>The four claims, redeemed: nature's rule is probabilistic · little quantities add, then square · a qubit lives anywhere on the surface · parallelism plus interference. Nothing today was taken on faith.</Notice>
    </div>
  );
}

// ── SCENE 19 : the room decoheres ──
function RoomStep19({ room }) {
  const key = "pf-noise-" + room.session;
  const [noise, setNoise] = useState(() => { try { return JSON.parse(sessionStorage.getItem(key)) || {}; } catch (e) { return {}; } });
  const lastReset = useRef(room.state.noiseReset || 0);
  useEffect(() => { try { sessionStorage.setItem(key, JSON.stringify(noise)); } catch (e) {} room.send("noise", noise); }, [noise]);
  useEffect(() => { const r = room.state.noiseReset || 0; if (r !== lastReset.current) { lastReset.current = r; setNoise({}); } }, [room.state.noiseReset]);
  const view = room.state.view || { az: -35, el: 22 };
  const th = room.state.theta ?? 45, de = room.state.delta ?? 0;
  const pure = Room.stokes(th, de);
  const minePt = typeof noise.delta === "number" ? Room.stokes(th, de + noise.delta) : null;
  return (
    <div>
      <p>The presenter holds one pure beam. Each phone now bumps its delay by a random amount — the kind of thing a noisy room does to a qubit. Watch the room's average pointer shrink.</p>
      <PhoneBall view={view} dots={minePt ? [{ sv: minePt, color: C.gold, mine: true, tag: room.tag }] : []} demo={pure} />
      <div style={{ marginTop: 8 }}><Btn onClick={() => setNoise({ delta: Math.round(Math.random() * 360) })}>{typeof noise.delta === "number" ? `my noise: ${noise.delta}° — roll again` : "add my noise"}</Btn></div>
      <Notice>Every phone's copy is still pure — on the surface. The average of the room is not. That is what happens to a qubit in a noisy room. Thank you for being the noise.</Notice>
    </div>
  );
}

const ROOM_STEPS = { 1: RoomStep1, 2: RoomStep2, 3: RoomStep3, 4: RoomStep4, 5: RoomStep5, 6: RoomStep6,
  7: RoomStep7, 8: RoomStep8, 9: RoomStep9, 10: RoomStep10, 11: RoomStep11, 12: RoomStep12, 13: RoomStep13,
  14: RoomStep14, 15: RoomStep15, 16: RoomStep16, 17: RoomStep17, 18: RoomStep18, 19: RoomStep19 };

function RoomApp() {
  const room = useParticipantSafe();
  const session = roomSession();
  const scene = room ? (room.state.scene || 0) : 0;
  const RoomComp = ROOM_STEPS[scene];
  const fallback = STEPS[SCENE_TO_STEP[scene] ?? 1];
  const Fallback = fallback.comp;
  return (
    <div style={{ minHeight: "100vh", background: C.paper, color: C.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        p { line-height: 1.6; font-size: 15px; }
      `}</style>
      <div style={{ maxWidth: 660, margin: "0 auto", padding: "22px 18px 60px", fontFamily: serif }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, #FFAE5E, ${C.gold})`,
              border: `2px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: mono, fontWeight: 600, color: "#fff", fontSize: 20,
            }}>{room && room.tag ? room.tag : "H"}</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}>Build your own qubit</div>
              <div style={{ fontFamily: mono, fontSize: 11, color: C.inkSoft }}>
                session {session}{room && room.me ? ` · seat #${room.me.slot}` : ""}
              </div>
            </div>
          </div>
          {room && <RoomStatus status={room.status} />}
        </header>

        {!room ? (
          <Notice>Room mode needs the room scripts (../room/relay-transport.js and room.js). Open the tutorial without ?session= to run it standalone.</Notice>
        ) : !room.joined ? (
          <RoomJoin room={room} />
        ) : (
          <>
            <h2 style={{ fontSize: 21, fontWeight: 600, margin: "0 0 10px" }}>
              <span style={{ fontFamily: mono, fontSize: 13, color: C.gold, marginRight: 8 }}>{`SCENE ${scene}`}</span>
              {SCENE_TITLES[scene] || fallback.title}
            </h2>
            {RoomComp ? <RoomComp room={room} /> : (
              <>
                <div style={{ fontFamily: mono, fontSize: 11, color: C.inkSoft, marginBottom: 10 }}>
                  following the presenter · the room version of this scene is not built yet — here is the matching tutorial step
                </div>
                <Fallback />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  return roomSession() ? <RoomApp /> : <BuildYourOwnQubit />;
}
export default App;

function BuildYourOwnQubit() {
  const [step, setStep] = useState(0);
  const [extra, setExtra] = useState(null); // null = main; 'room' = evidence room; 0..3 = playgrounds
  const inRoom = extra === "room";
  const inPlayground = typeof extra === "number";
  const inExtra = inRoom || inPlayground;
  const cur = inRoom ? ROOM : inPlayground ? EXTRAS[extra] : STEPS[step];
  const Comp = cur.comp;
  return (
    <div style={{ minHeight: "100vh", background: C.paper, color: C.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        p { line-height: 1.6; font-size: 15px; }
      `}</style>
      <div style={{ maxWidth: 660, margin: "0 auto", padding: "28px 18px 60px", fontFamily: serif }}>
        {/* header */}
        <header style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{
            width: 46, height: 46, borderRadius: "50%", margin: "0 auto 10px",
            background: `radial-gradient(circle at 35% 30%, #FFAE5E, ${C.gold})`,
            border: `2px solid ${C.ink}`, display: "flex", alignItems: "center",
            justifyContent: "center", fontFamily: mono, fontWeight: 600, color: "#fff",
          }}>H</div>
          <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0, letterSpacing: -0.5 }}>
            Build your own qubit
          </h1>
          <div style={{ fontFamily: mono, fontSize: 12, color: C.inkSoft, marginTop: 4 }}>
            an introduction, fifteen steps, and an epilogue — from a coin flip, via light, to a qubit
          </div>
        </header>

        {/* stepper */}
        <nav style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {STEPS.map((sInfo, i) =>
            sInfo.shape ? (
              <BraKetBtn
                key={i}
                shape={sInfo.shape}
                label={sInfo.tag}
                active={!inExtra && i === step}
                visited={inExtra ? true : i < step}
                onClick={() => { setExtra(null); setStep(i); }}
                title={sInfo.title}
              />
            ) : (
              <button
                key={i}
                onClick={() => { setExtra(null); setStep(i); }}
                title={sInfo.title}
                style={{
                  width: 30, height: 30, borderRadius: "50%", cursor: "pointer",
                  fontFamily: mono, fontSize: 12, fontWeight: 600, padding: 0,
                  border: `1.5px solid ${!inExtra && i === step ? C.gold : C.gridBold}`,
                  background: !inExtra && i === step ? C.gold : (inExtra || i < step) ? C.goldSoft : "#fff",
                  color: !inExtra && i === step ? "#fff" : C.ink,
                }}
              >
                {sInfo.tag}
              </button>
            )
          )}
        </nav>

        {inExtra && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, fontFamily: mono, fontSize: 11, letterSpacing: 1, color: C.inkSoft }}>
            <button
              onClick={() => setExtra(inRoom ? null : "room")}
              style={{ fontFamily: mono, fontSize: 11, padding: "4px 10px", borderRadius: 12, border: `1.5px solid ${C.gridBold}`, background: "#fff", color: C.ink, cursor: "pointer" }}
            >
              ⟨ {inRoom ? "back to the epilogue" : "evidence room"}
            </button>
            {inPlayground && "ADDITIONAL MATERIAL — THE EVIDENCE ROOM"}
          </div>
        )}

        <h2 style={{ fontSize: 21, fontWeight: 600, margin: "0 0 10px" }}>
          <span style={{ fontFamily: mono, fontSize: 13, color: C.gold, marginRight: 8 }}>
            {cur.label}
          </span>
          {cur.title}
        </h2>

        <Comp key={inExtra ? `x${extra}` : step} openExtra={(i) => setExtra(i)} />

        {/* nav */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
          {inRoom ? (
            <>
              <Btn kind="outline" onClick={() => setExtra(null)}>← epilogue</Btn>
              <Btn onClick={() => setExtra(0)}>next →</Btn>
            </>
          ) : inPlayground ? (
            <>
              <Btn kind="outline" onClick={() => (extra === 0 ? setExtra("room") : setExtra(extra - 1))}>
                ← back
              </Btn>
              <Btn onClick={() => setExtra(extra + 1)} disabled={extra === EXTRAS.length - 1}>
                next →
              </Btn>
            </>
          ) : (
            <>
              <Btn kind="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                ← back
              </Btn>
              <Btn onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={step === STEPS.length - 1}>
                next →
              </Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
