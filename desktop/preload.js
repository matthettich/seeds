// Small bridge the web app uses to know it's running as the desktop app.
const { contextBridge, ipcRenderer, webUtils } = require('electron');
const { pathToFileURL } = require('url');

contextBridge.exposeInMainWorld('seedsNative', {
  isApp: true,
  platform: process.platform,
  pathForFile: f => { try { return webUtils.getPathForFile(f) || ''; } catch { return ''; } },
  fileUrl: p => pathToFileURL(p).href,
  onSaved: cb => ipcRenderer.on('seeds:saved', (e, p) => cb(p)),
  getHwEncode: () => ipcRenderer.invoke('seeds:getHw'),
  setHwEncode: on => ipcRenderer.invoke('seeds:setHw', on),
  relaunch: () => ipcRenderer.invoke('seeds:relaunch'),
  getGfxCompat: () => ipcRenderer.invoke('seeds:getGfx'),
  setGfxCompat: on => ipcRenderer.invoke('seeds:setGfx', on),
  // Updates (see updater.js): what version this is and whether a newer one is out, a "check now", and "get it".
  updates: {
    state: () => ipcRenderer.invoke('seeds:upd-state'),   // {version, avail, ready, notifyOnly, dl (0–1 while downloading), file}
    check: () => ipcRenderer.invoke('seeds:upd-check'),   // check now and say the result in a box
    act: () => ipcRenderer.invoke('seeds:upd-act'),       // restart into it, or (Mac) download it and open it
    on: cb => { const f = (e, s) => cb(s); ipcRenderer.on('seeds:upd', f); return () => ipcRenderer.removeListener('seeds:upd', f); }
  }
});
