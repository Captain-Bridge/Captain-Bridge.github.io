let categoryData = [];
const categoryModuleCache = new Map();

const appView = document.getElementById('app-view');
const viewport = document.querySelector('.viewport');
const frameHeader = document.querySelector('.frame-header');
const frameLabel = frameHeader?.querySelector('.frame-label') || null;
const frameId = frameHeader?.querySelector('.frame-id') || null;
const state = {
  view: 'root',
  categoryId: null,
  sectionId: null,
  nodePath: [],
  logId: null,
  entryVariant: null,
  tag: null
};

const docCache = new Map();
const markdownSourceCache = new Map();
const previewCache = new Map();
let tagIndex = [];
let tagSearchQuery = '';
let tagRailScrollTop = 0;
let previewTooltip = null;
let activePreviewAnchor = null;
let activePreviewToken = 0;
let audioControlCleanup = null;

function syncLayoutState() {
  const isTagsView = state.view === 'tags';
  appView.classList.toggle('is-tags', isTagsView);
  viewport?.classList.toggle('is-tags', isTagsView);
}

function detachAudioControls() {
  if (typeof audioControlCleanup === 'function') {
    audioControlCleanup();
    audioControlCleanup = null;
  }
}

function formatAudioTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const remainder = String(whole % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function rememberTagRailScroll() {
  const tagRail = appView.querySelector('.tag-rail');
  if (tagRail) {
    tagRailScrollTop = tagRail.scrollTop;
  }
}

function restoreTagRailScroll() {
  const tagRail = appView.querySelector('.tag-rail');
  if (tagRail) {
    tagRail.scrollTop = tagRailScrollTop;
  }
}

function ensureFrameHeaderStack() {
  if (!frameHeader || !frameLabel) return null;
  let stack = frameHeader.querySelector('[data-frame-header-stack]');
  if (!stack) {
    stack = document.createElement('div');
    stack.dataset.frameHeaderStack = 'true';
    stack.className = 'frame-header-stack';
    frameHeader.insertBefore(stack, frameLabel);
    stack.appendChild(frameLabel);
  }
  return stack;
}

function ensureFrameHeaderSearchSlot() {
  if (!frameHeader) return null;
  let slot = frameHeader.querySelector('[data-frame-header-search-slot]');
  if (!slot) {
    slot = document.createElement('div');
    slot.dataset.frameHeaderSearchSlot = 'true';
    slot.className = 'frame-header-search-slot';
    if (frameId) {
      frameHeader.insertBefore(slot, frameId);
    } else {
      frameHeader.appendChild(slot);
    }
  }
  return slot;
}

function syncFrameViewMeta(content = '') {
  if (!frameHeader) return;
  const stack = ensureFrameHeaderStack();
  let meta = frameHeader.querySelector('[data-frame-view-meta]');
  if (!meta) {
    meta = document.createElement('div');
    meta.dataset.frameViewMeta = 'true';
    meta.className = 'frame-view-meta';
    if (stack) {
      stack.appendChild(meta);
    } else {
      frameHeader.prepend(meta);
    }
  } else if (stack && meta.parentElement !== stack) {
    stack.appendChild(meta);
  }

  meta.innerHTML = content;
  meta.hidden = !content;
}

function syncFrameViewSearch(content = '') {
  if (!frameHeader) return;
  const slot = ensureFrameHeaderSearchSlot();
  if (!slot) return;
  slot.innerHTML = content;
  slot.hidden = !content;
}

function iconMarkup(name) {
  const icons = {
    folder: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linejoin="round"><path d="M8 18h16l8 8h24v28H8z"/><path d="M8 18v36"/></svg>`,
    cache: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linejoin="round"><path d="M14 22h36l8 8v14l-8 8H14l-8-8V30z"/><path d="M14 22l10 10h16l10-10"/><path d="M14 52l10-10h16l10 10"/></svg>`,
    world: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5"><circle cx="32" cy="32" r="22"/><path d="M10 32h44M32 10a35 35 0 0 0 0 44M32 10a35 35 0 0 1 0 44"/></svg>`,
    faction: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linejoin="round"><path d="M32 8l14 8v16l-14 8-14-8V16z"/><path d="M18 32v16l14 8 14-8V32"/></svg>`,
    runner: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"><path d="M22 14h20M32 14v36M8 32h48M16 16l32 32M48 16L16 48"/></svg>`,
    tech: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5"><rect x="18" y="18" width="28" height="28" rx="4"/><path d="M8 24h10M46 24h10M8 40h10M46 40h10M24 8v10M40 8v10M24 46v10M40 46v10"/></svg>`,
    arrows: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 22h12V10"/><path d="M18 22L34 6"/><path d="M46 22H34V10"/><path d="M46 22L30 6"/><path d="M18 42h12v12"/><path d="M18 42l16 16"/><path d="M46 42H34v12"/><path d="M46 42L30 58"/></svg>`,
    badge: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linejoin="round"><path d="M22 16h20l10 10v12L40 50H24L12 38V26z"/></svg>`,
    spark: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"><path d="M32 8v16M32 40v16M8 32h16M40 32h16M16 16l11 11M37 37l11 11M48 16L37 27M27 37L16 48"/><rect x="24" y="24" width="16" height="16"/></svg>`,
    brace: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"><path d="M18 16h8v10H18v12h8v10h-8"/><path d="M46 16h-8v10h8v12h-8v10h8"/><path d="M28 32h8"/></svg>`,
    grenade: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linejoin="round"><path d="M26 18h12l8 8v12l-8 8H26l-8-8V26z"/><path d="M26 18v-6h12v6"/><path d="M42 12l10-4"/></svg>`,
    module: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5"><rect x="16" y="24" width="32" height="16" rx="4"/><path d="M10 32h6M48 32h6M24 24v16M40 24v16"/></svg>`,
    lock: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5"><rect x="18" y="28" width="28" height="24" rx="4"/><path d="M24 28v-6a8 8 0 0 1 16 0v6"/></svg>`,
    archive: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5"><path d="M14 18h36l6 8v24H8V18z"/><path d="M14 18l8 8h18l10-8"/></svg>`,
    clock: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5"><circle cx="32" cy="32" r="22"/><path d="M32 20v14l10 6"/></svg>`,
    signal: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5"><path d="M16 44h8M28 36h8M40 28h8"/><path d="M16 20h32"/></svg>`,
    shield: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5"><path d="M32 10l18 8v12c0 12-7 20-18 24-11-4-18-12-18-24V18z"/></svg>`,
    route: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 18h18v14M30 18L16 32"/><path d="M52 46H34V32"/><path d="M34 46l14-14"/></svg>`,
    chip: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5"><rect x="18" y="18" width="28" height="28" rx="2"/><path d="M8 24h10M46 24h10M8 40h10M46 40h10M24 8v10M40 8v10M24 46v10M40 46v10"/></svg>`,
    key: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="32" r="10"/><path d="M34 32h20M46 32v8M54 32v8"/></svg>`
  };

  return icons[name] || icons.archive;
}

function isCustomIconAsset(value) {
  if (typeof value !== 'string') return false;
  const normalized = value.trim();
  if (!normalized) return false;
  return /^([/.]|[A-Za-z]:\\)/.test(normalized) || /\.(svg|png|jpe?g|webp|gif)$/i.test(normalized);
}

function iconVisual(item) {
  const iconName = item?.icon;
  if (item?.iconImage) {
    return `<img src="${item.iconImage}" alt="${item.title || 'Icon'}">`;
  }

  if (iconName == null || iconName === 'None' || iconName === 'none') {
    return '';
  }

  if (isCustomIconAsset(iconName)) {
    return `<img src="${iconName}" alt="${item.title || 'Icon'}">`;
  }

  return iconMarkup(iconName);
}

function tagResultVisual(item) {
  if (!item) return iconMarkup('archive');
  const alt = item.logTitle || item.entryTitle || 'Icon';
  const isLogResult = item.resultKind === 'log' || Boolean(item.logId);

  if (isLogResult) {
    if (item.image) {
      return `<img src="${item.image}" alt="${alt}">`;
    }
    if (item.iconImage) {
      return `<img src="${item.iconImage}" alt="${alt}">`;
    }
  } else {
    if (item.iconImage) {
      return `<img src="${item.iconImage}" alt="${alt}">`;
    }
    if (item.image) {
      return `<img src="${item.image}" alt="${alt}">`;
    }
  }
  return iconMarkup('archive');
}

function getDisplayIconImage(item) {
  if (!item) return null;
  return item.variantB?.iconImage || item.iconImage || getEntryDisplayIconImage(item) || null;
}

function getEntryDisplayIconImage(entry) {
  if (!entry) return null;
  if (entry.iconImage) return entry.iconImage;

  const logs = getLogs(entry);
  if (logs.length > 0 && logs[0]?.image) {
    return logs[0].image;
  }

  return '/marathon-lore/assets/images/default_icon.webp';
}

function getPreviewBodyFile(item) {
  if (!item) return null;
  return item.variantB?.bodyFile || item.bodyFile || null;
}

function getCategory(id) {
  return categoryData.find(item => item.id === id) || null;
}

function mergeCategoryData(baseCategory, loadedCategory) {
  return {
    ...baseCategory,
    ...loadedCategory,
    id: loadedCategory?.id || baseCategory?.id,
    title: loadedCategory?.title || baseCategory?.title,
    count: loadedCategory?.count || baseCategory?.count,
    icon: loadedCategory?.icon || baseCategory?.icon,
    iconImage: loadedCategory?.iconImage || baseCategory?.iconImage,
    summary: loadedCategory?.summary || baseCategory?.summary,
    note: loadedCategory?.note || baseCategory?.note,
    status: loadedCategory?.status || baseCategory?.status
  };
}

async function ensureCategoryLoaded(categoryId) {
  const category = getCategory(categoryId);
  if (!category?.module) return category;
  if (Array.isArray(category.sections)) return category;

  if (categoryModuleCache.has(categoryId)) {
    return categoryModuleCache.get(categoryId);
  }

  const request = fetch(category.module)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load category module ${category.module}: ${response.status}`);
      }
      return response.json();
    })
    .then(moduleData => {
      const merged = mergeCategoryData(category, moduleData);
      const index = categoryData.findIndex(item => item.id === categoryId);
      if (index >= 0) {
        categoryData[index] = merged;
      }
      return merged;
    });

  categoryModuleCache.set(categoryId, request);
  return request;
}

function getSection(category, id) {
  return category?.sections?.find(item => item.id === id) || null;
}

function normalizeTagList(meta = []) {
  return Array.isArray(meta)
    ? meta.map(item => String(item || '').trim()).filter(Boolean)
    : [];
}

function getTagKey(tag) {
  return String(tag || '').trim().toLowerCase();
}

function matchesTagQuery(value, query) {
  if (!query) return true;
  return String(value || '').toLowerCase().includes(query);
}

function filterTagIndex(query) {
  const normalized = String(query || '').trim().toLowerCase();
  if (!normalized) return tagIndex;

  return tagIndex
    .map(group => ({
      tag: group.tag,
      items: group.items.filter(item => (
        matchesTagQuery(group.tag, normalized) ||
        matchesTagQuery(item.tag, normalized) ||
        matchesTagQuery(item.logTitle, normalized) ||
        matchesTagQuery(item.entryTitle, normalized) ||
        matchesTagQuery(item.sectionTitle, normalized) ||
        matchesTagQuery(item.categoryTitle, normalized)
      ))
    }))
    .filter(group => group.items.length > 0);
}

function rebuildTagIndex() {
  const map = new Map();

  for (const category of categoryData) {
    const sections = Array.isArray(category?.sections) ? category.sections : [];

    for (const section of sections) {
      const visit = (nodes, path = []) => {
        for (const node of nodes || []) {
          if (!node) continue;
          const children = getNodeChildren(node);
          if (children.length) {
            visit(children, [...path, node.id]);
          }

          if (!isDetailNode(node)) continue;

          const entry = normalizeEntryRecord(node);
          if (!entry) continue;

          const logs = getLogs(entry);
          const records = entry.hasVariantA ? logs : [entry.variantB || entry];

          for (const log of records) {
            if (!log) continue;
            const tags = normalizeTagList(log.meta);
            for (const tag of tags) {
              const key = getTagKey(tag);
              if (!key) continue;

              if (!map.has(key)) {
                map.set(key, {
                  tag,
                  items: []
                });
              }

              map.get(key).items.push({
                tag,
                categoryId: category.id,
                categoryTitle: category.title,
                sectionId: section.id,
                sectionTitle: section.title,
                entryId: entry.id,
                nodePath: path.length ? [...path, entry.id] : [entry.id],
                entryTitle: entry.title,
                logId: log.id || null,
                logTitle: log.title || entry.title,
                entryVariant: entry.hasVariantA ? 'a' : 'b',
                resultKind: 'log',
                bodyFile: log.bodyFile || null,
                image: log.image || null,
                iconImage: log.iconImage || null
              });
            }
          }
        }
      };

      visit(getSectionItems(section));
    }
  }

  tagIndex = [...map.values()]
    .map(item => ({
      tag: item.tag,
      items: item.items.sort((a, b) => {
        const left = `${a.categoryTitle}/${a.sectionTitle}/${a.entryTitle}/${a.logTitle}`;
        const right = `${b.categoryTitle}/${b.sectionTitle}/${b.entryTitle}/${b.logTitle}`;
        return left.localeCompare(right, 'zh-Hans-CN');
      })
    }))
    .sort((a, b) => {
      const countDiff = b.items.length - a.items.length;
      if (countDiff !== 0) return countDiff;
      return a.tag.localeCompare(b.tag, 'zh-Hans-CN');
    });
}

function getTagContext(tag) {
  return tagIndex.find(item => getTagKey(item.tag) === getTagKey(tag)) || null;
}

async function ensureAllCategoriesLoaded() {
  await Promise.all(
    categoryData
      .filter(category => category?.module)
      .map(category => ensureCategoryLoaded(category.id))
  );
}

function getSectionItems(section) {
  if (Array.isArray(section?.nodes)) return section.nodes;
  if (Array.isArray(section?.children)) return section.children;
  if (Array.isArray(section?.entries)) return section.entries;
  return [];
}

function getNodeChildren(node) {
  if (Array.isArray(node?.children)) return node.children;
  if (Array.isArray(node?.nodes)) return node.nodes;
  if (Array.isArray(node?.entries)) return node.entries;
  return [];
}

function isDetailNode(node) {
  if (!node) return false;
  if (getNodeChildren(node).length) return false;

  return Boolean(
    node.bodyFile ||
    node.image ||
    node.iconImage ||
    (Array.isArray(node.logs) && node.logs.length) ||
    node.summary ||
    node.status ||
    node.note
  );
}

function isFolderNode(node) {
  return Boolean(node) && getNodeChildren(node).length > 0 && !isDetailNode(node);
}

function resolveNodePath(section, path = []) {
  let items = getSectionItems(section);
  const chain = [];

  for (const id of path) {
    const current = items.find(item => item.id === id);
    if (!current) {
      return { chain, current: chain.at(-1) || null, items, resolved: false };
    }

    chain.push(current);
    items = getNodeChildren(current);
  }

  return { chain, current: chain.at(-1) || null, items, resolved: true };
}

function getFolderContext(section, path = []) {
  if (!path.length) {
    return {
      chain: [],
      current: null,
      items: getSectionItems(section),
      path: []
    };
  }

  const resolved = resolveNodePath(section, path);

  if (resolved.resolved && isFolderNode(resolved.current)) {
    return {
      chain: resolved.chain,
      current: resolved.current,
      items: getNodeChildren(resolved.current),
      path: resolved.chain.map(item => item.id)
    };
  }

  const chain = [];
  let items = getSectionItems(section);

  for (const id of path) {
    const current = items.find(item => item.id === id);
    if (!current || !isFolderNode(current)) break;
    chain.push(current);
    items = getNodeChildren(current);
  }

  return {
    chain,
    current: chain.at(-1) || null,
    items,
    path: chain.map(item => item.id)
  };
}

function getEntry(section, path = []) {
  return getEntryRecord(section, path);
}

function getEntryNode(section, path = []) {
  if (!section || !path.length) return null;

  const parentPath = path.slice(0, -1);
  const entryId = path.at(-1);
  let items = getSectionItems(section);

  for (const id of parentPath) {
    const current = items.find(item => item.id === id && isFolderNode(item));
    if (!current) return null;
    items = getNodeChildren(current);
  }

  return items.find(item => item.id === entryId && isDetailNode(item)) || null;
}

function hasVariantAData(entry) {
  return Boolean(Array.isArray(entry?.logs) && entry.logs.length);
}

function hasVariantBData(entry) {
  if (!entry) return false;
  if (entry.bodyFile || entry.image || entry.iconImage) return true;

  return !hasVariantAData(entry) && Boolean(
    entry.summary ||
    entry.status ||
    entry.note ||
    (Array.isArray(entry.meta) && entry.meta.length)
  );
}

function normalizeEntryRecord(entry) {
  if (!entry) return null;

  const hasVariantA = hasVariantAData(entry);
  const hasVariantB = hasVariantBData(entry);
  const logs = hasVariantA ? entry.logs.map(item => ({ ...item, accent: 'green' })) : [];

  return {
    ...entry,
    hasVariantA,
    hasVariantB,
    iconImage: getEntryDisplayIconImage(entry),
    bodyFile: hasVariantB ? (entry.bodyFile || null) : null,
    image: hasVariantB ? (entry.image || null) : null,
    logs,
    variantA: hasVariantA ? {
      id: entry.id,
      title: entry.title,
      icon: entry.icon,
      count: entry.count,
      status: null,
      summary: null,
      meta: Array.isArray(entry.meta) ? entry.meta : [],
      logs,
      accent: 'green'
    } : null,
    variantB: hasVariantB ? {
      id: entry.id,
      title: entry.title,
      icon: entry.icon,
      count: entry.count,
      status: entry.status || null,
      summary: entry.summary || null,
      meta: Array.isArray(entry.meta) ? entry.meta : [],
      note: entry.note || null,
      bodyFile: entry.bodyFile || null,
      image: entry.image || null,
      iconImage: entry.iconImage || null,
      accent: 'blue'
    } : null
  };
}

function getEntryRecord(section, path = []) {
  return normalizeEntryRecord(getEntryNode(section, path));
}

function resolveEntryVariant(entry, preferredVariant = null) {
  if (!entry) return null;
  if (preferredVariant === 'a' && entry.hasVariantA) return 'a';
  if (preferredVariant === 'b' && entry.hasVariantB) return 'b';
  if (entry.hasVariantA) return 'a';
  if (entry.hasVariantB) return 'b';
  return preferredVariant;
}

function mergeDisplayItems(items = []) {
  return items.map(item => {
    if (!isDetailNode(item) || !item?.id) return item;
    return normalizeEntryRecord(item);
  });
}

function getLogs(entry) {
  if (Array.isArray(entry?.logs) && entry.logs.length) {
    return entry.logs;
  }

  if (!entry) {
    return [];
  }

  if (!entry.hasVariantA) {
    return [];
  }

  return entry.variantA?.logs || [];
}

function getLog(entry, id) {
  return getLogs(entry).find(item => item.id === id) || null;
}

function pathToString(path = []) {
  return path.join('/');
}

function setHash() {
  const parts = ['marathon-lore'];

  if (state.view === 'tags') {
    parts.push('tags');
    if (state.tag) parts.push(encodeURIComponent(state.tag));
    const nextHash = parts.join('/');
    if (location.hash.replace(/^#/, '') !== nextHash) {
      location.hash = nextHash;
    }
    return;
  }

  if (state.categoryId) parts.push(state.categoryId);
  if (state.sectionId) parts.push(state.sectionId);
  if (state.nodePath.length) parts.push(...state.nodePath);
  if (state.view === 'detail') {
    const section = getSection(getCategory(state.categoryId), state.sectionId);
    const entry = getEntryRecord(section, state.nodePath);
    const logs = getLogs(entry);
    const activeVariant = resolveEntryVariant(entry, state.entryVariant);
    const hasLogRail = activeVariant === 'a' && logs.length > 1;

    if (hasLogRail && state.logId) {
      if (activeVariant) {
        parts.push(`__variant_${activeVariant}`);
      }
      parts.push(state.logId);
    } else if (activeVariant) {
      parts.push(`__variant_${activeVariant}`);
    }
  }

  const nextHash = parts.join('/');
  if (location.hash.replace(/^#/, '') !== nextHash) {
    location.hash = nextHash;
  }
}

function parseHash() {
  const parts = location.hash.replace(/^#/, '').split('/').filter(Boolean);

  if (!parts.length || parts[0] !== 'marathon-lore') {
    return;
  }

  if (parts[1] === 'tags') {
    state.view = 'tags';
    state.tag = decodeURIComponent(parts.slice(2).join('/')) || null;
    state.categoryId = null;
    state.sectionId = null;
    state.nodePath = [];
    state.logId = null;
    state.entryVariant = null;
    return;
  }

  const category = getCategory(parts[1]);
  const section = getSection(category, parts[2]);
  const remainder = parts.slice(3);
  const variantTokenIndex = remainder.findIndex(part => /^__variant_(a|b)$/.test(part));
  const preferredVariant = variantTokenIndex >= 0
    ? remainder[variantTokenIndex].replace('__variant_', '')
    : null;
  const normalizedRemainder = variantTokenIndex >= 0
    ? remainder.filter((_, index) => index !== variantTokenIndex)
    : remainder;

  if (!category) return;

  state.categoryId = category.id;
  state.nodePath = [];
  state.logId = null;
  state.entryVariant = null;
  state.tag = null;

  if (!section) {
    state.view = 'sections';
    state.sectionId = null;
    return;
  }

  state.sectionId = section.id;

  if (!normalizedRemainder.length) {
    state.view = 'entries';
    return;
  }

  const logCandidatePath = normalizedRemainder.slice(0, -1);
  const logCandidateId = normalizedRemainder.at(-1);
  const recordLogEntry = getEntryRecord(section, logCandidatePath);
  const maybeEntryWithLog = recordLogEntry || (
    (() => {
      const resolved = resolveNodePath(section, logCandidatePath);
      return resolved.resolved && isDetailNode(resolved.current) ? resolved.current : null;
    })()
  );

  if (maybeEntryWithLog) {
    const log = getLog(maybeEntryWithLog, logCandidateId);
    if (log) {
      state.view = 'detail';
      state.nodePath = logCandidatePath;
      state.logId = log.id;
      state.entryVariant = 'a';
      return;
    }
  }

  const entry = getEntryRecord(section, normalizedRemainder);
  if (entry) {
      state.view = 'detail';
      state.nodePath = normalizedRemainder;
      state.logId = null;
      state.entryVariant = resolveEntryVariant(entry, preferredVariant);
      return;
  }

  const resolved = resolveNodePath(section, normalizedRemainder);
  if (resolved.resolved && resolved.current) {
    if (isFolderNode(resolved.current)) {
      state.view = 'entries';
      state.nodePath = normalizedRemainder;
      return;
    }
  }

  state.view = 'entries';
  state.nodePath = getFolderContext(section, normalizedRemainder).path;
}

function resetStateToRoot() {
  state.view = 'root';
  state.categoryId = null;
  state.sectionId = null;
  state.nodePath = [];
  state.logId = null;
  state.entryVariant = null;
  state.tag = null;
  tagSearchQuery = '';
}

async function syncStateFromHash() {
  if (!location.hash || location.hash === '#') {
    resetStateToRoot();
    return;
  }

  parseHash();

  // Deep links rely on per-category modules. Parse once to discover the category,
  // then load that module and parse again so section/detail paths can resolve.
  if (state.categoryId) {
    await ensureCategoryLoaded(state.categoryId);
    parseHash();
  }
}

function metaList(items = []) {
  return `
    <div class="meta-list">
      ${items.map(item => `<a class="meta-chip" href="#/marathon-lore/tags/${encodeURIComponent(item)}">${item}</a>`).join('')}
    </div>
  `;
}

function visual(item, footerMarkup = '') {
  const accentClass = item.accent === 'blue' ? 'blue' : 'green';
  const imageModeClass = 'fit-image';
  const footer = footerMarkup ? `<div class="visual-footer">${footerMarkup}</div>` : '';

  if (item.image) {
    return `
      <div class="visual-pane scrollbar ${accentClass} ${imageModeClass}">
        <div class="visual-media">
          <img src="${item.image}" alt="${item.title}">
        </div>
        ${footer}
      </div>
    `;
  }

  return `
    <div class="visual-pane ${accentClass}">
      <div class="visual-fallback">
        ${iconVisual(item)}
        <strong>${item.title}</strong>
      </div>
      ${footer}
    </div>
  `;
}

function normalizeAudioSource(audio) {
  if (!audio) return null;

  if (typeof audio === 'string') {
    const resolvedSrc = resolveMediaSrc(audio);
    return {
      src: resolvedSrc,
      type: inferAudioMimeType(resolvedSrc),
      label: ''
    };
  }

  if (typeof audio !== 'object') {
    return null;
  }

  const src = typeof audio.src === 'string'
    ? audio.src
    : (typeof audio.url === 'string' ? audio.url : '');

  if (!src) return null;

  return {
    src: resolveMediaSrc(src),
    type: typeof audio.type === 'string' && audio.type.trim()
      ? audio.type.trim()
      : inferAudioMimeType(src),
    label: typeof audio.label === 'string' ? audio.label : ''
  };
}

function resolveMediaSrc(src) {
  const value = String(src || '').trim();
  if (!value) return '';
  if (/^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('/')) {
    return value;
  }
  return `/${value.replace(/^\/+/, '')}`;
}

function inferAudioMimeType(src) {
  const value = String(src || '').trim().toLowerCase();
  if (!value) return '';

  const cleanValue = value.split('#')[0].split('?')[0];

  if (cleanValue.endsWith('.mp3')) return 'audio/mpeg';
  if (cleanValue.endsWith('.opus')) return 'audio/ogg; codecs=opus';
  if (cleanValue.endsWith('.ogg')) return 'audio/ogg';
  if (cleanValue.endsWith('.m4a')) return 'audio/mp4';
  if (cleanValue.endsWith('.mp4')) return 'audio/mp4';
  if (cleanValue.endsWith('.aac')) return 'audio/aac';
  if (cleanValue.endsWith('.wav')) return 'audio/wav';
  if (cleanValue.endsWith('.webm')) return 'audio/webm';

  return '';
}

function normalizeAudioSources(audio) {
  if (!audio) return [];

  const items = Array.isArray(audio) ? audio : [audio];
  return items.map(normalizeAudioSource).filter(Boolean);
}

function audioMarkup(audio, title = '音频') {
  const sources = normalizeAudioSources(audio);
  if (!sources.length) return '';

  const sourceMarkup = sources.map(source => `
    <source src="${escapeHtml(source.src)}"${source.type ? ` type="${escapeHtml(source.type)}"` : ''}>
  `).join('');

  return `
    <div class="detail-audio" data-audio-control="true">
      <div class="detail-audio-track" role="slider" tabindex="0" aria-label="${escapeHtml(title)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-audio-track="true">
        <span class="detail-audio-track-layer detail-audio-track-base" aria-hidden="true"></span>
        <div class="detail-audio-track-fill" data-audio-fill="true">
          <span class="detail-audio-track-layer detail-audio-track-fill-image" aria-hidden="true"></span>
        </div>
      </div>
      <audio preload="metadata" hidden data-audio-element="true">
        ${sourceMarkup}
        Your browser does not support the audio element.
      </audio>
    </div>
  `;
}

function setupAudioControls(root) {
  detachAudioControls();

  const host = root.querySelector('.detail-audio[data-audio-control="true"]');
  const audio = host?.querySelector('[data-audio-element="true"]');
  const track = host?.querySelector('[data-audio-track="true"]');
  const fill = host?.querySelector('[data-audio-fill="true"]');
  if (!host || !audio || !track || !fill) return;

  let isDragging = false;
  let pointerDown = false;
  let startX = 0;
  let startY = 0;
  let rafId = 0;
  let suppressClick = false;
  const footer = host.parentElement;
  let resizeObserver = null;

  const updateTrackHeight = () => {
    const fallbackHeight = 24;
    const containerHeight = footer instanceof HTMLElement ? footer.clientHeight : 0;
    const nextHeight = containerHeight > 0
      ? Math.max(20, Math.min(42, Math.round(containerHeight * 0.55)))
      : fallbackHeight;
    host.style.setProperty('--audio-track-height', `${nextHeight}px`);
  };

  const updateTrack = () => {
    const duration = Number(audio.duration);
    const hasDuration = Number.isFinite(duration) && duration > 0;
    const progress = hasDuration ? clamp01(audio.currentTime / duration) : 0;

    host.dataset.playing = audio.paused ? 'false' : 'true';
    host.dataset.seeking = isDragging ? 'true' : 'false';
    track.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    track.setAttribute('aria-valuetext', `${Math.round(progress * 100)}%`);
    fill.style.width = '100%';
    fill.style.clipPath = `inset(0 ${Math.max(0, 100 - progress * 100)}% 0 0)`;
    fill.style.webkitClipPath = `inset(0 ${Math.max(0, 100 - progress * 100)}% 0 0)`;
    host.style.setProperty('--audio-progress', `${progress * 100}%`);
    host.dataset.time = `${formatAudioTime(audio.currentTime)} / ${hasDuration ? formatAudioTime(duration) : '0:00'}`;
  };

  const seekFromClientX = clientX => {
    const rect = track.getBoundingClientRect();
    const ratio = clamp01((clientX - rect.left) / rect.width);
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = audio.duration * ratio;
    }
    updateTrack();
  };

  const startDrag = (clientX, clientY) => {
    pointerDown = true;
    isDragging = false;
    suppressClick = false;
    startX = clientX;
    startY = clientY;
    seekFromClientX(clientX);
  };

  const moveDrag = (clientX, clientY) => {
    if (!pointerDown) return;
    if (!isDragging) {
      const moved = Math.abs(clientX - startX) > 4 || Math.abs(clientY - startY) > 4;
      if (!moved) return;
      isDragging = true;
    }
    seekFromClientX(clientX);
  };

  const finishDrag = () => {
    if (!pointerDown) return;
    const wasDragging = isDragging;
    pointerDown = false;
    isDragging = false;
    updateTrack();
    suppressClick = wasDragging;
  };

  const onClick = event => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    seekFromClientX(event.clientX);
    void togglePlay();
  };

  const onMouseDown = event => {
    if (event.button !== 0) return;
    startDrag(event.clientX, event.clientY);
  };

  const onMouseMove = event => {
    moveDrag(event.clientX, event.clientY);
  };

  const onTouchStart = event => {
    const touch = event.touches[0];
    if (!touch) return;
    startDrag(touch.clientX, touch.clientY);
  };

  const onTouchMove = event => {
    const touch = event.touches[0];
    if (!touch) return;
    moveDrag(touch.clientX, touch.clientY);
    if (pointerDown) {
      event.preventDefault();
    }
  };

  const togglePlay = async () => {
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        updateTrack();
      }
    } else {
      audio.pause();
    }
  };

  const onKeyDown = event => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      void togglePlay();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = Math.max(0, audio.currentTime - Math.max(1, audio.duration * 0.02));
        updateTrack();
      }
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = Math.min(audio.duration, audio.currentTime + Math.max(1, audio.duration * 0.02));
        updateTrack();
      }
    }
  };

  const onTimeUpdate = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      updateTrack();
    });
  };

  audio.addEventListener('loadedmetadata', updateTrack);
  audio.addEventListener('timeupdate', onTimeUpdate);
  audio.addEventListener('play', updateTrack);
  audio.addEventListener('pause', updateTrack);
  audio.addEventListener('ended', updateTrack);
  audio.addEventListener('seeking', updateTrack);
  audio.addEventListener('seeked', updateTrack);

  track.addEventListener('mousedown', onMouseDown);
  track.addEventListener('touchstart', onTouchStart, { passive: true });
  track.addEventListener('touchmove', onTouchMove, { passive: false });
  track.addEventListener('touchend', finishDrag);
  track.addEventListener('touchcancel', finishDrag);
  track.addEventListener('click', onClick);
  track.addEventListener('keydown', onKeyDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', finishDrag);

  updateTrackHeight();
  if (typeof ResizeObserver === 'function' && footer instanceof HTMLElement) {
    resizeObserver = new ResizeObserver(() => {
      updateTrackHeight();
    });
    resizeObserver.observe(footer);
  } else {
    window.addEventListener('resize', updateTrackHeight);
  }

  updateTrack();

  audioControlCleanup = () => {
    if (rafId) cancelAnimationFrame(rafId);
    audio.pause();
    audio.removeEventListener('loadedmetadata', updateTrack);
    audio.removeEventListener('timeupdate', onTimeUpdate);
    audio.removeEventListener('play', updateTrack);
    audio.removeEventListener('pause', updateTrack);
    audio.removeEventListener('ended', updateTrack);
    audio.removeEventListener('seeking', updateTrack);
    audio.removeEventListener('seeked', updateTrack);
    track.removeEventListener('mousedown', onMouseDown);
    track.removeEventListener('touchstart', onTouchStart);
    track.removeEventListener('touchmove', onTouchMove);
    track.removeEventListener('touchend', finishDrag);
    track.removeEventListener('touchcancel', finishDrag);
    track.removeEventListener('click', onClick);
    track.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', finishDrag);
    if (resizeObserver) {
      resizeObserver.disconnect();
    } else {
      window.removeEventListener('resize', updateTrackHeight);
    }
  };
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const ALLOWED_MARKDOWN_HTML_TAGS = new Set([
  'span',
  'div',
  'br',
  'sup',
  'sub',
  'small',
  'mark',
  'kbd'
]);

const ALLOWED_MARKDOWN_HTML_ATTRIBUTES = new Set([
  'class',
  'title',
  'style'
]);

const ALLOWED_MARKDOWN_STYLE_PROPERTIES = new Set([
  'color',
  'background-color',
  'font-weight',
  'font-style',
  'text-decoration',
  'text-align',
  'letter-spacing',
  'text-transform',
  'opacity'
]);

function sanitizeInlineStyle(styleText) {
  return styleText
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const separatorIndex = part.indexOf(':');
      if (separatorIndex === -1) return '';

      const property = part.slice(0, separatorIndex).trim().toLowerCase();
      const value = part.slice(separatorIndex + 1).trim();
      if (!property || !value) return '';
      if (!ALLOWED_MARKDOWN_STYLE_PROPERTIES.has(property)) return '';
      if (/[<>"'`]/.test(value)) return '';
      if (/url\s*\(/i.test(value)) return '';
      if (/expression\s*\(/i.test(value)) return '';
      return `${property}: ${value}`;
    })
    .filter(Boolean)
    .join('; ');
}

function sanitizeAllowedHtml(rawHtml) {
  const tagMatch = rawHtml.match(/^<\s*(\/?)\s*([a-zA-Z0-9-]+)([^>]*)>$/);
  if (!tagMatch) return null;

  const isClosingTag = Boolean(tagMatch[1]);
  const tagName = tagMatch[2].toLowerCase();
  const attributeSource = tagMatch[3] || '';
  if (!ALLOWED_MARKDOWN_HTML_TAGS.has(tagName)) return null;

  if (isClosingTag) {
    return `</${tagName}>`;
  }

  const sanitizedAttributes = [];
  const attributePattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let match;

  while ((match = attributePattern.exec(attributeSource)) !== null) {
    const attributeName = match[1].toLowerCase();
    const attributeValue = match[3] ?? match[4] ?? '';
    if (!ALLOWED_MARKDOWN_HTML_ATTRIBUTES.has(attributeName)) continue;
    if (/^on/i.test(attributeName)) continue;

    if (attributeName === 'style') {
      const sanitizedStyle = sanitizeInlineStyle(attributeValue);
      if (sanitizedStyle) {
        sanitizedAttributes.push(`style="${escapeHtml(sanitizedStyle)}"`);
      }
      continue;
    }

    if (/[<>]/.test(attributeValue)) continue;
    sanitizedAttributes.push(`${attributeName}="${escapeHtml(attributeValue)}"`);
  }

  const selfClosing = /\/\s*$/.test(attributeSource) || tagName === 'br';
  const attributesMarkup = sanitizedAttributes.length ? ` ${sanitizedAttributes.join(' ')}` : '';
  return selfClosing ? `<${tagName}${attributesMarkup}>` : `<${tagName}${attributesMarkup}>`;
}

function preserveAllowedHtml(text) {
  const placeholders = [];
  const value = text.replace(/<[^>]+>/g, tag => {
    const sanitizedTag = sanitizeAllowedHtml(tag);
    if (!sanitizedTag) return tag;

    const placeholder = `__RAW_HTML_${placeholders.length}__`;
    placeholders.push({
      placeholder,
      html: sanitizedTag
    });
    return placeholder;
  });

  return {
    value,
    placeholders
  };
}

function restoreAllowedHtml(text, placeholders) {
  let restored = text;
  for (const entry of placeholders) {
    restored = restored.replaceAll(entry.placeholder, entry.html);
  }
  return restored;
}

function preserveMarkdownEscapes(text) {
  const placeholders = [];
  const value = String(text || '').replace(/\\([\\`*_{}\[\]()#+\-.!>~=])/g, (_, escapedChar) => {
    const placeholder = `__MD_ESCAPE_${placeholders.length}__`;
    placeholders.push({
      placeholder,
      html: escapeHtml(escapedChar)
    });
    return placeholder;
  });

  return {
    value,
    placeholders
  };
}

function restoreMarkdownEscapes(text, placeholders) {
  let restored = text;
  for (const entry of placeholders) {
    restored = restored.replaceAll(entry.placeholder, entry.html);
  }
  return restored;
}

function stripHtmlTags(text) {
  let value = String(text || '');

  value = value
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/[*_`~]/g, ' ');

  const decoder = document.createElement('div');
  decoder.innerHTML = value;
  value = decoder.textContent || decoder.innerText || '';

  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function applyInlineMarkdown(text) {
  const preserved = preserveAllowedHtml(text);
  const escapedMarkdown = preserveMarkdownEscapes(preserved.value);
  let html = escapeHtml(escapedMarkdown.value);
  html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1">');
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = restoreMarkdownEscapes(html, escapedMarkdown.placeholders);
  return restoreAllowedHtml(html, preserved.placeholders);
}

function markdownToHtml(markdown) {
  const normalized = markdown.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return '';

  const lines = normalized.split('\n');
  const html = [];
  let paragraph = [];
  let listItems = [];
  let quoteLines = [];
  let codeLines = [];
  let inCodeBlock = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${applyInlineMarkdown(paragraph.join('<br>'))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    html.push(`<ul>${listItems.map(item => `<li>${applyInlineMarkdown(item)}</li>`).join('')}</ul>`);
    listItems = [];
  };

  const flushQuote = () => {
    if (!quoteLines.length) return;
    html.push(`<blockquote>${quoteLines.map(line => `<p>${applyInlineMarkdown(line)}</p>`).join('')}</blockquote>`);
    quoteLines = [];
  };

  const flushCode = () => {
    if (!codeLines.length) return;
    html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    codeLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim().startsWith('```')) {
      flushParagraph();
      flushList();
      flushQuote();
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      flushQuote();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      flushQuote();
      const level = heading[1].length;
      const headingText = heading[2].trim();
      const headingHtml = applyInlineMarkdown(headingText);
      if (level === 2) {
        const accent = getPreviewAccent(stripHtmlTags(headingText));
        html.push(`<h2 class="terminal-heading-accent" style="color:${accent}">${headingHtml}</h2>`);
      } else {
        html.push(`<h${level}>${headingHtml}</h${level}>`);
      }
      continue;
    }

    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      flushParagraph();
      flushList();
      flushQuote();
      html.push('<hr>');
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      flushList();
      quoteLines.push(quote[1]);
      continue;
    }

    const list = line.match(/^[-*]\s+(.*)$/);
    if (list) {
      flushParagraph();
      flushQuote();
      listItems.push(list[1]);
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  flushQuote();
  flushCode();

  return html.join('');
}

function markdownToParagraphs(markdown) {
  const normalized = markdown.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return [];

  const lines = normalized.split('\n');
  const html = [];
  let paragraph = [];

  const isStandaloneHtmlBlock = text => /^<(div|section|article|blockquote|hr)\b[^>]*>.*<\/\1>\s*$/i.test(text)
    || /^<hr\s*\/?>$/i.test(text)
    || /^<div\b[^>]*>$/i.test(text)
    || /^<\/div>\s*$/i.test(text);

  const isAsciiArtBlock = blockLines => {
    const nonEmptyLines = blockLines.map(line => line.replace(/\r/g, '')).filter(line => line.trim());
    if (nonEmptyLines.length < 3) return false;

    return nonEmptyLines.every(line => {
      if (/[\u4e00-\u9fff]/.test(line)) return false;
      if (!/\s{2,}/.test(line)) return false;
      return /^[\s\S]+$/.test(line);
    });
  };

  const renderInline = text => {
    const preserved = preserveAllowedHtml(text);
    const escapedMarkdown = preserveMarkdownEscapes(preserved.value);
    return restoreAllowedHtml(
      restoreMarkdownEscapes(
        escapeHtml(escapedMarkdown.value),
        escapedMarkdown.placeholders
      ),
      preserved.placeholders
    );
  };

  const flushParagraph = () => {
    if (!paragraph.length) return;

    if (isAsciiArtBlock(paragraph)) {
      html.push(`<pre class="terminal-plain">${escapeHtml(paragraph.join('\n'))}</pre>`);
      paragraph = [];
      return;
    }

    html.push(`<p>${renderInline(paragraph.join('\n')).replace(/\n/g, '<br>')}</p>`);
    paragraph = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (isStandaloneHtmlBlock(trimmed)) {
      flushParagraph();
      html.push(renderInline(line));
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();

      const level = Math.min(heading[1].length, 6);
      const headingText = heading[2].trim();
      const safeHeadingText = stripHtmlTags(headingText);
      const headingHtml = renderInline(headingText);

      if (level === 2) {
        const accent = getPreviewAccent(safeHeadingText);
        html.push(`<h2 class="terminal-heading-accent" style="color:${accent}">${headingHtml}</h2>`);
      } else {
        html.push(`<h${level}>${headingHtml}</h${level}>`);
      }
      continue;
    }

    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      flushParagraph();
      html.push('<hr>');
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return html;
}

function isPlainTextBodyFile(bodyFile) {
  return /\.txt(?:$|[?#])/i.test(String(bodyFile || ''));
}

function plainTextToHtml(text, extraClass = '') {
  const className = ['plain-text-doc', extraClass].filter(Boolean).join(' ');
  return `<div class="${className}">${escapeHtml(String(text || ''))}</div>`;
}

function extractPlainTextPreview(text) {
  const lines = String(text || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  return {
    header: lines[0] || '',
    title: lines[1] || lines[0] || '',
    footer: lines[2] || ''
  };
}

async function loadDocLines(bodyFile) {
  if (!bodyFile) return [];
  if (docCache.has(bodyFile)) return docCache.get(bodyFile);

  const request = loadMarkdownSource(bodyFile)
    .then(text => (
      isPlainTextBodyFile(bodyFile)
        ? [plainTextToHtml(text, 'plain-text-doc-terminal')]
        : markdownToParagraphs(text)
    ));

  docCache.set(bodyFile, request);
  return request;
}

async function loadMarkdownSource(bodyFile) {
  if (!bodyFile) return '';
  if (markdownSourceCache.has(bodyFile)) return markdownSourceCache.get(bodyFile);

  const request = fetch(bodyFile)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load ${bodyFile}: ${response.status}`);
      }
      return response.text();
    });

  markdownSourceCache.set(bodyFile, request);
  return request;
}

async function loadMarkdownDoc(bodyFile) {
  if (!bodyFile) return '';
  const text = await loadMarkdownSource(bodyFile);
  return isPlainTextBodyFile(bodyFile)
    ? plainTextToHtml(text)
    : markdownToHtml(text);
}

function extractMarkdownPreview(markdown) {
  const preview = {
    header: '',
    title: '',
    footer: ''
  };

  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    let matched = line.match(/^###\s+(.+?)\s*#*$/);
    if (matched && !preview.footer) {
      preview.footer = stripHtmlTags(matched[1]);
      continue;
    }

    matched = line.match(/^##\s+(.+?)\s*#*$/);
    if (matched && !preview.header) {
      preview.header = stripHtmlTags(matched[1]);
      continue;
    }

    matched = line.match(/^#\s+(.+?)\s*#*$/);
    if (matched && !preview.title) {
      preview.title = stripHtmlTags(matched[1]);
    }

    if (preview.header && preview.title && preview.footer) break;
  }

  return preview;
}

async function loadMarkdownPreview(bodyFile) {
  if (!bodyFile) {
    return { header: '', title: '', footer: '' };
  }

  if (previewCache.has(bodyFile)) return previewCache.get(bodyFile);

  const request = loadMarkdownSource(bodyFile).then(text => (
    isPlainTextBodyFile(bodyFile)
      ? extractPlainTextPreview(text)
      : extractMarkdownPreview(text)
  ));
  previewCache.set(bodyFile, request);
  return request;
}

function ensurePreviewTooltip() {
  if (previewTooltip) return previewTooltip;

  previewTooltip = document.createElement('div');
  previewTooltip.className = 'icon-preview-tooltip';
  previewTooltip.hidden = true;
  document.body.appendChild(previewTooltip);
  return previewTooltip;
}

function previewMarkup(preview) {
  const accent = getPreviewAccent(preview?.header || '');
  const header = preview?.header ? `<div class="icon-preview-header">${escapeHtml(preview.header)}</div>` : '';
  const title = preview?.title ? `<div class="icon-preview-title">${escapeHtml(preview.title)}</div>` : '';
  const footer = preview?.footer ? `<div class="icon-preview-footer">${escapeHtml(preview.footer)}</div>` : '';
  return `
    <div class="icon-preview-tooltip-shell" style="--preview-accent:${accent}">
      ${header}
      <div class="icon-preview-body">${title}${footer}</div>
    </div>
  `;
}

function getPreviewAccent(headerText) {
  const prefix = String(headerText || '').trim().slice(0, 2);
  const accentMap = {
    '优先': 'rgb(172, 226, 4)',
    '标准': 'rgb(182, 185, 191)',
    '强化': 'rgb(1, 219, 123)',
    '豪华': 'rgb(67, 160, 232)',
    '卓越': 'rgb(176, 43, 231)',
    '尊享': 'rgb(230, 211, 8)',
    '秘藏': 'rgb(229, 44, 43)'
  };

  return accentMap[prefix] || 'rgb(67, 160, 232)';
}

function positionPreviewTooltip(anchor) {
  if (!previewTooltip || !anchor) return;

  const rect = anchor.getBoundingClientRect();
  const tooltipRect = previewTooltip.getBoundingClientRect();
  const gap = 16;
  const maxLeft = window.innerWidth - tooltipRect.width - 12;
  const preferredLeft = rect.right + gap;
  const fallbackLeft = rect.left - tooltipRect.width - gap;
  const left = preferredLeft <= maxLeft ? preferredLeft : Math.max(12, fallbackLeft);
  const centeredTop = rect.top + (rect.height - tooltipRect.height) / 2;
  const top = Math.max(12, Math.min(centeredTop, window.innerHeight - tooltipRect.height - 12));

  previewTooltip.style.left = `${left}px`;
  previewTooltip.style.top = `${top}px`;
}

function buildDetailTicker(text, extraClass = '') {
  const label = '赛博艾克米802.11（神经.筛选器）';
  const unit = Array.from({ length: 6 }, () => `
    <span class="detail-ticker-unit">${label}</span>
    <span class="detail-ticker-sep" aria-hidden="true">+</span>
  `).join('');
  return `
    <div class="detail-ticker ${extraClass}" data-ticker-label="${escapeHtml(label)}">
      <div class="detail-ticker-track">
        <div class="detail-ticker-group">${unit}</div>
        <div class="detail-ticker-group" aria-hidden="true">${unit}</div>
      </div>
    </div>
  `;
}

function refreshDetailTickers(root = document) {
  root.querySelectorAll('.detail-ticker').forEach(ticker => {
    const track = ticker.querySelector('.detail-ticker-track');
    if (!track) return;

    const label = ticker.dataset.tickerLabel || '赛博艾克米802.11（神经.筛选器）';
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || ticker.clientWidth || 0;
    const availableWidth = viewportWidth <= 720
      ? viewportWidth
      : (ticker.parentElement?.clientWidth || ticker.clientWidth || ticker.getBoundingClientRect().width || viewportWidth);
    if (!availableWidth) return;

    const probe = document.createElement('div');
    probe.className = 'detail-ticker-probe';
    probe.innerHTML = `
      <span class="detail-ticker-unit">${escapeHtml(label)}</span>
      <span class="detail-ticker-sep">+</span>
    `;
    ticker.appendChild(probe);
    const unitWidth = probe.getBoundingClientRect().width || 1;
    probe.remove();

    const unitCount = Math.max(1, Math.ceil((availableWidth + unitWidth) / unitWidth));
    ticker.dataset.unitCount = String(unitCount);
    const unit = Array.from({ length: unitCount }, () => `
      <span class="detail-ticker-unit">${escapeHtml(label)}</span>
      <span class="detail-ticker-sep" aria-hidden="true">+</span>
    `).join('');

    track.innerHTML = `
      <div class="detail-ticker-group">${unit}</div>
      <div class="detail-ticker-group" aria-hidden="true">${unit}</div>
    `;

    const travelDistance = Math.max(availableWidth, track.scrollWidth / 2);
    const pixelsPerSecond = viewportWidth <= 480 ? 12 : viewportWidth <= 720 ? 16 : 22;
    const duration = Math.max(18, travelDistance / pixelsPerSecond);
    track.style.animationDuration = `${duration.toFixed(2)}s`;
  });
}

let detailTickerResizeRaf = null;

function scheduleDetailTickerRefresh() {
  if (detailTickerResizeRaf !== null) return;
  detailTickerResizeRaf = requestAnimationFrame(() => {
    detailTickerResizeRaf = null;
    refreshDetailTickers(appView);
  });
}

function applyManifestLayout(root = document) {
  root.querySelectorAll('.manifest-line').forEach(node => {
    const indentClass = Array.from(node.classList).find(name => /^x-\d+$/.test(name));
    if (!indentClass) return;

    const indentValue = Number(indentClass.slice(2));
    if (!Number.isFinite(indentValue) || indentValue < 0) return;

    node.style.marginLeft = `${indentValue * 0.6}ch`;
  });
}

function hidePreviewTooltip() {
  activePreviewAnchor = null;
  activePreviewToken += 1;

  if (!previewTooltip) return;
  previewTooltip.hidden = true;
  previewTooltip.classList.remove('is-loading');
  previewTooltip.innerHTML = '';
}

async function showPreviewTooltip(anchor, bodyFile) {
  if (!bodyFile) return;

  const tooltip = ensurePreviewTooltip();
  const token = ++activePreviewToken;
  activePreviewAnchor = anchor;

  tooltip.style.setProperty('--preview-accent', 'rgb(67, 160, 232)');
  tooltip.hidden = false;
  tooltip.classList.add('is-loading');
  tooltip.innerHTML = `
    <div class="icon-preview-header">加载中…</div>
    <div class="icon-preview-body">
      <div class="icon-preview-title">加载中…</div>
    </div>
  `;
  positionPreviewTooltip(anchor);

  try {
    const preview = await loadMarkdownPreview(bodyFile);
    if (activePreviewAnchor !== anchor || activePreviewToken !== token) return;

    tooltip.style.setProperty('--preview-accent', getPreviewAccent(preview?.header || ''));
    tooltip.classList.remove('is-loading');
    tooltip.innerHTML = previewMarkup(preview);
    positionPreviewTooltip(anchor);
  } catch {
    if (activePreviewAnchor !== anchor || activePreviewToken !== token) return;

    tooltip.style.setProperty('--preview-accent', 'rgb(67, 160, 232)');
    tooltip.classList.remove('is-loading');
    tooltip.innerHTML = `
      <div class="icon-preview-header">文档</div>
      <div class="icon-preview-body">
        <div class="icon-preview-title">预览读取失败</div>
      </div>
    `;
    positionPreviewTooltip(anchor);
  }
}

function buildCategoryTabs(activeCategoryId) {
  return `
    <div class="section-tabs">
      ${categoryData.map(item => `
        <button
          class="tab-btn ${item.id === activeCategoryId ? 'is-active' : ''}"
          type="button"
          data-kind="category"
          data-category-id="${item.id}"
        >${item.title}</button>
      `).join('')}
    </div>
  `;
}

function buildSectionTabs(category, activeSectionId) {
  return `
    <div class="section-tabs">
      ${category.sections.map(item => `
        <button
          class="tab-btn ${item.id === activeSectionId ? 'is-active' : ''}"
          type="button"
          data-kind="section"
          data-category-id="${category.id}"
          data-section-id="${item.id}"
        >${item.title}</button>
      `).join('')}
    </div>
  `;
}

function buildDeepViewTabs(category, activeSectionId) {
  return `
    <div class="deep-view-tabs">
      <div class="deep-view-tabs-primary">
        ${buildSectionTabs(category, activeSectionId)}
      </div>
      <div class="deep-view-tabs-secondary">
        ${buildCategoryTabs(category.id)}
      </div>
    </div>
  `;
}

function buildBreadcrumbs(items = []) {
  if (!items.length) return '';
  return `
    <div class="entry-breadcrumbs">
      ${items.map(item => `<span>${item}</span>`).join('<span>/</span>')}
    </div>
  `;
}

function escapeAttr(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function getEntriesPanelState(category, section) {
  const sectionItems = getSectionItems(section);
  const parentNodes = sectionItems.filter(isFolderNode);
  const useSectionRail = (category?.sections?.length || 0) > 1 && parentNodes.length === 0;

  if (useSectionRail) {
    const railItems = category.sections;
    const activeSection = getSection(category, state.sectionId) || section || railItems[0] || null;
    const activeSectionItems = getSectionItems(activeSection);

    return {
      railMode: 'sections',
      railItems,
      selectedSectionId: activeSection?.id || null,
      selectedRootId: null,
      activeSection,
      currentFolder: null,
      folderContext: getFolderContext(activeSection, []),
      contentItems: mergeDisplayItems(activeSectionItems),
      headerTitle: activeSection?.title || section.title,
      headerText: activeSection?.note || activeSection?.summary || section.note || section.summary || '',
      breadcrumbItems: [activeSection?.title || section.title]
    };
  }

  if (!parentNodes.length) {
    return {
      railMode: 'folders',
      railItems: [],
      selectedSectionId: section.id,
      selectedRootId: null,
      activeSection: section,
      currentFolder: null,
      folderContext: getFolderContext(section, []),
      contentItems: mergeDisplayItems(sectionItems),
      headerTitle: section.title,
      headerText: section.note || section.summary || '',
      breadcrumbItems: [section.title]
    };
  }

  const activeRootId = parentNodes.some(item => item.id === state.nodePath[0])
    ? state.nodePath[0]
    : parentNodes[0]?.id;
  const selectedRoot = parentNodes.find(item => item.id === activeRootId) || parentNodes[0] || null;
  const path = selectedRoot ? [selectedRoot.id, ...state.nodePath.slice(1)] : [];
  const folderContext = selectedRoot ? getFolderContext(section, path) : getFolderContext(section, []);
  const currentFolder = folderContext.current || selectedRoot;

  return {
    railMode: 'folders',
    railItems: parentNodes,
    selectedSectionId: section.id,
    selectedRootId: selectedRoot?.id || null,
    activeSection: section,
    currentFolder,
    folderContext,
    contentItems: mergeDisplayItems(folderContext.items),
    headerTitle: currentFolder?.title || section.title,
    headerText: currentFolder?.summary || currentFolder?.note || section.note || section.summary || '',
    breadcrumbItems: [section.title, ...folderContext.chain.map(item => item.title)]
  };
}

function rootView() {
  appView.innerHTML = `
    <div class="view">
      <div class="section-header">
        <div class="section-header-copy">
          <h2>百科</h2>
        </div>
      </div>
      <div class="top-grid scrollbar">
        ${categoryData.map(category => `
          <button
            class="card top-card"
            type="button"
            data-kind="category"
            data-category-id="${category.id}"
          >
            <div class="card-head">
              <span class="card-icon">${iconVisual(category)}</span>
              <div>
                <h2>${category.title}</h2>
                <p>${category.summary}</p>
              </div>
            </div>
            <span class="card-count">${category.count}</span>
          </button>
        `).join('')}
        <button
          class="card top-card"
          type="button"
          data-kind="tags"
        >
          <div class="card-head">
            <span class="card-icon"><img src="/marathon-lore/assets/images/icons/tag.svg" alt="标签"></span>
            <div>
              <h2>标签</h2>
              <p>按日志末尾标签自动聚合的索引视图。</p>
            </div>
          </div>
          <span class="card-count">${tagIndex.length} 条</span>
        </button>
      </div>
    </div>
  `;
}

function tagsView() {
  const visibleTags = filterTagIndex(tagSearchQuery);
  const current = visibleTags.find(item => getTagKey(item.tag) === getTagKey(state.tag)) || visibleTags[0] || null;
  const activeTag = current?.tag || state.tag || '';
  const items = current?.items || [];
  const headerTitle = activeTag || '全部标签';
  const headerSummary = items.length ? `${items.length} 个命中条目` : '暂无命中结果。';

  syncFrameViewMeta(`
    <div class="frame-view-meta-copy">
      <div class="frame-view-meta-row">
        ${buildBreadcrumbs(['百科', '标签', headerTitle])}
        <span class="frame-view-meta-summary">${headerSummary}</span>
      </div>
    </div>
  `);

  syncFrameViewSearch(`
    <form class="frame-view-search" data-tag-search-form>
      <input
        class="tag-search-input frame-view-search-input"
        type="search"
        placeholder="搜索标签、日志或条目"
        value="${escapeAttr(tagSearchQuery)}"
        autocomplete="off"
        spellcheck="false"
      >
      <button class="tag-search-button frame-view-search-button" type="submit" aria-label="搜索">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="11" cy="11" r="6.5"></circle>
          <path d="M16 16l5 5"></path>
        </svg>
      </button>
    </form>
  `);

  appView.innerHTML = `
    <div class="view view-tags">
      <div class="tag-layout">
        <aside class="tag-rail scrollbar">
          ${visibleTags.map(item => `
            <button
              class="tag-item ${getTagKey(item.tag) === getTagKey(activeTag) ? 'is-active' : ''}"
              type="button"
              data-kind="tag"
              data-tag="${escapeAttr(item.tag)}"
            >
              <span>${item.tag}</span>
              <span>${item.items.length}</span>
            </button>
          `).join('')}
        </aside>
        <section class="tag-stage">
          <div class="tag-grid scrollbar">
            ${items.map(item => `
              <button
                class="tag-result"
                type="button"
                data-kind="log"
                data-category-id="${item.categoryId}"
                data-section-id="${item.sectionId}"
                data-path="${item.nodePath.join('/')}"
                data-log-id="${item.logId || ''}"
                data-entry-variant="${item.entryVariant}"
              >
                <div class="card-head">
                  <span class="card-icon">${tagResultVisual(item)}</span>
                  <div>
                    <h3>${item.logTitle}</h3>
                    <p>${item.categoryTitle} / ${item.sectionTitle} / ${item.entryTitle}</p>
                  </div>
                </div>
                <span class="card-count">${item.tag}</span>
              </button>
            `).join('')}
          </div>
        </section>
      </div>
    </div>
  `;
}

function sectionsView() {
  const category = getCategory(state.categoryId) || categoryData[0];

  appView.innerHTML = `
    <div class="view">
      ${buildCategoryTabs(category.id)}
      <div class="section-header">
        <div class="section-header-copy">
          <h2>${category.title}</h2>
          <p>${category.summary}</p>
        </div>
      </div>
      <div class="section-grid scrollbar">
        ${category.sections.map(section => `
          <button
            class="card section-card"
            type="button"
            data-kind="section"
            data-category-id="${category.id}"
            data-section-id="${section.id}"
	          >
	            <div class="card-head">
	              <span class="card-icon">${iconVisual(section)}</span>
	              <div>
	                <h3>${section.title}</h3>
	              </div>
	            </div>
	            <span class="card-count">${section.count}</span>
	          </button>
	        `).join('')}
      </div>
    </div>
  `;
}

function entriesView() {
  const category = getCategory(state.categoryId) || categoryData[0];
  const section = getSection(category, state.sectionId) || category.sections[0];
  const panel = getEntriesPanelState(category, section);
  const railHero = panel.railMode === 'sections' ? category : panel.activeSection;

  appView.innerHTML = `
    <div class="view">
      ${buildDeepViewTabs(category, section.id)}
      <div class="entry-layout">
        <aside class="entry-rail">
          <div class="entry-hero">
            <div class="hero-badge">${iconVisual(railHero)}</div>
            <div class="entry-hero-copy">
              <h2>${railHero.title}</h2>
              <p>${railHero.note || railHero.summary || category.summary || ''}</p>
            </div>
          </div>
          <div class="entry-rail-list">
            ${panel.railItems.map(item => `
              <button
                class="${panel.railMode === 'sections'
                  ? (item.id === panel.selectedSectionId ? 'is-active' : '')
                  : (item.id === panel.selectedRootId ? 'is-active' : '')}"
                type="button"
                data-kind="${panel.railMode === 'sections' ? 'section' : (isFolderNode(item) ? 'folder' : 'entry')}"
                data-category-id="${category.id}"
                data-section-id="${panel.railMode === 'sections' ? item.id : panel.activeSection.id}"
                data-path="${panel.railMode === 'sections' ? '' : item.id}"
              >
                <span>${item.title}</span>
                <span>${item.count || ''}</span>
              </button>
            `).join('')}
          </div>
        </aside>
        <section class="entry-stage" data-debug-name="entry-stage">
          <div class="entry-header">
            <div class="entry-header-copy">
              ${buildBreadcrumbs([category.title, ...panel.breadcrumbItems])}
              <h2>${panel.headerTitle}</h2>
              <p>${panel.headerText}</p>
            </div>
          </div>
		          <div class="entry-stage-body scrollbar" data-debug-name="entry-stage-body">
			            <div class="entry-grid scrollbar" data-debug-name="entry-grid">
		              ${panel.contentItems.map(item => {
		                const nextPath = [...panel.folderContext.path, item.id];
		                const folder = isFolderNode(item);
		                const count = item.count || (folder ? `${getNodeChildren(item).length} 项` : '');
                    const isMixedEntry = !folder && item.hasVariantA && item.hasVariantB;
                    const defaultKind = folder ? 'folder' : 'entry';
                    const defaultVariant = folder ? '' : (item.hasVariantA ? 'a' : 'b');
                    const previewBodyFile = !folder ? getPreviewBodyFile(item) : null;
                    const logCount = !folder && item.hasVariantA ? getLogs(item).length : 0;
		                return `
		                  <div
		                    class="entry-card"
                        role="button"
                        tabindex="0"
	                    data-kind="${defaultKind}"
	                    data-category-id="${category.id}"
	                    data-section-id="${panel.activeSection.id}"
		                    data-path="${pathToString(nextPath)}"
                        data-entry-variant="${defaultVariant}"
		                  >
                        ${logCount > 0 ? `
                          <span class="entry-log-badge" aria-label="日志数量 ${logCount}/${logCount}">
                            <span class="entry-log-badge-icon">
                              <span class="lore-mask-icon green" aria-hidden="true"></span>
                            </span>
                            <span class="entry-log-badge-count">${logCount}/${logCount}</span>
                          </span>
                        ` : ''}
		                    <div class="card-head">
		                      <span
                            class="card-icon ${isMixedEntry ? 'card-icon-action' : ''} ${previewBodyFile ? 'card-icon-preview' : ''}"
                            ${isMixedEntry ? `
                              role="button"
                              tabindex="0"
                              data-kind="entry"
                              data-category-id="${category.id}"
                              data-section-id="${panel.activeSection.id}"
                              data-path="${pathToString(nextPath)}"
                              data-entry-variant="b"
                            ` : ''}
                            ${previewBodyFile ? `data-preview-body-file="${previewBodyFile}"` : ''}
                          >${(() => {
                            const iconImage = getDisplayIconImage(item);
                            const iconItem = iconImage ? { ...item, iconImage } : item;
                            return iconVisual(iconItem);
                          })()}</span>
		                      <div>
		                        <h3>${item.title}</h3>
		                        <p>${item.summary || item.note || ''}</p>
		                      </div>
		                    </div>
	                    <span class="entry-count">${count}</span>
	                  </div>
	                `;
	              }).join('')}
            </div>
          </div>
        </section>
      </div>
    </div>
  `;
}

async function detailView() {
  detachAudioControls();
  const category = getCategory(state.categoryId) || categoryData[0];
  const section = getSection(category, state.sectionId) || category.sections[0];
  const entry = getEntryRecord(section, state.nodePath);

  if (!entry) {
    state.view = 'entries';
    state.nodePath = getFolderContext(section, state.nodePath).path;
    state.logId = null;
    await render();
    return;
  }

  const activeVariant = resolveEntryVariant(entry, state.entryVariant);
  state.entryVariant = activeVariant;
  const logs = getLogs(entry);
  const activeLog = activeVariant === 'a'
    ? (getLog(entry, state.logId) || logs[0] || null)
    : null;
  const folderChain = getFolderContext(section, state.nodePath.slice(0, -1)).chain;

  state.logId = activeVariant === 'a' && activeLog ? activeLog.id : null;

  const bodyFile = activeVariant === 'b'
    ? (entry.variantB?.bodyFile || entry.bodyFile)
    : (activeLog?.bodyFile || null);
  const isVariantB = activeVariant === 'b';
  const audioSource = isVariantB
    ? (entry.variantB?.audio || entry.audio)
    : (activeLog?.audio || entry.variantA?.audio || entry.audio);
  const audioBlock = audioMarkup(audioSource, isVariantB ? entry.title : (activeLog?.title || entry.title));
  const bodyContent = isVariantB
    ? await loadMarkdownDoc(bodyFile)
    : (await loadDocLines(bodyFile)).join('');
  const summaryText = isVariantB
    ? (entry.variantB?.summary || entry.summary || '')
    : (activeLog?.summary || entry.variantA?.summary || entry.summary || '');
  const content = isVariantB
    ? `
        ${metaList(entry.variantB?.meta || entry.meta || [])}
        ${summaryText ? `<blockquote>${summaryText}</blockquote>` : ''}
        <div class="markdown-body">${bodyContent}</div>
      `
    : `
        ${metaList(activeLog?.meta || [])}
        <h2>${activeLog?.title || entry.title}</h2>
        ${summaryText ? `<blockquote>${summaryText}</blockquote>` : ''}
        ${bodyContent}
      `;

  const visualSource = {
    ...(isVariantB ? (entry.variantB || entry) : (activeLog || entry.variantA || entry)),
    ...entry,
    image: isVariantB
      ? (entry.variantB?.image || entry.image)
      : (activeLog?.image || entry.variantA?.image || entry.image),
    title: isVariantB ? entry.title : (activeLog?.title || entry.title),
    accent: isVariantB ? 'blue' : 'green',
    icon: isVariantB
      ? (entry.variantB?.icon || entry.icon)
      : (activeLog?.icon || entry.variantA?.icon || entry.icon),
    iconImage: isVariantB
      ? (entry.variantB?.iconImage || entry.iconImage)
      : (activeLog?.iconImage || entry.variantA?.iconImage || entry.iconImage)
  };

  const copyClass = !isVariantB
    ? 'detail-copy scrollbar terminal'
    : 'detail-copy scrollbar';
  const pair = isVariantB
    ? `<div class="${copyClass}">${content}</div>${visual(visualSource, audioBlock)}`
    : `${visual(visualSource, audioBlock)}<div class="${copyClass}">${content}</div>`;
  const hasLogRail = activeVariant === 'a' && logs.length > 1;
  const layoutClass = hasLogRail ? 'detail-layout detail-layout-a' : 'detail-layout detail-layout-b';
  const railMarkup = hasLogRail
    ? `
        <aside class="detail-rail detail-rail-a">
          <div class="entry-hero">
            <div class="hero-badge">${iconVisual(entry)}</div>
            <div class="entry-hero-copy">
              <h3>${entry.title}</h3>
              <p>${entry.summary || ''}</p>
            </div>
          </div>
          <div class="detail-rail-list">
            ${logs.map(item => `
              <button
                class="${item.id === activeLog?.id ? 'is-active' : ''}"
                type="button"
                data-kind="log"
                data-category-id="${category.id}"
                data-section-id="${section.id}"
                data-path="${pathToString(state.nodePath)}"
                data-log-id="${item.id}"
              >
                <span>${item.title}</span>
                <span>${item.count || item.status || ''}</span>
              </button>
            `).join('')}
          </div>
        </aside>
      `
    : '';
  const headCopy = hasLogRail
    ? `<p>${entry.title} / ${activeLog?.status || ''}</p>`
    : ((isVariantB ? (entry.variantB?.status || entry.status) : (activeLog?.status || entry.variantA?.status || entry.status))
      ? `<p>${isVariantB ? (entry.variantB?.status || entry.status) : (activeLog?.status || entry.variantA?.status || entry.status)}</p>`
      : '');
  const topTicker = buildDetailTicker('', 'detail-ticker-top');
  const bottomTicker = buildDetailTicker('', 'detail-ticker-bottom');

  appView.innerHTML = `
    <div class="view">
      ${buildDeepViewTabs(category, section.id)}
      <div class="${layoutClass}">
        ${railMarkup}
	        <section class="detail-stage" data-debug-name="detail-stage">
	          <div class="detail-stage-head">
	            <div class="entry-header-copy">
	              ${buildBreadcrumbs([category.title, section.title, ...folderChain.map(item => item.title), entry.title])}
	              <h2>${activeLog?.title || entry.title}</h2>
	              ${headCopy}
	            </div>
		          </div>
            ${topTicker}
	          <div class="detail-stage-body ${isVariantB ? 'variant-b' : 'variant-a'}">
	            ${pair}
	          </div>
            ${bottomTicker}
        </section>
      </div>
    </div>
  `;

  setupAudioControls(appView);
}

function bind() {
  appView.querySelectorAll('[data-kind]').forEach(node => {
	    node.addEventListener('click', async event => {
        event.stopPropagation();
	      const type = node.dataset.kind;
	      const categoryId = node.dataset.categoryId || null;
	      const sectionId = node.dataset.sectionId || null;
	      const path = (node.dataset.path || '').split('/').filter(Boolean);
	      const logId = node.dataset.logId || null;
        const entryVariant = node.dataset.entryVariant || null;

      if (type === 'category') {
        state.view = 'sections';
        state.categoryId = categoryId;
        state.sectionId = null;
        state.nodePath = [];
        state.logId = null;
        state.entryVariant = null;
        state.tag = null;
      } else if (type === 'tags') {
        state.view = 'tags';
        state.categoryId = null;
        state.sectionId = null;
        state.nodePath = [];
        state.logId = null;
        state.entryVariant = null;
        if (!state.tag && tagIndex[0]) {
          state.tag = tagIndex[0].tag;
        }
      } else if (type === 'tag') {
        rememberTagRailScroll();
        state.view = 'tags';
        state.tag = node.dataset.tag || null;
        state.categoryId = null;
        state.sectionId = null;
        state.nodePath = [];
        state.logId = null;
        state.entryVariant = null;
      } else if (type === 'section') {
        state.view = 'entries';
        state.categoryId = categoryId;
        state.sectionId = sectionId;
        state.nodePath = [];
        state.logId = null;
        state.entryVariant = null;
        state.tag = null;
      } else if (type === 'folder') {
        state.view = 'entries';
        state.categoryId = categoryId;
        state.sectionId = sectionId;
        state.nodePath = path;
        state.logId = null;
        state.entryVariant = null;
        state.tag = null;
      } else if (type === 'entry') {
        const entry = getEntryRecord(getSection(getCategory(categoryId), sectionId), path);
        const activeVariant = resolveEntryVariant(entry, entryVariant);
        state.view = 'detail';
        state.categoryId = categoryId;
        state.sectionId = sectionId;
        state.nodePath = path;
        state.entryVariant = activeVariant;
        state.logId = activeVariant === 'a' ? (getLogs(entry)[0]?.id || null) : null;
        state.tag = null;
      } else if (type === 'log') {
        state.view = 'detail';
        state.categoryId = categoryId;
        state.sectionId = sectionId;
        state.nodePath = path;
        state.logId = logId;
        state.entryVariant = entryVariant || 'a';
        state.tag = null;
      }

      await render();
    });
  });

  appView.querySelectorAll('[role="button"][data-kind]').forEach(node => {
    node.addEventListener('keydown', async event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      node.click();
    });
  });

  appView.querySelectorAll('[data-preview-body-file]').forEach(node => {
    node.addEventListener('mouseenter', () => {
      void showPreviewTooltip(node, node.dataset.previewBodyFile || '');
    });

    node.addEventListener('mouseleave', () => {
      if (activePreviewAnchor === node) {
        hidePreviewTooltip();
      }
    });

    node.addEventListener('focus', () => {
      void showPreviewTooltip(node, node.dataset.previewBodyFile || '');
    });

    node.addEventListener('blur', () => {
      if (activePreviewAnchor === node) {
        hidePreviewTooltip();
      }
    });
  });

  const tagSearchForm = appView.querySelector('[data-tag-search-form]');
  if (tagSearchForm) {
    tagSearchForm.addEventListener('submit', async event => {
      event.preventDefault();
      rememberTagRailScroll();
      const input = tagSearchForm.querySelector('.tag-search-input');
      tagSearchQuery = input ? input.value : '';
      state.view = 'tags';
      await render();
    });
  }
}

async function render() {
  hidePreviewTooltip();
  syncFrameViewMeta('');
  syncFrameViewSearch('');

  if (state.categoryId) {
    await ensureCategoryLoaded(state.categoryId);
  }

  if (state.view === 'sections') {
    sectionsView();
  } else if (state.view === 'tags') {
    tagsView();
  } else if (state.view === 'entries') {
    entriesView();
  } else if (state.view === 'detail') {
    await detailView();
  } else {
    rootView();
  }

  syncLayoutState();
  bind();
  if (state.view === 'tags') {
    restoreTagRailScroll();
  }
  applyManifestLayout(appView);
  refreshDetailTickers(appView);
  setTimeout(() => refreshDetailTickers(appView), 120);
  setTimeout(() => refreshDetailTickers(appView), 500);
  setHash();
}

function back() {
  if (state.view === 'detail') {
    state.view = 'entries';
    state.nodePath = state.nodePath.slice(0, -1);
    state.logId = null;
    state.entryVariant = null;
  } else if (state.view === 'tags') {
    state.view = 'root';
    state.tag = null;
  } else if (state.view === 'entries' && state.nodePath.length > 1) {
    state.nodePath = state.nodePath.slice(0, -1);
    state.logId = null;
  } else if (state.view === 'entries') {
    state.view = 'sections';
    state.sectionId = null;
    state.nodePath = [];
    state.logId = null;
  } else if (state.view === 'sections') {
    state.view = 'root';
    state.categoryId = null;
    state.sectionId = null;
    state.nodePath = [];
    state.logId = null;
  } else {
    location.href = '/';
    return;
  }

  void render();
}

const backButton = document.querySelector('[data-action="back"]');

if (backButton) {
  backButton.addEventListener('click', back);
}

window.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    hidePreviewTooltip();
    back();
  }
});

window.addEventListener('hashchange', async () => {
  hidePreviewTooltip();

  await syncStateFromHash();
  void render();
});

window.addEventListener('resize', () => {
  scheduleDetailTickerRefresh();
});

window.addEventListener('orientationchange', () => {
  scheduleDetailTickerRefresh();
});

async function bootstrap() {
  const response = await fetch('/marathon-lore/content/index.json');
  if (!response.ok) {
    throw new Error('Failed to load lore index.json');
  }

  categoryData = await response.json();
  categoryModuleCache.clear();
  await ensureAllCategoriesLoaded();
  rebuildTagIndex();
  await syncStateFromHash();
  await render();
}

bootstrap().catch(error => {
  console.error(error);
  appView.innerHTML = '<div class="view"><div class="section-header"><div class="section-header-copy"><h2>鍔犺浇澶辫触</h2><p>褰撳墠 lore 鏁版嵁鏈兘姝ｇ‘璇诲彇銆?/p></div></div></div>';
});
