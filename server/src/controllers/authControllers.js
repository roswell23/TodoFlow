const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { prisma } = require('../db')

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  })
}

// POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields (name, email, password) are required.' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return res.status(400).json({ message: 'Email is already in use.' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    const token = generateToken(user.id)

    return res.status(201).json({
      message: 'Account created successfully.',
      user,
      token,
    })
  } catch (error) {
    console.error('Signup error:', error)
    return res.status(500).json({ message: 'Failed to create account. Please try again.' })
  }
}

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const token = generateToken(user.id)

    return res.status(200).json({
      message: 'Login successful.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ message: 'Failed to log in. Please try again.' })
  }
}

// GET /api/auth/me
const me = async (req, res) => {
  try {
    return res.status(200).json({ user: req.user })
  } catch (error) {
    console.error('Me error:', error)
    return res.status(500).json({ message: 'Failed to get current user.' })
  }
}

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    return res.status(200).json({ message: 'Logged out successfully.' })
  } catch (error) {
    console.error('Logout error:', error)
    return res.status(500).json({ message: 'Failed to log out.' })
  }
}

module.exports = {
  signup,
  login,
  me,
  logout,
}
