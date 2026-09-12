# Build your own qubit — live session

A workshop in which the audience builds a qubit from a coin: every phone is a coin, then a beam of light, then a photon. Nineteen scenes, from a fair coin to the Bloch ball, following `docs/storyboard-coins-to-qubit.md`.

Two pages, one room:

| page | who | what |
|---|---|---|
| `presentation/room.dc.html` | presenter (laptop + projector) | the deck; its figures show the whole room, tagged by emoji |
| `next/index.html?session=CODE` | participants (phones/laptops) | the tutorial in *room mode*: follows the presenter's scene, shows the same plot with your own dot, holds the controls |

`next/index.html` without `?session=` is the standalone tutorial (fifteen steps, playgrounds).

## Setup (once)

1. Put your Supabase URL and anon key in `room/relay-config.js` (Realtime broadcast only; no tables). Leave it empty for a one-browser demo.
2. Host the folder over http — GitHub Pages from the repo root works (`.nojekyll` is included), or locally `python3 -m http.server 8000`. The `.dc.html` decks fetch their modules, so `file://` won't do.

## Running a session

Open the deck. It puts a session code in the URL; slide 1 shows the QR. Phones scan it, pick an emoji, and follow. **P** opens the projector mirror, **N** the speaker notes. Details, the wire protocol, and the pattern for adding a scene: `room/README.md`. No phones at hand: `room/fake-phones.html?session=CODE`.

## Layout

```
docs/          storyboard (v0.4) and spec / reuse audit — the contract for the build
next/          the tutorial; edit build-your-own-qubit.jsx, then `python3 next/build-index.py`
presentation/  room.dc.html (the room deck, scenes 0–13 so far) · room-figures.jsx (one Fig…Room per scene)
               support.js · deck-stage.js · presenter-kit.js (deck engine, mirror, notes)
               fifteen-steps-v2.dc.html · fifteen-figures.jsx · present-sync.js (the earlier deck: text and
               speaker notes to fold into the room deck in the final pass)
room/          relay-config.js · relay-transport.js · room.js · fake-phones.html · test/
```

## Status

Scenes 0–13 (coins, and linear light) are built and tested. Scenes 14–19 (the missing dimension, the Mach–Zehnder finale, the receipt) are next; after that the v2 deck's prose and speaker notes get folded into `room.dc.html`.

## Tests

```
npm install        # dev only: react, react-dom, jsdom, babel
npm test           # protocol on an in-memory bus; both React sides rendered in jsdom
```
