const express = require('express')
const router = express.Router()
const { signup, login, me, logout } = require('../controllers/authControllers')
const { authenticateToken } = require('../middleware/authMiddleware')

router.post('/signup', signup)
router.post('/login', login)
router.get('/me', authenticateToken, me)
router.post('/logout', authenticateToken, logout)

module.exports = router
