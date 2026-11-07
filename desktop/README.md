# ...Seeds desktop app

## First time on this Mac

    cd ~/Downloads
    rm -rf seeds-app
    unzip -o seeds-app.zip
    cd seeds-app
    npm install
    npm run dist:mac
    open dist

Install from `dist/Seeds-1.0.1-arm64.dmg`: quit Seeds, delete the old Seeds from Applications, open the DMG and drag Seeds to Applications.
If macOS says the app is damaged or can't be opened:  `xattr -cr /Applications/Seeds.app`
If the Dock still shows an old icon:  `killall Dock; killall Finder`

## Updating later (keeps node_modules, no reinstall)

    cp ~/Downloads/seeds.html ~/Downloads/seeds-app/app/index.html
    cd ~/Downloads/seeds-app
    npm run dist:mac

Raise "version" in package.json (for example 1.0.1 → 1.0.2) when you want macOS to clearly treat it as a new build.

## Other commands

    npm start                 # run without building
    npm run dist:mac-intel    # installer for older Intel Macs (build on its own)
    npm run dist:win          # Windows installer (run on the Windows PC)

The app icon is `build/icon.icns` (Mac) and `build/icon.ico` (Windows), made from `build/icon.png`.
