import https from 'https'
import axios from 'axios'
import { validateHost, sanitizeHeaders, checkSecret } from './_shared.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!checkSecret(req, res)) return

  const { method, url, headers, body, cert, key } = req.body

  if (!method || !url) {
    return res.status(400).json({ error: 'Missing method or url' })
  }

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
      headers: sanitizeHeaders(headers),
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
    console.error('[proxy] upstream error:', err.code || err.response?.status || 'unknown')
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
}
