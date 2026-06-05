// Light session — no auth server, just localStorage identity
// In production this would be replaced with Supabase Auth magic links

const KEY = 'coopera_session'

export interface Session {
  email: string
  displayName: string
  salaId: string
  role: 'madrina' | 'parent'
  status: 'pending' | 'approved'
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveSession(s: Session) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function clearSession() {
  localStorage.removeItem(KEY)
}
