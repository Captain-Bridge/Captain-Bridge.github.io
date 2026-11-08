const links = [
  ['/', '首页'], ['/marathon-lore/', '百科'], ['/news/', '最近消息'],
  ['/map/perimeter/', '互动地图'], ['/factions/', '阵营'], ['/store/', '商店'],
  ['/Classic-marathon/', '经典终端'], ['/about/', '社区内容'],
];
const pages = {
  lore: '百科', news: '最近消息', map: '互动地图',
  factions: '阵营', store: '商店', classic: '经典马拉松终端',
};
export function applySiteShell(html, route) {
  const section = route === '/' ? 'home' : route.startsWith('/marathon-lore/') ? 'lore' : route.startsWith('/news/') ? 'news' : route.startsWith('/map/') ? 'map' : route.startsWith('/Classic-marathon/') ? 'classic' : route.split('/')[1];
  const isArticle = route.startsWith('/news/articles/') || route.startsWith('/marathon-lore/entry/');
  const active = href => href === '/' ? route === '/' : href.startsWith('/map/') ? section === 'map' : route.startsWith(href);
  const header = `<a class="skip-link" href="#site-main">跳至主要内容</a>
<header class="site-header">
  <a class="site-brand" href="/" aria-label="Marathon 中文站首页"><img src="/marathon-lore/assets/images/icons/marathon-brand-mark.webp" alt="" width="34" height="34"><span><strong>MARATHON</strong><small>《失落星船：马拉松》中文站</small></span></a>
  <button class="site-menu-toggle" type="button" aria-expanded="false" aria-controls="site-navigation"><span>导航</span><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg></button>
  <nav id="site-navigation" class="site-navigation" aria-label="站点导航">${links.map(([href, label]) => `<a href="${href}"${active(href) ? ' class="is-current" aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
</header>`;
  const footer = `<footer class="archive-footer"><a class="footer-wordmark" href="/">MARATHON</a><div><p>天际的某处，他们在等待。</p></div><a class="footer-contact" href="/about/">社区内容 <span aria-hidden="true">↗</span></a></footer>`;
  let intro = '';
  if (pages[section] && !isArticle && route !== '/map/' && route !== '/marathon-lore/entries/') {
    const title = section === 'map'
      ? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.split(' - ')[0] || pages.map
      : pages[section];
    intro = `<section class="page-intro${['map', 'factions', 'classic'].includes(section) ? ' page-intro-compact' : ''}" aria-labelledby="page-title"><h1 id="page-title">${title}</h1></section>`;
  }
  html = html.replace(/<nav\b[^>]*class=["']community-nav["'][^>]*>[\s\S]*?<\/nav>/gi, '');
  // Decorative full-page videos belong to the old interface; game content and
  // video embeds inside articles are retained.
  if (section !== 'home') html = html.replace(/<video\b[^>]*class=["'][^"']*(?:page-bg-video|viewport-bg-video)[^"']*["'][^>]*>[\s\S]*?<\/video>/gi, '');
  html = html.replace(/<script\b[^>]*src=["']\/js\/community-timestamp\.js[^"']*["'][^>]*><\/script>/gi, '');
  html = html.replace(/<body([^>]*)>/i, (_, attributes) => {
    const classes = attributes.match(/class=["']([^"']*)["']/)?.[1] || '';
    const cleaned = attributes.replace(/\sclass=["'][^"']*["']/i, '');
    return `<body${cleaned} class="${classes} site-design site-${section}${isArticle ? ' site-article' : ''}">${header}${intro}`;
  });
  html = html.replace(/<main\b([^>]*)>/i, (_, attributes) => /\bid=/.test(attributes) ? `<main${attributes} tabindex="-1">` : `<main id="site-main"${attributes} tabindex="-1">`);
  // Encyclopedia main already has an application ID used by legacy scripts.
  if (html.includes('id="lore-app"')) html = html.replace('href="#site-main"', 'href="#lore-app"');
  html = html.replace('</body>', `${footer}\n</body>`);
  html = html.replace('</head>', '<link rel="stylesheet" href="/css/site.css">\n<script src="/js/site-ui.js" defer></script>\n</head>');
  return html;
}
