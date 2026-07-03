const state = {
  manifest: null,
  activeMap: null,
  activeMapData: null,
  poiTypes: new Map(),
  activeTypeFilters: new Set(),
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
  isDragging: false,
};

const elements = {
  mapName: document.getElementById("map-name"),
  mapSummary: document.getElementById("map-summary"),
  mapTabs: document.getElementById("map-tabs"),
  mapFilterBar: document.getElementById("map-filter-bar"),
  mapLegend: document.getElementById("map-legend"),
  mapViewport: document.getElementById("map-viewport"),
  mapTransform: document.getElementById("map-transform"),
  mapBase: document.getElementById("map-base"),
  mapOverlaySvg: document.getElementById("map-overlay-svg"),
  mapPoiLayer: document.getElementById("map-poi-layer"),
  mapStatusBar: document.getElementById("map-status-bar"),
  mapLoading: document.getElementById("map-loading"),
  mapCountPill: document.getElementById("map-count-pill"),
  mapResolutionPill: document.getElementById("map-resolution-pill"),
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
    elements.mapLoading.textContent = "地图加载失败，请检查 JSON 配置。";
    elements.mapStatusBar.textContent = "加载失败";
  });
});

async function initialize() {
  const manifest = await fetchJson("/map/data/manifest.json");
  state.manifest = manifest;
  state.poiTypes = new Map(manifest.poiTypes.map((entry) => [entry.id, entry]));
  state.activeTypeFilters = new Set(manifest.poiTypes.map((entry) => entry.id));

  renderLegend();
  renderFilterButtons();
  renderTabs();
  bindEvents();

  if (!manifest.maps.length) {
    throw new Error("Manifest does not contain any maps.");
  }

  elements.mapCountPill.textContent = `${manifest.maps.length} 张`;
  await activateMap(manifest.maps[0].id);
}

async function activateMap(mapId) {
  const nextMap = state.manifest.maps.find((entry) => entry.id === mapId);

  if (!nextMap) {
    throw new Error(`Unknown map id: ${mapId}`);
  }

  elements.mapLoading.hidden = false;
  state.activeMap = nextMap;
  state.activeMapData = await fetchJson(nextMap.dataPath);
  state.selectedPoiId = null;
  state.minZoom = nextMap.minZoom ?? 0.45;
  state.maxZoom = nextMap.maxZoom ?? 4.5;

  elements.mapName.textContent = nextMap.title;
  elements.mapSummary.textContent = nextMap.summary ?? "暂无简介。";
  elements.mapTransform.style.width = `${nextMap.size.width}px`;
  elements.mapTransform.style.height = `${nextMap.size.height}px`;
  elements.mapOverlaySvg.setAttribute("viewBox", `0 0 ${nextMap.size.width} ${nextMap.size.height}`);
  elements.mapOverlaySvg.setAttribute("width", String(nextMap.size.width));
  elements.mapOverlaySvg.setAttribute("height", String(nextMap.size.height));
  elements.mapPoiLayer.style.width = `${nextMap.size.width}px`;
  elements.mapPoiLayer.style.height = `${nextMap.size.height}px`;

  renderTabs();
  renderRegions();
  renderPois();
  closePopup();
  fitMapToViewport();
  syncBaseImage();
  updateStatus();
  elements.mapLoading.hidden = true;
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
    updateStatus();
  });

  window.addEventListener("resize", () => {
    if (!state.activeMap) {
      return;
    }

    fitMapToViewport();
    syncBaseImage();
    updateStatus();
  });
}

function renderTabs() {
  elements.mapTabs.innerHTML = "";

  for (const map of state.manifest.maps) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `map-tab${state.activeMap?.id === map.id ? " is-active" : ""}`;
    button.textContent = map.title;
    button.addEventListener("click", () => {
      activateMap(map.id).catch((error) => {
        console.error(error);
      });
    });
    elements.mapTabs.appendChild(button);
  }
}

function renderFilterButtons() {
  elements.mapFilterBar.innerHTML = "";

  for (const poiType of state.manifest.poiTypes) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `map-filter-button${state.activeTypeFilters.has(poiType.id) ? " is-active" : ""}`;
    button.textContent = poiType.label;
    button.addEventListener("click", () => {
      if (state.activeTypeFilters.has(poiType.id)) {
        state.activeTypeFilters.delete(poiType.id);
      } else {
        state.activeTypeFilters.add(poiType.id);
      }

      renderFilterButtons();
      renderPois();
      updateStatus();
    });
    elements.mapFilterBar.appendChild(button);
  }
}

function renderLegend() {
  elements.mapLegend.innerHTML = "";

  for (const poiType of state.manifest.poiTypes) {
    const item = document.createElement("div");
    item.className = "map-legend-item";
    item.innerHTML = `
      <span class="map-legend-chip" style="color:${poiType.color}; background:${poiType.color};"></span>
      <span>${poiType.label}</span>
    `;
    elements.mapLegend.appendChild(item);
  }
}

function renderRegions() {
  const fragments = [];

  for (const region of state.activeMapData.regions ?? []) {
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
    const poiType = state.poiTypes.get(poi.type);
    button.type = "button";
    button.className = `map-poi${state.selectedPoiId === poi.id ? " is-selected" : ""}`;
    button.style.left = `${poi.x}px`;
    button.style.top = `${poi.y}px`;
    button.style.setProperty("--poi-color", poiType?.color ?? "var(--green)");
    button.setAttribute("aria-label", `${poi.title} ${poiType?.label ?? poi.type}`);
    button.innerHTML = `<span class="map-poi-label">${escapeHtml(poi.title)}</span>`;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openPopup(poi);
    });
    elements.mapPoiLayer.appendChild(button);
  }
}

function openPopup(poi) {
  const poiType = state.poiTypes.get(poi.type);
  state.selectedPoiId = poi.id;
  renderPois();
  elements.mapPopup.classList.remove("is-hidden");
  elements.mapPopupType.textContent = poiType?.label ?? poi.type;
  elements.mapPopupTitle.textContent = poi.title;
  elements.mapPopupBody.textContent = poi.description ?? poi.summary ?? "暂无说明。";

  const meta = [];
  if (poi.floor) {
    meta.push(["楼层", poi.floor]);
  }
  if (poi.confidence) {
    meta.push(["置信度", poi.confidence]);
  }
  if (poi.source) {
    meta.push(["依据", poi.source]);
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
  syncBaseImage();
  updateStatus();
}

function handlePointerDown(event) {
  if (!state.activeMap || event.target.closest(".map-poi")) {
    return;
  }

  if (event.button !== undefined && event.button !== 0) {
    return;
  }

  event.preventDefault();
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
  updateStatus();
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
  const viewportRect = elements.mapViewport.getBoundingClientRect();
  const widthRatio = viewportRect.width / state.activeMap.size.width;
  const heightRatio = viewportRect.height / state.activeMap.size.height;
  const fitZoom = Math.min(widthRatio, heightRatio) * 0.92;

  state.zoom = clamp(state.activeMap.defaultZoom ?? fitZoom, state.minZoom, state.maxZoom);
  state.panX = (viewportRect.width - (state.activeMap.size.width * state.zoom)) / 2;
  state.panY = (viewportRect.height - (state.activeMap.size.height * state.zoom)) / 2;

  applyTransform();
}

function applyTransform() {
  elements.mapTransform.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
}

function syncBaseImage() {
  if (!state.activeMap) {
    return;
  }

  const resolution = getResolutionForZoom(state.zoom);

  if (resolution !== state.currentResolution || elements.mapBase.dataset.mapId !== state.activeMap.id) {
    state.currentResolution = resolution;
    elements.mapBase.src = state.activeMap.tileSources[resolution];
    elements.mapBase.dataset.mapId = state.activeMap.id;
    elements.mapResolutionPill.textContent = resolution.toUpperCase();
  }
}

function updateStatus() {
  const visiblePois = getVisiblePois().length;
  const totalPois = state.activeMapData?.pois?.length ?? 0;
  elements.mapStatusBar.innerHTML = `
    <span>${escapeHtml(state.activeMap?.title ?? "未选择地图")}</span>
    <span>缩放 ${(state.zoom * 100).toFixed(0)}%</span>
    <span>显示 ${visiblePois} / ${totalPois} 个 POI</span>
    <span>分辨率 ${state.currentResolution.toUpperCase()}</span>
  `;
}

function getVisiblePois() {
  return (state.activeMapData?.pois ?? []).filter((poi) => state.activeTypeFilters.has(poi.type));
}

function getResolutionForZoom(zoom) {
  if (zoom < 0.85) {
    return "low";
  }

  if (zoom < 1.7) {
    return "medium";
  }

  return "full";
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
