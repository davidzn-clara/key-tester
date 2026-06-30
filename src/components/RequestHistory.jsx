export default function RequestHistory({ history, onSelect }) {
  if (!history.length) {
    return (
      <div className="text-xs text-muted italic px-1">Sin historial aún</div>
    )
  }

  return (
    <div className="space-y-1">
      {history.map((entry, i) => (
        <button
          key={i}
          className="w-full text-left group rounded hover:bg-panel border border-transparent hover:border-border transition-colors px-2 py-1.5"
          onClick={() => onSelect(entry)}
        >
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono font-bold w-12 flex-shrink-0 ${
              entry.method === 'GET' ? 'text-success' :
              entry.method === 'POST' ? 'text-accent' :
              entry.method === 'PATCH' ? 'text-warning' :
              'text-error'
            }`}>{entry.method}</span>
            <span className={`text-[10px] font-mono font-bold w-10 flex-shrink-0 ${
              entry.status >= 200 && entry.status < 300 ? 'text-success' :
              entry.status >= 400 ? 'text-error' : 'text-warning'
            }`}>{entry.status}</span>
            <span className="text-xs text-muted truncate flex-1">{entry.path}</span>
          </div>
          <div className="text-[10px] text-muted/60 mt-0.5 pl-24">
            {new Date(entry.timestamp).toLocaleTimeString()}
          </div>
        </button>
      ))}
    </div>
  )
}
