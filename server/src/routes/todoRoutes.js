const express = require('express')
const router = express.Router()
const {
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
} = require('../controllers/todoControllers')
const { authenticateToken } = require('../middleware/authMiddleware')

// All todo routes require authentication
router.use(authenticateToken)

router.get('/stats', getTodoStats)
router.get('/', getTodos)
router.post('/', createTodo)
router.delete('/completed', clearCompleted)
router.put('/:id', updateTodo)
router.patch('/:id/toggle', toggleTodo)
router.delete('/:id', deleteTodo)

const rateLimit = require('express-rate-limit')

// Rate limiter for subtask mutating endpoints (60 requests per minute)
const subtaskMutationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many subtask operations. Please slow down.' },
})

// Subtasks routes
router.post('/:id/subtasks', subtaskMutationLimiter, createSubtask)
router.put('/:id/subtasks/reorder', subtaskMutationLimiter, reorderSubtasks)
router.patch('/:id/subtasks/:subtaskId', subtaskMutationLimiter, updateSubtask)
router.delete('/:id/subtasks/:subtaskId', subtaskMutationLimiter, deleteSubtask)

module.exports = router
