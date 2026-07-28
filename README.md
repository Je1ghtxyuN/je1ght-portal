# Je1ght Portal

[je1ght.top](https://je1ght.top) 的源码仓库 — 个人网站、技术博客与作品集的统一门户。

## 这是什么

这是我的个人主页。它不只是一个博客— 我把写作、项目展示、联系方式和后台管理都放在同一个地方，自己运维。

如果你在找一个 Hexo + Hono 自建博客的参考实现，或者好奇后端 API 怎么写，这里面的代码应该对你有用。

## 技术栈

| 层       | 技术                                                                                             | 说明                               |
| -------- | ------------------------------------------------------------------------------------------------ | ---------------------------------- |
| 静态站点 | [Hexo 7](https://hexo.io/) + [Butterfly](https://github.com/jerryc127/hexo-theme-butterfly) 主题 | 博客内容、作品集、关于页面         |
| 后端 API | [Hono](https://hono.dev/) (Node.js)                                                              | 认证、评论、联系表单、站点配置管理 |
| 数据库   | MySQL + [Prisma](https://www.prisma.io/) ORM                                                     | 管理员账户、会话、内容与联系消息   |
| 反向代理 | Cloudflare CDN                                                                                   | DNS、TLS、缓存                     |
| 部署     | Docker 自托管 (Ubuntu)                                                                           | 非 Vercel/Netlify，完全自主可控    |

## 仓库结构

```
apps/blog-portal/     # Hexo 静态站点（公开门户）
apps/backend-api/     # Hono API 服务（认证、管理、评论、联系表单）
packages/shared-config/ # 站点品牌标识和多语言配置
infra/local-db/       # 本地开发数据库 Docker 配置
docs/                 # 架构决策记录和开发日志
```

## 本地开发

```bash
# 博客门户
cd apps/blog-portal
npm install
npm run dev          # hexo server

# 后端 API
cd apps/backend-api
cp .env.example .env  # 按需填写本地数据库凭据
npm install
npx prisma migrate dev
npm run dev          # 监听 3001 端口
```

## 验证与维护

门户的一键检查会依次运行单元测试、干净构建和生成结果验证：

```bash
cd apps/blog-portal
npm run check
```

后端使用 `npm test` 和 `npx prisma validate`。内容所有权、快照流程、
配置覆盖关系、联系表单和发布清单见 [维护指南](docs/MAINTENANCE.md)。
