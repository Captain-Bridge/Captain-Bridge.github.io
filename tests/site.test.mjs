import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkContent } from '../tools/check-content.mjs';
import { checkLinks } from '../tools/check-links.mjs';
import { buildTagIndex, packTagIndex, unpackTagIndex, collectLoreEntries } from '../source/js/archive-data.mjs';
import { markdownToHtml, escapeHtml } from '../source/js/archive-markdown.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = async relative => JSON.parse(await fs.readFile(path.join(root, relative), 'utf8'));

test('homepage redesign preserves the baseline module copy and quotation', async () => {
  const home = await fs.readFile(path.join(root, 'source/index.html'), 'utf8');
  const baseline = await json('tests/fixtures/home-copy.json');
  for (const { href, title, paragraphs } of baseline.cards) {
    assert.ok(home.includes(`href="${href}"`), href);
    assert.ok(home.includes(title), title);
    for (const text of paragraphs) assert.ok(home.includes(text), text);
  }
  for (const text of baseline.quote) assert.ok(home.includes(text), text);
});

test('built HTML links and asset URLs resolve with exact filename case', async () => {
  await checkLinks(path.join(root, 'public'));
});

test('compact tag index preserves every tag, result and its ordering', async () => {
  const index = await json('source/marathon-lore/content/index.json');
  const categories = await Promise.all(index.map(category => json('source' + category.module)));
  const tags = buildTagIndex(categories);
  const compact = packTagIndex(tags);
  assert.deepEqual(unpackTagIndex(compact), tags);
  assert.ok(JSON.stringify(compact).length < JSON.stringify(tags).length * 0.6);
  const urls = categories.flatMap(collectLoreEntries).map(entry => entry.url);
  assert.equal(new Set(urls).size, urls.length, 'Entry routes must be unique');
});

test('Markdown keeps supported formatting and rejects executable link/image URLs', () => {
  const html = markdownToHtml('## 秘藏\n\n**正文** <span style="color:red; background-image:url(bad)">中文</span>\n\n[阅读](/news/)\n\n[危险](javascript:alert)\n\n![危险](data:image/svg+xml,bad)');
  assert.match(html, /<strong>正文<\/strong>/);
  assert.match(html, /color: red/);
  assert.match(html, /href="\/news\/"/);
  assert.doesNotMatch(html, /href="javascript:|src="data:|background-image/);
  assert.doesNotMatch(markdownToHtml('[危险](java&#x73;cript:alert)'), /<a /);
});

test('content validator rejects Windows-only case matches and missing assets', async () => {
  const fixtures = path.join(root, 'artifacts/content-check');
  await fs.mkdir(fixtures, { recursive: true });
  await fs.writeFile(path.join(fixtures, 'Image.webp'), 'fixture');
  await fs.writeFile(path.join(fixtures, 'index.json'), JSON.stringify({ image: '/image.webp', bodyFile: '/missing.md' }));
  await assert.rejects(checkContent(fixtures), error => error.message.includes('case mismatch') && error.message.includes('missing /missing.md'));
  await fs.writeFile(path.join(fixtures, 'index.json'), JSON.stringify({ image: '/Image.webp' }));
  await checkContent(fixtures);
});

test('built news list stays small and contains no complete article bodies', async () => {
  const source = await json('source/news/data/marathon-news.json');
  const index = await json('public/news/data/news-index.json');
  assert.equal(index.items.length, source.items.length);
  assert.ok(Buffer.byteLength(JSON.stringify(index)) < 120 * 1024);
  for (const item of index.items) {
    assert.ok(item.title && item.localPath);
    assert.equal(item.content, undefined);
    assert.equal(item.bodyHtml, undefined);
    assert.equal(item.bodyText, undefined);
    assert.ok(item.preview.length <= 180);
  }
});

test('built lore pages include full readable content, links and sitemap entries', async () => {
  const index = await json('source/marathon-lore/content/index.json');
  const sitemap = await fs.readFile(path.join(root, 'public/sitemap.xml'), 'utf8');
  const directory = await fs.readFile(path.join(root, 'public/marathon-lore/entries/index.html'), 'utf8');
  let count = 0;
  for (const category of await Promise.all(index.map(category => json('source' + category.module)))) {
    for (const { url, entry } of collectLoreEntries(category)) {
      const html = await fs.readFile(path.join(root, 'public', decodeURIComponent(url), 'index.html'), 'utf8');
      assert.ok(html.includes(escapeHtml(entry.title)));
      assert.ok(html.includes('<article>') && html.includes('rel="canonical"'));
      assert.ok(directory.includes(escapeHtml(url)));
      assert.ok(sitemap.includes(url.replaceAll("'", '&apos;')) || sitemap.includes(url));
      count++;
    }
  }
  assert.ok(count > 500);
  assert.doesNotMatch(sitemap, /<lastmod>/, 'Build timestamps must not masquerade as content dates');
});

test('decorative video never creates an eager media request', async () => {
  for (const route of ['index.html', 'marathon-lore/index.html', 'store/index.html']) {
    const html = await fs.readFile(path.join(root, 'public', route), 'utf8');
    const video = html.match(/<video\b[\s\S]*?<\/video>/)?.[0];
    if (video) {
      assert.ok(video.includes('data-background-video'));
      assert.doesNotMatch(video, /\sautoplay\b|\ssrc=/);
      assert.match(video, /data-src=/);
    }
  }
});
