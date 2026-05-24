---
title: 博客书写模版
description: 简短摘要，会显示在首页卡片和 SEO 描述中
categories:
  - 技术笔记
  - 项目记录
tags:
  - 标签1
  - 标签2
  - 标签3
---

正文从这里开始。直接写 Markdown 即可。

## 二级标题

正文段落。**加粗文字**，*斜体文字*。

## 代码块

用三个反引号包裹，后面写上语言名称：

​```python
def hello_world():
    print("Hello, World!")
    return True
​```

​```javascript
const greeting = "Hello";
console.log(greeting);
​```

​```bash
docker ps -a
docker logs -f container-name
​```

​```yaml
services:
  backend:
    image: node:24-alpine
    ports:
      - "3001:3001"
​```

行内代码用单个反引号：`docker start [name]`

## 列表

- 无序列表
- 第二项
  - 嵌套项

1. 有序列表
2. 第二项

## 链接和图片

[链接文字](https://example.com)

![图片描述](/shared-assets/images/your-image.png)

## 引用

> 这是一段引用文字。

## 表格

| 列1 | 列2 | 列3 |
| --- | --- | --- |
| A   | B   | C   |
| D   | E   | F   |