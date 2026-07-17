import { useState, useEffect, useRef } from 'react'
import CredentialsPanel from './components/CredentialsPanel'
import RequestBuilder from './components/RequestBuilder'
import ResponsePanel from './components/ResponsePanel'
import RequestHistory from './components/RequestHistory'
import { useCredentials } from './hooks/useCredentials'
import { useRequestHistory } from './hooks/useRequestHistory'

export default function App() {
  // F5: fetch shared secret from the proxy on mount — only same-origin JS can read this
  const secretRef = useRef('')
  useEffect(() => {
    fetch('/config')
      .then((r) => r.json())
      .then((d) => { secretRef.current = (d.proxySecret || '').trim() })
      .catch(() => {})
  }, [])

  const creds = useCredentials(secretRef)
  const { history, addEntry } = useRequestHistory()
  const [response, setResponse] = useState(null)
  const [sentRequest, setSentRequest] = useState(null)
  const [loading, setLoading] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(true)

  const proxyHeaders = (extra = {}) => ({
    'Content-Type': 'application/json',
    'x-proxy-secret': secretRef.current,
    ...extra,
  })

  const sendRequest = async ({ method, url, headers, body, rawPath }) => {
    setLoading(true)
    setSentRequest({ method, url, headers, body })
    try {
      const res = await fetch('/proxy', {
        method: 'POST',
        headers: proxyHeaders(),
        body: JSON.stringify({
          method,
          url,
          headers,
          body: body ? (typeof body === 'string' ? JSON.parse(body) : body) : null,
          cert: creds.cert || undefined,
          key: creds.key || undefined,
        }),
      })
      const data = await res.json()
      setResponse(data)
      // F6: redact Bearer token before storing in history
      const safeHeaders = { ...headers }
      if (safeHeaders.Authorization) safeHeaders.Authorization = '[redacted]'
      addEntry({
        method,
        path: rawPath || url,
        url,
        status: data.status,
        timestamp: data.timestamp,
        headers: safeHeaders,
        body,
      })
    } catch (err) {
      setResponse({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: { error: err.message },
        durationMs: 0,
        timestamp: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  const validateConnection = async () => {
    setValidationResult(null)
    const url = creds.buildUrl('/api/v3/users') + '?page=0&size=1'
    try {
      const res = await fetch('/proxy', {
        method: 'POST',
        headers: proxyHeaders(),
        body: JSON.stringify({
          method: 'GET',
          url,
          headers: { Authorization: `Bearer ${creds.token}`, 'Content-Type': 'application/json' },
          body: null,
          cert: creds.cert || undefined,
          key: creds.key || undefined,
        }),
      })
      const data = await res.json()
      if (data.status >= 200 && data.status < 300) {
        setValidationResult({ ok: true })
      } else {
        setValidationResult({ ok: false, message: `${data.status} ${data.statusText}` })
      }
    } catch (err) {
      setValidationResult({ ok: false, message: err.message })
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text font-sans">
      {/* Left column */}
      <div className="w-[420px] flex-shrink-0 flex flex-col border-r border-border overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
          <div className="w-6 h-6 bg-accent rounded flex items-center justify-center text-white text-xs font-bold">C</div>
          <span className="font-semibold text-sm">Clara API Tester</span>
          <span className="text-xs text-muted ml-auto">{creds.market.label}{creds.sandbox ? ' · Sandbox' : ''}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Credentials */}
          <div className="p-4 border-b border-border">
            <CredentialsPanel
              creds={creds}
              onValidate={validateConnection}
              validationResult={validationResult}
            />
          </div>

          {/* Request builder */}
          <div className="p-4 border-b border-border">
            <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Request</div>
            <RequestBuilder creds={creds} onSend={sendRequest} loading={loading} />
          </div>

          {/* History */}
          <div className="p-4">
            <button
              className="flex items-center gap-2 w-full text-xs font-semibold text-muted uppercase tracking-wider mb-2"
              onClick={() => setHistoryOpen((v) => !v)}
            >
              <span className={`transition-transform ${historyOpen ? 'rotate-90' : ''}`}>▶</span>
              Historial ({history.length})
            </button>
            {historyOpen && (
              <RequestHistory
                history={history}
                onSelect={(entry) => {
                  setSentRequest({ method: entry.method, url: entry.url, headers: entry.headers, body: entry.body })
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Right column — Response */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">Respuesta</span>
          {loading && (
            <span className="ml-2 flex items-center gap-1 text-xs text-accent">
              <span className="inline-block w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              Enviando request...
            </span>
          )}
        </div>
        <div className="flex-1 overflow-hidden p-4">
          <ResponsePanel response={response} sentRequest={sentRequest} />
        </div>
      </div>
    </div>
  )
}
