---
title: SVP 工程文件格式全解析
date: 2026-05-20 15:41:31
description: 深入解析 Synthesizer V 的 .svp 工程文件格式——顶层结构、时间系统、音符字段、参数曲线、声库配置，以及用 Python 读写 SVP 的实战代码。
categories:
  - AI
  - MCP
  - SynthV
tags:
  - Synthesizer V
  - SVP 
  - JSON 
  - Music
  - File Format
---

## 概述

`.svp` 是 Synthesizer V Studio 的工程文件格式。

**核心发现：SVP 是纯 JSON。**

这意味着 AI 可以直接读写工程文件——生成音符、填歌词、调音高——不需要运行 SynthV 本身。

## 顶层结构

```json
{
  "version": 153,
  "time": { "meter": [...], "tempo": [...] },
  "library": [],
  "tracks": [...],
  "renderConfig": {...}
}
```

| 字段           | 类型   | 说明                     |
| -------------- | ------ | ------------------------ |
| `version`      | int    | 文件格式版本（当前 153） |
| `time`         | object | 拍号、速度变化           |
| `library`      | array  | 外部库引用（通常为空）   |
| `tracks`       | array  | 所有轨道                 |
| `renderConfig` | object | 导出配置                 |

## 时间系统

SVP 使用内部大整数表示时间。换算关系：

```
1 beat (120 BPM) = 705,600,000 units
1 second         = 1,411,200,000 units
1 sample (44100Hz)= 32,000 units
```

换算公式：

```python
beats   = units / 705600000 * (bpm / 120)
seconds = units / 1411200000
```

### 拍号 & 速度

```json
"time": {
  "meter": [{"index": 0, "numerator": 4, "denominator": 4}],
  "tempo": [{"position": 0, "bpm": 120.0}]
}
```

- `meter[]` — 拍号变化数组，`index` 是变化的拍位置
- `tempo[]` — 速度变化数组，`position` 是变化的拍位置

## 轨道（Track）

```json
{
  "name": "Track Name",
  "dispColor": "ff7db235",
  "dispOrder": 0,
  "renderEnabled": false,
  "mixer": {
    "gainDecibel": 0.0,
    "pan": 0.0,
    "mute": false, "solo": false, "display": true
  },
  "mainGroup": { /* 音符组 */ },
  "mainRef": { /* 轨道级参数 */ },
  "groups": []
}
```

### 轨道类型

| 类型     | mainRef.isInstrumental | 特征                         |
| -------- | ---------------------- | ---------------------------- |
| 人声轨道 | `false`                | 有 voice database、note 数据 |
| 伴奏轨道 | `true`                 | 有 audio 文件引用、无 note   |

## 音符（Note）—— 最核心

```json
{
  "musicalType": "singing",
  "onset": 441000000,
  "duration": 705600000,
  "lyrics": "ri",
  "phonemes": "",
  "accent": "",
  "pitch": 65,
  "detune": 0,
  "instantMode": true,
  "attributes": {"evenSyllableDuration": true},
  "systemAttributes": {
    "tF0Offset": -0.0,
    "tF0Left": 0.10000000149011612,
    "tF0Right": 0.10000000149011612,
    "dF0Left": 0.0,
    "dF0Right": 0.0,
    "dF0Vbr": 0.0,
    "evenSyllableDuration": true
  },
  "pitchTakes": {
    "activeTakeId": 0,
    "takes": [{"id": 0, "expr": 0.0, "liked": false}]
  },
  "timbreTakes": {
    "activeTakeId": 0,
    "takes": [{"id": 0, "expr": 0.0, "liked": false}]
  }
}
```

### 关键字段

| 字段          | 类型   | 说明                             |
| ------------- | ------ | -------------------------------- |
| `onset`       | int    | 开始时间（SVP 内部单位）         |
| `duration`    | int    | 时长（同上）                     |
| `lyrics`      | string | 歌词音节（如 "ri", "jia", "la"） |
| `phonemes`    | string | 音素覆盖（空 = 自动）            |
| `pitch`       | int    | MIDI 音符号（60 = C4, 69 = A4）  |
| `detune`      | int    | 微调（音分, cents）              |
| `musicalType` | string | 类型："singing"（歌唱）/ 其他    |

### systemAttributes：AI 生成的演唱参数

| 字段                   | 说明                       |
| ---------------------- | -------------------------- |
| `tF0Offset`            | 基频起始偏移               |
| `tF0Left` / `tF0Right` | 音高过渡时间（前后）       |
| `dF0Left` / `dF0Right` | 音高过渡深度               |
| `dF0Vbr`               | 颤音深度（0 = 无 vibrato） |

### pitchTakes / timbreTakes

类似于录音"Take"的概念——可以有多条 pitch/timbre 表达，切换 activeTakeId 选择不同版本。

## 参数曲线

所有声学参数都是 **Cubic Spline** 曲线，用平铺的 `[x1, y1, x2, y2, ...]` 数组存储。

```json
"parameters": {
  "pitchDelta":  {"mode": "cubic", "points": []},
  "vibratoEnv":  {"mode": "cubic", "points": []},
  "loudness":    {"mode": "cubic", "points": []},
  "tension":     {"mode": "cubic", "points": []},
  "breathiness": {"mode": "cubic", "points": []},
  "voicing":     {"mode": "cubic", "points": []},
  "gender":      {"mode": "cubic", "points": []},
  "toneShift":   {"mode": "cubic", "points": []}
}
```

| 参数          | 单位  | 说明                                                  |
| ------------- | ----- | ----------------------------------------------------- |
| `pitchDelta`  | cents | 音高偏差曲线（AI 自动生成值在 `systemPitchDelta` 中） |
| `vibratoEnv`  | cents | 颤音包络                                              |
| `loudness`    | dB?   | 响度                                                  |
| `tension`     | —     | 紧张度                                                |
| `breathiness` | —     | 气息感                                                |
| `voicing`     | —     | 发声度                                                |
| `gender`      | —     | 性别因子                                              |
| `toneShift`   | —     | 音色偏移                                              |

**注意**：轨道级 `mainGroup.parameters` 和轨道引用级 `mainRef.systemPitchDelta` 都存在 pitch 数据——AI 生成的 pitch 曲线在 `mainRef.systemPitchDelta` 中。

## 声库（Voice Database）

```json
"database": {
  "name": "Kasane Teto (Lite)",
  "language": "japanese",
  "phoneset": "romaji",
  "languageOverride": "",
  "phonesetOverride": "",
  "backendType": "SVR2AI",
  "version": "100"
}
```

`backendType` 可选值：`SVR2AI`（AI 合成引擎）。

## 渲染配置

```json
"renderConfig": {
  "destination": "",
  "filename": "untitled",
  "numChannels": 1,
  "aspirationFormat": "noAspiration",
  "bitDepth": 16,
  "sampleRate": 44100,
  "exportMixDown": true,
  "exportPitch": false
}
```

## 实战：用 Python 操作 SVP

### 读取和分析

```python
from synthv_mcp.svp import load, inspect, list_notes

project = load("my_project.svp")

# 概要
info = inspect(project)
print(f"BPM: {info['bpm']}, 轨道数: {info['track_count']}")

# 列出音符
for note in list_notes(project, track_index=0):
    beat = units_to_beats(note['onset'])
    name = midi_to_note_name(note['pitch'])
    print(f"  拍 {beat:.1f}: {note['lyrics']} ({name})")
```

### 创建工程

```python
from synthv_mcp.svp import create_project, add_note, save, beats_to_units

proj = create_project(bpm=130, voice_db="Kasane Teto (Lite)")

# 添加音符：C4 四分音符，歌词 "la"
note = add_note(
    track=proj["tracks"][0],
    onset=beats_to_units(0, bpm=130),
    duration=beats_to_units(1, bpm=130),
    pitch=60,
    lyrics="la",
)
proj["tracks"][0]["mainGroup"]["notes"].append(note)

save(proj, "output.svp")
```

## 核心知识清单

- [x] SVP 是纯 JSON
- [x] 顶层结构：version + time + tracks + renderConfig
- [x] 时间单位：1 beat@120BPM = 705,600,000 units
- [x] 音符字段：onset, duration, lyrics, pitch, detune
- [x] MIDI 音高：60 = C4, 每 +1 = 升高半音
- [x] 参数曲线：8 种 vocal 参数，全部是 cubic spline
- [x] 人声 vs 伴奏轨道：isInstrumental 字段区分
- [x] 声库信息嵌入在 mainRef.database 中

## 下一步

Phase 3：将 SVP 操作封装为 MCP Tools，让 Claude 能自动生成音符、填词、调音高。

---

> **Synthesizer V MCP 开发系列**（共 4 篇）
>
> 上一篇：{% post_link mcp-basics-ai-tool-calling %}
> 下一篇：{% post_link mcp-bridge-claude-synthv %}
<!-- managed-by-backend-api -->