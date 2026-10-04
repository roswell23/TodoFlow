import { useState, useEffect, useRef } from 'react'

/**
 * Renders a single todo item with inline editing support.
 * - Double-click title body OR click the edit button to enter edit mode.
 * - Esc cancels without saving; Enter in the title field saves.
 * - Action buttons (edit/delete) are revealed on hover / focus-within.
 */
export default function TodoItem({ todo, onToggle, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(todo.title)
  const [editDescription, setEditDescription] = useState(todo.description || '')
  const [editPriority, setEditPriority] = useState(todo.priority || 'medium')
  const [editCategory, setEditCategory] = useState(todo.category || 'general')
  const [editDueDate, setEditDueDate] = useState(
    todo.dueDate ? todo.dueDate.substring(0, 10) : ''
  )
  const [saving, setSaving] = useState(false)
  const titleInputRef = useRef(null)

  // Auto-focus the title field when editing begins
  useEffect(() => {
    if (isEditing) {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }
  }, [isEditing])

  const handleSave = async (e) => {
    e?.preventDefault()
    if (!editTitle.trim()) return
    setSaving(true)
    try {
      await onUpdate(todo.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        priority: editPriority,
        category: editCategory,
        dueDate: editDueDate ? new Date(editDueDate + 'T12:00:00').toISOString() : null,
      })
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditTitle(todo.title)
    setEditDescription(todo.description || '')
    setEditPriority(todo.priority || 'medium')
    setEditCategory(todo.category || 'general')
    setEditDueDate(todo.dueDate ? todo.dueDate.substring(0, 10) : '')
    setIsEditing(false)
  }

  // Esc key cancels editing from anywhere in the form
  const handleEditKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  // Calculate due date display with "Today" / "Tomorrow" / "Overdue" labels
  const formatDueDate = (dateString) => {
    if (!dateString) return null
    const due = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDateClean = new Date(due)
    dueDateClean.setHours(0, 0, 0, 0)
    const diffDays = Math.round((dueDateClean - today) / (1000 * 60 * 60 * 24))

    let label = ''
    let isOverdue = false
    let isToday = false

    if (diffDays < 0) {
      const n = Math.abs(diffDays)
      label = `Overdue · ${n}d ago`
      isOverdue = true
    } else if (diffDays === 0) {
      label = 'Due today'
      isToday = true
    } else if (diffDays === 1) {
      label = 'Due tomorrow'
    } else {
      label = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }

    return { label, isOverdue, isToday }
  }

  const dueInfo = formatDueDate(todo.dueDate)

  // ── Edit mode ─────────────────────────────────────────────────
  if (isEditing) {
    return (
      <li className="todo-item editing-card" onKeyDown={handleEditKeyDown}>
        <form className="edit-form" onSubmit={handleSave}>
          <div className="edit-row">
            <input
              ref={titleInputRef}
              type="text"
              className="edit-title-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Task title…"
              required
              aria-label="Edit task title"
            />
          </div>

          <textarea
            className="edit-desc-input"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Add notes or details (optional)…"
            rows={2}
            aria-label="Task notes"
          />

          <div className="edit-controls-row">
            <div className="edit-meta-group">
              <label className="edit-field">
                <span>Priority</span>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                  aria-label="Task priority"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>

              <label className="edit-field">
                <span>Category</span>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  aria-label="Task category"
                >
                  <option value="general">General</option>
                  <option value="work">Work</option>
                  <option value="personal">Personal</option>
                  <option value="urgent">Urgent</option>
                  <option value="learning">Learning</option>
                  <option value="health">Health</option>
                </select>
              </label>

              <label className="edit-field">
                <span>Due date</span>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  aria-label="Task due date"
                />
              </label>
            </div>

            <div className="edit-buttons">
              <button
                type="button"
                className="btn-cancel"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel (Esc)
              </button>
              <button
                type="submit"
                className="btn-save"
                disabled={saving || !editTitle.trim()}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </li>
    )
  }

  // ── Display mode ──────────────────────────────────────────────
  return (
    <li
      className={`todo-item ${todo.completed ? 'completed' : ''} priority-${todo.priority || 'medium'}`}
    >
      {/* Checkbox */}
      <button
        type="button"
        className={`todo-checkbox ${todo.completed ? 'checked' : ''}`}
        onClick={() => onToggle(todo.id)}
        aria-label={todo.completed ? 'Mark task incomplete' : 'Mark task complete'}
        aria-checked={todo.completed}
        role="checkbox"
      >
        {todo.completed && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
            <path d="M1 4l3 3 5-6" stroke="var(--on-primary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Body — double-click to edit */}
      <button
        type="button"
        className="todo-body"
        onDoubleClick={() => setIsEditing(true)}
        onClick={() => onToggle(todo.id)}
        aria-label={`${todo.completed ? 'Completed: ' : ''}${todo.title}`}
      >
        <div className="todo-main-line">
          <span className="todo-title">{todo.title}</span>

          <div className="todo-badges">
            <span className={`badge priority-badge priority-${todo.priority || 'medium'}`}>
              <span className="badge-dot" />
              {todo.priority || 'medium'}
            </span>

            {todo.category && todo.category !== 'general' && (
              <span className="badge category-badge">
                #{todo.category}
              </span>
            )}

            {dueInfo && (
              <span
                className={`badge due-badge${
                  dueInfo.isOverdue ? ' overdue' : dueInfo.isToday ? ' today' : ''
                }`}
                aria-label={dueInfo.isOverdue ? `Overdue: ${dueInfo.label}` : dueInfo.label}
              >
                {dueInfo.isOverdue
                  ? (
                    <>
                      {/* Non-color indicator: warning icon + italic style in CSS */}
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                        <path d="M5 1L1 9h8L5 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                        <path d="M5 4.5v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        <circle cx="5" cy="7.5" r=".4" fill="currentColor" />
                      </svg>
                      {dueInfo.label}
                    </>
                  )
                  : dueInfo.isToday
                  ? (
                    <>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                        <rect x="1" y="2" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M3 1v2M7 1v2M1 5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                      {dueInfo.label}
                    </>
                  )
                  : dueInfo.label
                }
              </span>
            )}
          </div>
        </div>

        {todo.description && (
          <p className="todo-description">{todo.description}</p>
        )}
      </button>

      {/* Action buttons */}
      <div className="todo-actions">
        <button
          type="button"
          className="icon-action-btn edit-btn"
          onClick={(e) => { e.stopPropagation(); setIsEditing(true) }}
          aria-label="Edit task"
          title="Edit task (or double-click)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" />
          </svg>
        </button>

        <button
          type="button"
          className="icon-action-btn delete-btn"
          onClick={(e) => { e.stopPropagation(); onDelete(todo.id) }}
          aria-label="Delete task"
          title="Delete task"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 4h10M5 4V2h4v2M5.5 6.5v4M8.5 6.5v4M3 4l.8 7.5A1 1 0 004.8 13h4.4a1 1 0 001-.95L11 4" />
          </svg>
        </button>
      </div>
    </li>
  )
}
