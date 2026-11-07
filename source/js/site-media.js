// Decorative media never downloads on phones, reduced-motion or data-saving connections.
(() => {
  const videos = [...document.querySelectorAll('video[data-background-video]')];
  const mobile = matchMedia('(max-width: 900px), (pointer: coarse)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  function sync() {
    const disabled = mobile.matches || reduced.matches || connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '');
    for (const video of videos) {
      if (disabled) {
        video.pause();
        if (video.dataset.loaded) {
          video.querySelectorAll('source').forEach(source => source.removeAttribute('src'));
          video.removeAttribute('src');
          delete video.dataset.loaded;
          video.load();
        }
        continue;
      }
      if (document.hidden) { video.pause(); continue; }
      if (!video.dataset.loaded) {
        video.querySelectorAll('source[data-src]').forEach(source => { source.src = source.dataset.src; });
        if (video.dataset.src) video.src = video.dataset.src;
        video.dataset.loaded = 'true';
        video.load();
      }
      video.play().catch(() => {});
    }
  }
  mobile.addEventListener('change', sync);
  reduced.addEventListener('change', sync);
  connection?.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  // Let the primary content render before starting desktop decoration.
  if ('requestIdleCallback' in window) requestIdleCallback(sync, { timeout: 2000 });
  else setTimeout(sync, 500);
})();
