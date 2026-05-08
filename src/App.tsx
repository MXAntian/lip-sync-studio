import { useStore } from './store'
import { FilePicker } from './components/FilePicker'
import { GenerateButton } from './components/GenerateButton'
import { StatusOverlay } from './components/StatusOverlay'

const SHAPE_OPTIONS: Array<{ value: string; label: string; hint: string }> = [
  { value: '',    label: '基础（A-F）',     hint: '只用 6 种基础嘴型，没有静音/扩展' },
  { value: 'X',   label: '+ 静音（A-F + X）', hint: '加上 X 静音嘴型' },
  { value: 'GX',  label: '+ G（A-G + X）',   hint: '加上 G（F 的扩展变体）' },
  { value: 'GHX', label: '完整（A-H + X，默认）', hint: 'Rhubarb 默认全套 9 种' }
]

export default function App() {
  const recognizer = useStore(s => s.recognizer)
  const extendedShapes = useStore(s => s.extendedShapes)
  const dialogPath = useStore(s => s.dialogPath)

  return (
    <div className="h-screen flex flex-col p-6 pt-10 gap-4">
      {/* Header */}
      <div className="text-center shrink-0">
        <h1 className="text-xl font-bold text-accent">Lip Sync Studio</h1>
        <p className="text-xs text-muted mt-1">
          音频 + 口型 PNG → Premiere 序列
        </p>
      </div>

      {/* Config — scrollable middle */}
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
        <FilePicker
          label="🎤 音频文件"
          hint="选 wav / mp3 / ogg"
          value={useStore(s => s.audioPath)}
          onPick={() => window.lipSyncApi.openAudioFile().then(p => p && useStore.getState().setAudioPath(p))}
        />

        <FilePicker
          label="👄 口型文件夹"
          hint="放 A.png ~ H.png（可选 X.png）"
          value={useStore(s => s.mouthDir)}
          onPick={() => window.lipSyncApi.openMouthFolder().then(p => p && useStore.getState().setMouthDir(p))}
        />

        <FilePicker
          label="🔧 Rhubarb 路径"
          hint="rhubarb.exe"
          value={useStore(s => s.rhubarbPath)}
          onPick={() => window.lipSyncApi.openRhubarb().then(p => p && useStore.getState().setRhubarbPath(p))}
        />

        {/* FPS */}
        <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3">
          <span className="text-sm text-muted w-28 shrink-0">帧率</span>
          <input
            type="number"
            value={useStore(s => s.fps)}
            onChange={e => useStore.getState().setFps(Number(e.target.value) || 30)}
            min={1}
            max={120}
            className="bg-transparent text-sm text-white outline-none w-20 text-center border border-border rounded px-2 py-1"
          />
          <span className="text-xs text-muted">fps（默认 30）</span>
        </div>

        {/* Advanced — 折叠收起 */}
        <details className="bg-card border border-border rounded-lg">
          <summary className="cursor-pointer text-sm text-white px-4 py-3 select-none hover:text-accent transition-colors">
            ⚙️ 高级选项 <span className="text-xs text-muted ml-1">(识别器 · 嘴型集 · 台本)</span>
          </summary>

          <div className="border-t border-border px-4 py-3 flex flex-col gap-3">
            {/* Recognizer */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">识别器</span>
              <select
                value={recognizer}
                onChange={e => useStore.getState().setRecognizer(e.target.value as 'pocketSphinx' | 'phonetic')}
                className="bg-bg border border-border rounded px-2 py-1.5 text-sm text-white outline-none"
              >
                <option value="pocketSphinx">pocketSphinx（英语 · 精度高）</option>
                <option value="phonetic">phonetic（任意语言 · 中文必选）</option>
              </select>
            </div>

            {/* Extended shapes */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">扩展嘴型</span>
              <select
                value={extendedShapes}
                onChange={e => useStore.getState().setExtendedShapes(e.target.value)}
                className="bg-bg border border-border rounded px-2 py-1.5 text-sm text-white outline-none"
              >
                {SHAPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <span className="text-[11px] text-muted leading-tight">
                {SHAPE_OPTIONS.find(o => o.value === extendedShapes)?.hint}
              </span>
            </div>

            {/* Dialog file */}
            <div>
              <FilePicker
                label="📜 台本文件"
                hint="选填 · txt · 仅 pocketSphinx 提升识别准度"
                value={dialogPath}
                onPick={() => window.lipSyncApi.openDialogFile().then(p => p && useStore.getState().setDialogPath(p))}
                onClear={() => useStore.getState().setDialogPath('')}
              />
            </div>
          </div>
        </details>
      </div>

      {/* Generate */}
      <div className="shrink-0">
        <GenerateButton />
      </div>

      {/* Status overlay */}
      <StatusOverlay />
    </div>
  )
}
