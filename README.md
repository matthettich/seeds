# ...Seeds

A modular video studio in the browser: camera, effects, generators and recording.

- **Live app:** https://matthettich.github.io/seeds/
- **Beta (newest work, may change):** https://matthettich.github.io/seeds/beta/
- **Desktop app (Mac / Windows):** https://github.com/matthettich/seeds/releases/latest — on Windows, installed copies update themselves; on a Mac the app tells you when a new version is out and downloads it, then you drag it into Applications to replace the old one.

## Install it

- **Android (Chrome):** open the address, tap **⋮** → **Install app** (or **Add to Home screen**).
- **iPhone / iPad (Safari):** open the address, tap **Share** → **Add to Home Screen**.
- **Mac / PC (Chrome or Edge):** click the install icon in the address bar.

Allow the camera and microphone when asked. Phones and tablets start in Simple mode, which is made for touch; turn it off in Settings for the full patch view.

## Updating

Open the app while online and it picks up the newest version; close and reopen it once if you still see the old one.

## Good to know

- Your patches, presets and settings stay on each device. In a browser and on Android the beta and the live app share them; on iPhone and iPad an installed beta and an installed live app each keep their own. Use Save / Load to move a patch between devices or between the two.
- MIDI works in Chrome on Android, but not on iPhone or iPad (Safari has no MIDI support).

## For development

See `HANDOFF.md`: the app is `index.html`; work goes on the `beta` branch, which publishes itself to `beta/`; merge `beta` into `main` to update the live app. The desktop wrapper is in `desktop/`.
