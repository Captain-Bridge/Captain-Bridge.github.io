# Marathon News Artifacts

`myblog` 目录下的 `source/news/` 现在只存放前端页面和生成产物，不再承担抓取、对齐、翻译或同步脚本。

## 产物来源

所有自动维护逻辑统一放在：

`C:\codes\marathon_tools\news`

生成 `myblog` 新闻产物的主命令是：

```powershell
cd C:\codes\marathon_tools\news
npm run generate:myblog-news
```

默认情况下，该命令要求最终产物不能存在“只有英文正文”的新闻。如果已经配置好翻译接口环境变量，例如 `OPENAI_API_KEY`、`OPENAI_MODEL`、`OPENAI_BASE_URL`，该命令会：

1. 抓取 Bungie Marathon News 英文与官方简中
2. 对齐中英新闻
3. 用官方双语样本补强术语表
4. 为 Bungie 没有提供简中的新闻生成中文正文
5. 将最终产物写入当前目录下的 `myblog/source/news/`

如果 Bungie 官方没有提供某篇新闻的简中正文，维护脚本会自动调用站内翻译链路补出一份中文正文，再一起写入产物。

当 OpenAI 接口不可用时，维护脚本会继续尝试使用：

`C:\codes\marathon_tools\trans`

下的本地翻译运行时作为兜底能力。

如果翻译能力不可用，而且仍有英文独占文章，`npm run generate:myblog-news` 会直接报错并停止生成，避免把不完整的双语产物写入站点。

只有在调试时显式传入 `--allow-english-only`，才允许继续产出带英文独占文章的版本。

## 当前目录中的内容

- 页面入口: `index.html`
- 列表页脚本: `news-list.js`
- 样式: `news.css`
- 新闻数据产物: `data/marathon-news.json`
- 同步报告产物: `data/marathon-news.sync-report.json`
- 详情页产物: `articles/`

## 站内双语规则

- 标题、摘要、发布时间和外围界面保持现状
- 只有详情页正文参与中英文切换
- 默认维护目标是不保留英文独占正文；缺失官方中文时会自动补翻
- 只有调试时显式允许英文独占产物，详情页才会保留英文正文并禁用中文切换按钮
