---
title: LeetCode2255
date: 2025-03-24 00:25:42
tags: [数组,字符串]
categories: [LeetCode每日一题, LeetCode简单]
mathjax: true
math: true
---

# [LeetCode.2255](https://leetcode.cn/problems/count-prefixes-of-a-given-string):统计是给定字符串前缀的字符串数目

​	一道简单难度的题，注意边缘，注意逻辑即可，API练习题。

<!-- more -->

## 题目描述

给你一个字符串数组`words`和一个字符串`s`，其中`words[i]`和`s`只包含 **小写英文字母** 。

请你返回`words`中是字符串`s`前缀 的 **字符串数目** 。

一个字符串的 **前缀** 是出现在字符串开头的子字符串。**子字符串** 是一个字符串中的连续一段字符序列。

## 示例

示例1：

```
输入：words = ["a","b","c","ab","bc","abc"], s = "abc"
输出：3
解释：
words 中是 s = "abc" 前缀的字符串为：
"a" ，"ab" 和 "abc" 。
所以 words 中是字符串 s 前缀的字符串数目为 3 。
```

示例2：

```
输入：words = ["a","a"], s = "aa"
输出：2
解释：
两个字符串都是 s 的前缀。
注意，相同的字符串可能在 words 中出现多次，它们应该被计数多次。
```

提示：

```
1 <= words.length <= 1000
1 <= words[i].length, s.length <= 10
words[i] 和 s 只 包含小写英文字母。
```


## 题解

​	直接遍历`words`中的每一个字符串`word`，如果`word`比`s`长，则`word`必然不可能是`s`的前缀，此后对`word`和`s`同时从左至右比对，如果`word`中任意一个与`s`中的不一致则其不是`s`前缀，直到`word`完全比对完成，比对完成后仍然没触发前面提到的条件则认为`word`为`s`的一个前缀，`ans + 1`.

## 代码

```java
class Solution {
    public int countPrefixes(String[] words, String s) {
        int ans = 0;
        int n = words.length;
        for(String word : words){ //使用了foreach
            boolean flag = true;
            int word_len = word.length();
            int s_len = s.length();
            if(s_len < word_len){
                continue;
            }
            for(int i = 0; i < word_len; i++){
                if(word.charAt(i)-s.charAt(i)!=0){
                    flag = false;
                    break;
                }
            }
            if(flag){
                ans += 1;   
            }
        }
        return ans;
    }
}
```

