---
title: LeetCode2278
tags: [字符串]
categories:
  - LeetCode每日一题
  - LeetCode简单
mathjax: true
math: true
date: 2025-03-31 23:52:33
---

# [LeetCode2278](https://leetcode.cn/problems/percentage-of-letter-in-string):字母在字符串中的百分比

​	简单的API练习题。

<!-- more -->

## 题目描述

给你一个字符串 `s` 和一个字符 `letter` ，返回在 `s` 中等于 `letter` 字符所占的 **百分比** ，向下取整到最接近的百分比。

## 示例

示例1：

```
输入：s = "foobar", letter = "o"
输出：33
解释：
等于字母 'o' 的字符在 s 中占到的百分比是 2 / 6 * 100% = 33% ，向下取整，所以返回 33 。
```

示例2：

```
输入：s = "jjjj", letter = "k"
输出：0
解释：
等于字母 'k' 的字符在 s 中占到的百分比是 0% ，所以返回 0 。
```

提示：

```
1 <= s.length <= 100
s 由小写英文字母组成
letter 是一个小写英文字母
```

## 题解

​	算法题首先关注数据范围，这关系到一些简单的方法能否使用。像本题的$[1,100]$就是很小的数据范围，然后统计的还是固定的字符在字符串中占比的百分比，就更简单了，直接遍历，然后每次找到这个字符就给$ans+1$即可。稍微要动脑的就是要把返回值向下取整，然后去掉百分号。不难想到`“/”`本身就有向下取整的效果，所以只需要返回$ans*100/n$即可，其中`n`是字符串的长度。

## 代码

```c++
class Solution {
public:
    int percentageLetter(string s, char letter) {
        int n = s.length();
        int count = 0;
        for(int i = 0; i < n; i++){
            if(s[i]-letter == 0){
                count+=1;
            }
        }
        if(count == 0)
            return 0;
        else
            return count*100/n;
    }
};
```

**复杂度分析**

- 时间复杂度：$O(n)$，其中 $n$ 为 $s$ 的长度。即为遍历计算字符出现次数的时间复杂度。
- 空间复杂度：$O(1)$。
