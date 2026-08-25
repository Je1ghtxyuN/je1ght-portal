---
title: 从零自建网站（一）Hexo 本地构建与项目结构
date: 2026-05-25 02:04:00
description: 系列第一篇：为什么选择 Hexo，Butterfly 主题的安装与配置，monorepo 项目结构拆解，以及如何本地写文章、配置多语言、实时预览
categories:
  - Engineering
  - DevOps
  - 静态站点
tags:
  - Hexo
  - Butterfly
  - 自托管
  - 博客
  - 静态网站
cover: /postimage/self-hosted-website/IMG_3993.JPG
---

## 为什么搭博客

最近AI agent也是越来越好用了，于是我就想把之前的React SPA博客重构一下。而且之前的React SPA博客也存在一个问题，就是我是把数据库挂载在google firebase的东京服务器上，中国大陆是无法访问的。很多托管平台在国内要么慢、要么被墙。在我拥有了自己的n100主机之后，采取自托管 + Cloudflare 可以最大程度优化两地访问体验。

这个系列文章记录我从零搭建个人网站（算是吧，因为之前的React SPA太简单）的完整过程。

## 静态网站生成器的选择

市面上主流的静态网站生成器有三个方向：

| 类型            | 代表             | 特点                          |
| --------------- | ---------------- | ----------------------------- |
| Markdown → HTML | Hexo, Hugo       | 写 Markdown，生成纯静态 HTML  |
| React → SSG     | Next.js, Gatsby  | React 组件在构建时渲染成 HTML |
| CMS 驱动        | WordPress, Ghost | 数据库 + 模板引擎             |

我选择 **Hexo** 。主题选用**Butterfly**。

- **Hexo** 生态成熟，插件多，中文社区活跃（作者是台湾开发者 `tommy351`）
- **Butterfly 主题** 由 `jerryc127` 维护，功能全面（搜索、评论、相册、多语言），视觉简洁优雅
- 纯静态输出，部署到 nginx 不需要 Node.js 运行时
- `hexo generate` 构建速度够快（几十篇文章毫秒级）

## 项目结构

这个项目是个手动 monorepo——没用 pnpm workspace 或者 turborepo，每个子项目自己装自己的 `node_modules`，谁也不依赖谁。

骨架大概长这样：

- `apps/blog-portal/` — Hexo 静态站点。`_config.yml` 管框架行为，`_config.butterfly.yml` 管主题外观，`source/` 下面全是文章和页面，`hexo generate` 一把输出到 `public/`。后面因为要自定义首页，在 `scripts/` 里塞了不少脚本。
- `apps/backend-api/` — Hono API 服务器，Prisma + MySQL。处理文章管理、联系表单这些动态功能。
- `packages/shared-config/` — 就一个 `site-identity.json`，放了品牌名称、路由路径、i18n 语言列表。portal 和 backend 都可以读这份数据，改一处两边生效。
- `packages/shared-assets/` — 头像、favicon、背景图这些公共资源，通过 symlink 在 portal 里引用。
- `infra/` — `docker-compose.yml` 加 nginx 配置，服务器上跑的那套。
- `scripts/deploy.sh` — 部署脚本，后面第五篇会逐行拆。

## 站点与主题配置 

Hexo 有两层配置：根目录的 `_config.yml` 是Hexo框架自己的配置，`_config.butterfly.yml` 是Butterfly主题的配置。Butterfly启动的时候覆盖node_modules下的主题默认配置。

Hexo的加载顺序是：先加载 `_config.yml`确定站点基本行为，再加载 `_config.butterfly.yml`确定主题外观。


`_config.yml` 中配置示例：

```yaml
url: https://je1ght.top        # 生产环境 URL，影响 permalink 和 SEO
permalink: posts/:title/        # 文章 URL 格式
render_drafts: false            # 不渲染 _drafts 目录中的草稿
future: true                    # 允许发布日期设为未来时间
search:                         # 本地搜索（不需要第三方服务）
  path: search.json
  content: true
```


`_config.butterfly.yml` 的配置示例：
```yaml
# 代码块配置
code_blocks:
  # 代码高亮主题: darker / pale night / light / ocean / false
  theme: darker
  # macOS 风格圆点按钮
  macStyle: false
  # 代码块高度限制（单位 px），false = 不限制
  height_limit: false
  # 代码块自动换行
  word_wrap: false

  # 工具栏
  # 显示复制按钮
  copy: true
  # 显示语言标签
  language: true
  # true = 默认折叠代码块 | false = 展开 | none = 展开并隐藏折叠按钮
  shrink: false
  # 全屏查看代码
  fullpage: false
# 文章封面
cover:
  # 首页是否显示封面
  index_enable: true
  # 侧边栏是否显示封面
  aside_enable: true
  # 归档页是否显示封面
  archives_enable: true
  # 文章未设置封面时使用的默认封面
  default_cover:
    # - xxx.jpg

```
## 创建新页面

在 `source/` 下新建一个目录，里面放一个 `index.md`。Hexo 会把每个这样的目录渲染为一个独立页面。

```text
source/
├── index.md        # 首页
├── about/
│   └── index.md    # → /about/
├── contact/
│   └── index.md    # → /contact/
├── portfolio/
│   └── index.md    # → /portfolio/
├── categories/
│   └── index.md    # → /categories/
├── tags/
│   └── index.md    # → /tags/
├── link/
│   └── index.md    # → /link/
└── archives/
    └── index.md    # → /archives/
```

每个 `index.md` 的 frontmatter 决定了页面的行为和外观。以 About 页为例：

{% raw %}
```markdown
---
title: About
date: 2026-04-27 00:00:00
layout: page
type: portal-about
top_img: false
aside: false
comments: false
description: Personal introduction and project context.
---

{% portal_about %}
```
{% endraw %}

frontmatter 字段说明：

- `layout: page` — 使用 Butterfly 的 page 布局（显示标题 + 内容区域）
- `type` — Butterfly 会根据 type 值决定页面的渲染方式：
  - **内置类型**：`categories`、`tags`、`archives` 分别渲染分类页、标签页、归档页，Butterfly 内置了这些页面的模板，只需声明 type 就能用。当你创建一个 `source/categories/index.md` 并写上 `type: categories`，Hexo构建时发现这个 type，Butterfly 主题内部有对应的模板文件（layout/category.ejs、layout/tag.ejs、layout/archive.ejs）。Hexo会自动把全站文章的分类/标签/日期数据注入模板，生成最终 HTML。
  - **自定义类型**：`portal-about`、`portal-contact`、`portal-portfolio` 等是自定义的 type，由自定义脚本注入数据或模板。依靠内容区的tag plugin驱动。比如About页：
  1. source/about/index.md 声明 type: portal-about，内容区写 &#123;% portal_about %&#125;
  2. scripts/portal-tags.js 第 7 行：hexo.extend.tag.register('portal_about', 
  () => portalRenderer.renderAbout())
  3. scripts/portal-renderer.js 中的 renderAbout() 函数读取 YAML数据文件（source/_data/site_profile.yml），手写 HTML 字符串返回
  4. Hexo 构建时遇到 &#123;% portal_about %&#125; 这个 tag，调用注册的回调，把返回的 HTML替换进去
- `top_img: false` — 不显示顶部大图
- `aside: false` — 不显示侧边栏
- `comments: false` — 页面关闭评论

其中首页不一样,把 `source/index.md` 的 type 注释掉、删掉 tag 就能切回 Butterfly 默认首页——这是不行的。原因是 Hexo 内置了 `hexo-generator-index` 插件，它会自动在 `/` 路由上生成分页文章列表。我现在首页是自定义的，不是hexo的默认模版首页，所以用自定义的 `scripts/portal-home-generator.js` 直接劫持 `index.html`，注入 `renderHome()` 生成的 HTML（快捷入口、最新文章、Portfolio 预览）。`source/index.md` 在首页这个场景下只是占位

项目提供了 npm 命令一键切换：

```bash
npm run home:default   # 切到 Butterfly 默认首页
hexo generate          # 重新构建
npm run home:custom    # 切回自定义首页
```
切换回之后使用`bash scripts/deploy.sh`部署。


## 如何写一篇文章

Hexo 文章是标准的 Markdown 文件，前面加一段 YAML frontmatter。存放在 `source/_posts/` 目录下，文件名就是 slug。并且，文章页面模版是Butterfly的post布局，不受index.md的影响

```markdown
---
title: Article
date: 2026-05-18 19:05:13
description: 简单描述一下
categories:
  - 一级目录
  - 二级目录
tags:
  - tag1
  - tag2
  - tag3
cover: /postimage/article.jpeg
---

## 小标题

正文内容
```

frontmatter 字段说明：

- `title` — 文章标题，显示在文章页和列表页
- `date` — 发布时间，影响首页排序。Hexo 按日期倒序排列文章
- `description` — 摘要，显示在首页文章卡片上，也用作 SEO meta description
- `categories` — 分类，可以有多级（用 `-` 缩进表示父子关系）
- `tags` — 标签，可以有多个，用于相关文章推荐
- `cover` — 封面图路径，相对于 `source/` 目录

图片放在 `source/postimage/` 下，文章中引用写成 `![](/postimage/xxx.png)`。Hexo 构建时会把 `source/` 下的所有非 Markdown 文件原样复制到 `public/`。

**草稿机制**：文章没有写完或者还不想发布的时候，放在 `source/_drafts/` 而不是 `source/_posts/`。因为 `_config.yml` 中 `render_drafts: false`，Hexo 不会渲染草稿。写完以后用 `npx hexo publish <slug>` 移动到 `_posts/`。



## UI 多语言（i18n）

Hexo 的 `_config.yml` 中有 `language:` 字段，Butterfly 主题利用它来切换主题内置文本（比如「阅读更多」「下一页」这些按钮）。这是 Hexo 层面的静态翻译——构建时决定，输出后无法变更。

但是我需要**运行时动态切换**：用户在页面上切换语言，UI 即时变化，不需要刷新页面。因此写一个自定义的客户端 i18n 系统 `portal-i18n.js`。

**为什么不直接用 Hexo 的目录式多语言？**

Hexo 的多语言方案是为每种语言创建独立的内容目录（`source/zh-CN/_posts/`、`source/ja/_posts/`），构建后生成语言前缀 URL（`/zh-CN/posts/xxx/`）。

所以我直接写了个客户端 i18n 系统 `portal-i18n.js`，分三层：

1. `packages/shared-config/site-identity.json` — 声明有哪些语言

```json
"i18n": {
  "defaultLocale": "en",
  "supportedLocales": [
    { "code": "en", "label": "English" },
    { "code": "zh-CN", "label": "简体中文" },
    { "code": "zh-TW", "label": "繁體中文" },
    { "code": "ja", "label": "日本語" }
  ]
}
```

这里集中管理支持哪些语言、默认语言是什么。portal 和 backend-api 可以使用同一份数据。

2. `shared-assets/locales/site-ui/` — 放 JSON 词典

```text
shared-assets/locales/site-ui/
├── en.json
├── zh-CN.json
├── zh-TW.json
└── ja.json
```

每个 JSON 文件是 key-value 翻译表，例如 `en.json` 中有 `"portal.searchPlaceholder": "Search..."`，`zh-CN.json` 中就是 `"portal.searchPlaceholder": "搜索..."`。使用嵌套 key（如 `portal.searchPlaceholder`）来组织不同区域的文本。

3. `portal-i18n.js` — 在浏览器里跑的，干这些事：
- 从 `<script id="portal-i18n-config">` 标签中读取配置（支持的语言列表、词典路径等）
- 为页面 DOM 元素添加 `data-i18n` 属性标记需要翻译的节点
- 用户切换语言时，fetch 对应的 JSON 词典，遍历所有 `[data-i18n]` 元素替换文本
- 对导航菜单单独处理（`navMap`），匹配 href 来翻译菜单项
- 在 Butterfly 的右侧配置区注入一个语言切换按钮，点击弹出下拉菜单
- 用户选择存储在 `localStorage`，下次访问自动恢复


`_config.butterfly.yml` 中原本的多语言切换按钮（`language` 选项）已经被禁用掉，因为我们的自定义切换器取代了它。

## 自定义 Hexo 脚本

Hexo 支持在 `scripts/` 目录下放置自定义脚本，利用 Hexo 的扩展 API 在构建过程中注入逻辑。我的`apps/blog-portal/scripts/` 配置了以下脚本：

| 脚本                       | 类型       | 作用                                                                                                 |
| -------------------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| `portal-shared-config.js`  | 配置加载器 | 读取 `site-identity.json`，提供 i18n 语言列表和默认翻译文本，被其他脚本依赖                          |
| `portal-renderer.js`       | 渲染引擎   | 手写 HTML 字符串生成器，包含 Home / About / Contact / Portfolio 等页面的渲染函数                     |
| `portal-home-generator.js` | Generator  | 抢占 `index.html` 路由，调用 `renderHome()` 生成自定义首页                                           |
| `portal-tags.js`           | Tag Plugin | 注册 `&#123;% portal_about %&#125;`、`&#123;% portal_contact %&#125;`、`&#123;% portal_portfolio %&#125;` 三个 tag，供对应页面调用 |
| `portal-data-sync.js`      | Filter     | 在 `before_generate` 阶段同步 YAML 数据到主题配置，注入 i18n 脚本标签                                |
| `auto-date.js`             | Filter     | 自动给没有写日期 frontmatter 的文章补上文件修改时间                                                  |

依赖关系：

```
portal-shared-config.js → portal-renderer.js → portal-home-generator.js (首页)
                                             → portal-tags.js         (about/contact/portfolio 页面tag)
portal-data-sync.js (独立，读取 shared-config + YAML 数据)
auto-date.js (独立)
```


## 本地开发命令

```bash
cd apps/blog-portal

# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:4000）
npm run dev          # 实际执行: hexo server

# 构建生产版本
npm run build        # 实际执行: hexo generate

# 清理构建缓存
npm run clean        # 实际执行: hexo clean
```

`hexo server` 会启动一个带热更新的本地服务器。修改 Markdown 文件后刷新浏览器就能看到效果。它能检测 `_posts/`、`_config.yml`、主题文件的变化。

`hexo generate` 将整个站点编译成纯静态 HTML，输出到 `public/` 目录。部署到生产环境的就是这个目录。构建速度取决于文章数量——几十篇文章在 1-2 秒内完成。

注意 `hexo clean`：它会删除 `public/` 和缓存文件 `db.json`。在本地开发时用没问题，但在服务器上的 Docker 环境中，`public/` 是通过 bind mount 挂载的——删除它会破坏挂载点。后面部署篇会详细讲这个问题。

## 小结

本地能跑起来就行。下一篇讲怎么初始化一台 Ubuntu 服务器——SSH 登录、装 Docker，为后面部署做准备。
<!-- managed-by-backend-api -->