# 阵营数据维护说明

`source/factions/data.json` 只负责列出阵营目录，每个阵营自己的内容放在 `source/factions/factions/<id>.json`。

## 节点怎么放

- `row` 和 `col` 决定节点在 4x6 网格里的位置，都是从 `0` 开始。
- `size` 只建议用 `small` 或 `large`。
- `exists: false` 或 `empty: true` 表示这个格子不放节点。
- `links` 控制连线，可写 `left`、`right`、`up`、`down`。

## 层数怎么影响样式

- `levels.length` 表示升级级数。
- 节点本体代表 1 级。
- 额外外框层数 = `levels.length - 1`。
- 红框里的点数量也跟 `levels.length` 对应。

## 建议的维护方式

- `id` 直接用 `r1c1` 这种坐标名，最容易定位。
- `title` 写节点名。
- `groupLabel` 写它属于哪一行/哪一组。
- `description` 写节点说明。
- `badge` 可以直接写坐标或等级提示。

如果你后面要补真实内容，只要改这些字段，不需要动页面代码。
