function getEntryDisplayIconImage(entry) {
  if (!entry) return null;
  if (entry.iconImage) return entry.iconImage;

  const logs = getLogs(entry);
  if (logs.length > 0 && logs[0]?.image) {
    return logs[0].image;
  }

  return '/marathon-lore/assets/images/default_icon.webp';
}

function normalizeTagList(meta = []) {
  return Array.isArray(meta)
    ? meta.map(item => String(item || '').trim()).filter(Boolean)
    : [];
}

function getTagKey(tag) {
  return String(tag || '').trim().toLowerCase();
}

function buildTagIndex(categoryData) {
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

  return [...map.values()]
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

function getPreviewBodyFile(item) {
  if (!item) return null;
  return item.variantB?.bodyFile || item.bodyFile || null;
}

function loreEntryUrl(categoryId, sectionId, nodePath) {
  return '/marathon-lore/entry/' + [categoryId, sectionId, ...nodePath].map(encodeURIComponent).join('/') + '/';
}

function collectLoreEntries(category) {
  const result = [];
  for (const section of category.sections || []) {
    function visit(nodes, parents = []) {
      for (const entry of nodes) {
        const nodePath = [...parents, entry.id];
        if (isDetailNode(entry)) result.push({ category, section, entry, nodePath, url: loreEntryUrl(category.id, section.id, nodePath) });
        else visit(getNodeChildren(entry), nodePath);
      }
    }
    visit(getSectionItems(section));
  }
  return result;
}

function packTagIndex(groups) {
  const records = [];
  const ids = new Map();
  return {
    records,
    groups: groups.map(group => ({
      tag: group.tag,
      items: group.items.map(({ tag, ...record }) => {
        const key = JSON.stringify(record);
        if (!ids.has(key)) { ids.set(key, records.length); records.push(record); }
        const id = ids.get(key);
        return tag === group.tag ? id : [id, tag];
      }),
    })),
  };
}

function unpackTagIndex(data) {
  return data.groups.map(group => ({
    tag: group.tag,
    items: group.items.map(value => {
      const [id, tag] = Array.isArray(value) ? value : [value, group.tag];
      return { ...data.records[id], tag };
    }),
  }));
}

export { getEntryDisplayIconImage, normalizeTagList, getTagKey, buildTagIndex, getSectionItems, getNodeChildren, isDetailNode, hasVariantAData, hasVariantBData, normalizeEntryRecord, getLogs, getPreviewBodyFile, loreEntryUrl, collectLoreEntries, packTagIndex, unpackTagIndex };
