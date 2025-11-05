---
title: LeetCode2680
date: 2025-03-26 15:50:11
tags: [贪心,位运算,数组,前缀和]
categories: [LeetCode每日一题, LeetCode中等]
mathjax: true
math: true
---

# [LeetCode.2680](https://leetcode.cn/problems/maximum-or):最大或值

​	这道题因为和[2829](https://leetcode.cn/problems/determine-the-minimum-sum-of-a-k-avoiding-array)同为贪心，所以今天第二道题解就整理这一道题，这道题还涉及到位运算的一些`api`知识。

<!-- more -->

## 题目描述

给你一个下标从 **0** 开始长度为 `n` 的整数数组 `nums` 和一个整数 `k` 。每一次操作中，你可以选择一个数并将它乘 `2` 。

你最多可以进行 `k` 次操作，请你返回 `nums[0] | nums[1] | ... | nums[n - 1]` 的最大值。

`a | b` 表示两个整数 `a` 和 `b` 的 **按位或** 运算。

## 示例

示例1：

```
输入：nums = [12,9], k = 1
输出：30
解释：如果我们对下标为 1 的元素进行操作，新的数组为 [12,18] 。此时得到最优答案为 12 和 18 的按位或运算的结果，也就是 30 。
```

示例2：

```
输入：nums = [8,1,2], k = 2
输出：35
解释：如果我们对下标 0 处的元素进行操作，得到新数组 [32,1,2] 。此时得到最优答案为 32|1|2 = 35 。
```

提示：

```
1 <= nums.length <= 105
1 <= nums[i] <= 109
1 <= k <= 15
```

## 题解法1：贪心 + 前缀和

每次操作可以将某个整数乘 2，因此要想使得所有整数的或值更大，我们应该尽量选择二进制表示中具有更高位为 1 的数字。而这样的整数有很多个，我们需要一一遍历找到令答案最大的那个，一旦将其乘 2 之后，接下来的`k−1`次操作都需要基于该整数进行。

换句话说，我们需要找到某个整数，计算对它进行`k`次操作后所有整数的或的最大值。现在问题变为如何快速获取其他整数的或值？

我们可以维护一个后缀或值数组`suf`，并在从前往后遍历的过程中维护一个前缀或值`pre`，这样就可以在$O(1)$的时间内计算某个值操作`k`次后所有整数的或值了。

## 法1代码：

```c++
class Solution {
public:
    using ll = long long;
    long long maximumOr(vector<int>& nums, int k) {
        int n = nums.size();
        vector<ll> suf(n + 1, 0);
        
        for (int i = n - 1; i >= 0; i--) {
            suf[i] = suf[i + 1] | nums[i];
        }

        ll res = 0;
        ll pre = 0;
        for (int i = 0; i < n; i++) {
            res = max(res, pre | (1ll * nums[i] << k) | suf[i + 1]);
            pre |= nums[i];
        }
        return res;
    }
};
```

复杂度分析：

- 时间复杂度：$O(n)$ 。其中`n`是`nums`的长度，计算后缀或值数组的时间复杂度为$O(n)$，枚举单个整数的时间复杂度为$O(1)$，总共枚举了`n`次，因此总体时间复杂度为$O(n)$。
- 空间复杂度：$O(n)$。后缀或值数组的空间复杂度为$O(n)$。

## 题解法2：位运算

方法一中通过维护前后缀的或值来实现快速计算。除此以外还有什么方法可以快速除去某个值的或值呢？

在二进制表示中，有些位在所有整数中出现过两次及以上的 1，这些位在除去任何一个整数后，在剩余整数的或值的二进制表示中仍然为 1。

我们维护一个前缀或值，该值与当前枚举值进行与运算即可得到出现两次及以上的 1，将所有这些 1 进行或运算得到 `multi_bits`。

设所有数字的或值为 `or_sum`，当前枚举的数字为`x`，那么 `or_sum` 异或 x 后再与`multi_bits`进行或运算即可得到除去`x`后剩余所有整数的或值。

## 法2代码：

```c++
class Solution {
public:
    using ll = long long;
    long long maximumOr(vector<int>& nums, int k) {
        int n = nums.size();
        ll or_sum = 0;
        ll multi_bits = 0;
        for (auto x : nums) {
            multi_bits |= x & or_sum;
            or_sum |= x;
        }

        ll res = 0;
        for (auto x : nums) {
            res = max(res, (or_sum ^ x) | (1ll * x << k) | multi_bits);
        }
        return res;
    }
};
```

复杂度分析

- 时间复杂度：$O(n)$，其中`n`是`nums`的长度。枚举单个整数的时间复杂度为$O(1)$，总共枚举了`n`次，因此总体时间复杂度为$O(n)$。

- 空间复杂度$O(1)$。
