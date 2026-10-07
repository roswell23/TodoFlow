const express = require('express')
const router = express.Router()
const { signup, login, me, logout } = require('../controllers/authControllers')
const { authenticateToken } = require('../middleware/authMiddleware')

// Graceful logout authentication: if token is present and valid, attaches user;
// if token is expired, malformed, or missing, still allows logout (200) so user is never trapped
const allowLogoutWithAnyToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (token && token !== 'null' && token !== 'undefined') {
    try {
      const jwt = require('jsonwebtoken')
      req.user = jwt.verify(token, process.env.JWT_SECRET)
    } catch {
      // Token is expired or invalid - ignore and allow logout to succeed
    }
  }
  next()
}

router.post('/signup', signup)
router.post('/login', login)
router.get('/me', authenticateToken, me)
router.post('/logout', allowLogoutWithAnyToken, logout)

module.exports = router
