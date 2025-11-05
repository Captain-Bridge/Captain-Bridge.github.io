---
title: 从尾到头打印链表
tags: [数据结构, 链表]
categories: [剑指offer]
mathjax: true
math: true
date: 2025-08-16 21:40:28
---

# JZ6 从尾到头打印链表

## 描述

输入一个链表的头节点，按链表从尾到头的顺序返回每个节点的值（用数组返回）。

<!--more-->

如输入{1,2,3}的链表如下图:

![img](../post_images/JZ1)

返回一个数组为[3,2,1]

0 <= 链表长度 <= 10000

**示例1**

```
输入：{1,2,3}
返回值：[3,2,1]
```

**示例2**

```
输入：{67,0,24,58}
返回值：[58,24,0,67]
```

## 题解1

这道题的设计之处大概是在于我们无法像数组一样一开始就知道一个链表的长度，所以这道题设计成从尾到头地去输出。所以我的题解思路就是直接开辟答案数组$ans$，然后将链表从头到尾地放进去，再把数组倒置即可。

**代码**

```c++
/**
*  struct ListNode {
*        int val;
*        struct ListNode *next;
*        ListNode(int x) :
*              val(x), next(NULL) {
*        }
*  };
*/
#include <cstddef>
#include <cstdio>
#include <vector>
class Solution {
  public:
    vector<int> printListFromTailToHead(ListNode* head) {
        int i = 0;
        vector<int> ans;
        if (head == NULL) {
            return ans;
        }
        while (head) {
            ans.push_back(head->val);
            i++;
            head = head->next;
        }
        int temp;
        for (int j = 0; j < i / 2; j++) {
            temp = ans[j] ;
            ans[j] = ans[i - j - 1];
            ans[i - j - 1] = temp;
        }
        return ans;
    }
};

```

## 题解2

看了一下别人的题解，感觉自己好像自作多情了，这道题的考点应该是直接反转链表。 (- -)![图片说明](../post_images/JZ1_1)

**代码**

```c++
/**
*  struct ListNode {
*        int val;
*        struct ListNode *next;
*        ListNode(int x) :
*              val(x), next(NULL) {
*        }
*  };
*/
#include <cstddef>
#include <cstdio>
#include <vector>
class Solution {
  public:
    vector<int> printListFromTailToHead(ListNode* head) {
        ListNode* curr = head;
        ListNode* prev = NULL;
        while (head) {			//值得注意的是这里以head作为图中curr，以curr作为图中next，prev与图中相符
            curr = head->next;
            head->next = prev;
            prev = head;
            head = curr;
        }
        vector<int> ans;
        while(prev){
            ans.push_back(prev->val);
            prev = prev->next;
        }
        return ans;
    }
};

```

