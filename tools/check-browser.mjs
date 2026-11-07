// Dependency-free Chromium smoke checks. Build and serve public/ before running.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const output = path.join(root, 'artifacts/browser-check');
await fs.mkdir(output, { recursive: true });
const candidates = [process.env.CHROME_PATH, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/chromium', '/usr/bin/google-chrome'].filter(Boolean);
let executable;
for (const candidate of candidates) {
  if (await fs.stat(candidate).then(() => true, () => false)) { executable = candidate; break; }
}
if (!executable) throw new Error('Set CHROME_PATH to a Chromium browser executable.');
const profile = path.join(output, `profile-${process.pid}`);
const child = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
child.on('error', error => { throw error; });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let cdp;
for (let i = 0; i < 100; i++) {
  const port = await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8').catch(() => '');
  if (port) { cdp = `http://127.0.0.1:${port.split('\n')[0]}`; break; }
  await delay(100);
}
if (!cdp) throw new Error('Browser did not start.');
async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener('message', event => {
    const data = JSON.parse(event.data);
    if (data.id) {
      const request = pending.get(data.id);
      if (!request) return;
      pending.delete(data.id);
      clearTimeout(request.timer);
      if (data.error) request.reject(new Error(JSON.stringify(data.error)));
      else request.resolve(data.result);
    } else listeners.forEach(listener => listener(data));
  });
  return {
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const requestId = ++id;
        const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
        pending.set(requestId, { resolve, reject, timer });
        ws.send(JSON.stringify({ id: requestId, method, params }));
      });
    },
    onEvent(listener) { listeners.push(listener); },
    close() { ws.close(); },
  };
}
const failures = [];
const report = [];
const routes = [
  ['home', '/', '.shell'], ['news', '/news/', '.article-card'],
  ['article', '/news/articles/marathon-update-1-1-9-6/', '.story-content'],
  ['lore', '/marathon-lore/', '[data-kind="category"]'],
  ['lore-detail', '/marathon-lore/#marathon-lore/loot/weapon/secret_collection/biotoxic_disinjector/__variant_b', '.detail-copy'],
  ['lore-static', '/marathon-lore/entry/loot/weapon/secret_collection/biotoxic_disinjector/', '.lore-article h1'],
  ['tags', '/marathon-lore/#marathon-lore/tags', '.tag-item'],
  ['store', '/store/', '.store-card'], ['bundles', '/store/#bundles', '.store-bundle-card'],
  ['map', '/map/perimeter/', '.map-poi'], ['factions', '/factions/', '.force-node'],
  ['classic', '/Classic-marathon/', '#terminal-body .doc-section'], ['about', '/about/', 'main'],
];
try {
  for (const width of [320, 360, 390, 768, 844, 1440]) {
    for (const [name, route, selector] of routes) {
      const target = await fetch(`${cdp}/json/new?about:blank`, { method: 'PUT' }).then(response => response.json());
      const client = await connect(target.webSocketDebuggerUrl);
      const errors = [];
      const requests = [];
      client.onEvent(event => {
        if (event.method === 'Log.entryAdded' && event.params.entry.level === 'error' && event.params.entry.url?.startsWith(base)) errors.push(event.params.entry.text);
        if (event.method === 'Runtime.exceptionThrown') errors.push(event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text);
        if (event.method === 'Network.responseReceived' && event.params.response.url.startsWith(base) && event.params.response.status >= 400) errors.push(`${event.params.response.status} ${event.params.response.url}`);
        if (event.method === 'Network.requestWillBeSent') requests.push(event.params.request.url);
      });
      async function evaluate(expression) {
        const value = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (value.exceptionDetails) throw new Error(value.exceptionDetails.exception?.description || value.exceptionDetails.text);
        return value.result.value;
      }
      async function waitFor(expression) {
        for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return true; await delay(100); }
        return false;
      }
      try {
        await client.send('Page.enable');
        await client.send('Runtime.enable');
        await client.send('Log.enable');
        await client.send('Network.enable');
        await client.send('Network.setBlockedURLs', { urls: ['*googletagmanager.com*', '*google-analytics.com*'] });
        await client.send('Emulation.setDeviceMetricsOverride', { width, height: width === 1440 ? 1000 : width === 844 ? 390 : 844, deviceScaleFactor: 1, mobile: width < 1000 });
        await client.send('Emulation.setTouchEmulationEnabled', { enabled: width < 1000, maxTouchPoints: 5 });
        if (name === 'lore-static') await client.send('Emulation.setScriptExecutionDisabled', { value: true });
        await client.send('Page.navigate', { url: base + route });
        const ready = await waitFor(`Boolean(document.querySelector(${JSON.stringify(selector)}))`);
        await evaluate('document.fonts.ready.then(() => true)');
        await delay(350);
        const layout = await evaluate(`({width:innerWidth,scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,body:document.body.scrollWidth,video:performance.getEntriesByType('resource').filter(r=>/\\.mp4(?:$|[?])/.test(r.name)).length,text:document.body.innerText.slice(0,180)})`);
        if (!ready) errors.push(`Did not render ${selector}`);
        if (layout.scroll > width + 1 || layout.body > width + 1) errors.push(`Horizontal page overflow: ${JSON.stringify(layout)}`);
        if (width < 1000 && (layout.video || requests.some(url => /\.mp4(?:$|[?])/.test(url)))) errors.push('Mobile requested a background video');
        if (name === 'lore' && requests.some(url => /content\/modules\//.test(url))) errors.push('Lore home eagerly fetched category modules');
        if (name === 'news' && requests.some(url => /marathon-news\.json/.test(url))) errors.push('News fetched full article data');
        if (await evaluate(`Boolean(document.querySelector('main')?.innerText.includes('undefined'))`)) errors.push('Rendered an undefined data field');
        if (width === 390 || width === 1440) {
          const shot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
          await fs.writeFile(path.join(output, `${name}-${width}.png`), Buffer.from(shot.data, 'base64'));
        }
        // Exercise primary navigation and detail rendering on a phone and desktop.
        if (ready && (width === 390 || width === 1440)) {
          if (name === 'lore') {
            if (width === 390) {
              await evaluate(`{ const originalFetch = window.fetch; window.fetch = (input, ...args) => { if (String(input).includes('/modules/')) { window.fetch = originalFetch; return Promise.reject(new Error('Simulated one-time network failure')); } return originalFetch(input, ...args); }; }`);
            }
            await evaluate(`document.querySelector('[data-kind="category"]').click()`);
            if (width === 390) {
              if (!await waitFor(`Boolean(document.querySelector('[data-retry]'))`)) errors.push('Missing retry after category failure');
              else await evaluate(`document.querySelector('[data-retry]').click()`);
            }
            if (!await waitFor(`Boolean(document.querySelector('[data-kind="section"]'))`)) errors.push('Category navigation failed');
            await evaluate(`document.querySelector('[data-action="back"]').click()`);
            if (!await waitFor(`Boolean(document.querySelector('[data-kind="category"]'))`)) errors.push('Lore back failed');
          }
          if (name === 'tags') {
            await evaluate(`{ const input = document.querySelector('.tag-search-input'); input.value = '生涯'; input.form.requestSubmit(); }`);
            if (!await waitFor(`Boolean(document.querySelector('.tag-result'))`)) errors.push('Tag search failed');
            await evaluate(`document.querySelector('.tag-result').click()`);
            if (!await waitFor(`Boolean(document.querySelector('.detail-copy'))`)) errors.push('Tag result deep link failed');
          }
          if (name === 'store' || name === 'bundles') {
            await evaluate(`document.querySelector('.store-card').click()`);
            if (!await waitFor(`Boolean(document.querySelector('.store-detail-layout'))`)) errors.push('Store detail navigation failed');
            const detail = await evaluate('({scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth})');
            if (detail.scroll > width + 1 || detail.body > width + 1) errors.push('Store detail overflow');
            const shot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
            await fs.writeFile(path.join(output, `${name}-detail-${width}.png`), Buffer.from(shot.data, 'base64'));
          }
          if (name === 'news') {
            await evaluate(`document.querySelector('[data-pagination-next]').click()`);
            if (!await waitFor(`location.search.includes('page=2')`)) errors.push('News next page failed');
            await evaluate('history.back()');
            if (!await waitFor(`!location.search.includes('page=2') && document.querySelector('[data-page-state]').textContent.includes('1')`)) errors.push('News browser back failed');
          }
          if (name === 'map') {
            const before = await evaluate(`document.querySelector('#map-transform').style.transform`);
            await evaluate(`document.querySelector('#map-viewport').scrollIntoView({block:'center'})`);
            const rect = await evaluate(`(()=>{let r=document.querySelector('#map-viewport').getBoundingClientRect();for(let y=60;y<Math.min(r.height-60,400);y+=30)for(let x=50;x<r.width-60;x+=30){let el=document.elementFromPoint(r.x+x,r.y+y);if(el?.closest('#map-viewport')&&!el.closest('.map-poi'))return {x:r.x+x,y:r.y+y};}return {x:r.x+50,y:r.y+80}})()`);
            await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rect.x, y: rect.y, id: 0 }] });
            await delay(50);
            await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: rect.x + 45, y: rect.y + 25, id: 0 }] });
            await delay(50);
            await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            if (width === 390 && before === await evaluate(`document.querySelector('#map-transform').style.transform`)) errors.push('Map touch drag did not pan');
            if (width === 390) {
              const pinchBefore = await evaluate(`document.querySelector('#map-transform').style.transform`);
              await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rect.x, y: rect.y, id: 0 }, { x: rect.x + 100, y: rect.y + 80, id: 1 }] });
              await delay(50);
              await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: rect.x - 10, y: rect.y - 10, id: 0 }, { x: rect.x + 130, y: rect.y + 100, id: 1 }] });
              await delay(50);
              await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
              if (pinchBefore === await evaluate(`document.querySelector('#map-transform').style.transform`)) errors.push('Map pinch did not zoom');
            }
          }
        }
        report.push({ name, width, ready, layout, errors });
        if (errors.length) failures.push({ name, width, errors });
        console.log(`${errors.length ? 'FAIL' : 'PASS'} ${name} @ ${width}${errors.length ? ': ' + errors.join('; ') : ''}`);
      } finally {
        client.close();
        await fetch(`${cdp}/json/close/${target.id}`);
      }
    }
  }
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  if (failures.length) { console.error(JSON.stringify(failures, null, 2)); process.exitCode = 1; }
} finally {
  const version = await fetch(`${cdp}/json/version`).then(response => response.json());
  const browser = await connect(version.webSocketDebuggerUrl);
  await browser.send('Browser.close').catch(() => {});
  browser.close();
  child.unref();
}
