# Marathon Archive

基于 `Hexo + NexT` 的静态站点仓库，主要内容包括：

- **首页**：`source/index.html`（自定义深色主题，不经过 Hexo 渲染）
- **百科**：`source/marathon-lore/`（独立 SPA 应用，含收藏品语音、模块文档）
- **交互式地图**：`source/map/`（瓦片地图引擎，支持标注与多地图切换）
- **新闻聚合**：`source/news/`（从 Bungie ContentStack 同步，50 篇中英双语文章）
- **阵营页面**：`source/factions/`（6 大阵营数据 + 可视化网格）
- **关于页面**：`source/about/`

线上域名：`https://marathon.uesc.top`

发布方式：

- 源码分支：`master`
- 构建方式：GitHub Actions
- 发布目标：GitHub Pages

## 项目结构

```
├── .github/workflows/pages.yml     # GitHub Pages 自动发布工作流
├── _config.yml                      # Hexo 主配置
├── package.json                     # 项目脚本与依赖
│
├── source/                          # 站点源码与静态资源
│   ├── index.html                   # 自定义首页（深空主题，不经过 Hexo 渲染）
│   ├── CNAME                        # 自定义域名
│   ├── about/                       # 关于页面
│   ├── marathon-lore/               # 百科主应用（SPA）
│   │   ├── assets/                  #   JS、CSS、字体、图片、音频
│   │   └── content/                 #   百科文档、模块数据
│   ├── map/                         # 交互式地图
│   │   ├── index.html               #   页面入口
│   │   ├── map-engine.js            #   地图引擎
│   │   ├── map.css                  #   地图样式
│   │   ├── assets/                  #   图标等静态资源
│   │   ├── data/                    #   地图 Schema 与数据
│   │   └── tiles/                   #   瓦片图
│   ├── news/                        # 新闻聚合模块
│   │   ├── index.html               #   页面入口
│   │   ├── news-list.js             #   前端列表渲染
│   │   ├── news.css                 #   新闻样式
│   │   ├── data/                    #   同步产物（JSON + 同步报告）
│   │   └── articles/                #   文章详情页
│   ├── factions/                    # 阵营数据
│   │   ├── index.html               #   页面入口
│   │   ├── data.json                #   阵营目录
│   │   └── factions/                #   各阵营 JSON
│   ├── fonts/                       # Maratype.otf 字体
│   ├── images/                      # 背景图、favicon、海报
│   └── _data/                       # Hexo 数据文件（head.njk / body-end.njk / styles.styl）
│
├── scripts/                         # Hexo 构建辅助脚本
│   ├── force-root-home.js           #   强制使用自定义首页覆盖 Hexo 默认首页
│   └── sync-log-meta-from-bodyfile.js  # 百科收藏品语音元数据同步
│
├── tools/                           # 本地开发与 CI 辅助脚本
│   ├── serve-public.py              #   本地静态预览服务器（自动定位仓库根目录）
│   ├── check-pages-size.mjs         #   CI 中检查 Pages 产物大小（上限 900MB）
│   ├── convert-png-to-webp.mjs      #   PNG → WebP 图片格式转换
│   ├── extract_map_icons.py         #   地图图标提取
│   ├── generate-map-variants.py     #   地图瓦片变体生成
│   └── map-annotator.html           #   地图标注工具
│
├── artifacts/                       # 辅助产物（音频索引、图标检测结果等，不入构建）
├── public/                          # Hexo 构建产物（已提交，供本地预览）
├── scaffolds/                       # Hexo 模板（draft / page / post）
└── themes/                          # Hexo 主题目录
```

## 本地开发

首次安装依赖：

```powershell
npm.cmd install
```

### 常用命令

| 命令 | 作用 |
|------|------|
| `npm.cmd run server` | 启动 Hexo 本地预览（热更新，默认 `http://localhost:4000`） |
| `npm.cmd run preview` | 重新构建后用静态服务器预览 |
| `npm.cmd run build` | 生成静态文件到 `public/` |
| `npm.cmd run clean` | 清理 Hexo 缓存和 `public/` |
| `npm.cmd run serve:public` | 直接预览当前 `public/`（不重新构建） |
| `npm.cmd run check:pages-size` | 检查 `public/` 产物大小 |
| `npm.cmd run convert:png-webp` | 将 `source/images/` 中的 PNG 转为 WebP |

> 不再建议手动运行 `python -m http.server ... --directory public`，因为相对路径受当前工作目录影响，容易出现 404。优先使用 `npm.cmd run preview` 或 `npm.cmd run serve:public`（二者通过 `tools/serve-public.py` 自动定位 `public/` 目录）。

## 发布流程

项目通过 GitHub Actions 自动部署，日常流程：

1. 本地修改源码
2. 本地构建检查：`npm.cmd run build`
3. 提交并推送：`git add . && git commit -m "..." && git push origin master`
4. 等待 GitHub Actions 自动构建部署

Actions 工作流（`.github/workflows/pages.yml`）自动执行：

1. `npm ci`（缓存加速）
2. `npm run build`
3. `npm run check:pages-size`
4. 上传 `public/` 到 Pages artifact
5. 部署到 GitHub Pages

## GitHub Pages 配置

仓库设置要求：

- `Settings → Pages → Source = GitHub Actions`
- 自定义域名：`marathon.uesc.top`

域名变更时需要同步检查：

- GitHub Pages 自定义域名设置
- `_config.yml` 中的 `url` 字段
- `source/CNAME` 文件

## 各模块说明

### 新闻系统

新闻从 Bungie 官方 ContentStack API 同步，支持中英双语。同步工具维护在独立仓库 `C:\codes\marathon_tools\news`，生成命令：

```powershell
cd C:\codes\marathon_tools\news
npm run generate:myblog-news
```

当前同步状态：50 篇文章（40 篇双语 + 10 篇仅英文）。详见 `source/news/README.md`。

### 阵营页面

6 大阵营数据以 JSON 驱动，前端通过 4×6 网格渲染节点和连线。详见 `source/factions/README.md`。

### 交互式地图

基于瓦片的地图引擎，支持多地图切换、图标标注、Schema 驱动的地图数据。地图瓦片和标注数据通过 `tools/` 下的 Python 脚本生成。

### 百科（Marathon Lore）

独立 SPA 应用，包含收藏品语音回放、模块化文档浏览。内容以 Markdown 源文件维护在 `source/marathon-lore/content/`，构建时由前端 `app.js` 动态加载。

## 常见问题

### 推送后没有触发新的 Actions

如果 `git push` 后提示 `Everything up-to-date`，说明没有新的提交被推上去，不会触发 Action 运行。

### 本地静态预览 404

使用 `npm.cmd run preview` 或 `npm.cmd run serve:public`，不要手动指定相对路径的 `python -m http.server`。

### 启动时报 `Cannot find module 'hexo'`

当前目录未安装依赖，执行 `npm.cmd install`。

### 新闻抓取失败

新闻数据由独立工具仓库维护，检查：

- OpenAI API 配置（用于自动翻译）
- 本地兜底翻译运行时 `C:\codes\marathon_tools\trans`
- 详见 `source/news/README.md`
