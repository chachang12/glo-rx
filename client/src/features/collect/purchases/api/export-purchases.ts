import { API_URL, ApiError } from '@/lib/api/client'

/**
 * Downloads the daily purchases CSV. Uses fetch + blob URL so we can surface
 * server errors (403, 404, etc.) before triggering the download — a plain
 * <a download> would silently serve the error page as a "file".
 */
export async function downloadPurchasesCsv(date: string): Promise<void> {
  const qs = new URLSearchParams({ date }).toString()
  const res = await fetch(`${API_URL}/api/collect/purchases/export.csv?${qs}`, {
    credentials: 'include',
  })

  if (!res.ok) {
    let body: unknown = null
    try { body = await res.json() } catch { /* not JSON */ }
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `Export failed: ${res.status}`
    throw new ApiError(message, res.status, body)
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `purchases-${date}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
