import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../source');
export async function checkContent(root = defaultRoot) {
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
  const folded = new Map([...names].map(name => [name.toLowerCase(), name]));
  const errors = [];
  let references = 0;
  function visit(value, location) {
    if (Array.isArray(value)) return value.forEach((item, i) => visit(item, `${location}[${i}]`));
    if (value && typeof value === 'object') return Object.entries(value).forEach(([key, item]) => visit(item, `${location}.${key}`));
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return;
    let target;
    try { target = decodeURIComponent(value.split(/[?#]/)[0]).slice(1); }
    catch { errors.push(`${location}: invalid URL ${value}`); return; }
    if (!/\.(?:webp|png|jpe?g|svg|gif|bmp|md|txt|json|html|opus|ogg|mp3|wav|mp4|woff2?)$/i.test(target)) return;
    references++;
    if (!names.has(target)) {
      const actual = folded.get(target.toLowerCase());
      errors.push(`${location}: ${actual ? `case mismatch /${target} (actual /${actual})` : `missing /${target}`}`);
    }
  }
  for (const file of files.filter(file => file.endsWith('.json'))) {
    try { visit(JSON.parse(await fs.readFile(file, 'utf8')), path.relative(root, file)); }
    catch (error) { errors.push(`${file}: ${error.message}`); }
  }
  if (errors.length) throw new Error(`Content validation failed:\n${errors.join('\n')}`);
  console.log(`Content validated: ${references} local asset references (case-sensitive).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await checkContent();
}
