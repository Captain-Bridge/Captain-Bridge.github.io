(() => {
  document.documentElement.classList.add('js-enabled');
  const toggle = document.querySelector('.site-menu-toggle');
  const header = document.querySelector('.site-header');
  const close = () => {
    header?.classList.remove('is-open');
    toggle?.setAttribute('aria-expanded', 'false');
  };
  toggle?.addEventListener('click', () => {
    const opened = header.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(opened));
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && header?.classList.contains('is-open')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
      toggle.focus();
    }
  }, true);
  matchMedia('(min-width: 1001px)').addEventListener('change', close);
  // Remote news media can be blocked or unavailable; retain a useful local cover.
  function fallbackImage(image) {
    if (!image.matches('.home-news-image img, .feature-media img, .article-thumb img, .story-figure img') || image.dataset.fallbackApplied) return;
    image.dataset.fallbackApplied = 'true';
    image.src = '/images/archive-hero-800.webp';
  }
  document.addEventListener('error', event => {
    if (event.target instanceof HTMLImageElement) fallbackImage(event.target);
  }, true);
  document.querySelectorAll('.home-news-image img, .story-figure img').forEach(image => {
    if (image.complete && !image.naturalWidth) fallbackImage(image);
  });
  if (matchMedia('(pointer: coarse)').matches) {
    const hint = document.querySelector('.map-hint span');
    if (hint) hint.textContent = '双指缩放';
  }
})();
