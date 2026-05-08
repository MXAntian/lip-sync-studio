import { useStore } from '../store'

export function GenerateButton() {
  const {
    audioPath, mouthDir, rhubarbPath, fps,
    recognizer, extendedShapes, dialogPath,
    status, setStatus, setResultPath
  } = useStore()

  const canGenerate = audioPath && mouthDir && rhubarbPath && fps > 0 && status !== 'running'

  const handleGenerate = async () => {
    if (!canGenerate) return

    setStatus('running', '正在分析音频...')

    const result = await window.lipSyncApi.generate({
      audioPath,
      mouthDir,
      fps,
      rhubarbPath,
      recognizer,
      extendedShapes,
      dialogPath: dialogPath || undefined
    })

    if (result.ok && result.xmlPath) {
      setStatus('done', '生成完成！')
      setResultPath(result.xmlPath)
    } else {
      setStatus('error', result.error ?? '未知错误')
      setResultPath(null)
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={!canGenerate}
      className={`w-full py-3 rounded-lg text-sm font-semibold transition-all ${
        canGenerate
          ? 'bg-accent hover:bg-accent-hover text-white cursor-pointer'
          : 'bg-border text-muted cursor-not-allowed'
      }`}
    >
      {status === 'running' ? '⏳ 生成中...' : '🎬 生成 Lip Sync 序列'}
    </button>
  )
}
