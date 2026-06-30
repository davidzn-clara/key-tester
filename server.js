import express from 'express'
import https from 'https'
import axios from 'axios'
import { fileURLToPath } from 'url'
import { dirname, join, resolve, isAbsolute } from 'path'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json({ limit: '10mb' }))

const PORT = 3001

app.post('/load-credentials', (req, res) => {
  const { folderPath } = req.body
  if (!folderPath) return res.status(400).json({ error: 'Falta folderPath' })

  const absPath = isAbsolute(folderPath)
    ? folderPath
    : resolve(__dirname, folderPath)

  try {
    const files = fs.readdirSync(absPath)
    const result = {
      projectName: '',
      clientId: '',
      clientSecret: '',
      cert: '',
      key: '',
      filesFound: [],
      resolvedPath: absPath,
    }

    const jsonFile = files.find((f) => f.endsWith('.json'))
    if (jsonFile) {
      const raw = fs.readFileSync(join(absPath, jsonFile), 'utf8')
      const data = JSON.parse(raw)
      result.projectName = data.projectName || ''
      result.filesFound.push(jsonFile)
      const c = data.credentials || {}
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
    res.status(500).json({ error: err.message })
  }
})

app.post('/get-token', async (req, res) => {
  const { clientId, clientSecret, baseUrl, cert, key } = req.body

  if (!clientId || !clientSecret || !baseUrl) {
    return res.status(400).json({ error: 'Missing clientId, clientSecret, or baseUrl' })
  }

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

    const durationMs = Date.now() - start

    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: response.data,
      durationMs,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const status = err.response?.status || 500
    const body = err.response?.data || { error: err.message }
    res.status(status).json({
      status,
      statusText: err.response?.statusText || 'Error',
      headers: err.response?.headers || {},
      body,
      durationMs: 0,
      timestamp: new Date().toISOString(),
      proxyError: err.message,
    })
  }
})

app.post('/proxy', async (req, res) => {
  const { method, url, headers, body, cert, key } = req.body

  if (!method || !url) {
    return res.status(400).json({ error: 'Missing method or url' })
  }

  try {
    const agentOptions = {}
    if (cert && key) {
      agentOptions.cert = cert
      agentOptions.key = key
    }
    const agent = new https.Agent(agentOptions)

    const safeHeaders = { ...headers }

    const start = Date.now()

    const response = await axios.request({
      method,
      url,
      headers: safeHeaders,
      data: body || undefined,
      httpsAgent: agent,
      timeout: 30000,
      validateStatus: () => true,
    })

    const durationMs = Date.now() - start

    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: response.data,
      durationMs,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const status = err.response?.status || 500
    const body = err.response?.data || { error: err.message }
    res.status(status).json({
      status,
      statusText: err.response?.statusText || 'Error',
      headers: err.response?.headers || {},
      body,
      durationMs: 0,
      timestamp: new Date().toISOString(),
      proxyError: err.message,
    })
  }
})

// Serve production build
const distPath = join(__dirname, 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'))
  })
}

app.listen(PORT, 'localhost', () => {
  console.log(`Clara API Proxy running on http://localhost:${PORT}`)
})
