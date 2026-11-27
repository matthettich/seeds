# Seeds code review — fix report

**Reviewed:** `matthettich/seeds` at `main` (`fdf045b`), branch `freebuff/…`.
**No code was changed.** Every line number below refers to `index.html` at that commit unless stated otherwise.

**How to use this file:** it is a static read-only review, not a plan that has been executed. Work it top to bottom; section 7 is the suggested order. Items tagged **[verified]** were traced through the code and can be fixed as written; items tagged **[suspected]** need a runtime repro first. Do phase 0 (a smoke test) before the structural work in section 4.

## Scope and method

| What | Size / notes |
|---|---|
| `index.html` (the whole app) | 10,356 lines, ~886 KB, one IIFE, ~380 functions, no dependencies, no build |
| `beta/index.html` | byte-identical to the root copy except the `<title>` line (1 line diff) — reviewed once, findings apply to both |
| `desktop/` | `main.js` 174, `updater.js` 195, `preload.js` 29, `package.json` |
| `sw.js` | 33 lines (same as `beta/sw.js` modulo cache name) |
| Workflows / tooling | `desktop.yml`, `beta-web.yml`, `make-channel.sh`, `copy-app.js` |
| Tests | `tests/updater.test.js` only — 5 tests, all for the desktop updater |

Review was by reading: the GL pipeline, node lifecycle, graph evaluation, audio graph, recorder, persistence, modes (Simple/Patch/Present/Control/Clips), the drag/pointer helpers, the desktop wrapper and workflows. **Not read line-by-line:** the ~3,500 lines of generator drawing code and fragment shaders, per-module control UIs, MIDI clock arithmetic, and Clips layout details. Anything below is marked **[verified]** (seen in the code and traced through) or **[suspected]** (looks wrong, needs a runtime repro before changing).

Baseline observations, useful for calibration:

- The code is unusually well commented, and most of the usual suspects are already handled: GPU textures are owned per node and released in `GLX.release` (`6767`), `WebGL` context loss is handled (`1687`), shader compile failures are cached (`1730`), blob URLs are revoked on every removal path (`1657`, `3234`, `6563`), pointer drags are centralised in `pointerSession` (`6614`), takes/MIDI/presets are pruned from `removeNode` (`6724`), and history is capped by bytes (`8859`). This is not a leak-ridden codebase; the problems are concentrated and specific.
- The file is nonetheless at the size where the real risk is **regression cost**, not individual bugs. See section D.

---

## 1. Fix first (bugs)

### A1. An intentionally empty patch is replaced by the demo patch on reload — **[verified]**

`load()` (`7277`) returns `applyPatch(d)`'s truthiness, and `applyPatch` (`7307`, last line) returns *whether anything was built*:

```js
return [...nodes.values()].some(n => !n.fixed) || decor.length > 0;
```

Boot then does `const firstRun = !load(); if (firstRun) defaultPatch();` (`10298`). So a patch the user deliberately emptied (all modules deleted, no decor) loads "fine", reports `false`, and the demo patch is built over it — and the next autosave overwrites the saved empty patch.

The same path fires when *every* module in a stored patch is of a type this build doesn't know (e.g. a patch saved from a newer version): `if (DEFS[s.type])` skips them, the result is empty, `false` comes back, and the demo replaces a patch that should have been left alone with a "couldn't open" warning.

**Fix:** separate "did the load succeed" from "was the patch non-empty". Have `load()` return one of `'ok' | 'empty' | 'failed'` (or `{ok, built}`), demo only when nothing at all was stored, and treat an all-unknown-type patch as a failed load so it lands in Settings → Backups like other broken files. ~15 lines, no format change.

### A2. `perfBuildPanel` is not idempotent and destroys the module body if called twice — **[verified]**

`perfBuildPanel(n)` (`7998`) takes `n.el > .body`, appends it into a new `.ppanel`, and wraps *every* child in a fresh `.pcw` wrapper (`8020`–`8034`). There is no `if (n._pp) return;` guard. `perfRemovePanel` (`8065`) is the only thing that unwraps.

Callers: `perfEnter` (`8120`), the "Hidden modules" menu (`8088`), and via `reconcile()`'s `perfExit(); … perfEnter();`. Today those are ordered correctly, but `perfMods()` (`7971`) is a *filter* — a module that stops matching it (enters `simple.group`, gains `params.sys`, is part of a fading-out clip) has its panel built but will never be removed by `perfExit()`. Then the next `perfEnter()` calls `perfBuildPanel` a second time on a node whose body is already wrapped and already inside a panel: the wrappers nest, the old panel is orphaned in `perfSurf` with a live body, and the module shows duplicated controls.

**Fix:** `if (n._pp) return;` at the top of `perfBuildPanel`, and make `perfExit` iterate `Object.keys(perf.panels)`-owning nodes rather than the current filter (or remove panels by querying `perfSurf` children). ~6 lines.

### A3. `redo()` does not update the history byte counter — **[verified]**

`undo()` (`8917`) decrements `histBytes`; `redo()` (`8924`) pushes onto `histStack` without incrementing it:

```js
histStack.push(histLast); histBytes += histLast.length;   // ← this line is missing in redo()
```

The cap in `histPush` (`8863`) uses `histBytes > HIST_BYTES` (15 MB). After enough undo/redo cycles the counter under-reports and the stack can grow well past the intended memory ceiling. `redoStack` entries are never counted at all.

**Fix:** increment `histBytes` in `redo()`, and count `redoStack` in the cap check (or size-limit both stacks in one place).

### A4. `window.fontPickers` retains removed modules — **[verified]**

`9659` and `9666`:

```js
fill(); window.fontPickers = (window.fontPickers || []).filter(f => nodes.get(f.n.id) === f.n).concat([{n, fill}]);
```

Each text module registers a closure holding the node; entries are only pruned when *another* font picker is created or `fontRefresh()` runs. Deleting a text module leaves its node, its canvases and its `fill` closure reachable from `window` — a small but permanent leak per created-and-deleted text module, and a global that no other code expects.

**Fix:** store the refresher on the node (`n.fontFill = fill`) and have `fontRefresh()` iterate `nodes`, or delete the entry in `removeNode`. Kills the global too.

### A5. Unguarded throw in the per-frame output-window path — **[verified]**

`drawOutput` (`6809`) checks `w.closed` and then calls `(w.requestAnimationFrame || window.requestAnimationFrame).call(w, show)` (`6831`). If the popup closes between the check and the call, this throws. It is caught per-module by `frameBody` (`10334`), so the symptom is a module that silently stops drawing for one frame and a console error, not a crash — but it is on the hottest path in the app.

**Fix:** wrap the `requestAnimationFrame` call in `try { … } catch(e) { closeOutput(n); }`, and do the same around `n.pcv`/`n.pctx` use in `show`.

### A6. Hand-drawn cable bends can wedge the patch editor — **[suspected, needs a touch/trackpad repro]**

In `onJackDown`'s `up` handler (`7042`): `if (drag.drawing && ev.type === 'pointercancel' && !ev.manual) return;` — a real `pointercancel` during "click empty space to add a bend" returns before the cleanup block, so `drag` stays set and the four `window` listeners stay attached. While `drag` is non-null, `onJackDown` starts with `if (drag) return;` (`7019`), so new cables can't be started; the ghost cable keeps drawing. Escape clears it, but nothing tells the user that.

**Fix:** on `pointercancel` in drawing mode, keep the bends collected so far and finish (or fully cancel) — never leave `drag` set after the pointer is gone.

### A7. Untrusted patch JSON is merged with `Object.assign` into params — **suspected, low severity**

`addNode` (`6622`): `params: Object.assign({}, def.params, params || {})`. A `.seeds.json` containing `"params": {"__proto__": {"x": 1}}` changes the *node's* params prototype (not global `Object.prototype`), which can then confuse `for…in` loops over params — there are several (`modPass` `747`, `reconcile` `8900`).

**Fix:** a `mergeParams` helper that skips `__proto__`, `constructor` and `prototype` keys. Used by `addNode`, `applyPatch` and `reconcile`.

### A8. `desktop/main.js` builds the save path from the page-supplied filename — **suspected, low severity**

`will-download` (`main.js:150`) does `path.join(dir, `${stamp} ${name}`)` with `name = item.getFilename()`. Electron sanitises most cases, but `path.basename(name)` is one word and removes any doubt about writing outside `Documents/Seeds Recordings`.

---

## 2. Memory: what is retained, and what to do

Nothing here is an unbounded leak in normal use; these are retention and OOM-risk items worth tightening.

### B1. Recorder takes live in RAM until saved — by design, but unbounded — **[verified]**

`addTake` (`6546`) keeps `{blob, url}` per take; `takesSize` (`6570`) only *warns*, once per extra gigabyte. A two-hour set at 4K/40 Mbps is tens of GB of `Blob`s and the tab dies. The comment in `takesSize` acknowledges this.

**Suggested fix (pick one):** cap total unsaved bytes (e.g. 2 GB) and auto-stop the take with a clear message; or stream to disk via `showSaveFilePicker` as the take records (the HANDOFF already lists this as open work). Also revoke `t.url` for takes that are saved *and* older than the newest N, since they're only kept for preview.

### B2. Output windows keep a full-size buffer after closing — **[verified]**

`drawOutput` allocates `n.pbuf` at the window's pixel size (`6814`) and `closeOutput` (`6803`) nulls `n.pcv`/`n.pctx` but not `n.pbuf`. At 4K that's ~33 MB retained per node that ever had an output window.

**Fix:** `n.pbuf = null;` in `closeOutput`.

### B3. `GLX.toCanvas` keeps a full-size 2D canvas on the Tex — **[verified, intentional]**

`toCanvas` (`1820`) caches `t.c2d` per texture for the readback path. Modules on the 2D path (Screens, recorder preview, older effects) therefore hold a texture *and* a canvas at picture size. Correct, but it roughly doubles the GPU-side memory for those modules and should be named in any memory-budget discussion.

### B4. History + backups + autosave all compete for the same 5 MB — **[verified]**

- `histStack`: up to 120 snapshots or 15 M characters (`8859`) — ~30 MB of UTF-16 in RAM, plus `redoStack` (uncounted, see A3).
- `backups` (`9101`): 8 full patch strings in **localStorage**, written every 3 minutes.
- Autosave: one more full patch string in localStorage.
- Beta additionally mirrors the Clips set there when under 1.5 MB (`MIRROR_MAX`, `9182`).

`save()` (`7247`) already detects the quota failure and warns; the actionable improvement is to store backups in IndexedDB (already used for exactly this reason) instead of localStorage, freeing the whole quota for the autosave.

### B5. `beta/index.html` is a committed 886 KB duplicate — **[verified]**

Byte-identical to the root app except `<title>`. It is generated by `tools/make-channel.sh` from the `beta` branch and must never be edited; every clone carries both copies and every diff shows a full-file rewrite. Consider publishing beta as a GitHub Pages artifact or a `gh-pages` branch instead of a checked-in copy (HANDOFF explicitly says "never edit `beta/` by hand" — this makes that impossible to get wrong).

---

## 3. Performance and hot paths

Context: this is a real-time video tool whose frame budget is the product. It already skips work aggressively (cables are only re-pathed when geometry changes, `placeCable` `6980`; readouts update every third frame, `modPass` `1425`; generators are capped at `genFps`, `2928`). The items below are the remaining avoidable costs.

### C1. `edgeInto` rebuilds the whole edge index on the first call of **every frame** — **[verified]**

`2828`:

```js
if (_eArr !== edges || _eLen !== edges.length || _eFrame !== frameNo || _eVer !== edgeVer){
  _eIdx = new Map(); for (const e of edges){ … }   // rebuild
}
```

`frameNo` is part of the cache key, so the map is rebuilt once per frame no matter what — allocating a `Map` with one entry per cable, 60×/s, on the hottest lookup in the app (`P()`, `readIn`, `gateHigh`, `rising`, `inputRaw` all call it). The `edgeVer` check is then dead weight.

**Fix:** drop `_eFrame` from the condition and rely on `_eArr`/`_eLen`/`_eVer` (both are already maintained — `edgeVer++` happens in `syncCableEls`, `6927`). Expected effect: no behaviour change, one fewer allocation graph per frame. Measure with the built-in CPU meter before/after rather than claiming a number.

### C2. `syncCableEls` removes cables in O(n²) — **[verified]**

`6929`: `for (const [e, c] of cableEls) if (!edges.includes(e)){ … }` — `edges` is an array, `cableEls` a Map with one entry per cable. `syncCableEls` is called from `afterEdges`, `setLeftCol`, `applyScope`, `mixerShow`, `theme` changes and more, so a 60-cable patch pays 3,600 comparisons per call.

**Fix:** `const live = new Set(edges);` once, then `if (!live.has(e))`.

### C3. Four always-on timers, none of them visibility-aware — **[verified]**

| Line | Timer | Work per tick |
|---|---|---|
| `9122` | `backupNow` every 3 min | no-op if unchanged (`histState()` still serializes the **whole patch** to compare) |
| `9293/9294` | `paintStrips` every 500 ms | `querySelectorAll('.lefttitle')` + text write, forever |
| `9310` | inline 400 ms | allocates an array of *all nodes* + `visibleNode` scan, forever |
| `10277` | `soundPaint` every 1500 ms | DOM writes on up to 3 elements |

None check `document.hidden`, and the app deliberately keeps rendering while hidden (`schedule`, `10349`), so these land during recording/output-window use too. Individually trivial; together they are three layout-forcing writes per second on a page that is trying to hold 60 fps.

**Fix:** one `setInterval(…, 400)` ticker that (a) returns immediately when `document.hidden`, (b) calls each painter only when its mode/DOM is actually visible, and (c) tracks a `dirty` flag so the backups/nodes scan is skipped when nothing changed. `backupNow` should compare a cheap signature (e.g. `frameNo`-independent serialize hash, or a `saveSeq` counter bumped by `save()`), not re-serialize.

### C4. `drawCables` measures every jack every frame — **[verified, probably the biggest remaining per-frame cost]**

`6995`–`7005`: for every cable, two `jackPos()` calls, each doing `getBoundingClientRect()` on a jack element (and `visibleNode`/`proxy` lookups), then `placeCable` early-outs if the numbers are unchanged. Measurement itself is the cost, and it forces layout flushes while nodes are being dragged (`nodeDragging`, `6914`).

**Fix, in increasing order of effort:**

1. Cache per-cable `{a, b}` and recompute only when `pan`/`zoom`/`frameNo%N` or a node moved changed (a `worldVer` counter bumped by `applyPan`, node drag, collapse, resize).
2. Or measure once per frame into a `Map` keyed by `nodeId|dir|port` and reuse it for both endpoints and both cables of a fan-out.

### C5. Full-patch JSON work on every edit — **[verified]**

Each `save()` (`7247`, debounced 300 ms, but called from 165 sites including every slider `input`) does:

1. `histPush()` → `histState()` → `serialize()` + `JSON.stringify` of the entire patch, then a string compare (`8861`);
2. `serialize()` again for the write (`7249`);
3. `saveActiveClip(sd)` → `copyPatch(d)` = **`JSON.parse(JSON.stringify(d))`** of the whole patch, stored in the active Clips slot, then `liveSave()` → a second stringify of *all 16 slots* and an IndexedDB write (`9759`, `9719`).

In Clips mode with full slots, moving one fader deep-clones and re-serializes the entire set. That is where a stutter during a show would come from.

**Fix:** keep a `dirty` object of changed nodes/params instead of re-serializing from scratch for history (or reuse the string already produced for the autosave); debounce `saveActiveClip` separately (e.g. 2 s) and only when in Clips mode with an active slot; store slots as already-serialized strings instead of live objects to avoid a clone per save.

### C6. `frameBody` renders hidden modules — **[verified, low risk]**

`10331` iterates every node and calls its `render`. Nodes in other scopes are `display:none` (`applyScope`, `8196`) so most renderers bail on `clientWidth === 0`, but the loop and the per-module try/catch still run for every module in the patch, including those inside unopened groups.

**Fix:** skip when `!visibleNode(n)` and the mode doesn't need it (the recorder and `main` are `fixed`, so they stay). Cheap, measurable.

### C7. Misc smaller items

- `sliderFromText` (`1310`) brute-forces up to 2,001 readout evaluations per typed value. Fine for a human typing; never call it in a loop.
- `reaches()` (`7059`) is a full BFS over `edges` per connection attempt — fine.
- `fitAll` reads `offsetWidth/offsetHeight` per node (`7205`) — fine, user-initiated.
- `liveRender()` (`9859`) rebuilds all clip cards (inputs, selects, ~10 listeners each) on any state change, including every queue/unqueue. Acceptable at 16–32 slots, but it is called from `liveTick`'s path via `liveRender` in `clipTrigger`, so rapid MIDI pads cause full rebuilds; consider updating classes instead of re-rendering.

---

## 4. Structure: the "spaghetti" part, concretely

This is the honest core of the review. The file is not badly written; it is **a good 10k-line program wearing no structure**, and the cost is paid on every change. Numbers:

| Measure | Value |
|---|---|
| Lines | 10,356 in one IIFE (`1250`–`10356`) |
| Functions | ~380, all in one scope |
| `document.getElementById` calls | 163 |
| `save()` call sites | 165 |
| `nodes.get()` | 85 |
| `JSON.parse(JSON.stringify(…))` clones | 24 (three different idioms: `copyPatch`, `remapPatch`, inline) |
| Empty `catch(e){}` | 73 |
| Longest functions | `helpDoc` 112 lines (`8723`), `startRec` 109 (`6421`), `addNode` 96 (`6622`), `composeGeo` 96 (`2436`), `vecMesh` 75 (`9449`), `addDecor` 60 (`7771`), `perfBuildPanel` 54 (`7998`), `clipLaunch` 52 (`9765`) |
| Automated tests for this file | **0** |

The items below are ordered by how much pain they cause, not how hard they are.

### D1. The same "restore a patch" logic exists four times — **highest-value refactor**

`applyPatch` (`7307`), `reconcile` (`8872`, undo/redo/backup restore), `clipLaunch` (`9765`, Clips) and `remapPatch` (`9724`) each independently: create nodes from a spec, filter edges by whether both ports exist, restore `presets`/`activePreset`/`midiMap`/`keyMap`/`bank`/`perf.panels`/`decor`/`simple`, and rebuild the UI. They have drifted: `reconcile` deletes params that the saved state doesn't have, `applyPatch` doesn't; `clipLaunch` maps module ids through `remapPatch` first, the others don't; port validation exists in `applyPatch`/`clipLaunch` but not in `reconcile` (undo can restore an edge to a port that a newer module version no longer has).

**Fix:** one `restoreState(d, {remapIds: false, keepLiveNodes: true, mode: 'file'|'undo'|'clip'})` that owns node/edge/preset restoration, with the three callers reduced to a few lines. Do this *after* a smoke test exists (section 6) — it touches every path.

### D2. Node objects are untyped property bags — **medium value, low risk**

Each node accumulates ad-hoc fields with no schema: `_gt` (GPU targets), `_gv`, `_gout`, `_genT`, `_f`, `_out`, `_pw`/`_pp` (perform panel), `_sc` (simple card), `mx` (mix canvas), `buf`/`pool`/`frames`/`imgs` (per-module), plus `jacks`, `meta`, `ctl`, `cmeta`, `dflt`, `pressed`… Nothing declares which of these are lifecycle-owned, so "did the author remember to free it?" is answered by reading each module.

The only lifecycle contract is an optional `DEFS[type].destroy(n)`. Audit result:

- **video:** camera `3249`, player `4110`, group `5201`, screen `6280`, image `5581`, gif `5655` — present.
- **audio:** `again` (**Gain**) has **no `destroy`** — its `aout` is only disconnected by the generic `['aout','ain']` sweep in `removeNode` (`6729`), and `ain` likewise; every other audio module (`ameter`, `apan`, `afilter`, `aeq`, `acomp`, `adist`, `adelay`, `areverb`, `amix`, `atrig`, `speakers`, `audioin`) tears down explicitly. `send`/`receive`/`follower`/`bands`/`beat` should be checked against the same list.
- **video effects** rely on `GLX.release(n)` in `removeNode` — fine.

**Fix:** add the missing `destroy`s, then document the contract at the top of `DEFS` ("a module that creates an AudioNode, a canvas, a media element, a blob URL or a timer must implement `destroy`"). Add a debug-only assertion in `removeNode` that walks `Object.keys(n)` and warns about `AudioNode`/`HTMLMediaElement`/`HTMLCanvasElement` values still attached after `destroy` — that turns the next forgotten teardown into a console warning instead of a slow leak.

### D3. Three mode systems layered on each other — **medium value, medium risk**

Mode state lives in `simple.on`, `perf.on`, `live.on`, `settings.simple`, `document.body.classList` (`simple`, `perform`, `live`, `sliders`, `simplemode`, `leftcol`, `viewcol`, `lbarmin`, `recmain`, `learning`, `alting`, `panning`, …) and in helper predicates: `patchEditable()` (`6721`), `perfMods()` (`7971`), `visibleNode()` (`8143`), `modeName()` (`9287`), `recMainOn()`. Callers guard with ad-hoc `if (simple.on)`, `if (!perf.on)`, and `settings.simple` in three different places (`8501`–`8503`, `8589`, `9386`).

Consequence: it is possible for `settings.simple` and `simple.on` to disagree (the mode buttons clear one but not the other), and "what is visible right now" is answered by four different functions.

**Fix:** a single `const MODES = {patch, perform, sliders, live, simple}` with `current` plus `enter/exit` hooks already present (`setMode` at `8518`), and derive `body` classes from `current`. Keep `settings.simple` as the persisted preference only. Mechanical, but only after the smoke test.

### D4. Simple mode moves real DOM out of node cards — **fragile, worth isolating**

`simpleRender` (`8409`) and `simpleReturnBody` (`8394`) physically move `n.el > .body` into a Simple card and back, which is why `simpleBody` (`8393`) exists as a fallback for group editing, and why every "does this module work in Simple?" question is really "where is its body right now?". Any code that assumes `n.el > .body` (perform panels `7999`, `reconcile`'s group refresh) is silently wrong while Simple is on.

**Fix:** render a second, read-only-ish view (a compact control list built from `n.meta`) instead of relocating the body. That also removes the need for `n._sc`.

### D5. `DEFS` mutated at runtime — **low risk, easy to fix**

`addNode` (`6623`) pushes `new`/`store`/`recall` inputs onto `DEFS[type].ins` for `MEM_TYPES` the first time such a module is created. `DEFS` is otherwise a static template used by `serialize`-independent code (port validation, help, palette). A module whose ports depend on runtime state should compute them: `const insFor = type => MEM_TYPES.has(type) ? MEM_INS : DEFS[type].ins`, used at the four call sites.

### D6. Duplicated/competing UI construction patterns — **low value, cosmetic**

- Two ways to build controls: the `h()` helper with `onclick:` props (`1260`) and ~200 raw `addEventListener` calls; one place (`perfBuildPanel`'s header, `8031`) still does manual `pointermove`/`pointerup` add/remove with `setPointerCapture` instead of `pointerSession`, and it is missing `lostpointercapture`.
- Text-editing is re-implemented five times (slider value `1344`, zoom `7189`, preset rename `7725`, decor label `7786`, perf title `8015`) — each with its own `done` guard and key handling.
- `downloadJson` (`9393`) and `saveTake` (`9401`) each build an anchor and revoke after 4 s; a third copy sits at `10262` for the test tone.

**Fix:** one `editInline(el, {value, onCommit})` helper and one `clickDownload(blob, name)`; convert `perfBuildPanel`'s header drag to `pointerSession`. Small, safe, improves consistency.

### D7. Dead or vestigial code — **clean up once tests exist**

- `getDownloads()` (`6578`) probes `window.claude.use('downloads')` — a hosting-environment API that no longer exists; it resolves `null` and falls through to the anchor path, so every take pays an `await` on a promise that is always `null`. Delete it and `saveTake`'s first branch (`9403`–`9415`).
- `recorder.destroy` (`6397`) is marked "not reached today" — either wire it up or delete it.
- `viewStack` (`8207`) and `scopeStack` (`8139`) must be pushed/popped in lockstep by `openGroup`/`closeGroup`; a single stack of `{id, pan, zoom}` would make that impossible to get out of sync.
- `h()` supports `on<event>` props, but `<script>`-era strings in `openOutput` (`6769`) build a whole document with `d.write` — the one remaining HTML-string generator; a template `<template>` would be safer and shorter.
- `beta/sw.js`'s comment still says `seeds-v1` where it now means `seedsbeta-v` (`beta/sw.js:9`) — stale comment.

---

## 5. Desktop wrapper, service worker, workflows

The wrapper is small and mostly correct (single-instance lock, sandboxed preload with `contextIsolation`, least-privilege workflow, SHA-256 verified downloads with a stall timeout). Real findings are minor.

### E1. `desktop/package.json` version is `1.0.1`, but 1.1.1 shipped — **[verified]**

`package.json:4` says `1.0.1`. `desktop.yml` sets the version from the tag/input at release time (`npm version … --no-git-tag-version`), so released artifacts are right, but every **local** `npm start` / `npm run dist:*` reports 1.0.1 and the updater will offer `1.1.1` forever — including to a developer who just built 1.1.1 locally. `desktop/README.md` tells the reader to raise it by hand, which is easy to forget.

**Fix:** bump the committed version as part of the release commit (or have `copy-app.js`/a `prebuild` script stamp it from `git describe`).

### E2. Update progress reports 0% when the server omits `Content-Length` — **[verified, cosmetic]**

`updater.js`, `download()`: progress is only computed inside `if (total)`; `total` comes from `content-length` or the asset size. With neither, the Update button reads "Update 0%" for the whole download, then jumps to Install. Fall back to `a.size` (already available) or an indeterminate label.

### E3. Per-frame popup handling and `n.pbuf` — see A5/B2. Same code path, two of the findings above.

### E4. Permission handler is blanket for the session — **[verified, low risk]**

`desktop/main.js:146` grants `ALLOWED` (media, midi, midiSysex, fullscreen, window-management, fileSystem, clipboard-*, speaker-selection, audioCapture) to **any** frame in the session, with `setPermissionCheckHandler` doing the same. Today the app is a local `file://` page, so this is safe; if a web view or an embedded page is ever added, scope the grants to the app's own origin.

### E5. `sw.js`: cache-first assets with a manually bumped cache name — **[verified, low risk]**

`CACHE = 'seeds-v2'` (`sw.js:9`); icons/fonts are served cache-first and only refresh when a human bumps the version (`tools/make-channel.sh` does the beta rename, nothing bumps the live one). Also two un-awaited `caches.open(...).then(c => c.put(...))` calls (`sw.js:23`, `sw.js:30`) with no `.catch`, which surface as unhandled rejections in DevTools when storage is full or the response is opaque. Add `.catch(() => {})` and bump the cache name whenever `FILES` changes.

### E6. Workflows: no defects found

`desktop.yml` is read-only except the release job, keeps the token out of `.git/config`, runs the updater tests before building, and handles pre-releases by suffix. `beta-web.yml` confines itself to `beta/`, refuses changes outside it, and retries the push with a rebase. No changes needed.

---

## 6. Verification and tests: the gap that matters most

`tests/updater.test.js` (5 tests, `node --test`) is genuinely good — it runs the real `download()` against a fake `electron` and network and asserts checksum-mismatch files are deleted and never opened. It covers 195 lines of `updater.js`.

The 10,356-line application has **no automated test**, and the HANDOFF's "smoke test + targeted Playwright checks" are described but not committed. That is the reason every item in section D is risky to change.

**Suggested first commit of any follow-up work (before touching app code):**

1. `tests/smoke.mjs` — launch headless Chromium with fake camera/mic (`--use-fake-device-for-media-stream`), load `index.html` from `file://`, wait for 60 frames, then: add one module of every `DEFS` type, wait a frame each, remove them all, and fail on any `console.error`, any uncaught exception, or any node left in `nodes`/`cableEls`/`perf.panels`/`GLX` textures at the end. This single test would have caught A2 and most `destroy` regressions.
2. `npm test` at the repo root that runs both the updater test and the smoke test; wire it into a workflow for `main`/`beta` so it runs before the beta publish.
3. A `docs/` note recording the lifecycle contract from D2.

---

## 7. Suggested order of work for the next agent

Each phase is independently shippable and independently verifiable. `main` is the live app used on stage (see HANDOFF's hotfix policy): A1/A2/A3/A5, B2, C1 and C2 are small enough to go straight to `main`; everything structural belongs on `beta`.

| Phase | Items | Risk | Verify with |
|---|---|---|---|
| 0 | Smoke test + root `npm test` (section 6) | none | the test itself, on `beta` |
| 1 | A1 (empty patch), A5 (`rAF` throw), B2 (`pbuf`), A3 (`histBytes`) | very low | smoke test + manual: delete all modules → reload; open/close an output window; undo/redo 50× |
| 2 | A2 (`perfBuildPanel` guard), A4 (`fontPickers`), C1 (`edgeInto` key), C2 (Set lookup) | low | smoke test; enter/leave Present mode repeatedly with a hidden module; measure CPU meter before/after C1 |
| 3 | D2 (missing `destroy`s + debug assertion), A7 (`mergeParams`) | low-medium | smoke test with the new assertion enabled; add/remove every audio module while sound runs |
| 4 | C3 (single ticker), C4 (cable rect cache), C6 (skip hidden renders), C5 (save/backup cost) | medium | before/after CPU meter and frame time on a 40-module patch with 30 cables; no visual diff |
| 5 | D1 (`restoreState`), then D3 (mode state), D4 (Simple rendering), D5, D6, D7 | medium-high | smoke test, plus targeted checks: load file / undo / Clips launch / Simple mode round-trip / backup restore — all four restoration paths |
| 6 | E1–E5 | low | `node --test tests/updater.test.js`; one Mac and one Windows build |

**Do not** attempt phases 3–6 without phase 0 in place. The file has no compiler and no tests; the smoke test is the only safety net, and it costs about a hundred lines.

---

## 8. What was not reviewed

- The ~3,500 lines of drawing code for generators (`composeGeo`, `makeBloom`, `drawLineArt`, `vecMesh`, `particles`, `text3d` …) and the GLSL in `FS` (`2000`) — read only for interface and allocation patterns, not for correctness or visual bugs.
- Per-module control UIs beyond the ones quoted.
- MIDI clock arithmetic (`clipsClock`, `quantize`, `beatSeconds`) and the Clips controller layouts.
- Anything requiring a browser run: actual leak growth over a long session (a heap snapshot workflow would be the right tool), GPU memory, frame timing numbers. **No code was executed and no browser was driven for this review** — every claim above comes from reading, which is why each item carries a verified/suspected tag.
