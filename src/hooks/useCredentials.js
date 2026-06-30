import { useState, useRef, useEffect } from 'react'
import { MARKETS } from '../constants/endpoints'

export function useCredentials() {
  const [cert, setCert] = useState('')
  const [key, setKey] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [market, setMarket] = useState(MARKETS[0])
  const [sandbox, setSandbox] = useState(false)
  const [token, setToken] = useState('')
  const [tokenExpiry, setTokenExpiry] = useState(null)
  const [tokenTotalSecs, setTokenTotalSecs] = useState(null)
  const [tokenLoading, setTokenLoading] = useState(false)
  const [tokenError, setTokenError] = useState('')
  const [timeLeft, setTimeLeft] = useState(null)

  // Folder loading state
  const [folderPath, setFolderPath] = useState('llaves')
  const [folderLoading, setFolderLoading] = useState(false)
  const [folderError, setFolderError] = useState('')
  const [folderResult, setFolderResult] = useState(null) // { projectName, filesFound, resolvedPath }

  const timerRef = useRef(null)

  useEffect(() => {
    if (!tokenExpiry) { setTimeLeft(null); return }
    const tick = () => {
      const left = Math.max(0, Math.floor((tokenExpiry - Date.now()) / 1000))
      setTimeLeft(left)
      if (left <= 0) clearInterval(timerRef.current)
    }
    tick()
    timerRef.current = setInterval(tick, 1000)
    return () => clearInterval(timerRef.current)
  }, [tokenExpiry])

  const loadFromFolder = async () => {
    setFolderLoading(true)
    setFolderError('')
    setFolderResult(null)
    try {
      const res = await fetch('/load-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      if (data.clientId) setClientId(data.clientId)
      if (data.clientSecret) setClientSecret(data.clientSecret)
      if (data.cert) setCert(data.cert)
      if (data.key) setKey(data.key)

      setFolderResult({
        projectName: data.projectName,
        filesFound: data.filesFound,
        resolvedPath: data.resolvedPath,
        hasCert: !!data.cert,
        hasKey: !!data.key,
        hasClientId: !!data.clientId,
        hasClientSecret: !!data.clientSecret,
      })
    } catch (err) {
      setFolderError(err.message)
    } finally {
      setFolderLoading(false)
    }
  }

  const fetchToken = async () => {
    setTokenLoading(true)
    setTokenError('')
    try {
      const res = await fetch('/get-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          clientSecret,
          baseUrl: market.baseUrl,
          cert: cert || undefined,
          key: key || undefined,
        }),
      })
      const data = await res.json()
      if (data.body?.access_token) {
        setToken(data.body.access_token)
        const expirySecs = data.body.expires_in || 3600
        setTokenTotalSecs(expirySecs)
        setTokenExpiry(Date.now() + expirySecs * 1000)
      } else {
        setTokenError(
          data.body?.error_description || data.body?.error || data.proxyError || 'Failed to get token'
        )
      }
    } catch (err) {
      setTokenError(err.message)
    } finally {
      setTokenLoading(false)
    }
  }

  const buildUrl = (path) => {
    const base = market.baseUrl
    if (sandbox && path.startsWith('/api/')) {
      return base + path.replace('/api/', '/api-test/')
    }
    return base + path
  }

  return {
    cert, key,
    clientId, setClientId,
    clientSecret, setClientSecret,
    market, setMarket,
    sandbox, setSandbox,
    token, setToken,
    tokenExpiry, tokenTotalSecs, timeLeft,
    tokenLoading, tokenError,
    folderPath, setFolderPath,
    folderLoading, folderError, folderResult,
    loadFromFolder, fetchToken,
    buildUrl,
  }
}
