import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { adminService } from '../../services/adminService'
import Loading from '../../components/Loading'

export default function AdminTodos({ navigate }) {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  // Delete modal state
  const [todoToDelete, setTodoToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchTodos = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminService.getTodos({
        search: searchTerm,
        status: statusFilter,
        priority: priorityFilter,
      })
      setTodos(data)
    } catch (err) {
      setError(err.message || 'Failed to fetch platform tasks.')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, statusFilter, priorityFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTodos()
    }, 250)
    return () => clearTimeout(timer)
  }, [fetchTodos])

  const handleDeleteTodo = async () => {
    if (!todoToDelete) return

    setIsDeleting(true)
    setError('')
    setActionSuccess('')
    try {
      await adminService.deleteTodo(todoToDelete.id)
      setTodos((prev) => prev.filter((t) => t.id !== todoToDelete.id))
      setActionSuccess(`Task "${todoToDelete.title}" was deleted.`)
      setTodoToDelete(null)
    } catch (err) {
      setError(err.message || 'Failed to delete task.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AdminLayout currentTab="todos" navigate={navigate}>
      <div className="admin-page-container">
        {/* Header */}
        <div className="admin-page-header">
          <div>
            <div className="admin-breadcrumbs">Administration / Todos</div>
            <h1 className="admin-page-title">Global Task Moderation</h1>
            <p className="admin-page-subtitle">
              Inspect and moderate tasks created by all users across the platform.
            </p>
          </div>
          <button
            type="button"
            className="admin-btn secondary"
            onClick={fetchTodos}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>

        {/* Feedback Alerts */}
        {actionSuccess && (
          <div className="alert-banner success" role="alert">
            <span>✓ {actionSuccess}</span>
            <button type="button" onClick={() => setActionSuccess('')} aria-label="Dismiss">×</button>
          </div>
        )}
        {error && (
          <div className="alert-banner" role="alert">
            <span>⚠ {error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Dismiss error">×</button>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="admin-filter-bar">
          <div className="admin-search-wrap">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="admin-search-icon">
              <circle cx="9" cy="9" r="6" />
              <line x1="13.5" y1="13.5" x2="18" y2="18" />
            </svg>
            <input
              type="text"
              placeholder="Search by title, description, or author…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-search-input"
            />
          </div>

          <div className="admin-filter-group">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-select"
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active (Pending)</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="admin-select"
              aria-label="Filter by priority"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>
        </div>

        {/* Todos Table */}
        <div className="admin-table-card">
          {loading ? (
            <div className="admin-loading-wrap">
              <Loading message="Loading platform tasks…" />
            </div>
          ) : todos.length === 0 ? (
            <div className="admin-empty-state">
              <span className="admin-empty-icon">📋</span>
              <h3>No tasks found</h3>
              <p>Try refining your search or filters.</p>
            </div>
          ) : (
            <div className="admin-table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Priority & Category</th>
                    <th>Owner / Author</th>
                    <th>Dates</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {todos.map((todo) => (
                    <tr key={todo.id}>
                      <td>
                        <div className="admin-todo-cell">
                          <span className={`admin-todo-title${todo.completed ? ' completed' : ''}`}>
                            {todo.title}
                          </span>
                          {todo.description && (
                            <p className="admin-todo-desc">{todo.description}</p>
                          )}
                          <span className="admin-todo-id" title="Todo ID">
                            ID: {todo.id}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`admin-status-badge ${todo.completed ? 'completed' : 'pending'}`}>
                          {todo.completed ? '✓ Completed' : '○ Pending'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-meta-cell">
                          <span className={`admin-priority-tag priority-${todo.priority || 'medium'}`}>
                            {todo.priority || 'medium'}
                          </span>
                          <span className="admin-category-tag">
                            {todo.category || 'general'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="admin-owner-info">
                          <span className="admin-owner-name">
                            {todo.user?.name || 'Unknown User'}
                          </span>
                          <span className="admin-owner-email">
                            {todo.user?.email || 'No email'}
                          </span>
                          {todo.user?.role === 'ADMIN' && (
                            <span className="admin-owner-badge">Admin</span>
                          )}
                        </div>
                      </td>
                      <td className="text-muted-cell">
                        <div className="admin-dates-stack">
                          <span>Created: {new Date(todo.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          {todo.updatedAt && (
                            <span className="date-subtext">Updated: {new Date(todo.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          )}
                        </div>
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="admin-table-btn btn-delete"
                          onClick={() => setTodoToDelete(todo)}
                          title="Delete inappropriate or test task"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {todoToDelete && (
          <div className="admin-modal-backdrop" onClick={() => !isDeleting && setTodoToDelete(null)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <h3>Confirm Task Deletion</h3>
                <button
                  type="button"
                  className="admin-modal-close"
                  onClick={() => setTodoToDelete(null)}
                  disabled={isDeleting}
                >
                  ✕
                </button>
              </div>
              <div className="admin-modal-body">
                <p>
                  Are you sure you want to delete the task: <strong>"{todoToDelete.title}"</strong>?
                </p>
                <div className="admin-warning-box">
                  <span className="warning-icon">⚠</span>
                  <span>Owner: {todoToDelete.user?.name} ({todoToDelete.user?.email}). This action will immediately remove the task from the database.</span>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn secondary"
                  onClick={() => setTodoToDelete(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-btn danger"
                  onClick={handleDeleteTodo}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting…' : 'Delete Task'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
