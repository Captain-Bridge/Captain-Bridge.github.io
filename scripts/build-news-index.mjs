import fs from 'node:fs/promises';
import path from 'node:path';
import { escapeHtml as esc } from '../source/js/archive-markdown.mjs';

export async function buildNewsIndex(root) {
  const data = JSON.parse(await fs.readFile(path.join(root, 'source/news/data/marathon-news.json'), 'utf8'));
  const covers = await fs.readFile(path.join(root, 'source/news/assets/cover-index.json'), 'utf8').then(JSON.parse).catch(error => {
    if (error.code === 'ENOENT') return {};
    throw error;
  });
  const items = data.items.map(item => {
    const zh = item.content?.zh || {};
    const en = item.content?.en || {};
    const title = zh.title || en.title || item.slug;
    const excerpt = zh.excerpt || zh.subtitle || zh.bodyText?.slice(0, 220) || en.excerpt || en.subtitle || en.bodyText?.slice(0, 220) || '';
    const subtitle = zh.subtitle || en.subtitle || excerpt;
    const body = (zh.bodyText || en.bodyText || '').replace(/\s+/g, ' ').trim();
    const normalizedSubtitle = subtitle.replace(/\s+/g, ' ').trim();
    const preview = (body.startsWith(normalizedSubtitle) ? body.slice(normalizedSubtitle.length).trim() : body) || body;
    return {
      slug: item.slug, title, excerpt, subtitle,
      preview: preview.slice(0, 180), hasMorePreview: preview.length > 180,
      publishedAt: item.publishedAt, author: item.author, category: item.category,
      localPath: item.localPath,
      articleUrl: item.articleUrl?.en || item.articleUrl,
      image: covers[item.images?.primary?.url]?.path || item.images?.primary?.url,
      metrics: item.metrics,
    };
  });
  const index = {
    generatedAt: data.generatedAt, count: items.length, itemsPerPage: data.itemsPerPage || 8,
    bilingualCount: data.bilingualSummary?.bilingualCount || data.translation?.generatedCount || 0,
    items,
  };
  const output = JSON.stringify(index);
  await fs.writeFile(path.join(root, 'public/news/data/news-index.json'), output);
  const homeFile = path.join(root, 'public/index.html');
  const home = await fs.readFile(homeFile, 'utf8');
  const latest = items.slice(0, 3).map(item => `<a class="home-news-item" href="${esc(item.localPath)}"><div class="home-news-image"><img src="${esc(item.image || '/images/archive-hero-800.webp')}" alt="" loading="lazy" decoding="async" width="640" height="360"><span>↗</span></div><div class="home-news-meta"><time datetime="${esc(item.publishedAt)}">${esc(item.publishedAt.slice(0, 10))}</time><span>${esc(item.category)}</span></div><h3>${esc(item.title)}</h3></a>`).join('');
  await fs.writeFile(homeFile, home.replace(/<!-- home-news:start -->[\s\S]*?<!-- home-news:end -->/, `<!-- home-news:start -->${latest}<!-- home-news:end -->`));
  console.log(`News list index: ${(Buffer.byteLength(output) / 1024).toFixed(1)} KiB for ${items.length} articles.`);
}
