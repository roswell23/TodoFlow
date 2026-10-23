import { useState, useEffect, useRef } from 'react'
import { authService } from '../services/authService'
import AuthBranding from '../components/AuthBranding'
import ThemeToggle from '../components/ThemeToggle'

export default function VerifyEmail({ navigate, initialEmail = '' }) {
  const [email, setEmail] = useState(() => {
    if (initialEmail) {
      try {
        sessionStorage.setItem('todoflow_verify_email', initialEmail)
      } catch {}
      return initialEmail
    }
    try {
      const params = new URLSearchParams(window.location.search)
      const qEmail = params.get('email')
      if (qEmail) {
        sessionStorage.setItem('todoflow_verify_email', qEmail)
        return qEmail
      }
    } catch {}
    try {
      return sessionStorage.getItem('todoflow_verify_email') || ''
    } catch {
      return ''
    }
  })

  const [showEmailEdit, setShowEmailEdit] = useState(!email)
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const timerRef = useRef(null)
  const inputRefs = useRef([])

  const code = digits.join('')

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setTimeout(() => {
        setCooldown((prev) => prev - 1)
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [cooldown])

  // Auto-focus first digit input on mount if email is set
  useEffect(() => {
    if (email && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [email])

  const handleDigitChange = (index, e) => {
    const rawVal = e.target.value
    const cleanDigits = rawVal.replace(/\D/g, '')

    if (!cleanDigits) {
      const updated = [...digits]
      updated[index] = ''
      setDigits(updated)
      return
    }

    if (cleanDigits.length > 1) {
      // Handle paste or multi-digit entry on individual input
      const updated = [...digits]
      const chars = cleanDigits.slice(0, 6).split('')
      chars.forEach((char, i) => {
        if (index + i < 6) {
          updated[index + i] = char
        }
      })
      setDigits(updated)
      const nextFocus = Math.min(5, index + chars.length)
      inputRefs.current[nextFocus]?.focus()
      return
    }

    const updated = [...digits]
    updated[index] = cleanDigits[0]
    setDigits(updated)

    // Auto-advance to next box
    if (index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const updated = [...digits]
        updated[index - 1] = ''
        setDigits(updated)
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault()
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return

    const updated = [...digits]
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || ''
    }
    setDigits(updated)
    const nextFocus = Math.min(5, pasted.length)
    inputRefs.current[nextFocus]?.focus()
  }

  const submit = async (e) => {
    if (e) e.preventDefault()
    setError('')
    setSuccess('')

    if (!email.trim()) {
      setShowEmailEdit(true)
      return setError('Please enter your email address.')
    }
    if (code.length !== 6) {
      return setError('Please enter all 6 digits of the verification code.')
    }

    setBusy(true)
    try {
      const res = await authService.verifyCode({
        email: email.toLowerCase().trim(),
        code,
        purpose: 'EMAIL_VERIFICATION',
      })
      setSuccess(res.message || 'Email verified successfully! You can now log in.')
      try {
        sessionStorage.removeItem('todoflow_verify_email')
      } catch {}
      setTimeout(() => {
        navigate('/login')
      }, 1800)
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the code and try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || resending) return
    setError('')
    setSuccess('')

    if (!email.trim()) {
      setShowEmailEdit(true)
      return setError('Please enter your email address to resend the code.')
    }

    setResending(true)
    try {
      const res = await authService.resendCode({
        email: email.toLowerCase().trim(),
        purpose: 'EMAIL_VERIFICATION',
      })
      setSuccess(res.message || 'A new verification code has been sent.')
      setCooldown(60)
    } catch (err) {
      if (err.waitSeconds) {
        setCooldown(err.waitSeconds)
      }
      setError(err.message || 'Unable to resend verification code right now.')
    } finally {
      setResending(false)
    }
  }

  return (
    <main className="auth-layout">
      {/* Floating Theme Switcher */}
      <div className="auth-theme-toggle-wrap">
        <ThemeToggle />
      </div>

      {/* Left Branding Panel */}
      <AuthBranding
        eyebrow="TODOFLOW"
        headlineLead="Secure your"
        headlineAccent="workspace."
        copy="Check your inbox for a 6-digit verification code sent to confirm your identity."
      />

      <section className="form-panel">
        <div className="form-wrap">
          <p className="eyebrow">Email Verification</p>
          <h2>Verify your account</h2>
          <p className="form-subtitle">Enter the 6-digit code sent to your email.</p>

          {/* Email badge indicator with change option */}
          {email && (
            <div className="verify-target-box">
              <span>
                Sent to <strong>{email}</strong>
              </span>
              <button
                type="button"
                className="verify-change-btn"
                onClick={() => setShowEmailEdit((prev) => !prev)}
                title="Change email"
              >
                {showEmailEdit ? 'Done' : 'Change'}
              </button>
            </div>
          )}

          <form onSubmit={submit} className="auth-form" noValidate>
            {error && <div className="alert" role="alert">{error}</div>}
            {success && <div className="alert alert-success" role="status">{success}</div>}

            {/* Email input only shown if user clicks Change or if email is missing */}
            {(!email || showEmailEdit) && (
              <label className="field" htmlFor="verify-email">
                <span>Email address</span>
                <input
                  id="verify-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    const val = e.target.value
                    setEmail(val)
                    try {
                      sessionStorage.setItem('todoflow_verify_email', val)
                    } catch {}
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>
            )}

            {/* 6-digit OTP code boxes */}
            <div className="field">
              <span>6-digit verification code</span>
              <div className="otp-container" onPaste={handlePaste}>
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    id={`verify-otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className={`otp-input ${digit ? 'filled' : ''}`}
                    autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                    aria-label={`Digit ${idx + 1} of verification code`}
                    required
                  />
                ))}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                Codes expire after 10 minutes.
              </span>
            </div>

            <button
              id="verify-submit-btn"
              type="submit"
              className="primary-button"
              disabled={busy || code.length !== 6}
            >
              {busy ? 'Verifying…' : 'Verify Code'} <span>&rarr;</span>
            </button>
          </form>

          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <p className="switch-copy" style={{ margin: 0 }}>
              Didn&apos;t receive the code?{' '}
              <button
                type="button"
                className="text-button"
                onClick={handleResend}
                disabled={cooldown > 0 || resending}
                style={{ fontWeight: 600 }}
              >
                {cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : resending
                  ? 'Sending…'
                  : 'Resend code'}
              </button>
            </p>

            <button
              type="button"
              className="text-button"
              onClick={() => navigate('/login')}
              style={{ fontSize: '0.875rem' }}
            >
              &larr; Back to Log in
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
