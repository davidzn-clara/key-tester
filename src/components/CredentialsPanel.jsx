import { useRef, useState } from 'react'
import { MARKETS } from '../constants/endpoints'

function FileDropZone({ label, fileName, onFile, accept }) {
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)

  const handle = (file) => {
    if (file) onFile(file)
  }

  return (
    <div
      className={`relative border rounded p-2 cursor-pointer transition-colors text-xs ${
        dragging ? 'border-accent bg-accent/10' : fileName ? 'border-success/60 bg-success/5' : 'border-border hover:border-accent/60'
      }`}
      onClick={() => inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]) }}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => handle(e.target.files[0])}
      />
      <div className="flex items-center gap-2">
        {fileName ? (
          <>
            <span className="text-success text-sm">✓</span>
            <span className="text-text truncate">{fileName}</span>
          </>
        ) : (
          <>
            <span className="text-muted">↑</span>
            <span className="text-muted">{label}</span>
          </>
        )}
      </div>
    </div>
  )
}

export default function CredentialsPanel({ creds, onValidate, validationResult }) {
  const {
    cert, certName, key, keyName,
    clientId, setClientId,
    clientSecret, setClientSecret,
    market, setMarket,
    sandbox, setSandbox,
    token, setToken,
    tokenTotalSecs, timeLeft,
    tokenLoading, tokenError,
    loadFile, fetchToken,
  } = creds

  const [showSecret, setShowSecret] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyToken = () => {
    navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const tokenPct = tokenTotalSecs && timeLeft !== null
    ? Math.max(0, (timeLeft / tokenTotalSecs) * 100)
    : 0

  const tokenBarColor = tokenPct > 30 ? 'bg-success' : tokenPct > 10 ? 'bg-warning' : 'bg-error'

  return (
    <div className="space-y-4">
      {/* Files */}
      <div>
        <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Credenciales</div>
        <div className="grid grid-cols-2 gap-2">
          <FileDropZone label="client.crt" fileName={certName} onFile={(f) => loadFile(f, 'cert')} accept=".crt,.pem" />
          <FileDropZone label="client.key" fileName={keyName} onFile={(f) => loadFile(f, 'key')} accept=".key,.pem" />
          <FileDropZone label="client_id" fileName={clientId ? 'client_id ✓' : ''} onFile={(f) => loadFile(f, 'clientId')} accept=".txt,*" />
          <FileDropZone label="client_secret" fileName={clientSecret ? 'client_secret ✓' : ''} onFile={(f) => loadFile(f, 'clientSecret')} accept=".txt,*" />
        </div>
        <div className="mt-2 space-y-1">
          <input
            className="w-full bg-panel border border-border rounded px-2 py-1 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-accent"
            placeholder="Client ID (o pegar aquí)"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
          <div className="relative">
            <input
              className="w-full bg-panel border border-border rounded px-2 py-1 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-accent pr-16"
              placeholder="Client Secret"
              type={showSecret ? 'text' : 'password'}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
            <button
              className="absolute right-2 top-1 text-xs text-muted hover:text-text"
              onClick={() => setShowSecret((v) => !v)}
            >
              {showSecret ? 'ocultar' : 'ver'}
            </button>
          </div>
        </div>
      </div>

      {/* Market */}
      <div>
        <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Mercado</div>
        <div className="flex gap-2 items-center">
          <select
            className="flex-1 bg-panel border border-border rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
            value={market.value}
            onChange={(e) => setMarket(MARKETS.find((m) => m.value === e.target.value))}
          >
            {MARKETS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={sandbox}
              onChange={(e) => setSandbox(e.target.checked)}
              className="accent-accent"
            />
            Sandbox
          </label>
        </div>
        <div className="mt-1 text-xs text-muted font-mono truncate">{market.baseUrl}{sandbox ? '/api-test/...' : '/api/...'}</div>
      </div>

      {/* Token */}
      <div>
        <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Bearer Token</div>
        <button
          className="w-full bg-accent hover:bg-accent/80 disabled:bg-accent/40 text-white rounded px-3 py-1.5 text-sm font-medium transition-colors"
          onClick={fetchToken}
          disabled={tokenLoading || !clientId || !clientSecret}
        >
          {tokenLoading ? 'Obteniendo...' : 'Obtener Token'}
        </button>
        {tokenError && (
          <div className="mt-1 text-xs text-error bg-error/10 border border-error/30 rounded px-2 py-1">{tokenError}</div>
        )}
        {token && (
          <div className="mt-2 space-y-1">
            <div className="relative">
              <input
                className="w-full bg-panel border border-border rounded px-2 py-1 text-xs font-mono text-text pr-20 focus:outline-none focus:border-accent"
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <div className="absolute right-1 top-0.5 flex gap-1">
                <button className="text-xs text-muted hover:text-text px-1" onClick={() => setShowToken((v) => !v)}>
                  {showToken ? 'ocultar' : 'ver'}
                </button>
                <button className="text-xs text-accent hover:text-accent/80 px-1" onClick={copyToken}>
                  {copied ? '✓' : 'copiar'}
                </button>
              </div>
            </div>
            {timeLeft !== null && (
              <div>
                <div className="flex justify-between text-xs text-muted mb-0.5">
                  <span>Expira en</span>
                  <span className={timeLeft < 60 ? 'text-error' : timeLeft < 300 ? 'text-warning' : 'text-success'}>
                    {timeLeft}s
                  </span>
                </div>
                <div className="h-1 bg-border rounded-full overflow-hidden">
                  <div className={`h-full ${tokenBarColor} transition-all duration-1000`} style={{ width: `${tokenPct}%` }} />
                </div>
                {timeLeft < 60 && (
                  <button
                    className="mt-1 w-full text-xs bg-warning/20 border border-warning/40 text-warning rounded px-2 py-1 hover:bg-warning/30"
                    onClick={fetchToken}
                    disabled={tokenLoading}
                  >
                    Renovar Token
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Validate connection */}
      <div>
        <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Conexión</div>
        <button
          className="w-full bg-panel border border-border hover:border-accent text-text rounded px-3 py-1.5 text-sm transition-colors"
          onClick={onValidate}
          disabled={!token}
        >
          Validar Conexión
        </button>
        {validationResult && (
          <div className={`mt-1 text-xs rounded px-2 py-1.5 border ${
            validationResult.ok
              ? 'text-success bg-success/10 border-success/30'
              : 'text-error bg-error/10 border-error/30'
          }`}>
            {validationResult.ok ? '✓ Conexión OK' : `✗ ${validationResult.message}`}
          </div>
        )}
      </div>
    </div>
  )
}
