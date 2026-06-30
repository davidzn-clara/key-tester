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
  const [folderLoading, setFolderLoading] = useState(false)
  const [folderError, setFolderError] = useState('')
  const [folderResult, setFolderResult] = useState(null)

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

  const readText = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = reject
      reader.readAsText(file)
    })

  const loadFromFileList = async (fileList) => {
    setFolderLoading(true)
    setFolderError('')
    setFolderResult(null)
    try {
      const files = Array.from(fileList)
      const folderName = files[0]?.webkitRelativePath?.split('/')[0] || ''
      const found = { projectName: '', clientId: '', clientSecret: '', cert: '', key: '', filesFound: [] }

      const jsonFile = files.find((f) => f.name.endsWith('.json'))
      if (jsonFile) {
        const raw = await readText(jsonFile)
        const data = JSON.parse(raw)
        found.projectName = data.projectName || ''
        found.filesFound.push(jsonFile.name)
        const c = data.credentials || data
        if (c.clientId) found.clientId = c.clientId
        if (c.clientSecret) found.clientSecret = c.clientSecret
        if (c.publicKey) found.cert = c.publicKey
        if (c.privateKey) found.key = c.privateKey
      }

      if (!found.cert) {
        const certFile = files.find((f) => f.name.endsWith('.crt') && !f.name.startsWith('ca_'))
        if (certFile) { found.cert = await readText(certFile); found.filesFound.push(certFile.name) }
      }
      if (!found.key) {
        const keyFile = files.find((f) => f.name.endsWith('.key'))
        if (keyFile) { found.key = await readText(keyFile); found.filesFound.push(keyFile.name) }
      }

      if (found.clientId) setClientId(found.clientId)
      if (found.clientSecret) setClientSecret(found.clientSecret)
      if (found.cert) setCert(found.cert)
      if (found.key) setKey(found.key)

      setFolderResult({
        folderName,
        projectName: found.projectName,
        filesFound: found.filesFound,
        hasCert: !!found.cert,
        hasKey: !!found.key,
        hasClientId: !!found.clientId,
        hasClientSecret: !!found.clientSecret,
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
    folderLoading, folderError, folderResult,
    loadFromFileList, fetchToken,
    buildUrl,
  }
}
