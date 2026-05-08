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

function runRhubarb(rhubarbPath: string, wavPath: string, dialogPath?: string): Array<{ start: number; end: number; value: string }> {
  const jsonPath = join(tmpdir(), `rhubarb_${Date.now()}.json`)
  
  const args = ['-f', 'json', '-o', jsonPath]
  if (dialogPath) {
    args.push('-d', dialogPath)
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

  // Discover mouth PNGs: A.png, B.png, ... F.png, X.png
  const files = readdirSync(mouthDir)
  for (const f of files) {
    const match = f.match(/^([A-FX])\.png$/i)
    if (match) {
      mouthFiles.set(match[1].toUpperCase(), join(mouthDir, f).replace(/\\/g, '/'))
    }
  }

  // Build frame sequence
  const frames: Array<{ frameStart: number; duration: number; mouth: string }> = []
  
  for (const cue of cues) {
    let t = cue.start
    while (t < cue.end - 0.001) {
      const remaining = cue.end - t
      const duration = Math.min(frameDuration, remaining)
      frames.push({
        frameStart: t,
        duration,
        mouth: cue.value
      })
      t += frameDuration
    }
  }

  // Total duration in frames
  const totalFrames = frames.length

  // Generate FCP XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="5">
  <sequence>
    <name>Lip Sync - ${escapeXml(audioName)}</name>
    <duration>${totalFrames * 100}</duration>
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
    const mouthFile = mouthFiles.get(f.mouth)
    if (!mouthFile) continue

    const clipStart = i * 100  // 100 subframe units per frame
    const clipEnd = (i + 1) * 100

    xml += `          <clipitem id="frame-${i}">
            <name>${f.mouth}</name>
            <duration>100</duration>
            <rate>
              <timebase>${fps}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <start>${clipStart}</start>
            <end>${clipEnd}</end>
            <file id="mouth-${f.mouth}">
              <name>${basename(mouthFile)}</name>
              <pathurl>file://localhost/${encodeURI(mouthFile)}</pathurl>
              <duration>100</duration>
              <rate>
                <timebase>${fps}</timebase>
                <ntsc>FALSE</ntsc>
              </rate>
              <media>
                <video>
                  <duration>100</duration>
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
    const { audioPath, mouthDir, fps, rhubarbPath } = config

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

    // Convert audio to WAV if needed
    const ext = extname(audioPath).toLowerCase()
    let wavPath = audioPath
    if (ext !== '.wav') {
      wavPath = convertToWav(audioPath)
    }

    // Run Rhubarb
    const cues = runRhubarb(rhubarbPath, wavPath)
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
