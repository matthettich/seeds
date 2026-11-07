# Handoff notes for a fresh chat

Start a new chat with: *"Clone matthettich/seeds and read HANDOFF.md, then …"* (`seeds-working` is retired; its history stays there, read-only).

## Where things go (Nov 3)
- **One public repo, `matthettich/seeds`.** The app is the root `index.html` (with `sw.js`, `manifest.webmanifest`, `icons/`); GitHub Pages serves `main` as the live app at https://matthettich.github.io/seeds/.
- **Beta:** everyday work goes on the `beta` branch. Every push to it runs `.github/workflows/beta-web.yml`, which copies it into `beta/` on `main` (`tools/make-channel.sh`: own SW cache `seedsbeta-v*`, "(beta)" in the title). URL: https://matthettich.github.io/seeds/beta/. Beta shares saved patches and settings with the live app (same site) in a browser and on Android, so a patch saved in beta may not open in live until the merge. On iPhone/iPad each Home Screen app has its own storage, so an installed beta and an installed live app don't share; move patches with Save / Load.
- **Release to live:** merge `beta` into `main`. Never edit `beta/` by hand.
- **Hotfixes (owner, Nov 3):** the users are few and use Seeds live on stage, so a critical bug with a small, clear fix goes straight onto `main` (live), then `main` is merged into `beta`. Everything else goes through beta first.
- **Desktop:** `desktop/` (`copy-app.js` copies the root app into `desktop/app/` before every run and build; that folder isn't committed). Releases are on this repo's Releases page with the built-in token (no `RELEASE_TOKEN` any more). A beta desktop build: Run workflow from `beta` with a version like `1.1.0-beta.1`; any version with a `-` is published as a pre-release automatically (typed in or pushed as a tag), and the pre-release box forces it for any version. Installed copies never update to a pre-release.
- **Tests:** `node --test tests/updater.test.js` (the updater's SHA-256 download check, ported from ...Thunder Plus, and the installer-build fallback). The desktop workflow runs them before every GitHub build; local `npm run dist:mac` / `dist:win` builds don't, so run the command yourself first.

## Who / what
- Built for Emmanuelle, who prefers simple software → Simple mode must stay uncluttered and touch-friendly (Galaxy Fold6 was a target).
- User tests on: Windows laptop (Intel Core Ultra 9, RTX 4070 Laptop GPU, audio interface on ASIO) and MacBook Pro M4. Mac ≈120 fps, Windows was ≈33–50 fps.
- User is not a developer: give spelled-out build steps (PowerShell vs Command Prompt, `cd` paths, file sizes to check), and always say which files changed (just the HTML, or `main.js`/`preload.js` too).

## Nov 5 hotfix — desktop v1.1.1
- 4K recording on a MacBook Neo (A18, 8 GB) failed with "MP4 failed" and fell back to WebM (VP8 is CPU-encoded, so worse at 4K).
  Now an encoder failure above 1080p retries H.264 one size down (4K → 1440p → 1080p; `retry.maxH`, picture unchanged),
  WebM never records above 1080p, and the H.264 level uses the real recording fps (`recFps`). On `main`, fast-forwarded
  into `beta`; desktop v1.1.1 released (Run workflow with a version — pushing tags from Claude sessions is blocked).
- Not done: writing takes to disk as they record in the desktop app (takes are held in memory until Stop).

## Nov 3 review (senior code review + fixes)
- **Released Nov 3 (owner: "build a desktop release with everything as well as push to main"):** `beta` merged into `main` (live web app) and desktop **v1.1.0** published as the latest release (installed copies update to it). Beta desktop v1.1.0-beta.1 was the pre-release before it. Test punchlist: https://claude.ai/artifact/4S9NAf8QNqdQwFtH6RKwVj
- **Live (`main`) hotfixes:** frame loop can't freeze (next frame booked first; each module's render caught on its own);
  Tint GPU leak (`n._gt` was both GPU pictures and a timestamp; timestamp is now `n._genT`); deleted audio modules unplugged
  and Presentation panels removed in `removeNode`; Delete/copy/paste only in Patch mode (`patchEditable()`); a broken patch
  file or autosave never wipes/overwrites (autosave copy goes to Settings → Backups); mic start has a request token like
  the camera; Record can't double-start (`recActive`, `recBusy`); Video mixer keeps cables into hidden inputs.
- **Beta:** everything else from the review — GPU upload textures owned per module (always `texImage2D`: `texSubImage2D`
  takes Chrome off its fast video path and blocked the main thread), shader failures cached, Restart audio keeps mic /
  video player / reverb / distortion, `syncAudio` only rewires when audio connections change, audio modules have
  `destroy`, GIF/Image/Stutter/Looper/Reverb memory and CPU fixes, cables not redrawn when unchanged, preset delete fixes
  morph indexes, clip slots/examples store copies, MIDI clock median tempo + Stop/Continue, quantize keeps beat position
  across tempo changes, undo history capped by size, `removeNodes()` for batch deletes, `pointerSession()` drag helper,
  single-instance desktop app, updater stream/reader cleanup.
- **Luma key:** the switch's label was backwards; the *label* changed to "Key out dark parts" (picture unchanged, so
  saved patches look the same).
- **Clips set and your examples → IndexedDB (beta):** `bigStore()` (next to `idb()`) keeps them in IndexedDB (`seeds`/`kv`,
  keys `videopatch:v1:liveset` / `:examples`), one write at a time, latest wins; loads after start (`liveLoaded` guards
  saves until then). Because live and beta share the site, beta also writes the localStorage copy the live app reads,
  but only when it's under 1.5 MB (`MIRROR_MAX`), with a `key:at` note (time + fingerprint). At start beta uses the newer
  copy; a localStorage copy changed by the live app counts as newer (beta's old one kept as `key:prev` in IndexedDB).
  The localStorage key is never deleted. No IndexedDB (private window) → localStorage as before. A set over 1.5 MB is
  only in IndexedDB, so the live app keeps showing its older copy until this is released. Fonts were already in IndexedDB;
  custom modules stay in localStorage (small: no logos/data inside). Tests: `clipsdb/run.js` (8 MB set, migration,
  early Clips mode, no IndexedDB, newer copy wins, one write in flight, export/import, examples).
- **Not done yet:** drive frames from a Worker/output window
  when the web tab is hidden (Electron is fine); bigger structure work (one mode state machine, recorder session object,
  shared audio-effect builder). Test scripts used: smoke test + targeted Playwright checks (headless, fake camera/mic).

## The app file (`index.html`, ~9.7k lines, ~886 KB)
Single file, no dependencies. Landmarks (line numbers approximate):

| Symbol | ~Line | Role |
|---|---|---|
| `STORE = 'videopatch:v1'` | 1246 | localStorage key; also `:custom`, `:liveset`, `:examples`, `:outfmt`, `:mview`, `:minidock`, `:lbarmin`, `:rcoll`, `:cliplayouts`. IndexedDB db `seeds` / store `kv` (saveDir, curFile, fonts, and via `bigStore` the Clips set `:liveset` + `:examples`, mirrored to localStorage when small). |
| `FAMILY` | 1345 | module → colour family (e.g. `particles:'tex'`). |
| `ctlOut` / `ctlRaw` | 1364 | control value of an edge (with `modoff` Offset). |
| `GLX`, `gpu(n, frag, inputs, uni, W, H, key)` | 1626 / 1726 | WebGL2 pipeline. Unused texture units are cleared before each pass (fixes feedback-loop black output). |
| `readIn` | 1808 | read a control input with default. |
| `OUT`, `picDims`, `outDims`, `genSize` | 1825 | **One picture size for the whole app** (Size under the main view: 720p / 1080p default / 1440p / 4K; Shape sets proportions). Generators draw at `picDims()` (× `QS` in Draft), Feedback/Particles cap at it, `conformOut` brings the main picture to it for snapshots, recordings and output. Generators and the camera have no Size menu of their own any more (old `res` params are ignored). |
| `FS` | 1875 | fragment shaders. Feedback shader has a `nest` mode (index 5) for "Camera at screen". |
| `edgeInto`, `inputRaw`, `pullNode` | 2703–2777 | graph evaluation. `edgeInto` uses a Map rebuilt when `edgeVer` changes. |
| `applySink` | 2832 | output audio device (`setSinkId`). |
| `DEFS` | 3052 | **all module definitions** (`title, kind, w, ins, outs, params, …`). Cable kinds: video / audio / mod / gate. |
| `startRec` | 6181 | MediaRecorder at the picture size (no separate recording size). `captureStream(recFps)` at fixed fps (fps 0 broke H.264). Tries H.264 (avc1.4D40xx level by size) MP4 variants → WebM VP8; remembers `settings.mp4ok`. Size/Shape are locked while recording. |
| `setMode` | 8102 | modes (see below). |
| `settings` | 8118 | persisted settings object. |
| `MODULE_HELP` | 8191 | help text per module. |
| `userExamples`, `EX_N` | 8548 | examples (userExamples must be declared before EX_N). |
| `QUANTS`, `remapPatch`, `clipLaunch`, `LAYOUTS` | 9176–9271 | Clips mode: quantize, patch remap, launch, controller layouts (launchpad/push/mpc/mini), MIDI clock (`clipsClock`), camera handoff (`sharedOut`). |
| `EMM_PHOTO`, `EMM_WINK` | 9573 | base64 photo for File → For Emmanuelle (line-art heart fades in 3 s, face winks). |
| `conformOut`, `camHeight`, `picChanged` | 9584 | picture brought to the chosen size/shape (`view` = main view only, skips scaling when the shape follows the video); camera asks for the smallest 16:9 size covering the picture and restarts when Size changes. |
| `frame()` | 9750 | main render loop. |

### Modes (UI name → internal)
Simple → `simple` · Patch → patch · Presentation → `perform`/`perf` · Control → `sliders`/`bank` · Clips → `live`.
All but Simple share one patch. Control mode: patches can't be edited when locked; faders are dragged onto module rows (`bankDrag`, `rowAt`, `.banktarget`, `bankCtl` steps through menu options).

### Adding a module
1. Add an entry to `DEFS`. 2. Add to the module list + Simple lists (category such as Texture). 3. Add to `FAMILY`. 4. Add `MODULE_HELP` text. Latest added: `particles` (inputs `in` video, `burst` gate; params density, size, bright, thresh, shape, color source/single, motion, drift, spring, gravity, scatter, trails, glow).

## Desktop wrapper (`desktop/`)
- `main.js`: Chromium switches — `ignore-gpu-blocklist` always; `enable-gpu-rasterization`/`enable-zero-copy` only off Windows (they caused HDMI tearing). Windows: `disable-accelerated-video-encode` unless `hwEncode` setting; `force_high_performance_gpu` only when "Smooth external display" (`gfxCompat`) is off. Permission allow-list, close warning (`will-prevent-unload`: "Keep ...Seeds open" / "Close without saving"), recordings to `Documents/Seeds Recordings`, minimize = Alt+Cmd/Ctrl+M.
- IPC: `seeds:getHw`, `seeds:setHw`, `seeds:relaunch`, `seeds:getGfx`, `seeds:setGfx`, `seeds:upd-state` / `-check` / `-act` (+ `seeds:upd` events).
- `preload.js` exposes `window.seedsNative` { platform, onSaved, getHwEncode, setHwEncode, relaunch, getGfxCompat, setGfxCompat, updates }.
- Electron ^33.2.1, electron-builder ^25.1.8, appId `app.seeds.video`. Icon: "Shard burst" (salmon/teal).

## Releases and auto-update (Oct 13)
- `desktop/updater.js` (electron-updater, pinned 6.6.2; checks each Mac/portable download against GitHub's SHA-256 when the release lists one; older releases with no digest skip the check) + `publish` in package.json → GitHub provider, repo `matthettich/seeds` (public). Same logic as ...Thunder Plus (Oct 19):
  Windows installer downloads in the background, then Restart now / Later. Mac (unsigned): "x.y.z is out" → Download fetches the release's `.dmg` for this Mac's chip (`-arm64` / `-x64`) into Downloads with progress, opens it, offers Quit. If electron-updater can't check, it asks GitHub's API (`releases/latest`) instead.
  The page hears about it through `preload.js` → `window.seedsNative.updates` {state, check, act, on} (IPC `seeds:upd*`): an **Update** button in the top bar (Update / Update n% / Install / Restart to update) and File ▾ → Check for updates… (shows the version). The website has no `seedsNative`, so neither shows there.
- `.github/workflows/desktop.yml`: manual run with no version = test build, artifacts only; manual run with a version, or a pushed tag `vX.Y.Z` = version set from it, builds, then one job runs
  `gh release create` on `matthettich/seeds` with every file (incl. `latest.yml`, `latest-mac.yml`, `.blockmap`, Mac `.zip`). Uses the built-in token; only the release job can write (the build job's token is read-only and isn't kept by checkout). Versions with a `-` become pre-releases.
- Electron stays on 33 on purpose (GPU switches tuned for it); bump deliberately and test HDMI output on Windows.

## Web
`sw.js` is network-first for index.html and keeps the last good page for offline use. The live worker's scope covers `beta/` too, so it skips the `beta/` and `stable/` folders, and each copy only deletes caches with its own prefix (`seeds-v*` live, `seedsbeta-v*` beta).

## Open issues / next ideas
- **HDMI scan lines on Windows external monitor** (not in web app): waiting to hear whether "Smooth external display" fixed it. Next step: a dedicated Electron output window timed by the main process.
- **Saved recordings look worse than in-app on Windows**: likely VP9-in-MP4/player issue; suggested VLC. Possible feature: auto-convert takes to H.264.
- **ASIO**: browsers can't use ASIO directly; Sound settings offer device choice, latency, test tones. Real ASIO support would be a native add-on (big project).
- Frame-exact capture (requestFrame) was tried and reverted (only 1–2 frames captured).
- **Picture size (Oct 19)**: snapshots/recordings used to be the patch's own size (generators and camera defaulted to 720p, max 1080p; 4K only stretched). Now everything follows Size. Still capped on purpose to save memory: Video delay / Stutter (960 wide), Slit-scan (640), Looper (640). 4K recording on Windows likely needs "Record with the graphics card" (software H.264 is slow at 4K). Recording quality options now go to 40 / 80 Mbps for 1440p/4K.

## Look and feel
See `docs/style-guide.md` for colors, type, layout, components, menus and behaviors (and a brief to paste when styling other apps like ...Seeds).

## Workflow conventions used so far
- Keep a backup before large edits; test in headless Chromium (Playwright, `/opt/pw-browsers`) for console errors on load and in each mode.
- Deliver by pushing: app changes to `beta` (or `main` for a hotfix). There is one copy of the app (`index.html`); the desktop build copies it in.
