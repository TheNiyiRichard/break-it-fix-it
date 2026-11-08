// Small helper for talking to the API.
// Every call goes to either /api/secure/... or /api/vulnerable/..., depending on the mode.
export type Mode = 'secure' | 'vulnerable'

export interface CurrentUser {
  id: number
  username: string
}

export interface Invoice {
  id: number
  clientName: string
  amount: number
  paid: boolean
  notes: string
  ownerId?: number
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin', // send the session cookie
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? `Request failed (${response.status})`)
  }

  return response.status === 204 ? (undefined as T) : response.json()
}

export const api = {
  login: (mode: Mode, username: string, password: string) =>
    request<CurrentUser>(`/api/${mode}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: (mode: Mode) => request<void>(`/api/${mode}/auth/logout`, { method: 'POST' }),
  me: (mode: Mode) => request<CurrentUser>(`/api/${mode}/auth/me`),
  myInvoices: (mode: Mode) => request<Invoice[]>(`/api/${mode}/invoices`),
  invoiceById: (mode: Mode, id: number) => request<Invoice>(`/api/${mode}/invoices/${id}`),
  updateNotes: (mode: Mode, id: number, notes: string) =>
    request<Invoice>(`/api/${mode}/invoices/${id}/notes`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    }),
  simulateBreach: () => request<BreachRow[]>('/api/demo/breach'),
}

export interface BreachRow {
  username: string
  plainTextLeak: string
  hashedLeak: string
}
