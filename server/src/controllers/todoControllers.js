const { prisma } = require('../db')

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

    if (search && search.trim()) {
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

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Task title is required.' })
    }

    const parsedDueDate = dueDate ? new Date(dueDate) : null

    const todo = await prisma.todo.create({
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
        priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
        category: category?.trim() || 'general',
        dueDate: parsedDueDate && !isNaN(parsedDueDate.getTime()) ? parsedDueDate : null,
        userId,
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
      if (!title.trim()) {
        return res.status(400).json({ message: 'Task title cannot be empty.' })
      }
      data.title = title.trim()
    }
    if (description !== undefined) {
      data.description = description ? description.trim() : null
    }
    if (completed !== undefined) {
      data.completed = Boolean(completed)
    }
    if (priority !== undefined && ['low', 'medium', 'high'].includes(priority)) {
      data.priority = priority
    }
    if (category !== undefined) {
      data.category = category.trim() || 'general'
    }
    if (dueDate !== undefined) {
      const parsed = dueDate ? new Date(dueDate) : null
      data.dueDate = parsed && !isNaN(parsed.getTime()) ? parsed : null
    }

    const updated = await prisma.todo.update({
      where: { id },
      data,
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
 */
const toggleTodo = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const existing = await prisma.todo.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ message: 'Task not found.' })
    }

    const updated = await prisma.todo.update({
      where: { id },
      data: {
        completed: !existing.completed,
      },
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

module.exports = {
  getTodos,
  getTodoStats,
  createTodo,
  updateTodo,
  toggleTodo,
  deleteTodo,
  clearCompleted,
}
