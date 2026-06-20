const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown }
    if (typeof body.detail === 'string') {
      return body.detail
    }
    if (Array.isArray(body.detail)) {
      return 'Nieprawidłowe dane formularza.'
    }
  } catch {
    return `HTTP ${response.status}`
  }

  return `HTTP ${response.status}`
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(init.headers)
  const body = init.body

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (
    body &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
