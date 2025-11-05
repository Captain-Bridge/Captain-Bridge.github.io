---
title: 二叉搜索树的第k个节点
tags: [数据结构, 树]
categories: [剑指offer]
mathjax: true
math: true
date: 2025-08-16 21:40:28
---

# JZ54 二叉搜索树的第k个节点

## 描述

给定一棵结点数为n 二叉搜索树，请找出其中的第 k 小的$TreeNode$结点值。

<!--more--> 

- 返回第k小的节点值即可 
- 不能查找的情况，如二叉树为空，则返回-1，或者k大于n等等，也返回-1 
- 保证n个节点的值不一样 

数据范围： $0≤n≤1000，0≤k≤1000$，树上每个结点的值满足$0≤val≤1000$

进阶：空间复杂度 $O(n)$，时间复杂度 $O(n)$

如输入{5,3,7,2,4,6,8},3时，二叉树{5,3,7,2,4,6,8}如下图所示：  

![imgs](../post_images/JZ54_describe.png)

该二叉树所有节点按结点值升序排列后可得[2,3,4,5,6,7,8]，所以第3个结点的结点值为4，故返回对应结点值为4的结点即可。

**示例1**

```
输入：{5,3,7,2,4,6,8},3
返回值：4
```

**示例2**

```
输入：{},1
返回值：-1
```

## 题解

初见思路：二叉搜索树也就是平衡二叉树，我们若是想要找到其第k大的节点，只需要进行左中右的中序遍历就可以了，需要注意一些边界条件。

更深一步：如果使用~~队列~~栈的话，压进栈的过程可以统计树节点的数量$size$，然后找到出栈出到$size-k$个即可找到答案。

**代码**

```C++
/**
 * struct TreeNode {
 *	int val;
 *	struct TreeNode *left;
 *	struct TreeNode *right;
 *	TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
 * };
 */
class Solution {
public:
    /**
     * 代码中的类名、方法名、参数名已经指定，请勿修改，直接返回方法规定的值即可
     *
     * 
     * @param proot TreeNode类 
     * @param k int整型 
     * @return int整型
     */
    int KthNode(TreeNode* proot, int k) {
        stack<TreeNode*> st;
        TreeNode* curr = proot;
        while (curr||!st.empty()) {
            //1、把当前节点的所有最左侧子节点入栈
            while (curr) {
                st.push(curr);
                curr = curr->left;
            }
            //2、最左下方节点出栈
            curr = st.top(); 
            st.pop();
            k--;
            if(k==0)
            return curr->val;
            //3、转向右侧，若此时该节点的右子树为空，则curr为空，
            //	下一轮循环时会跳过循环步骤1,进入循环步骤2,从而找到该节点的父节点，实现左根右的中序遍历
            curr = curr->right;
        }
        return -1;
    }
};
```

