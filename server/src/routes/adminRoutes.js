const express = require('express')
const router = express.Router()
const {
  getAdminStats,
  getAdminUsers,
  getAdminUserById,
  toggleUserStatus,
  deleteUser,
  getAdminTodos,
  deleteAdminTodo,
} = require('../controllers/adminControllers')
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware')

// Enforce both authentication and administrator role on all admin routes
router.use(authenticateToken)
router.use(requireAdmin)

// Stats
router.get('/stats', getAdminStats)

// Users
router.get('/users', getAdminUsers)
router.get('/users/:id', getAdminUserById)
router.patch('/users/:id/status', toggleUserStatus)
router.delete('/users/:id', deleteUser)

// Todos
router.get('/todos', getAdminTodos)
router.delete('/todos/:id', deleteAdminTodo)

module.exports = router
