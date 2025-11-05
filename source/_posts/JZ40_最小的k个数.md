---
title: JZ40 最小的k个数
tags: [算法,排序]
categories: [剑指offer]
mathjax: true
math: true
date: 2025-09-01 22:23:10
---

# JZ40 最小的k个数

## 描述

给定一个长度为 n 的可能有重复值的数组，找出其中不去重的最小的 k 个数。

<!--more-->

例如数组元素是4,5,1,6,2,7,3,8这8个数字，则最小的4个数字是1,2,3,4(任意顺序皆可)。

数据范围：$0≤k,n≤10000$，数组中每个数的大小$0≤val≤1000$

要求：空间复杂度 $O(n)$ ，时间复杂度 $O(nlogk)$

**示例1**

```
输入：[4,5,1,6,2,7,3,8],4 
返回值：[1,2,3,4]
说明：返回最小的4个数即可，返回[1,3,2,4]也可以
```

**示例2**

```
输入：[1],0
返回值：[]
```

**示例3**

```
输入：[0,1,2,1,2],3
返回值：[0,1,1]
```

## 题解

整出来一个堆排序，上一次用到堆还是考研的数据结构里面考到了一次，这一次回顾一下。

堆是一棵完全二叉树，分大根堆和小根堆两种，大根堆指的就是每一个父节点都大于其子节点，小根堆反之，其子节点的大小顺序都不做要求。由于是完全二叉树，所以完全可以使用数组实现，$i$的子节点就是$i*2+1$和$i*2+2$。

堆的基础操作：

>- 插入元素
>
>  在数组末尾插入新元素
>
>  **上浮（heapify up）**
>
>  - 与父节点比较，如果违反堆序性质 → 交换
>  - 重复直到堆序恢复
>
>- 删除栈顶
>
>  删除根节点（堆顶最大/最小元素）
>
>  用数组末尾元素填充根节点
>
>  **下沉（heapify down）**
>
>  - 与左右子节点比较，违反堆序则交换
>  - 重复直到堆序恢复
>

**代码**


```C++
class Solution {
  public:
    vector<int> GetLeastNumbers_Solution(vector<int> input, int k) {
    vector<int> vec;
    if (input.size() < k || k == 0) return vec;

    priority_queue<int> maxHeap;  // 大根堆
    for (int i = 0; i < input.size(); ++i) {
        if (maxHeap.size() < k) {
            maxHeap.push(input[i]);
        } else if (input[i] < maxHeap.top()) {
            maxHeap.pop();
            maxHeap.push(input[i]);
        }
    }

    while (!maxHeap.empty()) {
        vec.push_back(maxHeap.top());
        maxHeap.pop();
    }

    reverse(vec.begin(), vec.end()); // 从小到大
    return vec;
}

};
```

