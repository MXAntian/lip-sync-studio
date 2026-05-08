import { useStore } from '../store'

export function StatusOverlay() {
  const { status, statusText, resultPath } = useStore()

  if (status === 'idle') return null

  const bgColor =
    status === 'running' ? 'bg-accent/10 border-accent/30' :
    status === 'done' ? 'bg-success/10 border-success/30' :
    'bg-error/10 border-error/30'

  const textColor =
    status === 'running' ? 'text-accent' :
    status === 'done' ? 'text-success' :
    'text-error'

  return (
    <div className={`mt-2 rounded-lg border px-4 py-3 ${bgColor}`}>
      <p className={`text-sm ${textColor}`}>{statusText}</p>
      {status === 'done' && resultPath && (
        <p className="text-xs text-muted mt-1 truncate">
          已保存: {resultPath}
        </p>
      )}
      {status === 'done' && (
        <p className="text-xs text-muted mt-2">
          📥 在 Premiere 中: File → Import → 选择生成的 XML 文件
        </p>
      )}
    </div>
  )
}
