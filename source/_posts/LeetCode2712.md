---
title: LeetCode2712
date: 2025-03-27 21:35:41
tags: [贪心,字符串,动态规划]
categories: [LeetCode每日一题, LeetCode中等]
mathjax: true
math: true
---

# [LeetCode.2712](https://leetcode.cn/problems/minimum-cost-to-make-all-characters-equal):使所有字符串相等的最小成本

​	学习是有用的！大概在上个星期，做了一道关于动态规划的题[2272](https://leetcode.cn/problems/substring-with-largest-variance)，上次连转移方程都看了半天才看懂*（真的不是题解写的叽里咕噜的吗）*。这次可以手撕了，虽然好像也不是动的很态。

<!-- more -->

## 题目描述

给你一个下标从 **0** 开始、长度为 `n` 的二进制字符串 `s` ，你可以对其执行两种操作：

- 选中一个下标 `i` 并且反转从下标 `0` 到下标 `i`（包括下标 `0` 和下标 `i` ）的所有字符，成本为 `i + 1` 。
- 选中一个下标 `i` 并且反转从下标 `i` 到下标 `n - 1`（包括下标 `i` 和下标 `n - 1` ）的所有字符，成本为 `n - i` 。

返回使字符串内所有字符 **相等** 需要的 **最小成本** 。

**反转** 字符意味着：如果原来的值是 '0' ，则反转后值变为 '1' ，反之亦然。

## 示例

示例1：

```
输入：s = "0011"
输出：2
解释：执行第二种操作，选中下标 i = 2 ，可以得到 s = "0000" ，成本为 2 。可以证明 2 是使所有字符相等的最小成本。
```

示例2：

```
输入：s = "010101"
输出：9
解释：执行第一种操作，选中下标 i = 2 ，可以得到 s = "101101" ，成本为 3 。
执行第一种操作，选中下标 i = 1 ，可以得到 s = "011101" ，成本为 2 。
执行第一种操作，选中下标 i = 0 ，可以得到 s = "111101" ，成本为 1 。
执行第二种操作，选中下标 i = 4 ，可以得到 s = "111110" ，成本为 2 。
执行第二种操作，选中下标 i = 5 ，可以得到 s = "111111" ，成本为 1 。
使所有字符相等的总成本等于 9 。可以证明 9 是使所有字符相等的最小成本。 
```

提示：

```
1 <= s.length == n <= 105
s[i] 为 '0' 或 '1'
```

## 我的题解：纯贪心

​	观察了一会，从示例2中观察到一个规律：

$	在\frac{n}{2}左侧的字符，使用方法1翻转的cost最小，在\frac{n}{2}右侧的字符，使用方法2翻转的cost最小。$

​	由此，我们只需要判断到底是把字符串全部变成1还是全部变成0即可。至于这个判断则是基于前面的观察，$\frac{n}{2}$左侧的全部使用方法1翻转，右侧使用方法2翻转，检索时从中间向两侧检索。最终计算将全变成1的成本和全变成0的成本哪个更低，则直接返回更低的即可。题设还是仁慈了，很幸运$O(n)$的方法没有TLE。

## 我的代码

```C++
class Solution {
public:
    long long minimumCost(string s) {
        long long n = s.length();
        long long ans_1 = 0;
        long long ans_0 = 0;
        bool flag = false;
        for(long long i = n/2; i >= 0 ; i--){
            if((s[i] == '0' && !flag)||(s[i]!='0' && flag)){
                continue;
            }
            else{
                flag = !flag;
                ans_0 = ans_0 + i + 1;
            }
        }

        flag = false;
        for(long long i = n/2 + 1; i < n; i++){
            if((s[i] == '0' && !flag)||(s[i]!='0' && flag)){
                continue;
            }
            else{
                flag = !flag;
                ans_0 = ans_0 + n - i;
            }
                    
        }

        flag = false;
        for(long long i = n/2; i >= 0 ; i--){
            if((s[i] == '1' && !flag)||(s[i]!='1' && flag))
                continue;
            else{
                flag = !flag;
                ans_1 = ans_1 + i + 1;
            }
                    
        }

        flag = false;
        for(long long i = n/2 + 1; i < n; i++){
            if((s[i] == '1' && !flag)||(s[i]!='1' && flag))
                continue;
            else{
                flag = !flag;
                ans_1 = ans_1 + n - i;
            }
                    
        }

        return ans_0 < ans_1 ? ans_0 : ans_1 ;

    }
};
```

复杂度分析：

- 时间复杂度：$O(n)$
- 空间复杂度：$O(1)$

## 官方题解法1：动态规划

我们可以维护一个前缀全部变成 0 或 1 的最小成本，同时维护后缀全部变成 0 和 1 的最小成本来求解答案。

定义$ suf[i][0] $表示从第` i `个字符开始的后缀全部变成` 0 `所需要的最小成本，定义$ suf[i][1] $表示从第 i 个字符的后缀全部变成 1 所需的最小成本，转移方程为：

若 s[i] 为 1，则：

- $suf[i][1]=suf[i+1][1]$
- $suf[i][0]=suf[i+1][0]+(n−i)$

若 s[i] 为 0，则：
- $suf[i][1]=suf[i+1][0]+(n−i)$
- $suf[i][0]=suf[i+1][0]$

前缀的状态$ pre[i][0] $和 $pre[i][1] $的定义和转移过程类似：

遍历所有的` i`，求解$ min(pre[i][0]+suf[i+1][0],pre[i][1]+suf[i+1][1]) $的最小值即可。

## 官方题解法1代码

```C++
class Solution {
public:
    using ll = long long;
    ll minimumCost(string s) {
        int n = s.size();
        vector<vector<ll>> suf(n + 1, vector<ll>(2, 0));
        for (int i = n - 1; i >= 0; i--) {
            if (s[i] == '1') {
                suf[i][1] = suf[i + 1][1];
                suf[i][0] = suf[i + 1][1] + (n - i);
            } else {
                suf[i][1] = suf[i + 1][0] + (n - i);
                suf[i][0] = suf[i + 1][0];
            }
        }

        vector<ll> pre(2);
        ll res = 1e18;
        for (int i = 0; i < n; i++) {
            if (s[i] == '1') {
                pre[0] = pre[1] + i + 1;
            } else {
                pre[1] = pre[0] + i + 1;
            }
            res = min(res, min(pre[0] + suf[i + 1][0], pre[1] + suf[i + 1][1]));
        }
        return res;
    }
};

```

复杂度分析：

- 时间复杂度：$O(n)$，其中 n 是字符串 s 的长度。状态转移的时间复杂度为$ O(1)$，共有$ O(n) $个状态，因此总体时间复杂度为 $O(n)$。

- 空间复杂度：$O(n)$。存储后缀状态的空间复杂度为$ O(n)$。


## 官方题解法2：一次遍历

我们并不关心字符最终会变成 0 还是 1，只要它们相等即可。因此需要关注每对相邻字符的相等关系。一次操作有如下性质：

一次操作可以且一定改变一对相邻字符的关系。
对于两个相邻且不相等的字符，必须经过一次操作才能使它们相等。
对某两个相邻字符操作结束后，左侧和右侧所有的相邻字符的相等关系不变。
因此，我们只需枚举所有的相邻字符，对不同的进行操作。操作时选择成本更小的一侧，其总和就是答案。

~~这个方法比我的还贪~~

## 官方题解法2代码

```C++
class Solution {
public:
    using ll = long long;
    long long minimumCost(string s) {
        int n = s.size();
        ll res = 0;
        for (int i = 1; i < n; i++) {
            if (s[i] != s[i - 1]) {
                res += min(i, n - i);
            }
        }
        return res;
    }
};
```

复杂度分析：

- 时间复杂度：$O(n)$，其中 *n* 是字符串 *s* 的长度。
- 空间复杂度：$O(1)$。
