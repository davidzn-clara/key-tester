import express from 'express'
import https from 'https'
import crypto from 'crypto'
import axios from 'axios'
import { fileURLToPath } from 'url'
import { dirname, join, resolve, isAbsolute, sep } from 'path'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json({ limit: '10mb' }))

const PORT = 3001

// F2/F8: allowlist — proxy and get-token only forward to Clara API hosts
const ALLOWED_HOSTS = [
  'public-api.mx.clara.com',
  'public-api.br.clara.com',
  'public-api.co.clara.com',
]

// F1: base directory allowed for /load-credentials — nothing outside the user's home
const ALLOWED_BASE = process.env.HOME || __dirname

// F5: shared secret generated at startup — prevents unauthenticated calls from
// other processes on the machine if port 3001 is accidentally exposed
const PROXY_SECRET = process.env.PROXY_SECRET || crypto.randomUUID()

// F4: explicit CORS — only allow the two known local origins
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin === 'http://localhost:5173' || origin === 'http://localhost:3001') {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-proxy-secret')
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// F5: expose secret to same-origin frontend only.
// No CORS header here → cross-origin reads blocked by browser SOP.
app.get('/config', (req, res) => {
  res.json({ proxySecret: PROXY_SECRET })
})

// F5: middleware applied to all sensitive endpoints
function requireSecret(req, res, next) {
  if (req.headers['x-proxy-secret'] !== PROXY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

// F2: validate that the target URL is an HTTPS Clara API host
function validateHost(urlString, res) {
  try {
    const { hostname, protocol } = new URL(urlString)
    if (protocol !== 'https:') {
      res.status(400).json({ error: 'Only HTTPS targets are allowed' })
      return false
    }
    if (!ALLOWED_HOSTS.includes(hostname)) {
      res.status(403).json({ error: `Host not in Clara API allowlist: ${hostname}` })
      return false
    }
    return true
  } catch {
    res.status(400).json({ error: 'Invalid URL' })
    return false
  }
}

// F2: strip hop-by-hop and host headers before forwarding
const HOP_BY_HOP = new Set([
  'host', 'connection', 'keep-alive', 'proxy-authenticate',
  'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade',
])
function sanitizeHeaders(headers) {
  const out = {}
  for (const [k, v] of Object.entries(headers || {})) {
    if (!HOP_BY_HOP.has(k.toLowerCase())) out[k] = v
  }
  return out
}

app.post('/load-credentials', requireSecret, (req, res) => {
  const { folderPath } = req.body
  if (!folderPath) return res.status(400).json({ error: 'Falta folderPath' })

  const absPath = isAbsolute(folderPath)
    ? folderPath
    : resolve(__dirname, folderPath)

  // F1: path traversal — reject anything outside the user's home directory
  if (!absPath.startsWith(ALLOWED_BASE + sep)) {
    return res.status(403).json({ error: 'Path must be inside your home directory' })
  }

  try {
    const files = fs.readdirSync(absPath)
    const result = {
      projectName: '',
      clientId: '',
      clientSecret: '',
      cert: '',
      key: '',
      filesFound: [],
      // F3: resolvedPath removed — no filesystem paths sent to the browser
    }

    const jsonFile = files.find((f) => f.endsWith('.json'))
    if (jsonFile) {
      const raw = fs.readFileSync(join(absPath, jsonFile), 'utf8')
      const data = JSON.parse(raw)
      result.projectName = data.projectName || ''
      result.filesFound.push(jsonFile)
      const c = data.credentials || data
      if (c.clientId) result.clientId = c.clientId
      if (c.clientSecret) result.clientSecret = c.clientSecret
      if (c.publicKey) result.cert = c.publicKey
      if (c.privateKey) result.key = c.privateKey
    }

    if (!result.cert) {
      const certFile = files.find((f) => f.endsWith('.crt') && !f.startsWith('ca_'))
      if (certFile) {
        result.cert = fs.readFileSync(join(absPath, certFile), 'utf8')
        result.filesFound.push(certFile)
      }
    }

    if (!result.key) {
      const keyFile = files.find((f) => f.endsWith('.key'))
      if (keyFile) {
        result.key = fs.readFileSync(join(absPath, keyFile), 'utf8')
        result.filesFound.push(keyFile)
      }
    }

    res.json(result)
  } catch (err) {
    // F7: log detail server-side, return generic message
    console.error('[load-credentials]', err.message)
    res.status(500).json({ error: 'Failed to read credentials folder' })
  }
})

app.post('/get-token', requireSecret, async (req, res) => {
  const { clientId, clientSecret, baseUrl, cert, key } = req.body

  if (!clientId || !clientSecret || !baseUrl) {
    return res.status(400).json({ error: 'Missing clientId, clientSecret, or baseUrl' })
  }

  // F8: validate baseUrl before forwarding Basic credentials
  if (!validateHost(baseUrl, res)) return

  try {
    const agentOptions = {}
    if (cert && key) {
      agentOptions.cert = cert
      agentOptions.key = key
    }
    const agent = new https.Agent(agentOptions)

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const start = Date.now()

    const response = await axios.post(
      `${baseUrl}/oauth/token`,
      new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        httpsAgent: agent,
        timeout: 15000,
      }
    )

    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: response.data,
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    // F3: log TLS/network error server-side, never forward err.message
    console.error('[get-token]', err.message)
    const status = err.response?.status || 500
    res.status(status).json({
      status,
      statusText: err.response?.statusText || 'Error',
      headers: err.response?.headers || {},
      body: err.response?.data || { error: 'Upstream request failed' },
      durationMs: 0,
      timestamp: new Date().toISOString(),
    })
  }
})

app.post('/proxy', requireSecret, async (req, res) => {
  const { method, url, headers, body, cert, key } = req.body

  if (!method || !url) {
    return res.status(400).json({ error: 'Missing method or url' })
  }

  // F2: restrict to Clara API hosts only — blocks SSRF to internal/cloud-metadata targets
  if (!validateHost(url, res)) return

  try {
    const agentOptions = {}
    if (cert && key) {
      agentOptions.cert = cert
      agentOptions.key = key
    }
    const agent = new https.Agent(agentOptions)

    const start = Date.now()

    const response = await axios.request({
      method,
      url,
      headers: sanitizeHeaders(headers), // F2: strip hop-by-hop + host
      data: body || undefined,
      httpsAgent: agent,
      timeout: 30000,
      validateStatus: () => true,
    })

    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: response.data,
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    // F3: log TLS/network error server-side, never forward err.message
    console.error('[proxy]', err.message)
    const status = err.response?.status || 500
    res.status(status).json({
      status,
      statusText: err.response?.statusText || 'Error',
      headers: err.response?.headers || {},
      body: err.response?.data || { error: 'Upstream request failed' },
      durationMs: 0,
      timestamp: new Date().toISOString(),
    })
  }
})

// Serve production build
// F4: removed wildcard catch-all — this SPA has no client-side routes,
// and the wildcard would serve arbitrary files at the same origin
const distPath = join(__dirname, 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('/', (req, res) => res.sendFile(join(distPath, 'index.html')))
}

app.listen(PORT, 'localhost', () => {
  console.log(`Clara API Proxy running on http://localhost:${PORT}`)
})
