(() => {
  const DATA_URL = "/news/data/marathon-news.json";
  const FALLBACK_ICON = "/marathon-lore/assets/images/icons/marathon-brand-mark.webp";
  const FEATURE_PREVIEW_LIMIT = 180;

  const state = {
    data: null,
    currentPage: 1,
  };

  const els = {
    heroTitle: document.querySelector("[data-hero-title]"),
    heroDescription: document.querySelector("[data-hero-description]"),
    totalCount: document.querySelector("[data-total-count]"),
    lastUpdated: document.querySelector("[data-last-updated]"),
    pageState: document.querySelector("[data-page-state]"),
    sourceState: document.querySelector("[data-source-state]"),
    feature: document.querySelector("[data-feature]"),
    grid: document.querySelector("[data-news-grid]"),
    empty: document.querySelector("[data-empty-state]"),
    pagination: document.querySelector("[data-pagination]"),
    paginationInfo: document.querySelector("[data-pagination-info]"),
    paginationPages: document.querySelector("[data-pagination-pages]"),
    paginationPrev: document.querySelector("[data-pagination-prev]"),
    paginationNext: document.querySelector("[data-pagination-next]"),
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(value) {
    if (!value) return "未知日期";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  }

  function formatDateTime(value) {
    if (!value) return "\u672a\u77e5";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  function getPageFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const parsed = Number.parseInt(params.get("page") || "1", 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  }

  function setPageInUrl(page) {
    const url = new URL(window.location.href);
    if (page <= 1) {
      url.searchParams.delete("page");
    } else {
      url.searchParams.set("page", String(page));
    }
    window.history.replaceState({}, "", url);
  }

  function getPrimaryImage(item) {
    return item.images?.primary?.url || FALLBACK_ICON;
  }

  function getExcerpt(item) {
    return (
      item.content?.zh?.excerpt ||
      item.content?.zh?.subtitle ||
      item.content?.zh?.bodyText?.slice(0, 220) ||
      item.content?.en?.excerpt ||
      item.content?.en?.subtitle ||
      item.content?.en?.bodyText?.slice(0, 220) ||
      ""
    );
  }

  function getDisplayTitle(item) {
    return item.content?.zh?.title || item.content?.en?.title || item.slug || "";
  }

  function getDisplaySubtitle(item) {
    return item.content?.zh?.subtitle || item.content?.en?.subtitle || getExcerpt(item);
  }

  function getDisplayBodyPreview(item) {
    return item.content?.zh?.bodyText || item.content?.en?.bodyText || "";
  }

  function createCard(item) {
    const imageUrl = getPrimaryImage(item);
    const isFallback = imageUrl === FALLBACK_ICON;
    const title = escapeHtml(getDisplayTitle(item));
    const excerpt = escapeHtml(getExcerpt(item));
    const author = escapeHtml(item.author);
    const category = escapeHtml(item.category);
    const slug = escapeHtml(item.slug);
    const publishedAt = escapeHtml(formatDate(item.publishedAt));
    const readMinutes = escapeHtml(`${item.metrics.readMinutes} 分钟阅读`);
    const detailUrl = escapeHtml(item.localPath || item.articleUrl);
    const sourceUrl = escapeHtml(item.articleUrl?.en || item.articleUrl);

    return `
      <article class="article-card">
        <a class="article-thumb${isFallback ? " fallback" : ""}" href="${detailUrl}">
          <img src="${escapeHtml(imageUrl)}" alt="${title}">
        </a>
        <div class="article-body">
          <span class="article-kicker">${category}</span>
          <h2 class="article-title">${title}</h2>
          <div class="article-meta">
            <span>${publishedAt}</span>
            <span>${author}</span>
            <span>${readMinutes}</span>
          </div>
          <p class="article-summary">${excerpt}</p>
          <div class="article-footer">
            <span>${item.metrics.wordCount} 词</span>
            <strong>${slug}</strong>
          </div>
          <div class="article-actions">
            <a class="action-link" href="${detailUrl}">站内阅读</a>
            <a class="action-link secondary" href="${sourceUrl}" target="_blank" rel="noreferrer">原站来源</a>
          </div>
        </div>
      </article>
    `;
  }

  function renderFeature(item) {
    if (!els.feature || !item) return;

    const imageUrl = getPrimaryImage(item);
    const title = escapeHtml(getDisplayTitle(item));
    const subtitleText = getDisplaySubtitle(item).replace(/\s+/g, " ").trim();
    const subtitle = escapeHtml(subtitleText);
    const publishedAt = escapeHtml(formatDate(item.publishedAt));
    const category = escapeHtml(item.category);
    const articleUrl = escapeHtml(item.localPath || item.articleUrl?.en || item.articleUrl);
    const sourceUrl = escapeHtml(item.articleUrl?.en || item.articleUrl);
    const bodySource = getDisplayBodyPreview(item).replace(/\s+/g, " ").trim();
    const reducedBodySource = bodySource.startsWith(subtitleText)
      ? bodySource.slice(subtitleText.length).trim()
      : bodySource;
    const previewSource = reducedBodySource || bodySource;
    const previewText = previewSource.slice(0, FEATURE_PREVIEW_LIMIT).trim();
    const bodyPreview = escapeHtml(previewText);
    const hasPreview = Boolean(previewText);

    els.feature.innerHTML = `
      <div class="feature-media">
        <img src="${escapeHtml(imageUrl)}" alt="${title}">
      </div>
      <div class="feature-copy">
        <span class="article-kicker">${category}</span>
        <h2><a href="${articleUrl}">${title}</a></h2>
        <div class="article-meta">
          <span>${publishedAt}</span>
          <span>${escapeHtml(item.author)}</span>
          <span>${item.metrics.wordCount} 字</span>
        </div>
        <p class="feature-subtitle">${subtitle}</p>
        ${hasPreview ? `<p class="feature-preview">${bodyPreview}${previewSource.length > FEATURE_PREVIEW_LIMIT ? "..." : ""}</p>` : ""}
        <div class="article-actions">
          <a class="action-link" href="${articleUrl}">进入详情页</a>
          <a class="action-link secondary" href="${sourceUrl}" target="_blank" rel="noreferrer">查看 Bungie 原文</a>
        </div>
      </div>
    `;
  }
  function renderPagination(totalPages) {
    if (!els.pagination || !els.paginationPages) return;

    els.pagination.hidden = totalPages <= 1;
    els.paginationInfo.textContent = `第 ${state.currentPage} 页 / 共 ${totalPages} 页`;
    els.paginationPrev.disabled = state.currentPage <= 1;
    els.paginationNext.disabled = state.currentPage >= totalPages;

    const pageButtons = [];
    const start = Math.max(1, state.currentPage - 2);
    const end = Math.min(totalPages, state.currentPage + 2);

    if (start > 1) {
      pageButtons.push(1);
      if (start > 2) pageButtons.push("gap-start");
    }

    for (let page = start; page <= end; page += 1) {
      pageButtons.push(page);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pageButtons.push("gap-end");
      pageButtons.push(totalPages);
    }

    els.paginationPages.innerHTML = pageButtons
      .map((entry) => {
        if (typeof entry !== "number") {
          return `<span class="pagination-gap">...</span>`;
        }
        const current = entry === state.currentPage ? " is-current" : "";
        return `<button class="page-button${current}" type="button" data-page="${entry}">${entry}</button>`;
      })
      .join("");
  }

  function renderPage() {
    const items = state.data?.items || [];
    const itemsPerPage = state.data?.itemsPerPage || 8;
    const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));

    if (state.currentPage > totalPages) {
      state.currentPage = totalPages;
    }

    const start = (state.currentPage - 1) * itemsPerPage;
    const pageItems = items.slice(start, start + itemsPerPage);

    if (els.grid) {
      els.grid.innerHTML = pageItems.map(createCard).join("");
    }

    if (els.empty) {
      els.empty.hidden = pageItems.length > 0;
    }

    if (els.pageState) {
      els.pageState.textContent = `第 ${state.currentPage} 页`;
    }

    renderPagination(totalPages);
    setPageInUrl(state.currentPage);
  }

  async function loadData() {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Unable to load ${DATA_URL}`);
    }

    const data = await response.json();
    state.data = data;
    state.currentPage = Math.max(1, getPageFromUrl());

    if (els.totalCount) {
      els.totalCount.textContent = `${data.count} 篇`;
    }

    if (els.lastUpdated) {
      els.lastUpdated.textContent = formatDateTime(data.generatedAt);
    }

    if (els.sourceState) {
      els.sourceState.textContent =
        data.translation?.generatedCount || data.bilingualSummary?.bilingualCount
          ? "中英正文已就绪"
          : "英文正文";
    }

    if (els.heroTitle) {
      els.heroTitle.textContent = "Marathon 新闻归档";
    }

    if (els.heroDescription) {
      els.heroDescription.textContent =
        "这里已经载入 Bungie 当前可抓取到的全部 Marathon 新闻。文章详情页默认显示中文内容，并可在正文中切换中英文阅读。";
    }

    renderFeature(data.items[0]);
    renderPage();
  }

  function bindEvents() {
    if (els.paginationPrev) {
      els.paginationPrev.addEventListener("click", () => {
        if (state.currentPage <= 1) return;
        state.currentPage -= 1;
        renderPage();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    if (els.paginationNext) {
      els.paginationNext.addEventListener("click", () => {
        const itemsPerPage = state.data?.itemsPerPage || 8;
        const totalPages = Math.max(
          1,
          Math.ceil((state.data?.items?.length || 0) / itemsPerPage)
        );
        if (state.currentPage >= totalPages) return;
        state.currentPage += 1;
        renderPage();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    if (els.paginationPages) {
      els.paginationPages.addEventListener("click", (event) => {
        const target = event.target.closest("[data-page]");
        if (!target) return;
        const page = Number.parseInt(target.getAttribute("data-page"), 10);
        if (!Number.isInteger(page)) return;
        state.currentPage = page;
        renderPage();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }

  bindEvents();

  loadData().catch((error) => {
    console.error(error);
    if (els.empty) {
      els.empty.hidden = false;
      els.empty.innerHTML =
        "<strong>无法载入新闻归档。</strong><p>请在数据同步完成后刷新重试。</p>";
    }
  });
})();
