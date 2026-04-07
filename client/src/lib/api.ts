export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

/**
 * Fetch wrapper that prepends the API base URL and includes credentials.
 */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...init,
  })
}
