---
title: LeetCode3110
tags: [字符串]
categories:
  - LeetCode每日一题
  - LeetCode简单
mathjax: true
math: true
date: 2025-03-30 22:26:24
---

# [LeetCode.3110](https://leetcode.cn/problems/check-balanced-string):字符串的分数

​	和[3340](https://leetcode.cn/problems/check-balanced-string)一样，简单的API练习题。

<!-- more -->

## 题目描述

给你一个字符串 `s` 。一个字符串的 **分数** 定义为相邻字符 **ASCII** 码差值绝对值的和。

请你返回 `s` 的 **分数** 。

## 示例

示例1：

```
输入：s = "hello"

输出：13

解释：

s 中字符的 ASCII 码分别为：'h' = 104 ，'e' = 101 ，'l' = 108 ，'o' = 111 。所以 s 的分数为 |104 - 101| + |101 - 108| + |108 - 108| + |108 - 111| = 3 + 7 + 0 + 3 = 13 。
```

示例2：

```
输入：s = "zaz"

输出：50

解释：

s 中字符的 ASCII 码分别为：'z' = 122 ，'a' = 97 。所以 s 的分数为 |122 - 97| + |97 - 122| = 25 + 25 = 50 。
```


提示：

```
2 <= s.length <= 100
s 只包含小写英文字母。
```

## 题解

​	同样首先注意到数据范围$2 <= s.length <= 100$，选择的方法自然是从头到尾的遍历。

## 代码

```Java
class Solution {
    public int scoreOfString(String s) {
        int n = s.length();
        int res = 0;
        int x = 0;
        for(int i = 0; i < n-1; i++){
            x = s.charAt(i) - s.charAt(i+1);
            res = res + (x>0?x:-x);
        }
        return res;
    }
}
```

**复杂度分析**

- 时间复杂度：$O(n)$，其中 $n$ 是 $s$ 的长度。
- 空间复杂度：$O(1)$。
