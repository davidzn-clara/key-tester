import { useState, useEffect } from 'react'
import { ENDPOINTS, HTTP_METHODS } from '../constants/endpoints'

function ParamsTable({ rows, setRows }) {
  const update = (i, field, val) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  const add = () => setRows((prev) => [...prev, { key: '', value: '', enabled: true }])
  const remove = (i) => setRows((prev) => prev.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-1">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-1 items-center">
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(e) => update(i, 'enabled', e.target.checked)}
            className="accent-accent flex-shrink-0"
          />
          <input
            className="flex-1 bg-bg border border-border rounded px-2 py-1 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-accent"
            placeholder="Key"
            value={row.key}
            onChange={(e) => update(i, 'key', e.target.value)}
          />
          <input
            className="flex-1 bg-bg border border-border rounded px-2 py-1 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-accent"
            placeholder="Value"
            value={row.value}
            onChange={(e) => update(i, 'value', e.target.value)}
          />
          <button className="text-muted hover:text-error text-xs px-1" onClick={() => remove(i)}>✕</button>
        </div>
      ))}
      <button className="text-xs text-accent hover:text-accent/80 mt-1" onClick={add}>+ Agregar</button>
    </div>
  )
}

function extractPathVars(path) {
  const matches = path.match(/\{([^}]+)\}/g) || []
  return matches.map((m) => m.slice(1, -1))
}

export default function RequestBuilder({ creds, onSend, loading }) {
  const { token, buildUrl } = creds

  const [method, setMethod] = useState('GET')
  const [urlPath, setUrlPath] = useState('/api/v3/transactions')
  const [params, setParams] = useState([{ key: 'page', value: '0', enabled: true }, { key: 'size', value: '20', enabled: true }])
  const [headers, setHeaders] = useState([
    { key: 'Authorization', value: token ? `Bearer ${token}` : '', enabled: true },
    { key: 'Content-Type', value: 'application/json', enabled: true },
    { key: 'X-Tax-Identifier', value: '', enabled: false },
  ])
  const [body, setBody] = useState('')
  const [activeTab, setActiveTab] = useState('params')
  const [pathVars, setPathVars] = useState({})
  const [endpointSearch, setEndpointSearch] = useState('')
  const [showEndpoints, setShowEndpoints] = useState(false)
  const [bodyError, setBodyError] = useState('')

  // Sync token into Authorization header
  useEffect(() => {
    if (token) {
      setHeaders((prev) =>
        prev.map((h) => (h.key === 'Authorization' ? { ...h, value: `Bearer ${token}` } : h))
      )
    }
  }, [token])

  // Extract path vars when URL changes
  useEffect(() => {
    const vars = extractPathVars(urlPath)
    setPathVars((prev) => {
      const next = {}
      vars.forEach((v) => { next[v] = prev[v] || '' })
      return next
    })
  }, [urlPath])

  const resolvedPath = urlPath.replace(/\{([^}]+)\}/g, (_, k) => pathVars[k] || `{${k}}`)

  const buildFinalUrl = () => {
    const base = buildUrl(resolvedPath)
    const enabledParams = params.filter((p) => p.enabled && p.key)
    if (!enabledParams.length) return base
    const qs = enabledParams.map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&')
    return `${base}?${qs}`
  }

  const enabledHeaders = () => {
    const h = {}
    headers.filter((r) => r.enabled && r.key).forEach((r) => { h[r.key] = r.value })
    return h
  }

  const handleSend = () => {
    if ((method === 'POST' || method === 'PATCH' || method === 'PUT') && body) {
      try { JSON.parse(body) }
      catch { setBodyError('JSON inválido'); return }
    }
    setBodyError('')
    onSend({
      method,
      url: buildFinalUrl(),
      headers: enabledHeaders(),
      body: (method === 'GET' || method === 'DELETE') ? null : (body || null),
      rawPath: resolvedPath,
    })
  }

  const selectEndpoint = (ep) => {
    setMethod(ep.method)
    setUrlPath(ep.path)
    setParams(ep.params.map((p) => ({ ...p, enabled: true })))
    if (ep.body) setBody(ep.body)
    setShowEndpoints(false)
    setEndpointSearch('')
  }

  const formatBody = () => {
    try {
      setBody(JSON.stringify(JSON.parse(body), null, 2))
      setBodyError('')
    } catch { setBodyError('JSON inválido') }
  }

  const filteredEndpoints = ENDPOINTS.filter((ep) =>
    ep.label.toLowerCase().includes(endpointSearch.toLowerCase()) ||
    ep.path.toLowerCase().includes(endpointSearch.toLowerCase())
  )

  const pathVarKeys = Object.keys(pathVars)

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* URL bar */}
      <div className="flex gap-2">
        <select
          className="bg-panel border border-border rounded px-2 py-2 text-sm text-text font-mono focus:outline-none focus:border-accent"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          {HTTP_METHODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <div className="flex-1 relative">
          <input
            className="w-full bg-panel border border-border rounded px-2 py-2 text-sm font-mono text-text placeholder-muted focus:outline-none focus:border-accent"
            value={urlPath}
            onChange={(e) => setUrlPath(e.target.value)}
            placeholder="/api/v3/..."
            onFocus={() => setShowEndpoints(true)}
          />
          {showEndpoints && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-panel border border-border rounded shadow-xl z-50 max-h-64 overflow-y-auto">
              <div className="p-2 border-b border-border">
                <input
                  className="w-full bg-bg border border-border rounded px-2 py-1 text-xs text-text placeholder-muted focus:outline-none"
                  placeholder="Buscar endpoint..."
                  value={endpointSearch}
                  onChange={(e) => setEndpointSearch(e.target.value)}
                  autoFocus
                />
              </div>
              {filteredEndpoints.map((ep, i) => (
                <button
                  key={i}
                  className="w-full text-left px-3 py-2 hover:bg-border/50 flex gap-3 items-center text-xs border-b border-border/40 last:border-0"
                  onClick={() => selectEndpoint(ep)}
                >
                  <span className={`font-mono font-bold w-14 flex-shrink-0 ${
                    ep.method === 'GET' ? 'text-success' :
                    ep.method === 'POST' ? 'text-accent' :
                    ep.method === 'PATCH' ? 'text-warning' :
                    'text-error'
                  }`}>{ep.method}</span>
                  <span className="text-muted flex-1">{ep.path}</span>
                  <span className="text-text/60">{ep.label}</span>
                </button>
              ))}
              <button
                className="w-full text-left px-3 py-2 text-xs text-muted hover:text-text border-t border-border"
                onClick={() => setShowEndpoints(false)}
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
        <button
          className={`px-5 py-2 rounded font-semibold text-sm transition-colors ${
            loading
              ? 'bg-accent/50 text-white cursor-not-allowed'
              : 'bg-accent hover:bg-accent/80 text-white'
          }`}
          onClick={handleSend}
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Enviando
            </span>
          ) : 'Enviar'}
        </button>
      </div>

      {/* Full URL preview */}
      <div className="text-xs font-mono text-muted bg-bg border border-border/50 rounded px-2 py-1 truncate">
        {buildFinalUrl()}
      </div>

      {/* Path variable substitution */}
      {pathVarKeys.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded p-2">
          <div className="text-xs font-semibold text-warning mb-2">Variables de path</div>
          <div className="space-y-1">
            {pathVarKeys.map((k) => (
              <div key={k} className="flex gap-2 items-center">
                <span className="text-xs font-mono text-muted w-24 flex-shrink-0">{`{${k}}`}</span>
                <input
                  className="flex-1 bg-bg border border-border rounded px-2 py-1 text-xs font-mono text-text focus:outline-none focus:border-warning"
                  placeholder={`valor para ${k}`}
                  value={pathVars[k]}
                  onChange={(e) => setPathVars((prev) => ({ ...prev, [k]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div>
        <div className="flex gap-0 border-b border-border">
          {['params', 'headers', 'body'].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-1.5 text-xs font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-text'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === 'params' && params.filter((p) => p.enabled && p.key).length > 0 && (
                <span className="ml-1 bg-accent/30 text-accent rounded-full text-[10px] px-1.5">
                  {params.filter((p) => p.enabled && p.key).length}
                </span>
              )}
              {tab === 'headers' && headers.filter((h) => h.enabled && h.key).length > 0 && (
                <span className="ml-1 bg-accent/30 text-accent rounded-full text-[10px] px-1.5">
                  {headers.filter((h) => h.enabled && h.key).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="pt-3">
          {activeTab === 'params' && <ParamsTable rows={params} setRows={setParams} />}
          {activeTab === 'headers' && <ParamsTable rows={headers} setRows={setHeaders} />}
          {activeTab === 'body' && (
            <div className="space-y-1">
              {(method === 'GET' || method === 'DELETE') ? (
                <div className="text-xs text-muted italic">Body no disponible para {method}</div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted">JSON Body</span>
                    <button className="text-xs text-accent hover:text-accent/80" onClick={formatBody}>Formatear</button>
                  </div>
                  <textarea
                    className="w-full bg-bg border border-border rounded px-2 py-2 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-accent min-h-32 resize-y"
                    placeholder='{\n  "key": "value"\n}'
                    value={body}
                    onChange={(e) => { setBody(e.target.value); setBodyError('') }}
                  />
                  {bodyError && <div className="text-xs text-error">{bodyError}</div>}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
