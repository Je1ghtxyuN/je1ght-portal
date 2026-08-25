---
title: KMP 算法
date: 2026-05-31 12:51:57
description: 随手记录
categories:
  - 数据结构与算法
  - 算法基础
tags:
  - 算法
---

## 碎碎念
上个学期学数据结构学的kmp，这个学期学算法做oj的时候又碰到了，但是忘了（我真废物啊），随手记录一下。
## 题目
给定文本串s与模式串t，求s中有多少个子串与t相同，两个子串视为不同仅当他们长度不等或起始位置不同。

Input

第一行输入T(T<=100)表示有T组数据。每组数据先输入两个正整数n、m(1<=n<=100000,1<=m<=n)，分别表示文本串与模式串长度。紧接着输入两行字符串，即为s、t。

Output

输出T行正整数，第i行表示第i组文本串中有多少个子串与模式串相同。

## 思路
维护两个指针：主串指针i和模式串指针j，字符串都是从下标1开始  
主串指针永不回退  
维护一个next数组，当失配的时候按照next数组回退  
s[i]==p[j]就i++,j++，当j==t.size()的时候就是找到了一个，计数+1，也是按照next数组回退  
实际实现字符串的下标都从1开始，要注意j也代表已经匹配的长度，所以j=0可以用作哨兵  
kmp两层循环的  

```cpp
#include <iostream>
#include <vector>
#include <string>
using namespace std;

int T, n, m;

int main()
{
    cin >> T;
    for (int k = 0; k < T; k++)
    {
        cin >> n >> m;
        char s[100010], t[100010];
        // 索引均从1开始
        cin >> (s + 1) >> (t + 1);
        vector<int> next(m + 1, 0);
        // 算法开始
        // 计算next数组
        for (int i = 2, j = 0; i <= m; i++) 
        {
            while (j && t[i] != t[j + 1])
                j = next[j];
            if (t[i] == t[j + 1])
                j++;
            next[i] = j;
        }
        // kmp
        int cnt = 0;
        for (int i = 1, j = 0; i <= n; i++)
        {
            while (j && s[i] != t[j + 1]) 
                j = next[j];
            if (s[i] == t[j + 1]) 
                j++;
            if (j == m) 
            {
                cnt++;
                j = next[j];
            }
        }
        cout << cnt << endl;
    }
}
```

其实仔细看会发现计算next和kmp的循环很相似，一个是对模式串遍历，一个是对主串遍历   
然后两个循环里都有一个统一的结构   
```cpp
            while (j && t[i] != t[j + 1])
                j = next[j];
            if (t[i] == t[j + 1])
                j++;
            //后续根据是求next还是kmp
```
<!-- managed-by-backend-api -->