---
title: LeetCode1963
date: 2025-03-23 16:42:42
tags: [栈,贪心,双指针,字符串]
categories: [LeetCode每日一题, LeetCode中等]
mathjax: true
math: true
---

# [LeetCode.1963](https://leetcode.cn/problems/minimum-number-of-swaps-to-make-the-string-balanced):使字符串平衡的最小交换次数

​	这是一道被我手撕了的双指针问题，一开始的思路就是从左往右找，左括号不够了就从右往左换，但是今天看了题解，感觉我写的好复杂。

<!-- more -->

## 题目描述

​	给你一个字符串 `s` ，下标从 0 开始 ，且长度为偶数 `n` 。字符串 恰好 由 `n / 2` 个开括号 `'['` 和 `n / 2` 个闭括号 `']'` 组成。​	
​	只有能满足下述所有条件的字符串才能称为 *平衡字符串* ：

- 字符串是一个空字符串，或者

- 字符串可以记作 AB ，其中 A 和 B 都是 *平衡字符串* ，或者
- 字符串可以写成 [C] ，其中 C 是一个 *平衡字符串* 。

​	你可以交换 任意 两个下标所对应的括号 任意 次数。
​	返回使 s 变成 *平衡字符串* 所需要的 最小 交换次数。


## 示例

示例 1：

```
输入：s = "][]["
输出：1
解释：交换下标 0 和下标 3 对应的括号，可以使字符串变成平衡字符串。
最终字符串变成 "[[]]" 。
```

示例 2：

```
输入：s = "]]][[["
输出：2
解释：执行下述操作可以使字符串变成平衡字符串：
- 交换下标 0 和下标 4 对应的括号，s = "[]][][" 。
- 交换下标 1 和下标 5 对应的括号，s = "[[][]]" 。
最终字符串变成 "[[][]]" 。
```

**示例 3：**

```
输入：s = "[]"
输出：0
解释：这个字符串已经是平衡字符串。
```

提示：
```
n == s.length
2 <= n <= 106
n 为偶数
s[i] 为'[' 或 ']'
开括号 '[' 的数目为 n / 2 ，闭括号 ']' 的数目也是 n / 2
```


## 我的题解：双指针遍历

​	第一步自然是把字符串转换为`1`和`1-`的数组，而后定义前指针`front`和后指针`back`，再从左往右遍历直到到某下标前缀和小于0，则将当前的`S[front]`我们假定此时已经从右侧`'借'`了一个`[`过来，然后开始从右往左遍历。在从右往左遍历的时候，找到一个1，把它反转为0，即相当于把刚刚在左侧添加的`[`还回到右侧，在这里完成了一次交换，`ans + 1`，然后继续从刚刚的`front`从左往右遍历，直到`front < back`为止。由于题目限制字符串 ***恰好*** 由 `n / 2` 个开括号 `'['` 和 `n / 2` 个闭括号 `']'` 组成，所以在两侧指针相撞之后一定可以使字符串平衡。


## 我的代码

```java
class Solution {
    public int minSwaps(String s) {
        int n = s.length();
        int[] S = new int[n];
        int front = 0, back = n-1;
        int sumLeft = 0, sumRight = 0;
        int ans = 0;
        for(int i = 0; i < n; i++){
            if(s.charAt(i)=='[')
                S[i] = 1;
            else
                S[i] = -1;
        }
        boolean flag = true; //true 代表从左往右 false 代表从右往左
        while(front < back){
            if(flag){
                sumLeft += S[front];
                if (sumLeft < 0){
                    S[front] = 1;
                    flag = false;
                }
                front = front+1;
            }
            if(!flag){
                if(S[back] == 1){
                    S[back] = -1;
                    flag = true;
                    sumLeft+=2;
                    ans++;
                }
                back = back-1;
            }
        }

        return ans;

    }
}
```


## 官方题解：猜测结论+构造答案

​	求前缀和的思路，感觉更符合算法题的思路。记 `cn[i]` 表示字符串 `s[0...i]` 的前缀和，其中左括号和右括号的处理方式与我的题解相同。如果所有的前缀和均大于等于0，则字符串 `s` 平衡。看到这里我豁然开朗，这里的判断方式和[LeetCode.2116](https://leetcode.cn/problems/check-if-a-parentheses-string-can-be-valid?envType=daily-question&envId=2025-03-23)的判断方式完全相同，如果我那天看了这道题解，今天早上就不会做那么久了。
​	然后猜测结论：

设 `cnt` 中的最小值为 `cnt[i]` ，那么最少需要交换的次数为：
$$
\lceil\frac{-cnt[i]}{2}\rceil
$$
​	其中 `⌈x⌉` 表示将`x`向上取整。以下解释原因：在`cnt[i]` 表示遍历的过程中，最多欠了`-cnt[i]`个左括号。为了使`s`平衡，我们需要在`i`左侧补上一些，而其唯一方法则是将前面的`]`和后面的`[`交换，一次交换会使得`cnt[i]`的值增加2(原本为-1，交换后为+1，Δ = 2), 因此至少交换$\lceil\frac{-cnt[i]}{2}\rceil$次。所以以构造出交换$\lceil\frac{-cnt[i]}{2}\rceil$次的方法为目标，希望每减少一次则`cnt[i]`的值减2，使用数学归纳法有：

- 当`-cnt[i] = 0`时，`s`平衡，需要的交换次数为0；
- 假设当`-cnt[i] = k`时需要交换的次数和我们的猜测相符合，则当 `-cnt[i] = k + 2`时：
  - 记`cnt`中第一个负数的出现位置为`first`，那么`s[first]`一定是右括号；
  - 记`cnt`中最后一个负数出现的为止为`last`，那么`last`一定不为`n-1`(因为`s`中左右括号数量相同)，并且`s[last +1 ]`一定是一个左括号；
  - 我们交换`s[first]`与`s[last+1]`。对于所有在`[0,first−1]∪[last+1,n−1)`范围内的下标，它们对应的`cnt`值均为不变（且均为非负数），对于所有在`[first,last]`范围内的下标，它们对应的`cnt`值均增加了 2。由于所有的负数都在`[first,last]`范围内，因此`cnt[i]`也会增加 2，那么我们通过一次交换就归纳到了`−cnt[i] = k`的情况。
- 值得注意的是，`-cnt = 1`的情况也会归纳到`-cnt[i] = 0`(而非`-cnt[i] = -1`)，这也是答案向上取整的原由。
​	通过数学归纳法给出了一种交换的构造，因此最少的交换次数即为$\lceil\frac{-cnt[i]}{2}\rceil$中的最小值。

其实和我的题解的思想是相同的，同样的有借有还，只不过我的方法仍然停留在模拟的阶段，而这个题解直接跳过了模拟的部分获得答案了。



## 官方题解代码

```java
class Solution {
    public int minSwaps(String s) {
        int cnt = 0, mincnt = 0;
        for (char ch : s.toCharArray()) {
            if (ch == '[') {
                cnt += 1;
            } else {
                cnt -= 1;
                mincnt = Math.min(mincnt, cnt);
            }
        }
        return (-mincnt + 1) / 2;
    }
}
```

