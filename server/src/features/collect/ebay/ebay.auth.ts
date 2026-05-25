const TOKEN_URL_PATH = '/identity/v1/oauth2/token'
const SCOPE = 'https://api.ebay.com/oauth/api_scope'
const REFRESH_LEEWAY_MS = 5 * 60 * 1000

let cachedToken: { token: string; expiresAt: number } | null = null
let pendingFetch: Promise<string> | null = null

export class EbayAuthError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'EbayAuthError'
    this.status = status
    this.body = body
  }
}

async function fetchToken(): Promise<string> {
  const appId = process.env.EBAY_APP_ID
  const certId = process.env.EBAY_CERT_ID
  const base = process.env.EBAY_API_BASE ?? 'https://api.ebay.com'

  if (!appId || !certId) {
    throw new EbayAuthError('EBAY_APP_ID / EBAY_CERT_ID not configured', 500, null)
  }

  const basic = Buffer.from(`${appId}:${certId}`).toString('base64')
  const body = new URLSearchParams({ grant_type: 'client_credentials', scope: SCOPE })

  const res = await fetch(`${base}${TOKEN_URL_PATH}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  const text = await res.text()
  let parsed: unknown = null
  if (text.length > 0) {
    try { parsed = JSON.parse(text) } catch { parsed = text }
  }

  if (!res.ok) {
    throw new EbayAuthError(`eBay token fetch failed: ${res.status}`, res.status, parsed)
  }

  const json = parsed as { access_token?: string; expires_in?: number; token_type?: string }
  if (!json?.access_token || typeof json.expires_in !== 'number') {
    throw new EbayAuthError('eBay token response missing fields', 500, parsed)
  }

  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  }
  return json.access_token
}

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - REFRESH_LEEWAY_MS) {
    return cachedToken.token
  }
  if (pendingFetch) return pendingFetch
  pendingFetch = fetchToken().finally(() => { pendingFetch = null })
  return pendingFetch
}

// Test-only — used to force a refresh in unit tests.
export function _resetTokenCache() {
  cachedToken = null
  pendingFetch = null
}
