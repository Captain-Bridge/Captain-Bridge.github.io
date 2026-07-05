const state = {
  activeMap: null,
  activeFilterKeys: new Set(),
  zoom: 1,
  minZoom: 0.5,
  maxZoom: 4,
  panX: 0,
  panY: 0,
  pointerId: null,
  dragStartX: 0,
  dragStartY: 0,
  dragOriginX: 0,
  dragOriginY: 0,
  selectedPoiId: null,
  currentResolution: "low",
  resolutionMode: "low",
  fullResolutionTimer: null,
  isDragging: false,
  iconCatalog: new Map(),
};

const elements = {
  mapTabs: document.getElementById("map-tabs"),
  mapFilterBar: document.getElementById("map-filter-bar"),
  mapViewport: document.getElementById("map-viewport"),
  mapTransform: document.getElementById("map-transform"),
  mapBase: document.getElementById("map-base"),
  mapOverlaySvg: document.getElementById("map-overlay-svg"),
  mapPoiLayer: document.getElementById("map-poi-layer"),
  mapLoading: document.getElementById("map-loading"),
  mapPopup: document.getElementById("map-popup"),
  mapPopupType: document.getElementById("map-popup-type"),
  mapPopupTitle: document.getElementById("map-popup-title"),
  mapPopupBody: document.getElementById("map-popup-body"),
  mapPopupMeta: document.getElementById("map-popup-meta"),
  mapPopupLinks: document.getElementById("map-popup-links"),
  mapPopupClose: document.getElementById("map-popup-close"),
  mapResetButton: document.getElementById("map-reset-button"),
};

document.addEventListener("DOMContentLoaded", () => {
  initialize().catch((error) => {
    console.error(error);
    elements.mapLoading.textContent = "地图加载失败，请检查地图 JSON 配置。";
  });
});

async function initialize() {
  const pageConfig = window.MAP_PAGE_CONFIG;

  if (!pageConfig?.dataPath) {
    throw new Error("Missing MAP_PAGE_CONFIG.dataPath");
  }

  const [iconCatalog, mapData] = await Promise.all([
    fetchJson(pageConfig.iconCatalogPath ?? "/map/assets/icons/poi-icons.json"),
    fetchJson(pageConfig.dataPath),
  ]);

  state.iconCatalog = new Map((iconCatalog.icons ?? []).map((entry) => [entry.id, entry]));
  state.activeMap = mapData;
  state.activeFilterKeys = new Set(getPoiEntries().map((entry) => entry.key));
  state.minZoom = mapData.minZoom ?? 0.45;
  state.maxZoom = mapData.maxZoom ?? 4.5;

  elements.mapTransform.style.width = `${mapData.size.width}px`;
  elements.mapTransform.style.height = `${mapData.size.height}px`;
  elements.mapOverlaySvg.setAttribute("viewBox", `0 0 ${mapData.size.width} ${mapData.size.height}`);
  elements.mapOverlaySvg.setAttribute("width", String(mapData.size.width));
  elements.mapOverlaySvg.setAttribute("height", String(mapData.size.height));
  elements.mapPoiLayer.style.width = `${mapData.size.width}px`;
  elements.mapPoiLayer.style.height = `${mapData.size.height}px`;

  renderTabs();
  renderFilterButtons();
  renderRegions();
  renderPois();
  bindEvents();
  closePopup();
  resetResolutionMode();
  fitMapToViewport();
  syncBaseImage();
  elements.mapLoading.hidden = true;
  scheduleFullResolutionPromotion();
}

function bindEvents() {
  elements.mapViewport.addEventListener("wheel", handleWheel, { passive: false });
  elements.mapViewport.addEventListener("pointerdown", handlePointerDown);
  elements.mapViewport.addEventListener("pointermove", handlePointerMove);
  elements.mapViewport.addEventListener("pointerup", handlePointerUp);
  elements.mapViewport.addEventListener("pointerleave", handlePointerUp);
  elements.mapViewport.addEventListener("pointercancel", handlePointerUp);
  elements.mapViewport.addEventListener("click", (event) => {
    if (!event.target.closest(".map-poi")) {
      closePopup();
    }
  });
  elements.mapPopupClose.addEventListener("click", closePopup);
  elements.mapPopup.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.closePopup === "true") {
      closePopup();
    }
  });
  elements.mapResetButton.addEventListener("click", () => {
    fitMapToViewport();
    syncBaseImage();
  });

  window.addEventListener("resize", () => {
    if (!state.activeMap) {
      return;
    }

    fitMapToViewport();
    syncBaseImage();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    const active = document.activeElement;
    const tagName = active && active.tagName ? active.tagName.toLowerCase() : "";

    if (tagName === "input" || tagName === "textarea" || (active && active.isContentEditable)) {
      return;
    }

    window.location.href = "/";
  });
}

function renderTabs() {
  elements.mapTabs.innerHTML = "";

  if (!state.activeMap) {
    return;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "map-tab is-active";
  button.textContent = state.activeMap.title ?? "当前地图";
  button.setAttribute("aria-current", "page");
  elements.mapTabs.appendChild(button);
}

function renderFilterButtons() {
  elements.mapFilterBar.innerHTML = "";
  const filterEntries = getPoiEntries();

  for (const entry of filterEntries) {
    const isActive = state.activeFilterKeys.has(entry.key);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `map-filter-button${isActive ? " is-active" : ""}`;
    button.style.setProperty("--filter-accent", entry.accentColor ?? "var(--green)");
    button.setAttribute("aria-pressed", String(isActive));
    button.title = `${entry.label} (${entry.count} 个点位)`;
    button.innerHTML = `
      <span class="map-filter-icon-wrap"><img class="map-filter-icon" src="${escapeHtml(entry.path)}" alt=""></span>
      <span class="map-filter-copy">
        <span class="map-filter-title">${escapeHtml(entry.label)}</span>
        <span class="map-filter-meta">${entry.count} 个点位</span>
      </span>
    `;
    button.addEventListener("click", () => {
      if (state.activeFilterKeys.has(entry.key)) {
        state.activeFilterKeys.delete(entry.key);
      } else {
        state.activeFilterKeys.add(entry.key);
      }

      renderFilterButtons();
      renderPois();
    });
    elements.mapFilterBar.appendChild(button);
  }
}

function getPoiEntries() {
  const pois = state.activeMap?.pois ?? [];

  if (!pois.length) {
    return [];
  }

  const iconEntries = new Map();

  for (const poi of pois) {
    if (!poi.iconKey) {
      continue;
    }

    const iconEntry = state.iconCatalog.get(poi.iconKey);
    const current = iconEntries.get(poi.iconKey) ?? {
      key: getPoiFilterKey(poi),
      label: iconEntry?.label ?? poi.title,
      path: iconEntry?.path ?? "",
      accentColor: iconEntry?.accentColor ?? "var(--green)",
      order: iconEntry?.order ?? 999,
      count: 0,
    };
    current.count += 1;
    iconEntries.set(poi.iconKey, current);
  }

  return [...iconEntries.values()].sort((a, b) => {
    if ((a.order ?? 999) !== (b.order ?? 999)) {
      return (a.order ?? 999) - (b.order ?? 999);
    }

    return String(a.label).localeCompare(String(b.label), "zh-CN");
  });
}

function renderRegions() {
  const fragments = [];

  for (const region of state.activeMap?.regions ?? []) {
    const points = (region.polygon ?? []).map(([x, y]) => `${x},${y}`).join(" ");
    const label = region.labelPosition ?? region.polygon?.[0];
    fragments.push(`
      <g class="map-region" data-region-id="${escapeHtml(region.id)}">
        <polygon points="${points}" style="fill:${region.fill ?? "rgba(0, 229, 91, 0.08)"}; stroke:${region.stroke ?? "rgba(0, 229, 91, 0.48)"};"></polygon>
        ${label ? `<text class="region-label" x="${label[0]}" y="${label[1]}">${escapeHtml(region.title)}</text>` : ""}
      </g>
    `);
  }

  elements.mapOverlaySvg.innerHTML = fragments.join("");
}

function renderPois() {
  elements.mapPoiLayer.innerHTML = "";
  const visiblePois = getVisiblePois();

  for (const poi of visiblePois) {
    const button = document.createElement("button");
    const iconEntry = poi.iconKey ? state.iconCatalog.get(poi.iconKey) : null;
    const iconSize = poi.iconSize ?? 28;
    button.type = "button";
    button.className = `map-poi${state.selectedPoiId === poi.id ? " is-selected" : ""}`;
    button.style.left = `${poi.x}px`;
    button.style.top = `${poi.y}px`;
    button.style.setProperty("--poi-color", iconEntry?.accentColor ?? "var(--green)");
    button.style.width = `${iconSize}px`;
    button.style.height = `${iconSize}px`;
    button.style.marginLeft = `${-(iconSize / 2)}px`;
    button.style.marginTop = `${-(iconSize / 2)}px`;
    button.dataset.iconSize = String(iconSize);
    button.setAttribute("aria-label", `${poi.title} ${iconEntry?.label ?? "POI"}`);
    button.innerHTML = `${iconEntry ? `<img class="map-poi-icon" src="${escapeHtml(iconEntry.path)}" alt="">` : ""}`;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openPopup(poi);
    });
    elements.mapPoiLayer.appendChild(button);
  }

  refreshPoiVisualScale();
}

function openPopup(poi) {
  const iconEntry = poi.iconKey ? state.iconCatalog.get(poi.iconKey) : null;
  state.selectedPoiId = poi.id;
  renderPois();
  elements.mapPopup.classList.remove("is-hidden");
  elements.mapPopupType.textContent = iconEntry?.label ?? "POI";
  elements.mapPopupTitle.textContent = poi.title;
  elements.mapPopupBody.textContent = poi.description ?? "暂无说明。";

  const meta = [];
  if (poi.floor) {
    meta.push(["楼层", poi.floor]);
  }
  if (poi.source) {
    meta.push(["来源", poi.source]);
  }
  if (poi.factionId) {
    meta.push(["阵营", poi.factionId]);
  }

  elements.mapPopupMeta.innerHTML = meta
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value))}</dd>`)
    .join("");

  elements.mapPopupLinks.innerHTML = "";

  for (const link of poi.links ?? []) {
    const anchor = document.createElement("a");
    anchor.href = link.href;
    anchor.textContent = link.label;
    if (/^https?:\/\//i.test(link.href)) {
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
    }
    elements.mapPopupLinks.appendChild(anchor);
  }
}

function closePopup() {
  state.selectedPoiId = null;
  renderPois();
  elements.mapPopup.classList.add("is-hidden");
}

function handleWheel(event) {
  if (!state.activeMap) {
    return;
  }

  event.preventDefault();
  promoteToFullResolution();

  const zoomFactor = event.deltaY < 0 ? 1.12 : 0.9;
  const nextZoom = clamp(state.zoom * zoomFactor, state.minZoom, state.maxZoom);
  const rect = elements.mapViewport.getBoundingClientRect();
  const localX = event.clientX - rect.left;
  const localY = event.clientY - rect.top;
  const worldX = (localX - state.panX) / state.zoom;
  const worldY = (localY - state.panY) / state.zoom;

  state.panX = localX - (worldX * nextZoom);
  state.panY = localY - (worldY * nextZoom);
  state.zoom = nextZoom;

  applyTransform();
  refreshPoiVisualScale();
  syncBaseImage();
}

function handlePointerDown(event) {
  if (!state.activeMap || event.target.closest(".map-poi")) {
    return;
  }

  if (event.button !== undefined && event.button !== 0) {
    return;
  }

  event.preventDefault();
  promoteToFullResolution();
  state.pointerId = event.pointerId;
  state.isDragging = false;
  state.dragStartX = event.clientX;
  state.dragStartY = event.clientY;
  state.dragOriginX = state.panX;
  state.dragOriginY = state.panY;
  elements.mapViewport.classList.add("is-dragging");
  elements.mapViewport.setPointerCapture(event.pointerId);
}

function handlePointerMove(event) {
  if (state.pointerId !== event.pointerId) {
    return;
  }

  event.preventDefault();
  state.isDragging = true;
  state.panX = state.dragOriginX + (event.clientX - state.dragStartX);
  state.panY = state.dragOriginY + (event.clientY - state.dragStartY);
  applyTransform();
}

function handlePointerUp(event) {
  if (state.pointerId !== event.pointerId) {
    return;
  }

  event.preventDefault();
  state.pointerId = null;
  state.isDragging = false;
  elements.mapViewport.classList.remove("is-dragging");
  if (elements.mapViewport.hasPointerCapture(event.pointerId)) {
    elements.mapViewport.releasePointerCapture(event.pointerId);
  }
}

function fitMapToViewport() {
  if (!state.activeMap) {
    return;
  }

  const viewportRect = elements.mapViewport.getBoundingClientRect();

  if (viewportRect.width <= 0 || viewportRect.height <= 0) {
    window.requestAnimationFrame(() => {
      fitMapToViewport();
    });
    return;
  }

  const widthRatio = viewportRect.width / state.activeMap.size.width;
  const heightRatio = viewportRect.height / state.activeMap.size.height;
  const fitZoom = Math.min(widthRatio, heightRatio) * 0.92;
  const initialZoom = state.activeMap.defaultZoom ?? fitZoom;

  state.zoom = clamp(initialZoom, Math.min(state.minZoom, fitZoom), state.maxZoom);
  state.panX = (viewportRect.width - (state.activeMap.size.width * state.zoom)) / 2;
  state.panY = (viewportRect.height - (state.activeMap.size.height * state.zoom)) / 2;

  applyTransform();
  refreshPoiVisualScale();
}

function applyTransform() {
  elements.mapTransform.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
}

function syncBaseImage() {
  if (!state.activeMap) {
    return;
  }

  const resolution = getResolutionForCurrentMode();
  const sourcePath = state.activeMap.tileSources?.[resolution];

  if (!sourcePath) {
    return;
  }

  if (resolution !== state.currentResolution || elements.mapBase.dataset.mapId !== state.activeMap.id) {
    state.currentResolution = resolution;
    elements.mapBase.src = sourcePath;
    elements.mapBase.dataset.mapId = state.activeMap.id ?? "single-map";
  }
}

function getVisiblePois() {
  return (state.activeMap?.pois ?? []).filter((poi) => {
    if (!poi.iconKey) {
      return false;
    }

    return state.activeFilterKeys.has(getPoiFilterKey(poi));
  });
}

function getPoiFilterKey(poi) {
  return `icon:${poi.iconKey}`;
}

function refreshPoiVisualScale() {
  const poiButtons = elements.mapPoiLayer.querySelectorAll(".map-poi");

  for (const button of poiButtons) {
    const iconSize = Number(button.dataset.iconSize ?? "28");
    const scale = getPoiVisualScale(iconSize);
    button.style.transform = `scale(${scale})`;
  }
}

function getPoiVisualScale(iconSize) {
  const minimumPixels = 14;
  const currentPixels = iconSize * state.zoom;

  if (currentPixels <= 0) {
    return 1;
  }

  return clamp(minimumPixels / currentPixels, 1, 4);
}

function getResolutionForCurrentMode() {
  if (state.resolutionMode === "full" && state.activeMap?.tileSources?.full) {
    return "full";
  }

  return "low";
}

function resetResolutionMode() {
  if (state.fullResolutionTimer) {
    window.clearTimeout(state.fullResolutionTimer);
    state.fullResolutionTimer = null;
  }

  state.resolutionMode = "low";
}

function scheduleFullResolutionPromotion() {
  if (!state.activeMap?.tileSources?.full) {
    return;
  }

  if (state.fullResolutionTimer) {
    window.clearTimeout(state.fullResolutionTimer);
  }

  state.fullResolutionTimer = window.setTimeout(() => {
    promoteToFullResolution();
  }, 180);
}

function promoteToFullResolution() {
  if (!state.activeMap?.tileSources?.full) {
    return;
  }

  if (state.fullResolutionTimer) {
    window.clearTimeout(state.fullResolutionTimer);
    state.fullResolutionTimer = null;
  }

  if (state.resolutionMode === "full") {
    return;
  }

  state.resolutionMode = "full";
  syncBaseImage();
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }

  return response.json();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
