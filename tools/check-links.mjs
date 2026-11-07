import fs from 'node:fs/promises';
import path from 'node:path';

export async function checkLinks(root) {
  const files = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else files.push(file);
    }
  }
  await walk(root);
  const names = new Set(files.map(file => path.relative(root, file).replaceAll(path.sep, '/')));
  const errors = new Set();
  for (const file of files.filter(file => file.endsWith('.html'))) {
    const relative = path.relative(root, file).replaceAll(path.sep, '/');
    const html = (await fs.readFile(file, 'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    for (const match of html.matchAll(/\b(?:src|href|data-src)\s*=\s*(["'])(.*?)\1/gi)) {
      const value = match[2].replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"');
      if (!value || value.startsWith('#')) continue;
      const url = new URL(value, 'https://local.invalid/' + relative);
      if (url.origin !== 'https://local.invalid') continue;
      let target = decodeURIComponent(url.pathname).slice(1);
      if (!target || target.endsWith('/')) target += 'index.html';
      if (!names.has(target)) errors.add(`${relative}: missing /${target}`);
    }
  }
  if (errors.size) throw new Error(`Broken local HTML links:\n${[...errors].join('\n')}`);
  console.log(`HTML links validated across ${files.filter(file => file.endsWith('.html')).length} pages.`);
}
