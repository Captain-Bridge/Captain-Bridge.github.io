---
title: LeetCode2711
date: 2025-03-25 10:28:29
tags: [数组,哈希表,矩阵]
categories: [LeetCode每日一题, LeetCode中等]
mathjax: true
math: true
---

# [LeetCode.2711](https://leetcode.cn/problems/difference-of-number-of-distinct-values-on-diagonals/):对角线上不同值的数量差

​	这一道题主要关注数组、对角线，相关标签里面使用的是哈希表，我使用集合解决的这个问题。和[2612](https://leetcode.cn/problems/minimum-reverse-operations)同样的，题干有些模糊难懂，要仔细审题。

<!-- more -->

## 题目描述

给你一个下标从 `0` 开始、大小为 `m x n` 的二维矩阵 `grid` ，请你求解大小同样为 `m x n` 的答案矩阵 `answer` 。

矩阵 `answer` 中每个单元格 `(r, c)` 的值可以按下述方式进行计算：

- 令 `topLeft[r][c]` 为矩阵 `grid` 中单元格 `(r, c)` 左上角对角线上 **不同值** 的数量。
- 令 `bottomRight[r][c]` 为矩阵 `grid` 中单元格 `(r, c)` 右下角对角线上 **不同值** 的数量。

然后 `answer[r][c] = |topLeft[r][c] - bottomRight[r][c]|` 。

返回矩阵 `answer` 。

**矩阵对角线** 是从最顶行或最左列的某个单元格开始，向右下方向走到矩阵末尾的对角线。

如果单元格 `(r1, c1)` 和单元格 `(r, c) `属于同一条对角线且 `r1 < r` ，则单元格 `(r1, c1)` 属于单元格 `(r, c)` 的左上对角线。类似地，可以定义右下对角线。

## 示例

示例 1：

![](/post_images/2711.png)

```
输入：grid = [[1,2,3],[3,1,5],[3,2,1]]
输出：[[1,1,0],[1,0,1],[0,1,1]]
解释：第 1 个图表示最初的矩阵 grid 。 
第 2 个图表示对单元格 (0,0) 计算，其中蓝色单元格是位于右下对角线的单元格。
第 3 个图表示对单元格 (1,2) 计算，其中红色单元格是位于左上对角线的单元格。
第 4 个图表示对单元格 (1,1) 计算，其中蓝色单元格是位于右下对角线的单元格，红色单元格是位于左上对角线的单元格。
- 单元格 (0,0) 的右下对角线包含 [1,1] ，而左上对角线包含 [] 。对应答案是 |1 - 0| = 1 。
- 单元格 (1,2) 的右下对角线包含 [] ，而左上对角线包含 [2] 。对应答案是 |0 - 1| = 1 。
- 单元格 (1,1) 的右下对角线包含 [1] ，而左上对角线包含 [1] 。对应答案是 |1 - 1| = 0 。
其他单元格的对应答案也可以按照这样的流程进行计算。
```

示例2：

```
输入：grid = [[1]]
输出：[[0]]
解释：- 单元格 (0,0) 的右下对角线包含 [] ，左上对角线包含 [] 。对应答案是 |0 - 0| = 0 。
```

提示：

```
m == grid.length
n == grid[i].length
1 <= m, n, grid[i][j] <= 50
```

## 我的题解：遍历 + 集合

​	一般看到对角线的问题，很少会有TLE的出现，只需要遍历获得所有的结果即可。对每一个位置，设两个集合`topLeft`和`bottomRight`，利用集合中元素不可重复的特性，在把左上对角线的所有值装入`topLeft`，右下对角线所有值装入`bottomRight`后，`topLeft.size()`即为题干中所说的`topLeft[r][c]`， `bottomRight[r][c]` 同理。最终求取二者的差的绝对值即为`ans[r][c]`。

## 我的代码

```C++
class Solution {
public:
    vector<vector<int>> differenceOfDistinctValues(vector<vector<int>>& grid) {
        int m = grid.size();
        int n = grid[0].size();
        vector<vector<int>> ans(m, vector<int>(n,0));
        for(int i = 0; i < m; i++){
            for(int j = 0; j < n; j++){
                set<int> topLeft;
                set<int> bottomRight;
                int index_i = i;
                int index_j = j;
                while(min(index_i-1 ,index_j-1)>=0){
                    topLeft.insert(grid[index_i-1][index_j-1]);
                    index_i -= 1;
                    index_j -= 1;
                }
                index_i = i;
                index_j = j;
                while(index_i+1 < m && index_j+1 < n){
                    bottomRight.insert(grid[index_i+1][index_j+1]);
                    index_i += 1;
                    index_j += 1;
                }
                ans[i][j] = abs((int)topLeft.size() - (int)bottomRight.size());
            }
        }
        return ans;
    }
};
```

复杂度分析：

- 时间复杂度：$O(m × n × min(m,n))$
- 空间复杂度：$O(min(m,n))$

需要注意的是，`set.size()`的返回值为`Integer`类型，需要将其转换为`int`类型，再使用`abs()`方法。

## 官方题解

官方题解使用的方法1和我使用的方法一模一样，在实现时同样的使用了set。

方法二：前缀和

​	<u>***观察到***</u>在同一个对角线上的不同单元格，它们在某一个方向上的对角线会高度重合。我们利用「前缀和」的思路，可以优化方法一。

​	我们从第一行和第一列，向右下方向出发，用哈希表记录不同元素，这样就可以得到这些单元格，左上角对角线上不同值数量。
​	同理我们可以从最后一行和最后一列出发，向左上方向出发，用哈希表记录不同元素，这样就可以得到这些单元格，右下角对角线上不同值数量。

最后我们对每个单元格求差值的绝对值，就得到最后的答案。

## 题解代码

```C++
class Solution {
public:
    vector<vector<int>> differenceOfDistinctValues(vector<vector<int>>& grid) {
        int m = grid.size();
        int n = grid[0].size();
        vector<vector<int>> res(m, vector<int>(n, 0));

        for (int i = 0; i < m; ++i) {
            int x = i, y = 0;
            set<int> s;
            while (x < m && y < n) {
                res[x][y] += s.size();
                s.insert(grid[x][y]);
                x += 1;
                y += 1;
            }
        }

        for (int j = 1; j < n; ++j) {
            int x = 0, y = j;
            set<int> s;
            while (x < m && y < n) {
                res[x][y] += s.size();
                s.insert(grid[x][y]);
                x += 1;
                y += 1;
            }
        }

        for (int i = 0; i < m; ++i) {
            int x = i, y = n - 1;
            set<int> s;
            while (x >= 0 && y >= 0) {
                res[x][y] -= s.size();
                res[x][y] = abs(res[x][y]);
                s.insert(grid[x][y]);
                x -= 1;
                y -= 1;
            }
        }

        for (int j = n - 2; j >= 0; --j) {
            int x = m - 1, y = j;
            set<int> s;
            while (x >= 0 && y >= 0) {
                res[x][y] -= s.size();
                res[x][y] = abs(res[x][y]);
                s.insert(grid[x][y]);
                x -= 1;
                y -= 1;
            }
        }

        return res;
    }
};
```

复杂度分析：

- 时间复杂度：`O( m × n )`。
- 空间复杂度：`O( min( m, n ) )`。

## set相关操作

```
set.begin()			//返回set容器的第一个元素
set.end()			//返回set容器的最后一个元素
set.clear()			//删除set容器中的所有的元素
set.empty()			//判断set容器是否为空
set.max_size()		//返回set容器可能包含的元素最大个数
set.size()			//返回当前set容器中的元素个数
set.rbegin()		//返回的值和end()相同
set.rend()			//返回的值和rbegin()相同
set.count(obj)		//查找set中某个元素出现的次数,即查找set中是否存在该元素
```

