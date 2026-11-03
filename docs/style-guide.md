# ...Seeds Style Guide

Updated Oct 12, 2026. Living version: https://claude.ai/code/artifact/bfd56cb2-5699-4faf-92bf-8db700a0cf53

## Overview

...Seeds looks and behaves like a tidy modular synth on a workbench: soft-colored modules sit on a dotted canvas, joined by fat, color-coded patch cables, with a black "glass" screen showing the result. Everything is drawn from one small set of color tokens, so a whole new look (a "skin") is just a different set of values.

Five principles carry across every screen:

- **Friendly before powerful.** Simple mode comes first on touch devices and hides everything advanced. Labels are plain English ("Start camera", "Back to live"), never jargon.
- **Color means signal type.** Orange is video, teal is audio, purple is modulation, pink is triggers/gates, red is recording. This never changes between skins, only the shades do.
- **Color also means family.** Each module category has its own pastel panel tint, so a patch reads like a map at a glance.
- **Calm surfaces, loud signals.** Panels are quiet and low-contrast; only live state (recording, armed, queued, selected) gets saturated color.
- **Nothing is lost silently.** Hidden things are "hidden, not deleted", unsaved takes ask before clearing, closing the app asks first, and every edit can be undone.

The app is one self-contained HTML file (`seeds/desktop/app/index.html`) wrapped in Electron for Mac and Windows, and published as a web app. Fonts are IBM Plex Sans Condensed (Pastel skins) and Futura/Jost (Minimal and Neon skins).

## Color palette

All color comes from CSS variables on `:root`; skins only swap their values. The default skin is **Minimal** (white, square, line art); the original look is **Pastel**, shown below in light and dark.

### Surface and text tokens (Pastel)

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `--bench` | #d6dbe4 | #272a2f | App background, the "workbench" behind the patch |
| `--dot` | rgba(60,70,95,.16) | rgba(255,255,255,.07) | Dot grid on the patch canvas (22 px spacing) |
| `--panel` | #f8f9fb | #373c43 | Bars, menus, modules, cards |
| `--panel-2` | #eef1f6 | #2f343a | Buttons, inputs, hover fill, presets bar |
| `--edge` | #d0d6e0 | #4b5159 | All 1 px borders and dividers |
| `--ink` | #232830 | #e9ebe6 | Main text; fill of "on" buttons |
| `--muted` | #5d6573 | #a5aaae | Labels, hints, secondary text, chevrons |
| `--track` | #dde2ea | #24282d | Slider tracks |
| `--glass` | #050607 | #030405 | Video screens, scopes, meters (always near-black) |

### Signal colors (the same meaning in every skin)

| Signal | Main | Dark (cable ends) | Used for |
| --- | --- | --- | --- |
| Video | #e3962a orange | #9c5f15 | Video jacks and cables, slider accent, focus ring, progress bars |
| Audio | #22958d teal | #16625d | Audio jacks and cables, audio sliders |
| Modulation | #7a58c8 purple (dark #9b80e2) | #4b318e | Mod jacks, modulated values, fader links, Control mode |
| Gate / trigger | #c93d78 pink (dark #e2649a) | #86214c | Gate jacks, pads, lights, MIDI-learn bar |
| Record | #cc3a2c red | — | Record button, recording dots, delete hover, errors |

Meters run green #3aa864 → amber #e0ae33 → red #d8402f. Selection uses hot pink `--selc` #ff3d8b (cyan #00e5ff on black skins).

### Module family tints

Each category tints its modules' `--panel`, `--panel-2` and `--edge`. Light values shown; dark Pastel uses deep versions of the same hues.

| Family | Categories | Panel | Edge |
| --- | --- | --- | --- |
| src (green) | Video inputs | #def9e7 | #a4dab6 |
| gen (aqua) | Generators | #def9f7 | #a4dad6 |
| geo (sky blue) | Video manipulation | #deedf9 | #a4c2da |
| tex (periwinkle) | Color, Texture | #dee2f9 | #a4acda |
| time (lavender) | Delay, time, and memory | #e8def9 | #b8a4da |
| mix (pink-violet) | Mix and route | #f9def9 | #daa4da |
| mon (grey) | Monitoring | #e8ebef | #b8bec6 |
| aud (rose) | Audio to visuals | #f9dee5 | #daa4b2 |
| mod (butter) | Modulation sources | #f9f5de | #dad1a4 |
| gate (lime) | Rhythm and triggers | #edf9de | #c1daa4 |
| util (peach) | Utilities | #f9e9de | #dabaa4 |
| midi (sand) | MIDI | #f3ede5 | #cec2b1 |
| ain (orange) | Audio inputs | #fbe6d8 | #e07a3f |
| afx (magenta) | Audio effects | #f3def3 | #b24fb0 |
| aout (deep blue) | Audio mix and output | #dce8f7 | #3f6fb5 |
| grp (violet) | Groups, custom modules | #ece6f7 | #bcaed8 |

### Skins

Skins live in Settings → Skins. Click to try one; right-click to make it the default.

| Skin | Base | Look |
| --- | --- | --- |
| Pastel (follows your system) | Pastel | Light or dark from the OS |
| Pastel light | Pastel | Always light |
| Minimal (default) | Minimal | White, square corners, black 1 px lines, no shadows; module families shown only as a thick 3.5 px colored border; straight cables |
| Minimal colors | Minimal | Minimal with pastel module fills, grey #cfcfd3 side panels, #ececec patch |
| Monotone | Minimal | Pure black and white; signal colors become greys |
| Minimal black | Minimal | Black background, white lines, bright family borders |
| Minimal colors black | Minimal | Black with deep tinted module fills |
| Neon | Neon | Near-black #05050a, square, glowing borders and titles; signals become amber #ffb000, cyan #00f0ff, violet #b14bff, magenta #ff2bd6 |

Mode tints: Presentation edit mode turns the canvas butter yellow #fbf2d6 with a dot grid; locked turns it lavender #e2e0ef. MIDI learn turns the canvas pink #ffd9e6; Keys learn turns it light blue #d9f2ff.

## Typography

One condensed sans at a 14 px base, with weight doing the work instead of many sizes.

- **Pastel skins:** IBM Plex Sans Condensed (400/500/600), falling back to Arial Narrow and system-ui.
- **Minimal, Minimal colors, Monotone, Minimal black, Neon:** Futura (built into Macs), then Futura PT, Jost (free Futura look-alike from Google Fonts), Century Gothic, Avenir Next. Control rows tighten to 12.5 px with −0.01em tracking.
- **Numbers** always use tabular figures (`font-variant-numeric: tabular-nums`) so values, timers and fps don't jitter.

| Role | Size | Weight | Notes |
| --- | --- | --- | --- |
| App name "...Seeds" (top bar) | 19 px (17 on narrow) | 600 | −0.01em tracking; Neon makes it glowing cyan |
| "start planting" empty-canvas label | 34–76 px (fluid) | 700 | Futura; each letter a different family color |
| Big BPM readout | 30 px | 700 | Tabular |
| Recorder timer | 22–26 px | 500 | Turns red while recording |
| Module title | 17 px | 600 | One line, ellipsis if long |
| Panel / card / menu titles | 15 px | 600 | Recorder, Main view, Simple cards, clip names |
| Body, buttons, menu items | 14 px | 400–500 | Buttons 500 |
| Control rows, ports, status | 13 px | 400 | Label in `--muted`, value in `--ink` |
| Hints, counts, sub-labels | 12–12.5 px | 400 | Always `--muted` |
| Section header in module list | 12 px | 700 | UPPERCASE, +0.08em tracking, underline rule |
| Badges (ON, F1, key maps) | 9.5–11 px | 700 | Pills, +0.04em tracking |

On touch screens, inputs and selects jump to 16 px (stops phones zooming in) and Simple-mode control rows go to 15 px.

Voice: short, friendly sentences in second person. Tooltips explain what happens ("Drag to resize. Double-click for the usual layout."). Hints say what to do next ("Your takes will appear here."). Menus end with "…" when they open a dialog, and "▾" when they drop down.

## Layout and structure

The screen is a fixed frame: a top bar across the full width, then four columns side by side. Nothing scrolls the page itself; each region scrolls inside its own box.

```
+--------------------------------------------------------------------------------+
| Top bar: ...Seeds · mode switch · name · File · Settings · Examples · Help ·    |
|          fps/CPU · MIDI learn · Keys · zoom                                     |
+----+------------------------------------------+--+-----------------------------+
|    | Presets bar (Patch mode only)            |  | Main view                   |
| M  +------------------------------------------+  |  Stage bar: source,         |
| o  | Work area                                |D |  Snapshot, Full screen,     |
| d  |  Patch canvas: dotted grid, modules,     |i |  Output window              |
| u  |  cables. Swaps to Presentation, Simple,  |v |  Black video screen         |
| l  |  Control or Clips with the mode switch   |i |  Format bar: Shape, Size,   |
| e  |                                        o |d |  Fit                        |
| s  |                                        o |e +-----------------------------+
|    |                                        o |r | Recorder                    |
|    |                                        o |  |  Record, timer, audio source|
|    |            dock jacks feed the right side|  |  Level meter, takes list    |
+----+------------------------------------------+--+-----------------------------+
```

| Region | Position | Size | Contents |
| --- | --- | --- | --- |
| Top bar | Full width, top | Auto height, 9×12 px padding | App name, mode switch, patch name, File, Settings, Examples, Help, fps/CPU, MIDI learn, Keys, zoom |
| Presets bar | Above the patch only | Auto | Presets dropdown, Rename, Delete, Capture, Update |
| Module drawer | Far left | 38 px strip; opens a 300 px panel (220–560 px, drag to resize) that floats over the patch | Quick access, categories, Custom, Canvas, All modules |
| Work area | Center | Fills remaining width (min 240 px) | Patch canvas, or the Presentation, Simple, Control or Clips view |
| Divider | Between center and right | 8 px | Drag to resize; double-click resets; ‹ › buttons collapse either side |
| Side column | Right | 42% of width by default | Main view (stage bar, black video, format bar) above the Recorder dock |

Either side can collapse into a 38 px vertical strip with rotated text ("Patch", "Main view"); click the strip to bring it back. A 10 px frame band runs along the bottom of the work area.

**Spacing:** 4–8 px between related controls, 10–12 px inside panels, 12–16 px around grids of cards. Control rows are a 3-column grid: 62 px label · flexible slider · 64 px value.

**Corners:** 10 px on modules, cards, panels and dialogs; 8 px on menus and docks; 6 px on buttons and inputs; 5 px on small chips; fully round (999 px) on preset chips, badges and fps pills. Minimal and Neon skins force every corner to 0, except jacks, swatches and lights, which stay round.

**Shadows:** one shadow token, `--shadow` = a 1 px white inner top highlight plus a soft 12/26 px drop shadow below. Used on modules, cards, menus, docks and dialogs. Minimal skins remove all shadows; Neon replaces them with a colored glow.

**Borders:** 1 px `--edge` everywhere. Empty slots use 2 px dashed borders. Selected or armed things get a 2–3 px outline offset 3 px outside the box.

**Responsive:** under 760 px wide the main view stacks above the work area. The top bar sheds padding and hides Fit and separators at 1340 px, 1500 px and 1700 px breakpoints. On touch screens (coarse pointer) Simple mode becomes a single column: main view on top sized to the screen with a drag grip under it, effects scrolling below; wide landscape tablets put the view on the left and effects on the right.

## Components

### Modules (patch nodes)

- 250 px wide card, `--panel` fill in its family tint, 1 px family-colored edge, 10 px corners, `--shadow`.
- **Title bar** (7×12 px padding, grab cursor): optional pink on/off gate jack · fold chevron (12 px SVG, rotates −90° when collapsed) · title 17 px/600 · optional extra buttons · **ON** pill · **×** remove (19 px, muted, fills `--panel-2` on hover).
- **Ports strip** under the title: inputs on the left, outputs on the right. Each jack hangs half outside the card edge (−10 px margin) with a 13 px muted label.
- **Body:** a grid of control rows, 9 px apart, 10×12 px padding.
- **Resize grip:** 18 px striped triangle, bottom-right, 60% opacity.
- **Selected:** 3 px hot-pink outline offset 3 px, pink-tinted header, 7% pink wash over the whole card, deeper shadow.
- **Bypassed (OFF):** body and ports fade to 45% opacity.
- **Recording:** an 8 px red dot after the title.

### Jacks and cables

- **Jack:** 20 px circle drawn as a socket: black center (4 px), dark grey ring, then the signal color, with a 2 px ring in the panel color and a small drop shadow. Crosshair cursor. Slider modulation jacks are 16 px and sit just left of each slider row.
- **Drop target:** while dragging, valid jacks gain a 5 px glow ring in their own color.
- **Cable:** four stacked strokes: a 7 px soft shadow 4 px below, the 5.5 px colored line (4 px for mod/gate), a 1.4 px white sheen 1.3 px above, and 5 px dark-colored dots on both ends. Rounded caps.
- **Cable shape:** a hanging curve that sags more the longer it gets (sag = 20 + 22% of the length, max 110 px). Minimal skins draw straight 2.5 px square-capped lines; control cables become 2 px dashes.
- Cables sit above modules so they're always visible; a 16 px invisible hit area makes them easy to grab.

### Controls

| Control | Look |
| --- | --- |
| Slider row | Label (muted) · native range slider tinted orange (teal in audio modules) · right-aligned value; click the value to type one. Modulated values turn purple and bold, with a 3 px purple tick under the slider showing the live position |
| Toolbar button `.tb` | `--panel-2` fill, 1 px edge, 6 px corners, 6×11 px padding; border darkens on hover; **on** = filled `--ink` with panel-colored text |
| Segmented switch | Joined buttons in an 8 px rounded box; the selected segment fills `--ink` (mode switch, view toggles) |
| Dropdown | Full-width, `--panel-2`, 5 px corners, 13 px text |
| Record button | 15 px/600, red 13 px dot + "Record"; while recording fills red, dot becomes a white square; amber when paused |
| Pad | 68 px tall, 17 px/600, 10 px corners; fills gate-pink while held |
| Toggle button | 54 px tall, 18 px/700 letter-spaced; fills with the family edge color when on |
| ON/OFF pill | 20 px tall, 10.5 px/700; filled family color = ON, hollow muted outline = OFF |
| Lights | Row of 16 px circles; pink at 55% when on, 100% when hot |
| Screens, scopes, meters | Always on `--glass` black with 6 px corners; screens are 16:9 |
| Chips | Pill-shaped preset chips; the active one fills `--ink` |
| Color picker | Full-width swatch input plus 22 px square swatch |

### Overlays

- **Menus** (File, Settings, Examples, right-click): `--panel`, 1 px edge, 8–10 px corners, `--shadow`, 4–6 px padding. Items are full-width text buttons, 7×10 px padding, `--panel-2` fill on hover. Groups are split by thin rules and bold 14 px section heads. Keyboard hints sit right-aligned in muted 12 px.
- **Dialogs:** centered card up to 420 px wide on a 28% black scrim, 15 px text, buttons right-aligned. Buttons name the action ("Clear" / "Keep them"), never just OK/Cancel.
- **Toast:** small `--ink` pill centered 14 px from the top of the patch, 13 px text, disappears on its own.
- **Hint:** muted note bottom-left of the patch with a × to dismiss (toggle in Settings).
- **Help:** a full-window overlay inset 24 px with a 3 px black border, showing the guide.
- **Learn bar:** a pink banner at the top with instructions and a Done button while MIDI learn is on.

## Menus and where things live

Rule of thumb: **File** holds things you do to the whole patch, **Settings** holds things that rarely change, **right-click** holds things you do to what's under the pointer, and anything used while performing sits directly on screen.

### Top bar (left to right)

1. **...Seeds** name
2. **Mode switch:** Simple · Patch · Presentation · Control · Clips
3. **Patch name** (click to rename, looks like plain text until hovered)
4. **File ▾**
5. **Settings ▾**
6. **Examples ▾**
7. **Help**
8. Spacer, then **fps** and **CPU** pills (green/amber/red; CPU flashes pink when overloaded)
9. **MIDI learn** and **Keys** (learn modes)
10. **Zoom:** − · 100% · + · Fit

### File menu

| Group | Items |
| --- | --- |
| Patch | New (Cmd/Ctrl+N) · Open… (O) · Save (S) · Save as… (Shift+S) |
| History | Undo (Z) · Redo (Shift+Z) |
| Examples | Save as Example… |
| Custom modules | Export custom modules… · Import custom modules… |
| Storage | Choose save folder… (shows the current folder underneath) |
| Personal | For Emmanuelle (italic pink; plays a heart animation) |

### Settings menu (320 px, sections split by rules)

| Section | Contents |
| --- | --- |
| General | Checkboxes with a bold title and a one-line muted explanation: Show tips · Default to camera on · Simple mode only · Patch main view to record video · Hide Examples · Hide recorder |
| Recording | Format · Quality (2.5–20 Mbps) · Frame rate (24–60 fps) · Size (same as main view, HD, Full HD, square, vertical, 4K) · Audio bitrate |
| Sound | Status line · Start audio / Restart audio · Test tone 1 / Test tone 2 / Copy sound report · Output device · Latency (Low, Balanced, Safe) · ASIO advice |
| MIDI | Controller (which input to listen to) |
| Performance | Quality (Full / Draft) · GPU info · Smooth external display (Windows) · Record with the graphics card · Generators redraw rate |
| Backups | Automatic earlier versions with Restore buttons |
| Skins | Radio list with four color dots per skin; "Default" pill marks the default |

### Examples menu (360 px)

Cards with a bold name and a muted one-line description, in three groups: **Your examples**, **Patches**, **Simple mode**. Each has a × to remove it; a "Show removed examples again" button appears when any are hidden.

### Module drawer (left)

Top to bottom: **Quick access** (big buttons for starred modules; defaults Camera, Output window, Screen, Mirror, LFO) → section **VIDEO**: Video inputs, Generators, Video manipulation, Color, Texture, Delay/time/memory, Mix and route, Monitoring → **CONTROL**: MIDI, Modulation sources, Rhythm and triggers, Utilities → **AUDIO**: Audio inputs, Audio effects, Audio mix and output, Audio to visuals → **CUSTOM**: Custom modules, Canvas (Box, Comment, Logo), All modules (A–Z). Categories are collapsible tinted rows with a count; items show a colored signal dot and a ☆ to pin to Quick access. Header has **Expand all**.

### Presets bar (above the patch)

Presets dropdown · Rename · Delete · preset chips · Capture · Update.

### Main view (right)

- **Stage bar:** collapse chevron · "Main view" · resolution info · Showing ▾ (live output or a take) · Snapshot (camera icon) · Full screen · Output window.
- **Format bar:** Shape (16:9, 4:3, 3:2, 1:1, 4:5, 9:16, 21:9) · Size (480p–4K) · Fit (crop or black bars).
- **Recorder dock:** collapse · "Recorder" · status · Record + timer + settings summary (click opens Settings) · Record audio + audio source · level meter · **Takes and stills** list with Back to live, Save all and Clear.
- **Dock jacks** on the patch's right edge feed the main view and recorder: Rec. Video, Rec. Audio, Rec. on/off, Rec. pause (red-bordered pills; the audio one doubles as a level meter).

### Mode-specific bars

| Mode | Bar contents |
| --- | --- |
| Simple | "Simple mode" · short instruction · Tempo + Tap · Effect slots − n + |
| Presentation | Lock layout (yellow when unlocked) · status badge · Tidy up · Hidden modules (n) ▾ |
| Control | A fader bank docked along the bottom: Control faders · Lock · − n + · instructions; vertical purple faders numbered 1–n |
| Clips | Tempo · Tap · Sync · Launch quantize · Clips count · Notes layout · Save/Export/Import layout · Import/Export set (extras collapse behind a chevron) |

### Right-click menus

| On | Items |
| --- | --- |
| A control in a module | Hide/Show "label" in Presentation · Show only "label" in Presentation · Show all of this module's controls |
| A module or selection | Hide/Show this module in Presentation · Make custom module… · Encapsulate into a group · Copy · Duplicate · Paste · Delete · Select all |
| A group | Open group · Rename group · Save as custom module · Ungroup |
| Empty patch | Select all · Patch background color… · Reset background color · Back to the main patch (inside a group) |
| A Control fader | Unlink each linked control · Unlink all |
| A skin | Make it the default |
| A custom module | Export… · Delete |
| A clip's note button | Clear the note |

## Behaviors and interactions

### The five modes

| Mode | What it's for | Behavior |
| --- | --- | --- |
| Simple | Beginners and touch screens | Camera → up to 6 effect slots → screen and recorder. Each card shows its first 3 controls; the rest hide behind "More controls". Empty slots are dashed cards with an effect picker (Shape and space, Color, Texture, Time and memory). Removing a slot hides it, it doesn't delete it. Phones and tablets start here. |
| Patch | Building | Free canvas with modules and cables. Shares its patch with every mode except Simple. |
| Presentation | Performing | The same modules as tidy 300 px panels you arrange, with only chosen controls showing. Unlocked = editing (yellow dotted canvas, drag headers, Hide/Show pills per control); locked = clean lavender surface, nothing moves. Cmd/Ctrl+E toggles the lock. |
| Control | Hardware-style faders | A bank of numbered faders. Drag a fader's jack onto any slider's purple jack to link it; one fader can drive many controls. The patch can't be edited here: cables show at 32% opacity and modules can't move. Linked rows get a purple "F1" badge. |
| Clips | Live patch switching | A grid of clip cards (4 columns, 2–32 clips). Click or play a MIDI note to launch. Each clip picks Crossfade (seconds), Fade in beats, or Cut. States: Empty (dashed) · Ready · Waiting for the beat (blinking pink) · Fading in (amber) · Playing (green). Can follow MIDI clock. |

### Patching

- Drag from an output jack to an input jack. Valid targets glow.
- Drag a patched input to move its cable; drop on empty space to unplug. Double-click a cable to delete it.
- Option/Alt-click while drawing a cable to add a bend point; Option-drag an existing cable to bend it. Bend handles appear only while Alt is held.
- Every slider has a small purple jack on its left for modulation.
- The four dock jacks on the right edge feed the main view and recorder.

### Canvas

- Drag the background or two-finger scroll to pan; pinch or Cmd/Ctrl+scroll to zoom (a mouse wheel zooms around the pointer). Shift+scroll pans vertically.
- Click a module in the drawer to add it to the middle of the view (with slight random scatter); drag it to drop it exactly. A ghost follows the pointer after 6 px of movement.
- Shift-click or Shift-drag (lasso, dashed orange) to select; right-click to group, copy or delete. Delete/Backspace removes the selection.
- Double-click a title bar to collapse a module to just its header (some keep one key control visible).
- Double-click a panel title to rename it.
- An empty patch shows "start planting" in huge multicolored letters until something is added.
- Canvas decorations: Boxes (colored outlines with a title), Comments (sticky notes), Logos.

### Keyboard

| Keys | Action |
| --- | --- |
| Cmd/Ctrl+N / O / S / Shift+S | New / Open / Save / Save as |
| Cmd/Ctrl+Z, Shift+Z or Y | Undo, Redo |
| Cmd/Ctrl+C / V / D | Copy, Paste, Duplicate modules (not in Simple or Presentation) |
| Cmd/Ctrl+E | Lock or unlock Presentation |
| Cmd/Ctrl+M | MIDI learn |
| Cmd/Ctrl+K | Keys learn (map computer keys to pads and buttons) |
| Delete / Backspace | Delete selected modules |
| Esc | Close a menu, cancel an edit |
| Enter | Confirm a rename or typed value |
| F (output window) | Toggle full screen |

Shortcuts never fire while typing in a field.

### Learn modes

- **MIDI learn:** the canvas turns pink, a pink banner explains what to do, sliders and pads get dashed outlines. Click a control (solid pink outline = armed), move a knob; mapped controls get a pink " •" after their label.
- **Keys learn:** the canvas turns light blue; mapped buttons show a small blue key badge in their top-right corner.

### Feedback and safety

- Hover reveals secondary buttons (× on notes, ☆ on modules, Hide pills); on touch screens they're always visible.
- Recording shows a red dot on the Recorder title and the module, a red timer, and the Rec. on/off pill fills red. Pause turns the button amber.
- Toasts confirm quiet actions ("Hidden in Presentation.", "Saved all takes.").
- Destructive actions ask with a named-button dialog ("Clear" / "Keep them"). Closing the desktop app with unsaved work asks "Keep ...Seeds open" / "Close without saving".
- Backups are saved automatically and restoring can be undone.
- Layout choices (drawer width, collapsed panels, open categories, skin) are remembered between sessions.

### Motion

Motion is minimal and quick: 0.12–0.15 s for chevrons and hover reveals, 0.25 s for background tint changes, 0.06 s linear for level meters. Fold chevrons skip animation when the system asks for reduced motion.

### Touch

On coarse pointers: buttons are at least 42 px tall, Simple-mode headers 44 px, slider rows 40–46 px, Record 52 px. Effect cards go to two columns, then one under 640 px.

## Brief template

Paste this at the start of a new chat when building another app, then add what's specific to that app.

```markdown
Style this app like ...Seeds (repo matthettich/seeds-working, seeds/desktop/app/index.html; full guide in docs/style-guide.md).

Feel: a tidy modular synth on a workbench. Calm, soft surfaces; only live signals and states get strong color. Friendly plain-English labels; tooltips explain what happens.

Tokens (CSS variables on :root, swapped per skin):
--bench #d6dbe4, --panel #f8f9fb, --panel-2 #eef1f6, --edge #d0d6e0, --ink #232830, --muted #5d6573, --glass #050607 (screens).
Signals: video #e3962a orange, audio #22958d teal, modulation #7a58c8 purple, gate/trigger #c93d78 pink, record #cc3a2c red. Selection #ff3d8b.
Each module family gets a pastel panel + matching edge (e.g. green #def9e7/#a4dab6 for inputs, aqua for generators, lavender for time, butter for modulation).

Type: IBM Plex Sans Condensed 14px base (Futura/Jost in Minimal and Neon skins). Titles 15-17px/600, labels 13px muted, hints 12.5px. Tabular numbers. Section heads 12px uppercase +0.08em.

Shape: 10px corners on cards, 6px on buttons, pills for chips and badges. One soft shadow with a 1px white top highlight. 1px borders. Dotted canvas (22px grid). Minimal skin = white, black 1px lines, square corners, no shadows.

Layout: top bar (name, segmented mode switch, File/Settings/Examples dropdowns, Help, fps/CPU pills, learn buttons, zoom) > collapsible 38px module drawer on the left > main work area > draggable divider > right column with a black main view and a recorder dock. Sides collapse into 38px vertical strips.

Components: modules with title bar (fold chevron, title, ON pill, x), ports strip with 20px socket jacks hanging over the edges, control rows (label | slider | value). Fat hanging cables with shadow and sheen, colored by signal.

Behavior: right-click for actions on the thing under the pointer; File for whole-document actions; Settings for rarely-changed options with a one-line explanation under each. Undo everything, autosave backups, ask with named buttons before anything destructive, toasts for quiet confirmations. Learn modes tint the whole canvas. Touch: 42px+ targets and a single-column Simple mode.

Skins in Settings: Pastel (auto/light), Minimal (default), Minimal colors, Monotone, Minimal black, Minimal colors black, Neon. Click to try, right-click to make default.
```
