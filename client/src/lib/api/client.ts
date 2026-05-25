import type { z } from 'zod'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export class ApiValidationError extends Error {
  issues: z.core.$ZodIssue[]
  raw: unknown
  constructor(issues: z.core.$ZodIssue[], raw: unknown) {
    super('Response did not match the expected schema')
    this.name = 'ApiValidationError'
    this.issues = issues
    this.raw = raw
  }
}

type RequestOptions = Omit<RequestInit, 'body' | 'method'> & {
  body?: unknown
  signal?: AbortSignal
}

async function request<TOut>(
  method: string,
  path: string,
  schema: z.ZodType<TOut>,
  options: RequestOptions = {}
): Promise<TOut> {
  const { body, signal, headers, ...rest } = options

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const wantsJsonContentType = body !== undefined && !isFormData

  const init: RequestInit = {
    method,
    credentials: 'include',
    signal,
    headers: {
      ...(wantsJsonContentType ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...rest,
  }
  if (body !== undefined) {
    init.body = isFormData ? (body as FormData) : JSON.stringify(body)
  }

  const res = await fetch(`${API_URL}${path}`, init)

  let parsed: unknown = undefined
  const text = await res.text()
  if (text.length > 0) {
    try { parsed = JSON.parse(text) } catch { parsed = text }
  }

  if (!res.ok) {
    const message =
      (parsed && typeof parsed === 'object' && 'error' in parsed && typeof parsed.error === 'string'
        ? parsed.error
        : null) ?? `${method} ${path} failed: ${res.status}`
    throw new ApiError(message, res.status, parsed)
  }

  const validation = schema.safeParse(parsed)
  if (!validation.success) {
    if (import.meta.env.DEV) {
      console.warn(`[apiClient] ${method} ${path} response failed validation`, {
        issues: validation.error.issues,
        raw: parsed,
      })
    }
    throw new ApiValidationError(validation.error.issues, parsed)
  }
  return validation.data
}

export const apiClient = {
  get: <T>(path: string, schema: z.ZodType<T>, options?: RequestOptions) =>
    request('GET', path, schema, options),
  post: <T>(path: string, schema: z.ZodType<T>, options?: RequestOptions) =>
    request('POST', path, schema, options),
  put: <T>(path: string, schema: z.ZodType<T>, options?: RequestOptions) =>
    request('PUT', path, schema, options),
  patch: <T>(path: string, schema: z.ZodType<T>, options?: RequestOptions) =>
    request('PATCH', path, schema, options),
  del: <T>(path: string, schema: z.ZodType<T>, options?: RequestOptions) =>
    request('DELETE', path, schema, options),
}
