const API_URL = import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:4000/api'
    : 'https://todoflow-ymps.onrender.com/api')

const TOKEN_KEY = 'todoflow_token'

export const authService = {
  /**
   * Safely retrieve token from storage without returning invalid strings or throwing.
   */
  getToken() {
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
        return null
      }
      return token.trim()
    } catch {
      return null
    }
  },

  /**
   * Persist token to localStorage.
   */
  saveSession(token) {
    try {
      if (token && token !== 'null' && token !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, token.trim())
      }
    } catch (e) {
      console.warn('Failed to save session token:', e)
    }
  },

  /**
   * Remove token and any authentication artifacts from storage.
   */
  clearToken() {
    try {
      localStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem(TOKEN_KEY)
    } catch (e) {
      console.warn('Failed to clear session token:', e)
    }
  },

  /**
   * Attach Authorization header only if a valid token exists.
   * Never generates 'Bearer null' or 'Bearer undefined'.
   */
  getHeaders(customHeaders = {}) {
    const token = authService.getToken()
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders,
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    } else {
      delete headers['Authorization']
    }
    return headers
  },

  /**
   * Unified fetch wrapper that intercepts 401s to clear state.
   */
  async request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: authService.getHeaders(options.headers),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      // If unauthorized on a protected endpoint, clear credentials and broadcast
      if (response.status === 401 && path !== '/auth/login' && path !== '/auth/signup') {
        authService.clearToken()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:unauthorized'))
        }
      }
      throw new Error(data.message || 'Something went wrong. Please try again.')
    }

    return data
  },

  signup: (body) => authService.request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => authService.request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: async () => (await authService.request('/auth/me')).user,

  /**
   * Safe logout: calls backend, cleans storage in finally, ensuring token is always removed.
   */
  logout: async () => {
    try {
      const token = authService.getToken()
      if (token) {
        await authService.request('/auth/logout', { method: 'POST' })
      }
    } catch {
      // Ignore network errors so client logout is never blocked
    } finally {
      authService.clearToken()
    }
  },
}
