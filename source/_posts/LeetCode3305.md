---
title: LeetCode3305
tags: [哈希表,字符串,滑动窗口]
categories:
  - LeetCode每日一题
  - LeetCode中等
mathjax: true
math: true
date: 2025-03-30 21:57:12
---

# [LeetCode.3305](https://leetcode.cn/problems/count-of-substrings-containing-every-vowel-and-k-consonants-i):元音辅音字符串计数 I

​	这道题我在做的时候还没开始有做算法题的思路，起手就是$new$一堆新方法，然后把代码逻辑写的复杂无比，然后还AC不了，后面参考了题解的思想，还是做了出来。[LeetCode3306](https://leetcode.cn/problems/count-of-substrings-containing-every-vowel-and-k-consonants-ii)和这道题在题干上完全一致，只是数据范围从$5 <= word.length <= 250$变成了$5 <= word.length <= 2 * 10^5$，所以导致$O(N^2)$的暴力枚举的方法无法使用了，滑动窗口的方法是一致的。

<!-- more -->

## 题目描述

给你一个字符串 `word` 和一个 **非负** 整数 `k`。

返回 `word` 的 子字符串 中，每个元音字母（`'a'`、`'e'`、`'i'`、`'o'`、`'u'`）**至少** 出现一次，并且 **恰好** 包含 `k` 个辅音字母的子字符串的总数。

## 示例

示例1：

```
输入：word = "aeioqq", k = 1

输出：0

解释：

不存在包含所有元音字母的子字符串。
```

示例2：

```
输入：word = "aeiou", k = 0

输出：1

解释：

唯一一个包含所有元音字母且不含辅音字母的子字符串是 word[0..4]，即 "aeiou"。
```

示例3：

```
输入：word = "ieaouqqieaouqq", k = 1

输出：3

解释：

包含所有元音字母并且恰好含有一个辅音字母的子字符串有：

word[0..5]，即 "ieaouq"。
word[6..11]，即 "qieaou"。
word[7..12]，即 "ieaouq"。
```

提示：

```
5 <= word.length <= 250
word 仅由小写英文字母组成。
0 <= k <= word.length - 5
```

## 题解

​	我在拿到这道题的时候，首先想到的就是我要创建一个方法来检查一个字符串是否符合至少有完整的$aeiou$并且恰好包含$k$个辅音字母，然后这个方法又引申出来两个子方法，一个是检查字符串中是否有特定的字母，一个是检查字符串里有几个辅音，这样一下子三个方法就出来了。写出来了这三个方法之后，后面就麻了爪了，看了下标签是滑动窗口，然后就开始想办法用双指针去滑子字符串然后塞进我写的方法里面检查，但是始终AC不了。后面看了题解，发现首先暴力枚举所有子字符串在这道题是可行的，毕竟$5 <= word.length <=250$这个问题的数量级还是比较仁慈的，其次使用滑动窗口的解法也是天才般的想法：
​	令$count(k)$表示每个元音字母至少出现一次，且***至少***包含$k$个辅音字母的总数，那么问题的答案就变成了$count(k)-count(k+1)$，即在元音字母满足条件的前提下至少有$k+1$个辅音字母的子字符串的数量减去至少有$k$个辅音子字符串的数量，剩下的就是恰好只有$k$个辅音字母的子字符串的数量了。
​	然后是滑动窗口的设计，对子字符串$[i,j)$，依次枚举左端点$i$，对于对应的右端点$j$，不断右移端点$j$，直到$[i,j)$满足元音字母的要求，并且至少有$k$个辅音，或者到最右侧$:j=n$。右移操作完成后，如果区间$[i,j)$内的子字符串满足每个元音字母至少出现一次，且至少有$k$个辅音字母，则左端点为$i$的子字符串满足条件的数目为$n-j+1$。$count(k)$即为所有数目之和。
​	翻译一下就是，首先找出来满足元音要求的子字符串，然后把这个字符串向右扩张，直到满足辅音要求，从现在开始，每次向右扩张一个字符都是增加一个新的满足要求的子字符串，所以只需要求出从满足要求的$j$开始一直到字符串结束的长度即可。然后$i$不断向右移动，保证所有满足要求的子字符串都被找到。

其实感觉这个方法就是对暴力枚举$O(N^2)$的优化，并不能达到$O(N)$的复杂度。

## 代码

```Java
class Solution {

    public boolean in(String word, char w){
        for(int i = 0; i < word.length(); i++){
            if(word.charAt(i) == w){
                return true;
            }
        }
        return false;
    }

    public boolean check(String word){
        return in(word, 'a') && in(word, 'e') && in(word, 'i') && in(word, 'o') && in(word, 'u');
    }

    public long notNum(String word){
        long count = 0;
        for(int i = 0; i < word.length(); i++){
            if(word.charAt(i)!='a' && word.charAt(i)!='e' && word.charAt(i)!='i' && word.charAt(i)!='o' && word.charAt(i)!='u')
                count++;
        }
        return count;
    }

    public int count(String word, int k){
        int n = word.length();
        int consonants = 0;
        int res = 0;
        Map<Character, Integer> occur = new HashMap<>();
        int right = 0;
        for(int i = 0; i < n; i++){
            while(right < n && (consonants < k || occur.size() < 5)){
                char ch = word.charAt(right);
                if(in("aeiou", ch)){
                    occur.put(ch, occur.getOrDefault(ch, 0) + 1);
                }else {
                    consonants++;
                }
                right++;
            }
            if(consonants >= k && occur.size() == 5){
                res += n-right+1;
            }
            char left = word.charAt(i);
            if(in("aeiou", left)){
                occur.put(left, occur.get(left) - 1);
                if (occur.get(left) == 0){
                    occur.remove(left);
                }
            }else {
                consonants--;
            }
        }
        return res;
    }

    public int countOfSubstrings(String word, int k) {

        return count(word, k)- count(word, k+1);
    }

}
```

**复杂度分析**

- 时间复杂度：$O(n)$，其中 $n$ 是 $word$ 的长度。
- 空间复杂度：$O(1)$。
