---
title: JZ9 用两个栈实现队列
tags: [数据结构,队列&栈]
categories: [剑指offer]
mathjax: true
math: true
date: 2025-08-28 16:26:07
---

# JZ9 用两个栈实现队列

## 描述

用两个栈来实现一个队列，使用n个元素来完成 n 次在队列尾部插入整数(push)和n次在队列头部删除整数(pop)的功能。 

<!--more-->

队列中的元素为int类型。保证操作合法，即保证pop操作时队列内已有元素。

数据范围：$n≤1000$

要求：存储n个元素的空间复杂度为$O(n)$ ，插入与删除的时间复杂度都是 $O(1)$

**示例1**

```
输入：["PSH1","PSH2","POP","POP"]
返回值：1,2
说明：
"PSH1":代表将1插入队列尾部
"PSH2":代表将2插入队列尾部
"POP“:代表删除一个元素，先进先出=>返回1
"POP“:代表删除一个元素，先进先出=>返回2   
```

**示例2**

```
输入：["PSH2","POP","PSH1","POP"]
返回值：2,1
```

## 题解

初见思路：两个栈的话，首先思考出队的情况，假定我们把数据全部压在某一个栈A中，按照入栈顺序，我们应当把A栈底的数据出队，我们只需要把它全部按顺序出栈并且入栈到另一个栈B中，结束后，栈B顶的数据就是栈A底部的数据，也就是我们需要出队的数据，此时将其出队，然后把剩下的数据再次按顺序出栈并且入到栈A中，就依旧保存了原本的数据顺序，这样入队的时候只需要在栈A中入队即可。

栈A的数据构成：（栈底）队首->（栈顶）队尾		栈B的数据构成：（栈底）队尾->（栈顶）队首

**代码**

```C++
#include <stack>
class Solution
{
public:
    void push(int node) {
       stack1.push(node);
    }

    int pop() {
        int front;
        if (!stack1.empty()) {
            while(!stack1.empty()){
                int curr = stack1.top();
                stack2.push(curr);
                stack1.pop();
            }
            front = stack2.top();
            stack2.pop();
            while(!stack2.empty()){
                int curr = stack2.top();
                stack1.push(curr);
                stack2.pop();
            }
        }
        return front;
    }

private:
    stack<int> stack1;
    stack<int> stack2;
};
```



