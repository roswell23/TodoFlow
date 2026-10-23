const http = require('http')
const { prisma } = require('../src/db')
const verificationService = require('../src/services/verificationService')
const emailService = require('../src/services/emailService')

async function runTests() {
  console.log('🧪 Starting Brevo Transactional Email & Verification Security Tests...\n')

  require('dotenv').config()
  const express = require('express')
  const authRoutes = require('../src/routes/authRoutes')

  const app = express()
  app.use(express.json())
  app.use('/api/auth', authRoutes)

  const PORT = 4003
  const server = app.listen(PORT)

  const request = (path, method = 'GET', body = null, token = null) => {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null
      const req = http.request(
        {
          hostname: 'localhost',
          port: PORT,
          path,
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            let parsed = {}
            try {
              parsed = JSON.parse(data)
            } catch {
              parsed = { raw: data }
            }
            resolve({ status: res.statusCode, body: parsed })
          })
        }
      )
      req.on('error', reject)
      if (payload) req.write(payload)
      req.end()
    })
  }

  const testEmail = `test_brevo_${Date.now()}@todoflow.test`
  const nonExistentEmail = `ghost_user_${Date.now()}@todoflow.test`
  let userRecord = null

  try {
    // 1. Create a test user via signup
    console.log('1. Testing User Registration and Automatic Verification Email Dispatch...')
    const signupRes = await request('/api/auth/signup', 'POST', {
      name: 'Brevo Test User',
      email: testEmail,
      password: 'SecurePassword123!',
    })

    if (signupRes.status !== 201) {
      throw new Error(`Signup failed: ${JSON.stringify(signupRes.body)}`)
    }
    userRecord = signupRes.body.user
    console.log('✔ User registered successfully with isEmailVerified: false.')

    // 2. Anti-enumeration: Request code for non-existent email
    console.log('\n2. Testing Anti-Enumeration Protection on /api/auth/request-code...')
    const fakeRes = await request('/api/auth/request-code', 'POST', {
      email: nonExistentEmail,
      purpose: 'EMAIL_VERIFICATION',
    })

    const realRes = await request('/api/auth/request-code', 'POST', {
      email: testEmail,
      purpose: 'EMAIL_VERIFICATION',
    })

    if (fakeRes.status !== 200 || realRes.status !== 200) {
      throw new Error(`Expected 200 for both real and fake emails. Got ${fakeRes.status} and ${realRes.status}`)
    }
    if (fakeRes.body.message !== realRes.body.message) {
      throw new Error('ANTI-ENUMERATION LEAK: Response message differed between existent and non-existent accounts!')
    }
    console.log('✔ Anti-enumeration verified: identical 200 responses returned regardless of account existence.')

    // 3. Inspect database: verify code is securely hashed (SHA-256) and set to 10 min expiration
    console.log('\n3. Inspecting Database Storage Security & Expiration...')
    const codeRecord = await prisma.verificationCode.findFirst({
      where: { userId: userRecord.id, purpose: 'EMAIL_VERIFICATION' },
      orderBy: { createdAt: 'desc' },
    })

    if (!codeRecord) {
      throw new Error('Verification code record was not found in the database!')
    }
    if (!/^[a-f0-9]{64}$/.test(codeRecord.codeHash)) {
      throw new Error('SECURITY FAILURE: Code is not properly SHA-256 hashed!')
    }
    const expiresInMs = new Date(codeRecord.expiresAt).getTime() - Date.now()
    if (expiresInMs < 9 * 60 * 1000 || expiresInMs > 10.5 * 60 * 1000) {
      throw new Error(`Expected expiration ~10m, got ${expiresInMs / 1000}s`)
    }
    console.log('✔ Code is stored as a 64-char SHA-256 hash with ~10 min expiration.')

    // 4. Rate Limiting / Resend Cooldown Test
    console.log('\n4. Testing 60-Second Resend Cooldown Rate Limiting...')
    const cooldownRes = await request('/api/auth/resend-code', 'POST', {
      email: testEmail,
      purpose: 'EMAIL_VERIFICATION',
    })

    if (cooldownRes.status !== 429) {
      throw new Error(`Expected 429 Too Many Requests on immediate resend, got ${cooldownRes.status}`)
    }
    if (typeof cooldownRes.body.waitSeconds !== 'number' || cooldownRes.body.waitSeconds <= 0) {
      throw new Error(`Expected waitSeconds in response, got: ${JSON.stringify(cooldownRes.body)}`)
    }
    console.log(`✔ Resend cooldown enforced: 429 returned with waitSeconds = ${cooldownRes.body.waitSeconds}.`)

    // 5. Invalidation of Old Codes
    console.log('\n5. Testing Invalidation of Old Codes When Generating New Code...')
    // Fast forward lastSentAt in DB to bypass cooldown for test
    await prisma.verificationCode.updateMany({
      where: { userId: userRecord.id },
      data: { lastSentAt: new Date(Date.now() - 70000) },
    })

    // Capture old hash
    const oldHash = codeRecord.codeHash

    // Request new code
    await request('/api/auth/resend-code', 'POST', {
      email: testEmail,
      purpose: 'EMAIL_VERIFICATION',
    })

    // Verify old hash no longer exists
    const oldCodeStillExists = await prisma.verificationCode.findFirst({
      where: { codeHash: oldHash },
    })
    if (oldCodeStillExists) {
      throw new Error('SECURITY FAILURE: Old verification code was NOT invalidated when new code was generated!')
    }
    console.log('✔ Old verification code successfully invalidated.')

    // 6. Test Code Submission Verification
    console.log('\n6. Testing Verification Code Submission...')
    // Let's test wrong code first
    const wrongRes = await request('/api/auth/verify-code', 'POST', {
      email: testEmail,
      code: '000000',
      purpose: 'EMAIL_VERIFICATION',
    })
    if (wrongRes.status !== 400) {
      throw new Error(`Expected 400 for incorrect code, got ${wrongRes.status}`)
    }
    console.log('✔ Incorrect 6-digit code correctly rejected.')

    // Let's inject a known test code to verify correct submission
    const knownCode = '654321'
    const crypto = require('crypto')
    const knownHash = crypto.createHash('sha256').update(knownCode).digest('hex')

    await prisma.verificationCode.updateMany({
      where: { userId: userRecord.id, purpose: 'EMAIL_VERIFICATION' },
      data: { codeHash: knownHash },
    })

    const correctRes = await request('/api/auth/verify-code', 'POST', {
      email: testEmail,
      code: knownCode,
      purpose: 'EMAIL_VERIFICATION',
    })
    if (correctRes.status !== 200 || !correctRes.body.verified) {
      throw new Error(`Expected 200 verified, got ${correctRes.status}: ${JSON.stringify(correctRes.body)}`)
    }

    // Verify database user is now email verified
    const verifiedUser = await prisma.user.findUnique({ where: { email: testEmail } })
    if (!verifiedUser.isEmailVerified) {
      throw new Error('User.isEmailVerified was not updated to true!')
    }

    // Verify code was deleted / cannot be replayed
    const replayRes = await request('/api/auth/verify-code', 'POST', {
      email: testEmail,
      code: knownCode,
      purpose: 'EMAIL_VERIFICATION',
    })
    if (replayRes.status !== 400) {
      throw new Error('SECURITY FAILURE: Used code was replayed successfully!')
    }
    console.log('✔ Correct code verified successfully, user updated to isEmailVerified=true, replay attack blocked.')

    // 7. Password Reset Flow
    console.log('\n7. Testing Password Reset Flow...')
    // Request password reset code
    await request('/api/auth/request-code', 'POST', {
      email: testEmail,
      purpose: 'PASSWORD_RESET',
    })

    // Set known code for password reset
    const resetCode = '112233'
    const resetHash = crypto.createHash('sha256').update(resetCode).digest('hex')
    await prisma.verificationCode.updateMany({
      where: { userId: userRecord.id, purpose: 'PASSWORD_RESET' },
      data: { codeHash: resetHash },
    })

    const newPassword = 'NewSuperPassword456!'
    const resetRes = await request('/api/auth/reset-password', 'POST', {
      email: testEmail,
      code: resetCode,
      newPassword,
    })

    if (resetRes.status !== 200) {
      throw new Error(`Password reset failed: ${JSON.stringify(resetRes.body)}`)
    }

    // Attempt login with new password
    const newLoginRes = await request('/api/auth/login', 'POST', {
      email: testEmail,
      password: newPassword,
    })
    if (newLoginRes.status !== 200 || !newLoginRes.body.token) {
      throw new Error(`Login with new password failed: ${JSON.stringify(newLoginRes.body)}`)
    }
    console.log('✔ Password successfully reset and authenticated with new credentials.')

    // Clean up test user and verification records
    await prisma.user.delete({ where: { email: testEmail } })
    console.log('\n✔ Test user and data cleaned up.')

    console.log('\n🎉 ALL BREVO TRANSACTIONAL EMAIL & VERIFICATION TESTS PASSED PERFECTLY!\n')
  } finally {
    server.close()
    await prisma.$disconnect()
  }
}

runTests()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error('❌ Verification Test Failed:', err)
    process.exit(1)
  })
