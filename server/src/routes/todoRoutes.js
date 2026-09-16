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

module.exports = router
