import { useState } from 'react'

/**
 * Renders a single todo item with inline editing support.
 * Action buttons (edit/delete) are revealed on hover for a clean default state.
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

  // Calculate due date display
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
      label = `Overdue (${Math.abs(diffDays)}d ago)`
      isOverdue = true
    } else if (diffDays === 0) {
      label = 'Due Today'
      isToday = true
    } else if (diffDays === 1) {
      label = 'Due Tomorrow'
    } else {
      label = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }

    return { label, isOverdue, isToday }
  }

  const dueInfo = formatDueDate(todo.dueDate)

  if (isEditing) {
    return (
      <li className="todo-item editing-card">
        <form className="edit-form" onSubmit={handleSave}>
          <div className="edit-row">
            <input
              type="text"
              className="edit-title-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Task title…"
              autoFocus
              required
            />
          </div>

          <textarea
            className="edit-desc-input"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Add notes or details (optional)…"
            rows={2}
          />

          <div className="edit-controls-row">
            <div className="edit-meta-group">
              <label className="edit-field">
                <span>Priority</span>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
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
                Cancel
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

  return (
    <li
      className={`todo-item ${todo.completed ? 'completed' : ''} priority-${todo.priority || 'medium'}`}
    >
      <button
        type="button"
        className={`todo-checkbox ${todo.completed ? 'checked' : ''}`}
        onClick={() => onToggle(todo.id)}
        aria-label={todo.completed ? 'Mark task incomplete' : 'Mark task complete'}
      >
        {todo.completed && <span className="checkmark">✓</span>}
      </button>

      <div className="todo-body" onClick={() => onToggle(todo.id)}>
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
                className={`badge due-badge ${
                  dueInfo.isOverdue ? 'overdue' : dueInfo.isToday ? 'today' : ''
                }`}
              >
                {dueInfo.isOverdue ? '⚠' : '📅'} {dueInfo.label}
              </span>
            )}
          </div>
        </div>

        {todo.description && (
          <p className="todo-description">{todo.description}</p>
        )}
      </div>

      <div className="todo-actions">
        <button
          type="button"
          className="icon-action-btn edit-btn"
          onClick={(e) => { e.stopPropagation(); setIsEditing(true) }}
          title="Edit task"
          aria-label="Edit task"
        >
          ✎
        </button>

        <button
          type="button"
          className="icon-action-btn delete-btn"
          onClick={(e) => { e.stopPropagation(); onDelete(todo.id) }}
          title="Delete task"
          aria-label="Delete task"
        >
          ✕
        </button>
      </div>
    </li>
  )
}
