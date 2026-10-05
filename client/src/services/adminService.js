const API_URL = import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:4000/api'
    : 'https://todoflow-ymps.onrender.com/api')
const TOKEN_KEY = 'todoflow_token'

const getHeaders = () => {
  const token = localStorage.getItem(TOKEN_KEY)
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'An error occurred during the admin request.')
  }

  return data
}

export const adminService = {
  /**
   * Fetch aggregate admin dashboard stats
   */
  async getStats() {
    return await request('/admin/stats', { method: 'GET' })
  },

  /**
   * Fetch all users with optional query parameters (search, role, status)
   */
  async getUsers(query = {}) {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '' && val !== 'all') {
        params.append(key, val)
      }
    })
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await request(`/admin/users${qs}`, { method: 'GET' })
    return res.users || []
  },

  /**
   * Fetch a single user by ID with their task history
   */
  async getUserById(id) {
    const res = await request(`/admin/users/${id}`, { method: 'GET' })
    return res.user
  },

  /**
   * Activate or deactivate a user
   */
  async toggleUserStatus(id, isActive) {
    return await request(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    })
  },

  /**
   * Permanently delete a user
   */
  async deleteUser(id) {
    return await request(`/admin/users/${id}`, {
      method: 'DELETE',
    })
  },

  /**
   * Fetch all tasks across the platform
   */
  async getTodos(query = {}) {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '' && val !== 'all') {
        params.append(key, val)
      }
    })
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await request(`/admin/todos${qs}`, { method: 'GET' })
    return res.todos || []
  },

  /**
   * Delete an inappropriate or test task
   */
  async deleteTodo(id) {
    return await request(`/admin/todos/${id}`, {
      method: 'DELETE',
    })
  },
}
