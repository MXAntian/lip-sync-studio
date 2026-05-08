import { useStore } from './store'
import { FilePicker } from './components/FilePicker'
import { GenerateButton } from './components/GenerateButton'
import { StatusOverlay } from './components/StatusOverlay'

export default function App() {
  return (
    <div className="h-screen flex flex-col p-6 pt-10 gap-5">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-accent">Lip Sync Studio</h1>
        <p className="text-xs text-muted mt-1">
          音频 + 口型 PNG → Premiere 序列
        </p>
      </div>

      {/* Config */}
      <div className="flex-1 flex flex-col gap-4">
        <FilePicker
          label="🎤 音频文件"
          hint="选 wav / mp3 / ogg"
          value={useStore(s => s.audioPath)}
          onPick={() => window.lipSyncApi.openAudioFile().then(p => p && useStore.getState().setAudioPath(p))}
        />

        <FilePicker
          label="👄 口型文件夹"
          hint="放 A.png ~ F.png（可选 X.png）"
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
      </div>

      {/* Generate */}
      <GenerateButton />

      {/* Status overlay */}
      <StatusOverlay />
    </div>
  )
}
