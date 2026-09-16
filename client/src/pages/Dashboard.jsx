import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import TodoItem from '../components/TodoItem'
import { todoService } from '../services/todoService'

// ── Inline empty-state SVG illustration ───────────────────────────
function EmptyIllustration() {
  return (
    <svg
      className="empty-illustration"
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="8" y="14" width="56" height="44" rx="8" fill="#F0EEEC" stroke="#E3E0DB" strokeWidth="1.5" />
      <rect x="16" y="26" width="28" height="3" rx="1.5" fill="#D5D2CE" />
      <rect x="16" y="33" width="20" height="3" rx="1.5" fill="#E3E0DB" />
      <rect x="16" y="40" width="24" height="3" rx="1.5" fill="#E3E0DB" />
      <circle cx="54" cy="22" r="10" fill="#1A1A1A" />
      <path d="M49.5 22l3 3 5-5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Suggestion chips for empty state ──────────────────────────────
const SUGGESTIONS = [
  'Buy groceries 🛒',
  'Reply to emails 📬',
  'Morning workout 🏃',
  'Review project notes 📋',
  'Call a friend 📞',
]

export default function Dashboard({ navigate }) {
  const { user } = useAuth()

  const [todos, setTodos] = useState([])
  const [stats, setStats] = useState({
    total: 0, completed: 0, active: 0,
    highPriority: 0, overdue: 0, completionRate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')

  // Filters & Sorting
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')

  // New task form
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPriority, setNewPriority] = useState('medium')
  const [newCategory, setNewCategory] = useState('general')
  const [newDueDate, setNewDueDate] = useState('')
  const [showFormDetails, setShowFormDetails] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load initial tasks & stats
  const fetchAllData = async () => {
    try {
      setActionError('')
      const [fetchedTodos, fetchedStats] = await Promise.all([
        todoService.getTodos(),
        todoService.getStats(),
      ])
      setTodos(fetchedTodos)
      setStats(fetchedStats)
    } catch (err) {
      console.error('Failed to load tasks:', err)
      setActionError(err.message || 'Failed to load your tasks.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAllData() }, [])

  // Create task handler
  const handleCreateTodo = async (e) => {
    e?.preventDefault()
    if (!newTitle.trim()) return

    setIsSubmitting(true)
    setActionError('')
    try {
      const created = await todoService.createTodo({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        priority: newPriority,
        category: newCategory,
        // Fix timezone: use noon UTC so date never shifts a day
        dueDate: newDueDate ? new Date(newDueDate + 'T12:00:00').toISOString() : undefined,
      })
      setTodos((prev) => [created, ...prev])
      setNewTitle('')
      setNewDescription('')
      setNewPriority('medium')
      setNewCategory('general')
      setNewDueDate('')
      setShowFormDetails(false)
      todoService.getStats().then(setStats).catch(() => {})
    } catch (err) {
      setActionError(err.message || 'Could not create task.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle completion (optimistic)
  const handleToggle = async (id) => {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t))
    try {
      await todoService.toggleTodo(id)
      todoService.getStats().then(setStats).catch(() => {})
    } catch (err) {
      setTodos((prev) => prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t))
      setActionError('Failed to update task.')
    }
  }

  // Update task
  const handleUpdate = async (id, updates) => {
    try {
      const updated = await todoService.updateTodo(id, updates)
      setTodos((prev) => prev.map((t) => t.id === id ? updated : t))
      todoService.getStats().then(setStats).catch(() => {})
    } catch (err) {
      setActionError(err.message || 'Failed to save changes.')
      throw err
    }
  }

  // Delete task (optimistic)
  const handleDelete = async (id) => {
    const backup = [...todos]
    setTodos((prev) => prev.filter((t) => t.id !== id))
    try {
      await todoService.deleteTodo(id)
      todoService.getStats().then(setStats).catch(() => {})
    } catch {
      setTodos(backup)
      setActionError('Failed to delete task.')
    }
  }

  // Clear completed
  const handleClearCompleted = async () => {
    if (!window.confirm('Clear all completed tasks?')) return
    const backup = [...todos]
    setTodos((prev) => prev.filter((t) => !t.completed))
    try {
      await todoService.clearCompleted()
      todoService.getStats().then(setStats).catch(() => {})
    } catch {
      setTodos(backup)
      setActionError('Failed to clear completed tasks.')
    }
  }

  // Reset all filters
  const resetFilters = () => {
    setStatusFilter('all')
    setPriorityFilter('all')
    setCategoryFilter('all')
    setSearchQuery('')
  }

  // Client-side filter + sort
  const filteredTodos = useMemo(() => {
    return todos
      .filter((todo) => {
        if (statusFilter === 'active' && todo.completed) return false
        if (statusFilter === 'completed' && !todo.completed) return false
        if (priorityFilter !== 'all' && todo.priority !== priorityFilter) return false
        if (categoryFilter !== 'all' && todo.category !== categoryFilter) return false
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const inTitle    = todo.title.toLowerCase().includes(q)
          const inDesc     = todo.description?.toLowerCase().includes(q)
          const inCategory = todo.category?.toLowerCase().includes(q)
          if (!inTitle && !inDesc && !inCategory) return false
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'dueDate') {
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return new Date(a.dueDate) - new Date(b.dueDate)
        }
        if (sortBy === 'priority') {
          const w = { high: 3, medium: 2, low: 1 }
          return (w[b.priority] || 0) - (w[a.priority] || 0)
        }
        return new Date(b.createdAt) - new Date(a.createdAt)
      })
  }, [todos, statusFilter, priorityFilter, categoryFilter, searchQuery, sortBy])

  // Detect if any filter is active
  const hasActiveFilters =
    statusFilter !== 'all' || priorityFilter !== 'all' ||
    categoryFilter !== 'all' || searchQuery.trim()

  // Date greeting
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  }).format(new Date())

  return (
    <main className="dashboard">
      <Navbar navigate={navigate} />

      <section className="dashboard-content">

        {/* ── Header ── */}
        <div className="dashboard-header">
          <div>
            <p className="eyebrow">{todayFormatted} · Workspace</p>
            <h1>Welcome, {user?.name ? user.name.split(' ')[0] : 'there'}.</h1>
            <p className="dashboard-lede">
              Organize your priorities and flow through your day.
            </p>
          </div>

          <div className="progress-card">
            <div className="progress-card-top">
              <span className="progress-label">Progress</span>
              <span className="progress-percent">{stats.completionRate}%</span>
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
            <div className="stats-badges-row">
              <span className="stat-pill">
                <strong>{stats.active}</strong> active
              </span>
              <span className="stat-pill">
                <strong>{stats.completed}</strong> done
              </span>
              {stats.highPriority > 0 && (
                <span className="stat-pill highlight-urgent">
                  <strong>{stats.highPriority}</strong> urgent
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Error Banner ── */}
        {actionError && (
          <div className="alert-banner" role="alert">
            <span>⚠ {actionError}</span>
            <button type="button" onClick={() => setActionError('')} aria-label="Dismiss">×</button>
          </div>
        )}

        {/* ── Task Creator ── */}
        <div className="task-creator-card">
          <form onSubmit={handleCreateTodo}>
            <div className="creator-main-row">
              <div className="creator-input-wrap">
                <span className="creator-bullet" aria-hidden="true">+</span>
                <input
                  id="new-task-input"
                  type="text"
                  className="creator-input"
                  placeholder="What would you like to achieve?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="off"
                />
              </div>

              <div className="creator-actions">
                <button
                  type="button"
                  className={`btn-details-toggle${showFormDetails ? ' active' : ''}`}
                  onClick={() => setShowFormDetails(!showFormDetails)}
                  aria-expanded={showFormDetails}
                  title="Toggle additional details"
                >
                  {showFormDetails ? '− Details' : '+ Details'}
                </button>

                <button
                  type="submit"
                  id="add-task-btn"
                  className="creator-submit-btn"
                  disabled={isSubmitting || !newTitle.trim()}
                >
                  {isSubmitting ? 'Adding…' : 'Add Task'}
                </button>
              </div>
            </div>

            {/* Expandable options drawer */}
            {showFormDetails && (
              <div className="creator-expanded-drawer">
                <textarea
                  className="creator-desc-input"
                  placeholder="Notes, links, or description (optional)…"
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
                <div className="creator-meta-row">
                  <div className="meta-field">
                    <label htmlFor="new-priority">Priority</label>
                    <select
                      id="new-priority"
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="meta-field">
                    <label htmlFor="new-category">Category</label>
                    <select
                      id="new-category"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    >
                      <option value="general">General</option>
                      <option value="work">Work</option>
                      <option value="personal">Personal</option>
                      <option value="urgent">Urgent</option>
                      <option value="learning">Learning</option>
                      <option value="health">Health</option>
                    </select>
                  </div>
                  <div className="meta-field">
                    <label htmlFor="new-due">Due Date</label>
                    <input
                      id="new-due"
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* ── Toolbar (only when tasks exist or filters active) ── */}
        {(todos.length > 0 || hasActiveFilters) && (
          <div className="todos-toolbar" role="toolbar" aria-label="Task filters">
            <div className="status-tabs" role="tablist">
              {[
                { key: 'all',       label: 'All',       count: stats.total },
                { key: 'active',    label: 'Active',    count: stats.active },
                { key: 'completed', label: 'Done',      count: stats.completed },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === key}
                  className={`tab-btn${statusFilter === key ? ' active' : ''}`}
                  onClick={() => setStatusFilter(key)}
                >
                  {label}
                  <span className="count-pill">{count}</span>
                </button>
              ))}
            </div>

            <div className="search-wrap">
              <span className="search-icon" aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search tasks…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                aria-label="Search tasks"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="filter-selects">
              <select
                id="priority-filter"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="filter-select"
                aria-label="Filter by priority"
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                id="category-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="filter-select"
                aria-label="Filter by category"
              >
                <option value="all">All Categories</option>
                <option value="work">Work</option>
                <option value="personal">Personal</option>
                <option value="urgent">Urgent</option>
                <option value="learning">Learning</option>
                <option value="health">Health</option>
                <option value="general">General</option>
              </select>

              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
                aria-label="Sort tasks"
              >
                <option value="createdAt">Newest first</option>
                <option value="dueDate">Due date</option>
                <option value="priority">Priority</option>
              </select>
            </div>
          </div>
        )}

        {/* ── Task List ── */}
        <section className="todos-section" aria-label="Task list">
          {loading ? (
            <div className="todos-loading">
              <div className="loading-spinner" role="status" aria-label="Loading" />
              <p>Loading your workspace…</p>
            </div>

          ) : filteredTodos.length === 0 ? (
            <div className="empty-card">
              <EmptyIllustration />

              {todos.length === 0 ? (
                <>
                  <h2>Your workspace is clear</h2>
                  <p>
                    Capture your first task above to start building momentum.
                    Try one of these to get started:
                  </p>
                  <div className="suggestion-chips" role="list">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="listitem"
                        className="chip"
                        onClick={() => {
                          setNewTitle(s)
                          document.getElementById('new-task-input')?.focus()
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h2>No matching tasks</h2>
                  <p>
                    No tasks match the current filters or search.
                    Try adjusting your criteria.
                  </p>
                  <button
                    type="button"
                    className="btn-reset-filters"
                    onClick={resetFilters}
                  >
                    Reset filters
                  </button>
                </>
              )}
            </div>

          ) : (
            <div className="todo-list-wrapper">
              <div className="list-meta-bar">
                <span className="list-count-text">
                  {filteredTodos.length} {filteredTodos.length === 1 ? 'task' : 'tasks'}
                  {hasActiveFilters && ' (filtered)'}
                </span>
                {stats.completed > 0 && (
                  <button
                    type="button"
                    className="btn-clear-completed"
                    onClick={handleClearCompleted}
                  >
                    Clear {stats.completed} completed
                  </button>
                )}
              </div>

              <ul className="todos-list" aria-label="Tasks">
                {filteredTodos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={handleToggle}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ── User Profile Footer ── */}
        <div className="user-card" aria-label="Signed-in user">
          <div className="avatar" aria-hidden="true">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <p className="card-label">Signed in as</p>
            <strong>{user?.name}</strong>
            <p>{user?.email}</p>
          </div>
        </div>

      </section>
    </main>
  )
}
