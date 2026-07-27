import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceDir = path.join(root, 'source');
const publicDir = path.join(root, 'public');
const siteUrl = 'https://marathon.uesc.top';
await fs.rm(publicDir, { recursive: true, force: true });
await fs.cp(sourceDir, publicDir, { recursive: true });
const htmlFiles = [];
// Static HTML pages may keep Hexo front matter for source compatibility; never ship it.
async function stripFrontMatter(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await stripFrontMatter(full);
    else if (entry.name.toLowerCase().endsWith('.html')) {
      const text = await fs.readFile(full, 'utf8');
      const match = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
      if (match) await fs.writeFile(full, text.slice(match[0].length), 'utf8');
    }
  }
}
await stripFrontMatter(publicDir);
async function walk(dir) { for (const entry of await fs.readdir(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) await walk(full); else if (entry.name.toLowerCase().endsWith('.html')) htmlFiles.push(path.relative(publicDir, full)); } }
await walk(publicDir);
const urls = htmlFiles.filter(file => !file.includes(`${path.sep}404.html`)).map(file => file.replaceAll(path.sep, '/')).map(file => file === 'index.html' ? '/' : `/${file.replace(/index\.html$/, '')}`);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${siteUrl}${url}</loc></url>`).join('\n')}\n</urlset>\n`;
await fs.writeFile(path.join(publicDir, 'sitemap.xml'), sitemap, 'utf8');
console.log(`Built ${htmlFiles.length} HTML files into public/`);
