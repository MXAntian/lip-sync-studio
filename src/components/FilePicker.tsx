interface FilePickerProps {
  label: string
  hint: string
  value: string
  onPick: () => void
}

export function FilePicker({ label, hint, value, onPick }: FilePickerProps) {
  const displayName = value ? value.split(/[/\\]/).pop() ?? value : ''

  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-white">{label}</span>
          <span className="text-xs text-muted">{hint}</span>
        </div>
        <button
          onClick={onPick}
          className="text-xs bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded transition-colors"
        >
          {value ? '更换' : '选择'}
        </button>
      </div>
      {displayName && (
        <div className="mt-2 text-xs text-muted truncate bg-bg/50 rounded px-2 py-1">
          {displayName}
        </div>
      )}
    </div>
  )
}
