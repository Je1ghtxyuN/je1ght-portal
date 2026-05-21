---
title: MCP Bridge —— 连接 Claude 与 SynthV
date: 2026-05-20 15:41:32
description: 设计 MCP 桥接层将 SVP 文件操作封装为 AI 可调用的 Tools，涵盖无状态设计决策、时间单位选择、5 个核心 Tool 详解和端到端工作流演示。
categories:
  - AI
  - MCP
  - SynthV
tags:
  - MCP
  - Python
  - Synthesizer V
  - Tool
  - Agent
---

## 桥接层是什么

Phase 1 学到了 MCP Tool 机制，Phase 2 理解了 SVP 文件格式。Phase 3 将两者连接：

```
Claude (自然语言)
  │
  ▼
MCP Protocol (JSON-RPC over stdio)
  │
  ▼
synthv-mcp Server
  ├── create_svp_project
  ├── inspect_svp_project
  ├── list_svp_notes
  ├── add_note_to_svp
  ├── set_svp_render_filename
  └── midi_info
  │
  ▼
.svp 工程文件 (JSON on disk)
```

这是整个项目的核心——**让 AI 的操作能力真正落地到音乐工程中**。

## 设计决策

### 状态管理：无状态文件操作

每个 Tool 独立完成"读取 → 修改 → 保存"：

```python
@mcp.tool()
def add_note_to_svp(path, onset_beats, duration_beats, pitch, lyrics):
    project = load(path)          # 读取
    note = add_note(track, ...)   # 修改
    track["notes"].append(note)
    save(project, path)           # 保存
    return "添加成功"
```

**为什么不使用 session？**

- 简单：不需要管理 session ID、内存缓存、超时
- 可靠：每次操作后文件都在磁盘上，不会丢失
- 可调试：用户可以随时打开 SVP 查看中间状态

SVP 文件通常 < 100KB，全量读写开销可忽略。

### 时间单位：使用拍（beat）而非内部单位

| 选择           | API 体验                       | 实现                        |
| -------------- | ------------------------------ | --------------------------- |
| 使用内部 ticks | `onset=705600000`，AI 很难理解 | —                           |
| **使用拍数**   | `onset_beats=1.0`，音乐上自然  | `beats_to_units()` 内部转换 |

AI 天生理解"第 4 拍加一个八分音符"比"onset=2822400000"容易得多。

### 音高：MIDI 音符号 + 辅助工具

- 接受 MIDI 数字（60 = C4）
- 提供 `midi_info` 工具让 AI 查询音名对应关系
- 结果中同时显示 MIDI 号和音名

## Tools 详解

### create_svp_project

```json
{
  "name": "create_svp_project",
  "inputSchema": {
    "properties": {
      "path": {"type": "string"},
      "bpm": {"type": "number", "default": 120.0},
      "voice_name": {"type": "string", "default": "Kasane Teto (Lite)"},
      "language": {"type": "string", "default": "japanese"}
    }
  }
}
```

调用示例：`create_svp_project(path="/tmp/demo.svp", bpm=140, voice_name="Teto")`

### add_note_to_svp

```json
{
  "name": "add_note_to_svp",
  "inputSchema": {
    "properties": {
      "path": {"type": "string"},
      "onset_beats": {"type": "number"},
      "duration_beats": {"type": "number"},
      "pitch": {"type": "integer"},
      "lyrics": {"type": "string", "default": "la"},
      "detune": {"type": "integer", "default": 0},
      "track_index": {"type": "integer", "default": 0}
    }
  }
}
```

调用示例：`add_note_to_svp(path="/tmp/demo.svp", onset_beats=2, duration_beats=0.5, pitch=67, lyrics="ko")`

### inspect_svp_project

返回完整工程摘要：速度、拍号、轨道数、每轨音符数、音域、是否有 pitch 曲线。

### list_svp_notes

列出指定轨道所有音符，包含位置（拍数）、时长、音高（MIDI + 音名）、歌词。

### midi_info

MIDI 音高参考表，帮助 AI 选择合适的音域。

## 端到端流程演示

用户说：**"创建一个 130 BPM 的 C 大调琶音练习"**

AI 内部执行链：

```
1. midi_info() → 了解音域
2. create_svp_project(
     path="/tmp/c_major.svp",
     bpm=130.0,
     voice_name="Kasane Teto (Lite)"
   )
3. add_note_to_svp(path="...", onset_beats=0, duration_beats=1, pitch=60, lyrics="do")
4. add_note_to_svp(path="...", onset_beats=1, duration_beats=1, pitch=64, lyrics="mi")
5. add_note_to_svp(path="...", onset_beats=2, duration_beats=1, pitch=67, lyrics="sol")
6. add_note_to_svp(path="...", onset_beats=3, duration_beats=2, pitch=72, lyrics="do!")
7. list_svp_notes(path="...") → 验证结果
```

执行结果：生成 4 个音符的 C 大调琶音，保存为 `/tmp/c_major.svp`，双击即可在 SynthV 中播放。

## 核心知识点

- [x] Bridge 层是"能力封装"——把底层库函数暴露为 AI 可调用的工具
- [x] 无状态设计适合文件操作——每个 Tool 完整执行读改写
- [x] 使用领域术语（拍数、音名）而非内部单位——降低 AI 理解成本
- [x] 辅助工具（midi_info）帮助 AI 正确使用主工具
- [x] 每步验证——AI 可以在操作过程中随时 list/inspect 确认结果

## 当前 Tools 全景

| Tool                      | Phase | 功能       |
| ------------------------- | ----- | ---------- |
| `hello`                   | 1     | 问候语     |
| `add`                     | 1     | 整数加法   |
| `read_file`               | 1     | 读取文件   |
| `create_svp_project`      | 3     | 新建工程   |
| `inspect_svp_project`     | 3     | 分析工程   |
| `list_svp_notes`          | 3     | 列出音符   |
| `add_note_to_svp`         | 3     | 添加音符   |
| `set_svp_render_filename` | 3     | 设置导出名 |
| `midi_info`               | 3     | 音高对照   |

## 下一步

Phase 4：AI 自然语言音乐工作流——让 AI 自动生成完整旋律、和声、歌词。

---

> **Synthesizer V MCP 开发系列**（共 4 篇）
>
> 上一篇：{% post_link svp-project-file-format %}
> 下一篇：{% post_link ai-music-composition-workflow %}
<!-- managed-by-backend-api -->