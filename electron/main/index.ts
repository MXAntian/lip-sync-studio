import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { spawnSync, execSync } from 'child_process'
import { existsSync, readdirSync, mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { basename, extname } from 'path'

// ── Types ──

export interface LipSyncConfig {
  audioPath: string
  mouthDir: string
  fps: number
  rhubarbPath: string
  /** 'pocketSphinx' (default, English) | 'phonetic' (any language) */
  recognizer?: 'pocketSphinx' | 'phonetic'
  /** Rhubarb --extendedShapes 值，默认 'GHX'。可选 '' / 'X' / 'GX' / 'GHX' */
  extendedShapes?: string
  /** 可选台本文件路径（仅 pocketSphinx 英文识别有效） */
  dialogPath?: string
}

export interface LipSyncResult {
  ok: boolean
  xmlPath?: string
  error?: string
}

// ── Window ──

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 560,
    height: 700,
    resizable: false,
    backgroundColor: '#0a0e1a',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a0e1a',
      symbolColor: '#4f6ef7',
      height: 32
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ── Dialogs ──

ipcMain.handle('dialog:openFile', async (_e, filters?: Electron.FileFilter[]) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: filters ?? [{ name: 'Audio', extensions: ['wav', 'mp3', 'ogg'] }]
  })
  return result.canceled ? null : result.filePaths[0] ?? null
})

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  return result.canceled ? null : result.filePaths[0] ?? null
})

ipcMain.handle('dialog:openRhubarb', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Executable', extensions: ['exe'] }]
  })
  return result.canceled ? null : result.filePaths[0] ?? null
})

ipcMain.handle('dialog:saveXml', async () => {
  const result = await dialog.showSaveDialog({
    defaultPath: 'lip-sync-sequence.xml',
    filters: [{ name: 'FCP XML', extensions: ['xml'] }]
  })
  return result.canceled ? null : result.filePath ?? null
})

// ── Audio conversion ──

function convertToWav(inputPath: string): string {
  const base = basename(inputPath, extname(inputPath))
  const wavPath = join(tmpdir(), `${base}_rhubarb.wav`)
  
  if (existsSync(wavPath)) return wavPath

  // Try bundled ffmpeg first, then system ffmpeg
  const ffmpegPaths = [
    join(app.getAppPath(), 'resources', 'ffmpeg.exe'),
    join(process.resourcesPath ?? '', 'ffmpeg.exe'),
    'ffmpeg'
  ]

  for (const ff of ffmpegPaths) {
    try {
      execSync(`"${ff}" -y -i "${inputPath}" -ar 16000 -ac 1 -sample_fmt s16 "${wavPath}"`, {
        stdio: 'pipe',
        timeout: 30000
      })
      return wavPath
    } catch {
      continue
    }
  }

  throw new Error(
    '未找到 ffmpeg。请将 ffmpeg.exe 放到 lip-sync-studio 目录下，或安装到系统 PATH。\n\n' +
    '下载: https://ffmpeg.org/download.html'
  )
}

// ── Rhubarb execution ──

function runRhubarb(
  rhubarbPath: string,
  wavPath: string,
  opts: {
    dialogPath?: string
    recognizer?: 'pocketSphinx' | 'phonetic'
    extendedShapes?: string
  } = {}
): Array<{ start: number; end: number; value: string }> {
  const jsonPath = join(tmpdir(), `rhubarb_${Date.now()}.json`)

  const args = ['-f', 'json', '-o', jsonPath]

  // 识别器：pocketSphinx (默认，英文) 或 phonetic (任意语言)
  if (opts.recognizer) {
    args.push('-r', opts.recognizer)
  }

  // 扩展嘴型：'' / 'X' / 'GX' / 'GHX'，默认 GHX
  // 用 typeof 判断而不是 truthy，因为 '' 也是合法值（基础集 ABCDEF）
  if (typeof opts.extendedShapes === 'string') {
    args.push('--extendedShapes', opts.extendedShapes)
  }

  // 台本文件（提高识别准度，仅 pocketSphinx 英文场景有效）
  if (opts.dialogPath) {
    args.push('-d', opts.dialogPath)
  }

  args.push(wavPath)

  const result = spawnSync(rhubarbPath, args, {
    stdio: 'pipe',
    timeout: 120000
  })

  if (result.error) {
    throw new Error(`Rhubarb 执行失败: ${result.error.message}`)
  }
  if (result.status !== 0) {
    const stderr = result.stderr.toString('utf8')
    throw new Error(`Rhubarb 返回错误:\n${stderr}`)
  }

  // Read JSON output
  const raw = require('fs').readFileSync(jsonPath, 'utf8')
  const data = JSON.parse(raw)
  return data.mouthCues ?? []
}

// ── FCP XML generation ──

interface MouthCue {
  start: number
  end: number
  value: string
}

function generateFcpXml(
  cues: MouthCue[],
  mouthDir: string,
  fps: number,
  audioName: string
): string {
  const frameDuration = 1 / fps
  const mouthFiles = new Map<string, string>()

  // Discover mouth PNGs: A.png ~ H.png, X.png（覆盖 Rhubarb 全部 9 种嘴型）
  const files = readdirSync(mouthDir)
  for (const f of files) {
    const match = f.match(/^([A-HX])\.png$/i)
    if (match) {
      mouthFiles.set(match[1].toUpperCase(), join(mouthDir, f).replace(/\\/g, '/'))
    }
  }

  // Idle mouth fallback: Rhubarb 给静音段输出 value="X"，但很多素材库没有 X.png。
  // 优先级：X（Rhubarb 标准静音）→ A（常见闭嘴 idle 约定）→ 第一个能找到的
  const idleMouth =
    mouthFiles.has('X') ? 'X' :
    mouthFiles.has('A') ? 'A' :
    mouthFiles.size > 0 ? Array.from(mouthFiles.keys())[0] : ''

  // Build frame sequence —— 按 timeline 均匀采样而不是按 cue 切。
  //
  // 历史 bug（v0.1.2 及更早）：原来代码对每个 cue 单独跑 `t += frameDuration` 循环切帧，
  // 当 cue 长度不是 frameDuration 的整数倍时会向上取整一帧。Rhubarb JSON 时间戳
  // 截断到 0.01s 的整数倍（官方文档保证），而 30fps frameDuration ≈ 0.0333s 跟 0.01s
  // 不整除，导致每个 cue 累积 0~1 帧偏差。33s 音频通常 100~150 个 cue，总共多生成
  // ~115 帧 → 序列被拉长 ~11.67%（小天实测 111.66% 倒推完全吻合）。
  //
  // 修：用音频总时长 × fps 算总帧数，每帧时间戳 t = i/fps，扫描包含 t 的 cue 取嘴型。
  const audioDuration = cues.length > 0 ? cues[cues.length - 1].end : 0
  const totalFrames = Math.round(audioDuration * fps)
  const frames: Array<{ frameStart: number; mouth: string }> = []

  let cueIdx = 0
  for (let i = 0; i < totalFrames; i++) {
    const t = i / fps
    // cues 是按时间顺序连续的，cueIdx 单调推进
    while (cueIdx < cues.length && t >= cues[cueIdx].end) cueIdx++
    const cue = cues[cueIdx]
    const mouth = cue ? cue.value : (idleMouth || 'X')
    frames.push({ frameStart: t, mouth })
  }

  // Generate FCP XML
  // ⚠ FCP XML 的 <duration>/<start>/<end> 单位是 timebase frames，
  //    不存在 "subframe" 一层。30fps 下 5s clip → duration=150 (frames)。
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="5">
  <sequence>
    <name>Lip Sync - ${escapeXml(audioName)}</name>
    <duration>${totalFrames}</duration>
    <rate>
      <timebase>${fps}</timebase>
      <ntsc>FALSE</ntsc>
    </rate>
    <media>
      <video>
        <format>
          <samplecharacteristics>
            <width>1920</width>
            <height>1080</height>
            <pixelaspectratio>square</pixelaspectratio>
            <anamorphic>FALSE</anamorphic>
            <rate>
              <timebase>${fps}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
          </samplecharacteristics>
        </format>
        <track>
`

  // Generate clips
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i]
    // 找不到 mouth.png 时 fallback 到 idle，避免时间轴空帧
    const mouth = mouthFiles.has(f.mouth) ? f.mouth : idleMouth
    const mouthFile = mouthFiles.get(mouth)
    if (!mouthFile) continue

    const clipStart = i      // 单位是 frame，不是 subframe
    const clipEnd = i + 1

    xml += `          <clipitem id="frame-${i}">
            <name>${mouth}</name>
            <duration>1</duration>
            <rate>
              <timebase>${fps}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <start>${clipStart}</start>
            <end>${clipEnd}</end>
            <file id="mouth-${mouth}">
              <name>${basename(mouthFile)}</name>
              <pathurl>file://localhost/${encodeURI(mouthFile)}</pathurl>
              <duration>1</duration>
              <rate>
                <timebase>${fps}</timebase>
                <ntsc>FALSE</ntsc>
              </rate>
              <media>
                <video>
                  <duration>1</duration>
                  <samplecharacteristics>
                    <width>1920</width>
                    <height>1080</height>
                  </samplecharacteristics>
                </video>
              </media>
            </file>
            <link>
              <linkclipref>frame-${i}</linkclipref>
              <mediatype>video</mediatype>
            </link>
          </clipitem>
`
  }

  xml += `        </track>
      </video>
    </media>
  </sequence>
</xmeml>`

  return xml
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── Generate IPC ──

ipcMain.handle('lipsync:generate', async (_e, config: LipSyncConfig): Promise<LipSyncResult> => {
  try {
    const { audioPath, mouthDir, fps, rhubarbPath, recognizer, extendedShapes, dialogPath } = config

    // Validate
    if (!existsSync(rhubarbPath)) {
      return { ok: false, error: `Rhubarb 未找到: ${rhubarbPath}` }
    }
    if (!existsSync(audioPath)) {
      return { ok: false, error: `音频文件未找到: ${audioPath}` }
    }
    if (!existsSync(mouthDir)) {
      return { ok: false, error: `口型文件夹未找到: ${mouthDir}` }
    }
    if (dialogPath && !existsSync(dialogPath)) {
      return { ok: false, error: `台本文件未找到: ${dialogPath}` }
    }

    // Convert audio to WAV if needed
    const ext = extname(audioPath).toLowerCase()
    let wavPath = audioPath
    if (ext !== '.wav') {
      wavPath = convertToWav(audioPath)
    }

    // Run Rhubarb
    const cues = runRhubarb(rhubarbPath, wavPath, { recognizer, extendedShapes, dialogPath })
    if (!cues || cues.length === 0) {
      return { ok: false, error: 'Rhubarb 未生成口型数据。请检查音频文件是否包含人声。' }
    }

    // Generate XML
    const xml = generateFcpXml(cues, mouthDir, fps, basename(audioPath))

    // Save dialog
    const savePath = await dialog.showSaveDialog({
      defaultPath: basename(audioPath, extname(audioPath)) + '-lipsync.xml',
      filters: [{ name: 'FCP XML', extensions: ['xml'] }]
    })

    if (savePath.canceled || !savePath.filePath) {
      return { ok: false, error: '已取消保存' }
    }

    writeFileSync(savePath.filePath, xml, 'utf8')

    return {
      ok: true,
      xmlPath: savePath.filePath
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
})

// ── App lifecycle ──

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
