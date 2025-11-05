---
title: LeetCode2360
tags: [DFS,BFS,图,拓扑排序]
categories:
  - LeetCode每日一题
  - LeetCode困难
mathjax: true
math: true
date: 2025-03-30 00:42:39
---

# [LeetCode.2360](https://leetcode.cn/problems/longest-cycle-in-a-graph):图中最长的环

​	拼劲全力做出来了一个时间复杂度$O(n)$的方法，最后还是TLE，然后查了一下才知道，$set$本身会吃很多复杂度，在最差情况下会额外增加$O(n)$的复杂度，所以$set$还是慎用的好。

<!-- more -->

## 题目描述

给你一个 `n` 个节点的 **有向图** ，节点编号为 `0` 到 `n - 1` ，其中每个节点 **至多** 有一条出边。

图用一个大小为 `n` 下标从 **0** 开始的数组 `edges` 表示，节点 `i` 到节点 `edges[i]` 之间有一条有向边。如果节点 `i` 没有出边，那么 `edges[i] == -1` 。

请你返回图中的 **最长** 环，如果没有任何环，请返回 `-1` 。

一个环指的是起点和终点是 **同一个** 节点的路径。

## 示例

示例1：

![2260_1](../post_images/2260_1.png)

```
输入：edges = [3,3,4,2,3]
输出去：3
解释：图中的最长环是：2 -> 4 -> 3 -> 2 。
这个环的长度为 3 ，所以返回 3 。
```

示例2：
![2360_2](../post_images/2360_2.png)

```
输入：edges = [2,-1,3,1]
输出：-1
解释：图中没有任何环。
```

提示：

```
n == edges.length
2 <= n <= 105
-1 <= edges[i] < n
edges[i] != i
```

## 题解：遍历

​	每个节点至多只有一个出边，所以说一个节点我们不管在什么情况下都只需要访问一次，访问一次过后这个节点不管是不是环的一部分，我们都不需要再一次访问它。然后我们只需要记录下每个节点在访问时是在路径上的第几个位置访问的即可，因为当访问到环尾时，只需要将环尾的访问路径位置减去环首的访问路径位置即可获得该环的长度。

## 我的代码

```C++
class Solution {
public:
    int longestCycle(vector<int>& edges) {
        int n = edges.size();
        int ans = -1;
        set<int> indexs; //使用set记录所有节点，当该节点被访问则erase掉这个节点，但是这个代码因为用set而TLE了
        for(int i = 0; i < n; i++){
            indexs.insert(i); //初始化set
        }
        while(!indexs.empty()){ //对仍未访问的节点进行DFS
            int next = *indexs.begin(); //访问指针 这道题给我一种链表的感觉
            map<int,int> path; //路径记录指针 记录结果为<图节点位置，在路径中的位置>
            int path_index = 0; //路径长度记录
            while(next!=-1){
                indexs.erase(next);
                path[next] = path_index;
                path_index +=1;
                next = edges[next]; //DFS
                if(next!=-1 && (path.find(next)!=path.end() || path.count(next)!=0)){
                    //如果下一个节点为空 或者 下一个节点已经在(本次、之前的访问中)访问过
                    break;
                }
            }
            if(next!=-1){ 
                //在访问指针不为-1的情况下结束while则代表找到了一个环 且此时next指向环首 path_index记录的是路径总长度
                if(path_index - path[next] > ans)
                    ans = path_index - path[next];
            }
        }
        return ans;
    }
};
```

复杂度分析：

- 时间复杂度：$O(n)$。从任意节点开始进行遍历，到结束时只会遍历所有独特的节点。

- 空间复杂度：$O(n)$，即为存储节点编号需要使用的空间。

## 题解代码

```c++
class Solution {
public:
    int longestCycle(vector<int>& edges) {
        int n = edges.size();
        vector<int> label(n);
        int current_label = 0, ans = -1;
        for (int i = 0; i < n; ++i) {
            if (label[i]) {
                continue;
            }
            int pos = i, start_label = current_label;
            while (pos != -1) {
                ++current_label;
                // 如果遇到了已经遍历过的节点
                if (label[pos]) {
                    // 如果该节点是这一次 i 循环中遍历的，说明找到了新的环，更新答案
                    if (label[pos] > start_label) {
                        ans = max(ans, current_label - label[pos]);
                    }
                    break;
                }
                label[pos] = current_label;
                pos = edges[pos];
            }
        }
        return ans;
    }
};
```

复杂度分析：

- 时间复杂度：$O(n)$。从任意节点开始进行遍历，到结束时只会遍历若干个之前没有遍历过的节点，以及至多一个之前遍历过的节点。前者总计为 $n$ 个节点，后者总计不超过 $n$ 个节点，因此时间复杂度为 $O(n)$。

- 空间复杂度：$O(n)$，即为存储节点编号需要使用的空间。
