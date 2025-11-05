---
title: 扫描线与Arrangement
tags: []
categories:
  - 2025暑期班
mathjax: true
math: true
notshow: true
date: 2025-07-02 09:46:15
---
# [CGAL中的2DArrangement算法](https://doc.cgal.org/latest/Arrangement_on_surface_2/)

<!--more-->

### 输入输出
输入：
```
一组 x‑单调曲线（X_monotone_curve_2）和/或点（Point_2），它们位于一个二维参数域（如平面或曲面）上 。
```

输出：
```
一个 二维细分（arrangement），即由这些曲线/点引起的细胞划分，包括顶点、边（由曲线段表示）和面，整体储存在一个 DCEL（双连通边列表）数据结构中 。
```

### 其解决了什么问题

这个模块解决了在平面或曲面上由多条（可能相交的）x‑单调曲线构建精确细分的问题，支持：

 - 增量插入：可以逐条插入曲线（insert / insert_non_intersecting_curve），自动处理交点、重叠、拆分等 。

 - 处理交叉与重叠：需要模型 ArrangementXMonotoneTraits_2，支持交点计算、曲线分解与合并 。

 - 输入输出格式化：支持读写 arrangement 至/自流（ArrangementInputFormatter / OutputFormatter） 。

广泛应用于计算几何——如构建 Voronoi 图、布尔运算、Minkowski 和球面几何等 。