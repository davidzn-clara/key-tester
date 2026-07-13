export default function handler(req, res) {
  // Returns the proxy secret so the frontend can authenticate subsequent requests.
  // No CORS header here — browser SOP blocks cross-origin reads.
  res.json({ proxySecret: process.env.PROXY_SECRET || '' })
}
