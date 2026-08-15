import http from 'node:http';

const BASE = 'http://127.0.0.1:9222';

function getJson(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, res => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

function putJson(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE}${path}`, { method: 'PUT' }, res => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.end();
  });
}

const url = process.argv[2];

const target = await putJson(`/json/new?${encodeURIComponent(url)}`);
const wsUrl = target.webSocketDebuggerUrl;
console.log('target id:', target.id);

const ws = new WebSocket(wsUrl);
let msgId = 0;
const pending = new Map();

function send(method, params = {}) {
  return new Promise(resolve => {
    const id = ++msgId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

ws.addEventListener('message', event => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});

await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));

await send('Runtime.enable');
await send('Page.enable');

// Wait for app to render (poll for store-bundle-card elements)
let html = '';
for (let i = 0; i < 40; i++) {
  const r = await send('Runtime.evaluate', {
    expression: `(() => {
      const cards = [...document.querySelectorAll('.store-bundle-card')].map(c => c.dataset.storeId + '|' + (c.querySelector('.store-card-copy strong')?.textContent || ''));
      return JSON.stringify({ hash: location.hash, view: document.querySelector('.view-store') ? 'store' : 'other', cards, bodySnippet: document.body.innerText.slice(0, 500) });
    })()`,
    returnByValue: true,
  });
  const v = r.result?.result?.value;
  if (v) {
    const parsed = JSON.parse(v);
    if (parsed.cards.length > 0) {
      console.log('RENDERED:', v);
      html = v;
      break;
    }
    html = v;
  }
  await new Promise(res => setTimeout(res, 500));
}
console.log('FINAL:', html);
ws.close();
