// Shared logic for all Vercel API routes (prefixed _ so Vercel doesn't treat it as a route)

export const ALLOWED_HOSTS = [
  'public-api.mx.clara.com',
  'public-api.br.clara.com',
  'public-api.co.clara.com',
]

export function validateHost(urlString, res) {
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

const HOP_BY_HOP = new Set([
  'host', 'connection', 'keep-alive', 'proxy-authenticate',
  'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade',
])

export function sanitizeHeaders(headers) {
  const out = {}
  for (const [k, v] of Object.entries(headers || {})) {
    if (!HOP_BY_HOP.has(k.toLowerCase())) out[k] = v
  }
  return out
}

// Only enforces the secret if PROXY_SECRET env var is set in the Vercel dashboard
export function checkSecret(req, res) {
  const secret = process.env.PROXY_SECRET
  if (secret && req.headers['x-proxy-secret'] !== secret) {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }
  return true
}
