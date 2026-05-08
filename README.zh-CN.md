# Lip Sync Studio · 暗影对口型工作室

> **中文** · [English](./README.md)

[Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync) 的桌面 GUI 包装，输出 **FCP XML** 直接拖进 Adobe Premiere Pro 时间轴。不用碰命令行、不用手写 XML——选音频、选嘴型 PNG 文件夹，得到精确对齐的唇形序列。

## 它做什么

输入：

- 音频文件（`.wav` / `.mp3` / `.ogg`）
- 嘴型 PNG 文件夹（`A.png`、`B.png`、…、`H.png`、`X.png`）

输出：

1. 把音频转成 16kHz mono WAV（用内置 FFmpeg）
2. 跑 Rhubarb 从语音识别嘴型 cue
3. 沿时间轴**均匀采样**到你设的 FPS
4. 生成 **FCP XML**，每一帧一个 PNG clip
5. 保存 XML——Premiere 里打开就是对齐好的对口型轨

## 快速开始

1. 从 [Releases](https://github.com/MXAntian/lip-sync-studio/releases) 下最新 ZIP，解压到任意位置
2. 从 [DanielSWolf/rhubarb-lip-sync](https://github.com/DanielSWolf/rhubarb-lip-sync/releases) 下 Rhubarb，解压——**把整个文件夹丢到 `Lip Sync Studio.exe` 旁边，GUI 会自动识别**
3. 双击解压后文件夹里的 `Lip Sync Studio.exe`
4. GUI 里选好音频 + 嘴型文件夹（Rhubarb 路径自动填好）
5. 点「生成 Lip Sync 序列」，保存 XML
6. Premiere 里 `文件 → 导入` XML，把新序列拖到时间轴

> **为什么是文件夹而不是单 EXE？** 单文件 portable 构建每次启动都把自己解压到临时目录跑，写到那里的配置下次启动就丢了。文件夹分发把配置写在 EXE 旁边，跨次启动稳定保留。

## 使用说明

主界面四个必填：

| 字段 | 说明 |
|---|---|
| 🎤 音频文件 | wav / mp3 / ogg。非 WAV 自动用内置 FFmpeg 转换 |
| 👄 口型文件夹 | 含 `A.png` 到 `H.png`，可选 `X.png`。不区分大小写 |
| 🔧 Rhubarb 路径 | `rhubarb.exe` 的路径，单独下载 |
| 🎬 帧率 | 输出帧率，匹配 Premiere 项目设置（默认 30） |

### 高级选项（默认折叠）

| 选项 | 取值 | 什么时候改 |
|---|---|---|
| 识别器 | `pocketSphinx`（英语，精度高） / `phonetic`（任意语言） | **中文音频必选 phonetic**，pocketSphinx 只识别英语 |
| 扩展嘴型 | 基础 (A–F) / +X / +GX / **GHX**（默认） | 按你的 PNG 素材库覆盖范围选。默认跟 Rhubarb 默认对齐 |
| 台本文件 | `.txt` | 选填台本能显著提高 `pocketSphinx` 英文识别准度 |

## 嘴型对照表

按 Rhubarb 官方规范：

| 形状 | 音素族 |
|---|---|
| A | 闭嘴（P、B、M） |
| B | 微张（K、S、T、U 等） |
| C | 张开（E、AE） |
| D | 大张（AA） |
| E | 圆唇（AO、ER） |
| F | 小圆（UW、OW） |
| G | F 的扩展变体 |
| H | L 的扩展变体 |
| X | 静音 / 闭嘴 idle |

PNG 文件夹缺哪种形状，工具会按 `X → A → 第一个能找到的` 回退，不会出现空白帧。

## 工作原理

```
audio.wav
   │
   ▼
[FFmpeg]  → 16kHz mono WAV（缓存在 temp 目录）
   │
   ▼
[Rhubarb]  → JSON cues（{start, end, value}，单位秒）
   │
   ▼
[帧采样器]
   │   对每帧 i 属于 [0, totalFrames)：
   │     t = i / fps
   │     扫到包含 t 的 cue
   │     生成 <clipitem>，把 frame i 关联到对应嘴型 PNG
   ▼
[FCP XML 写出]
   │
   ▼
sequence.xml  →  Premiere Pro
```

帧采样器**沿时间轴均匀采样**而不是按 cue 切片——避开 Rhubarb 的 0.01s 时间戳截断与任意 `1/fps` 帧时长不整除时的累积取整偏差（v0.1.3 修复的核心 bug）。

## 致谢

- [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync) — Daniel S. Wolf 出品，**真正干活的语音识别引擎**。MIT 协议，**对口型这个难题的全部功劳都属于 Daniel。**
- [Electron](https://www.electronjs.org/) · 桌面运行时
- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) · UI 栈
- [Zustand](https://github.com/pmndrs/zustand) · 状态管理
- [Tailwind CSS](https://tailwindcss.com/) · 样式
- [FFmpeg](https://ffmpeg.org/) · 音频转换（已捆绑）

## 自己编译

```bash
git clone https://github.com/MXAntian/lip-sync-studio
cd lip-sync-studio
npm install
npm run package      # 生成 dist/Lip Sync Studio x.x.x.exe
```

开发模式带热重载：`npm run dev`。

## 项目状态

这是个**小而专**的工具——只做一件事（生成 Premiere 用的 FCP XML），尽量做精确。不打算覆盖 After Effects / Spine 这些 Rhubarb 已原生支持的集成。

发现 bug 或需求 → [issue](https://github.com/MXAntian/lip-sync-studio/issues)。

## 协议

[MIT](./LICENSE)——跟上游 Rhubarb 一致，依赖链 attribution 干净。
