import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { checkContent } from '../tools/check-content.mjs';
import { buildNewsIndex } from './build-news-index.mjs';
import { buildLore } from './build-lore.mjs';
import { prerender } from './prerender.mjs';
import { applySiteShell } from './site-shell.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceDir = path.join(root, 'source');
const publicDir = path.join(root, 'public');
const siteUrl = 'https://marathon.uesc.top';
const gaMeasurementId = 'G-NX8R0D0494';
const newsCovers = await fs.readFile(path.join(sourceDir, 'news/assets/cover-index.json'), 'utf8').then(JSON.parse).catch(error => {
  if (error.code === 'ENOENT') return {};
  throw error;
});

// Validate before replacing the previous build, including Linux-sensitive paths.
await checkContent();
if (path.dirname(publicDir) !== root || path.basename(publicDir) !== 'public') throw new Error('Invalid build output directory');
await fs.rm(publicDir, { recursive: true, force: true });
await fs.cp(sourceDir, publicDir, {
  recursive: true,
  filter: async file => {
    const name = path.basename(file);
    if (/\.bmp$/i.test(name) && await fs.stat(file.replace(/\.bmp$/i, '.webp')).then(() => true, () => false)) return false;
    return !(/^README(?:\.|$)/i.test(name) || name.endsWith('.sync-report.json') || name === '_data' || name === 'templete.json');
  },
});
await buildNewsIndex(root);
await buildLore(root);

async function listFiles(dir, result = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await listFiles(file, result);
    else result.push(file);
  }
  return result;
}
const files = await listFiles(publicDir);
const htmlFiles = files.filter(file => file.endsWith('.html'));
// A content-derived version replaces manually maintained date query strings.
const hash = createHash('sha256');
for (const file of files.filter(file => /\.(?:m?js|css)$/.test(file)).sort()) {
  hash.update(path.relative(publicDir, file));
  hash.update(await fs.readFile(file));
}
const version = hash.digest('hex').slice(0, 12);
for (const file of files.filter(file => /\.(?:m?js)$/.test(file))) {
  const text = await fs.readFile(file, 'utf8');
  const updated = text.replace(/(from\s+['"]\.\/archive-[\w-]+\.mjs)(['"])/g, `$1?v=${version}$2`);
  if (text !== updated) await fs.writeFile(file, updated);
}
const analytics = `<script async src="https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaMeasurementId}');</script>`;
for (const file of htmlFiles) {
  let html = await fs.readFile(file, 'utf8');
  html = html.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  html = html.replace(/<img\b[^>]*>/gi, tag => {
    const src = tag.match(/\bsrc=["']([^"']+)["']/)?.[1];
    const cover = newsCovers[src];
    if (!cover) return tag;
    let updated = tag.replace(src, cover.path);
    if (!/\bwidth=/.test(updated)) updated = updated.replace('<img', `<img width="${cover.width}" height="${cover.height}"`);
    return updated;
  });
  if (!/<link\b[^>]*rel=["'](?:shortcut )?icon["']/i.test(html)) html = html.replace('</head>', '<link rel="icon" href="/marathon-lore/assets/images/icons/marathon-icon.jpg">\n</head>');
  // data-src keeps decoration out of the preload scanner on mobile.
  html = html.replace(/<video\b[^>]*>[\s\S]*?<\/video>/gi, video => {
    if (!/class=["'][^"']*(?:page-bg-video|viewport-bg-video)/i.test(video)) return video;
    return video.replace(/\sautoplay\b/gi, '')
      .replace(/\bpreload=["'][^"']*["']/gi, 'preload="none"')
      .replace(/\bsrc=/gi, 'data-src=')
      .replace('<video', '<video data-background-video');
  });
  html = html.replace('</head>', '<link rel="stylesheet" href="/css/mobile.css">\n<script src="/js/site-media.js" defer></script>\n</head>');
  const relative = path.relative(publicDir, file).replaceAll(path.sep, '/');
  const route = relative === 'index.html' ? '/' : '/' + relative.replace(/index\.html$/, '');
  html = applySiteShell(html, route);
  html = html.replace(/((?:src|href)=["']\/[^"']+\.(?:css|m?js))(?:\?[^"']*)?(["'])/g, `$1?v=${version}$2`);
  if (!html.includes(`googletagmanager.com/gtag/js?id=${gaMeasurementId}`)) html = html.replace('</head>', analytics + '\n</head>');
  await fs.writeFile(file, html);
}
await prerender(root);
await checkContent(publicDir);

// Build-output mtimes describe a build, not a content modification. Omit lastmod
// until a reliable editorial modification date is available.
const urls = htmlFiles.map(file => path.relative(publicDir, file).replaceAll(path.sep, '/'))
  .filter(file => file !== 'map/index.html' && !/(^|\/)404\.html$/.test(file))
  .map(file => file === 'index.html' ? '/' : '/' + file.replace(/index\.html$/, ''));
const xmlEscape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${xmlEscape(siteUrl + url.split('/').map(encodeURIComponent).join('/'))}</loc></url>`).join('\n')}\n</urlset>\n`;
await fs.writeFile(path.join(publicDir, 'sitemap.xml'), sitemap);
await fs.writeFile(path.join(publicDir, '.nojekyll'), '');
console.log(`Built ${htmlFiles.length} HTML files into public/ (assets ${version})`);
