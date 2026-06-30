import { useState } from 'react'
import { MARKETS } from '../constants/endpoints'

function CredField({ label, ok }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs ${ok ? 'text-success' : 'text-muted'}`}>
      <span>{ok ? '✓' : '○'}</span>
      <span className="font-mono">{label}</span>
    </div>
  )
}

export default function CredentialsPanel({ creds, onValidate, validationResult }) {
  const {
    cert, key, clientId, setClientId,
    clientSecret, setClientSecret,
    market, setMarket,
    sandbox, setSandbox,
    token, setToken,
    tokenTotalSecs, timeLeft,
    tokenLoading, tokenError,
    folderPath, setFolderPath,
    folderLoading, folderError, folderResult,
    loadFromFolder, fetchToken,
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
    ? Math.max(0, (timeLeft / tokenTotalSecs) * 100) : 0
  const tokenBarColor = tokenPct > 30 ? 'bg-success' : tokenPct > 10 ? 'bg-warning' : 'bg-error'

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') loadFromFolder()
  }

  return (
    <div className="space-y-4">

      {/* Folder path */}
      <div>
        <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
          Carpeta de credenciales
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-bg border border-border rounded px-2 py-1.5 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-accent"
            placeholder="llaves  ó  /ruta/absoluta/a/carpeta"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="px-3 py-1.5 bg-accent hover:bg-accent/80 disabled:bg-accent/40 text-white rounded text-xs font-medium transition-colors whitespace-nowrap"
            onClick={loadFromFolder}
            disabled={folderLoading || !folderPath.trim()}
          >
            {folderLoading ? '...' : 'Cargar'}
          </button>
        </div>
        <div className="text-[10px] text-muted mt-1">
          Ruta relativa al proyecto o absoluta. Se lee el JSON de credenciales automáticamente.
        </div>

        {folderError && (
          <div className="mt-2 text-xs text-error bg-error/10 border border-error/30 rounded px-2 py-1.5">
            ✗ {folderError}
          </div>
        )}

        {folderResult && (
          <div className="mt-2 bg-bg border border-border rounded p-2.5 space-y-2">
            {folderResult.projectName && (
              <div className="text-xs font-semibold text-accent">{folderResult.projectName}</div>
            )}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <CredField label="cert (publicKey)" ok={folderResult.hasCert} />
              <CredField label="key (privateKey)" ok={folderResult.hasKey} />
              <CredField label="clientId" ok={folderResult.hasClientId} />
              <CredField label="clientSecret" ok={folderResult.hasClientSecret} />
            </div>
            {folderResult.filesFound.length > 0 && (
              <div className="text-[10px] text-muted font-mono truncate">
                {folderResult.filesFound.join('  ·  ')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Override fields */}
      <div>
        <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
          Credenciales <span className="text-muted font-normal normal-case">(editar si necesario)</span>
        </div>
        <div className="space-y-1.5">
          <input
            className="w-full bg-panel border border-border rounded px-2 py-1.5 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-accent"
            placeholder="Client ID"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
          <div className="relative">
            <input
              className="w-full bg-panel border border-border rounded px-2 py-1.5 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-accent pr-16"
              placeholder="Client Secret"
              type={showSecret ? 'text' : 'password'}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
            <button
              className="absolute right-2 top-1.5 text-xs text-muted hover:text-text"
              onClick={() => setShowSecret((v) => !v)}
            >
              {showSecret ? 'ocultar' : 'ver'}
            </button>
          </div>
          <div className="flex gap-3 pt-0.5">
            <CredField label="cert" ok={!!cert} />
            <CredField label="key" ok={!!key} />
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
        <div className="mt-1 text-[10px] text-muted font-mono truncate">
          {market.baseUrl}{sandbox ? '/api-test/...' : '/api/...'}
        </div>
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
          className="w-full bg-panel border border-border hover:border-accent text-text rounded px-3 py-1.5 text-sm transition-colors disabled:opacity-40"
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
