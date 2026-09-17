const API_URL = import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:4000/api'
    : 'https://todoflow-ymps.onrender.com/api')
const TOKEN_KEY = 'todoflow_token'
export const authService = { 
  async request(path, options = {}) { const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message || 'Something went wrong. Please try again.'); return data },
  signup: body => authService.request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }), login: body => authService.request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: async () => (await authService.request('/auth/me', { headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` } })).user,
  logout: async () => { const token = localStorage.getItem(TOKEN_KEY); if (token) await authService.request('/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {}); authService.clearToken() },
  getToken: () => localStorage.getItem(TOKEN_KEY), saveSession: (token) => localStorage.setItem(TOKEN_KEY, token), clearToken: () => localStorage.removeItem(TOKEN_KEY),
}
