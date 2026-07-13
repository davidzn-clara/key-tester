import https from 'https'
import axios from 'axios'
import { validateHost, checkSecret } from './_shared.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!checkSecret(req, res)) return

  const { clientId, clientSecret, baseUrl, cert, key } = req.body

  if (!clientId || !clientSecret || !baseUrl) {
    return res.status(400).json({ error: 'Missing clientId, clientSecret, or baseUrl' })
  }

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
    console.error('[get-token] upstream error:', err.code || err.response?.status || 'unknown')
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
