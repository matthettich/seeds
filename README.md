# ...Seeds as an installable app (Android, iPhone, iPad, any computer)

These files turn ...Seeds into a web app you can add to your home screen. It opens full screen with its own icon and keeps working offline once it has loaded.

## Put it online with GitHub Pages (free)

1. Make a free account at https://github.com
2. Click **+** (top right) → **New repository**. Name it `seeds`, choose **Public**, and click **Create repository**.
3. On the next page click **uploading an existing file**.
4. Drag in everything from this folder: `index.html`, `manifest.webmanifest`, `sw.js`, `README.md` and the whole `icons` folder. Click **Commit changes**.
5. Go to **Settings → Pages**. Under **Branch**, choose `main` and `/ (root)`, then **Save**.
6. Wait a minute or two. Your app is at:
   `https://YOUR-USERNAME.github.io/seeds/`

## Install it

- **Android (Chrome):** open the address, tap **⋮** → **Install app** (or **Add to Home screen**).
- **iPhone / iPad (Safari):** open the address, tap **Share** → **Add to Home Screen**.
- **Mac / PC (Chrome or Edge):** click the install icon in the address bar.

Allow the camera and microphone when asked. Phones and tablets start in Simple mode, which is made for touch; turn it off in Settings for the full patch view.

## Updating

Upload the new `index.html` to the same repository (it replaces the old one). Open the app while online and it picks up the update; close and reopen it once if you still see the old version.

## Good to know

- Your patches, presets and settings stay on each device. Use Save / Load to move a patch between devices.
- The app page is public to anyone with the address; your work is not.
- MIDI works in Chrome on Android, but not on iPhone or iPad (Safari has no MIDI support).
