import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import TodoItem from '../components/TodoItem'
import { todoService } from '../services/todoService'

// ── Max title length ───────────────────────────────────────────────
const MAX_TITLE_LEN = 160

// ── Inline SVG illustrations ──────────────────────────────────────
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
      <circle cx="54" cy="22" r="10" fill="var(--accent)" />
      <path d="M49.5 22l3 3 5-5" stroke="#FFFFFF" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CelebrationIllustration() {
  return (
    <svg
      className="empty-illustration celebration"
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="36" cy="36" r="28" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1.5" />
      <path d="M26 22h20v10c0 5.5-4.5 10-10 10s-10-4.5-10-10V22z" fill="var(--accent)" opacity="0.9" />
      <path d="M26 25H21a4 4 0 0 0-4 4v1a4 4 0 0 0 4 4h5M46 25h5a4 4 0 0 1 4 4v1a4 4 0 0 1-4 4h-5" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M36 42v8M28 50h16" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
      <path d="M48 16l1.2 2.5L52 19l-2.8.5L48 22l-.5-2.5L45 19l2.5-.5z" fill="var(--priority-med)" />
      <path d="M22 18l1 2 2 .5-2 .5-1 2-.5-2-2-.5 2-.5z" fill="var(--priority-med)" />
    </svg>
  )
}

function FilterEmptyIllustration() {
  return (
    <svg
      className="empty-illustration filter"
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="36" cy="36" r="28" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1.5" />
      <circle cx="33" cy="32" r="10" stroke="var(--text-muted)" strokeWidth="2" />
      <path d="M40.5 39.5L50 49" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M28 32h10" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
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

// ── Category Filter Chips ──────────────────────────────────────────
const CATEGORIES = [
  { key: 'all',      label: 'All' },
  { key: 'work',     label: 'Work' },
  { key: 'personal', label: 'Personal' },
  { key: 'school',   label: 'School' },
  { key: 'urgent',   label: 'Urgent' },
  { key: 'learning', label: 'Learning' },
  { key: 'health',   label: 'Health' },
]

// ── Progress bar motivational messages ────────────────────────────
function getProgressMessage(rate, total) {
  if (total === 0 || rate === 0) return 'Ready to start your day?'
  if (rate < 50)                  return 'Off to a good start!'
  if (rate < 100)                 return 'More than halfway there — keep going!'
  return                         'All done for today! Take a break.'
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
      className={`btn-details-icon ${expanded ? 'expanded' : ''}`}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {expanded ? (
        <polyline points="18 15 12 9 6 15" />
      ) : (
        <>
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </>
      )}
    </svg>
  )
}

// ── Toast component with countdown bar ────────────────────────────
function Toast({ message, onUndo, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast-message">{message}</span>
      {onUndo && (
        <button type="button" className="toast-undo-btn" onClick={onUndo} aria-label="Undo action">
          Undo
        </button>
      )}
      <div className="toast-progress-bar" aria-hidden="true" />
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

  // Command Palette & Quick Search
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [paletteQuery, setPaletteQuery] = useState('')
  const paletteInputRef = useRef(null)

  // New task form
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPriority, setNewPriority] = useState('medium')
  const [newCategory, setNewCategory] = useState('general')
  const [newDueDate, setNewDueDate] = useState('')
  const [newSubtasks, setNewSubtasks] = useState([])
  const [creatorSubtaskInput, setCreatorSubtaskInput] = useState('')
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

  // ── Keyboard shortcuts (/ = add task, Ctrl/Cmd+K = search, Esc = close) ──
  useEffect(() => {
    const onKey = (e) => {
      // Ctrl+K or Cmd+K: toggle command palette quick search
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
        return
      }

      // Esc: close command palette or drawer
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) {
          setIsCommandPaletteOpen(false)
          return
        }
        if (showFormDetails) {
          setShowFormDetails(false)
          return
        }
      }

      // Don't fire single-letter shortcuts when typing in inputs/textareas/selects
      const tag = document.activeElement?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

      // / focuses the new task add input
      if (e.key === '/' || e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isCommandPaletteOpen, showFormDetails])

  // Focus input when command palette opens
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setTimeout(() => paletteInputRef.current?.focus(), 40)
    }
  }, [isCommandPaletteOpen])

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
        subtasks: newSubtasks.length > 0 ? newSubtasks : undefined,
      })
      setTodos((prev) => [created, ...prev])
      setNewTitle('')
      setNewDescription('')
      setNewPriority('medium')
      setNewCategory('general')
      setNewDueDate('')
      setNewSubtasks([])
      setCreatorSubtaskInput('')
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
  const handleToggle = async (id, completeSubtasks = false) => {
    const target = todos.find((t) => t.id === id)
    if (!target) return

    const nextCompleted = !target.completed
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            completed: nextCompleted,
            subtasks:
              nextCompleted && completeSubtasks && t.subtasks
                ? t.subtasks.map((st) => ({ ...st, completed: true }))
                : t.subtasks,
          }
        }
        return t
      })
    )

    try {
      const updated = await todoService.toggleTodo(id, completeSubtasks)
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)))
      refreshStats()
    } catch {
      setTodos((prev) => prev.map((t) => (t.id === id ? target : t)))
      setActionError('Failed to update task status.')
    }
  }

  // ── Subtask Handlers ──────────────────────────────────────────
  const handleAddSubtask = async (todoId, title) => {
    try {
      const newSubtask = await todoService.createSubtask(todoId, { title })
      setTodos((prev) =>
        prev.map((t) => {
          if (t.id === todoId) {
            const current = t.subtasks || []
            return { ...t, subtasks: [...current, newSubtask] }
          }
          return t
        })
      )
      announce(`Subtask "${title}" added.`)
      return newSubtask
    } catch (err) {
      setActionError(err.message || 'Failed to add subtask.')
      throw err
    }
  }

  const handleUpdateSubtask = async (todoId, subtaskId, updates) => {
    const targetTodo = todos.find((t) => t.id === todoId)
    const prevSubtask = targetTodo?.subtasks?.find((s) => s.id === subtaskId)

    // Optimistic update
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id === todoId) {
          return {
            ...t,
            subtasks: (t.subtasks || []).map((st) =>
              st.id === subtaskId ? { ...st, ...updates } : st
            ),
          }
        }
        return t
      })
    )

    try {
      const updated = await todoService.updateSubtask(todoId, subtaskId, updates)
      setTodos((prev) =>
        prev.map((t) => {
          if (t.id === todoId) {
            return {
              ...t,
              subtasks: (t.subtasks || []).map((st) =>
                st.id === subtaskId ? updated : st
              ),
            }
          }
          return t
        })
      )
    } catch (err) {
      // Rollback on error
      if (prevSubtask) {
        setTodos((prev) =>
          prev.map((t) => {
            if (t.id === todoId) {
              return {
                ...t,
                subtasks: (t.subtasks || []).map((st) =>
                  st.id === subtaskId ? prevSubtask : st
                ),
              }
            }
            return t
          })
        )
      }
      setActionError(err.message || 'Failed to update subtask.')
      throw err
    }
  }

  const handleDeleteSubtask = async (todoId, subtask) => {
    const targetTodo = todos.find((t) => t.id === todoId)
    if (!targetTodo) return
    const originalSubtasks = targetTodo.subtasks || []

    // Optimistic delete
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id === todoId) {
          return {
            ...t,
            subtasks: (t.subtasks || []).filter((st) => st.id !== subtask.id),
          }
        }
        return t
      })
    )
    announce(`Subtask "${subtask.title}" deleted.`)

    const toastId = Date.now()
    const undoFn = async () => {
      try {
        const restored = await todoService.createSubtask(todoId, {
          title: subtask.title,
        })
        if (subtask.completed) {
          await todoService.updateSubtask(todoId, restored.id, { completed: true })
          restored.completed = true
        }
        setTodos((prev) =>
          prev.map((t) => {
            if (t.id === todoId) {
              return {
                ...t,
                subtasks: [...(t.subtasks || []), restored],
              }
            }
            return t
          })
        )
        announce('Subtask restored.')
      } catch {
        setActionError('Failed to restore subtask.')
      }
      setToasts((prev) => prev.filter((t) => t.id !== toastId))
    }

    setToasts((prev) => [
      ...prev,
      { id: toastId, message: 'Subtask deleted', undoFn },
    ])

    try {
      await todoService.deleteSubtask(todoId, subtask.id)
    } catch (err) {
      // Rollback
      setTodos((prev) =>
        prev.map((t) => (t.id === todoId ? { ...t, subtasks: originalSubtasks } : t))
      )
      setToasts((prev) => prev.filter((t) => t.id !== toastId))
      setActionError(err.message || 'Failed to delete subtask.')
    }
  }

  const handleReorderSubtasks = async (todoId, reorderedSubtaskIds) => {
    const targetTodo = todos.find((t) => t.id === todoId)
    if (!targetTodo) return
    const originalSubtasks = targetTodo.subtasks || []

    const idMap = new Map(originalSubtasks.map((s) => [s.id, s]))
    const newSubtaskList = reorderedSubtaskIds
      .map((id, index) => {
        const item = idMap.get(id)
        return item ? { ...item, order: index } : null
      })
      .filter(Boolean)

    setTodos((prev) =>
      prev.map((t) => (t.id === todoId ? { ...t, subtasks: newSubtaskList } : t))
    )

    try {
      const updated = await todoService.reorderSubtasks(todoId, reorderedSubtaskIds)
      setTodos((prev) =>
        prev.map((t) => (t.id === todoId ? { ...t, subtasks: updated } : t))
      )
    } catch (err) {
      setTodos((prev) =>
        prev.map((t) => (t.id === todoId ? { ...t, subtasks: originalSubtasks } : t))
      )
      setActionError(err.message || 'Failed to reorder subtasks.')
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
    announce('All filters and search criteria have been reset.')
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
          const inSubtask  = todo.subtasks?.some((st) => st.title.toLowerCase().includes(q))
          if (!inTitle && !inDesc && !inCategory && !inSubtask) return false
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

  // ── Command Palette Results ───────────────────────────────────
  const paletteResults = useMemo(() => {
    if (!paletteQuery.trim()) {
      return todos.slice(0, 8)
    }
    const q = paletteQuery.toLowerCase().trim()
    return todos
      .filter((t) => {
        const inTitle = t.title.toLowerCase().includes(q)
        const inDesc = t.description?.toLowerCase().includes(q)
        const inCategory = t.category?.toLowerCase().includes(q)
        const inSubtask = t.subtasks?.some((s) => s.title.toLowerCase().includes(q))
        return inTitle || inDesc || inCategory || inSubtask
      })
      .slice(0, 10)
  }, [todos, paletteQuery])

  const handleSelectPaletteTask = (todo) => {
    setIsCommandPaletteOpen(false)
    setCategoryFilter('all')
    setStatusFilter('all')
    setPriorityFilter('all')
    setSearchQuery('')
    setTimeout(() => {
      const el = document.getElementById(`todo-${todo.id}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('highlight-flash')
        setTimeout(() => el.classList.remove('highlight-flash'), 2000)
      }
    }, 100)
  }

  const handlePaletteCreateTask = () => {
    if (!paletteQuery.trim()) return
    const titleToCreate = paletteQuery.trim()
    setIsCommandPaletteOpen(false)
    setNewTitle(titleToCreate)
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

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
                <p className="progress-message">{getProgressMessage(stats.completionRate, stats.total)}</p>
              </div>
              <div className="progress-percent-wrap">
                {stats.completionRate === 100 && stats.total > 0 && (
                  <span className="celebration-badge" role="img" aria-label="All tasks complete" title="All done for today! Take a break.">
                    🎉
                  </span>
                )}
                <span className="progress-percent" aria-label={`${stats.completionRate} percent complete`}>
                  {stats.completionRate}%
                </span>
              </div>
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
                  placeholder="What would you like to achieve?"
                  title="New task (press N to focus from anywhere)"
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
                      <option value="school">School</option>
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

                {/* Subtasks Builder in Details drawer */}
                <div className="creator-subtasks-builder">
                  <span className="creator-subtasks-label">Checklist Items (optional)</span>
                  {newSubtasks.length > 0 && (
                    <ul className="creator-subtasks-list">
                      {newSubtasks.map((st, i) => (
                        <li key={i} className="creator-subtask-chip">
                          <span className="creator-subtask-bullet">•</span>
                          <span className="creator-subtask-text">{st.title}</span>
                          <button
                            type="button"
                            className="creator-subtask-del"
                            onClick={() => setNewSubtasks((prev) => prev.filter((_, idx) => idx !== i))}
                            aria-label={`Remove subtask ${st.title}`}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="creator-subtask-add-row">
                    <input
                      type="text"
                      className="creator-subtask-input"
                      placeholder="Add subtask (press Enter)…"
                      value={creatorSubtaskInput}
                      maxLength={200}
                      onChange={(e) => setCreatorSubtaskInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (creatorSubtaskInput.trim()) {
                            setNewSubtasks((prev) => [
                              ...prev,
                              { title: creatorSubtaskInput.trim(), completed: false, order: prev.length },
                            ])
                            setCreatorSubtaskInput('')
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="creator-subtask-add-btn"
                      onClick={() => {
                        if (creatorSubtaskInput.trim()) {
                          setNewSubtasks((prev) => [
                            ...prev,
                            { title: creatorSubtaskInput.trim(), completed: false, order: prev.length },
                          ])
                          setCreatorSubtaskInput('')
                        }
                      }}
                      disabled={!creatorSubtaskInput.trim()}
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* ── Toolbar (only when tasks exist or filters active) ── */}
        {(todos.length > 0 || hasActiveFilters) && (
          <div className="todos-toolbar" role="toolbar" aria-label="Task filters">
            <div className="toolbar-top-row">
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
                    onClick={() => {
                      setStatusFilter(key)
                      announce(`Showing ${label} tasks.`)
                    }}
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
                {searchQuery ? (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => {
                      setSearchQuery('')
                      announce('Search query cleared.')
                    }}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                ) : (
                  <button
                    type="button"
                    className="search-palette-trigger"
                    onClick={() => setIsCommandPaletteOpen(true)}
                    title="Quick search (Ctrl+K)"
                    aria-label="Open command search"
                  >
                    <kbd>⌘K</kbd>
                  </button>
                )}
              </div>

              <div className="filter-selects">
                <select
                  id="priority-filter"
                  value={priorityFilter}
                  onChange={(e) => {
                    const val = e.target.value
                    setPriorityFilter(val)
                    announce(val === 'all' ? 'All priorities shown.' : `Filtered by ${val} priority.`)
                  }}
                  className="filter-select"
                  aria-label="Filter by priority"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => {
                    const val = e.target.value
                    setSortBy(val)
                    announce(
                      val === 'createdAt'
                        ? 'Sorted by newest first.'
                        : val === 'dueDate'
                        ? 'Sorted by due date.'
                        : 'Sorted by priority.'
                    )
                  }}
                  className="filter-select"
                  aria-label="Sort tasks"
                >
                  <option value="createdAt">Newest first</option>
                  <option value="dueDate">Due date</option>
                  <option value="priority">Priority</option>
                </select>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="category-chips-bar" role="tablist" aria-label="Filter by category">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  className={`cat-chip ${categoryFilter === cat.key ? 'active' : ''}`}
                  onClick={() => {
                    setCategoryFilter(cat.key)
                    announce(cat.key === 'all' ? 'All categories shown.' : `Filtered by ${cat.label} category.`)
                  }}
                  role="tab"
                  aria-selected={categoryFilter === cat.key}
                >
                  <span className="cat-chip-dot" />
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Task List ── */}
        <section className="todos-section" aria-label="Task list">
          {loading ? (
            <SkeletonList />

          ) : filteredTodos.length === 0 ? (
            <div className="empty-card">
              {todos.length === 0 ? (
                <>
                  <EmptyIllustration />
                  <h2>Your day is clear. What would you like to accomplish?</h2>
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
              ) : stats.total > 0 && stats.active === 0 && (statusFilter === 'all' || statusFilter === 'active') ? (
                <>
                  <CelebrationIllustration />
                  <h2>All done for today! Take a break. 🎉</h2>
                  <p>
                    You&apos;ve completed all your tasks. Great job on staying focused!
                  </p>
                  <div className="empty-action-buttons">
                    <button
                      type="button"
                      className="btn-celebration-create"
                      onClick={() => {
                        inputRef.current?.focus()
                        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }}
                    >
                      + Add a new task
                    </button>
                    {stats.completed > 0 && (
                      <button
                        type="button"
                        className="btn-celebration-review"
                        onClick={() => setStatusFilter('completed')}
                      >
                        Review completed tasks
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <FilterEmptyIllustration />
                  <h2>No tasks match your filter</h2>
                  <p>
                    {searchQuery.trim()
                      ? `No tasks match "${searchQuery.trim()}". Try adjusting your search query.`
                      : 'No tasks match the active filters. Try adjusting your criteria.'}
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
                    onAddSubtask={handleAddSubtask}
                    onUpdateSubtask={handleUpdateSubtask}
                    onDeleteSubtask={handleDeleteSubtask}
                    onReorderSubtasks={handleReorderSubtasks}
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

      {/* ── Command Palette Quick Search Modal ── */}
      {isCommandPaletteOpen && (
        <div
          className="command-palette-backdrop"
          onClick={() => setIsCommandPaletteOpen(false)}
        >
          <div
            className="command-palette-card"
            role="dialog"
            aria-modal="true"
            aria-label="Command search palette"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="command-palette-header">
              <span className="command-palette-icon" aria-hidden="true">⌕</span>
              <input
                ref={paletteInputRef}
                type="text"
                className="command-palette-input"
                placeholder="Search tasks, categories, or subtasks…"
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsCommandPaletteOpen(false)
                  if (e.key === 'Enter') {
                    if (paletteResults.length > 0) {
                      handleSelectPaletteTask(paletteResults[0])
                    } else if (paletteQuery.trim()) {
                      handlePaletteCreateTask()
                    }
                  }
                }}
                aria-label="Type to search or jump to task"
              />
              <button
                type="button"
                className="command-palette-close"
                onClick={() => setIsCommandPaletteOpen(false)}
                aria-label="Close command search"
              >
                Esc
              </button>
            </div>

            <div className="command-palette-body">
              {paletteResults.length > 0 ? (
                <ul className="command-palette-list" role="listbox" aria-label="Matching tasks">
                  {paletteResults.map((t) => (
                    <li
                      key={t.id}
                      className={`command-palette-item ${t.completed ? 'completed' : ''}`}
                      role="option"
                      aria-selected="false"
                      onClick={() => handleSelectPaletteTask(t)}
                    >
                      <button
                        type="button"
                        className={`command-item-checkbox ${t.completed ? 'checked' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggle(t.id, t.completed)
                        }}
                        aria-label={t.completed ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {t.completed && (
                          <svg width="8" height="6" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                            <path d="M1 4l3 3 5-6" stroke="var(--on-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                      <div className="command-item-content">
                        <span className="command-item-title">{t.title}</span>
                        <div className="command-item-meta">
                          <span className={`command-priority-pill priority-${t.priority}`}>
                            {t.priority}
                          </span>
                          {t.category && t.category !== 'general' && (
                            <span className="command-category-pill">{t.category}</span>
                          )}
                          {t.subtasks && t.subtasks.length > 0 && (
                            <span className="command-subtask-count">
                              {t.subtasks.filter((s) => s.completed).length}/{t.subtasks.length} subtasks
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="command-item-jump">Jump ↵</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="command-palette-empty">
                  <p>No tasks matching &ldquo;{paletteQuery}&rdquo;</p>
                  {paletteQuery.trim() && (
                    <button
                      type="button"
                      className="btn-command-create"
                      onClick={handlePaletteCreateTask}
                    >
                      + Create task &ldquo;{paletteQuery.trim()}&rdquo;
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="command-palette-footer">
              <span className="palette-hint"><kbd>↵</kbd> select / jump</span>
              <span className="palette-hint"><kbd>Esc</kbd> close</span>
              <span className="palette-hint"><kbd>/</kbd> new task</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Shortcuts Hint Dock ── */}
      <aside className="shortcuts-hint-dock" aria-label="Keyboard shortcuts hint">
        <button
          type="button"
          className="hint-pill"
          onClick={() => {
            inputRef.current?.focus()
            inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
          title="Press / or N to focus new task input"
        >
          <kbd>/</kbd>
          <span>New task</span>
        </button>
        <button
          type="button"
          className="hint-pill"
          onClick={() => setIsCommandPaletteOpen(true)}
          title="Press Cmd+K or Ctrl+K to open search"
        >
          <kbd>⌘K</kbd>
          <span>Quick search</span>
        </button>
        <div className="hint-pill" title="Press Esc to close dialogs">
          <kbd>Esc</kbd>
          <span>Dismiss</span>
        </div>
      </aside>

      {/* ── Mobile Quick Add Floating Action Button ── */}
      <button
        type="button"
        className="mobile-quick-add-fab"
        onClick={() => {
          inputRef.current?.focus()
          inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }}
        aria-label="Add new task"
        title="Add new task"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </main>
  )
}
