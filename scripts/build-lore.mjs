import fs from 'node:fs/promises';
import path from 'node:path';
import { buildTagIndex, collectLoreEntries, packTagIndex } from '../source/js/archive-data.mjs';
import { escapeHtml as esc, markdownToHtml, markdownToParagraphs, stripHtmlTags } from '../source/js/archive-markdown.mjs';

const siteUrl = 'https://marathon.uesc.top';
export async function buildLore(root) {
  const source = path.join(root, 'source');
  const output = path.join(root, 'public');
  const index = JSON.parse(await fs.readFile(path.join(source, 'marathon-lore/content/index.json'), 'utf8'));
  const categories = await Promise.all(index.map(async category => ({
    ...category,
    ...JSON.parse(await fs.readFile(path.join(source, category.module), 'utf8')),
  })));
  const tags = buildTagIndex(categories);
  await fs.writeFile(path.join(output, 'marathon-lore/content/tag-index.json'), JSON.stringify(packTagIndex(tags)));
  await fs.writeFile(path.join(output, 'marathon-lore/content/index.json'), JSON.stringify(index.map((item, i) => ({
    ...item, count: categories[i].count || `${collectLoreEntries(categories[i]).length} 条目`,
  }))));
  let count = 0;
  for (const record of categories.flatMap(collectLoreEntries)) {
    const { category, section, entry, nodePath, url } = record;
    async function body(file, terminal = false) {
      if (!file) return '';
      const text = await fs.readFile(path.join(source, file), 'utf8');
      if (/\.txt$/i.test(file)) return `<pre>${esc(text)}</pre>`;
      return terminal ? markdownToParagraphs(text).join('\n') : markdownToHtml(text);
    }
    function image(item) {
      return item.image ? `<img class="lore-article-image" src="${esc(item.image)}" alt="${esc(item.title || entry.title)}" loading="lazy" decoding="async">` : '';
    }
    function audio(item) {
      const media = item.audio;
      if (!media) return '';
      const sources = Array.isArray(media.sources) ? media.sources : [media];
      const tags = sources.map(value => {
        const src = typeof value === 'string' ? value : value.src || value.url;
        return src && (/^https?:\/\//i.test(src) || src.startsWith('/')) ? `<source src="${esc(src)}">` : '';
      }).filter(Boolean).join('');
      return tags ? `<audio controls preload="none" aria-label="${esc(item.title || entry.title)}">${tags}</audio>` : '';
    }
    const logs = await Promise.all((entry.logs || []).map(async log => `<section class="lore-log"><h2>${esc(log.title || entry.title)}</h2>${log.summary ? `<p>${esc(log.summary)}</p>` : ''}${image(log)}${audio(log)}${await body(log.bodyFile, true)}</section>`));
    const description = stripHtmlTags(entry.summary || entry.note || `${category.title} / ${section.title} / ${entry.title}`).slice(0, 155);
    const interactive = '/marathon-lore/#marathon-lore/' + [category.id, section.id, ...nodePath].map(encodeURIComponent).join('/');
    const title = `${entry.title} - 马拉松中文百科`;
    const jsonLd = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: entry.title, description, url: siteUrl + url, inLanguage: 'zh-CN', isPartOf: { '@type': 'WebSite', name: '马拉松中文站', url: siteUrl } }).replaceAll('<', '\\u003c');
    const html = `<!DOCTYPE html>
<html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(siteUrl + url)}">
<link rel="icon" href="/marathon-lore/assets/images/icons/marathon-icon.jpg">
<link rel="stylesheet" href="/css/community-theme.css"><link rel="stylesheet" href="/css/lore-article.css">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(siteUrl + url)}"><meta property="og:image" content="${siteUrl}/images/share-card.webp">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${siteUrl}/images/share-card.webp">
<script type="application/ld+json">${jsonLd}</script>
</head><body class="lore-article-page">
<nav class="community-nav" aria-label="站点导航"><a href="/">首页</a><a href="/news/">最近消息</a><a href="/store/">商店</a><a href="/map/perimeter/">地图</a><a class="active" href="/marathon-lore/">百科</a><a href="/factions/">阵营</a><a href="/Classic-marathon/">经典终端</a></nav>
<main class="lore-article"><nav aria-label="面包屑"><a href="/marathon-lore/">百科</a> / <a href="${esc('/marathon-lore/#marathon-lore/' + encodeURIComponent(category.id))}">${esc(category.title)}</a> / ${esc(section.title)}</nav>
<article><header><h1>${esc(entry.title)}</h1>${entry.summary ? `<p>${esc(entry.summary)}</p>` : ''}<a class="article-interactive-link" href="${esc(interactive)}">在百科中浏览</a></header>
${image(entry)}${await body(entry.bodyFile)}${entry.note ? `<p>${esc(entry.note)}</p>` : ''}${logs.join('\n')}
</article><footer><a href="/marathon-lore/entries/">全部百科条目</a></footer></main></body></html>`;
    // URL segments are encoded for links, decoded for filesystem paths served by Pages.
    const dir = path.join(output, decodeURIComponent(url));
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'index.html'), html);
    count++;
  }
  // A visible directory exposes real entry links to users and crawlers.
  const catalog = categories.map(category => `<section><h2>${esc(category.title)}</h2><ul>${collectLoreEntries(category).map(record => `<li><a href="${esc(record.url)}">${esc(record.entry.title)}</a></li>`).join('')}</ul></section>`).join('');
  const dir = path.join(output, 'marathon-lore/entries');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'index.html'), `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>百科条目目录 - 马拉松中文站</title><meta name="description" content="浏览全部马拉松中文百科条目及日志正文。"><link rel="stylesheet" href="/css/community-theme.css"><link rel="stylesheet" href="/css/lore-article.css"></head><body class="lore-article-page"><main class="lore-article"><a href="/marathon-lore/">返回互动百科</a><h1>百科条目目录</h1>${catalog}</main></body></html>`);
  console.log(`Lore: ${count} static entry pages and ${tags.length} tags.`);
}
