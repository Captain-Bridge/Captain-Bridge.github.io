# Marathon Archive

当前项目是一个基于 `Hexo + NexT` 的静态站点仓库，主内容包括：

- 首页 `source/index.html`
- 百科页面 `source/marathon-lore/`
- 关于页 `source/about/`
- 阵营页 `source/factions/`

当前线上域名：

- `https://cnmarathon.cn`

当前发布方式：

- 源码分支：`master`
- 构建方式：GitHub Actions
- 发布目标：GitHub Pages

## 项目结构

- `source/`：站点源码与静态资源
- `source/marathon-lore/`：百科主应用
- `scripts/`：Hexo 构建辅助脚本
- `.github/workflows/pages.yml`：GitHub Pages 自动发布工作流
- `_config.yml`：Hexo 主配置
- `package.json`：项目脚本与依赖

## 本地开发

首次安装依赖：

```powershell
npm.cmd install
```

启动本地预览：

```powershell
npm.cmd run server
```

默认访问地址：

- `http://localhost:4000`

如果只想生成静态文件：

```powershell
npm.cmd run clean
npm.cmd run build
```

生成结果会输出到：

- `public/`

## 当前可用脚本

```powershell
npm.cmd run clean
npm.cmd run build
npm.cmd run server
```

脚本含义：

- `clean`：清理 Hexo 数据库和 `public/`
- `build`：执行 `hexo generate`
- `server`：启动 Hexo 本地预览服务

说明：

- `npm.cmd run deploy` 当前只等价于 `npm.cmd run build`
- 现在不再使用 `hexo deploy`

## 正确发布流程

当前项目已经切换到 GitHub Actions 发布，所以日常发布流程是：

1. 在本地修改源码
2. 本地执行构建检查
3. 提交到 `master`
4. 推送到 GitHub
5. 等待 GitHub Actions 自动部署

实际命令：

```powershell
npm.cmd run build
git add .
git commit -m "你的提交说明"
git push origin master
```

推送后，GitHub 会自动执行：

1. `npm ci`
2. `npm run build`
3. 上传 `public/`
4. 发布到 GitHub Pages

## GitHub Pages 配置

仓库需要保持以下设置：

- `Settings -> Pages -> Source = GitHub Actions`
- 自定义域名：`cnmarathon.cn`

工作流文件位置：

- `.github/workflows/pages.yml`

## 不要再使用的旧流程

以下方式已经不是当前版本的正确发布方式：

- 不要再手动维护 `.deploy_git/`
- 不要再把 `public/` 当源码提交
- 不要再使用旧的 `hexo deploy`
- 不要再依赖发布分支推送静态文件

## 注意事项

- `public/` 是构建产物，不是源码
- `node_modules/` 不应提交
- 自定义域名变更时，需要同时检查：
  - GitHub Pages Custom domain
  - `_config.yml` 中的 `url`
  - `source/CNAME`

## 常见问题

### 1. 为什么 `git push` 后没有新的 Action？

如果 Git 提示：

```powershell
Everything up-to-date
```

说明没有新的提交被推上去，因此不会触发新的 Actions 运行。

### 2. 为什么本地能看，线上没更新？

优先检查：

1. 是否真的有新 commit
2. 是否已经 `git push origin master`
3. GitHub Actions 是否运行成功
4. Pages 是否仍然设置为 `GitHub Actions`
5. 浏览器是否需要强制刷新缓存

### 3. 为什么本地启动时报 `Cannot find module 'hexo'`？

通常说明当前目录没有安装依赖，执行：

```powershell
npm.cmd install
```

## 当前维护建议

以后只维护这一个源码仓库即可：

- 当前工作目录：`C:\codes\myblog`

推荐日常流程：

```powershell
cd C:\codes\myblog
npm.cmd run build
git add .
git commit -m "更新说明"
git push origin master
```
