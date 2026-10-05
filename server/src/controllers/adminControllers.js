const { prisma } = require('../db')

/**
 * GET /api/admin/stats
 * Aggregate platform statistics for admin dashboard overview.
 */
const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count()
    const totalAdmins = await prisma.user.count({ where: { role: 'ADMIN' } })
    const activeUsers = await prisma.user.count({ where: { isActive: true } })

    const totalTodos = await prisma.todo.count()
    const completedTodos = await prisma.todo.count({ where: { completed: true } })
    const pendingTodos = totalTodos - completedTodos

    const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0

    return res.status(200).json({
      totalUsers,
      totalAdmins,
      activeUsers,
      totalTodos,
      completedTodos,
      pendingTodos,
      completionRate,
    })
  } catch (error) {
    console.error('getAdminStats error:', error)
    return res.status(500).json({ message: 'Failed to retrieve admin statistics.' })
  }
}

/**
 * GET /api/admin/users
 * Retrieve list of users with search, role filter, status filter, and todo counts.
 * Strictly excludes password fields.
 */
const getAdminUsers = async (req, res) => {
  try {
    const { search, role, status } = req.query

    const where = {}

    if (role && role !== 'all') {
      if (['USER', 'ADMIN'].includes(role.toUpperCase())) {
        where.role = role.toUpperCase()
      }
    }

    if (status === 'active') {
      where.isActive = true
    } else if (status === 'inactive') {
      where.isActive = false
    }

    if (typeof search === 'string' && search.trim()) {
      const term = search.trim()
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ]
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { todos: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return res.status(200).json({ users })
  } catch (error) {
    console.error('getAdminUsers error:', error)
    return res.status(500).json({ message: 'Failed to fetch users.' })
  }
}

/**
 * GET /api/admin/users/:id
 * Retrieve single user detail and their todos.
 */
const getAdminUserById = async (req, res) => {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        todos: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { todos: true },
        },
      },
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    return res.status(200).json({ user })
  } catch (error) {
    console.error('getAdminUserById error:', error)
    return res.status(500).json({ message: 'Failed to fetch user details.' })
  }
}

/**
 * PATCH /api/admin/users/:id/status
 * Activate or deactivate a user account.
 */
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { isActive } = req.body

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'Field "isActive" must be a boolean.' })
    }

    // Safety guard: Admin cannot deactivate their own account
    if (req.user.id === id) {
      return res.status(400).json({ message: 'You cannot deactivate your own administrator account.' })
    }

    const targetUser = await prisma.user.findUnique({ where: { id } })
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    })

    return res.status(200).json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully.`,
      user: updated,
    })
  } catch (error) {
    console.error('toggleUserStatus error:', error)
    return res.status(500).json({ message: 'Failed to update user status.' })
  }
}

/**
 * DELETE /api/admin/users/:id
 * Delete a user and cascade their todos.
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params

    // Safety guard: Admin cannot delete their own account
    if (req.user.id === id) {
      return res.status(400).json({ message: 'You cannot delete your own administrator account.' })
    }

    const targetUser = await prisma.user.findUnique({ where: { id } })
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' })
    }

    await prisma.user.delete({ where: { id } })

    return res.status(200).json({ message: 'User and associated data deleted successfully.' })
  } catch (error) {
    console.error('deleteUser error:', error)
    return res.status(500).json({ message: 'Failed to delete user.' })
  }
}

/**
 * GET /api/admin/todos
 * Fetch all todos across the system with author information, filtering, and sorting.
 */
const getAdminTodos = async (req, res) => {
  try {
    const { status, priority, search, userId } = req.query

    const where = {}

    if (userId) {
      where.userId = userId
    }

    if (status === 'completed') {
      where.completed = true
    } else if (status === 'active') {
      where.completed = false
    }

    if (priority && priority !== 'all') {
      where.priority = priority
    }

    if (typeof search === 'string' && search.trim()) {
      const term = search.trim()
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { user: { name: { contains: term, mode: 'insensitive' } } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
      ]
    }

    const todos = await prisma.todo.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return res.status(200).json({ todos })
  } catch (error) {
    console.error('getAdminTodos error:', error)
    return res.status(500).json({ message: 'Failed to fetch platform tasks.' })
  }
}

/**
 * DELETE /api/admin/todos/:id
 * Delete any inappropriate or test task by ID.
 */
const deleteAdminTodo = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await prisma.todo.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ message: 'Task not found.' })
    }

    await prisma.todo.delete({ where: { id } })

    return res.status(200).json({ message: 'Task deleted successfully by administrator.' })
  } catch (error) {
    console.error('deleteAdminTodo error:', error)
    return res.status(500).json({ message: 'Failed to delete task.' })
  }
}

module.exports = {
  getAdminStats,
  getAdminUsers,
  getAdminUserById,
  toggleUserStatus,
  deleteUser,
  getAdminTodos,
  deleteAdminTodo,
}
