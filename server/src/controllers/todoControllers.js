const { prisma } = require('../db')

const MAX_TITLE_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 5000
const MAX_CATEGORY_LENGTH = 40
const MAX_SUBTASKS_PER_TODO = 50

/**
 * Strips HTML tags and script elements from input strings to prevent stored XSS attacks.
 */
function sanitizeText(str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim()
}

/**
 * GET /api/todos
 * Fetch all todos for the authenticated user, with optional filtering and sorting.
 */
const getTodos = async (req, res) => {
  try {
    const { status, priority, category, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query
    const userId = req.user.id

    const where = { userId }

    if (status === 'completed') {
      where.completed = true
    } else if (status === 'active') {
      where.completed = false
    }

    if (priority && priority !== 'all') {
      where.priority = priority
    }

    if (category && category !== 'all') {
      where.category = category
    }

    if (typeof search === 'string' && search.trim().length > 100) {
      return res.status(400).json({ message: 'Search query is too long.' })
    }

    if (typeof search === 'string' && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ]
    }

    let orderBy = []
    if (sortBy === 'dueDate') {
      orderBy = [{ dueDate: sortOrder === 'asc' ? 'asc' : 'desc' }, { createdAt: 'desc' }]
    } else if (sortBy === 'priority') {
      // Return order by createdAt, frontend can sort priorities if desired or default sort
      orderBy = [{ createdAt: sortOrder === 'asc' ? 'asc' : 'desc' }]
    } else {
      orderBy = [{ createdAt: sortOrder === 'asc' ? 'asc' : 'desc' }]
    }

    const todos = await prisma.todo.findMany({
      where,
      orderBy,
      include: {
        subtasks: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return res.status(200).json({ todos })
  } catch (error) {
    console.error('getTodos error:', error)
    return res.status(500).json({ message: 'Failed to fetch tasks.' })
  }
}

/**
 * GET /api/todos/stats
 * Return overall task statistics for the user dashboard.
 */
const getTodoStats = async (req, res) => {
  try {
    const userId = req.user.id

    const total = await prisma.todo.count({ where: { userId } })
    const completed = await prisma.todo.count({ where: { userId, completed: true } })
    const active = total - completed
    const highPriority = await prisma.todo.count({
      where: { userId, completed: false, priority: 'high' },
    })

    const now = new Date()
    const overdue = await prisma.todo.count({
      where: {
        userId,
        completed: false,
        dueDate: { lt: now },
      },
    })

    return res.status(200).json({
      total,
      completed,
      active,
      highPriority,
      overdue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    })
  } catch (error) {
    console.error('getTodoStats error:', error)
    return res.status(500).json({ message: 'Failed to fetch task metrics.' })
  }
}

/**
 * POST /api/todos
 * Create a new task.
 */
const createTodo = async (req, res) => {
  try {
    const { title, description, priority = 'medium', category = 'general', dueDate } = req.body
    const userId = req.user.id

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'Task title is required.' })
    }

    const cleanTitle = sanitizeText(title)
    if (!cleanTitle) {
      return res.status(400).json({ message: 'Task title cannot be empty.' })
    }

    if (cleanTitle.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({ message: `Task title cannot exceed ${MAX_TITLE_LENGTH} characters.` })
    }
    if (description !== undefined && description !== null && typeof description !== 'string') {
      return res.status(400).json({ message: 'Description must be text.' })
    }
    if (typeof description === 'string' && description.trim().length > MAX_DESCRIPTION_LENGTH) {
      return res.status(400).json({ message: `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.` })
    }
    if (typeof category !== 'string' || category.trim().length > MAX_CATEGORY_LENGTH) {
      return res.status(400).json({ message: `Category cannot exceed ${MAX_CATEGORY_LENGTH} characters.` })
    }

    const cleanDescription = description ? sanitizeText(description) : null
    const cleanCategory = category ? sanitizeText(category).slice(0, MAX_CATEGORY_LENGTH) : 'general'
    const parsedDueDate = dueDate ? new Date(dueDate) : null

    // Optional initial subtasks from create form (e.g., from Details panel)
    let initialSubtasks = undefined
    if (Array.isArray(req.body.subtasks) && req.body.subtasks.length > 0) {
      if (req.body.subtasks.length > MAX_SUBTASKS_PER_TODO) {
        return res.status(400).json({ message: `Cannot exceed ${MAX_SUBTASKS_PER_TODO} subtasks per task.` })
      }

      const validSubtasks = req.body.subtasks
        .filter((st) => typeof st?.title === 'string' && st.title.trim().length > 0)
        .map((st, idx) => ({
          title: sanitizeText(st.title).slice(0, 200),
          completed: Boolean(st.completed),
          order: typeof st.order === 'number' && Number.isInteger(st.order) && st.order >= 0 ? st.order : idx,
        }))
        .filter((st) => st.title.length > 0)

      if (validSubtasks.length > 0) {
        initialSubtasks = { create: validSubtasks }
      }
    }

    const todo = await prisma.todo.create({
      data: {
        title: cleanTitle,
        description: cleanDescription,
        priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
        category: cleanCategory || 'general',
        dueDate: parsedDueDate && !isNaN(parsedDueDate.getTime()) ? parsedDueDate : null,
        userId,
        ...(initialSubtasks && { subtasks: initialSubtasks }),
      },
      include: {
        subtasks: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return res.status(201).json({ message: 'Task created successfully.', todo })
  } catch (error) {
    console.error('createTodo error:', error)
    return res.status(500).json({ message: 'Failed to create task.' })
  }
}

/**
 * PUT /api/todos/:id
 * Update an existing task.
 */
const updateTodo = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const { title, description, completed, priority, category, dueDate } = req.body

    const existing = await prisma.todo.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ message: 'Task not found.' })
    }

    const data = {}
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ message: 'Task title cannot be empty.' })
      }
      const cleanTitle = sanitizeText(title)
      if (!cleanTitle) {
        return res.status(400).json({ message: 'Task title cannot be empty.' })
      }
      if (cleanTitle.length > MAX_TITLE_LENGTH) {
        return res.status(400).json({ message: `Task title cannot exceed ${MAX_TITLE_LENGTH} characters.` })
      }
      data.title = cleanTitle
    }
    if (description !== undefined) {
      if (description !== null && typeof description !== 'string') {
        return res.status(400).json({ message: 'Description must be text.' })
      }
      if (typeof description === 'string' && description.trim().length > MAX_DESCRIPTION_LENGTH) {
        return res.status(400).json({ message: `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.` })
      }
      data.description = description ? sanitizeText(description) : null
    }
    if (completed !== undefined) {
      if (typeof completed !== 'boolean') {
        return res.status(400).json({ message: 'Completed must be a boolean.' })
      }
      data.completed = completed
    }
    if (priority !== undefined && ['low', 'medium', 'high'].includes(priority)) {
      data.priority = priority
    }
    if (category !== undefined) {
      if (typeof category !== 'string' || category.trim().length > MAX_CATEGORY_LENGTH) {
        return res.status(400).json({ message: `Category cannot exceed ${MAX_CATEGORY_LENGTH} characters.` })
      }
      data.category = sanitizeText(category).slice(0, MAX_CATEGORY_LENGTH) || 'general'
    }
    if (dueDate !== undefined) {
      const parsed = dueDate ? new Date(dueDate) : null
      data.dueDate = parsed && !isNaN(parsed.getTime()) ? parsed : null
    }

    const updated = await prisma.todo.update({
      where: { id },
      data,
      include: {
        subtasks: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return res.status(200).json({ message: 'Task updated successfully.', todo: updated })
  } catch (error) {
    console.error('updateTodo error:', error)
    return res.status(500).json({ message: 'Failed to update task.' })
  }
}

/**
 * PATCH /api/todos/:id/toggle
 * Toggle completion status of a task.
 * Supports completeSubtasks: true to also mark all child subtasks complete when parent is completed.
 */
const toggleTodo = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const completeSubtasks = req.body?.completeSubtasks === true || req.query?.completeSubtasks === 'true'

    const existing = await prisma.todo.findUnique({
      where: { id },
      include: { subtasks: true },
    })

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ message: 'Task not found.' })
    }

    const nextCompleted = !existing.completed

    const updated = await prisma.$transaction(async (tx) => {
      if (nextCompleted && completeSubtasks) {
        await tx.subtask.updateMany({
          where: { todoId: id },
          data: { completed: true },
        })
      }

      return tx.todo.update({
        where: { id },
        data: {
          completed: nextCompleted,
        },
        include: {
          subtasks: {
            orderBy: { order: 'asc' },
          },
        },
      })
    })

    return res.status(200).json({ message: 'Task status updated.', todo: updated })
  } catch (error) {
    console.error('toggleTodo error:', error)
    return res.status(500).json({ message: 'Failed to toggle task status.' })
  }
}

/**
 * DELETE /api/todos/:id
 * Delete a single task.
 */
const deleteTodo = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const existing = await prisma.todo.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ message: 'Task not found.' })
    }

    await prisma.todo.delete({
      where: { id },
    })

    return res.status(200).json({ message: 'Task deleted successfully.' })
  } catch (error) {
    console.error('deleteTodo error:', error)
    return res.status(500).json({ message: 'Failed to delete task.' })
  }
}

/**
 * DELETE /api/todos/completed
 * Clear all completed tasks for this user.
 */
const clearCompleted = async (req, res) => {
  try {
    const userId = req.user.id

    const result = await prisma.todo.deleteMany({
      where: {
        userId,
        completed: true,
      },
    })

    return res.status(200).json({
      message: `Cleared ${result.count} completed tasks.`,
      count: result.count,
    })
  } catch (error) {
    console.error('clearCompleted error:', error)
    return res.status(500).json({ message: 'Failed to clear completed tasks.' })
  }
}

/**
 * POST /api/todos/:id/subtasks
 * Create a subtask for a specific todo.
 */
const createSubtask = async (req, res) => {
  try {
    const { id: todoId } = req.params
    const { title } = req.body
    const userId = req.user.id

    const todo = await prisma.todo.findUnique({
      where: { id: todoId },
    })

    if (!todo || todo.userId !== userId) {
      return res.status(404).json({ message: 'Task not found.' })
    }

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'Subtask title cannot be empty.' })
    }

    const cleanTitle = sanitizeText(title)
    if (!cleanTitle) {
      return res.status(400).json({ message: 'Subtask title cannot be empty.' })
    }

    if (cleanTitle.length > 200) {
      return res.status(400).json({ message: 'Subtask title cannot exceed 200 characters.' })
    }

    const currentCount = await prisma.subtask.count({
      where: { todoId },
    })

    if (currentCount >= MAX_SUBTASKS_PER_TODO) {
      return res.status(400).json({ message: `Cannot exceed ${MAX_SUBTASKS_PER_TODO} subtasks per task.` })
    }

    const subtask = await prisma.subtask.create({
      data: {
        todoId,
        title: cleanTitle,
        completed: false,
        order: currentCount,
      },
    })

    return res.status(201).json({ message: 'Subtask created.', subtask })
  } catch (error) {
    console.error('createSubtask error:', error)
    return res.status(500).json({ message: 'Failed to create subtask.' })
  }
}

/**
 * PATCH /api/todos/:id/subtasks/:subtaskId
 * Update a subtask (title, completed, or order).
 */
const updateSubtask = async (req, res) => {
  try {
    const { id: todoId, subtaskId } = req.params
    const { title, completed, order } = req.body
    const userId = req.user.id

    const todo = await prisma.todo.findUnique({
      where: { id: todoId },
    })

    if (!todo || todo.userId !== userId) {
      return res.status(404).json({ message: 'Task not found.' })
    }

    const existingSubtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
    })

    if (!existingSubtask || existingSubtask.todoId !== todoId) {
      return res.status(404).json({ message: 'Subtask not found.' })
    }

    const data = {}
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ message: 'Subtask title cannot be empty.' })
      }
      const cleanTitle = sanitizeText(title)
      if (!cleanTitle) {
        return res.status(400).json({ message: 'Subtask title cannot be empty.' })
      }
      if (cleanTitle.length > 200) {
        return res.status(400).json({ message: 'Subtask title cannot exceed 200 characters.' })
      }
      data.title = cleanTitle
    }

    if (completed !== undefined) {
      if (typeof completed !== 'boolean') {
        return res.status(400).json({ message: 'Completed must be a boolean.' })
      }
      data.completed = completed
    }

    if (order !== undefined) {
      if (typeof order !== 'number' || isNaN(order) || !Number.isInteger(order) || order < 0) {
        return res.status(400).json({ message: 'Order must be a non-negative integer.' })
      }
      data.order = order
    }

    const updated = await prisma.subtask.update({
      where: { id: subtaskId },
      data,
    })

    return res.status(200).json({ message: 'Subtask updated.', subtask: updated })
  } catch (error) {
    console.error('updateSubtask error:', error)
    return res.status(500).json({ message: 'Failed to update subtask.' })
  }
}

/**
 * DELETE /api/todos/:id/subtasks/:subtaskId
 * Delete a single subtask.
 */
const deleteSubtask = async (req, res) => {
  try {
    const { id: todoId, subtaskId } = req.params
    const userId = req.user.id

    const todo = await prisma.todo.findUnique({
      where: { id: todoId },
    })

    if (!todo || todo.userId !== userId) {
      return res.status(404).json({ message: 'Task not found.' })
    }

    const existingSubtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
    })

    if (!existingSubtask || existingSubtask.todoId !== todoId) {
      return res.status(404).json({ message: 'Subtask not found.' })
    }

    await prisma.subtask.delete({
      where: { id: subtaskId },
    })

    return res.status(200).json({ message: 'Subtask deleted successfully.', subtaskId })
  } catch (error) {
    console.error('deleteSubtask error:', error)
    return res.status(500).json({ message: 'Failed to delete subtask.' })
  }
}

/**
 * PUT /api/todos/:id/subtasks/reorder
 * Reorder subtasks array by updating their order indexes.
 */
const reorderSubtasks = async (req, res) => {
  try {
    const { id: todoId } = req.params
    const { subtaskIds } = req.body
    const userId = req.user.id

    if (!Array.isArray(subtaskIds)) {
      return res.status(400).json({ message: 'subtaskIds must be an array of IDs.' })
    }

    if (subtaskIds.length > MAX_SUBTASKS_PER_TODO) {
      return res.status(400).json({ message: `Cannot exceed ${MAX_SUBTASKS_PER_TODO} subtasks per task.` })
    }

    const todo = await prisma.todo.findUnique({
      where: { id: todoId },
      include: { subtasks: true },
    })

    if (!todo || todo.userId !== userId) {
      return res.status(404).json({ message: 'Task not found.' })
    }

    const validIdSet = new Set(todo.subtasks.map((s) => s.id))
    for (const sid of subtaskIds) {
      if (typeof sid !== 'string' || !validIdSet.has(sid)) {
        return res.status(400).json({ message: `Invalid subtask ID: ${sid}` })
      }
    }

    await prisma.$transaction(
      subtaskIds.map((sid, index) =>
        prisma.subtask.update({
          where: { id: sid },
          data: { order: index },
        })
      )
    )

    const reordered = await prisma.subtask.findMany({
      where: { todoId },
      orderBy: { order: 'asc' },
    })

    return res.status(200).json({ message: 'Subtasks reordered successfully.', subtasks: reordered })
  } catch (error) {
    console.error('reorderSubtasks error:', error)
    return res.status(500).json({ message: 'Failed to reorder subtasks.' })
  }
}

module.exports = {
  getTodos,
  getTodoStats,
  createTodo,
  updateTodo,
  toggleTodo,
  deleteTodo,
  clearCompleted,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  reorderSubtasks,
}
