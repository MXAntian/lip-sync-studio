# Lip Sync Studio

> [中文](./README.zh-CN.md) · **English**

A simple desktop GUI that wraps [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync) and outputs **Final Cut Pro XML** ready to drop into Adobe Premiere Pro. No CLI, no manual XML editing — pick an audio file, a folder of mouth shape PNGs, and get a fully-aligned lip-sync sequence.

## What it does

Given:
- An audio file (`.wav` / `.mp3` / `.ogg`)
- A folder of mouth shape PNGs (`A.png`, `B.png`, … `H.png`, `X.png`)

It:
1. Converts audio to 16 kHz mono WAV (via bundled FFmpeg)
2. Runs Rhubarb to detect mouth-shape cues from speech
3. Samples cues uniformly along the timeline at your chosen FPS
4. Generates an **FCP XML** sequence with one PNG clip per frame
5. Saves the XML — open it in Premiere and your lip-sync track is timed exactly

## Quick start

1. Download the latest ZIP from [Releases](https://github.com/MXAntian/lip-sync-studio/releases) and extract it anywhere
2. Download Rhubarb itself from [DanielSWolf/rhubarb-lip-sync](https://github.com/DanielSWolf/rhubarb-lip-sync/releases) and unzip — **drop the folder beside `Lip Sync Studio.exe` and the GUI auto-detects it**
3. Double-click `Lip Sync Studio.exe` inside the extracted folder
4. In the GUI, point to your audio + mouth-shape folder (Rhubarb path is auto-filled if found)
5. Click **Generate**, save the XML
6. In Premiere, `File → Import` the XML → drag the new sequence onto your timeline

> **Why a folder, not a single EXE?** The single-file portable build re-extracts to a temp dir on every launch — settings written there get wiped on the next run. The folder distribution writes settings beside the EXE so they persist across launches.

## Usage

The main window asks for four things:

| Field | Notes |
|---|---|
| 🎤 Audio file | wav / mp3 / ogg. Non-WAV files are auto-converted using bundled FFmpeg. |
| 👄 Mouth folder | A folder containing `A.png` through `H.png` and optionally `X.png`. Naming is case-insensitive. |
| 🔧 Rhubarb path | Path to `rhubarb.exe`. Download separately. |
| 🎬 FPS | Frame rate of your output. Match your Premiere project (default 30). |

### Advanced options (collapsible)

| Option | Values | When to change |
|---|---|---|
| Recognizer | `pocketSphinx` (English, accurate) / `phonetic` (any language) | Switch to `phonetic` for non-English audio (Chinese, Japanese, etc.) |
| Extended shapes | basic (A–F) / +X / +GX / **GHX** (default) | Pick the shape set your PNG library covers. Default matches Rhubarb's default. |
| Dialog file | `.txt` | Optional script. Improves recognition accuracy for `pocketSphinx` only. |

## Mouth shape reference

Per Rhubarb's specification:

| Shape | Sound family |
|---|---|
| A | Closed mouth (P, B, M) |
| B | Slight open (K, S, T, U, etc.) |
| C | Open (E, AE) |
| D | Wide open (AA) |
| E | Round (AO, ER) |
| F | Small round (UW, OW) |
| G | F-like extended variant |
| H | L-like extended variant |
| X | Idle / silent / rest |

If your PNG folder is missing a shape Rhubarb outputs, the tool falls back along the chain `X → A → first available` so you never get blank frames.

## How it works

```
audio.wav
   │
   ▼
[FFmpeg]  → 16kHz mono WAV (cached in temp)
   │
   ▼
[Rhubarb]  → JSON cues  ({start, end, value} in seconds)
   │
   ▼
[Frame sampler]
   │   For each frame i in [0, totalFrames):
   │     t = i / fps
   │     find cue containing t
   │     emit <clipitem> with frame i ↔ mouth PNG
   ▼
[FCP XML writer]
   │
   ▼
sequence.xml  →  Premiere Pro
```

The frame sampler samples **uniformly along the timeline** rather than per-cue, avoiding ceiling drift caused by Rhubarb's 0.01s timestamp truncation versus arbitrary `1/fps` frame durations.

## Built on

- [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync) by Daniel S. Wolf — the actual lip-sync analysis engine. MIT licensed. **All credit for the hard part goes to Daniel.**
- [Electron](https://www.electronjs.org/) — desktop runtime
- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) — UI
- [Zustand](https://github.com/pmndrs/zustand) — state
- [Tailwind CSS](https://tailwindcss.com/) — styling
- [FFmpeg](https://ffmpeg.org/) — audio conversion (bundled)

## Build from source

```bash
git clone https://github.com/MXAntian/lip-sync-studio
cd lip-sync-studio
npm install
npm run package      # builds dist/Lip Sync Studio x.x.x.exe
```

For dev mode with hot reload: `npm run dev`.

## Status

This is a small focused tool — it does one thing (FCP XML output for Premiere) and tries to do it precisely. It's not aiming to replace After Effects / Spine integrations that Rhubarb already supports natively.

If you find a bug or have a feature request, open an [issue](https://github.com/MXAntian/lip-sync-studio/issues).

## License

[MIT](./LICENSE) — same as Rhubarb upstream, so attribution stays clean across the dependency chain.
