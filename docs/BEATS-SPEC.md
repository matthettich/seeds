# Beats: a beginner step sequencer inside ...Seeds

Branch: `beats` (made from `beta`). Test copy: https://matthettich.github.io/seeds/beats/ (published by
`.github/workflows/beats-web.yml` on every push). The beats copy keeps its **own saves** (`videopatch-beats:v1`,
IndexedDB `seeds-beats`), so nothing here can touch the live app's or beta's patches.

Mockups: https://claude.ai/artifact/JqEYuQwWHL9eqVeWJ2tpdF (1 · step grid, 2 · song arranger, 3 · node in the patch).

## Who it's for

Emmanuelle is learning electronic music and already uses Seeds for microscope videos. She gets overwhelmed by
complex software. Every screen must pass this test: **could a first-time user make a beat in under a minute without
reading anything?** If a feature fails that test, it goes behind the **More** toggle.

## What it is

A new module, **Beats** (family: Rhythm and triggers, `gate`), that sits in the patch like any other node:

- The node shows a mini grid of the current scene, the scene letter and tempo, and an **Open steps** button that opens
  the full-screen editor (mockup 1).
- Outputs: `audio`, `MIDI`, `CV`, one **trigger** jack per track (pink, gate type, fires on every step that plays),
  and `bar clock`. The triggers are the point: a kick can flash Kaleido or freeze Feedback.
- Seeds' existing Clips mode (patch switching on MIDI notes) keeps working; Beats can also send those notes.

## Rules for every change

1. Work only on the `beats` branch. Never push to `main` or `beta`. Never edit `beats/`, `beta/` or `desktop/app/` by hand.
2. Seeds is one file, `index.html`. Put all Beats code in **one block** marked `// ===== BEATS =====` …
   `// ===== /BEATS =====` (plus its CSS in one block marked the same way), so it can be found, reviewed and removed.
   Touch code outside those blocks only to register the module, and say so in the commit message.
3. Follow `docs/style-guide.md`: colour tokens from `:root`, never hard-coded hexes; signal colours keep their meaning
   (pink = triggers/gates, teal = audio, purple = modulation); plain-English labels; touch targets ≥ 44 px; Undo for
   every edit; nothing is deleted without asking.
4. Every skin must still look right (check Minimal, Pastel light, Neon).
5. Old patches without a Beats node must open exactly as before. A patch with one saves its data under the node's
   params like every other module (see Data below).
6. One small, testable step per commit. Write what you tested in the commit message.
7. **Stop and hand back to Claude** (write the reason in `docs/BEATS-NOTES.md`) for anything marked 🔴 below, for any
   timing / audio glitch, or if a fix needs changes to the audio engine, clock or Clips code.

## Data (one Beats node)

```js
beats = {
  v: 1,
  bpm: 120, swing: 0,                // swing hidden behind More
  key: 'C', scale: 'minor', lock: true,
  tracks: [                          // 8 by default, + Add track up to 16
    { id: 't1', name: 'Kick', type: 'drum',   // 'drum' | 'synth' | 'midi' | 'cv'
      sound: '909 Kick',             // drum / synth only
      midi: { port: '', ch: 1 },     // midi only
      cv: { pitch: 3, gate: 4, cal: null }, // cv only: output channels, calibration table
      vol: 0.8, mute: false, solo: false }
  ],
  scenes: {                          // A–H
    A: { name: 'Intro groove', bars: 1,
         steps: { t1: [ { on: true, note: 36, vel: 100, chance: 100 }, /* … 16 × bars */ ] } }
  },
  song: [ { scene: 'A', repeat: 4 }, { scene: 'B', repeat: 2 } ],
  mode: 'simple'                     // 'simple' | 'more'
}
```

Steps are stored sparse-friendly but always read as `bars × 16` entries; missing = off.

## Screens (match the mockups)

**Steps (mockup 1).** Header: Play / Stop, Tempo, Key with LOCK, scene letters A–H (+), Song ›, Undo,
Simple / More. Left: track buttons (colour bar, name, type · output, M). Middle: 16 step buttons per bar, a gap every
4 steps, the playhead outlined in the selection colour. Right panel: the selected track's settings (sound picker with
Prev / Next for drum and synth; port, channel, clock for MIDI; pitch / gate outputs and **Tune CV…** for CV), volume,
and the selected step's Note / Velocity / Chance. Bottom: + Add track (n of 16), Bars 1–4 (+).
- Tap a step: on / off. Hold (or right-click): select it and show its Note / Velocity / Chance.
- Key lock on: notes snap to the scale.
- More shows: swing, per-step chance on the grid, per-track length. Nothing else for now.

**Song (mockup 2).** A row of blocks (scene letter, name, mini grid, × repeats, loop button), drag to reorder,
+ Add block, a song position bar. Below: the scene library A–H; tap to add to the end, Copy scene → empty slot.
No per-track arrangement.

## Build order

Each phase ends with something she could try. ✅ = fine for a low-cost model. 🔴 = Claude (top model).

| # | Phase | Who |
| --- | --- | --- |
| 1 | 🔴 Clock and engine: an AudioWorklet step clock (tight timing even while video renders), trigger outs, a first drum kit and one synth ported from ...Thunder Plus, MIDI clock out | Claude |
| 2 | Module shell: register Beats, node face with mini grid, output jacks, save / load of the data above, Undo | ✅ |
| 3 | Steps editor UI: header, track list, grid, right panel, add track, bars; wired to phase 1's engine | ✅ |
| 4 | Scenes A–H and the Song screen | ✅ |
| 5 | MIDI tracks: port / channel picking, note out | ✅ (🔴 if timing drifts) |
| 6 | 🔴 CV tracks: pitch + gate on chosen output channels, the Tune CV calibration (1 V/oct), DC-coupled interface check | Claude |
| 7 | Polish: skins, touch sizes, help text, presets for sounds | ✅ |
| 8 | 🔴 Review before merging `beats` → `beta` | Claude |

Phase 1 lands first so the UI phases can be built and tested against a working sound.

## Test checklist (keep ticking in this file)

- [ ] A patch saved in live Seeds opens in beats/ unchanged, and the beats copy's saves don't appear in live.
- [ ] Make a 1-bar beat with 4 tracks in under a minute, starting from an empty patch.
- [ ] Kick trigger cable into a video module flashes on every kick, in time, at 120 and 170 BPM.
- [ ] Undo / Redo every edit; switch skins; reload the page and the beat is still there.
- [ ] Song A ×4 → B ×2 plays in order and loops.
