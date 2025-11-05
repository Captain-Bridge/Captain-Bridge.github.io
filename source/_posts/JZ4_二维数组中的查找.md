---
title: JZ4 二维数组中的查找
tags: [算法,搜索算法]
categories: [剑指offer]
mathjax: true
math: true
date: 2025-08-29 12:09:51
---

# JZ4 二维数组中的查找

## 描述

在一个二维数组array中（每个一维数组的长度相同），每一行都按照从左到右递增的顺序排序，每一列都按照从上到下递增的顺序排序。请完成一个函数，输入这样的一个二维数组和一个整数，判断数组中是否含有该整数。

<!--more-->

```
[
[1,2,8,9],
[2,4,9,12],
[4,7,10,13],
[6,8,11,15]
]
```

给定 target = 7，返回 true。

给定 target = 3，返回 false。

数据范围：矩阵的长宽满足 $0≤n,m≤500$ ， 矩阵中的值满足 $0≤val≤109$
进阶：空间复杂度 $O(1)$ ，时间复杂度 $O(n+m)$

**示例1**

```
输入：7,[[1,2,8,9],[2,4,9,12],[4,7,10,13],[6,8,11,15]]
返回值：true
说明：存在7，返回true   
```

**示例2**

```
输入：1,[[2]]
返回值：false
```

**示例3**

```
输入：3,[[1,2,8,9],[2,4,9,12],[4,7,10,13],[6,8,11,15]]
返回值：false
说明：不存在3，返回false   
```

## 题解

初见思路：这道题是上一题的进阶，我直观的想法是先向右找，再向下找。具体来说就是如果向右找找不到,而且发现当前数字还比目标大，就向下，并且向左找，若是找到了比当前数字小的，就继续向下，然后向右寻找，直到找到或不能再向下、向右为止。后面实现出了问题，直接改成了找到比当前大的就跳到下一层从头继续找。大G老师给出了右上角搜索法，学习一下。

**代码**

```C++
class Solution {
public:
    /**
     * 代码中的类名、方法名、参数名已经指定，请勿修改，直接返回方法规定的值即可
     *
     * 
     * @param target int整型 
     * @param array int整型vector<vector<>> 
     * @return bool布尔型
     */
    bool Find(int target, vector<vector<int> >& array) {
        int index = 0;
        int level = 0;
        while(level<array.size()&&level<array[0].size()&&index>=0&&level>=0){
            if(array[level][index]==target) return true;            //gotcha
            if(array[level][index]>target){                         //towards leftDown
                index=0;
                level++;
            }
            index++;
        }
        return false;
    }
};
```

**右上角搜索代码**

```C++
class Solution {
public:
    bool Find(int target, vector<vector<int>>& array) {
        if(array.empty() || array[0].empty()) return false;

        int row = 0, col = array[0].size() - 1;
        while(row < array.size() && col >= 0) {
            if(array[row][col] == target) return true;
            else if(array[row][col] > target) col--;
            else row++;
        }
        return false;
    }
};

```

