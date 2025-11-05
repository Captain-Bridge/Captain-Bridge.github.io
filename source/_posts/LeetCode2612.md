---
title: LeetCode2612
date: 2025-03-24 03:07:10
tags: [BFS,数组,有序集合]
categories: [LeetCode每日一题, LeetCode困难]
mathjax: true
math: true
---

# [LeetCode.2612](https://leetcode.cn/problems/minimum-reverse-operations):最少反转操作数

​	这道题没有做出来，捣鼓半天，最后失去耐心了，另外从这道题开始，后面都会用`C++`去做了。沟槽的`C++`，还不得不学。这道题的题干描述很复杂，叽里咕噜说了半天，也让人看不懂讲的是什么东西。但是解的过程还是很精彩的，首先是考虑`i`的移动范围，其次是考虑边界，代码的实现用到了二叉平衡树，甚至法2还用到了并查集，是一道值得多复习的题目。

<!-- more -->

## 题目描述

给定一个整数 `n` 和一个整数 `p`，它们表示一个长度为 `n` 且除了下标为 `p` 处是 `1` 以外，其他所有数都是 `0` 的数组 `arr`。同时给定一个整数数组 `banned` ，它包含数组中的一些限制位置。在 `arr` 上进行下列操作：

- 如果单个 1 不在 `banned` 中的位置上，反转大小为 `k` 的 **子数组**。

返回一个包含 `n` 个结果的整数数组 `answer`，其中第 `i` 个结果是将 `1` 放到位置 `i` 处所需的 **最少** 翻转操作次数，如果无法放到位置 `i` 处，此数为 `-1` 。

## 示例

示例 1：

```
输入：n = 4, p = 0, banned = [1,2], k = 4
输出：[0,-1,-1,1]
解释：
- 一开始 1 位于位置 0，因此我们需要在位置 0 上的操作数是 0。
- 我们不能将 1 放置在被禁止的位置上，所以位置 1 和 2 的答案是 -1。
- 执行大小为 4 的操作以反转整个数组。
- 在一次操作后，1 位于位置 3，因此位置 3 的答案是 1。
```

示例 2：

```
输入：n = 5, p = 0, banned = [2,4], k = 3
输出：[0,-1,-1,-1,-1]
解释：
- 一开始 1 位于位置 0，因此我们需要在位置 0 上的操作数是 0。
- 我们不能在 [0, 2] 的子数组位置上执行操作，因为位置 2 在 banned 中。
- 由于 1 不能够放置在位置 2 上，使用更多操作将 1 放置在其它位置上是不可能的。
```

示例 3：

```
输入：n = 4, p = 2, banned = [0,1,3], k = 1
输出：[-1,-1,0,-1]
解释：
执行大小为 1 的操作，且 1 永远不会改变位置。
```

提示 ：

```
1 <= n <= 105
0 <= p <= n - 1
0 <= banned.length <= n - 1
0 <= banned[i] <= n - 1
1 <= k <= n 
banned[i] != p
banned 中的值 互不相同 。
```

## 官方题解法1：广度优先搜索（BFS） + 平衡树

​	要求从p的位置不经过`banned`转移到其他位置的最少转移次数。

​	***<u>不难想到</u>*** 使用广度优先搜索解决此问题，对于每一个位置`i`，我们枚举其所有转移方式，即反转哪个子数组，可以得到`i`能够转移到的所有位置，但是本方法复杂度较高，为`O(n(n-k))`，因为共有`n`个位置，每个位置有`O(n-k+1)`个子数组可以反转。但是由此我们可以看出，有很多位置`i`其实是被重复检查了，实际上位置`i`一旦可达，则不需要再次检查。只需要优化转移的方式即可。

​	首先考虑位置`i`可以转移到的位置。对于子数组`[L,R]`中的任意下标`i`，其反转后的下标为`L+R-i`。当子数组向左或向右滑动时，L和R同时增加或减少1，那么反转后的下标就增加或增加2。也就是说，奇偶数下标之间的转移是分别连续的。比如对于下标`i`来说，其经过反转可达的位置只有`k-i-1, k-i+1, k−i+3, ..., i+k−1`。

```
子数组[0,5]: 
取i = 3
	[0(L), 1, 2, 3(i), 4, 5(R)]
反转：
	[0(R), 1, 2(i), 3, 4, 5(L)]
```

​	接着考虑反转的范围，容易发现其受边界的约束（翻不出五行山）。若不考虑数组的起始和结束范围，`i`经过一次翻转后的位置的范围是`[i-k+1, i+k-1]`。当子数组在最左边时，`L=0，R=k-1`，`i`在翻转后是`0+(k−1)−i = k−i−1`。当子数组在最右边时，`L=n−k,R*=n−1`，`i`在翻转后是`(n−k)+(n−1)−i = 2n−k−i−1`。综上，`i`在经过1次翻转后的范围是：
$$
[\max(i-k+1,k-i-1),\min(i+k-1,2n-k-i-1)]
$$
​	最后，使用平衡树分别维护偶数下标和奇数下标，使用BFS检查所有位置。由于平衡树维护的是尚未到达的位置，对于banned中的下标，不添加到平衡树中即可。

## 法1代码

```c++
class Solution {
public:
    vector<int> minReverseOperations(int n, int p, vector<int>& banned, int k) {
        unordered_set<int> ban{banned.begin(), banned.end()};
        set<int> sets[2];
        for (int i = 0; i < n; ++i) {
            if (i != p && !ban.count(i)) {
                sets[i % 2].insert(i);
            }
        }
        vector<int> ans(n, -1);
        queue<int> q;
        q.push(p);
        ans[p] = 0;
        while (!q.empty()) {
            int i = q.front();
            q.pop();
            int mn = max(i - k + 1, k - i - 1);
            int mx = min(i + k - 1, n * 2 - k - i - 1);
            auto it = sets[mx % 2].lower_bound(mn);
            while (it != sets[mx % 2].end()) {
                if (*it > mx) {
                    break;
                }
                ans[*it] = ans[i] + 1;
                q.push(*it);
                it = sets[mn % 2].erase(it);
            }
        }
        return ans;
    }
};
```

## 官方题解法2：BFS + 并查集

​	在法1的前提下，避免重复检查的另一种思路是使用并查集，已经合并的元素删除。如果要删除一个元素，可以将它和下一个元素合并，从而在下一次删除时跳过已删除的元素。

## 法2代码

```c++
class Solution {
public:
    int find(vector<int>& f, int x) {
        return f[x] == x ? x : f[x] = find(f, f[x]);
    }
    void merge(vector<int>& f, int x, int y) {
        int fx = find(f, x), fy = find(f, y);
        f[fx] = fy;
    }
    vector<int> minReverseOperations(int n, int p, vector<int>& banned, int k) {
        vector<vector<int>> fa(2, vector<int>(n + 2));
        iota(fa[0].begin(), fa[0].end(), 0);
        iota(fa[1].begin(), fa[1].end(), 0);
        for (int ban : banned) {
            merge(fa[ban % 2], ban, ban + 2);
        }
        vector<int> ans(n, -1);
        queue<int> q;
        q.push(p);
        ans[p] = 0;
        merge(fa[p % 2], p, p + 2);
        while (!q.empty()) {
            int i = q.front();
            q.pop();
            int mn = max(i - k + 1, k - i - 1);
            int mx = min(i + k - 1, n * 2 - k - i - 1);
            for (int j = mn; j <= mx;) {
                int fi = find(fa[mn % 2], j);
                if (fi > mx) {
                    break;
                }
                ans[fi] = ans[i] + 1;
                q.push(fi);
                merge(fa[mn % 2], fi, fi + 2);
                j = fi + 2;
            }
        }
        return ans;
    }
};
```

## 并查集

并查集是一种用于管理元素所属集合的数据结构，实现为一个森林，其中每棵树表示一个集合，树中的节点表示对应集合中的元素。

顾名思义，并查集支持两种操作：

- 合并（Union）：合并两个元素所属集合（合并对应的树）

- 查询（Find）：查询某个元素所属集合（查询对应的树的根节点），这可以用于判断两个元素是否属于同一集合

并查集在经过修改后可以支持单个元素的删除、移动；使用动态开点线段树还可以实现可持久化并查集。