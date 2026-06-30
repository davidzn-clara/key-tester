import { useState, useRef, useEffect } from 'react'
import { MARKETS } from '../constants/endpoints'

export function useCredentials() {
  const [cert, setCert] = useState('')
  const [certName, setCertName] = useState('')
  const [key, setKey] = useState('')
  const [keyName, setKeyName] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [market, setMarket] = useState(MARKETS[0])
  const [sandbox, setSandbox] = useState(false)
  const [token, setToken] = useState('')
  const [tokenExpiry, setTokenExpiry] = useState(null) // timestamp ms
  const [tokenTotalSecs, setTokenTotalSecs] = useState(null)
  const [tokenLoading, setTokenLoading] = useState(false)
  const [tokenError, setTokenError] = useState('')
  const [timeLeft, setTimeLeft] = useState(null)

  const timerRef = useRef(null)

  useEffect(() => {
    if (!tokenExpiry) {
      setTimeLeft(null)
      return
    }
    const tick = () => {
      const left = Math.max(0, Math.floor((tokenExpiry - Date.now()) / 1000))
      setTimeLeft(left)
      if (left <= 0) clearInterval(timerRef.current)
    }
    tick()
    timerRef.current = setInterval(tick, 1000)
    return () => clearInterval(timerRef.current)
  }, [tokenExpiry])

  const readFile = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.readAsText(file)
    })

  const loadFile = async (file, type) => {
    const content = await readFile(file)
    if (type === 'cert') { setCert(content); setCertName(file.name) }
    if (type === 'key') { setKey(content); setKeyName(file.name) }
    if (type === 'clientId') setClientId(content.trim())
    if (type === 'clientSecret') setClientSecret(content.trim())
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

  const getBaseUrl = () => {
    const base = market.baseUrl
    return base
  }

  const buildUrl = (path) => {
    const base = market.baseUrl
    if (sandbox && path.startsWith('/api/')) {
      return base + path.replace('/api/', '/api-test/')
    }
    return base + path
  }

  return {
    cert, certName, key, keyName,
    clientId, setClientId,
    clientSecret, setClientSecret,
    market, setMarket,
    sandbox, setSandbox,
    token, setToken,
    tokenExpiry, tokenTotalSecs, timeLeft,
    tokenLoading, tokenError,
    loadFile, fetchToken,
    getBaseUrl, buildUrl,
  }
}
