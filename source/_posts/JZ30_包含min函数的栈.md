---
title: JZ30 包含min函数的栈
tags: [数据结构,队列&栈]
categories: [剑指offer]
mathjax: true
math: true
date: 2025-08-28 16:49:46
---

# JZ30 包含min函数的栈

## 描述

定义栈的数据结构，请在该类型中实现一个能够得到栈中所含最小元素的 min 函数，输入操作时保证 pop、top 和 min 函数操作时，栈中一定有元素。

<!--more-->

此栈包含的方法有：

push(value):将value压入栈中

pop():弹出栈顶元素

top():获取栈顶元素

min():获取栈中最小元素

数据范围：操作数量满足 $0≤n≤300$，输入的元素满足 $∣val∣≤10000$ 
进阶：栈的各个操作的时间复杂度是 $O(1)$，空间复杂度是$O(n)$

**示例1**

```
输入： ["PSH-1","PSH2","MIN","TOP","POP","PSH1","TOP","MIN"]
返回值：-1,2,1,-1
```

## 题解

初见思路：一开始想要用一个栈加一个全局变量来追踪最小值，但是考虑到出栈后我还需要重新寻找当前栈内的最小值。所以考虑了一下决定使用双向链表来实现这个栈。链表指针始终追踪链表尾，以便于出入栈的操作，同时当寻找最小值时从链表尾反向遍历，寻找最小值。感觉当最小值用的不多的时候会更好，问一下大G老师还有什么看法。

原来我这是歪门邪道，确实，用链表实现的min()方法的时间复杂度是$O(n)$，大G老师给出了算法学习中常用的是辅助栈法，用辅助栈保存最小值，当前最小值若是出栈，则最小值栈中也同样出栈，如果入栈入了一个比当前最小值还要小的值，就在最小值栈里面也入一次。这样最小值栈顶的值就是当前栈中的最小值，所有方法的时间复杂度也都为$O(1)$。

**链表法代码**

```C++
#include <stack>
class Solution {
  public:
    void push(int value) {
        if(!tail){
            tail = new ListNode(value);
            tail->prev = nullptr;
            tail->next = nullptr;
        }else {
            ListNode* newNode = new ListNode(value);
            newNode->prev = tail;
            newNode->next = nullptr;
            tail->next = newNode;
            tail = tail->next;
        }
    }
    void pop() {
        tail = tail->prev;
        ListNode* popNode = tail->next;
        tail->next = nullptr;
        delete popNode;
    }
    int top() {
        return tail->val;
    }
    int min() {
        ListNode* curr = tail;
        int minVal = curr->val;
        while (curr) {
            if (curr->val < minVal) minVal = curr->val;
            curr = curr->prev;
        }
        return minVal;
    }
  private:

    struct ListNode {
        int val;
        struct ListNode* next;
        struct ListNode* prev;
        ListNode(int x) : val(x), next(nullptr),prev(nullptr) {}
    };
    ListNode* tail;
};
```

**辅助栈法代码**

```C++
#include <stack>
class Solution {
  public:
    void push(int x) {
        data.push(x);
        if (mins.empty() || x <= mins.top()) {
            mins.push(x);
        }
    }

    void pop() {
        if (data.empty()) return;
        if (data.top() == mins.top()) {
            mins.pop();
        }
        data.pop();
    }

    int top() {
        if (data.empty()) throw runtime_error("Stack is empty");
        return data.top();
    }

    int min() {
        if (mins.empty()) throw runtime_error("Stack is empty");
        return mins.top();
    }

  private:
    stack<int> data; // 数据栈
    stack<int> mins; // 最小值栈
};
```

