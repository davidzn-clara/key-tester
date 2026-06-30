import { useState } from 'react'

function syntaxHighlight(json) {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, null, 2)
  }
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number'
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'json-key' : 'json-string'
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean'
      } else if (/null/.test(match)) {
        cls = 'json-null'
      }
      return `<span class="${cls}">${match}</span>`
    }
  )
}

function StatusBadge({ status }) {
  if (!status) return null
  const color = status >= 200 && status < 300
    ? 'text-success border-success/40 bg-success/10'
    : status >= 300 && status < 400
    ? 'text-warning border-warning/40 bg-warning/10'
    : 'text-error border-error/40 bg-error/10'

  return (
    <span className={`text-2xl font-bold font-mono border rounded px-2 py-0.5 ${color}`}>
      {status}
    </span>
  )
}

export default function ResponsePanel({ response, sentRequest }) {
  const [activeTab, setActiveTab] = useState('body')
  const [showBearerToken, setShowBearerToken] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyJson = () => {
    if (!response) return
    const text = typeof response.body === 'string'
      ? response.body
      : JSON.stringify(response.body, null, 2)
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const exportJson = () => {
    if (!response) return
    const text = typeof response.body === 'string'
      ? response.body
      : JSON.stringify(response.body, null, 2)
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ts = response.timestamp ? response.timestamp.replace(/[:.]/g, '-') : Date.now()
    a.href = url
    a.download = `clara-response-${ts}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const maskBearer = (headers) => {
    if (!headers) return {}
    const masked = { ...headers }
    if (masked['Authorization'] || masked['authorization']) {
      const key = masked['Authorization'] ? 'Authorization' : 'authorization'
      masked[key] = showBearerToken ? masked[key] : masked[key].replace(/Bearer .+/, 'Bearer ••••••••')
    }
    return masked
  }

  if (!response) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        <div className="text-center space-y-2">
          <div className="text-4xl opacity-20">◎</div>
          <div>Envía un request para ver la respuesta</div>
        </div>
      </div>
    )
  }

  const bodyText = typeof response.body === 'string'
    ? response.body
    : JSON.stringify(response.body, null, 2)

  const isJson = typeof response.body === 'object' || (() => {
    try { JSON.parse(response.body); return true } catch { return false }
  })()

  return (
    <div className="flex flex-col h-full">
      {/* Response header */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <StatusBadge status={response.status} />
        <span className="text-muted text-sm">{response.statusText}</span>
        <span className="text-muted text-xs font-mono">{response.durationMs}ms</span>
        <span className="text-muted text-xs font-mono">{response.timestamp}</span>
        <div className="ml-auto flex gap-2">
          <button
            className="text-xs bg-panel border border-border hover:border-accent text-muted hover:text-text rounded px-2 py-1 transition-colors"
            onClick={copyJson}
          >
            {copied ? '✓ Copiado' : 'Copiar JSON'}
          </button>
          <button
            className="text-xs bg-panel border border-border hover:border-accent text-muted hover:text-text rounded px-2 py-1 transition-colors"
            onClick={exportJson}
          >
            Exportar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border mb-3">
        {['body', 'headers', 'request'].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-1.5 text-xs font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-text'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'request' ? 'Request enviado' : tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'body' && (
          <div className="h-full overflow-auto">
            {isJson ? (
              <pre
                className="text-xs font-mono leading-relaxed p-3 bg-bg rounded border border-border/50 min-h-full"
                dangerouslySetInnerHTML={{ __html: syntaxHighlight(response.body) }}
              />
            ) : (
              <pre className="text-xs font-mono leading-relaxed p-3 bg-bg rounded border border-border/50 text-text min-h-full whitespace-pre-wrap">
                {bodyText}
              </pre>
            )}
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="h-full overflow-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-muted py-1.5 pr-4 font-normal w-1/3">Header</th>
                  <th className="text-left text-muted py-1.5 font-normal">Valor</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(response.headers || {}).map(([k, v]) => (
                  <tr key={k} className="border-b border-border/40 hover:bg-panel/50">
                    <td className="py-1.5 pr-4 text-sky-300">{k}</td>
                    <td className="py-1.5 text-text break-all">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'request' && sentRequest && (
          <div className="h-full overflow-auto space-y-3">
            <div>
              <div className="text-xs text-muted mb-1">URL</div>
              <div className="text-xs font-mono bg-bg border border-border/50 rounded px-2 py-1.5 text-text break-all">{sentRequest.url}</div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-muted">Headers</div>
                <button
                  className="text-xs text-muted hover:text-text"
                  onClick={() => setShowBearerToken((v) => !v)}
                >
                  {showBearerToken ? 'Ocultar token' : 'Mostrar token'}
                </button>
              </div>
              <table className="w-full text-xs font-mono">
                <tbody>
                  {Object.entries(maskBearer(sentRequest.headers) || {}).map(([k, v]) => (
                    <tr key={k} className="border-b border-border/40">
                      <td className="py-1 pr-4 text-sky-300 w-1/3">{k}</td>
                      <td className="py-1 text-text break-all">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sentRequest.body && (
              <div>
                <div className="text-xs text-muted mb-1">Body</div>
                <pre className="text-xs font-mono bg-bg border border-border/50 rounded px-2 py-1.5 text-text whitespace-pre-wrap">
                  {typeof sentRequest.body === 'string' ? sentRequest.body : JSON.stringify(sentRequest.body, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
