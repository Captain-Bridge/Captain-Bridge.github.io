---
title: LeetCode2012
tags: [数组]
categories:
  - LeetCode每日一题
  - LeetCode中等
mathjax: true
math: true
date: 2025-03-30 21:41:16
---

# [LeetCode.2012](https://leetcode.cn/problems/sum-of-beauty-in-the-array):数组美丽值求和

​	这道题是我今年开始打卡的时候做的第一道题，感觉这道题最难的还是对题目的理解，还是那句话，叽里咕噜说了半天美丽值，最后还是让人感觉看不懂。

<!-- more -->

## 题目描述

给你一个下标从 **0** 开始的整数数组 `nums` 。对于每个下标 `i`（`1 <= i <= nums.length - 2`），`nums[i]` 的 **美丽值** 等于：

- `2`，对于所有 `0 <= j < i` 且 `i < k <= nums.length - 1` ，满足 `nums[j] < nums[i] < nums[k]`
- `1`，如果满足 `nums[i - 1] < nums[i] < nums[i + 1]` ，且不满足前面的条件
- `0`，如果上述条件全部不满足

返回符合 `1 <= i <= nums.length - 2` 的所有 `nums[i]` 的 **美丽值的总和** 。

## 示例

示例1：

```
输入：nums = [1,2,3]
输出：2
解释：对于每个符合范围 1 <= i <= 1 的下标 i :
- nums[1] 的美丽值等于 2
```

示例2：

```
输入：nums = [2,4,6,4]
输出：1
解释：对于每个符合范围 1 <= i <= 2 的下标 i :
- nums[1] 的美丽值等于 1
- nums[2] 的美丽值等于 0
```

示例3：

```
输入：nums = [3,2,1]
输出：0
解释：对于每个符合范围 1 <= i <= 1 的下标 i :
- nums[1] 的美丽值等于 0
```

提示：

```
3 <= nums.length <= 105
1 <= nums[i] <= 105
```

## 题解：

美丽值只有三种取值，0，1，2：

- 取值为2的情况要求这个值严格大于左侧所有的值且其应当严格小于后面所有的值，所以说取值为2的情况每个数组至多只有一个。$ans = ans + 2$
- 取值为1的情况则相对多一些，首先要排除掉这个值取2的情况(取2的情况必定满足取1的情况)，然后判断这个值是否大于左侧且小于右侧即可。$ans = ans + 1$
- 其它情况取值为0，则不需要特殊判断。

判断三种取值的情况后剩下的就很简单了，只需要正向遍历一遍，寻找严格大于所有前缀的值，并将其标记，然后再逆向遍历一遍，寻找是否有值在严格大于前缀的情况下也严格小于后缀，并且在这里找出满足取值为1的情况，并将得分累加到$ans$中就可以了。

## 代码

```java
class Solution {													  //这里使用了官方题解的代码
    public int sumOfBeauties(int[] nums) {
        int n = nums.length;
        int[] state = new int[n];
        int pre_max = nums[0];
        for (int i = 1; i < n - 1; i++) {								//正向遍历
            if (nums[i] > pre_max) {
                state[i] = 1;
                pre_max = nums[i];
            }
        }
        int suf_min = nums[n - 1];
        int res = 0;
        for (int i = n - 2; i > 0; i--) {								//逆向遍历
            if (state[i] == 1 && nums[i] < suf_min) {					 //取值为2的判断
                res += 2;
            } else if (nums[i - 1] < nums[i] && nums[i] < nums[i + 1]) {   //取值为1的判断
                res += 1;
            }
            suf_min = Math.min(suf_min, nums[i]);
        }
        return res;
    }
}
```

复杂度分析

- 时间复杂度：$O(n)$，其中 $n$ 是 $nums$ 的长度。我们遍历了两次 $nums$，每次遍历的时间复杂度为 $O(n)$，因此总体时间复杂度为 $O(n)$。

- 空间复杂度：$O(n)$。使用标记状态数组 $state$ 的空间复杂度为 $O(n)$。
