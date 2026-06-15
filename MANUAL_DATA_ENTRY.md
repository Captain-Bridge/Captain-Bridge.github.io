# 手动录入素材说明（最新版）

```
启动命令
npm.cmd run clean; npm.cmd run build; python -m http.server 4000 --directory public
```

这份文档对应的是**当前项目的真实结构**。

现在这个项目已经不是“把 Lore 正文都写进 `data.js` / `app.js`”的模式了，而是：

- 首页：手写静态页面
- `马拉松Lore`：独立的多级资料界面
- Lore 结构：`JSON` 清单管理
- Lore 正文：独立 `Markdown` 文件管理
- Lore 图片：独立图片文件管理

也就是说，你以后维护素材时，**主要操作的是 JSON、Markdown 和图片文件**，而不是改页面逻辑。

---

## 1. 你现在真正会手动改的文件

### 首页相关

- 首页页面：`source/index.html`
- 首页公共图片目录：`source/images/`
- 首页背景 GIF：`source/images/marathon-home-full.gif`

### Lore 相关

- Lore 页面骨架：`source/marathon-lore/index.html`
- Lore 样式文件：`source/marathon-lore/assets/style.css`
- Lore 页面逻辑：`source/marathon-lore/assets/app.js`
- Lore 图片目录：`source/marathon-lore/assets/images/`
- Lore 结构清单：`source/marathon-lore/content/index.json`
- Lore 正文目录：`source/marathon-lore/content/docs/`

---

## 2. 现在推荐的维护方式

现在 Lore 的维护分成三层：

### 2.1 结构层

改这个文件：
- `source/marathon-lore/content/index.json`

它负责：
- 一级分类
- 二级节点
- 四级内容节点
- A / B 页面类型
- 摘要
- 标签
- 图片路径
- 日志目录
- 正文文件路径

### 2.2 正文层

改这个目录：
- `source/marathon-lore/content/docs/`

它负责：
- 真正的 Lore 正文
- 日志全文
- 档案正文
- 武器说明
- 世界观长文

这些正文都是独立 `.md` 文件。

### 2.3 图片层

改这个目录：
- `source/marathon-lore/assets/images/`

它负责：
- A 类页面左图
- B 类页面右图
- 武器图
- 外壳图
- 插图
- 图标素材

---

## 3. 一般情况下你不需要改什么

如果你只是录入资料，通常**不要改**：

- `source/marathon-lore/assets/app.js`
- `source/marathon-lore/assets/style.css`
- `source/marathon-lore/index.html`

除非你要改：
- 页面交互逻辑
- 布局
- 配色
- A / B 界面结构

---

## 4. 首页素材放哪里

### 4.1 首页文字

首页上的文案直接写在：
- `source/index.html`

包括：
- 浏览器标题
- 首页主标题
- 首页副标题
- 首页说明文字
- 首页入口卡片标题
- 首页入口卡片描述

### 4.2 首页图片

首页公共图片统一放在：
- `source/images/`

当前典型素材：
- `source/images/marathon-home-full.gif`

如果以后更换首页背景：
1. 把新文件放进 `source/images/`
2. 在 `source/index.html` 里修改引用路径

---

## 5. Lore 图片素材放哪里

Lore 图片统一放在：
- `source/marathon-lore/assets/images/`

图标素材目前也在其子目录下：
- `source/marathon-lore/assets/images/icons/`

适合放这里的内容：
- 四级页面 A 左侧主图
- 四级页面 B 右侧主图
- 武器图
- 外壳图
- 档案插图
- 截图
- 角色 / 阵营图标

在 `index.json` 中这样引用：

```json
"image": "/marathon-lore/assets/images/runner-shell-a.png"
```

或：

```json
"image": "/marathon-lore/assets/images/icons/marathon-icon.jpg"
```

---

## 6. Lore 正文素材放哪里

Lore 正文统一放在：
- `source/marathon-lore/content/docs/`

这是你以后最常手动编辑的目录之一。

例如：
- `source/marathon-lore/content/docs/world/colony-archive/lost-starship.md`
- `source/marathon-lore/content/docs/world/colony-archive/dree-log/dree-log-01.md`
- `source/marathon-lore/content/docs/runner/protocol/runner-protocol.md`

正文文件是普通 Markdown 文本，你可以直接手写段落。

最简单写法示例：

```md
文件类型：个人日志
时间：殖民时代
讲述者：D. 里德

[DREE] 第一批定居者已完成核心舱段安置。

[DREE] 中央终端运行稳定。
```

页面会自动把：
- 空行识别为段落分隔
- 同一段中的换行显示为 `<br>`

---

## 7. Lore 结构清单怎么理解

Lore 结构清单文件是：
- `source/marathon-lore/content/index.json`

你可以把它理解成：

- 顶层数组：一级分类
- `sections`：二级节点
- `entries`：四级内容节点
- `logs`：某个 A 类节点内部的多篇日志目录

---

## 8. 一级分类示例

```json
{
  "id": "career",
  "title": "生涯",
  "count": "63/106",
  "icon": "folder",
  "summary": "赛季等级、评级、精通技艺与称号档案。",
  "sections": []
}
```

字段说明：
- `id`：内部标识，建议英文小写 + 短横线
- `title`：界面显示名称
- `count`：统计值
- `icon`：图标名
- `summary`：分类摘要

---

## 9. 二级节点示例

```json
{
  "id": "mastery",
  "title": "精通技艺",
  "count": "13/14",
  "icon": "spark",
  "note": "核心区域可进入 A/B 两种四级详情",
  "entries": []
}
```

字段说明：
- `note`：这个二级节点的说明文字

---

## 10. 四级内容节点示例

### 10.1 B 类节点示例

```json
{
  "id": "legend-title",
  "title": "传奇称号",
  "count": "12/18",
  "icon": "shield",
  "variant": "b",
  "status": "称号库",
  "accent": "blue",
  "image": "/marathon-lore/assets/images/example.png",
  "summary": "称号类四级页。",
  "meta": ["称号", "奖励展示", "B 版"],
  "bodyFile": "/marathon-lore/content/docs/career/titles/legend-title.md"
}
```

### 10.2 A 类节点示例（单篇正文）

```json
{
  "id": "welcome-center",
  "title": "迎宾中心",
  "count": "4/4",
  "icon": "archive",
  "variant": "a",
  "status": "神经筛选器",
  "accent": "green",
  "image": "/marathon-lore/assets/images/runner-shell-a.png",
  "summary": "个人日志与殖民地初始化记录。",
  "meta": ["个人日志", "殖民时期", "A 版"],
  "bodyFile": "/marathon-lore/content/docs/career/mastery/welcome-center.md"
}
```

字段说明：
- `variant`
  - `"a"`：左图 + 右侧滚动文本
  - `"b"`：左文 + 右图
- `icon`
  - 可以写内置图标名，例如：`"archive"`、`"folder"`、`"badge"`
  - 也可以直接写你自己的图片路径，例如：`"/marathon-lore/assets/images/icons/my-icon.svg"`
  - 如果写了图片路径，前端会直接把它当作图标图片显示
- `accent`
  - `"green"`：终端绿色风格
  - `"blue"`：蓝白风格
- `meta`：顶部小标签
- `bodyFile`：正文文件路径

---

## 11. A 类节点下的“多篇日志”怎么录

如果一个节点下有多篇日志，不要把它们拆成同级 `entries`。

正确做法是：
- 保留一个四级节点
- 在这个节点内部使用 `logs`

示例：

```json
{
  "id": "dree-log",
  "title": "里德将军个人日志",
  "count": "DREE-0246",
  "icon": "archive",
  "variant": "a",
  "status": "UESC Internal",
  "accent": "green",
  "image": "/marathon-lore/assets/images/runner-shell-a.png",
  "summary": "殖民地稳定、补给到达与异常信号记录。",
  "meta": ["个人日志", "殖民时代", "A 版"],
  "logs": [
    {
      "id": "dree-log-01",
      "title": "个人日志 01：初始安置",
      "count": "LOG 01",
      "status": "UESC Internal",
      "summary": "第一批安置完成后的记录。",
      "meta": ["个人日志", "LOG 01"],
      "image": "/marathon-lore/assets/images/runner-shell-a.png",
      "bodyFile": "/marathon-lore/content/docs/world/colony-archive/dree-log/dree-log-01.md"
    }
  ]
}
```

这时页面左侧导航切换的是：
- `dree-log-01`
- `dree-log-02`
- `dree-log-03`

而不是同级别的其它节点。

---

## 12. 你最常见的录入动作

### 12.1 新增一个 B 类页面

1. 把图片放进：
   - `source/marathon-lore/assets/images/`
2. 在 `source/marathon-lore/content/docs/...` 新建 `.md` 文档
3. 在 `source/marathon-lore/content/index.json` 对应 `entries` 中新增条目
4. 填好：
   - `title`
   - `summary`
   - `image`
   - `meta`
   - `bodyFile`

### 12.2 新增一个 A 类单篇页面

1. 在 `docs/` 中新建一个 `.md`
2. 在 `index.json` 中新增一个 `variant: "a"` 的 `entry`
3. 填 `bodyFile`

### 12.3 新增一个 A 类多日志节点

1. 在 `index.json` 中新增一个 A 类 `entry`
2. 在这个 `entry` 里新增 `logs`
3. 每篇日志单独建一个 `.md`
4. 每篇日志分别填写：
   - `id`
   - `title`
   - `count`
   - `status`
   - `summary`
   - `image`
   - `meta`
   - `bodyFile`

---

## 13. 现在不建议再用的旧方式

以下说法**已经过期**，不要再按它操作：

- “Lore 正文都写在 `source/marathon-lore/assets/data.js`”
- “在 `body` 数组里手动写所有段落”
- “多篇日志要做成多个同级 `entries`”

当前实际结构已经改成：
- `index.json` 管结构
- `docs/` 管正文
- `images/` 管图片

---

## 14. 本地查看效果

推荐本地预览流程：

```powershell
npm.cmd run build
python -m http.server 4010 --directory public
```

访问：
- 首页：`http://127.0.0.1:4010/`
- Lore：`http://127.0.0.1:4010/marathon-lore/`

---

## 15. 现在的维护建议

当前这一版已经比旧结构更适合长期维护：

- `index.json`：负责目录结构
- `docs/*.md`：负责正文内容
- `images/`：负责图片素材
- `app.js`：只负责界面逻辑
- `style.css`：只负责样式

以后如果资料继续增加，也建议继续保持这个方向：
- 结构和正文分离
- 图片单独管理
- 节点与节点内日志分开建模

这样你会更容易：
- 手动录入
- 批量整理
- 迁移素材
- 后续扩展到更多 Marathon 内容
