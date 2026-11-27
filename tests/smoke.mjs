// Smoke test for the app (index.html): headless Chrome with a fake camera and microphone, no dependencies.
// Run: node tests/smoke.mjs      (or `npm test` at the repo root, which also runs the desktop updater test)
// Chrome: set CHROME_PATH if it isn't found (Google Chrome, Chromium or Edge all work).
//
// What it does: serves the repo on 127.0.0.1, opens index.html, lets the frame loop run, goes through every mode,
// adds one module of every type, removes them all, and checks targeted cases (empty patch on reload, undo history,
// Present panels, output windows, the cable index). It fails on any console error, uncaught exception, unhandled
// rejection, a stalled frame loop, or anything left behind after removal (modules, cables, Present panels, GPU
// textures, font menus, modules still reachable after garbage collection).
//
// The app is one closure with no globals, so the served copy (never the file on disk) gets a small read-only hook
// added just before the closure ends. If that spot moves, the test says so rather than passing.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERBOSE = process.argv.includes('-v');
const KEEP_OPEN = process.argv.includes('--keep');

// ---------- the hook (inside the app's closure, so it sees its variables) ----------
const HOOK = `
window.__seedsTest = {
  get nodes(){ return nodes; }, get edges(){ return edges; }, get decor(){ return decor; }, get frameNo(){ return frameNo; },
  get histStack(){ return histStack; }, get redoStack(){ return redoStack; }, get histBytes(){ return histBytes; }, get histLast(){ return histLast; },
  cableEls, perf, live, simple, DEFS, GLX, STORE,
  addNode, removeNode, removeNodes, setMode, undo, redo, serialize, save, histPush, perfEnter, perfExit, perfBuildPanel, perfMods,
  syncCableEls, afterEdges, edgeInto, openOutput, closeOutput, drawOutput, clearPatch, cpuText: () => document.getElementById('cpuv').textContent,
  setEdges(a){ edges = a; }
};
`;
const ANCHOR = '\n})();\n</script>\n</body>';
function servedIndex(){
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const at = src.lastIndexOf(ANCHOR);
  if (at < 0) throw new Error('smoke: the end of the app closure ("})();</script></body>") was not found in index.html; update ANCHOR in tests/smoke.mjs');
  return src.slice(0, at) + '\n' + HOOK + src.slice(at);
}

// ---------- a tiny static server ----------
const TYPES = {'.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.json':'application/json', '.webmanifest':'application/manifest+json', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff2':'font/woff2'};
function serve(){
  const index = servedIndex();
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (u === '/favicon.ico'){ res.writeHead(204); return res.end(); }
    if (u === '/' || u === '/index.html'){ res.writeHead(200, {'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store'}); return res.end(index); }
    const f = path.join(ROOT, path.normalize(u).replace(/^([/\\])+/, ''));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
    res.writeHead(200, {'content-type': TYPES[path.extname(f)] || 'application/octet-stream'}); fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

// ---------- Chrome over the DevTools protocol (Node 22's built-in WebSocket) ----------
function findChrome(){
  const c = [process.env.CHROME_PATH,
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'];
  for (const p of c) if (p && fs.existsSync(p)) return p;
  throw new Error('smoke: Chrome not found. Set CHROME_PATH to Google Chrome, Chromium or Edge.');
}
async function launch(){
  if (typeof WebSocket !== 'function') throw new Error('smoke: needs Node 22 or newer (built-in WebSocket)');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seeds-smoke-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + dir, '--no-first-run', '--no-default-browser-check',
    '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required',
    '--disable-popup-blocking', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--window-size=1600,1000',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];
  if (process.getuid && process.getuid() === 0) args.push('--no-sandbox');
  const proc = spawn(findChrome(), args, {stdio: ['ignore', 'ignore', 'pipe']});
  const ws = await new Promise((res, rej) => {
    let buf = ''; const t = setTimeout(() => rej(new Error('smoke: Chrome did not start')), 20000);
    proc.stderr.on('data', d => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m){ clearTimeout(t); res(m[1]); } });
    proc.on('exit', c => rej(new Error('smoke: Chrome exited (' + c + ')')));
  });
  const sock = new WebSocket(ws); await new Promise((r, j) => { sock.onopen = r; sock.onerror = j; });
  let seq = 0; const wait = new Map(), handlers = [];
  sock.onmessage = m => { const d = JSON.parse(m.data); if (d.id && wait.has(d.id)){ const w = wait.get(d.id); wait.delete(d.id); d.error ? w.j(new Error(d.error.message)) : w.r(d.result); } else for (const h of handlers) h(d); };
  const send = (method, params = {}, sessionId) => new Promise((r, j) => { const id = ++seq; wait.set(id, {r, j}); sock.send(JSON.stringify({id, method, params, sessionId})); });
  const close = () => { try { sock.close(); } catch(e){} proc.kill(); setTimeout(() => fs.rmSync(dir, {recursive: true, force: true}), 300); };
  return {send, on: h => handlers.push(h), close};
}

// ---------- the run ----------
const problems = [], checks = [];
const fail = msg => problems.push(msg);
const ok = (cond, msg) => { checks.push((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) fail(msg); };
const log = (...a) => { if (VERBOSE) console.log(...a); };

const srv = await serve();
const url = 'http://127.0.0.1:' + srv.address().port + '/';
const cr = await launch();
let sid = null;
const errs = [];
cr.on(d => {
  if (d.sessionId !== sid) return;
  if (d.method === 'Runtime.exceptionThrown'){ const e = d.params.exceptionDetails; errs.push('uncaught: ' + ((e.exception && e.exception.description) || e.text)); }
  if (d.method === 'Runtime.consoleAPICalled' && (d.params.type === 'error' || d.params.type === 'assert'))
    errs.push('console.' + d.params.type + ': ' + d.params.args.map(a => a.value ?? a.description ?? a.type).join(' '));
  if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') errs.push('log: ' + d.params.entry.text + (d.params.entry.url ? ' (' + d.params.entry.url + ')' : ''));
});
const {targetId} = await cr.send('Target.createTarget', {url: 'about:blank'});
({sessionId: sid} = await cr.send('Target.attachToTarget', {targetId, flatten: true}));
const S = (m, p) => cr.send(m, p, sid);
await S('Runtime.enable'); await S('Log.enable'); await S('Page.enable');
// Count live WebGL textures (created minus deleted) without touching the app.
await S('Page.addScriptToEvaluateOnNewDocument', {source: `(() => { const P = WebGL2RenderingContext.prototype, c = P.createTexture, d = P.deleteTexture;
  window.__tex = 0; P.createTexture = function(){ window.__tex++; return c.apply(this, arguments); };
  P.deleteTexture = function(t){ if (t) window.__tex--; return d.apply(this, arguments); };
  window.addEventListener('unhandledrejection', e => console.error('unhandled rejection:', e.reason && (e.reason.stack || e.reason))); })();`});

async function ev(expr){
  const r = await S('Runtime.evaluate', {expression: '(async () => { const T = window.__seedsTest; ' + expr + ' })()', awaitPromise: true, returnByValue: true});
  if (r.exceptionDetails) throw new Error('evaluate failed: ' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text) + '\n  in: ' + expr.slice(0, 200));
  return r.result.value;
}
const frames = k => ev(`const f0 = T.frameNo, t0 = performance.now(); while (T.frameNo < f0 + ${k}){ if (performance.now() - t0 > 20000) return false; await new Promise(r => setTimeout(r, 10)); } return true;`);
async function navigate(){ await S('Page.navigate', {url}); for (let i = 0; i < 300; i++){ await new Promise(r => setTimeout(r, 100)); try { if (await ev('return !!T && T.frameNo > 5;')) return true; } catch(e){} } return false; }
const step = async (name, fn) => { const n0 = errs.length; log('- ' + name); await fn(); if (errs.length > n0) fail(name + ': ' + errs.splice(n0).join(' | ')); };

const T0 = Date.now();
try {
  await step('boot', async () => {
    ok(await navigate(), 'app boots and the frame loop runs');
    ok(await ev('return T.nodes.size > 2;'), 'first run builds the demo patch');
  });

  await step('modes', async () => {
    for (const m of ['perform', 'sliders', 'live', 'simple', 'patch', 'perform', 'patch']){ await ev(`T.setMode('${m}');`); ok(await frames(10), 'frame loop keeps running in mode ' + m); }
  });

  // Every module type, added and removed. Baseline is the empty patch after the demo is cleared.
  const types = await ev(`return Object.keys(T.DEFS).filter(k => !['main', 'recorder'].includes(k));`);
  await step('every module', async () => {
    await ev(`T.removeNodes([...T.nodes.keys()]);`); await frames(20);
    const base = await ev(`return {nodes: T.nodes.size, edges: T.edges.length, cables: T.cableEls.size, tex: window.__tex, panels: document.querySelectorAll('.ppanel').length};`);
    log('  baseline', base);
    const r = await ev(`const bad = [], ids = [], refs = [];
      for (const [i, t] of ${JSON.stringify(types)}.entries()){
        let n = null; try { n = T.addNode(t, 40 + (i % 10)*260, 40 + Math.floor(i/10)*300); } catch(e){ bad.push(t + ': ' + e.message); }
        if (n){ ids.push(n.id); refs.push([t, new WeakRef(n)]); }
      }
      window.__refs = refs; return {bad, made: ids.length};`);
    ok(!r.bad.length, 'every module type adds without throwing' + (r.bad.length ? ' (' + r.bad.join('; ') + ')' : ''));
    log('  added', r.made, 'of', types.length);
    ok(await frames(30), 'frames run with one of every module');
    for (const m of ['perform', 'patch', 'sliders', 'patch']){ await ev(`T.setMode('${m}');`); await frames(5); }
    await ev(`T.removeNodes([...T.nodes.values()].filter(n => !n.fixed).map(n => n.id));`);
    ok(await frames(330), 'frames run after removing them all'); // 300+ frames: shared upload textures are pruned after 300 unused frames
    const after = await ev(`return {nodes: T.nodes.size, edges: T.edges.length, cables: T.cableEls.size, tex: window.__tex, panels: document.querySelectorAll('.ppanel').length,
      perfPanels: Object.keys(T.perf.panels).filter(id => !T.nodes.has(id)).length,
      fontPickers: (window.fontPickers || []).filter(f => T.nodes.get(f.n.id) !== f.n).length};`);
    log('  after', after);
    ok(after.nodes === base.nodes, `no modules left (${after.nodes} vs ${base.nodes})`);
    ok(after.edges === base.edges && after.cables === base.cables, `no cables left (edges ${after.edges}, cable drawings ${after.cables})`);
    ok(after.panels === base.panels && after.perfPanels === 0, `no Present panels left (${after.panels} in the page, ${after.perfPanels} remembered)`);
    ok(after.tex <= base.tex, `GPU textures released (${after.tex} live vs ${base.tex} at start)`);
    ok(after.fontPickers === 0, `no font menus kept for removed modules (${after.fontPickers})`);
    // Removed modules must be collectable: anything still reachable is a leak.
    await S('HeapProfiler.enable'); for (let i = 0; i < 3; i++){ await S('HeapProfiler.collectGarbage'); await new Promise(r => setTimeout(r, 100)); }
    const kept = await ev(`return window.__refs.filter(([t, w]) => w.deref()).map(([t]) => t);`);
    ok(!kept.length, `removed modules are garbage-collected${kept.length ? ' (still reachable: ' + kept.join(', ') + ')' : ''}`);
    await ev(`delete window.__refs;`);
  });

  // A1: a patch emptied on purpose stays empty after a reload (not replaced by the demo patch).
  await step('empty patch survives reload', async () => {
    await ev(`T.removeNodes([...T.nodes.keys()]); T.save(); await new Promise(r => setTimeout(r, 600));`);
    const stored = await ev(`return JSON.parse(localStorage.getItem(T.STORE)).nodes.length;`);
    ok(stored === 0, 'the empty patch is autosaved');
    ok(await navigate(), 'reloads');
    ok(await ev(`return [...T.nodes.values()].filter(n => !n.fixed).length;`) === 0, 'empty patch comes back empty after reload (not the demo patch)');
    await ev(`await new Promise(r => setTimeout(r, 600));`);
    ok(await ev(`return JSON.parse(localStorage.getItem(T.STORE)).nodes.length;`) === 0, 'the empty autosave is not overwritten');
  });
  // A real patch still loads, and a patch whose modules are all unknown is kept in Backups, not replaced silently.
  await step('real and unreadable patches', async () => {
    await ev(`const a = T.addNode('kaleido', 100, 100), b = T.addNode('mirror', 400, 100); T.setEdges([...T.edges, {from:{node:a.id, port:'out'}, to:{node:b.id, port:'in'}, kind:'video'}]); T.afterEdges(); T.save(); await new Promise(r => setTimeout(r, 600));`);
    ok(await navigate(), 'reloads');
    ok(await ev(`return [...T.nodes.values()].filter(n => !n.fixed).map(n => n.type).sort().join() === 'kaleido,mirror' && T.edges.some(e => T.nodes.get(e.from.node).type === 'kaleido');`), 'a two-module patch with a cable reloads as it was');
    await ev(`const d = JSON.parse(localStorage.getItem(T.STORE)); d.nodes = d.nodes.map(s => Object.assign(s, {type: 'fromthefuture'})); localStorage.setItem(T.STORE, JSON.stringify(d));`);
    const n0 = errs.length; ok(await navigate(), 'reloads'); const expected = errs.splice(n0).filter(e => !/Autosave not loaded/.test(e));
    if (expected.length) errs.push(...expected);
    ok(await ev(`return JSON.parse(localStorage.getItem(T.STORE + ':broken')).nodes[0].type === 'fromthefuture';`), 'an all-unknown patch is kept (:broken) instead of discarded');
    ok(await ev(`return JSON.parse(localStorage.getItem(T.STORE + ':backups') || localStorage.getItem('videopatch:v1:backups') || '[]').some(b => /couldn’t open/.test(b.name));`), 'and listed in Backups as "couldn’t open"');
  });

  // A3: the undo history byte counter matches what is held, through 50 undo/redo cycles.
  await step('undo/redo bookkeeping', async () => {
    const r = await ev(`const a = T.addNode('kaleido', 100, 100); T.histPush();
      for (let i = 0; i < 20; i++){ a.params.seg = 3 + i; T.histPush(); }
      const sum = () => T.histStack.reduce((s, x) => s + x.length, 0); const res = [];
      for (let c = 0; c < 50; c++){ T.undo(); T.undo(); T.redo(); res.push(T.histBytes - sum()); T.redo(); res.push(T.histBytes - sum()); }
      return {drift: res.filter(x => x !== 0).length, last: T.histBytes - sum(), stack: T.histStack.length, redo: T.redoStack.length};`);
    log('  history', r);
    ok(r.drift === 0, `histBytes equals the size of the undo stack after every undo/redo (${r.drift} mismatches, last ${r.last})`);
  });

  // A2: Present panels are never built twice, even for a module that drops out of perfMods() while shown.
  await step('Present panels', async () => {
    const r = await ev(`T.removeNodes([...T.nodes.keys()]); const a = T.addNode('kaleido', 100, 100), b = T.addNode('mirror', 400, 100);
      T.setMode('perform'); T.perfBuildPanel(a); // a second build of a shown panel
      const twice = document.querySelectorAll('.ppanel').length;
      T.live.fadeState = {oldIds: [a.id], newEdges: []}; T.perfExit(); T.live.fadeState = null; // a leaves perfMods() while shown
      const leftAfterExit = document.querySelectorAll('.ppanel').length;
      T.perfEnter(); const again = document.querySelectorAll('.ppanel').length, wraps = a.el.querySelectorAll('.pcw .pcw').length + document.querySelectorAll('.ppanel .pcw .pcw').length;
      T.setMode('patch'); const body = !!a.el.querySelector(':scope > .body') && !!b.el.querySelector(':scope > .body');
      return {twice, leftAfterExit, again, wraps, body, left: document.querySelectorAll('.ppanel').length};`);
    log('  panels', r);
    ok(r.twice === 2, `building a shown panel again doesn't add one (${r.twice} panels for 2 modules)`);
    ok(r.leftAfterExit === 0, `leaving Present removes every panel (${r.leftAfterExit} left)`);
    ok(r.again === 2 && r.wraps === 0, `re-entering Present gives one panel each, no nested wrappers (${r.again} panels, ${r.wraps} nested)`);
    ok(r.body && r.left === 0, 'module bodies go back to their cards');
  });

  // A4: a text module's font menu is not kept after the module is deleted.
  await step('font menus', async () => {
    const r = await ev(`const types = Object.keys(T.DEFS).filter(k => { try { return /fontPicker\\(/.test(String(T.DEFS[k].build || T.DEFS[k].ui || '')) || /fontPicker\\(/.test(JSON.stringify(Object.keys(T.DEFS[k]))); } catch(e){ return false; } });
      const n = T.addNode('text', 100, 100) || T.addNode('text3d', 100, 100); const ref = new WeakRef(n), id = n.id;
      T.removeNode(id); window.__fref = ref; return {id, global: (window.fontPickers || []).filter(f => f.n.id === id).length};`);
    await S('HeapProfiler.collectGarbage'); await new Promise(r => setTimeout(r, 100)); await S('HeapProfiler.collectGarbage');
    ok(r.global === 0, `deleted text module not listed in window.fontPickers (${r.global})`);
    ok(await ev(`const k = !window.__fref.deref(); delete window.__fref; return k;`), 'deleted text module is garbage-collected');
  });

  // A5/B2: output windows open, draw, close (from the app and from outside), and give their buffer back.
  await step('output windows', async () => {
    const r = await ev(`const m = T.nodes.get('main'); T.openOutput(m); const opened = !!m.popup;
      const f0 = T.frameNo; while (T.frameNo < f0 + 20) await new Promise(r => setTimeout(r, 10));
      const drew = !!m.pbuf; T.closeOutput(m); const freed = !m.pbuf && !m.pcv;
      T.openOutput(m); while (T.frameNo < f0 + 40) await new Promise(r => setTimeout(r, 10));
      try { m.popup.close(); } catch(e){} // closed from outside: the next frame notices
      const f1 = T.frameNo; while (T.frameNo < f1 + 20) await new Promise(r => setTimeout(r, 10));
      return {opened, drew, freed, closed: !m.popup && !m.pbuf, failed: !!m.renderFailed};`);
    log('  output', r);
    if (!r.opened) checks.push('skip output window: headless Chrome refused the popup'); else {
      ok(r.drew, 'output window draws'); ok(r.freed, 'closing it releases its picture buffer (pbuf)'); ok(r.closed && !r.failed, 'a window closed from outside is cleaned up without errors');
    }
    // The race in A5: the window is gone by the time requestAnimationFrame is booked.
    const race = await ev(`const m = T.nodes.get('main'), fake = {closed: false, devicePixelRatio: 1, innerWidth: 64, innerHeight: 36, requestAnimationFrame(){ throw new Error('window closed'); }, close(){ this.closed = true; }};
      const cv = document.createElement('canvas'); m.popup = fake; m.pcv = cv; m.pctx = cv.getContext('2d'); m.pPending = false;
      let threw = null; try { T.drawOutput(m, cv); } catch(e){ threw = e.message; }
      const cleaned = !m.popup && !m.pbuf; T.closeOutput(m); m.pbuf = null; m.pPending = false; m.renderFailed = false; return {threw, cleaned};`);
    ok(!race.threw, 'drawOutput does not throw when the window closes before its frame is booked' + (race.threw ? ' (' + race.threw + ')' : ''));
    ok(race.cleaned, 'and the output is closed and its buffer released');
  });

  // C1: the cached cable index always gives the same answer as a scan of edges, through edits.
  await step('cable index', async () => {
    const r = await ev(`T.removeNodes([...T.nodes.keys()]); const ns = []; for (let i = 0; i < 12; i++) ns.push(T.addNode(['kaleido', 'mirror', 'mixer'][i % 3], 60 + i*120, 100));
      let mism = 0; const scan = (id, p) => T.edges.find(e => e.to.node === id && e.to.port === p);
      const check = () => { for (const n of [...ns, T.nodes.get('main')]) for (const p of ['in', 'a', 'b', 'c', 'd']) if (T.edgeInto(n.id, p) !== scan(n.id, p)) mism++; };
      for (let k = 0; k < 40; k++){
        const a = ns[k % 12], b = ns[(k*5 + 3) % 12];
        if (a !== b){ const port = b.type === 'mixer' ? ['a', 'b', 'c', 'd'][k % 4] : 'in';
          T.setEdges(T.edges.filter(e => !(e.to.node === b.id && e.to.port === port)).concat([{from:{node:a.id, port:'out'}, to:{node:b.id, port}, kind:'video'}])); }
        check(); if (k % 3 === 0){ T.afterEdges(); check(); }
        if (k % 7 === 0){ T.removeNode(ns[(k + 1) % 12].id); ns[(k + 1) % 12] = T.addNode('mirror', 60, 400 + k); check(); }
        const f0 = T.frameNo; while (T.frameNo < f0 + 1) await new Promise(r => setTimeout(r, 5)); check();
      }
      return mism;`);
    ok(r === 0, `edgeInto matches a scan of edges through 40 edits (${r} mismatches)`);
  });

  await step('modes again', async () => {
    for (const m of ['simple', 'patch', 'live', 'patch']){ await ev(`T.setMode('${m}');`); ok(await frames(10), 'frame loop keeps running in mode ' + m + ' (second pass)'); }
  });
} catch(e){
  fail('test crashed: ' + (e.stack || e));
} finally {
  if (errs.length) fail('unattributed errors: ' + errs.join(' | '));
  if (!KEEP_OPEN){ cr.close(); srv.close(); }
}

for (const c of checks) console.log(c);
console.log(`\n${checks.filter(c => c.startsWith('ok')).length} passed, ${problems.length} problem(s), ${((Date.now() - T0)/1000).toFixed(1)} s`);
if (problems.length){ console.log('\nProblems:'); for (const p of problems) console.log(' - ' + p); process.exit(1); }
process.exit(0);
