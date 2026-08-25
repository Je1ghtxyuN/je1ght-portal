---
title: 从零自建网站（二）Ubuntu 服务器初始化与 Docker 安装
description: 系列第二篇：从购买 VPS 开始，初始化 Ubuntu 系统（用户、SSH、防火墙），安装 Docker 与 Docker Compose，规划服务器目录结构
categories:
  - Engineering
  - DevOps
  - 服务器
tags:
  - Ubuntu
  - VPS
  - SSH
  - Docker
  - 服务器
  - 运维
  - 自托管
---

## 前置条件

读完上一篇，本地应该已经有一个能跑的 Hexo 博客了。接下来搞一台服务器来托管它。

## VPS 的选择

VPS（Virtual Private Server）就是云服务商租的一台虚拟机。个人网站最低配就够——1 核 CPU、1GB 内存、20GB 硬盘，每月 5-6 美元。

我选择 **BandwagonHost** 的几个原因：(这几把啥)

- 线路对大陆相对友好（CN2 GIA）
- 支持支付宝付款
- 性价比合理

其他常见选择：Vultr、DigitalOcean、Linode，机房遍布全球，可以选离用户最近的节点。AWS Lightsail 也行，但个人博客用不上。

操作系统选 **Ubuntu 24.04 LTS**。LTS 版本有 5 年安全更新支持，社区资源丰富。选 Ubuntu 而不是 CentOS 或 Debian 的理由很简单——遇到问题能搜到的解决方案最多。

## 第一步：创建用户

拿到 VPS 的 IP 和 root 密码后，先 SSH 登录：

```bash
ssh root@<你的服务器IP>
```

第一件事：**不要用 root 做日常操作**。root 权限太高，一个误操作就能搞垮系统。创建一个普通用户并赋予 sudo 权限：

```bash
# 创建用户
adduser je1ght

# 加入 sudo 组
usermod -aG sudo je1ght

# 切换到新用户
su - je1ght

# 验证 sudo 可用
sudo whoami
# 应该输出: root
```

`adduser` 引导设置密码和基本信息。`usermod -aG sudo` 的 `-a` 是 append（追加），`-G` 是指定附加组。没写 `-a` 的话会把用户从其他组里踢出去——踩过这个坑。

## 第二步：配置 SSH 密钥登录

密码登录有两个问题：一是密码可能被暴力破解，二是每次登录都要输入。SSH 密钥是更安全也更方便的方式。

在**本地**生成密钥对（如果还没有的话）：

```bash
# 本地执行
ssh-keygen -t ed25519 -C "je1ght-server"
```

`-t ed25519` 指定 Ed25519 算法——比 RSA 更安全、密钥更短、签名更快。`-C` 就是个注释，方便在 `~/.ssh/id_ed25519.pub` 里认出是哪把钥匙。

把公钥传上服务器：

```bash
# 本地执行
ssh-copy-id je1ght@<服务器IP>
```

这个命令会把 `~/.ssh/id_ed25519.pub` 的内容追加到服务器上的 `~/.ssh/authorized_keys`。

然后在服务器上加固 SSH 配置：

```bash
# 服务器上执行
sudo nano /etc/ssh/sshd_config
```

修改以下几个值：

```text
# 禁止 root 直接 SSH 登录
PermitRootLogin no

# 禁止密码登录（只用密钥）
PasswordAuthentication no

# 禁止空密码
PermitEmptyPasswords no
```

`PermitRootLogin no` 意味着即使有人拿到了 root 密码也无法 SSH 进来，只能先以普通用户登录再 `sudo`。`PasswordAuthentication no` 关闭密码登录后，暴力破解就完全不可能了——没有密码可以猜。

改完后重启 SSH 服务：

```bash
sudo systemctl restart sshd
```

**重要**：关掉当前连接之前，新开一个终端测试能不能 SSH 登录。配置写错了的话，现有连接还能救命。

为了方便，我在本地的 `~/.ssh/config` 里加了个别名：

```text
Host je1ght-server
    HostName <服务器IP>
    User je1ght
    IdentityFile ~/.ssh/id_ed25519
```

之后 `ssh je1ght-server` 就等于 `ssh -i ~/.ssh/id_ed25519 je1ght@<IP>`。

## 第三步：配置防火墙

Ubuntu 默认安装了 UFW（Uncomplicated Firewall）。把默认规则设为拒绝所有入站连接，然后按需开放端口：

```bash
# 默认拒绝入站
sudo ufw default deny incoming
# 默认允许出站
sudo ufw default allow outgoing

# 开放 SSH
sudo ufw allow ssh
# 开放 HTTP 和 HTTPS（后面 nginx 会用到）
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 启用防火墙
sudo ufw enable

# 检查状态
sudo ufw status verbose
```

开放什么端口取决于跑了哪些服务。个人网站的话 80（HTTP）、443（HTTPS）、22（SSH）就够。MySQL 的 3306 不需要对外——Docker 内部通信有自己的网络，不走宿主机防火墙。

还可以安装 fail2ban 来防御暴力破解。它监控日志文件，发现可疑行为就自动封禁 IP。对于 SSH 这层额外保护很有用，尤其是密码登录还没关掉之前：

```bash
sudo apt update
sudo apt install fail2ban -y
```

fail2ban 默认配置就能防护 SSH，不需要额外设置。

## 第四步：安装 Docker

我们使用 Docker 官方的安装脚本，而不是 Ubuntu 仓库中的旧版本：

```bash
# 安装依赖
sudo apt update
sudo apt install ca-certificates curl -y

# 添加 Docker 官方 GPG 密钥
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# 添加 Docker 仓库
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
```

这里安装的是 `docker-compose-plugin`，而不是旧版的 `docker-compose`（Python 写的那个）。新版插件用法是 `docker compose`（中间没横线），和旧版 `docker-compose` 的命令格式略有不同。

把自己加到 docker 组，避免每次都要 sudo：

```bash
sudo usermod -aG docker $USER
```

**退出登录再重新登录**，组权限才会生效。或者 `newgrp docker` 在当前会话临时切换。

验证安装：

```bash
docker --version
docker compose version
docker run hello-world
```

`hello-world` 容器如果能正常输出欢迎信息，说明 Docker 已经可以正常创建和运行容器了。

## 第五步：规划服务器目录结构

部署之前先在服务器上建好目录结构：

```bash
# 网站源文件 —— Hexo portal 的完整代码
mkdir -p ~/code/websites/je1ght-platform/portal-source

# Docker 编排目录 —— docker-compose.yml 和容器相关配置
mkdir -p ~/docker/je1ght-platform/nginx
mkdir -p ~/docker/je1ght-platform/backend-api
```

最终服务器上的布局会是这样：

```text
/home/je1ght/
├── code/
│   └── websites/
│       └── je1ght-platform/
│           └── portal-source/        # Hexo portal（deploy.sh 同步到这里）
│               ├── source/
│               ├── public/           # ← Docker bind mount 挂载点
│               ├── node_modules/
│               └── _config.yml
│
└── docker/
    └── je1ght-platform/
        ├── .env                  # 环境变量（数据库密码、Admin 凭证）
        ├── docker-compose.yml    # 容器编排定义
        ├── backend-api/          # Hono API 源代码
        │   ├── src/
        │   ├── prisma/
        │   ├── package.json
        │   └── Dockerfile
        └── nginx/
            └── default.conf      # nginx 路由规则
```

左边放网站文件，右边放 Docker 编排，泾渭分明。portal-source 是 Hexo 的完整工作目录，Docker 容器通过 bind mount 直接读写里面的文件。docker-compose 和 nginx 配置这些基础设施扔 `.env` 旁边就行。

## Docker 网络准备

Docker Compose 用到两个网络：`database_default`（MySQL 在的这个网络）和 `internet`（对外暴露的 bridge）。MySQL 用的 `database_default` 是外部网络——意味着 `docker compose down` 不会把数据库一起干掉。

```bash
# 创建外部网络（如果还没有）
docker network create database_default
```

这个命令只需要运行一次。后面 docker-compose.yml 中声明 `external: true` 就是这个意思——复用已有的网络，不重新创建。

## 小结

服务器现在干净了：只有我一个人能 SSH 密钥登录，防火墙只开了必要端口，Docker 就绪，目录结构也摆好了。下一篇写 docker-compose.yml 和 nginx 配置，把后端服务用容器跑起来。