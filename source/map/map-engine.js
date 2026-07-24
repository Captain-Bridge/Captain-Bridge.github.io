const state = {
  pageConfig: null,
  activeMap: null,
  activeFilterKeys: new Set(),
  zoom: 1,
  minZoom: 0.5,
  maxZoom: 4,
  panX: 0,
  panY: 0,
  selectedPoiId: null,
  currentResolution: "low",
  resolutionMode: "low",
  fullResolutionTimer: null,
  isDragging: false,
  dragMoved: false,
  activePointers: new Map(),
  gestureMode: null,
  panPointerId: null,
  panStartX: 0,
  panStartY: 0,
  panOriginX: 0,
  panOriginY: 0,
  pinchStartDistance: 0,
  pinchStartZoom: 1,
  pinchStartPanX: 0,
  pinchStartPanY: 0,
  pinchAnchorWorldX: 0,
  pinchAnchorWorldY: 0,
  suppressViewportClick: false,
  iconCatalog: new Map(),
  feedbackOpen: false,
  feedbackPoint: null,
};

const elements = {
  mapTabs: document.getElementById("map-tabs"),
  mapFilterBar: document.getElementById("map-filter-bar"),
  mapViewportShell: document.querySelector(".map-viewport-shell"),
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
  mapFeedbackTrigger: null,
  mapFeedbackPanel: null,
  mapFeedbackClose: null,
  mapFeedbackCopy: null,
  mapFeedbackContact: null,
  mapFeedbackSummary: null,
  mapContactModal: null,
  mapContactClose: null,
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

  state.pageConfig = pageConfig;
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
  ensureFeedbackUi();
  ensureImageViewer();
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
    if (state.suppressViewportClick) {
      state.suppressViewportClick = false;
      return;
    }

    if (state.feedbackOpen && !state.dragMoved && !event.target.closest(".map-poi")) {
      state.feedbackPoint = getWorldPointFromClient(event.clientX, event.clientY);
      updateFeedbackPanel();
      renderPois();
    }

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
    updateFeedbackPanel();
  });
  elements.mapFeedbackTrigger?.addEventListener("click", () => {
    state.feedbackOpen = !state.feedbackOpen;
    updateFeedbackPanel();
    syncFeedbackPanelVisibility();
  });
  elements.mapFeedbackClose?.addEventListener("click", () => {
    state.feedbackOpen = false;
    syncFeedbackPanelVisibility();
  });
  elements.mapFeedbackContact?.addEventListener("click", () => {
    elements.mapContactModal?.classList.remove("is-hidden");
  });
  elements.mapFeedbackCopy?.addEventListener("click", async () => {
    const payload = buildFeedbackPayload();

    try {
      await navigator.clipboard.writeText(payload);
      if (elements.mapFeedbackCopy) {
        elements.mapFeedbackCopy.textContent = "已复制";
      }
      window.setTimeout(() => {
        if (elements.mapFeedbackCopy) {
          elements.mapFeedbackCopy.textContent = "复制信息";
        }
      }, 1200);
    } catch (error) {
      console.error(error);
      if (elements.mapFeedbackCopy) {
        elements.mapFeedbackCopy.textContent = "复制失败";
      }
    }
  });
  elements.mapContactClose?.addEventListener("click", closeContactModal);
  elements.mapContactModal?.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.closeContact === "true") {
      closeContactModal();
    }
  });

  window.addEventListener("resize", () => {
    if (!state.activeMap) {
      return;
    }

    fitMapToViewport();
    syncBaseImage();
    updateFeedbackPanel();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      if (elements.mapImageViewer && !elements.mapImageViewer.classList.contains("is-hidden")) {
        event.preventDefault();
        navigateImageViewer(event.key === "ArrowLeft" ? -1 : 1);
        return;
      }
    }

    if (event.key !== "Escape") {
      return;
    }

    if (elements.mapImageViewer && !elements.mapImageViewer.classList.contains("is-hidden")) {
      closeImageViewer();
      return;
    }

    if (elements.mapContactModal && !elements.mapContactModal.classList.contains("is-hidden")) {
      closeContactModal();
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

  const tabs = state.pageConfig?.tabs ?? [
    {
      id: state.activeMap.id ?? "current-map",
      title: state.activeMap.title ?? "当前地图",
      href: window.location.pathname,
    },
  ];
  const activeTabId = state.pageConfig?.activeTabId ?? state.activeMap.id;

  for (const tab of tabs) {
    const link = document.createElement("a");
    link.className = `map-tab${tab.id === activeTabId ? " is-active" : ""}`;
    link.href = tab.href;
    link.textContent = tab.title;
    if (tab.id === activeTabId) {
      link.setAttribute("aria-current", "page");
    }
    elements.mapTabs.appendChild(link);
  }
}

function renderFilterButtons() {
  elements.mapFilterBar.innerHTML = "";
  const filterEntries = getPoiEntries();
  const allKeys = filterEntries.map((entry) => entry.key);

  if (filterEntries.length) {
    const hasAnyHidden = filterEntries.some((entry) => !state.activeFilterKeys.has(entry.key));
    const hasAnyVisible = filterEntries.some((entry) => state.activeFilterKeys.has(entry.key));
    const utilityRow = document.createElement("div");
    utilityRow.className = "map-filter-utility-row";

    const showAllButton = document.createElement("button");
    showAllButton.type = "button";
    showAllButton.className = `map-filter-button map-filter-button--utility${hasAnyHidden ? "" : " is-active"}`;
    showAllButton.style.setProperty("--filter-accent", "var(--blue)");
    showAllButton.setAttribute("aria-pressed", String(!hasAnyHidden));
    showAllButton.title = "显示全部";
    showAllButton.innerHTML = `
      <span class="map-filter-copy">
        <span class="map-filter-title">显示全部</span>
        <span class="map-filter-meta">启用所有筛选</span>
      </span>
    `;
    showAllButton.addEventListener("click", () => {
      state.activeFilterKeys = new Set(allKeys);
      renderFilterButtons();
      renderPois();
    });
    utilityRow.appendChild(showAllButton);

    const hideAllButton = document.createElement("button");
    hideAllButton.type = "button";
    hideAllButton.className = `map-filter-button map-filter-button--utility${hasAnyVisible ? "" : " is-active"}`;
    hideAllButton.style.setProperty("--filter-accent", "var(--red)");
    hideAllButton.setAttribute("aria-pressed", String(!hasAnyVisible));
    hideAllButton.title = "隐藏全部";
    hideAllButton.innerHTML = `
      <span class="map-filter-copy">
        <span class="map-filter-title">隐藏全部</span>
        <span class="map-filter-meta">关闭所有筛选</span>
      </span>
    `;
    hideAllButton.addEventListener("click", () => {
      state.activeFilterKeys = new Set();
      renderFilterButtons();
      renderPois();
    });
    utilityRow.appendChild(hideAllButton);
    elements.mapFilterBar.appendChild(utilityRow);
  }

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
    const iconScale = state.activeMap.iconScale ?? 1;
    const iconSize = (iconEntry?.iconSize ?? 28) * iconScale;
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
    button.dataset.visualSize = String(iconSize);
    button.setAttribute("aria-label", `${poi.title} ${iconEntry?.label ?? "POI"}`);
    button.innerHTML = `${iconEntry ? `<img class="map-poi-icon" src="${escapeHtml(iconEntry.path)}" alt="">` : ""}`;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openPopup(poi);
    });
    elements.mapPoiLayer.appendChild(button);
  }

  if (state.feedbackPoint) {
    const marker = document.createElement("div");
    marker.className = "map-feedback-marker";
    marker.style.left = `${state.feedbackPoint.x}px`;
    marker.style.top = `${state.feedbackPoint.y}px`;
    marker.dataset.visualSize = "24";
    elements.mapPoiLayer.appendChild(marker);
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
  elements.mapPopupBody.innerHTML = renderPoiImages(poi) + `<p class="map-popup-copy">${escapeHtml(poi.description ?? "暂无说明。")}</p>`;

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

function renderPoiImages(poi) {
  const rawImages = poi.images ?? [];
  if (!rawImages.length) return "";
  const images = rawImages.map((item) =>
    typeof item === "string" ? { src: item, caption: "" } : item
  );
  let html = '<div class="map-popup-gallery" data-active="0">';
  const firstSrc = escapeHtml(images[0].src);
  const firstCaption = escapeHtml(images[0].caption ?? "");
  html += `<img class="map-popup-image" src="${firstSrc}" alt="${escapeHtml(poi.title)}" loading="lazy">`;
  if (firstCaption) {
    html += `<p class="map-popup-image-caption">${firstCaption}</p>`;
  }
  if (images.length > 1) {
    html += '<div class="map-popup-gallery-nav">';
    for (let i = 0; i < images.length; i++) {
      html += `<button class="map-gallery-dot${i === 0 ? " is-active" : ""}" type="button" data-index="${i}"></button>`;
    }
    html += "</div>";
  }
  html += "</div>";
  return html;
}

document.addEventListener("click", (event) => {
  // 图片放大弹窗中的导航点切换
  const viewerDot = event.target.closest(".map-viewer-dot");
  if (viewerDot) {
    const index = Number(viewerDot.dataset.viewerIndex);
    syncImageViewerIndex(index);
    return;
  }

  // 点击弹窗中的小图打开放大查看器
  const galleryImg = event.target.closest(".map-popup-gallery > .map-popup-image");
  if (galleryImg) {
    const poiId = state.selectedPoiId;
    if (!poiId) return;
    const gallery = galleryImg.closest(".map-popup-gallery");
    const activeIndex = Number(gallery?.dataset.active ?? 0);
    openImageViewer(poiId, activeIndex);
    return;
  }

  const dot = event.target.closest(".map-gallery-dot");
  if (!dot) return;
  const index = Number(dot.dataset.index);
  const gallery = dot.closest(".map-popup-gallery");
  if (!gallery) return;
  const img = gallery.querySelector(".map-popup-image");
  const poiData = state.activeMap?.pois?.find((p) => p.id === state.selectedPoiId);
  const imageEntry = poiData?.images?.[index];
  if (img && imageEntry) {
    const entry = typeof imageEntry === "string" ? { src: imageEntry, caption: "" } : imageEntry;
    img.src = entry.src;
    gallery.dataset.active = String(index);
    gallery.querySelectorAll(".map-gallery-dot").forEach((d, i) => {
      d.classList.toggle("is-active", i === index);
    });
    let captionEl = gallery.querySelector(".map-popup-image-caption");
    if (entry.caption) {
      if (!captionEl) {
        captionEl = document.createElement("p");
        captionEl.className = "map-popup-image-caption";
        img.after(captionEl);
      }
      captionEl.textContent = entry.caption;
    } else if (captionEl) {
      captionEl.remove();
    }
  }
});

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
  const point = getViewportLocalPointFromClient(event.clientX, event.clientY);
  state.activePointers.set(event.pointerId, {
    x: point.x,
    y: point.y,
    startX: point.x,
    startY: point.y,
  });
  elements.mapViewport.setPointerCapture(event.pointerId);

  if (state.activePointers.size === 1) {
    state.suppressViewportClick = false;
    startPanGesture(event.pointerId, point);
  } else if (state.activePointers.size >= 2) {
    startPinchGesture();
  }
}

function handlePointerMove(event) {
  const pointer = state.activePointers.get(event.pointerId);

  if (!pointer) {
    return;
  }

  event.preventDefault();
  const point = getViewportLocalPointFromClient(event.clientX, event.clientY);
  pointer.x = point.x;
  pointer.y = point.y;

  if (state.gestureMode === "pinch" && state.activePointers.size >= 2) {
    updatePinchGesture();
    return;
  }

  if (state.gestureMode !== "pan" || state.panPointerId !== event.pointerId) {
    return;
  }

  if (!state.dragMoved && (Math.abs(point.x - state.panStartX) > 3 || Math.abs(point.y - state.panStartY) > 3)) {
    state.dragMoved = true;
    state.suppressViewportClick = true;
  }
  state.isDragging = true;
  state.panX = state.panOriginX + (point.x - state.panStartX);
  state.panY = state.panOriginY + (point.y - state.panStartY);
  applyTransform();
  refreshPoiVisualScale();
  syncBaseImage();
  updateFeedbackPanel();
}

function handlePointerUp(event) {
  const pointer = state.activePointers.get(event.pointerId);

  if (!pointer) {
    return;
  }

  event.preventDefault();
  state.activePointers.delete(event.pointerId);

  if (elements.mapViewport.hasPointerCapture(event.pointerId)) {
    elements.mapViewport.releasePointerCapture(event.pointerId);
  }

  if (state.activePointers.size >= 2) {
    startPinchGesture();
    return;
  }

  if (state.activePointers.size === 1) {
    const [remainingId, remainingPointer] = state.activePointers.entries().next().value;
    startPanGesture(remainingId, remainingPointer);
    state.suppressViewportClick = true;
    return;
  }

  state.gestureMode = null;
  state.panPointerId = null;
  state.isDragging = false;
  state.dragMoved = false;
  elements.mapViewport.classList.remove("is-dragging");
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
  updateFeedbackPanel();
}

function applyTransform() {
  elements.mapTransform.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
}

function startPanGesture(pointerId, point) {
  state.gestureMode = "pan";
  state.panPointerId = pointerId;
  state.panStartX = point.x;
  state.panStartY = point.y;
  state.panOriginX = state.panX;
  state.panOriginY = state.panY;
  state.isDragging = false;
  elements.mapViewport.classList.add("is-dragging");
}

function startPinchGesture() {
  const points = getActivePointerPoints();

  if (points.length < 2) {
    return;
  }

  const [first, second] = points;
  const centerX = (first.x + second.x) / 2;
  const centerY = (first.y + second.y) / 2;
  const distance = Math.max(Math.hypot(second.x - first.x, second.y - first.y), 1);

  state.gestureMode = "pinch";
  state.panPointerId = null;
  state.pinchStartDistance = distance;
  state.pinchStartZoom = state.zoom;
  state.pinchStartPanX = state.panX;
  state.pinchStartPanY = state.panY;
  state.pinchAnchorWorldX = (centerX - state.panX) / state.zoom;
  state.pinchAnchorWorldY = (centerY - state.panY) / state.zoom;
  state.dragMoved = true;
  state.suppressViewportClick = true;
  state.isDragging = true;
  elements.mapViewport.classList.add("is-dragging");
}

function updatePinchGesture() {
  const points = getActivePointerPoints();

  if (points.length < 2 || state.pinchStartDistance <= 0) {
    return;
  }

  const [first, second] = points;
  const centerX = (first.x + second.x) / 2;
  const centerY = (first.y + second.y) / 2;
  const distance = Math.max(Math.hypot(second.x - first.x, second.y - first.y), 1);
  const nextZoom = clamp(state.pinchStartZoom * (distance / state.pinchStartDistance), state.minZoom, state.maxZoom);

  state.zoom = nextZoom;
  state.panX = centerX - (state.pinchAnchorWorldX * nextZoom);
  state.panY = centerY - (state.pinchAnchorWorldY * nextZoom);

  applyTransform();
  refreshPoiVisualScale();
  syncBaseImage();
  updateFeedbackPanel();
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
  const poiButtons = elements.mapPoiLayer.querySelectorAll(".map-poi, .map-feedback-marker");

  for (const button of poiButtons) {
    const iconSize = Number(button.dataset.visualSize ?? button.dataset.iconSize ?? "28");
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

function ensureFeedbackUi() {
  if (!elements.mapViewportShell || elements.mapFeedbackTrigger) {
    return;
  }

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "map-feedback-trigger";
  trigger.textContent = "反馈点位";

  const panel = document.createElement("section");
  panel.className = "map-feedback-panel is-hidden";
  panel.setAttribute("aria-label", "反馈点位");
  panel.innerHTML = `
    <div class="map-feedback-head">
      <p class="map-panel-label">反馈点位</p>
      <button class="map-feedback-close" type="button" aria-label="关闭">×</button>
    </div>
    <p class="map-feedback-hint">点击地图可获取点位坐标</p>
    <p class="map-feedback-hint">如需反馈请点击反馈点位按钮联系我。</p>
    <pre class="map-feedback-summary"></pre>
    <div class="map-feedback-actions">
      <button class="map-feedback-action" type="button" data-action="contact">反馈点位</button>
      <button class="map-feedback-action" type="button" data-action="copy">复制信息</button>
    </div>
  `;

  const contactModal = document.createElement("div");
  contactModal.className = "map-contact-modal is-hidden";
  contactModal.innerHTML = `
    <div class="map-contact-backdrop" data-close-contact="true"></div>
    <article class="map-contact-card">
      <button class="map-contact-close" type="button" aria-label="关闭">×</button>
      <p class="map-panel-label">反馈点位</p>
      <img class="map-contact-image" src="/images/qq.webp" alt="QQ 二维码">
    </article>
  `;

  elements.mapViewportShell.appendChild(trigger);
  elements.mapViewportShell.appendChild(panel);
  document.body.appendChild(contactModal);

  elements.mapFeedbackTrigger = trigger;
  elements.mapFeedbackPanel = panel;
  elements.mapFeedbackClose = panel.querySelector(".map-feedback-close");
  elements.mapFeedbackCopy = panel.querySelector('[data-action="copy"]');
  elements.mapFeedbackContact = panel.querySelector('[data-action="contact"]');
  elements.mapFeedbackSummary = panel.querySelector(".map-feedback-summary");
  elements.mapContactModal = contactModal;
  elements.mapContactClose = contactModal.querySelector(".map-contact-close");

  updateFeedbackPanel();
  syncFeedbackPanelVisibility();
}

function ensureImageViewer() {
  if (elements.mapImageViewer) return;

  const viewer = document.createElement("div");
  viewer.className = "map-image-viewer is-hidden";
  viewer.id = "map-image-viewer";
  viewer.setAttribute("role", "dialog");
  viewer.setAttribute("aria-modal", "true");
  viewer.setAttribute("aria-label", "图片查看器");
  viewer.innerHTML = `
    <div class="map-image-viewer-backdrop" data-close-viewer="true"></div>
    <button class="map-viewer-arrow map-viewer-arrow--prev" type="button" aria-label="上一张">&lsaquo;</button>
    <button class="map-viewer-arrow map-viewer-arrow--next" type="button" aria-label="下一张">&rsaquo;</button>
    <div class="map-image-viewer-card">
      <button class="map-image-viewer-close" type="button" aria-label="关闭">&times;</button>
      <img class="map-image-viewer-image" id="map-image-viewer-image" alt="" draggable="false">
      <p class="map-image-viewer-caption" id="map-image-viewer-caption"></p>
      <div class="map-image-viewer-nav" id="map-image-viewer-nav"></div>
    </div>
  `;

  document.body.appendChild(viewer);
  elements.mapImageViewer = viewer;
  elements.mapImageViewerImage = viewer.querySelector("#map-image-viewer-image");
  elements.mapImageViewerCaption = viewer.querySelector("#map-image-viewer-caption");
  elements.mapImageViewerNav = viewer.querySelector("#map-image-viewer-nav");

  // 点击箭头切换
  viewer.addEventListener("click", (event) => {
    if (event.target.closest(".map-image-viewer-close") || event.target.closest("[data-close-viewer]")) {
      closeImageViewer();
      return;
    }
    if (event.target.closest(".map-viewer-arrow--prev")) {
      navigateImageViewer(-1);
      return;
    }
    if (event.target.closest(".map-viewer-arrow--next")) {
      navigateImageViewer(1);
      return;
    }
  });
}

function navigateImageViewer(delta) {
  const curIndex = Number(elements.mapImageViewer.dataset.currentIndex ?? 0);
  const poiId = elements.mapImageViewer.dataset.poiId;
  const poi = state.activeMap?.pois?.find((p) => p.id === poiId);
  if (!poi) return;
  const rawImages = poi.images ?? [];
  const images = rawImages.map((item) =>
    typeof item === "string" ? { src: item, caption: "" } : item
  );
  if (!images.length) return;
  const nextIndex = (curIndex + delta + images.length) % images.length;
  renderImageViewer(images, nextIndex);
}

function openImageViewer(poiId, index) {
  const poi = state.activeMap?.pois?.find((p) => p.id === poiId);
  if (!poi) return;
  const rawImages = poi.images ?? [];
  if (!rawImages.length) return;
  const images = rawImages.map((item) =>
    typeof item === "string" ? { src: item, caption: "" } : item
  );
  if (!images[index]) return;

  elements.mapImageViewer.dataset.poiId = poiId;
  renderImageViewer(images, index);
  elements.mapImageViewer.classList.remove("is-hidden");
  document.body.style.overflow = "hidden";
}

function closeImageViewer() {
  elements.mapImageViewer.classList.add("is-hidden");
  document.body.style.overflow = "";
}

function renderImageViewer(images, index) {
  elements.mapImageViewer.dataset.currentIndex = String(index);

  // 显示/隐藏箭头
  const hasMultiple = images.length > 1;
  const prevArrow = elements.mapImageViewer.querySelector(".map-viewer-arrow--prev");
  const nextArrow = elements.mapImageViewer.querySelector(".map-viewer-arrow--next");
  if (prevArrow) prevArrow.style.display = hasMultiple ? "" : "none";
  if (nextArrow) nextArrow.style.display = hasMultiple ? "" : "none";

  const entry = images[index];
  const img = elements.mapImageViewerImage;
  img.src = entry.src;
  img.alt = entry.caption || "";

  const caption = elements.mapImageViewerCaption;
  caption.textContent = entry.caption || "";
  caption.style.display = entry.caption ? "" : "none";

  const nav = elements.mapImageViewerNav;
  nav.innerHTML = "";
  for (let i = 0; i < images.length; i++) {
    const dot = document.createElement("button");
    dot.className = "map-viewer-dot" + (i === index ? " is-active" : "");
    dot.setAttribute("data-viewer-index", String(i));
    dot.setAttribute("aria-label", "第 " + (i + 1) + " 张图片");
    nav.appendChild(dot);
  }
}

function syncImageViewerIndex(index) {
  const poiId = elements.mapImageViewer.dataset.poiId;
  const poi = state.activeMap?.pois?.find((p) => p.id === poiId);
  if (!poi) return;
  const rawImages = poi.images ?? [];
  const images = rawImages.map((item) =>
    typeof item === "string" ? { src: item, caption: "" } : item
  );
  if (index < 0 || index >= images.length) return;
  renderImageViewer(images, index);
}

function syncFeedbackPanelVisibility() {
  if (!elements.mapFeedbackPanel || !elements.mapFeedbackTrigger) {
    return;
  }

  elements.mapFeedbackPanel.classList.toggle("is-hidden", !state.feedbackOpen);
  elements.mapFeedbackTrigger.classList.toggle("is-active", state.feedbackOpen);
  elements.mapFeedbackTrigger.setAttribute("aria-pressed", String(state.feedbackOpen));
}

function updateFeedbackPanel() {
  if (!elements.mapFeedbackSummary || !state.activeMap) {
    return;
  }

  elements.mapFeedbackSummary.textContent = buildFeedbackPayload();
}

function buildFeedbackPayload() {
  const targetPoint = state.feedbackPoint ?? getViewportCenterPoint();

  return [
    `地图：${state.activeMap?.title ?? document.title}`,
    `坐标：x=${Math.round(targetPoint.x)}, y=${Math.round(targetPoint.y)}`,
  ].join("\n");
}

function closeContactModal() {
  elements.mapContactModal?.classList.add("is-hidden");
}

function getViewportCenterPoint() {
  const rect = elements.mapViewport.getBoundingClientRect();
  return getWorldPointFromClient(rect.left + (rect.width / 2), rect.top + (rect.height / 2));
}

function getWorldPointFromClient(clientX, clientY) {
  const point = getViewportLocalPointFromClient(clientX, clientY);
  const localX = point.x;
  const localY = point.y;
  const worldX = (localX - state.panX) / state.zoom;
  const worldY = (localY - state.panY) / state.zoom;

  return {
    x: clamp(worldX, 0, state.activeMap?.size?.width ?? worldX),
    y: clamp(worldY, 0, state.activeMap?.size?.height ?? worldY),
  };
}

function getViewportLocalPointFromClient(clientX, clientY) {
  const rect = elements.mapViewport.getBoundingClientRect();

  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function getActivePointerPoints() {
  return [...state.activePointers.values()].slice(0, 2);
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