---
title: Tailscale 使用指南
date: 2026-05-22 11:26:57
description: 关于tailscale的使用方法以及各种玩转技巧
categories:
  - Network
  - VPN
tags:
  - tailscale
  - wireguard
  - VPN
  - NAT穿透
cover: /postimage/tailscale-note/tailscale-note.JPG
---

## tailscale基础
tailscale是一个基于WireGuard的VPN服务

## 安装tailscale
目标设备上运行以下命令即可：
```bash
curl -fsSL https://tailscale.com/download/ | sh
```
这将下载并安装最新的tailscale客户端。

## tailscale使用
### 客户端
没啥好说的

### 命令行
#### 连接
```bash
# 登录
tailscale login
#退出登录
tailscale logout
# 连接
tailscale up
# 断开
tailscale down
# 切换账号
tailscale switch [账号]
```

#### 基础状态类
```bash
# 在线状态与设备情况
tailscale status
# 查看ip
tailscale ip
# 网络诊断
tailscale netcheck
# ping其他设备
tailscale ping [设备名称]
```

#### Exit Node
```bash
# 查看Exit Node
tailscale exit
# 打开Exit Node
tailscale set --advertise-exit-node
# 广播局域网（远程就能访问192.168.1.0/24网段）
tailscale set --advertise-routes=192.168.1.0/24
```

#### 服务类
```bash
# 重启
/etc/init.d/tailscale restart
# 设置开机自启
/etc/init.d/tailscale enable
```

## 内网穿透功能
这个功能其实主要是由tailscale的虚拟局域网实现的，不是传统的NAT穿透      
在其他网络环境下打开这个就可以访问到所有的内网设备


## Subnet Router
开启后能在远程通过ssh内网ip直接访问设备，而不是通过tailscale的ip
```bash
tailscale set --advertise-routes=10.0.0.0/24 --accept-routes
```
这里`10.0.0.0/24`，24意思是前24位10.0.0是网络专属前缀，剩下8位0～255是是留给网络内设备分配的主机号  
可用ip范围为`10.0.0.1～10.0.0.254`   
起始点(网络地址)`10.0.0.0`, 结束点(广播地址)`10.0.0.255`

## Exit Node的使用
鉴于你车抽象的VPN，跑操还要连VPN然后每次都要登录，直接自建一个VPN  
```bash
tailscale set --advertise-exit-node
```

以下为连接Exit Node的测试（连接到南大的校园网） 
![连接Exit Node前，无法进入](/postimage/tailscale-note/nju0.png)
连接朋友的Exit Node之后   
![连接Exit Node后，进入南大内网](/postimage/tailscale-note/nju1.png)
<!-- managed-by-backend-api -->