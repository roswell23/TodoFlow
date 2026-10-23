const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { prisma } = require('../db')
const verificationService = require('../services/verificationService')

const isValidEmail = (email) =>
  typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

const generateToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  })
}

// POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' || !name.trim() || !email.trim() || !password) {
      return res.status(400).json({ message: 'All fields (name, email, password) are required.' })
    }

    if (name.trim().length > 100 || email.trim().length > 254) {
      return res.status(400).json({ message: 'Name or email is too long.' })
    }

    if (!isValidEmail(email.trim())) {
      return res.status(400).json({ message: 'Please provide a valid email address.' })
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ message: 'Password must be between 8 and 128 characters long.' })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return res.status(400).json({ message: 'Email is already in use.' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Security: Normal users must NOT be able to register themselves as ADMIN
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: 'USER',
        isActive: true,
        isEmailVerified: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
      },
    })

    // Automatically send 6-digit email verification code via Brevo
    verificationService
      .requestVerificationCode({
        email: normalizedEmail,
        purpose: 'EMAIL_VERIFICATION',
      })
      .catch((err) => {
        console.error('Failed to dispatch signup verification email:', err.message || err)
      })

    const token = generateToken(user)

    return res.status(201).json({
      message: 'Account created successfully. A verification code has been sent to your email.',
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

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ message: 'Email and password are required.' })
    }

    if (email.trim().length > 254 || !isValidEmail(email.trim())) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been disabled. Please contact an administrator.' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const token = generateToken(user)

    return res.status(200).json({
      message: 'Login successful.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      },
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ message: 'Failed to log in. Please try again.' })
  }
}

// POST /api/auth/request-code (and /send-code)
const requestCode = async (req, res) => {
  try {
    const { email, purpose, type } = req.body
    const targetPurpose = purpose || type || 'EMAIL_VERIFICATION'

    if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
      return res.status(400).json({ message: 'A valid email address is required.' })
    }

    if (!['EMAIL_VERIFICATION', 'PASSWORD_RESET'].includes(targetPurpose)) {
      return res.status(400).json({ message: 'Invalid verification purpose.' })
    }

    await verificationService.requestVerificationCode({
      email: email.trim(),
      purpose: targetPurpose,
      isResend: false,
    })

    // Strict Anti-Enumeration: Always return the identical 200 message regardless of whether email exists
    return res.status(200).json({
      message: 'If an account exists with this email, a verification code has been sent.',
    })
  } catch (error) {
    console.error('Request code error:', error.message || error)
    return res.status(500).json({ message: 'Unable to process verification request at this time.' })
  }
}

// POST /api/auth/resend-code
const resendCode = async (req, res) => {
  try {
    const { email, purpose, type } = req.body
    const targetPurpose = purpose || type || 'EMAIL_VERIFICATION'

    if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
      return res.status(400).json({ message: 'A valid email address is required.' })
    }

    if (!['EMAIL_VERIFICATION', 'PASSWORD_RESET'].includes(targetPurpose)) {
      return res.status(400).json({ message: 'Invalid verification purpose.' })
    }

    const result = await verificationService.requestVerificationCode({
      email: email.trim(),
      purpose: targetPurpose,
      isResend: true,
    })

    if (result.cooldownActive) {
      return res.status(429).json({
        message: result.message,
        waitSeconds: result.cooldownWait,
      })
    }

    // Strict Anti-Enumeration: generic response
    return res.status(200).json({
      message: 'If an account exists with this email, a verification code has been sent.',
    })
  } catch (error) {
    console.error('Resend code error:', error.message || error)
    return res.status(500).json({ message: 'Unable to process resend request at this time.' })
  }
}

// POST /api/auth/verify-code
const verifyCode = async (req, res) => {
  try {
    const { email, code, purpose, type } = req.body
    const targetPurpose = purpose || type || 'EMAIL_VERIFICATION'

    if (!email || !code || typeof email !== 'string' || typeof code !== 'string') {
      return res.status(400).json({ message: 'Email and 6-digit code are required.' })
    }

    const cleanCode = code.trim()
    if (!/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({ message: 'Verification code must be exactly 6 digits.' })
    }

    const result = await verificationService.verifyCode({
      email: email.trim(),
      code: cleanCode,
      purpose: targetPurpose,
    })

    if (!result.success) {
      return res.status(400).json({ message: result.message || 'Invalid or expired verification code.' })
    }

    return res.status(200).json({
      message: 'Verification code successfully verified.',
      verified: true,
      user: result.user,
    })
  } catch (error) {
    console.error('Verify code error:', error.message || error)
    return res.status(500).json({ message: 'Failed to verify code. Please try again.' })
  }
}

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body

    if (!email || !code || !newPassword || typeof email !== 'string' || typeof code !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ message: 'Email, code, and new password are required.' })
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ message: 'Password must be between 8 and 128 characters long.' })
    }

    // Verify 6-digit code for PASSWORD_RESET purpose
    const verificationResult = await verificationService.verifyCode({
      email: email.trim(),
      code: code.trim(),
      purpose: 'PASSWORD_RESET',
    })

    if (!verificationResult.success || !verificationResult.user) {
      return res.status(400).json({ message: verificationResult.message || 'Invalid or expired verification code.' })
    }

    // Hash new password and update user record
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: verificationResult.user.id },
      data: {
        password: hashedPassword,
        isEmailVerified: true,
      },
    })

    return res.status(200).json({
      message: 'Password has been reset successfully. You can now log in with your new password.',
    })
  } catch (error) {
    console.error('Reset password error:', error.message || error)
    return res.status(500).json({ message: 'Failed to reset password. Please try again.' })
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
  requestCode,
  resendCode,
  verifyCode,
  resetPassword,
}
