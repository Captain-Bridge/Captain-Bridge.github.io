---
title: LeetCode2109
tags: [数组,双指针,字符串,模拟]
categories:
  - LeetCode每日一题
  - LeetCode中等
mathjax: true
math: true
date: 2025-03-30 00:59:25
---

# [LeetCode.2109](https://leetcode.cn/problems/adding-spaces-to-a-string):向字符串中添加空格

​	一开始我还以为是一道API题，后来发现四五行代码居然TLE了，最后发现果然真的是一道API题。

<!-- more -->

## 题目描述

给你一个下标从 **0** 开始的字符串 `s` ，以及一个下标从 **0** 开始的整数数组 `spaces` 。

数组 `spaces` 描述原字符串中需要添加空格的下标。每个空格都应该插入到给定索引处的字符值 **之前** 。

- 例如，`s = "EnjoyYourCoffee"` 且 `spaces = [5, 9]` ，那么我们需要在 `'Y'` 和 `'C'` 之前添加空格，这两个字符分别位于下标 `5` 和下标 `9` 。因此，最终得到 $"Enjoy\ \textbf{Y}our\ \text{C}offee"$ 。

请你添加空格，并返回修改后的字符串。

## 示例

示例1：

```
输入：s = "LeetcodeHelpsMeLearn", spaces = [8,13,15]
输出："Leetcode Helps Me Learn"
解释：
下标 8、13 和 15 对应 "LeetcodeHelpsMeLearn" 中加粗斜体字符。
接着在这些字符前添加空格。
```

示例2：

```
输入：s = "icodeinpython", spaces = [1,5,7,9]
输出："i code in py thon"
解释：
下标 1、5、7 和 9 对应 "icodeinpython" 中加粗斜体字符。
接着在这些字符前添加空格。
```

示例3：

```
输入：s = "spacing", spaces = [0,1,2,3,4,5,6]
输出：" s p a c i n g"
解释：
字符串的第一个字符前可以添加空格。
```

提示：

```
1 <= s.length <= 3 * 105
s 仅由大小写英文字母组成
1 <= spaces.length <= 3 * 105
0 <= spaces[i] <= s.length - 1
spaces 中的所有值 严格递增
```

## 题解

​	C++中对字符串操作有直接在$i$位置插入的方法$std::string.insert(i,j,"s")$ 其中$i$代表插入的位置，$j$代表插入字符串的长度，$s$代表插入的字符串。但是这个方法其实也是处理了一次字符串移位(从后往前一个个往后挪动)，所以时间复杂度为$O(m*n)$，但是如果为每个字符重新计算其索引的话，时间复杂度即可到达$O(n+m)$。

## 代码

```C++
class Solution {
public:
    string addSpaces(string s, vector<int>& spaces) {
        int m = s.length(), n = spaces.size();
        string ans(m + n, ' ');
        for (int i = 0, j = 0; i < m; i++) {
            if( j<n && i == spaces[j])
                j+=1;
            ans[i + j] = s[i]; // i+j为s中字符的新索引
        }
        return ans;
    }
};

```

**复杂度分析**

- 时间复杂度：$O(N)$，其中 *N* 是字符串 *s* 的长度。
- 空间复杂度：$O(N)$。