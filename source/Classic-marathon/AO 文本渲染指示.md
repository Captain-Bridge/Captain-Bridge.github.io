# AO 格式标记参考

AO 格式是 Aleph One（Marathon 引擎）终端文本使用的标记语言。标记以 `$` 开头，区分大小写。

> 颜色值来源于 Aleph One 引擎 `screen_drawing.cpp` 中 `InterfaceColors` 数组（16-bit 值右移 8 位），索引为 `_computer_interface_text_color + N`。

## 颜色标记

格式 `$C{N}`，`N` 为 0-7 的数字。

| 标记 | 颜色名称 | 色值 (RGB) | 色值 (HEX) | 预览 |
| ---- | -------- | ---------- | ---------- | ---- |
| `$C0` | Green | (0, 255, 0) | `#00FF00` | ![#00FF00](https://placehold.co/80x20/00FF00/00FF00) |
| `$C1` | White | (255, 255, 255) | `#FFFFFF` | ![#FFFFFF](https://placehold.co/80x20/FFFFFF/FFFFFF) |
| `$C2` | Red | (255, 0, 0) | `#FF0000` | ![#FF0000](https://placehold.co/80x20/FF0000/FF0000) |
| `$C3` | DarkGreen | (0, 156, 0) | `#009C00` | ![#009C00](https://placehold.co/80x20/009C00/009C00) |
| `$C4` | Blue | (0, 176, 201) | `#00B0C9` | ![#00B0C9](https://placehold.co/80x20/00B0C9/00B0C9) |
| `$C5` | Yellow | (255, 231, 0) | `#FFE700` | ![#FFE700](https://placehold.co/80x20/FFE700/FFE700) |
| `$C6` | DarkRed | (175, 0, 0) | `#AF0000` | ![#AF0000](https://placehold.co/80x20/AF0000/AF0000) |
| `$C7` | DarkBlue | (12, 0, 255) | `#0C00FF` | ![#0C00FF](https://placehold.co/80x20/0C00FF/0C00FF) |

> 默认文本颜色为 Green `$C0`。在 Marathon 2 中，由于没有可识别代码，脚本里的默认颜色现由终端首页（LOGON）的 PICT 资源编号决定，见下方「M2 终端种族识别」章节。

## 样式标记

| 标记 | 含义 | 说明 |
| ---- | ---- | ---- |
| `$B` … `$b` | 粗体 | 开始/结束粗体，渲染时向右偏移 1px 重绘 |
| `$I` … `$i` | 斜体 | 开始/结束斜体，通过仿射剪切变换（shear=0.2）模拟 oblique 效果 |
| `$U` … `$u` | 下划线 | 开始/结束下划线，在文本底部绘制 1px 横线 |

> 样式标记可叠加使用，如 `$B$I` 同时启用粗体和斜体。

## 使用示例

```
$C2$B未授权访问！$b$C0
系统状态：$C5警告$C0
$C4$U链接已建立$u$C0
$I斜体文字$i 与 $B$I粗斜体$i$b
```

以上文本渲染效果：
- "未授权访问！" — 红色粗体
- "系统状态：" — 默认绿色
- "警告" — 黄色
- "链接已建立" — 蓝色下划线
- "斜体文字" — oblique 斜体
- "粗斜体" — 粗体 + 斜体叠加

## M2 终端种族识别

Marathon 2 中，终端的所属种族（人类/S'pht/Pfhor/Jjaro）通过 LOGON 页面的 PICT 资源编号识别。不同种族的终端使用不同的默认文字颜色：

| LOGON PICT | 种族 | 默认颜色 | 说明 |
|-----------|------|---------|------|
| 01600, 01603, 01607 | 人类 (Human) | `$C0` 绿色 | Bob 的终端、Durandal 劫持的终端等 |
| 01601 | S'pht 斯福特人 | `$C5` 黄色 | S'pht 编译器的终端，通过 S'pht 翻译器交流 |
| 01602, 01605 | Pfhor 弗尔人 | `$C2` 红色 | Pfhor 军用终端、科学报告等 |
| 01608 | Jjaro 贾罗人 AI | `$C1` 白色 | Thoth 等 Jjaro AI 的终端 |

> 当终端文本中未使用 `$C{N}` 显式指定颜色时，将使用上表对应的默认颜色。M1 及 M3 的映射待补充。
