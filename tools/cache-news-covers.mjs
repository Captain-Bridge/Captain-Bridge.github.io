// Optional editorial maintenance: cache official news covers for reliable loading.
// Requires Python + Pillow. Builds themselves remain offline and deterministic.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(await fs.readFile(path.join(root, 'source/news/data/marathon-news.json'), 'utf8'));
const urls = [...new Set(data.items.map(item => item.images?.primary?.url).filter(url => /^https:\/\//.test(url)))];
const temp = path.join(root, 'artifacts/news-covers');
const output = path.join(root, 'source/news/assets/covers');
await fs.mkdir(temp, { recursive: true });
await fs.mkdir(output, { recursive: true });
const records = [];
let cursor = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < urls.length) {
    const url = urls[cursor++];
    const key = createHash('sha256').update(url).digest('hex').slice(0, 14);
    const sourceFile = path.join(temp, key);
    const target = path.join(output, `${key}.webp`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await fs.writeFile(sourceFile, Buffer.from(await response.arrayBuffer()));
      records.push({ url, sourceFile, target, localPath: `/news/assets/covers/${key}.webp` });
    } catch (error) { console.warn(`Cover unavailable: ${key} (${error.message})`); }
  }
}));
const manifest = path.join(temp, 'manifest.json');
await fs.writeFile(manifest, JSON.stringify(records));
const python = `import json, sys
from pathlib import Path
from PIL import Image
records = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
index = {}
for record in records:
    with Image.open(record['sourceFile']) as image:
        image = image.convert('RGB')
        image.thumbnail((1280, 900))
        image.save(record['target'], 'WEBP', quality=82, method=6)
        index[record['url']] = {'path': record['localPath'], 'width': image.width, 'height': image.height}
Path(sys.argv[2]).write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\\n', encoding='utf-8')
print('Local news covers:', len(index))
`;
await new Promise((resolve, reject) => {
  const child = spawn('python', ['-c', python, manifest, path.join(root, 'source/news/assets/cover-index.json')], { windowsHide: true, stdio: 'inherit' });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Image conversion failed: ${code}`)));
});
