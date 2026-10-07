const API_URL = import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:4000/api'
    : 'https://todoflow-ymps.onrender.com/api')

const TOKEN_KEY = 'todoflow_token'

const getToken = () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
      return null
    }
    return token.trim()
  } catch {
    return null
  }
}

const getHeaders = (customHeaders = {}) => {
  const token = getToken()
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
}

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: getHeaders(options.headers),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    if (response.status === 401) {
      try {
        localStorage.removeItem(TOKEN_KEY)
        sessionStorage.removeItem(TOKEN_KEY)
      } catch {}
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'))
      }
    }
    throw new Error(data.message || 'An error occurred while communicating with the server.')
  }

  return data
}

export const todoService = {
  /**
   * Fetch all todos with optional filters:
   * @param {Object} query { status, priority, category, search, sortBy, sortOrder }
   */
  async getTodos(query = {}) {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '' && val !== 'all') {
        params.append(key, val)
      }
    })
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await request(`/todos${qs}`, { method: 'GET' })
    return res.todos || []
  },

  /**
   * Fetch user metrics/stats
   */
  async getStats() {
    return await request('/todos/stats', { method: 'GET' })
  },

  /**
   * Create a new task
   */
  async createTodo(todoData) {
    const res = await request('/todos', {
      method: 'POST',
      body: JSON.stringify(todoData),
    })
    return res.todo
  },

  /**
   * Update task details
   */
  async updateTodo(id, updates) {
    const res = await request(`/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    return res.todo
  },

  /**
   * Toggle completion status
   */
  async toggleTodo(id) {
    const res = await request(`/todos/${id}/toggle`, {
      method: 'PATCH',
    })
    return res.todo
  },

  /**
   * Delete a task
   */
  async deleteTodo(id) {
    return await request(`/todos/${id}`, {
      method: 'DELETE',
    })
  },

  /**
   * Clear all completed tasks
   */
  async clearCompleted() {
    return await request('/todos/completed', {
      method: 'DELETE',
    })
  },
}
