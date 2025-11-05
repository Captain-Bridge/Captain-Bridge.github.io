---
title: 链表中倒数最后k个结点
tags: [数据结构, 链表]
categories: [剑指offer]
mathjax: true
math: true
date: 2025-08-16 21:40:28
---

# JZ22 链表中倒数最后k个结点

## 描述

 输入一个长度为 n 的链表，设链表中的元素的值为 $a_i$ ，返回该链表中倒数第k个结点。
如果该链表长度小于k，请返回一个长度为 0 的链表。

<!--more-->

数据范围：$0≤n≤10^5，0≤a_i≤10^9，0≤k≤10^9$
要求：空间复杂度 $O(n)$，时间复杂度 $O(n)$
进阶：空间复杂度 $O(1)$，时间复杂度 $O(n)$

例如输入{1,2,3,4,5},2时，对应的链表结构如下图所示：

![imgs](../post_images/JZ22_describe.png)

其中蓝色部分为该链表的最后2个结点，所以返回倒数第2个结点（也即结点值为4的结点）即可，系统会打印后面所有的结点来比较。

**实例1**

```
输入：{1,2,3,4,5},2
返回值：{4,5}
说明：返回倒数第2个节点4，系统会打印后面所有的节点来比较。 
```

**实例2**

```
输入：{2},8
返回值：{}
```

## 题解

链表只能单向遍历，不能逆向遍历，所以要获得最后$k$个节点，只需要获取链表长度，然后找到最后$k$个节点的起始位置$L-k$，然后返回即可。使用快慢指针也可以，快指针先行k步，若快指针还没走完$k$步就到终点，则链表长度不足，若走完了还没到终点，则此时慢指针出发，二者同速度前进，当快指针到达终点时，慢指针位置即为最后k个节点的起始点。

**代码**

```C++
/**
 * struct ListNode {
 *	int val;
 *	struct ListNode *next;
 *	ListNode(int x) : val(x), next(nullptr) {}
 * };
 */
#include <cstddef>
class Solution {
public:
    /**
     * 代码中的类名、方法名、参数名已经指定，请勿修改，直接返回方法规定的值即可
     *
     * 
     * @param pHead ListNode类 
     * @param k int整型 
     * @return ListNode类
     */
    ListNode* FindKthToTail(ListNode* pHead, int k) {
        // write code here
        ListNode* head = pHead;
        int length = 0;
        while(head){
            head = head->next;
            length++;
        }
        if(length<k){
            return NULL;
        }
        head = pHead;
        for(int i = 0; i < (length - k); i++){
            head = head->next;
        }
        return head;
    }
};
```
