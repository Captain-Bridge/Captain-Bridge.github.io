# 内容协作指南

## 目标
这个仓库面向小团队内容协作：大家主要负责补充文本、图片和条目数据，代码改动尽量集中由维护者处理。

## 推荐分工
- 内容作者：编辑 `source/marathon-lore/content/docs/**` 下的 Markdown、TXT、图片
- 结构维护者：编辑 `source/marathon-lore/content/modules/**` 和前端渲染逻辑
- 发布维护者：负责 build、deploy 和 GitHub Pages 同步

## 内容放置
- 文本正文：`source/marathon-lore/content/docs/...`
- 条目结构：`source/marathon-lore/content/modules/*.json`
- 图片素材：和对应正文放在同目录或同节点目录下
- 首页/关于页等静态页：`source/*.html`

## 提交建议
- 每次只改一个主题或一个节点
- 图文一起改，避免正文和配置脱节
- 提交信息尽量清晰，例如：
  - `Add cryo archive entries`
  - `Update world activity docs`

## 注意事项
- 不要手动提交 `public/`、`node_modules/`、`.deploy_git/`
- 如果只是改内容，优先不要碰 JS/CSS
- 新增条目前先确认 `bodyFile`、`image`、`iconImage` 路径是否一致

## 协作流程
1. 新建内容分支
2. 修改内容文件
3. 本地 build 检查
4. 提交并发起合并

