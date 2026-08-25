---
title: Claude Code 基础 —— Skills 技能系统
date: 2026-05-25 12:00:00
description: Skills 是 Claude Code 最灵活的扩展方式：一个 SKILL.md 文件就能教 Claude 新能力。从创建第一个 skill 开始，理解渐进式加载、调用控制、动态上下文注入、Subagent 执行，以及如何排查常见问题。
categories:
  - AI
  - Claude Code
tags:
  - Claude Code
  - skill
  - 自动化
  - 工作流
  - AI
---

## Skills 是什么

Skills 是 Claude Code **最灵活、最易入门的扩展方式**。一个 skill 就是一个包含指令的 `SKILL.md` 文件，Claude 自动在合适时调用它，你也可以用 `/skill-name` 手动触发。

和 `CLAUDE.md` 的关键区别：**CLAUDE.md 的内容每次会话都加载（一直占用上下文），skill 的内容只在被使用时才加载。** 所以长参考文档、多步骤工作流、偶尔才用的操作指南——这些应该写成 skill，而非塞进 CLAUDE.md。

触发器：当你发现自己反复粘贴同样的指令、清单、或流程到聊天里，或者 CLAUDE.md 里某段内容已经从"事实"膨胀成"流程"——就该抽成一个 skill。

根据文档的说法，Skills 遵循 **Agent Skills 开放标准**（[agentskills.io](https://agentskills.io)），跨 AI 工具通用。Claude Code 在此基础上扩展了调用控制、Subagent 执行、动态上下文注入等能力。

> 如果你有旧版 `.claude/commands/` 目录下的自定义命令文件，它们依然能正常工作，和 skill 等价。Skills 额外提供了目录式组织、调用控制、Subagent 执行等可选特性。

## 你的第一个 Skill

官方文档以 `summarize-changes` 为例——它获取 git diff 并要求 Claude 总结风险和变更。三步搞定：

### Step 1：创建目录

```bash
mkdir -p ~/.claude/skills/summarize-changes
```

放在 `~/.claude/skills/` 是个人 skill，对所有项目生效。只对当前项目生效的话放在 `.claude/skills/`。

### Step 2：写 SKILL.md

```markdown
---
description: 总结未提交的变更并标记风险。当用户问"改了什么"、想要 commit message、或请求审查 diff 时使用。
---

## 当前变更
!`git diff HEAD`

## 指令
用两到三个要点总结上面的变更，然后列出你注意到的任何风险——比如缺少错误处理、硬编码值、或需要更新的测试。
如果 diff 为空，说明没有未提交的变更。
```

`SKILL.md` 的结构就是 **YAML frontmatter（`---` 之间）+ Markdown 正文**。只有 `description` 是推荐项——Claude 用它判断什么时候该自动调用这个 skill。

### `!`command`` 的魔法

`!`git diff HEAD`` 这一行使用了**动态上下文注入**（bash injection）：Claude Code 在把内容发给模型**之前**，先跑 `git diff HEAD`，然后把输出替换掉那行。Claude 看到的是**真实的 diff 内容**，而不是 `!`...`` 这个命令本身。

这是 skill 最强大的特性之一——不用手动粘贴上下文，skill 自动抓取。

### Step 3：测试

打开 Claude Code，两种方式：

**方式 A：让 Claude 自动调用**

```
What did I change?
```

Claude 会识别到你的问题匹配 skill 的 `description`，自动加载并运行。

**方式 B：手动触发**

```
/summarize-changes
```

目录名就是命令名。Claude 应该回复你的变更总结和风险列表。

## Skills 放在哪里

| 位置 | 路径 | 作用域 |
|------|------|--------|
| 个人 | `~/.claude/skills/<name>/SKILL.md` | 所有项目 |
| 项目 | `.claude/skills/<name>/SKILL.md` | 单个项目 |
| 插件 | `<plugin>/skills/<name>/SKILL.md` | 插件启用时 |
| 企业 | 受管策略 | 组织范围 |

优先级：企业 > 个人 > 项目。同名 skill 按这个顺序覆盖。插件 skill 使用 `plugin-name:skill-name` 命名空间，不会冲突。

### 实时变更检测

Claude Code 监听 skill 目录的文件变化。在 `~/.claude/skills/`、项目 `.claude/skills/` 或 `--add-dir` 目录下增删改 skill **无需重启 session 即可生效**。

### 嵌套目录自动发现

项目 skills 不仅从启动目录的 `.claude/skills/` 加载，还会向上查找到仓库根目录。此外，当你在子目录下工作时，Claude Code 也能按需发现嵌套的 `.claude/skills/`——比如编辑 `packages/frontend/` 下的文件，也会发现 `packages/frontend/.claude/skills/`。这对 monorepo 非常有用。

## 目录结构

每个 skill 是一个目录，`SKILL.md` 是唯一必需文件：

```
my-skill/
├── SKILL.md          # 必需 —— 主指令
├── reference.md      # 可选 —— 详细参考，按需加载
├── examples.md       # 可选 —— 示例，按需加载
└── scripts/
    └── helper.py     # 可选 —— 可执行脚本，不占上下文
```

在 `SKILL.md` 中引用这些文件，让 Claude 知道它们存在：

```markdown
## 额外资源
- 完整 API 细节见 [reference.md](reference.md)
- 使用示例见 [examples.md](examples.md)
```

官方建议 **SKILL.md 控制在 500 行以内**，详细内容放进独立参考文件——原则是 skill 正文按需才加载，不浪费 token。

## Frontmatter 完整参考

所有字段都是可选的，只有 `description` 推荐填写（让 Claude 知道什么时候用这个 skill）。

```yaml
---
name: my-skill                    # 显示名，省略用目录名
description: 做什么、何时用       # 推荐！Claude 用它决策自动调用
when_to_use: 额外触发场景         # 追加到 description 后面
argument-hint: [issue-number]     # 自动补全提示
arguments: [issue, branch]        # 命名位置参数
disable-model-invocation: true    # 禁止 AI 自动调用，仅手动 /name
user-invocable: false             # 从 / 菜单隐藏，仅 AI 可用
allowed-tools: Read Grep          # 预先批准的工具（空格或列表）
model: sonnet                     # 覆盖模型
effort: high                      # 覆盖 effort 级别
context: fork                     # 在独立 Subagent 中运行
agent: Explore                    # 配合 context: fork 的 subagent 类型
hooks: {}                         # skill 生命周期 hooks
paths: **/*.tsx,**/*.ts          # 仅匹配这些文件时自动激活
shell: powershell                 # !`command` 块使用的 shell
---
```

### description 的长度限制

`description` + `when_to_use` 合并后在 skill 列表中**截断到 1536 字符**。把最重要的用例放前面。

### 调用控制：谁能触发

| 配置 | 你能调用 | AI 能调用 | 何时加载到上下文 |
|------|---------|----------|-----------------|
| （默认）| 是 | 是 | description 始终在上下文中，正文被调用时加载 |
| `disable-model-invocation: true` | 是 | 否 | description 不在上下文中，正文在你手动调用时加载 |
| `user-invocable: false` | 否 | 是 | description 始终在上下文中 |

典型用法：

```yaml
# 部署 skill —— 只有你能触发，AI 绝不能自己决定部署
---
name: deploy
description: 部署应用到生产环境
disable-model-invocation: true
---
```

```yaml
# 遗留系统知识 —— AI 需要知道，但用户不需要手动调用
---
name: legacy-system-context
description: 解释 Legacy CRM 系统的集成方式
user-invocable: false
---
```

## Skill 的生命周期

当你（或 Claude）调用一个 skill 时，渲染后的 `SKILL.md` 内容作为一条消息进入对话，并在整个 session 中保留。Claude Code 不会在后续 turn 重新读取 skill 文件。

**压缩（compaction）时会怎样？** 对话摘要后，Claude Code 会重新附加每个 skill 最近一次调用的内容——每个 skill 保留前 **5,000 tokens**，所有已调用 skill 共享 **25,000 tokens** 预算。从最近调用的 skill 开始填充，这意味着 session 中较早调用的 skill 可能在压缩后被全部丢弃。如果发现 skill 在第一次响应后就失效了，重新调用一下就好。

## 进阶模式

### 动态上下文注入（`!`command``）

```markdown
## PR 详情
!`gh pr view $ARGUMENTS --json title,body,comments`

## Diff
!`gh pr diff $ARGUMENTS`

## 指令
审查这个 PR。关注安全性、性能、代码风格。
```

调用 `/review-pr 123` 时，`$ARGUMENTS` 会被替换为 `123`，然后 `gh` 命令实际执行并把结果注入 prompt。

### 参数传递

```markdown
---
name: migrate-component
description: 将组件从一个框架迁移到另一个
---
将 $0 组件从 $1 迁移到 $2。保留所有已有行为和测试。
```

```
/migrate-component SearchBar React Vue
```

可用变量：

| 变量 | 含义 |
|------|------|
| `$ARGUMENTS` | 所有参数（完整字符串） |
| `$ARGUMENTS[N]` | 按索引取参数 |
| `$N` | `$ARGUMENTS[N]` 的简写 |
| `$name` | 命名参数（需在 frontmatter 声明 `arguments`） |
| `${CLAUDE_SESSION_ID}` | 当前 session ID |
| `${CLAUDE_EFFORT}` | 当前 effort 级别 |
| `${CLAUDE_SKILL_DIR}` | skill 目录路径 |

如果调用时传了参数但 `SKILL.md` 里没有 `$ARGUMENTS`，Claude Code 会自动追加 `ARGUMENTS: <your input>` 到末尾。

### 在 Subagent 中运行

```yaml
---
name: code-review
description: 全面审查代码变更
context: fork
agent: Explore
---
```

`context: fork` 让 skill 在隔离的 Subagent 上下文中运行——它可以读文件、搜代码，但不影响你的主对话。配合 `agent: Explore` 指定 Subagent 类型。

### 预批准工具权限

```yaml
---
name: commit
description: 暂存并提交当前变更
disable-model-invocation: true
allowed-tools: Bash(git add *) Bash(git commit *) Bash(git status *)
---
```

`allowed-tools` **不是限制可用的工具**——它只是免去列出的工具的权限弹窗。所有工具仍然可用，未被列出的工具按你的权限设置正常弹窗。

> 项目 `.claude/skills/` 中的 skill 的 `allowed-tools` 需要你接受 workspace trust 弹窗后才生效。审查项目 skill 之后再信任仓库。

### `paths`：只在处理特定文件时激活

```yaml
---
name: react-patterns
description: React 组件模式和最佳实践
paths: **/*.tsx,**/*.jsx
---
```

Claude 只在处理 `.tsx` 或 `.jsx` 文件时自动加载这个 skill，不会在写后端代码时浪费上下文。

## Skill vs 其他扩展方式怎么选

官方给出了清晰的选择指南：

| 场景 | 用什么 |
|------|--------|
| Claude 总是搞错某个约定，说了两次还没记住 | 写入 `CLAUDE.md` |
| 你写了多步骤流程，反复粘贴给 Claude | 创建 skill（`disable-model-invocation: true`） |
| 你需要 Claude 处理未见过的新操作 | 创建 skill（让 AI 可自动调用） |
| 你需要孤立的新上下文窗口跑大型任务 | 用 Subagent |
| 你需要连接外部数据源或服务 | 建 MCP Server |
| 你已经走完以上几步，想分发这套配置 | 打包为 Plugin |

## 常见问题排查

### Skill 不触发

1. description 是否太泛了？——加上具体的触发短语（如 "when the user asks for a commit message"）
2. 有没有设置 `paths` 但当前文件不匹配？
3. 有没有设置 `disable-model-invocation: true` 但期望 AI 自动调用？
4. 刚创建 skill？试试**重启 session** 让文件监听器重新扫描

### Skill 触发太频繁

1. description 太宽——缩小范围，加更多限定词
2. 加 `paths` 限制文件类型

### Description 被截断

1. `description` + `when_to_use` 合并截断到 1536 字符——把最核心的触发条件放前面

## 核心知识点清单

- [x] **Skill = SKILL.md**：一个文件教 Claude 新能力，本质是可复用的 prompt 模板
- [x] **按需加载**：正文只在调用时才占上下文，不像 CLAUDE.md 一直占着
- [x] **`!`command``**：动态注入真实数据到 prompt，skill 最强大的特性
- [x] **两种触发方式**：AI 自动识别（靠 description）或手动 `/name`
- [x] **调用控制**：`disable-model-invocation` 禁止 AI 自动调用，`user-invocable` 隐藏菜单
- [x] **三种位置**：`~/.claude/skills/`（个人全局）、`.claude/skills/`（项目）、插件内
- [x] **实时生效**：增删改 skill 不需要重启 session
- [x] **压缩后保留**：每个 skill 最多保留 5000 tokens，所有 skill 共享 25000 tokens 预算
- [x] **参数传递**：`$ARGUMENTS`、`$N`、命名参数 `${name}`
- [x] **Subagent 执行**：`context: fork` 在隔离上下文运行
- [x] **预批准工具**：`allowed-tools` 免弹窗但不限制工具可用
- [x] **paths**：限制 skill 只在处理特定文件类型时激活
- [x] **500 行原则**：SKILL.md 保持精炼，详细信息放 references

## 下一步

Skills 是"教 Claude 新能力"——写一个文件，Claude 就多一个能力。但还有另一个问题：**"在什么时机触发这些能力？"** 这就是 Hooks 的领域。

Hooks 让你在 Claude Code 的关键生命周期节点——工具执行前、文件修改后、会话启动时——自动执行自定义逻辑。把 skill 的能力挂在 hook 的时机节点上，你就有了完整的自动化工作流。

---

> **Claude Code 基础系列**（共 3 篇）
>
> 下一篇：{% post_link claudecode-hooks %}（Hooks 钩子系统）
<!-- managed-by-backend-api -->
