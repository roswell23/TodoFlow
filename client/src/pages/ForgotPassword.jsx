import { useState, useEffect, useRef } from 'react'
import { authService } from '../services/authService'
import AuthBranding from '../components/AuthBranding'
import AuthField from '../components/AuthField'
import ThemeToggle from '../components/ThemeToggle'

export default function ForgotPassword({ navigate, initialEmail = '' }) {
  const [step, setStep] = useState('REQUEST') // 'REQUEST' | 'RESET'
  const [email, setEmail] = useState(() => {
    if (initialEmail) return initialEmail
    try {
      const params = new URLSearchParams(window.location.search)
      return params.get('email') || ''
    } catch {
      return ''
    }
  })
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const timerRef = useRef(null)

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

  const handleRequestCode = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email.trim()) {
      return setError('Please enter your email address.')
    }

    setBusy(true)
    try {
      const res = await authService.requestCode({
        email: email.toLowerCase().trim(),
        purpose: 'PASSWORD_RESET',
      })
      setSuccess(res.message || 'If an account exists, a 6-digit reset code has been sent.')
      setStep('RESET')
      setCooldown(60)
    } catch (err) {
      setError(err.message || 'Failed to request reset code. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (code.length !== 6) {
      return setError('Please enter the full 6-digit reset code.')
    }
    if (newPassword.length < 8) {
      return setError('New password must be at least 8 characters.')
    }
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match.')
    }

    setBusy(true)
    try {
      const res = await authService.resetPassword({
        email: email.toLowerCase().trim(),
        code,
        newPassword,
      })
      setSuccess(res.message || 'Password reset successfully! Redirecting to login…')
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please check the code and try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || busy) return
    setError('')
    setSuccess('')

    try {
      const res = await authService.resendCode({
        email: email.toLowerCase().trim(),
        purpose: 'PASSWORD_RESET',
      })
      setSuccess(res.message || 'A new reset code has been sent.')
      setCooldown(60)
    } catch (err) {
      if (err.waitSeconds) {
        setCooldown(err.waitSeconds)
      }
      setError(err.message || 'Unable to resend code right now.')
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
        headlineLead="Reset your"
        headlineAccent="password."
        copy="We will send a secure 6-digit verification code to your email to confirm your identity."
      />

      {/* Right Form Panel */}
      <section className="form-panel" aria-label="Forgot Password Form">
        <div className="form-wrap">
          <p className="eyebrow">ACCOUNT RECOVERY</p>
          <h2 className="form-title">
            {step === 'REQUEST' ? 'Forgot your password?' : 'Set a new password'}
          </h2>
          <p className="form-subtitle">
            {step === 'REQUEST'
              ? 'Enter your email address and we will send you a 6-digit code.'
              : 'Enter the 6-digit code from your email along with your new password.'}
          </p>

          {error && <div className="alert" role="alert">{error}</div>}
          {success && <div className="alert alert-success" role="status">{success}</div>}

          {step === 'REQUEST' ? (
            <form onSubmit={handleRequestCode} className="auth-form" noValidate>
              <AuthField
                id="forgot-email"
                label="Email address"
                type="email"
                icon="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />

              <button
                id="request-reset-btn"
                type="submit"
                className="primary-button"
                disabled={busy}
              >
                <span>{busy ? 'Sending code…' : 'Send Reset Code'}</span>
                <span className="btn-arrow" aria-hidden="true">→</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="auth-form" noValidate>
              <div className="field">
                <label className="field-label" htmlFor="reset-code">
                  6-digit reset code
                </label>
                <div className="auth-input-container">
                  <input
                    id="reset-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    autoComplete="one-time-code"
                    className="auth-input"
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '1.4rem',
                      letterSpacing: '0.3em',
                      textAlign: 'center',
                      fontWeight: 600,
                    }}
                    required
                  />
                </div>
              </div>

              <AuthField
                id="reset-new-password"
                label="New password"
                type="password"
                icon="lock"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                canReveal
                required
              />

              <AuthField
                id="reset-confirm-password"
                label="Confirm new password"
                type="password"
                icon="lock"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
                canReveal
                required
              />

              <button
                id="reset-submit-btn"
                type="submit"
                className="primary-button"
                disabled={busy || code.length !== 6}
              >
                <span>{busy ? 'Resetting…' : 'Reset Password'}</span>
                <span className="btn-arrow" aria-hidden="true">→</span>
              </button>
            </form>
          )}

          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
            {step === 'RESET' && (
              <p className="switch-copy" style={{ margin: 0 }}>
                Didn&apos;t get the code?{' '}
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={handleResend}
                  disabled={cooldown > 0}
                  style={{ fontWeight: 600 }}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
              </p>
            )}

            <button
              type="button"
              className="auth-switch-link"
              onClick={() => navigate('/login')}
              style={{ fontSize: '0.875rem' }}
            >
              ← Back to Log in
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
