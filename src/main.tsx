import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { useStore } from './store'
import './index.css'

// ── Settings hydration & auto-save ──
//
// 启动时从 main process 读 lip-sync-settings.json 把上次状态注回 store。
// 之后用 zustand subscribe 监听关心字段变化，300ms 防抖写盘——
// 避免每次 keystroke 都触发 IPC + 文件 IO。

function bootSettings(): void {
  // 1. 启动时拉取上次配置
  window.lipSyncApi.loadSettings().then(s => {
    useStore.setState({
      audioPath: s.audioPath ?? '',
      mouthDir: s.mouthDir ?? '',
      rhubarbPath: s.rhubarbPath ?? '',
      fps: typeof s.fps === 'number' && s.fps > 0 ? s.fps : 30,
      recognizer: s.recognizer ?? 'pocketSphinx',
      extendedShapes: s.extendedShapes ?? 'GHX',
      dialogPath: s.dialogPath ?? ''
    })
  }).catch(e => console.error('[settings] load failed:', e))

  // 2. 监听变化，防抖保存
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  useStore.subscribe((state, prev) => {
    const changed =
      state.audioPath !== prev.audioPath ||
      state.mouthDir !== prev.mouthDir ||
      state.rhubarbPath !== prev.rhubarbPath ||
      state.fps !== prev.fps ||
      state.recognizer !== prev.recognizer ||
      state.extendedShapes !== prev.extendedShapes ||
      state.dialogPath !== prev.dialogPath
    if (!changed) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      window.lipSyncApi.saveSettings({
        audioPath: state.audioPath,
        mouthDir: state.mouthDir,
        rhubarbPath: state.rhubarbPath,
        fps: state.fps,
        recognizer: state.recognizer,
        extendedShapes: state.extendedShapes,
        dialogPath: state.dialogPath
      })
    }, 300)
  })
}

bootSettings()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
