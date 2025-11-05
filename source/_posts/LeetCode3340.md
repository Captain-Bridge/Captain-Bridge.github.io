---
title: LeetCode3340
tags: [字符串]
categories:
  - LeetCode每日一题
  - LeetCode简单
mathjax: true
math: true
date: 2025-03-30 22:21:30
---

# [LeetCode.3340](https://leetcode.cn/problems/check-balanced-string):检查平衡字符串

​	简单的API练习题。

<!-- more -->

## 题目描述

给你一个仅由数字 0 - 9 组成的字符串 `num`。如果偶数下标处的数字之和等于奇数下标处的数字之和，则认为该数字字符串是一个 **平衡字符串**。

如果 `num` 是一个 **平衡字符串**，则返回 `true`；否则，返回 `false`。

## 示例

示例1：

```
输入：num = "1234"

输出：false

解释：

偶数下标处的数字之和为 1 + 3 = 4，奇数下标处的数字之和为 2 + 4 = 6。
由于 4 不等于 6，num 不是平衡字符串。
```

示例2：

```
输入：num = "24123"

输出：true

解释：

偶数下标处的数字之和为 2 + 1 + 3 = 6，奇数下标处的数字之和为 4 + 2 = 6。
由于两者相等，num 是平衡字符串。
```


提示：

```
2 <= num.length <= 100
num 仅由数字 0 - 9 组成。
```

## 题解

​	首先注意到数据范围$2 <= num.length <= 100$，所以说这道题允许用最简单的方法做。要求是偶数处的数字和等于奇数处的数字和即认为是一个平衡字符串，那么就算出来奇数的和偶数的下标和然后做比较就可以了。

## 代码

```Java
class Solution {
    public boolean isBalanced(String num) {
        char[] array = num.toCharArray();
        int countA = 0, countB = 0;
        for(int i = 0; i < num.length(); i++) {
            if(i % 2 == 0) {
                countA = (int)array[i] + countA - '0';
            }
            else{
                countB = (int)array[i] + countB  - '0';
            }
        }
        return countA == countB;
    }
}
```

**复杂度分析**

- 时间复杂度：$O(n)$，其中 $n$ 是 $num$ 的长度。
- 空间复杂度：$O(1)$。
