import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import TodoItem from '../components/TodoItem'
import { todoService } from '../services/todoService'

// ── Max title length ───────────────────────────────────────────────
const MAX_TITLE_LEN = 160

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
      <rect x="8" y="14" width="56" height="44" rx="8" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1.5" />
      <rect x="16" y="26" width="28" height="3" rx="1.5" fill="var(--border-strong)" />
      <rect x="16" y="33" width="20" height="3" rx="1.5" fill="var(--border)" />
      <rect x="16" y="40" width="24" height="3" rx="1.5" fill="var(--border)" />
      <circle cx="54" cy="22" r="10" fill="var(--primary)" />
      <path d="M49.5 22l3 3 5-5" stroke="var(--on-primary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── SVG icons for suggestion chips (no emoji) ──────────────────────
const ChipIcons = {
  cart: (
    <svg className="chip-icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 1h2l1.5 6h6l1.5-5H4" />
      <circle cx="7" cy="12" r=".8" fill="currentColor" stroke="none" />
      <circle cx="11" cy="12" r=".8" fill="currentColor" stroke="none" />
    </svg>
  ),
  mail: (
    <svg className="chip-icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="3" width="12" height="8" rx="1.5" />
      <path d="M1 4l6 4 6-4" />
    </svg>
  ),
  run: (
    <svg className="chip-icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="2.5" r="1" fill="currentColor" stroke="none" />
      <path d="M9 4.5L7 7l-3 1 2 3" />
      <path d="M6 5.5l2.5 1" />
    </svg>
  ),
  notes: (
    <svg className="chip-icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="1" width="10" height="12" rx="1.5" />
      <path d="M4 4h6M4 7h6M4 10h4" />
    </svg>
  ),
  phone: (
    <svg className="chip-icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 2h3l1 3-1.5 1.5A8 8 0 009 10l1.5-1.5L13 9.5v3A11 11 0 013 2z" />
    </svg>
  ),
}

// ── Suggestion chips — text only (no emoji) ────────────────────────
const SUGGESTIONS = [
  { label: 'Buy groceries',       icon: 'cart'  },
  { label: 'Reply to emails',     icon: 'mail'  },
  { label: 'Morning workout',     icon: 'run'   },
  { label: 'Review project notes',icon: 'notes' },
  { label: 'Call a friend',       icon: 'phone' },
]

// ── Progress bar motivational messages ────────────────────────────
function getProgressMessage(rate) {
  if (rate === 0)   return 'Start with a single task.'
  if (rate < 25)    return 'Good start — keep going!'
  if (rate < 50)    return "You're building momentum."
  if (rate < 75)    return 'Halfway there — great work!'
  if (rate < 100)   return 'Almost done — finish strong!'
  return            'All done! Excellent day!'
}

// ── Skeleton loader ───────────────────────────────────────────────
function SkeletonList() {
  return (
    <div className="skeleton-list" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-item" />
      ))}
    </div>
  )
}

// ── Details icon ──────────────────────────────────────────────────
function DetailsIcon({ expanded }) {
  return (
    <svg
      className="btn-details-icon"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {expanded
        ? <path d="M2 7h10M7 2v10" transform="rotate(45 7 7)" />
        : <><circle cx="7" cy="4" r=".6" fill="currentColor" stroke="none" /><path d="M7 6.5v4" /></>
      }
    </svg>
  )
}

// ── Toast component ───────────────────────────────────────────────
function Toast({ message, onUndo, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className="toast" role="status" aria-live="polite">
      <span>{message}</span>
      {onUndo && (
        <button type="button" className="toast-undo-btn" onClick={onUndo}>
          Undo
        </button>
      )}
    </div>
  )
}

export default function Dashboard({ navigate }) {
  const { user } = useAuth()

  const [todos, setTodos] = useState([])
  const [stats, setStats] = useState({
    total: 0, completed: 0, active: 0,
    highPriority: 0, overdue: 0, completionRate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')

  // Toast state: { id, message, undoFn? }
  const [toasts, setToasts] = useState([])

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
  const [titleError, setTitleError] = useState('')

  const inputRef = useRef(null)
  const announcerRef = useRef(null)

  // ── announce to screen readers ─────────────────────────────────
  const announce = useCallback((msg) => {
    if (announcerRef.current) {
      announcerRef.current.textContent = ''
      // micro-delay so SR re-reads even identical messages
      setTimeout(() => { announcerRef.current.textContent = msg }, 50)
    }
  }, [])

  // ── Load data ──────────────────────────────────────────────────
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

  // ── Keyboard shortcuts (N = new task, / = search) ──────────────
  useEffect(() => {
    const onKey = (e) => {
      // Don't fire when typing in an input/textarea/select
      const tag = document.activeElement?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === '/') {
        e.preventDefault()
        document.getElementById('task-search-input')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Refresh stats helper ───────────────────────────────────────
  const refreshStats = () => todoService.getStats().then(setStats).catch(() => {})

  // ── Create task ────────────────────────────────────────────────
  const handleCreateTodo = async (e) => {
    e?.preventDefault()
    const trimmed = newTitle.trim()

    if (!trimmed) {
      setTitleError('Task title cannot be empty.')
      return
    }
    if (trimmed.length > MAX_TITLE_LEN) {
      setTitleError(`Title is too long (max ${MAX_TITLE_LEN} characters).`)
      return
    }
    setTitleError('')
    setIsSubmitting(true)
    setActionError('')

    try {
      const created = await todoService.createTodo({
        title: trimmed,
        description: newDescription.trim() || undefined,
        priority: newPriority,
        category: newCategory,
        dueDate: newDueDate ? new Date(newDueDate + 'T12:00:00').toISOString() : undefined,
      })
      setTodos((prev) => [created, ...prev])
      setNewTitle('')
      setNewDescription('')
      setNewPriority('medium')
      setNewCategory('general')
      setNewDueDate('')
      setShowFormDetails(false)
      announce(`Task "${trimmed}" added.`)
      refreshStats()
    } catch (err) {
      setActionError(err.message || 'Could not create task.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Toggle completion (optimistic) ────────────────────────────
  const handleToggle = async (id) => {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t))
    try {
      await todoService.toggleTodo(id)
      refreshStats()
    } catch {
      setTodos((prev) => prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t))
      setActionError('Failed to update task.')
    }
  }

  // ── Update task ───────────────────────────────────────────────
  const handleUpdate = async (id, updates) => {
    try {
      const updated = await todoService.updateTodo(id, updates)
      setTodos((prev) => prev.map((t) => t.id === id ? updated : t))
      refreshStats()
    } catch (err) {
      setActionError(err.message || 'Failed to save changes.')
      throw err
    }
  }

  // ── Delete with Undo toast ────────────────────────────────────
  const handleDelete = async (id) => {
    const backup = [...todos]
    const deleted = todos.find((t) => t.id === id)
    setTodos((prev) => prev.filter((t) => t.id !== id))
    announce(`Task "${deleted?.title}" deleted.`)

    const toastId = Date.now()
    const undoFn = () => {
      setTodos(backup)
      setToasts((prev) => prev.filter((t) => t.id !== toastId))
      announce('Delete undone.')
    }

    setToasts((prev) => [
      ...prev,
      { id: toastId, message: 'Task deleted', undoFn },
    ])

    try {
      await todoService.deleteTodo(id)
      refreshStats()
    } catch {
      setTodos(backup)
      setActionError('Failed to delete task.')
      setToasts((prev) => prev.filter((t) => t.id !== toastId))
    }
  }

  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id))

  // ── Clear completed ───────────────────────────────────────────
  const handleClearCompleted = async () => {
    const backup = [...todos]
    const count = todos.filter((t) => t.completed).length
    setTodos((prev) => prev.filter((t) => !t.completed))
    announce(`${count} completed task${count !== 1 ? 's' : ''} cleared.`)
    try {
      await todoService.clearCompleted()
      refreshStats()
    } catch {
      setTodos(backup)
      setActionError('Failed to clear completed tasks.')
    }
  }

  // ── Reset filters ─────────────────────────────────────────────
  const resetFilters = () => {
    setStatusFilter('all')
    setPriorityFilter('all')
    setCategoryFilter('all')
    setSearchQuery('')
  }

  // ── Client-side filter + sort ─────────────────────────────────
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

  const hasActiveFilters =
    statusFilter !== 'all' || priorityFilter !== 'all' ||
    categoryFilter !== 'all' || searchQuery.trim()

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  }).format(new Date())

  const hasInput = newTitle.trim().length > 0
  const tooLong  = newTitle.length > MAX_TITLE_LEN

  return (
    <main className="dashboard">
      {/* Screen-reader announcer */}
      <div
        ref={announcerRef}
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />

      <Navbar navigate={navigate} />

      <section className="dashboard-content">

        {/* ── Header ── */}
        <div className="dashboard-header">
          <div>
            <p className="eyebrow">{todayFormatted} · Workspace</p>
            <h1>Welcome, {user?.name ? user.name.split(' ')[0] : 'there'}</h1>
            <p className="dashboard-lede">
              Organize your priorities and flow through your day.
            </p>
          </div>

          <div className="progress-card" aria-label="Progress overview">
            <div className="progress-card-top">
              <div>
                <span className="progress-label">Today's Progress</span>
                <p className="progress-message">{getProgressMessage(stats.completionRate)}</p>
              </div>
              <span className="progress-percent" aria-label={`${stats.completionRate} percent complete`}>
                {stats.completionRate}%
              </span>
            </div>
            <div className="progress-bar-track" role="progressbar" aria-valuenow={stats.completionRate} aria-valuemin={0} aria-valuemax={100}>
              <div
                className={`progress-bar-fill${stats.completionRate === 100 ? ' full' : ''}`}
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
            <button type="button" onClick={() => setActionError('')} aria-label="Dismiss error">×</button>
          </div>
        )}

        {/* ── Task Creator ── */}
        <div className="task-creator-card">
          <form onSubmit={handleCreateTodo} noValidate>
            <div className="creator-main-row">
              <div className="creator-input-wrap">
                <span className="creator-bullet" aria-hidden="true">+</span>
                <input
                  ref={inputRef}
                  id="new-task-input"
                  type="text"
                  className="creator-input"
                  placeholder="What would you like to achieve? (N)"
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value)
                    if (titleError) setTitleError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateTodo(e)
                  }}
                  disabled={isSubmitting}
                  autoComplete="off"
                  aria-label="New task title"
                  aria-describedby={titleError ? 'title-error' : undefined}
                  maxLength={MAX_TITLE_LEN + 20}
                />
              </div>

              <div className="creator-actions">
                <button
                  type="button"
                  className={`btn-details-toggle${showFormDetails ? ' active' : ''}`}
                  onClick={() => setShowFormDetails(!showFormDetails)}
                  aria-expanded={showFormDetails}
                  aria-controls="creator-drawer"
                  title="Toggle additional details"
                >
                  <DetailsIcon expanded={showFormDetails} />
                  {showFormDetails ? '− Details' : '+ Details'}
                </button>

                <button
                  type="submit"
                  id="add-task-btn"
                  className={`creator-submit-btn${hasInput && !tooLong ? ' enabled' : ''}`}
                  disabled={isSubmitting || !hasInput || tooLong}
                  aria-label={isSubmitting ? 'Adding task…' : 'Add task'}
                >
                  {isSubmitting ? 'Adding…' : 'Add Task'}
                </button>
              </div>
            </div>

            {titleError && (
              <p id="title-error" className="creator-validation-msg" role="alert">
                ⚠ {titleError}
              </p>
            )}
            {tooLong && !titleError && (
              <p className="creator-validation-msg" role="alert">
                ⚠ Title too long ({newTitle.length}/{MAX_TITLE_LEN} characters).
              </p>
            )}

            {/* Expandable options drawer */}
            {showFormDetails && (
              <div id="creator-drawer" className="creator-expanded-drawer">
                <textarea
                  className="creator-desc-input"
                  placeholder="Notes, links, or description (optional)…"
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  aria-label="Task notes"
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
                { key: 'all',       label: 'All',    count: stats.total },
                { key: 'active',    label: 'Active', count: stats.active },
                { key: 'completed', label: 'Done',   count: stats.completed },
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
                id="task-search-input"
                type="search"
                placeholder="Search tasks… (/)"
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
            <SkeletonList />

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
                        key={s.label}
                        type="button"
                        role="listitem"
                        className="chip"
                        onClick={() => {
                          setNewTitle(s.label)
                          inputRef.current?.focus()
                        }}
                        aria-label={`Start with: ${s.label}`}
                      >
                        {ChipIcons[s.icon]}
                        {s.label}
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

      </section>

      {/* ── Toast container ── */}
      {toasts.length > 0 && (
        <div className="toast-container" aria-label="Notifications">
          {toasts.map((t) => (
            <Toast
              key={t.id}
              message={t.message}
              onUndo={t.undoFn}
              onDismiss={() => dismissToast(t.id)}
            />
          ))}
        </div>
      )}
    </main>
  )
}
