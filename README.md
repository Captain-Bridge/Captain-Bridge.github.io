# 《失落星船：马拉松》中文站

> Escape Will Make Me God

《失落星船：马拉松》（Marathon）中文粉丝站，汇聚百科、新闻、互动地图、阵营与经典终端文本，一站探索 Marathon 的世界。

**线上地址**：<https://marathon.uesc.top>

## 站点模块

- **首页**（`/`）：深色主题导航页，聚合全站入口
- **百科**（`/marathon-lore/`）：按分类加载的交互应用，含收藏品、武器、阵营、赛季等文档；`/marathon-lore/entries/` 提供可独立阅读、分享和索引的条目目录
- **互动地图**（`/map/perimeter/`）：5 张可切换地图（Cryo Archive、Dire Marsh、Dire Marsh Night、Outpost、Perimeter），支持图标标注
- **新闻**（`/news/`）：从 Bungie 官方源同步的新闻归档，当前 72 篇，支持中英文阅读
- **商店**（`/store/`）：藏品和组合包目录，与百科共用渲染器
- **阵营**（`/factions/`）：6 大阵营（赛博艾克米、纽卡洛里、特莱克斯、米达、阿拉克尼、关口）数据与可视化网格
- **经典终端**（`/Classic-marathon/`）：经典 Marathon 三部曲关卡终端文本（M1 / M2 / M3）
- **社区内容**（`/about/`）：站点介绍与社区信息

## 技术栈

纯静态站点，无前端框架，主要由自定义 Node 构建脚本产出：

- 构建：`node scripts/build-static.mjs`（详见 `package.json`）
- 部署：GitHub Actions（`.github/workflows/pages.yml`）→ GitHub Pages
- 自定义域名：`marathon.uesc.top`（`source/CNAME`）
- 本地预览：`npm run preview` / `npm run serve:public`

## 开发与验证

```sh
npm ci
npm run check:content
npm run build
npm test
npm run check:pages-size
```

构建前后都会检查 JSON 中站内资源引用的存在性与大小写，避免 Windows 本地可用而 Linux 部署失败。拉取请求和正式部署均运行构建检查；部署产物不直接编辑。

浏览器检查需要本机安装 Chromium、Chrome 或 Edge，无需额外 npm 包。分别启动预览服务和检查命令：

```sh
python tools/serve-public.py --port 4173
npm run check:browser
```

默认检查 320、360、390、768、844 和 1440 像素宽度（844 为手机横屏），覆盖主要入口、新闻详情、百科深链接、标签、商店组合包、地图和经典终端，并验证分页返回、加载失败重试、标签搜索、地图拖动与双指缩放，以及禁用 JavaScript 后的独立条目阅读。截图及报告保存在 `artifacts/browser-check/`。可通过 `PREVIEW_URL` 指定服务地址，通过 `CHROME_PATH` 指定浏览器程序。浏览器模拟不能替代 iOS Safari / Android 真机验收。

## 内容与性能约定

- 新闻源仍维护在 `source/news/data/marathon-news.json`；构建生成列表专用的 `news-index.json`，浏览列表时不下载完整正文。
- 百科只加载当前分类；标签页使用构建生成的压缩索引。新增内容后重新构建，即可更新标签、静态条目页和 sitemap。
- 百科与商店共用 `source/js/archive-app.js`、数据及 Markdown 模块，以及 `source/css/archive.css`。原来的脚本和样式路径保留为兼容入口。
- `source/css/mobile.css` 在页面样式之后加载，负责手机导航、内容滚动、触控尺寸和地图筛选区。背景视频通过 `data-src` 延迟加载，手机、触控设备、减少动态效果或节流模式下不下载。
- JS/CSS 版本号由构建内容自动生成，替代手工日期版本号。sitemap 不再将构建时间当作页面修改日期。
- 经典终端图片优先使用无损 WebP。BMP 原件保留在源码中；存在 WebP 副本时，构建不再复制 BMP。重新生成终端目录后，可安装 Pillow 并运行 `python tools/convert-classic-bmp.py` 更新图片和引用。
- 缺失正文的「生物毒素分离注射器」目前展示条目摘要；相邻的 `biotoxic_disinjector_icon.md` 内容属于其他条目，未用作替代。补齐正确正文后再设置 `bodyFile`。

仓库中的 `_config*.yml`、`themes/` 及部分旧 Hexo 脚本用于历史参考，当前静态构建不读取它们。原始归档 ZIP 保留供资料维护使用。
