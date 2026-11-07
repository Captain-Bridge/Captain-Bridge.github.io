import fs from 'node:fs/promises';
import path from 'node:path';

export async function buildNewsIndex(root) {
  const data = JSON.parse(await fs.readFile(path.join(root, 'source/news/data/marathon-news.json'), 'utf8'));
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
      image: item.images?.primary?.url,
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
  console.log(`News list index: ${(Buffer.byteLength(output) / 1024).toFixed(1)} KiB for ${items.length} articles.`);
}
