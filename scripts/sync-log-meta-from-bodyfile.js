const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const modulesDir = path.join(root, 'source', 'marathon-lore', 'content', 'modules');
const sourceRoot = path.join(root, 'source');
const fallbackMeta = ['疾行者指南'];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function getBodyFileMeta(bodyFile) {
  if (typeof bodyFile !== 'string' || !bodyFile.trim()) return null;

  const rel = bodyFile.trim().replace(/^\/+/, '').replaceAll('/', path.sep);
  const filePath = path.join(sourceRoot, rel);

  if (!fs.existsSync(filePath)) return null;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const nonEmpty = lines.map(line => line.trim()).filter(Boolean);
  if (!nonEmpty.length) return null;

  const lastLine = nonEmpty[nonEmpty.length - 1];
  const match = lastLine.match(/^标签：(.+)$/);
  if (!match) return null;

  const tags = match[1]
    .split('；')
    .map(tag => tag.trim())
    .filter(Boolean);

  return tags.length ? tags : null;
}

function walk(node, visit) {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach(item => walk(item, visit));
    return;
  }

  if (typeof node !== 'object') return;

  visit(node);

  for (const key of ['sections', 'entries', 'nodes', 'children', 'logs']) {
    if (Array.isArray(node[key])) {
      walk(node[key], visit);
    }
  }
}

let updated = 0;
let fallbackCount = 0;

for (const file of fs.readdirSync(modulesDir)) {
  if (!file.endsWith('.json')) continue;

  const filePath = path.join(modulesDir, file);
  const data = readJson(filePath);
  let changed = false;

  walk(data, node => {
    if (!Array.isArray(node.logs)) return;

    for (const log of node.logs) {
      if (!log || typeof log !== 'object' || typeof log.bodyFile !== 'string') continue;

      const meta = getBodyFileMeta(log.bodyFile) || fallbackMeta;
      const current = Array.isArray(log.meta) ? log.meta : [];

      if (current.length !== meta.length || current.some((item, index) => item !== meta[index])) {
        log.meta = meta;
        changed = true;
      }

      if (meta === fallbackMeta) {
        fallbackCount += 1;
      }
    }
  });

  if (changed) {
    writeJson(filePath, data);
    updated += 1;
  }
}

console.log(`Updated module files: ${updated}`);
console.log(`Fallback meta applied: ${fallbackCount}`);
