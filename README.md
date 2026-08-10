# 《失落星船：马拉松》中文站

> Escape Will Make Me God

《失落星船：马拉松》（Marathon）中文粉丝站，汇聚百科、新闻、互动地图、阵营与经典终端文本，一站探索 Marathon 的世界。

**线上地址**：<https://marathon.uesc.top>

## 站点模块

- **首页**（`/`）：深色主题导航页，聚合全站入口
- **百科**（`/marathon-lore/`）：独立 SPA 应用，含收藏品、武器、阵营、赛季等文档
- **互动地图**（`/map/perimeter/`）：5 张可切换地图（Cryo Archive、Dire Marsh、Dire Marsh Night、Outpost、Perimeter），支持图标标注
- **新闻**（`/news/`）：从 Bungie 官方源同步的 56 篇中英双语新闻
- **阵营**（`/factions/`）：6 大阵营（赛博艾克米、纽卡洛里、特莱克斯、米达、阿拉克尼、关口）数据与可视化网格
- **经典终端**（`/Classic-marathon/`）：经典 Marathon 三部曲关卡终端文本（M1 / M2）
- **社区内容**（`/about/`）：站点介绍与社区信息

## 技术栈

纯静态站点，无前端框架，主要由自定义 Node 构建脚本产出：

- 构建：`node scripts/build-static.mjs`（详见 `package.json`）
- 部署：GitHub Actions（`.github/workflows/pages.yml`）→ GitHub Pages
- 自定义域名：`marathon.uesc.top`（`source/CNAME`）
- 本地预览：`npm run preview` / `npm run serve:public`
