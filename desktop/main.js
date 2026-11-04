// ...Seeds desktop app: wraps the web app in its own window with native extras.
const { app, BrowserWindow, session, Menu, shell, dialog, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { setupUpdates } = require('./updater');
let updates = { check: async () => false, state: () => null, act: async () => false };
// Use the graphics chip as much as possible for drawing and video.
app.commandLine.appendSwitch('ignore-gpu-blocklist');
// Zero-copy and GPU rasterization speed things up on the Mac, but on some Windows graphics drivers they cause
// striping (scan lines) in the output window, so they're left off there.
if (process.platform !== 'win32'){ app.commandLine.appendSwitch('enable-gpu-rasterization'); app.commandLine.appendSwitch('enable-zero-copy'); }

// Let video and audio start without a click (needed to reopen saved video files).
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.setName('Seeds');

// Windows laptops with two graphics chips: ask for the powerful one (Nvidia/AMD), not the built-in Intel graphics.
// Windows: some graphics drivers' hardware H.264 encoders reject frames from the app ("video encoding failed"),
// so recordings use the software encoder there unless "Record with the graphics card" is turned on in Settings.
{
  let early = {};
  try { early = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'settings.json'), 'utf8')); } catch {}
  if (process.platform === 'win32' && !early.hwEncode) app.commandLine.appendSwitch('disable-accelerated-video-encode');
  // Windows laptops with two graphics chips: by default Windows picks the chip for each screen (like Chrome), which avoids
  // tearing on external displays. Turning off "Smooth external display" in Settings forces the powerful chip instead.
  // Some laptops wire the HDMI port to the built-in chip, and forcing the other chip can make an external screen tear.
  if (process.platform === 'win32' && early.gfxCompat === false) app.commandLine.appendSwitch('force_high_performance_gpu');
}

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
let settings = {};
function loadSettings(){ try { return JSON.parse(fs.readFileSync(settingsFile(), 'utf8')); } catch { return {}; } }
function saveSettings(){ try { fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2)); } catch {} }
const recordingsDir = () => settings.recordingsDir || path.join(app.getPath('documents'), 'Seeds Recordings');

// Camera, microphone, MIDI, full screen and file saving are granted once, like a normal app.
const ALLOWED = new Set(['media', 'midi', 'midiSysex', 'fullscreen', 'window-management', 'fileSystem', 'clipboard-sanitized-write', 'speaker-selection', 'audioCapture', 'clipboard-read']);

let mainWin = null;

function createWindow(){
  mainWin = new BrowserWindow({
    width: 1480, height: 940, minWidth: 960, minHeight: 620,
    title: '...Seeds', backgroundColor: '#272a2f', show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, sandbox: true,
      backgroundThrottling: false // keep rendering when the window is covered
    }
  });
  mainWin.once('ready-to-show', () => mainWin.show());
  mainWin.on('page-title-updated', e => e.preventDefault());
  // Closing (or reloading) with takes that haven't been saved: ask first.
  mainWin.webContents.on('will-prevent-unload', e => {
    const choice = dialog.showMessageBoxSync(mainWin, {
      type: 'warning', buttons: ['Keep ...Seeds open', 'Close without saving'], defaultId: 0, cancelId: 0,
      title: 'Unsaved recordings',
      message: 'You have recordings or stills that haven’t been saved.',
      detail: 'If you close ...Seeds now, they will be lost. Choose Keep ...Seeds open, then press Save all in the recorder.'
    });
    if (choice === 1) e.preventDefault(); // close anyway
  });
  mainWin.loadFile(path.join(__dirname, 'app', 'index.html'));

  // Output windows opened by Screen modules and the main view.
  mainWin.webContents.setWindowOpenHandler(({ frameName, url }) => {
    if (frameName === 'seeds-help'){
      return { action: 'allow', overrideBrowserWindowOptions: { width: 1060, height: 840, title: '...Seeds Help', autoHideMenuBar: true, backgroundColor: '#ececec' } };
    }
    if (frameName && frameName.startsWith('videopatch-')){
      return { action: 'allow', overrideBrowserWindowOptions: {
        width: 960, height: 540, backgroundColor: '#000000', autoHideMenuBar: true, title: '...Seeds output',
        webPreferences: { backgroundThrottling: false }
      }};
    }
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Put each new output window straight onto another display, full screen.
  mainWin.webContents.on('did-create-window', (child, details) => {
    child.setMenuBarVisibility(false);
    if (details && details.frameName === 'seeds-help') return; // the help window stays on this screen
    const displays = screen.getAllDisplays();
    if (displays.length < 2) return;
    const here = screen.getDisplayMatching(mainWin.getBounds());
    const used = new Set(BrowserWindow.getAllWindows().filter(w => w !== child && w !== mainWin).map(w => screen.getDisplayMatching(w.getBounds()).id));
    const target = displays.find(d => d.id !== here.id && !used.has(d.id)) || displays.find(d => d.id !== here.id);
    child.setBounds(target.bounds);
    setTimeout(() => {
      if (child.isDestroyed()) return;
      if (process.platform === 'darwin') child.setSimpleFullScreen(true); else child.setFullScreen(true);
    }, 250);
  });

  mainWin.on('closed', () => {
    mainWin = null;
    for (const w of BrowserWindow.getAllWindows()) w.close();
  });
}

function buildMenu(){
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { label: 'File', submenu: [
      { label: 'Open Recordings Folder', click: () => { fs.mkdirSync(recordingsDir(), { recursive: true }); shell.openPath(recordingsDir()); } },
      { label: 'Change Recordings Folder…', click: async () => {
        const r = await dialog.showOpenDialog(mainWin, { title: 'Choose where recordings are saved', defaultPath: recordingsDir(), properties: ['openDirectory', 'createDirectory'] });
        if (!r.canceled && r.filePaths[0]){ settings.recordingsDir = r.filePaths[0]; saveSettings(); }
      }},
      { type: 'separator' },
      { label: 'Check for Updates…', click: () => updates.check() },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' }
    ]},
    { role: 'editMenu' },
    { label: 'View', submenu: [
      { role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' },
      { role: 'togglefullscreen' }
    ]},
    // Cmd/Ctrl+M is MIDI learn in ...Seeds, so Minimize moves to Alt+Cmd/Ctrl+M.
    { label: 'Window', submenu: [ { role: 'minimize', accelerator: 'Alt+CmdOrCtrl+M' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' } ] }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Only one copy of the app runs: opening it again brings the open window to the front instead.
const firstCopy = app.requestSingleInstanceLock();
if (!firstCopy) app.quit();
app.on('second-instance', () => {
  if (!mainWin) return;
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.show(); mainWin.focus();
});

if (firstCopy) app.whenReady().then(() => {
  settings = loadSettings();
  // The app's Settings menu can turn hardware recording on or off; it applies after a restart.
  ipcMain.handle('seeds:getHw', () => !!settings.hwEncode);
  ipcMain.handle('seeds:setHw', (e, on) => { settings.hwEncode = !!on; saveSettings(); return true; });
  ipcMain.handle('seeds:relaunch', () => { app.relaunch(); app.exit(0); });
  ipcMain.handle('seeds:getGfx', () => settings.gfxCompat !== false);
  ipcMain.handle('seeds:setGfx', (e, on) => { settings.gfxCompat = !!on; saveSettings(); return true; });
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((wc, perm, cb) => cb(ALLOWED.has(perm)));
  ses.setPermissionCheckHandler((wc, perm) => ALLOWED.has(perm));

  // Recordings go straight into the recordings folder, no save dialog.
  ses.on('will-download', (e, item) => {
    const name = item.getFilename();
    if (!/\.(mp4|webm|png)$/i.test(name)) return; // anything else gets the normal save dialog
    const dir = recordingsDir();
    fs.mkdirSync(dir, { recursive: true });
    const d = new Date(), pad = n => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())}`;
    let target = path.join(dir, `${stamp} ${name}`), i = 2;
    while (fs.existsSync(target)) target = path.join(dir, `${stamp} ${name.replace(/(\.\w+)$/, ` ${i++}$1`)}`);
    item.setSavePath(target);
    item.once('done', (ev, state) => { if (state === 'completed' && mainWin) mainWin.webContents.send('seeds:saved', target); });
  });

  buildMenu();
  createWindow();
  // New versions come from the public 'seeds' repo's Releases page (see updater.js). The page asks through preload.js
  // (File ▾ → Check for updates…, and the Update button in its top bar).
  updates = setupUpdates({ name: '...Seeds', page: 'https://github.com/matthettich/seeds/releases/latest', repo: 'matthettich/seeds' });
  ipcMain.handle('seeds:upd-state', () => updates.state());
  ipcMain.handle('seeds:upd-check', () => updates.check());
  ipcMain.handle('seeds:upd-act', () => updates.act());
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
