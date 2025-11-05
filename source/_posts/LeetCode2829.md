---
title: LeetCode2829
date: 2025-03-26 15:31:38
tags: [贪心,数学]
categories: [LeetCode每日一题, LeetCode中等]
mathjax: true
math: true
---

# [LeetCode.2829](https://leetcode.cn/problems/determine-the-minimum-sum-of-a-k-avoiding-array):k-avoiding 数组的最小总和

​	这道题我在解的时候只关注了贪心的算法，本来有试着去优化，后来发现好像没有什么优化的必要，就直接暴力拆了。

<!-- more -->

## 题目描述

给你两个整数 `n` 和 `k` 。

对于一个由 **不同** 正整数组成的数组，如果其中不存在任何求和等于 k 的不同元素对，则称其为 **k-avoiding** 数组。

返回长度为 `n` 的 **k-avoiding** 数组的可能的最小总和。

## 示例

示例1：

```
输入：n = 5, k = 4
输出：18
解释：设若 k-avoiding 数组为 [1,2,4,5,6] ，其元素总和为 18 。
可以证明不存在总和小于 18 的 k-avoiding 数组。
```

示例2：

```
输入：n = 2, k = 6
输出：3
解释：可以构造数组 [1,2] ，其元素总和为 3 。
可以证明不存在总和小于 3 的 k-avoiding 数组。 
```

提示：

```
1 <= n, k <= 50
```

## 我的题解：贪心

​	`index`从1开始，如果`index`和`k_avoiding`中的每一个数字组成数字对，如果它们的和不等于`k`，则将新的数字加入到`k_avoiding`中，如果它们的和等于`k`则不加入，去检索下一个`index`，直到`k_avoiding`中已加入的数字数量为`n`为止，此时返回`k_avoiding`中前`n`项和即可。

​	`size`用于记录已加入`k_avoiding`中的元素数量；`index`记录当前检查的数字。

## 我的代码

```c++
class Solution {
public:
    int minimumSum(int n, int k) {
        vector<int> k_avoiding = vector<int>(n,0);
        int index = 1;
        int size = 0;
        while(size<n){
            bool flag = true;
            for(int i = 0; i < size; i++){
                if(k_avoiding[i] + index == k){
                    flag = false;
                    break;
                }
            }
            if(flag){
                k_avoiding[size] = index;
                size++;
            }
            index++;
        }
        return accumulate(k_avoiding.begin(),k_avoiding.end(),0);
    }
};
```

复杂度分析：

- 时间复杂度：$O(n^2)$
- 空间复杂度：$O(n)$

`accumulate(vector.begin(),vector.end(),0)`，定义于`<numeric.h>`，用法：

​	求`vector.begin()`到`vector.end()`的和，并从`0`开始累加。要求容器内类型必须与第三个实参的类型匹配，或者可转换为第三个实参的类型。也可以用来连接字符串：

```c++
//这个函数调用的效果是：从空字符串开始，把vec里的每个元素连接成一个字符串。
string sum = accumulate(v.begin() , v.end() , string(" "));
```



## 官方题解：贪心 + 等差数列求和

​	根据题目要求，在k是奇数的情况下，如果某个正整数a在数组中，那么k-a则不能在数组中。反之亦然。但是题目要求总和最小，故而肯定选择a和k-a中更小的数字放入数组，并且从1开始挑选数字放入数组，直到$\lceil k/2 \rceil$为止。这之后的数字到k-1为止，都不能放入数组。如果此时数字还未到达n个，则需要从k开始，再挑选连续的$k-\lceil k/2 \rceil$个数字加入数组。因此最后的数组和是一段或两端等差数列求和的结果。

​	故而依靠一个等差数列求和的函数，即可获得答案。

## 官方题解代码

```C++
class Solution {
    public int minimumSum(int n, int k) {
        if (n <= k / 2) {
            return arithmeticSeriesSum(1, 1, n);
        } else {
            return arithmeticSeriesSum(1, 1, k / 2) + arithmeticSeriesSum(k, 1, n - k / 2);
        }
    }

    private int arithmeticSeriesSum(int a1, int d, int n) {
        return (a1 + a1 + (n - 1) * d) * n / 2;
    }
}
```

复杂度分析：

- 时间复杂度：$O(1)$
- 空间复杂度：$O(1)$