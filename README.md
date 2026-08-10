# 《失落星船：马拉松》中文站

> Escape Will Make Me God

《失落星船：马拉松》中文粉丝站，一站探索《Marathon》的世界——百科、新闻、阵营、互动地图与经典终端。

**线上地址**：<https://marathon.uesc.top>

## 站点模块

- **百科**（`source/marathon-lore/`）：独立 SPA 应用，含收藏品语音回放与模块化文档浏览
- **交互式地图**（`source/map/`）：瓦片地图引擎，支持多地图切换与图标标注
- **新闻聚合**（`source/news/`）：从 Bungie ContentStack 同步的中英双语新闻
- **阵营页面**（`source/factions/`）：6 大阵营数据与可视化网格
- **经典终端**（`source/Classic-marathon/`）：经典《Marathon》关卡终端文本
- **关于**（`source/about/`）：站点介绍

## 技术栈

基于 Hexo 与自定义静态构建脚本，纯静态站点，无前端框架。

- 源码分支：`master`
- 构建与部署：GitHub Actions → GitHub Pages
- 自定义域名：`marathon.uesc.top`（`source/CNAME`）
