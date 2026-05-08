interface FilePickerProps {
  label: string
  hint: string
  value: string
  onPick: () => void
  /** 当存在时，已选择文件后会显示一个 ✕ 清除按钮（用于可选项如台本） */
  onClear?: () => void
}

export function FilePicker({ label, hint, value, onPick, onClear }: FilePickerProps) {
  const displayName = value ? value.split(/[/\\]/).pop() ?? value : ''

  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-white">{label}</span>
          <span className="text-xs text-muted">{hint}</span>
        </div>
        <div className="flex items-center gap-2">
          {value && onClear && (
            <button
              onClick={onClear}
              title="清除"
              className="text-xs bg-border hover:bg-card text-muted hover:text-white w-7 h-7 rounded transition-colors"
            >
              ✕
            </button>
          )}
          <button
            onClick={onPick}
            className="text-xs bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded transition-colors"
          >
            {value ? '更换' : '选择'}
          </button>
        </div>
      </div>
      {displayName && (
        <div className="mt-2 text-xs text-muted truncate bg-bg/50 rounded px-2 py-1">
          {displayName}
        </div>
      )}
    </div>
  )
}
