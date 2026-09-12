# From Coins to a Qubit — Storyboard (presentation + tutorial)

Working document, v0.4. Three sections: (A) review of the storyline, (B) the aha-moments, (C) the scene-by-scene storyboard with participation and reuse notes. Section (D) records the decisions taken so far.

v0.4 (11 Sep): scene 1 has three rounds — fair coin, mystery coin (deterministic, face unknown), your own secret coin — which return in scenes 2 and 3, where the mystery coins sit in the corners and pool to the centre.
v0.3 (10 Sep, after reading the v2 deck): adds the four-claims contract as an opening block and a badge thread; the finale is the Mach–Zehnder with crowd photons; the dictionary-and-receipt slide moves after it (S17 ↔ S18 swapped). Scenes otherwise unchanged.

Decisions baked into this version: audience 15–20 people; participation is on phones/laptops only (no physical props for now); the "compass needle" is the pointer from the centre of the Bernoulli circle to the state, seen from the state's own frame — and it turns out to be the wave's own polarization arrow; the uniqueness lemma appears as a technical note on distance between beliefs.

---

## A. Review of the storyline

Overall verdict: the spine is right and the physics is correct. The four-part arc (coins → linear light → orientation → circular light) works, and every mathematical claim checks out (σ = √(p(1−p)) traces the semicircle, Malus gives cos²θ, the 45° polarizer gives (1+sin 2θ)/2 = ½ + signed bandwidth, twins mirror across the H–T diameter, circular polarization is the R→C step). The gaps are in *what is made explicit*, not in what is true.

### A1. Missing steps (in narrative order)

1. **"Opposite becomes perpendicular" is never said.** Part I moves from the Bernoulli circle to the "state's own point of view" (quarter circle, needle), but the single sentence that makes this step meaningful is absent: on the Bernoulli circle always-H and always-T are *opposite* ends of a diameter; from the state's own point of view they become *perpendicular* axes. That is the bridge to light, where H and V polarization are literally perpendicular. You asked for exactly this in an earlier session; it should be a named beat.

2. **"Why exactly two numbers?" is never asked out loud.** A sharp reader will object in Part I: why stop the bookkeeping at (odds, bandwidth)? Part II answers this beautifully (Nature computes the bandwidth herself), but the payoff only lands if the question was planted. Plant it at the end of Part I, pay it off in scene 11.

3. **The polarizer as coin toss.** Part II never states what plays the role of the *flip*. It should: one photon meeting a polarizer either passes or is blocked — that is the H/T flip; the transmitted fraction is p. Without this, "the half circle again" is a coincidence rather than a correspondence.

4. **The opening paradox is never re-enacted in light — but it can be, exactly.** A 45°-polarized beam and an unpolarized beam both give 50% to the H-question. That is the fair coin versus the mystery coin, in glass. And then the 45° polarizer *separates* them (100% versus 50%). This is the strongest single aha in the whole story and it is currently implicit.

5. **Why does the 45° question give the bandwidth?** Currently stated as a fact ("it turns out"). It has a one-line reason that reuses Part I's slogan: the polarizer *projects the needle* (add amplitudes), then intensity is the square. Malus's law *is* "first add, then square." The three-polarizer demo (0°, 45°, 90° lets light through where 0°, 90° blocks it) is the physical proof and belongs here.

6. **Why coins give a half disk but light a full disk.** The current text says "including orientation", but the deeper reason is: *the state space is as large as the set of questions you can ask.* A coin admits one question (H or T?). Light admits a polarizer at every angle. Then Part III becomes inevitable: even *all* linear angles cannot see the third dimension, so a new kind of question (a delay) is needed. This turns Parts II–III into one repeated move: new question → bigger state space.

7. **The circular-polarization experiment lacks its punchline.** The point is not that circular light exists, but that it is an *impostor*: every linear polarizer transmits 50%, so it sits at the *centre* of the disk, indistinguishable from unpolarized light — yet it is pure (a quarter-wave plate turns it into 100% linear). Two different things at one point means the disk is too small. That is the crisis that forces the third dimension.

8. **The word "qubit" and the single-particle close.** The conclusion says "rebits to qubits" but never lands "this ball *is* a qubit" for a non-technical reader, and it drops the ending you wanted earlier: the whole ball is carried by *each single photon*, and equally by each single coin — it was about probability all along.

### A2. Corrections and cautions

- **"mono-chromatic versus …??"** — the contrast you need is *fully polarized versus partially polarized/unpolarized*, not monochromatic versus polychromatic. A laser beam can be unpolarized (polarization wanders in time); a rainbow can be fully polarized. Mixedness is about the polarization *fluctuating* (or being a mixture of beams), exactly like the mystery coin's p being unknown.
- **The "point moving along a diameter" argument (Part III, first indication).** Be careful: the oscillating field tip lives in *real space* (the plane the wave wiggles in); the Bloch/Bernoulli circle lives in *state space*. A linearly polarized wave is one stationary point in state space; the oscillation is the physically meaningless overall phase. So "pure states should not be inside the circle" is not a valid argument as stated. What *is* valid, and lovely, is the shadow heuristic: a point bouncing along a diameter looks exactly like the *shadow* of a point going round a circle. Maybe the bounce is a shadow of something with one more knob? That knob is the *delay* between the H- and V-components, and circular polarization is what you get when the delay is a quarter cycle. Present it as a foreshadowing, not a proof.
- **The compass needle (resolved).** One arrow, two frames. In the Bernoulli frame it is the *pointer*: anchored at the centre (the state of no information), tip on the rim at angle 2θ. In the state's own frame the same arrow is the *needle*: components (√p, √(1−p)) on perpendicular axes always-H / always-T, at angle θ — this is the square-root embedding, but the audience never needs that phrase. Naming rule for the talk: "pointer" when the plot is the Bernoulli circle, "needle" when the plot is the state's own frame, and say once that they are the same arrow with the angle halved. The needle is Brian Cox's little arrow, and in Part II it turns out to be the wave's own polarization arrow (a, b) — that payoff is now aha 4b, scene 9. In Part III each component of the needle gets its own clock, and the only new knob is the offset between the two clocks.
- **"Combination of both numbers doesn't identify uniquely" (resolved).** Meaning: two numbers do not pin down everything one could believe about p. Correct, and deliberately left as a doubt in scene 6; Nature resolves it in scene 11.
- Clockwise versus counter-clockwise for the 45° rotation depends on your axis conventions; fix one in the plots and don't mention the direction in words.

---

## B. The aha-moments

In story order. Each one is a beat the reader should be *made to stop* at: slow down, blank slide, one sentence, then the plot.

| # | Aha | The sentence |
|---|-----|--------------|
| 0 | Same prediction, different knowledge | "Both coins say 50%. They are not the same." |
| 1 | The half disk appears by itself | "Pure beliefs on the rim, mixtures inside — we didn't design this, the second number did it." |
| 2 | Opposite becomes perpendicular | "Seen from the state itself, always-H and always-T are not opposites; they are at right angles. First add, then square." |
| 3 | Light has an H and a T | "After the first glass the light is *always-H*." |
| 4 | Nature draws our circle | "Malus's law and the Bernoulli circle are the same drawing." |
| 4b | The needle is the wave | "The arrow we invented to keep the books is the direction the light actually wiggles in. Nobody put it there." |
| 5 | The paradox returns in glass | "45°-light and unpolarized light both say 50% to the H-question: the fair coin and the mystery coin, again." |
| 6 | Nature computes the second number | "Turn the glass to 45°. The answer *is* our bandwidth — with a sign. We were keeping the right books." |
| 7 | The twins split | "Two beams that were one dot are now mirror images. Half a disk was only half the questions." |
| 8 | The impostor at the centre | "Every linear glass says 50%. It looks unpolarized. It isn't. The disk is too small." |
| 9 | The ball closes | "One more question — a delay — and there is nothing left to ask." |
| 10 | Every particle carries the ball | "One photon, one click — and still the fringe. Each single photon, each single coin, carries the whole ball." |

**The four-claims thread.** The v2 deck opens with two films (Cox's sixty seconds; MIT's Oliver and Grover) and extracts four claims the audience is asked to take on faith: № 1 nature's basic rule is probabilistic; № 2 beneath the odds sit little quantities, added first and squared last; № 3 bits are poles, qubits live anywhere on the surface; № 4 quantum power is parallelism plus interference. Each claim carries a gold badge that goes *sighted → caught → redeemed* as the scenes build it. This is not a fifth part; it is a thread through the aha list:

| Claim | sighted | caught | redeemed |
|---|---|---|---|
| № 1 probabilistic rule | S1 (a bet, not a fact) | S8 (a photon is a coin toss) | S17 (one photon, still cos²) |
| № 2 add, then square | S5 (the needle) | S11 (Malus = add then square; three lenses) | S17 (contributions cancel at φ = 0) |
| № 3 anywhere on the surface | S4 (the circle) | S13 (the disk) | S16 (the ball) |
| № 4 parallelism + interference | S11 (light back through an obstacle) | S14–15 (the delay is a dial) | S17 (the smallest quantum computation) |

The receipt — all four badges redeemed — is read out on S18.

Three of these (5, 6, 8) are *crises* — the current picture fails. Put them on their own slide with nothing else; the resolution comes on the next slide. That rhythm (build → audit → crisis → repair) is the engine of the talk.

---

## C. Storyboard

Format per scene — **Screen**: what the presenter view shows · **Hands**: what participants do on their phone / in the tutorial · **Aha**: which beat from section B (if any) · **Say**: the presenter's one line · **Reuse**: where existing material lives.

Participation runs on the Present Anything shell with the Supabase relay: presenter publishes slide state and the current "question" downstream; phones send flips/measurements upstream; each phone gets a hidden per-device secret (coin bias, beam angle, delay) derived from its device id so nothing needs storing. Presenter view aggregates everything into the live plot; every phone shows the same plot with *its own dot highlighted*.

With 15–20 people this allows three things a big room would not:
- **Named dots.** Each phone picks an emoji or two-letter tag on joining; the presenter plot shows tags, so "look where Lisa's dot went" is possible.
- **Assigned secrets, not random ones.** The presenter can hand out the hidden beam angles deliberately: a spread over 0–180° so the circle fills evenly, and *pairs* with mirrored angles (θ, 180°−θ) so the twin reveal in scene 13 happens by design, to two named people.
- **Everyone is a photon.** In scene 18, 15–20 phones is exactly the right number to fire one at a time and still see a shape emerge.

All demos that were physical in v0.1 (sunglasses, three lenses, 3D glasses) are now on-screen simulations that run on the phone itself: draggable polarizers, a beam animation, a transmitted-intensity readout. Physical props can be added later without changing the storyboard.

### Scene 0 — The contract (three presenter slides, before Part I)

**0a. Two films.** Cox (sixty seconds) and MIT (a few minutes). Say: "Listen for the claims." Reuse: v2 deck slides 3–4, tutorial `Step0Videos`.
**0b. Four claims, taken on faith — until today.** The four badges appear, all grey. Say: "Nobody here will be asked to believe any of these. We build all four, starting from a coin." Reuse: v2 deck slide 5, `ClaimBadge`.
**0c. How this works.** Phones join (QR), everyone sees scene 1, the rhythm per scene: I frame it, you play, we regroup on the surprise. The one rule: we never *add* anything quantum, we only refuse to throw details away. Reuse: v2 deck slide 2 (mechanics), plus the join step.

### Part I — Coins (scenes 1–6)

**1. Three coins, one prediction**
Screen: three coins, all labelled "50%". Hands, three rounds of ten flips: Round A — the same fair coin for everyone. Round B — a *mystery coin*: it always lands the same way, but which way nobody knows, not even its owner (no randomness in the coin at all, only in what we know). Round C — *your own* coin, with a secret bias. Pooled fraction on screen: all three → 0.5. Aha 0. Say: "Same forecast, three times. Do you believe the same thing?" Reuse: live coin-flip counter demo (already built); tutorial step 1.

**2. Two sources of uncertainty**
Screen: per-phone bars, three rows. Round A: everyone near 0.5. Round B: everyone at 0 or 1. Round C: bars all over the place. All three average 0.5. Say: "Round A: the coin is known, the throw is random — statistical. Round B: no throw at all, only ignorance — systematic in its purest form. Round C: both." Reuse: tutorial step 2, paper §1.

**3. One number is not enough → the bandwidth**
Screen: axis of p, then a second axis: expected spread. Round A pooled lands at (0.5, 0.5), on the rim. Round B's coins sit in the two corners (zero spread) and pooled land exactly at the centre — the state of no information. Round C pooled lands inside. Hands: your own coin's (p̂, σ̂) as a dot. Aha 1. Say: "We added one honest number and a shape appeared — with its rim, its centre and its inside." Reuse: tutorial step 3.

**4. The Bernoulli circle**
Screen: slider p; the pure-belief dot rides the arc; all phones' dots on the same arc. Hands: drag p on your phone (synced slider). Technical panel: σ = √(p(1−p)) ⇒ circle of radius ½. Say: "Every coin you fully know sits on the rim. Every coin you don't sits inside." Reuse: tutorial step 4 (first job).
Technical note (collapsible, "How far apart are two beliefs?"): the arc length along the rim between two pure beliefs is their statistical distance — how well a run of throws can tell them apart (Bures angle, arccos of the overlap). The bandwidth is essentially the *only* second number for which this is true (uniqueness lemma, paper). So the circle is not decoration: the ruler on it measures distinguishability. Referenced again in scenes 6 and 11.

**5. From the state's own point of view**
Screen: the triangle always-T · state · always-H (right angle at the state, Thales). The two legs: squared, they are p and 1−p. Rotate the view: the two legs become the needle (√p, √(1−p)) on a quarter circle with perpendicular axes always-H, always-T. Show the *pointer* (centre → state, angle 2θ) on the Bernoulli circle and the *needle* (angle θ) side by side, driven by the same slider: same arrow, angle halved. Hands: drag p, watch both swing. Aha 2. Say: "Opposite beliefs became perpendicular beliefs. Add the two components, then square — remember that." Reuse: tutorial step 4 (chords + needle) — split off as its own step.

**6. Part I close: two doubts**
Screen: the half disk, and two question marks. (i) Why *two* numbers — two numbers don't capture everything you could believe about a coin, so who says the bandwidth is the right one to keep? (Technical note: the distance argument from scene 4 is one answer; Nature's is coming.) (ii) Half a disk — half of *what*? Say: "Hold those. Nature is going to answer both." Reuse: new.

### Part II — Linear light (scenes 7–13)

**7. Two pairs of sunglasses**
Screen: wave animation with H- and V-wiggles; a polarizer strips one. Hands (on-screen): two draggable sunglass lenses over a light source; rotate the second one and watch the brightness readout go to zero at 90°. Aha 3. Say: "After the first glass, the light is *always-H*. You just built a known coin out of light." Reuse: tutorial step 5.

**8. The polarizer is the coin toss**
Screen: single photons arriving at a polarizer, pass/blocked ticks. Hands: your phone has a beam with a secret angle θ. Tap "measure with H" thirty times; your p̂ appears. Say: "Pass or block. Heads or tails." Reuse: tutorial step 6 (photon counter).

**9. The half circle, in glass**
Screen: every phone's (p̂, σ̂) dot — all on the rim. Overlay Malus's law cos²θ. Aha 4. Say: "We drew this circle from coins. Nature drew it from glass."
Then, on its own slide: reveal each beam's secret angle θ next to its needle from scene 5. The beam's wiggle direction (a, b) = (cos θ, sin θ) *is* the needle (√p, √(1−p)). Hands: your beam animation and your needle, overlaid — they coincide. Aha 4b. Say: "The arrow we invented to keep the books is the direction the light actually wiggles in." Reuse: tutorial step 6 ("the deepest surprise"), step 7 (rim part).

**10. Mixed light**
Screen: presenter blends two beams / lets θ flicker; the dot slides inside. Unpolarized = centre. Hands: "add noise" slider on your beam; your dot sinks. Then the reveal: a 45° beam and an unpolarized beam, both at p = 0.5. Aha 5. Say: "The fair coin and the mystery coin. In light. Same 50%." Reuse: tutorial step 7 (interior part), paper polarization section. Correction: contrast is polarized vs unpolarized, not monochromatic vs not.

**11. Ask a different question**
Screen: presenter rotates the polarizer to 45° (synced). Every dot jumps: the 45°-beam goes to 100%, the unpolarized beam stays at 50%. Then the plot: 45°-transmission − ½ against σ̂ — a straight line, with sign. Aha 6. Say: "The 45° answer is our bandwidth. Nature keeps the same books — and she signs them." Then the *why*: polarizer projects the needle, intensity squares it — "first add, then square" — and the three-lens simulation (0°/90° blocks; slide a 45° lens between them and light comes back) as proof on every phone. Technical note: this also closes the scene-4 loop — the arc-length ruler on the circle and Nature's 45° reading agree. Reuse: tutorial steps 7–8, step 14 three-lens demo (move it here).

**12. Angle doubling**
Screen: beam angle θ and the dot's angle 2θ side by side; the 45° question as the Bernoulli circle rotated by 90°. Technical panel. Say: "Turn the glass by 45°, the dot turns by 90°." Reuse: tutorial step 8/9.

**13. The twins split**
Screen: two named phones that were assigned mirrored angles (30° and 150°) were one dot under the H-question; under the 45°-question they are mirror images across the H–T diameter. Ask the two people to hold up their phones: same p, opposite sign. The half disk fills to a full disk; the needle's quarter circle becomes a half circle (negative bandwidth). Aha 7. Say: "Half of what? Half of the questions. A coin can only be asked one thing." Reuse: tutorial step 8 (twin reveal).

### Part III — The missing dimension (scenes 14–16)

**14. The shadow**
Screen: the field tip bouncing along a diameter, next to a point going round a circle and its shadow — identical motion. Then the needle from scene 9 with a little clock on each component (Brian Cox's arrows): the H-clock and the V-clock tick in step, so the tip bounces on a line. Say: "A bounce is the shadow of a circle. What if the two clocks could be set apart?" (Heuristic, explicitly: this is a hint, not a proof.) Reuse: tutorial step 12 opening.

**15. The impostor**
Screen: a beam that gives 50% to *every* linear polarizer — dot at the centre, "unpolarized". Then a quarter-wave plate: 100% linear. Hands (on-screen): a "delay" element you can slide into the beam before the polarizer; with the impostor beam the readout jumps from 50% to 100%, and the two clocks from scene 14 are now a quarter turn apart — the tip goes round a circle. Crowd tomography: each phone's beam now has a hidden delay δ; H- and 45°-questions place it in the disk, and pure beams appear *inside* — impossible in Part II. Aha 8. Say: "It looks like nothing. It is something. Two things at one point: the disk is too small." Reuse: tutorial step 12.

**16. The ball**
Screen: the delay dial sweeps the disk out of the plane into the Bernoulli ball; the needle's half circle becomes the Bloch ball. Third question = circular polarizer; third number = signed circular balance. Hands: drag δ; watch your dot leave the disk. Aha 9. Say: "Three questions, three numbers, one ball — and nothing left to ask." Reuse: tutorial step 13.

### Part IV — Conclusion (scenes 17–19)

**17. One photon at a time — the smallest quantum computation**
Screen: the Mach–Zehnder: half-mirror, two routes, a path-length dial φ, half-mirror, two detectors — and the same run drawn on the ball (quarter-turn, walk φ, quarter-turn back). Turn the lamp down until one photon flies at a time. Hands: each connected phone is one photon; the presenter arms a φ, everyone presses once, the clicks land on the detectors; sweep φ over three or four rounds and the room's own clicks trace cos²(φ/2). Then switch to the mystery-mixture source (each photon definitely took one route, unknown which): the fringe dies. Aha 10. Say: "Each photon is one indivisible click, and still the fringe appears. Each photon carries the whole ball — its needle, its two clocks. So did each coin. It was about probability all along. You have just run the smallest quantum computation there is." Reuse: tutorial step 15 (`MZBall`, `MZPlot`), v2 deck slide 28 (`FigMZ`).

**18. The dictionary and the receipt**
Screen: one slide — coin → half disk; linear light → disk; circular light → ball; R → C; rebit → qubit; Bernoulli ball = Poincaré ball = Bloch ball. Then the four claims, all badges gold: read them out. Say: "You have built a qubit. Not postulated — built, from bookkeeping and sunglasses. Nothing today was taken on faith." Reuse: tutorial step 14 dictionary, epilogue `Roadmap`, v2 deck slide 29 (closing, receipt).

**19. (Optional encore) The room decoheres**
Screen: the presenter's pure state; every phone adds a random delay; the room's dot shrinks to the centre. Say: "That is what happens to a qubit in a noisy room. Thank you for being the noise." Reuse: engagement ideas from the earlier session.

---

## D. Decisions taken (from your answers, 10 Sep 2026)

1. "Combination of both numbers doesn't identify uniquely" = two numbers don't capture everything about p. Kept as the planted doubt in scene 6.
2. Compass needle = the centre-to-state pointer of the Bernoulli circle, seen from the state's frame (angle halved); it is the wave's polarization arrow (scene 9, aha 4b) and gets two clocks in Part III (scene 14).
3. No physical props for now; every demo is an on-screen simulation on the participant's phone/laptop. Props can be layered on later.
4. Uniqueness lemma included as the technical note "How far apart are two beliefs?" in scene 4, referenced in scenes 6 and 11.
5. Audience 15–20: named dots, assigned (paired) secrets, one-photon-per-phone finale.

## E. Suggested next step

Build order that respects "storyboard first, then reuse": (1) freeze the aha list and the scene order; (2) list, per scene, the one plot the phone must show and the one message it sends upstream — that is the spec for the new tutorial steps; (3) only then open the old tutorial and the Present Anything deck and pull in what matches the reuse notes.
