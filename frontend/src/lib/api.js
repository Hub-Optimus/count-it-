import { supabase } from './supabase'

const BASE_URL = import.meta.env.VITE_API_URL

async function authHeader() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json', ...(await authHeader()) }
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const err = await res.json()
      message = err.detail || message
    } catch {
      // response wasn't JSON - keep the generic message
    }
    throw new Error(message)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  del: (path) => request('DELETE', path),
}
