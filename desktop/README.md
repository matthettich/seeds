# ...Seeds desktop app

Releases are normally built by GitHub (Actions → Desktop app; see `.github/workflows/desktop.yml`).
These steps are for building one yourself. The app itself is `index.html` in the repo root: every build and
`npm start` copies it (with `manifest.webmanifest` and `icons/`) into `desktop/app/`, replacing whatever is there,
so always edit the root `index.html`, never `desktop/app/`.

## First time on this Mac

    git clone https://github.com/matthettich/seeds.git
    cd seeds/desktop
    npm install
    npm run dist:mac
    open dist

Install from `dist/Seeds-<version>-arm64.dmg`: quit Seeds, delete the old Seeds from Applications, open the DMG and drag Seeds to Applications.
If macOS says the app is damaged or can't be opened:  `xattr -cr /Applications/Seeds.app`
If the Dock still shows an old icon:  `killall Dock; killall Finder`

## Updating later (keeps node_modules, no reinstall)

    cd seeds
    git pull                  # or edit index.html in the repo root
    node --test tests/updater.test.js   # GitHub runs these on its builds; local builds don't
    cd desktop
    npm run dist:mac

Raise "version" in package.json (for example 1.0.1 → 1.0.2) when you want macOS to clearly treat it as a new build.

## Other commands

    npm start                 # run without building
    npm run dist:mac-intel    # installer for older Intel Macs (build on its own)
    npm run dist:win          # Windows installer (run on the Windows PC)

The app icon is `build/icon.icns` (Mac) and `build/icon.ico` (Windows), made from `build/icon.png`.
