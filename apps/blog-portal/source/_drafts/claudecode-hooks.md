---
title: Claude Code 基础 —— Hooks
date: 
description: 关于 Claude Code Hooks 的事件驱动自动化机制的学习
categories:
  - AI
  - Claude Code
tags:
  - Claude Code
  - hooks
  - 自动化
  - 工作流
---

## Hooks 是什么

Hooks 是用户定义的 shell 命令，在 Claude Code 生命周期的特定时刻自动执行。它们提供**确定性控制**——确保某些操作一定发生，而不是依赖 LLM 选择做不做。

> 对于需要判断力而非确定性规则的决策，官方还提供了 [prompt-based hooks](#prompt-based-hooks) 和 [agent-based hooks](#agent-based-hooks)，用 Claude 模型来做判断。

如果不了解 Skills，建议先读本系列的第一篇：Skills 技能系统，理解"教 Claude 怎么做"之后再回来看 hooks"什么时候做"。


## 实现一个 Hook：桌面通知

官方文档以 Notification hook 为例子开始讲解。这个 hook 让你在 Claude 等待输入时收到桌面通知。

### 添加 hook 到配置文件

打开 `~/.claude/settings.json`，添加一个 `Notification` hook：

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "osascript -e 'display notification \"Claude Code needs your attention\" with title \"Claude Code\"'"
          }
        ]
      }
    ]
  }
}
```


多平台命令：

| 平台    | 命令                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------- |
| macOS   | `osascript -e 'display notification "Claude Code needs your attention" with title "Claude Code"'` |
| Linux   | `notify-send "Claude Code" "Claude Code needs your attention"`                                    |
| Windows | `powershell -c "New-BurntToastNotification -Text 'Claude Code needs your attention'"`             |

### 验证配置

在 Claude Code 中输入 `/hooks`，打开 hooks 浏览器。你会看到所有可用事件列表，已配置的事件旁边会有数量标记。选择 `Notification` 确认 hook 出现在列表里。

**`/hooks` 菜单是只读的**。要添加、修改或删除 hook，需要直接编辑 settings JSON 文件。

### 测试

按 `Esc` 回到命令行。让 Claude 做一件需要权限的事（比如写文件），然后切走窗口。按理说应该能收到桌面通知，但是一开始我没有收到，目前还没解决。

### Notification 的 Matcher 值

空的 `matcher` 会在所有通知类型上触发。按需精确过滤：

| Matcher                | 触发时机                               |
| ---------------------- | -------------------------------------- |
| `permission_prompt`    | Claude 需要你批准工具调用              |
| `idle_prompt`          | Claude 完成工作，等待你的下一个 prompt |
| `auth_success`         | 认证完成                               |
| `elicitation_dialog`   | MCP Server 打开请求表单                |
| `elicitation_complete` | MCP 请求表单被提交或关闭               |
| `elicitation_response` | MCP 请求响应发回 Server                |

## 官方文档给出的6 种常用的自动化模式

官方文档列出了以下常用场景，每个都有即用的配置块。

### 编辑后自动格式化

每次 Write/Edit 之后跑 Prettier。matcher 使用 `Edit|Write`（管道 = OR）：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write"
          }
        ]
      }
    ]
  }
}
```

补充：`jq -r '.tool_input.file_path'` 从 stdin 的 JSON 中提取被编辑的文件路径。需要先安装 jq：`brew install jq`。

### 阻止编辑受保护的文件

防止 Claude 修改 `.env`、`package-lock.json`、`.git/` 等敏感文件。这个例子用脚本文件做检查：

创建 `.claude/hooks/protect-files.sh`：

```bash
#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
PROTECTED_PATTERNS=(".env" "package-lock.json" ".git/")

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "Blocked: $FILE_PATH matches protected pattern '$pattern'" >&2
    exit 2
  fi
done
exit 0
```

给权限`chmod +x .claude/hooks/protect-files.sh`  

在 `.claude/settings.json` 中注册 PreToolUse hook：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/protect-files.sh"
          }
        ]
      }
    ]
  }
}
```

其中`$CLAUDE_PROJECT_DIR` 是环境变量，始终指向项目根目录。

### 上下文压缩后重新注入关键信息

当 Claude 上下文满了，compaction 会自动做摘要压缩。这可能会丢失重要细节。用 `SessionStart` + `compact` matcher 在压缩后自动补充：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "compact",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Reminder: 使用 Bun 而非 npm。commit 前跑 bun test。当前 sprint: auth 重构。'"
          }
        ]
      }
    ]
  }
}
```

任何 stdout 输出都会被注入 Claude 的上下文。可以换成动态命令，比如 `git log --oneline -5`。

### 审计配置变更

用 `ConfigChange` 记录谁在什么时候改了什么配置。matcher 可按来源过滤：

| Matcher            | 来源                          |
| ------------------ | ----------------------------- |
| `user_settings`    | `~/.claude/settings.json`     |
| `project_settings` | `.claude/settings.json`       |
| `local_settings`   | `.claude/settings.local.json` |
| `policy_settings`  | 企业受管策略                  |
| `skills`           | skill 文件变更                |

```json
{
  "hooks": {
    "ConfigChange": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "jq -c '{timestamp: now | todate, source: .source, file: .file_path}' >> ~/claude-config-audit.log"
          }
        ]
      }
    ]
  }
}
```

要**阻断**变更，exit 2 或返回 `{"decision": "block"}`。

### 当目录或文件更改时重新加载环境

direnv 能在 shell 中自动切换环境变量，但 Claude Code 的 Bash 工具不会自动感知这些变化。联合使用 `SessionStart` + `CwdChanged`：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "direnv export bash > \"$CLAUDE_ENV_FILE\""
          }
        ]
      }
    ],
    "CwdChanged": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "direnv export bash > \"$CLAUDE_ENV_FILE\""
          }
        ]
      }
    ]
  }
}
```

`CLAUDE_ENV_FILE` 是一个特殊环境变量，写进去的 export 语句会在每次 Bash 命令之前执行。

如果只想监听特定文件变化而非所有目录切换，用 `FileChanged`：

```json
{
  "hooks": {
    "FileChanged": [
      {
        "matcher": ".envrc|.env",
        "hooks": [
          { "type": "command", "command": "direnv export bash > \"$CLAUDE_ENV_FILE\"" }
        ]
      }
    ]
  }
}
```

### 自动批准特定权限弹窗

跳过你始终同意的权限弹窗。这个例子自动批准 `ExitPlanMode`：

```json
{
  "hooks": {
    "PermissionRequest": [
      {
        "matcher": "ExitPlanMode",
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"hookSpecificOutput\": {\"hookEventName\": \"PermissionRequest\", \"decision\": {\"behavior\": \"allow\"}}}'"
          }
        ]
      }
    ]
  }
}
```

`permissionDecision` 的值：
- **`allow`**：跳过弹窗（deny 规则仍然生效）
- **`deny`**：直接拒绝
- **`ask`**：弹出权限窗让用户正常决定

**重要**：hook 返回 `allow` 不会绕过 deny 规则。如果权限设置中有 deny 规则，hook 的 allow 会被覆盖。

还可以在自动批准的同时切换权限模式：

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow",
      "updatedPermissions": [
        { "type": "setMode", "mode": "acceptEdits", "destination": "session" }
      ]
    }
  }
}
```

**注意**：在非交互模式（`-p` 标志）下，`PermissionRequest` hooks 不会触发。用 `PreToolUse` 代替。

## 工作原理：事件、Handler、Matcher

###  22 种 Hook 事件

Hook 事件在 Claude Code 的特定生命周期时刻触发。当事件触发时，所有匹配的 hook 并行执行，相同的 hook 命令会被自动去重。

| 事件                  | 触发时机                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `SessionStart`        | 会话启动或恢复。matcher: `startup`, `resume`, `clear`, `compact`                               |
| `Setup`               | 以 `--init-only` 启动，或 `-p` 模式下带 `--init`/`--maintenance`。用于 CI/脚本的一次性准备工作 |
| `UserPromptSubmit`    | 用户提交 prompt 后、Claude 处理前。不支持 matcher                                              |
| `UserPromptExpansion` | 用户输入的命令展开成 prompt 后。matcher: 命令名                                                |
| `PreToolUse`          | 工具执行**前**。可阻断。matcher: 工具名                                                        |
| `PermissionRequest`   | 权限对话框出现**前**。matcher: 工具名                                                          |
| `PermissionDenied`    | 工具调用被自动模式的分类器拒绝。可返回 `{retry: true}`                                         |
| `PostToolUse`         | 工具执行**成功后**。matcher: 工具名                                                            |
| `PostToolUseFailure`  | 工具执行**失败后**。matcher: 工具名                                                            |
| `PostToolBatch`       | 一整批并行工具调用完成后。不支持 matcher                                                       |
| `Notification`        | Claude Code 发通知时。matcher: 通知类型                                                        |
| `SubagentStart`       | Subagent 启动时。matcher: agent 类型名                                                         |
| `SubagentStop`        | Subagent 结束时。matcher: agent 类型名                                                         |
| `TaskCreated`         | 通过 TaskCreate 创建任务时。不支持 matcher                                                     |
| `TaskCompleted`       | 任务标记为完成时。不支持 matcher                                                               |
| `Stop`                | Claude 完成回复时。不支持 matcher                                                              |
| `StopFailure`         | API 错误导致 turn 结束。matcher: 错误类型                                                      |
| `TeammateIdle`        | Agent team 队友即将空闲                                                                        |
| `InstructionsLoaded`  | CLAUDE.md 或 `.claude/rules/*.md` 加载到上下文时                                               |
| `ConfigChange`        | 会话中配置文件被外部修改                                                                       |
| `CwdChanged`          | 工作目录变化（如 Claude 执行 `cd`）                                                            |
| `FileChanged`         | 监听的文件变化。matcher 指定监听哪些文件名                                                     |
| `PreCompact`          | 上下文压缩前。matcher: `manual` / `auto`                                                       |
| `PostCompact`         | 上下文压缩后。matcher: `manual` / `auto`                                                       |
| `SessionEnd`          | 会话终止。matcher: `clear`, `resume`, `logout`, `prompt_input_exit`, `other`                   |
| `WorktreeCreate`      | Worktree 创建时                                                                                |
| `WorktreeRemove`      | Worktree 删除时                                                                                |
| `Elicitation`         | MCP Server 请求用户输入时。matcher: MCP Server 名                                              |
| `ElicitationResult`   | 用户回应 MCP 请求后。matcher: MCP Server 名                                                    |

### 5 种 Handler 类型

Hook 怎么执行？`type` 字段决定：

**1. `command`（默认，最常用）**

运行 shell 命令。通过 stdin 接收 JSON，通过 exit code 和 stdout/stderr 传递结果。

**2. `prompt` —— LLM 评估**

```json
{ "type": "prompt", "prompt": "检查这个操作是否安全？返回 {\"ok\": true/false, \"reason\": \"原因\"}", "timeout": 30 }
```

用 Claude 模型（默认 Haiku）判断。返回 `{"ok": true}` 放行，`{"ok": false}` 阻断并用 `reason` 反馈给 Claude。

**3. `agent` —— Subagent 验证（实验性）**

```json
{ "type": "agent", "prompt": "跑一遍测试确认通过", "timeout": 120 }
```

启动带工具访问权限的 subagent，能读文件、搜代码、跑命令。和 prompt 型用同样的 `ok`/`reason` 格式，但默认 60s 超时，最多 50 轮工具调用。

> **Warning**：Agent hooks 是实验性功能，行为和配置可能在未来版本中变化。生产环境优先用 command hooks。

**4. `http` —— Webhook**

```json
{
  "type": "http",
  "url": "http://localhost:8080/hooks/tool-use",
  "headers": { "Authorization": "Bearer $MY_TOKEN" },
  "allowedEnvVars": ["MY_TOKEN"]
}
```

POST 事件 JSON 到 HTTP 端点。header 值支持 `$VAR_NAME` 插值，只有 `allowedEnvVars` 列出的变量会被解析。

**5. `mcp_tool` —— 调用 MCP Server**

```json
{ "type": "mcp_tool", "server": "my-server", "tool": "validate_edit" }
```

直接调用已连接的 MCP Server 工具。

### Hook 输入：stdin JSON

每个 hook 通过 stdin 收到事件 JSON。不同事件有不同的附加字段，但共享基础字段：

```json
{
  "session_id": "abc123",
  "cwd": "/Users/me/myproject",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": { "command": "npm test" }
}
```

`UserPromptSubmit` 拿到 `prompt` 文本，`SessionStart` 拿到 `source`（startup/resume/clear/compact），等等。

### Hook 输出：exit code + stdout/stderr

```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')
if echo "$COMMAND" | grep -q "drop table"; then
  echo "Blocked: 不允许删表" >&2    # stderr → Claude 看到这个反馈
  exit 2                              # exit 2 → 阻断
fi
exit 0                                # exit 0 → 没有意见，正常放行
```

| Exit Code | 含义                                                                                                     |
| --------- | -------------------------------------------------------------------------------------------------------- |
| **0**     | hook 没有反对意见，操作正常进行。`UserPromptSubmit`/`SessionStart` 等的 stdout 注入 Claude 上下文        |
| **2**     | 阻断操作。stderr 作为反馈传给 Claude。部分事件无法阻断（如 `SessionStart`），exit 2 仅显示 stderr 给用户 |
| **其他**  | 非阻断错误。transcript 显示 `<hook name> hook error` + stderr 第一行                                     |

### 结构化 JSON 输出

exit code 只能表达"阻断或沉默"。需要更多控制时，exit 0 并打印 JSON 到 stdout：

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "请用 rg 代替 grep 以获得更好性能"
  }
}
```

**重要**：不要混用 exit 2 和 JSON——exit 2 时 JSON 会被忽略。

不同事件用不同的决策格式：

| 事件                  | 决策字段                               | 取值                                               |
| --------------------- | -------------------------------------- | -------------------------------------------------- |
| `PreToolUse`          | `permissionDecision`                   | `allow` / `deny` / `ask` / `defer`（仅 `-p` 模式） |
| `PostToolUse`, `Stop` | `decision`                             | `block`                                            |
| `PermissionRequest`   | `hookSpecificOutput.decision.behavior` | `allow`                                            |

`UserPromptSubmit` 用 `additionalContext` 注入上下文，不是 decision。

### Matcher
精确控制哪些工具触发的  

不加 matcher 的话，hook 在该事件的每次触发都跑。加上 matcher 来缩小范围：

```json
{ "matcher": "Edit|Write" }
```

| 写法          | 含义               |
| ------------- | ------------------ |
| `"Bash"`      | 精确匹配 Bash 工具 |
| `"Edit        | Write"`            | 匹配 Edit 或 Write |
| `"*"` 或 `""` | 通配所有工具       |
| `"mcp__.*"`   | 匹配所有 MCP 工具  |

**matcher 区分大小写**——`"bash"` 不会匹配 `Bash` 工具。

每个事件类型的 matcher 过滤的对象不一样：

| 事件                                                                                       | matcher 过滤                               |
| ------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied` | 工具名                                     |
| `SessionStart`                                                                             | `startup` / `resume` / `clear` / `compact` |
| `Notification`                                                                             | 通知类型                                   |
| `SubagentStart`, `SubagentStop`                                                            | agent 类型                                 |
| `ConfigChange`                                                                             | 配置来源                                   |
| `StopFailure`                                                                              | 错误类型                                   |
| `FileChanged`                                                                              | 文件名（`                                  | ` 分隔） |
| 部分事件                                                                                   | 不支持 matcher                             |

### `if` 字段：比 matcher 更细的过滤（v2.1.85+）

matcher 只能按工具名过滤，`if` 字段可以按工具名+参数一起过滤：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "if": "Bash(git *)",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/check-git-policy.sh"
          }
        ]
      }
    ]
  }
}
```

只有当 Bash 的子命令匹配 `git *` 时，hook 进程才启动。对 `npm test && git push` 这种复合命令，Claude Code 会逐个评估子命令，只要有一个匹配就触发。

`if` 只在工具事件上生效：`PreToolUse`、`PostToolUse`、`PostToolUseFailure`、`PermissionRequest`、`PermissionDenied`。

### 配置文件位置

| 位置                          | 作用域                | 可共享                 |
| ----------------------------- | --------------------- | ---------------------- |
| `~/.claude/settings.json`     | 所有项目              | 否（机器本地）         |
| `.claude/settings.json`       | 单个项目              | 是（可提交到 git）     |
| `.claude/settings.local.json` | 单个项目              | 否（git-ignored）      |
| 企业受管策略                  | 组织范围              | 是（管理员控制）       |
| Plugin `hooks/hooks.json`     | 插件启用时            | 是（随插件打包）       |
| Skill/agent frontmatter       | skill 或 agent 活跃时 | 是（定义在组件文件中） |

多个 hook 的结果是**合并的**——最严格的决策胜出：`deny` > `ask` > `allow`。一个 hook 返回 `deny` 不会阻止其他 hook 执行。

## Prompt-based Hooks：让 AI 做决策

当判断逻辑需要"理解上下文"而非固定规则时，用 `type: "prompt"`。Claude Code 把用户的 prompt 和事件数据发给一个 Claude 模型做决策：

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "检查是否所有 task 都已完成了。如果没完成，返回 {\"ok\": false, \"reason\": \"还需要做什么\"}。"
          }
        ]
      }
    ]
  }
}
```

模型只负责返回 yes/no：

- **`{"ok": true}`**：操作继续
- **`{"ok": false}`**：
  - `Stop` / `SubagentStop`：reason 反馈给 Claude 让它继续工作
  - `PreToolUse`：工具调用被拒绝，reason 作为错误信息传给 Claude
  - `PostToolUse` / `PostToolBatch` / `UserPromptSubmit` / `UserPromptExpansion`：turn 结束，reason 显示为警告

> 用 prompt hooks 当 hook 输入数据本身就足够做决策。需要验证代码实际状态时，用 agent hooks。

## HTTP Hooks：对接外部服务

```json
{
  "type": "http",
  "url": "http://localhost:8080/hooks/tool-use",
  "headers": { "Authorization": "Bearer $MY_TOKEN" },
  "allowedEnvVars": ["MY_TOKEN"]
}
```

POST 方式把事件 JSON 发给用户的 HTTP 端点。端点返回的 JSON 使用与 command hook 相同的输出格式。**HTTP 状态码本身不能阻断操作**——需要通过响应 body 返回决策字段。

## 常见坑和排查

### Hook 不触发

1. 运行 `/hooks` 确认 hook 出现在正确的事件下
2. 检查 matcher **大小写**是否与工具名完全一致
3. 确认你触发的是正确的事件类型（`PreToolUse` 在工具执行前，`PostToolUse` 在成功后）
4. 如果用 `PermissionRequest` 在非交互模式下（`-p`），改用 `PreToolUse`
5. 如果刚编辑完 settings 文件但 hooks 还没出现——文件监听器可能漏掉了变化，重启 session

### 看到 "hook error"

```bash
# 手动模拟测试
echo '{"tool_name":"Bash","tool_input":{"command":"ls"}}' | ./my-hook.sh
echo $?  # 检查 exit code
```

- "command not found" → 用绝对路径或 `$CLAUDE_PROJECT_DIR`
- "jq: command not found" → 安装 jq 或用 Python/Node 解析 JSON
- 脚本根本没执行 → `chmod +x ./my-hook.sh`

### Stop hook 连续阻塞

Claude Code 在 Stop hook 连续阻塞 **8 次**后会强制放行。脚本需要检查 `stop_hook_active` 字段避免同一次工作重复阻塞：

```bash
#!/bin/bash
INPUT=$(cat)
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ]; then
  exit 0  # 已经在 Stop hook 中了，放 Claude 走
fi
# ... 用户的检查逻辑
```

如果确实需要超过 8 轮，用 `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` 环境变量提高上限。

### JSON 解析失败

如果你的 shell 配置文件（`.bashrc` / `.zshrc`）里有无条件 `echo` 语句，输出会被拼到 hook 的 JSON 前面：

```
Shell ready on arm64
{"decision": "block", "reason": "..."}
```

**修复**：在 shell 配置里包裹条件判断：

```bash
# 在 ~/.zshrc 或 ~/.bashrc 中
if [[ $- == *i* ]]; then
  echo "Shell ready"
fi
```

`$-` 包含 shell 标志，`i` 表示交互式 shell。Hooks 运行在非交互式 shell 中，echo 会被跳过。

### 调试技巧

- `Ctrl+O` 切换 transcript 视图，查看每个 hook 的执行摘要
- `claude --debug-file /tmp/claude.log` 启动，然后 `tail -f /tmp/claude.log` 查看完整执行细节（匹配了哪些 hook、exit code、stdout/stderr）

<!-- managed-by-backend-api -->
