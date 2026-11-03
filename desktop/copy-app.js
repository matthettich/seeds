// Copies the web app (the repo root's index.html, manifest and icons) into desktop/app/ for the desktop build,
// so there is one copy of the app to edit. `npm start` and every build run this first.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(__dirname, 'app');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'icons'), { recursive: true });
for (const f of ['index.html', 'manifest.webmanifest']) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const f of fs.readdirSync(path.join(root, 'icons'))) fs.copyFileSync(path.join(root, 'icons', f), path.join(out, 'icons', f));
console.log('desktop/app <- index.html (' + Math.round(fs.statSync(path.join(out, 'index.html')).size / 1024) + ' KB)');
