import { useState, useEffect, useRef } from 'react'

/**
 * Renders a single todo item with subtask checklist support.
 * - Shows progress indicator (e.g. 2/5) with thin progress bar.
 * - Expand/collapse checklist with chevron (state remembered in localStorage).
 * - Inline add subtask with Enter, Backspace on empty to blur.
 * - Smooth strike-through animation on toggle.
 * - Inline double-click subtask editing.
 * - Drag-and-drop reordering + accessible Move Up / Move Down buttons.
 * - Auto-complete suggestion when all subtasks completed.
 * - Parent completion prompt when subtasks remain active.
 * - Subtask delete with undo toast callback.
 */
export default function TodoItem({
  todo,
  onToggle,
  onUpdate,
  onDelete,
  onAddSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
  onReorderSubtasks,
}) {
  const subtasks = todo.subtasks || []
  const completedSubtasks = subtasks.filter((s) => s.completed).length
  const totalSubtasks = subtasks.length
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0

  // ── Expand/collapse state persisted in localStorage ───────────
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      const stored = localStorage.getItem('todoflow_expanded_tasks')
      if (stored) {
        const set = new Set(JSON.parse(stored))
        return set.has(todo.id)
      }
    } catch {}
    return totalSubtasks > 0
  })

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev
      try {
        const stored = localStorage.getItem('todoflow_expanded_tasks')
        const list = stored ? JSON.parse(stored) : []
        const set = new Set(list)
        if (next) set.add(todo.id)
        else set.delete(todo.id)
        localStorage.setItem('todoflow_expanded_tasks', JSON.stringify([...set]))
      } catch {}
      return next
    })
  }

  // ── Inline task editing ───────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(todo.title)
  const [editDescription, setEditDescription] = useState(todo.description || '')
  const [editPriority, setEditPriority] = useState(todo.priority || 'medium')
  const [editCategory, setEditCategory] = useState(todo.category || 'general')
  const [editDueDate, setEditDueDate] = useState(
    todo.dueDate ? todo.dueDate.substring(0, 10) : ''
  )
  const [saving, setSaving] = useState(false)
  const [isDeletingLocal, setIsDeletingLocal] = useState(false)
  const titleInputRef = useRef(null)

  // ── Subtask inline add state ──────────────────────────────────
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [subtaskInputError, setSubtaskInputError] = useState('')
  const addSubtaskInputRef = useRef(null)

  // ── Subtask inline edit state ─────────────────────────────────
  const [editingSubtaskId, setEditingSubtaskId] = useState(null)
  const [editingSubtaskText, setEditingSubtaskText] = useState('')
  const editSubtaskInputRef = useRef(null)

  // ── Drag & Drop reorder state ─────────────────────────────────
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const [autoCompleteDismissed, setAutoCompleteDismissed] = useState(false)
  const showAutoCompletePrompt =
    totalSubtasks > 0 && completedSubtasks === totalSubtasks && !todo.completed && !autoCompleteDismissed
  const [showParentModal, setShowParentModal] = useState(false)

  // Focus trap refs for cascade modal
  const modalFirstBtnRef = useRef(null)
  const modalSecBtnRef = useRef(null)
  const modalCancelBtnRef = useRef(null)
  const parentCheckboxRef = useRef(null)

  // Focus first button when cascade modal opens, return focus when closes
  useEffect(() => {
    if (showParentModal) {
      setTimeout(() => modalFirstBtnRef.current?.focus(), 40)
    }
  }, [showParentModal])

  // ── Mobile Swipe Gestures ─────────────────────────────────────
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const touchStartXRef = useRef(0)
  const touchStartYRef = useRef(0)

  const handleTouchStart = (e) => {
    if (isEditing) return
    touchStartXRef.current = e.touches[0].clientX
    touchStartYRef.current = e.touches[0].clientY
    setIsSwiping(false)
  }

  const handleTouchMove = (e) => {
    if (isEditing) return
    const deltaX = e.touches[0].clientX - touchStartXRef.current
    const deltaY = e.touches[0].clientY - touchStartYRef.current

    if (!isSwiping && Math.abs(deltaY) > Math.abs(deltaX)) {
      return
    }

    if (Math.abs(deltaX) > 10) {
      if (!isSwiping) setIsSwiping(true)
      const clamped = Math.max(-90, Math.min(90, deltaX))
      setSwipeOffset(clamped)
    }
  }

  const handleTouchEnd = () => {
    if (isSwiping) {
      if (swipeOffset > 60) {
        handleParentCheckboxClick()
      } else if (swipeOffset < -60) {
        handleDeleteClick({ stopPropagation: () => {} })
      }
    }
    setSwipeOffset(0)
    setIsSwiping(false)
  }

  // Auto-focus the title field when editing begins
  useEffect(() => {
    if (isEditing) {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }
  }, [isEditing])

  // Auto-focus inline subtask edit input
  useEffect(() => {
    if (editingSubtaskId) {
      editSubtaskInputRef.current?.focus()
      editSubtaskInputRef.current?.select()
    }
  }, [editingSubtaskId])

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

  const handleEditKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  // ── Parent Checkbox Click ─────────────────────────────────────
  const handleParentCheckboxClick = () => {
    if (!todo.completed && subtasks.some((s) => !s.completed)) {
      // Uncompleted subtasks exist — ask user whether to complete all
      setShowParentModal(true)
    } else {
      onToggle(todo.id, false)
    }
  }

  // ── Inline Add Subtask ────────────────────────────────────────
  const handleAddSubtaskSubmit = async () => {
    const trimmed = newSubtaskTitle.trim()
    if (!trimmed) {
      setSubtaskInputError('Subtask title cannot be empty.')
      return
    }
    if (trimmed.length > 200) {
      setSubtaskInputError('Subtask title cannot exceed 200 characters.')
      return
    }

    setSubtaskInputError('')
    try {
      await onAddSubtask(todo.id, trimmed)
      setNewSubtaskTitle('')
      // Ensure checklist is expanded when adding
      if (!isExpanded) toggleExpanded()
      // Keep focus on input for rapid sequential entry
      setTimeout(() => addSubtaskInputRef.current?.focus(), 10)
    } catch (err) {
      setSubtaskInputError(err.message || 'Failed to add subtask.')
    }
  }

  const handleSubtaskInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddSubtaskSubmit()
    } else if (e.key === 'Backspace' && newSubtaskTitle === '') {
      addSubtaskInputRef.current?.blur()
    } else if (e.key === 'Escape') {
      setNewSubtaskTitle('')
      addSubtaskInputRef.current?.blur()
    }
  }

  // ── Inline Edit Subtask ───────────────────────────────────────
  const startEditingSubtask = (subtask) => {
    setEditingSubtaskId(subtask.id)
    setEditingSubtaskText(subtask.title)
  }

  const saveEditingSubtask = async (subtaskId) => {
    const trimmed = editingSubtaskText.trim()
    if (!trimmed) {
      setEditingSubtaskId(null)
      return
    }
    try {
      await onUpdateSubtask(todo.id, subtaskId, { title: trimmed })
    } finally {
      setEditingSubtaskId(null)
    }
  }

  // ── Accessible Keyboard Reordering ────────────────────────────
  const moveSubtask = (index, direction) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= subtasks.length) return
    const reordered = [...subtasks]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)
    onReorderSubtasks(
      todo.id,
      reordered.map((s) => s.id)
    )
  }

  // ── HTML5 Drag & Drop Reordering ──────────────────────────────
  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDrop = (e, targetIndex) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }
    const reordered = [...subtasks]
    const [moved] = reordered.splice(draggedIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    setDraggedIndex(null)
    setDragOverIndex(null)
    onReorderSubtasks(
      todo.id,
      reordered.map((s) => s.id)
    )
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // Calculate due date display with smart labels: Overdue, Today, Tomorrow, Future
  const formatDueDate = (dateString) => {
    if (!dateString) return null
    const due = new Date(dateString)
    if (isNaN(due.getTime())) return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDateClean = new Date(due)
    dueDateClean.setHours(0, 0, 0, 0)
    const diffDays = Math.round((dueDateClean - today) / (1000 * 60 * 60 * 24))

    const hasSpecificTime = due.getUTCHours() !== 12 || due.getUTCMinutes() !== 0
    const timeFormatted = hasSpecificTime
      ? ` at ${due.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
      : ''

    let label = ''
    let isOverdue = false
    let isToday = false

    if (diffDays < 0) {
      const n = Math.abs(diffDays)
      label = `Overdue · ${n}d ago${timeFormatted}`
      isOverdue = true
    } else if (diffDays === 0) {
      label = `Today${timeFormatted}`
      isToday = true
    } else if (diffDays === 1) {
      label = `Tomorrow${timeFormatted}`
    } else {
      label = `${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}${timeFormatted}`
    }

    return { label, isOverdue, isToday }
  }

  const dueInfo = formatDueDate(todo.dueDate)

  // ── Edit Mode ─────────────────────────────────────────────────
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
                  <option value="school">School</option>
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

  const handleDeleteClick = (e) => {
    e.stopPropagation()
    setIsDeletingLocal(true)
    setTimeout(() => {
      onDelete(todo.id)
    }, 200)
  }

  // ── Display Mode ──────────────────────────────────────────────
  return (
    <li
      id={`todo-${todo.id}`}
      className={`todo-item ${todo.completed ? 'completed' : ''} priority-${todo.priority || 'medium'} ${isDeletingLocal ? 'deleting' : ''} ${isSwiping ? 'swiping' : ''}`}
      role="listitem"
      data-swipe={swipeOffset > 40 ? 'complete' : swipeOffset < -40 ? 'delete' : undefined}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : undefined,
      }}
    >
      <div className="todo-item-top">
        {/* Parent Checkbox */}
        <button
          ref={parentCheckboxRef}
          type="button"
          className={`todo-checkbox ${todo.completed ? 'checked' : ''}`}
          onClick={handleParentCheckboxClick}
          aria-label={todo.completed ? 'Mark task incomplete' : 'Mark task complete'}
          aria-checked={todo.completed}
          role="checkbox"
        >
          {todo.completed && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
              <path
                d="M1 4l3 3 5-6"
                stroke="var(--on-primary)"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        {/* Body — double click to edit */}
        <div
          className="todo-body"
          onDoubleClick={() => setIsEditing(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setIsEditing(true)
          }}
          aria-label={`${todo.completed ? 'Completed: ' : ''}${todo.title}. Double-click to edit.`}
        >
          <div className="todo-main-line">
            <span className="todo-title">{todo.title}</span>

            <div className="todo-badges">
              {/* Progress Indicator for Subtasks */}
              {totalSubtasks > 0 && (
                <button
                  type="button"
                  className={`badge subtasks-progress-badge ${completedSubtasks === totalSubtasks ? 'all-done' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleExpanded()
                  }}
                  title={`${completedSubtasks} of ${totalSubtasks} subtasks completed (Click to toggle checklist)`}
                  aria-label={`${completedSubtasks} of ${totalSubtasks} subtasks completed`}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  <span>{completedSubtasks}/{totalSubtasks}</span>
                  <div className="subtasks-mini-track" aria-hidden="true">
                    <div
                      className="subtasks-mini-fill"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </button>
              )}

              <span className={`badge priority-badge priority-${todo.priority || 'medium'}`}>
                <span className="badge-dot" />
                {todo.priority || 'medium'}
              </span>

              {todo.category && todo.category !== 'general' && (
                <span className="badge category-badge">#{todo.category}</span>
              )}

              {dueInfo && (
                <span
                  className={`badge due-badge${
                    dueInfo.isOverdue ? ' overdue' : dueInfo.isToday ? ' today' : ''
                  }`}
                  aria-label={dueInfo.isOverdue ? `Overdue: ${dueInfo.label}` : dueInfo.label}
                >
                  {dueInfo.isOverdue ? (
                    <>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                        <path d="M5 1L1 9h8L5 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                        <path d="M5 4.5v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        <circle cx="5" cy="7.5" r=".4" fill="currentColor" />
                      </svg>
                      {dueInfo.label}
                    </>
                  ) : dueInfo.isToday ? (
                    <>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                        <rect x="1" y="2" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M3 1v2M7 1v2M1 5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                      {dueInfo.label}
                    </>
                  ) : (
                    dueInfo.label
                  )}
                </span>
              )}
            </div>
          </div>

          {todo.description && <p className="todo-description">{todo.description}</p>}
        </div>

        {/* Action buttons */}
        <div className="todo-actions">
          {/* Chevron expand/collapse button */}
          <button
            type="button"
            className={`icon-action-btn chevron-btn ${isExpanded ? 'expanded' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              toggleExpanded()
            }}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse subtasks checklist' : 'Expand subtasks checklist'}
            title={isExpanded ? 'Collapse checklist' : 'Expand checklist'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <button
            type="button"
            className="icon-action-btn edit-btn"
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
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
            onClick={handleDeleteClick}
            aria-label="Delete task"
            title="Delete task"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 4h10M5 4V2h4v2M5.5 6.5v4M8.5 6.5v4M3 4l.8 7.5A1 1 0 004.8 13h4.4a1 1 0 001-.95L11 4" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Subtasks Checklist Section ──────────────────────────── */}
      {isExpanded && (
        <div className="subtasks-section" aria-label="Subtasks checklist">
          {/* Progress bar across top of checklist */}
          {totalSubtasks > 0 && (
            <div className="subtasks-progress-header">
              <div
                className="subtasks-progress-track"
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`subtasks-progress-fill ${progressPercent === 100 ? 'done' : ''}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="subtasks-progress-counter">
                {completedSubtasks} of {totalSubtasks} completed ({progressPercent}%)
              </span>
            </div>
          )}

          {/* Subtask items list */}
          <ul className="subtasks-list" role="list">
            {subtasks.map((st, idx) => {
              const isDragOver = dragOverIndex === idx
              const isDragging = draggedIndex === idx
              const isEditingThis = editingSubtaskId === st.id

              return (
                <li
                  key={st.id}
                  className={`subtask-item ${st.completed ? 'completed' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                >
                  {/* Grip / Drag handle */}
                  <button
                    type="button"
                    className="subtask-drag-handle"
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragEnd={handleDragEnd}
                    title="Drag to reorder"
                    aria-label="Drag to reorder subtask"
                  >
                    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">
                      <circle cx="3" cy="2" r="1.2" />
                      <circle cx="7" cy="2" r="1.2" />
                      <circle cx="3" cy="7" r="1.2" />
                      <circle cx="7" cy="7" r="1.2" />
                      <circle cx="3" cy="12" r="1.2" />
                      <circle cx="7" cy="12" r="1.2" />
                    </svg>
                  </button>

                  {/* Subtask Checkbox */}
                  <button
                    type="button"
                    className={`subtask-checkbox ${st.completed ? 'checked' : ''}`}
                    onClick={() => onUpdateSubtask(todo.id, st.id, { completed: !st.completed })}
                    aria-label={st.completed ? 'Mark subtask incomplete' : 'Mark subtask complete'}
                    aria-checked={st.completed}
                    role="checkbox"
                  >
                    {st.completed && (
                      <svg width="9" height="7" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                        <path
                          d="M1 4l3 3 5-6"
                          stroke="var(--on-primary)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Subtask Title (Inline editable on double click) */}
                  {isEditingThis ? (
                    <div className="subtask-edit-wrap">
                      <input
                        ref={editSubtaskInputRef}
                        type="text"
                        className="subtask-inline-input"
                        value={editingSubtaskText}
                        maxLength={200}
                        onChange={(e) => setEditingSubtaskText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditingSubtask(st.id)
                          else if (e.key === 'Escape') setEditingSubtaskId(null)
                        }}
                        onBlur={() => saveEditingSubtask(st.id)}
                        aria-label="Edit subtask title"
                      />
                      {editingSubtaskText.length >= 160 && (
                        <span className="subtask-char-badge">
                          {editingSubtaskText.length}/200
                        </span>
                      )}
                    </div>
                  ) : (
                    <span
                      className="subtask-title"
                      onDoubleClick={() => startEditingSubtask(st)}
                      title="Double-click to edit subtask"
                    >
                      {st.title}
                    </span>
                  )}

                  {/* Reorder and Delete Actions */}
                  <div className="subtask-actions">
                    <button
                      type="button"
                      className="subtask-btn"
                      onClick={() => moveSubtask(idx, -1)}
                      disabled={idx === 0}
                      aria-label="Move subtask up"
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className="subtask-btn"
                      onClick={() => moveSubtask(idx, 1)}
                      disabled={idx === subtasks.length - 1}
                      aria-label="Move subtask down"
                      title="Move down"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      className="subtask-btn delete"
                      onClick={() => onDeleteSubtask(todo.id, st)}
                      aria-label="Delete subtask"
                      title="Delete subtask"
                    >
                      ×
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Inline Add Subtask Input */}
          <div className="subtask-add-container">
            <div className="subtask-add-bar">
              <span className="subtask-add-icon" aria-hidden="true">+</span>
              <input
                ref={addSubtaskInputRef}
                type="text"
                className="subtask-add-input"
                placeholder="Add subtask (press Enter)…"
                value={newSubtaskTitle}
                maxLength={200}
                onChange={(e) => {
                  setNewSubtaskTitle(e.target.value)
                  if (subtaskInputError) setSubtaskInputError('')
                }}
                onKeyDown={handleSubtaskInputKeyDown}
                aria-label="Add a subtask to this task"
              />
              {newSubtaskTitle.length >= 160 && (
                <span className="subtask-char-badge">
                  {newSubtaskTitle.length}/200
                </span>
              )}
              {newSubtaskTitle.trim().length > 0 && (
                <button
                  type="button"
                  className="subtask-inline-add-btn"
                  onClick={handleAddSubtaskSubmit}
                  aria-label="Add subtask"
                >
                  Add
                </button>
              )}
            </div>
            {subtaskInputError && (
              <p className="subtask-error-text" role="alert">
                ⚠ {subtaskInputError}
              </p>
            )}
          </div>

          {/* Auto-complete Recommendation Banner */}
          {showAutoCompletePrompt && !todo.completed && (
            <div className="subtask-autocomplete-alert" role="alert">
              <div className="autocomplete-message">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>All subtasks are finished! Mark task as done?</span>
              </div>
              <div className="autocomplete-buttons">
                <button
                  type="button"
                  className="btn-autocomplete-yes"
                  onClick={() => {
                    setAutoCompleteDismissed(true)
                    onToggle(todo.id, false)
                  }}
                >
                  Mark as done
                </button>
                <button
                  type="button"
                  className="btn-autocomplete-no"
                  onClick={() => setAutoCompleteDismissed(true)}
                >
                  Keep active
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Cascade Completion Dialog ────────────────────────────── */}
      {showParentModal && (
        <div
          className="subtask-modal-backdrop"
          onClick={() => setShowParentModal(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowParentModal(false)
              parentCheckboxRef.current?.focus()
              return
            }
            if (e.key === 'Tab') {
              const btns = [modalFirstBtnRef.current, modalSecBtnRef.current, modalCancelBtnRef.current].filter(Boolean)
              if (btns.length === 0) return
              const first = btns[0]
              const last = btns[btns.length - 1]

              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault()
                last.focus()
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault()
                first.focus()
              }
            }
          }}
        >
          <div
            className="subtask-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`modal-title-${todo.id}`}
          >
            <h3 id={`modal-title-${todo.id}`}>Complete all subtasks?</h3>
            <p>
              This task has{' '}
              <strong>
                {subtasks.filter((s) => !s.completed).length} incomplete subtask
                {subtasks.filter((s) => !s.completed).length === 1 ? '' : 's'}
              </strong>
              . Would you like to mark all subtasks as completed too?
            </p>
            <div className="subtask-modal-actions">
              <button
                ref={modalFirstBtnRef}
                type="button"
                className="btn-modal-primary"
                onClick={() => {
                  setShowParentModal(false)
                  onToggle(todo.id, true)
                }}
              >
                Yes, complete all
              </button>
              <button
                ref={modalSecBtnRef}
                type="button"
                className="btn-modal-secondary"
                onClick={() => {
                  setShowParentModal(false)
                  onToggle(todo.id, false)
                }}
              >
                Only task
              </button>
              <button
                ref={modalCancelBtnRef}
                type="button"
                className="btn-modal-cancel"
                onClick={() => {
                  setShowParentModal(false)
                  parentCheckboxRef.current?.focus()
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  )
}
