// SEO 预渲染：把 JS 渲染模块的内容以 <noscript> 静态快照注入到产物 HTML，
// 让不执行 JavaScript 的搜索引擎爬虫（百度、Bing 快照、各类长尾爬虫）也能读到内容。
//
// 设计原则：
//   1. 单一数据源 —— 只读取 source/ 下已有的 json/md，不复制、不硬编码内容。
//   2. 零前端回归 —— 只往 public/ 的 HTML 里追加 <noscript>，不碰任何 JS 渲染逻辑。
//   3. 合规 —— 用 <noscript> 而非隐藏文本（display:none/hidden 属于 cloaking 风险）。
//   4. 幂等 —— 重复构建时先移除旧注入，再写入新内容。
//
// 覆盖模块：
//   - /news/            新闻列表（60 条，带站内详情链接）
//   - /marathon-lore/   百科（6 模块 × 全部条目的标题 + 摘要 + 标签）
//   - /factions/        阵营（6 阵营的升级节点说明）
//   - /map/{map}/       互动地图（5 张地图的 POI 名称与描述）

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const NOSCRIPT_OPEN = '<noscript class="seo-prerender">';
const NOSCRIPT_CLOSE = '</noscript>';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

// 移除上一次构建注入的 noscript 块，保证幂等。
function stripExisting(html) {
  const re = new RegExp(
    `${NOSCRIPT_OPEN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${NOSCRIPT_CLOSE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?=<\\/body>)`,
    'g'
  );
  return html.replace(re, '');
}

async function inject(publicFile, bodyHtml) {
  const file = path.resolve(publicFile);
  let html;
  try {
    html = await fs.readFile(file, 'utf8');
  } catch {
    return false;
  }
  if (!bodyHtml.trim()) {
    // 没有可注入的内容也要清理旧注入，避免残留过期数据。
    html = stripExisting(html);
  } else {
    html = stripExisting(html);
    const block = `${NOSCRIPT_OPEN}\n<div class="seo-static-content">\n${bodyHtml}\n</div>\n${NOSCRIPT_CLOSE}`;
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${block}\n</body>`);
    } else {
      html += `\n${block}\n`;
    }
  }
  await fs.writeFile(file, html, 'utf8');
  return true;
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------
// 1. 新闻列表 /news/
// ---------------------------------------------------------------
async function buildNews(sourceDir) {
  const data = await readJson(path.join(sourceDir, 'news/data/marathon-news.json'));
  const items = data && Array.isArray(data.items) ? data.items : [];
  if (!items.length) return '';

  const list = items
    .map((it) => {
      const zh = it?.content?.zh || {};
      const title = zh.title || it?.content?.en?.title || it?.slug || '';
      const summary = zh.excerpt || zh.subtitle || zh.bodyText || '';
      const date = fmtDate(it?.publishedAt);
      const category = it?.category || '';
      const href = it?.localPath || '';
      const meta = [category, date].filter(Boolean).join(' · ');
      const link = href ? `<a href="${esc(href)}">${esc(title)}</a>` : `<strong>${esc(title)}</strong>`;
      const tail = summary ? ` — ${esc(String(summary).slice(0, 160))}` : '';
      return `  <li>${link}${tail}${meta ? ` <small>（${esc(meta)}）</small>` : ''}</li>`;
    })
    .join('\n');

  return `<h2>Marathon 新闻归档（${items.length} 条）</h2>\n<ul>\n${list}\n</ul>`;
}

// ---------------------------------------------------------------
// 2. 百科 /marathon-lore/
// ---------------------------------------------------------------
// 遍历模块树，收集叶子条目（带 title + summary 或 bodyFile 的节点）。
function collectLoreEntries(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node.sections) && node.sections.length) {
    for (const child of node.sections) collectLoreEntries(child, out);
    return;
  }
  if (Array.isArray(node.children) && node.children.length) {
    for (const child of node.children) collectLoreEntries(child, out);
    return;
  }
  if (Array.isArray(node.nodes) && node.nodes.length) {
    for (const child of node.nodes) collectLoreEntries(child, out);
    return;
  }
  if (node.title && (node.summary || node.bodyFile)) {
    out.push(node);
  }
}

async function buildLore(sourceDir) {
  const index = await readJson(path.join(sourceDir, 'marathon-lore/content/index.json'));
  const modules = Array.isArray(index) ? index : [];
  if (!modules.length) return '';

  const sections = [];
  for (const mod of modules) {
    const moduleRel = String(mod?.module || '').replace(/^\/marathon-lore\/content\//, '');
    if (!moduleRel) continue;
    const moduleData = await readJson(path.join(sourceDir, 'marathon-lore/content', moduleRel));
    const entries = [];
    collectLoreEntries(moduleData, entries);
    if (!entries.length) continue;

    const items = entries
      .map((e) => {
        const meta = Array.isArray(e.meta) && e.meta.length ? ` <small>（${e.meta.map(esc).join(' / ')}）</small>` : '';
        const summary = e.summary ? ` — ${esc(String(e.summary).slice(0, 160))}` : '';
        return `  <li><strong>${esc(e.title)}</strong>${summary}${meta}</li>`;
      })
      .join('\n');

    sections.push(
      `<section>\n<h3>${esc(mod.title)}（${entries.length} 项）</h3>\n<p>${esc(mod.summary || '')}</p>\n<ul>\n${items}\n</ul>\n</section>`
    );
  }

  if (!sections.length) return '';
  return `<h2>百科条目总览</h2>\n${sections.join('\n')}`;
}

// ---------------------------------------------------------------
// 3. 阵营 /factions/
// ---------------------------------------------------------------
async function buildFactions(sourceDir) {
  const catalog = await readJson(path.join(sourceDir, 'factions/data.json'));
  const factions = catalog && Array.isArray(catalog.factions) ? catalog.factions : [];
  if (!factions.length) return '';

  const sections = [];
  for (const f of factions) {
    const dataPath = f?.dataPath || (f?.id ? `/factions/factions/${f.id}.json` : null);
    if (!dataPath) continue;
    const rel = dataPath.replace(/^\/factions\//, '');
    const detail = await readJson(path.join(sourceDir, 'factions', rel));
    const nodes = Array.isArray(detail?.nodes) ? detail.nodes : [];

    const rows = [];
    for (const node of nodes) {
      const levels = Array.isArray(node?.levels) ? node.levels : [];
      for (const lv of levels) {
        const bits = [lv?.describe, lv?.unlockName ? `解锁：${lv.unlockName}` : '', lv?.summary]
          .filter(Boolean)
          .join('，');
        if (bits) rows.push(`  <li>${esc(bits)}</li>`);
      }
    }

    const agent = detail?.agent ? `（${esc(detail.agent)}）` : '';
    sections.push(
      `<section>\n<h3>${esc(f.title)}${agent}</h3>\n${rows.length ? `<ul>\n${rows.join('\n')}\n</ul>` : '<p>暂无升级数据。</p>'}\n</section>`
    );
  }

  if (!sections.length) return '';
  return `<h2>阵营升级一览</h2>\n<p>${esc(catalog?.summary || '')}</p>\n${sections.join('\n')}`;
}

// ---------------------------------------------------------------
// 4. 互动地图 /map/{map}/
// ---------------------------------------------------------------
const MAP_PAGES = ['perimeter', 'dire-marsh', 'dire-marsh-night', 'outpost', 'cryo-archive'];

async function buildMap(sourceDir, mapId) {
  const data = await readJson(path.join(sourceDir, 'map', mapId, `${mapId}.json`));
  if (!data) return '';
  const pois = Array.isArray(data.pois) ? data.pois : [];
  const rows = pois
    .map((p) => {
      const desc = String(p?.description || '').trim();
      return desc
        ? `  <li><strong>${esc(p.title || p.id)}</strong> — ${esc(desc)}</li>`
        : `  <li>${esc(p.title || p.id)}</li>`;
    })
    .join('\n');

  return `<h2>${esc(data.title || mapId)} 地图点位</h2>\n${rows ? `<ul>\n${rows}\n</ul>` : '<p>暂无点位数据。</p>'}`;
}

// ---------------------------------------------------------------
// 入口
// ---------------------------------------------------------------
export async function prerender(root) {
  const sourceDir = path.join(root, 'source');
  const publicDir = path.join(root, 'public');

  const tasks = [];

  // 1. 新闻列表
  tasks.push(
    (async () => {
      const body = await buildNews(sourceDir);
      return inject(path.join(publicDir, 'news/index.html'), body);
    })()
  );

  // 2. 百科
  tasks.push(
    (async () => {
      const body = await buildLore(sourceDir);
      return inject(path.join(publicDir, 'marathon-lore/index.html'), body);
    })()
  );

  // 3. 阵营
  tasks.push(
    (async () => {
      const body = await buildFactions(sourceDir);
      return inject(path.join(publicDir, 'factions/index.html'), body);
    })()
  );

  // 4. 地图（5 张）
  for (const mapId of MAP_PAGES) {
    tasks.push(
      (async () => {
        const body = await buildMap(sourceDir, mapId);
        return inject(path.join(publicDir, 'map', mapId, 'index.html'), body);
      })()
    );
  }

  const results = await Promise.all(tasks);
  const injected = results.filter(Boolean).length;
  console.log(`[prerender] 注入 noscript 静态快照：${injected}/${results.length} 个页面`);
  return injected;
}

// 支持直接运行：node scripts/prerender.mjs
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  await prerender(root);
}
