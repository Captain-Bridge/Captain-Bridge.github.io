---
title: JZ5 替换空格
tags: [算法,其它]
categories: [剑指offer]
mathjax: true
math: true
date: 2025-11-06 14:43:46
---

# JZ5 替换空格

## 描述

请实现一个函数，将一个字符串s中的每个空格替换成“%20“。

<!--more-->

例如，当字符串为“We Are Happy“.则经过替换之后的字符串为“We%20Are%20Happy“。

数据范围:$0≤len(s)≤1000$ 。保证字符串中的字符为大写英文字母、小写英文字母和空格中的一种。

**示例1**

```python
输入："We Are Happy"
返回值："We%20Are%20Happy"
```

**示例2**

```python
输入：" "
返回值："%20"
```

## 题解

~~何意味？~~

本意应当是考察在用三个长度的字符替换一个长度的字符后，index不能直接自增，需要手动指向正确的位置。但是人生苦短，我用python。

**代码**

```python
#
# 代码中的类名、方法名、参数名已经指定，请勿修改，直接返回方法规定的值即可
#
# 
# @param s string字符串 
# @return string字符串
#
class Solution:
    def replaceSpace(self , s: str) -> str:
        return s.replace(' ',"%20")
```

