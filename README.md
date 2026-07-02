# Marathon Archive

当前项目是一个基于 `Hexo + NexT` 的静态站点仓库，主要内容包括：

- **首页**：`source/index.html`（自定义深色主题，不经过 Hexo 渲染）
- **百科**：`source/marathon-lore/`（独立 SPA 应用）
- **新闻聚合**：`source/news/`（从 Bungie ContentStack 同步，50 篇中英双语文章）
- **阵营页面**：`source/factions/`（6 大阵营数据 + 可视化网格）
- **关于页面**：`source/about/`

当前线上域名：
- `https://marathon.uesc.top`

当前发布方式：
- 源码分支：`master`
- 构建方式：GitHub Actions
- 发布目标：GitHub Pages

## 项目结构

```
├── .github/workflows/pages.yml   # GitHub Pages 自动发布工作流
├── _config.yml                    # Hexo 主配置
├── package.json                   # 项目脚本与依赖
│
├── source/                        # 站点源码与静态资源
│   ├── index.html                 # 自定义首页（~515 行，深空主题）
│   ├── CNAME                      # 自定义域名
│   ├── about/                     # 关于页面
│   ├── marathon-lore/             # 百科主应用（SPA）
│   │   ├── assets/                #   JS、CSS、字体、图片、音频
│   │   └── content/               #   百科文档、模块数据
│   ├── news/                      # 新闻聚合模块
│   │   ├── index.html             #   页面入口
│   │   ├── news-list.js           #   前端列表渲染
│   │   ├── news.css               #   新闻样式
│   │   ├── data/                  #   同步产物（JSON + 同步报告）
│   │   └── articles/              #   50 篇文章详情页
│   ├── factions/                  # 阵营数据
│   │   ├── index.html             #   页面入口
│   │   ├── data.json              #   阵营目录
│   │   └── factions/              #   6 个阵营 JSON + 模板
│   ├── fonts/                     # Maratype.otf 字体
│   ├── images/                    # 背景图、favicon、海报
│   └── _data/                     # Hexo 数据文件（head.njk / body-end.njk / styles.styl）
│
├── scripts/                       # Hexo 构建辅助脚本
│   ├── force-root-home.js         #   强制使用自定义首页覆盖 Hexo 默认首页
│   └── sync-log-meta-from-bodyfile.js  # 百科收藏品语音元数据同步
│
├── tools/                         # 本地开发与 CI 辅助脚本
│   ├── serve-public.py            #   本地静态预览服务器
│   ├── check-pages-size.mjs       #   CI 中检查 Pages 产物大小（上限 900MB）
│   └── convert-png-to-webp.mjs    #   PNG → WebP 图片格式转换
│
├── public/                        # Hexo 构建产物（已提交，供本地预览）
├── scaffolds/                     # Hexo 模板（draft / page / post）
└── themes/                        # Hexo 主题目录
```

## 本地开发

首次安装依赖：

```powershell
npm.cmd install
```

启动 Hexo 本地预览（支持热更新）：

```powershell
npm.cmd run server
```

默认访问地址：
- `http://localhost:4000`

按生产方式重新构建并预览：

```powershell
npm.cmd run preview
```

如果只想生成静态文件：

```powershell
npm.cmd run clean
npm.cmd run build
```

生成结果输出到：
- `public/`

如果已经完成构建，只想单独启动静态预览：

```powershell
npm.cmd run serve:public
```

## 当前可用脚本

```powershell
npm.cmd run clean              # 清理 Hexo 数据库和 public/
npm.cmd run build              # 执行 hexo generate
npm.cmd run server             # 启动 Hexo 本地预览服务（热更新）
npm.cmd run preview            # 重新构建后用静态服务器预览
npm.cmd run serve:public       # 直接预览当前 public/ 构建产物
npm.cmd run deploy             # 等同 npm run build（不再使用 hexo deploy）
npm.cmd run check:pages-size   # 检查 public/ 产物大小
npm.cmd run convert:png-webp   # 将 source/images/ 中的 PNG 转为 WebP
```

> 不再建议手动运行 `python -m http.server ... --directory public`，因为相对路径会受当前工作目录影响，容易出现 404。
> 优先使用 `npm.cmd run preview` 或 `npm.cmd run serve:public`（二者通过 `tools/serve-public.py` 自动定位 `public/` 目录，不受工作目录影响）。

## 正确发布流程

当前项目已切换到 **GitHub Actions** 自动发布，日常流程：

1. 在本地修改源码
2. 本地执行构建检查
3. 提交到 `master`
4. 推送到 GitHub
5. 等待 GitHub Actions 自动部署

实际命令：

```powershell
npm.cmd run build
git add .
git commit -m "提交说明"
git push origin master
```

推送后 GitHub Actions 会自动执行：

1. `npm ci`（缓存加速）
2. `npm run build`（`hexo generate`）
3. `npm run check:pages-size`（检查产物大小）
4. 上传 `public/` 到 Pages artifact
5. 部署到 GitHub Pages

## GitHub Pages 配置

仓库需要保持以下设置：

- `Settings → Pages → Source = GitHub Actions`
- 自定义域名：`marathon.uesc.top`

工作流文件位置：
- `.github/workflows/pages.yml`

## 新闻系统说明

新闻从 Bungie 官方 ContentStack API 同步，支持中英双语。同步工具维护在独立仓库：

`C:\codes\marathon_tools\news`

同步命令：

```powershell
cd C:\codes\marathon_tools\news
npm run generate:myblog-news
```

当前同步状态：50 篇文章（40 篇双语 + 10 篇仅英文）。详情见 `source/news/README.md`。

## 注意事项

- `public/` 是构建产物，不是源码，但已提交以便本地预览
- `node_modules/` 不应提交
- 自定义域名变更时，需要同步检查：
  - GitHub Pages 自定义域名设置
  - `_config.yml` 中的 `url` 字段
  - `source/CNAME` 文件

## 常见问题

### 1. 为什么 `git push` 后没有新的 Action？

如果 Git 提示：

```powershell
Everything up-to-date
```

说明没有新的提交被推上去，因此不会触发新的 Actions 运行。

### 2. 为什么本地启动静态预览会 404？

旧命令里的 `python -m http.server 4000 --directory public` 使用相对路径。如果不是在仓库根目录启动，就会找不到构建目录。

优先使用：

```powershell
npm.cmd run preview
```

或者：

```powershell
npm.cmd run build
npm.cmd run serve:public
```

`tools/serve-public.py` 会自动从脚本位置定位仓库根目录，不受启动目录影响。

### 3. 为什么本地启动时报 `Cannot find module 'hexo'`？

通常说明当前目录没有安装依赖，执行：

```powershell
npm.cmd install
```

### 4. 新闻抓取失败怎么排查？

新闻数据由独立工具仓库 `C:\codes\marathon_tools\news` 维护。检查：

- OpenAI API 配置是否正常（用于自动翻译英文内容）
- 本地兜底翻译运行时 `C:\codes\marathon_tools\trans` 是否可用
- 详见 `source/news/README.md`
