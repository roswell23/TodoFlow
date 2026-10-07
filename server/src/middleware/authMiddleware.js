const jwt = require('jsonwebtoken')
const { prisma } = require('../db')

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ message: 'Authentication required. No token provided.' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return res.status(401).json({ message: 'User not found or session invalid.' })
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account has been deactivated. Please contact an administrator.' })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' })
    }
    return res.status(401).json({ message: 'Invalid or expired token.' })
  }
}

/**
 * Reusable middleware to verify that the authenticated user has role === 'ADMIN'.
 * Responds with HTTP 403 Forbidden if user lacks admin privileges.
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' })
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden. Admin privileges required.' })
  }

  next()
}

module.exports = {
  authenticateToken,
  requireAdmin,
}
