---
title: Docker Note
date: 2026-05-18 19:05:13
description: Docker 基本概念、常用命令和 docker-compose 的快速参考笔记
categories:
  - Engineering
  - DevOps
tags:
  - Docker
  - 容器
  - 运维
  - 笔记
cover: /postimage/docker-note.jpeg
---

## 作用
每台电脑的操作系统、环境变量、Python/C++ 库版本都不一样
Docker 的出现就是为了解决这个环境依赖问题。把代码和运行代码所需要的所有环境（系统、库、配置）全部打包在一起
创造多个隔离的单独环境，防止污染系统环境，随时创建随时删除   
利用镜像文件完整部署docker  

## 部件
- Image 镜像，用来部署容器的图纸
- Container 从镜像部署的实例，可以部署多个

## 命令
- docker ps 查看正在运行的docker
- docker logs [-f] [name] 查看某个docker的日志，-f的作用是实时播放
- docker start [name] 开启容器
- docker restart [name] 重启容器
- docker stop [name] 停止容器
- docker rm [name] 删除容器
- docker run -d --name [name] -p 8080:80 -v ~/html:/usr/share/nginx/html nginx

-d (Detached)：后台运行。如果没加，你关掉终端，网页就挂了。

-p 8080:80 (Port)：端口映射。左边是宿主机（Ubuntu），右边是容器内部。这相当于打了个洞，把外面的 8080 流量接到里面的 80 端口。

-v (Volume)：数据卷挂载。容器是阅后即焚的，删了容器数据全丢。用 -v 把宿主机的文件夹映射到容器里，相当于给集装箱插了个外接 U 盘，数据永远存在 Ubuntu 宿主机上。

## docker-compose
利用yaml格式把所有docker run的启动参数整理成一份文件，一键启动文件
```yaml
services:           
  db:               
    image: mysql:8.0 # 使用的镜像
    restart: always  # 崩溃了或者宿主机重启，自动拉起
    ports:
      - "3306:3306"  # 端口映射：外部 3306 连通内部 3306
    volumes:
      - ./data:/var/lib/mysql # 数据持久化
    environment:     # 环境变量：启动时传给容器的参数（密码、配置）
      MYSQL_ROOT_PASSWORD: your_password
```
- docker compose up -d 利用docker-compose.yml 创建docker
- docker compose down 
- docker compose logs -f
<!-- managed-by-backend-api -->