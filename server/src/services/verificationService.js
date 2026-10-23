const crypto = require('crypto')
const { prisma } = require('../db')
const emailService = require('./emailService')

const COOLDOWN_SECONDS = 60
const CODE_EXPIRY_MINUTES = 10

/**
 * Generate a cryptographically secure 6-digit numeric string.
 * Ranges from 100000 to 999999 inclusive.
 */
function generateSixDigitCode() {
  return crypto.randomInt(100000, 1000000).toString()
}

/**
 * Hashes a verification code using SHA-256 for secure storage.
 */
function hashCode(code) {
  return crypto.createHash('sha256').update(String(code).trim()).digest('hex')
}

/**
 * Constant-time comparison between two hash strings to prevent timing attacks.
 */
function secureCompareHash(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const bufA = Buffer.from(a, 'hex')
  const bufB = Buffer.from(b, 'hex')
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

const verificationService = {
  COOLDOWN_SECONDS,
  CODE_EXPIRY_MINUTES,

  /**
   * Request / create and send a 6-digit verification code.
   *
   * Rate limiting / cooldown:
   * Rejects with cooldown details if requested within COOLDOWN_SECONDS of the last send.
   *
   * Security & Anti-Enumeration:
   * If user with `email` does not exist, does nothing and returns success = true,
   * guaranteeing no account existence leakage.
   *
   * @param {Object} options
   * @param {string} options.email
   * @param {'EMAIL_VERIFICATION' | 'PASSWORD_RESET'} options.purpose
   * @param {boolean} [options.isResend=false]
   * @returns {Promise<{success: boolean, cooldownWait?: number}>}
   */
  async requestVerificationCode({ email, purpose = 'EMAIL_VERIFICATION', isResend = false }) {
    if (!email || typeof email !== 'string') {
      return { success: true }
    }

    const normalizedEmail = email.toLowerCase().trim()

    // 1. Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    // Anti-enumeration: Return generic success if user does not exist
    if (!user) {
      return { success: true }
    }

    // 2. Check for recent code cooldown for this user and purpose
    const recentCode = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        purpose,
        used: false,
      },
      orderBy: { createdAt: 'desc' },
    })

    const now = Date.now()
    if (recentCode) {
      const elapsedSeconds = Math.floor((now - new Date(recentCode.lastSentAt).getTime()) / 1000)
      if (elapsedSeconds < COOLDOWN_SECONDS) {
        const remaining = COOLDOWN_SECONDS - elapsedSeconds
        return {
          success: false,
          cooldownActive: true,
          cooldownWait: remaining,
          message: `Please wait ${remaining} seconds before requesting another code.`,
        }
      }
    }

    // 3. Invalidate / delete old codes for this user and purpose
    await prisma.verificationCode.deleteMany({
      where: {
        userId: user.id,
        purpose,
      },
    })

    // 4. Generate new secure 6-digit code and expiration (10 minutes)
    const code = generateSixDigitCode()
    const codeHash = hashCode(code)
    const expiresAt = new Date(now + CODE_EXPIRY_MINUTES * 60 * 1000)

    // 5. Save code record to database
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        email: normalizedEmail,
        purpose,
        codeHash,
        expiresAt,
        lastSentAt: new Date(now),
        sendCount: recentCode ? recentCode.sendCount + 1 : 1,
        used: false,
      },
    })

    // 6. Send transactional email via Brevo
    await emailService.sendVerificationCodeEmail({
      email: normalizedEmail,
      code,
      purpose,
      name: user.name,
    })

    return { success: true }
  },

  /**
   * Verifies a submitted 6-digit code against the stored hash.
   *
   * @param {Object} options
   * @param {string} options.email
   * @param {string} options.code
   * @param {'EMAIL_VERIFICATION' | 'PASSWORD_RESET'} options.purpose
   * @returns {Promise<{success: boolean, user?: Object, message?: string}>}
   */
  async verifyCode({ email, code, purpose = 'EMAIL_VERIFICATION' }) {
    if (!email || !code || typeof email !== 'string' || typeof code !== 'string') {
      return { success: false, message: 'Invalid verification details provided.' }
    }

    const cleanCode = code.trim()
    if (!/^\d{6}$/.test(cleanCode)) {
      return { success: false, message: 'Verification code must be 6 digits.' }
    }

    const normalizedEmail = email.toLowerCase().trim()

    // 1. Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      // Generic error prevents enumeration
      return { success: false, message: 'Invalid or expired verification code.' }
    }

    // 2. Find active, unexpired verification code
    const activeCode = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        purpose,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!activeCode) {
      return { success: false, message: 'Invalid or expired verification code.' }
    }

    // 3. Constant-time secure comparison
    const submittedHash = hashCode(cleanCode)
    const isMatch = secureCompareHash(submittedHash, activeCode.codeHash)

    if (!isMatch) {
      return { success: false, message: 'Invalid or expired verification code.' }
    }

    // 4. Invalidate code immediately upon successful verification to prevent replay
    await prisma.verificationCode.deleteMany({
      where: {
        userId: user.id,
        purpose,
      },
    })

    // 5. If verifying email, update user.isEmailVerified to true
    if (purpose === 'EMAIL_VERIFICATION') {
      await prisma.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true },
      })
    }

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: true,
      },
    }
  },
}

module.exports = verificationService
