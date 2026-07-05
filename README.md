# Corne-troll Tower

A keyboard-learning game for a **46-key Corne split keyboard** running the
**Dvorak Programmer keymap (v1)**. You climb an airport career ladder — typing
cadet → X-ray officer → maintenance engineer → air traffic controller — and each
job trains one keymap layer while reusing the ones before it:

| Stage | Job | Trains |
|---|---|---|
| 1 — Flight School | Typing cadet | Layer 0 (Dvorak base) |
| 2 — Security Checkpoint | X-ray officer | Layer 1 (NAV & mouse) |
| 3 — Maintenance Bay | Software engineer | Layer 2 (SYM) |
| 4 — Corne-troll Tower | Air traffic controller | Layer 3 (FN) |

## Play

Open **`index.html`** in a desktop browser — it is fully self-contained
(no network, no dependencies). Progress persists in `localStorage`.

The game never remaps input: your Corne firmware produces the final output
(Dvorak characters, arrows, F-keys, clipboard combos, real OS mouse movement),
and the game only validates what the OS delivers. The collapsible **Corne guide**
at the bottom always shows the layer you need, the exact next key, and any
required thumb hold.

## Development

Source lives in `src/` as ordered modules; the deliverable is built by
concatenation:

```sh
sh build.sh          # produces index.html
node tools/serve.js  # optional local server on :8123
```

All difficulty numbers (gates, timers, quotas, spawn rates) live in the
`CONFIG` object in `src/15_config.js`. The keymap in `src/10_keymap.js` is the
single source of truth for every diagram, hint and drill.
