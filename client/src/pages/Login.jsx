import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services/authService'
import AuthBranding from '../components/AuthBranding'
import AuthField from '../components/AuthField'
import ThemeToggle from '../components/ThemeToggle'

export default function Login({ navigate }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }

    setBusy(true)
    try {
      const result = await authService.login({ email, password })
      login(result.user, result.token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-layout">
      {/* Theme Switcher */}
      <div className="auth-theme-toggle-wrap">
        <ThemeToggle />
      </div>

      {/* Left Branding Panel */}
      <AuthBranding />

      {/* Right Login Panel */}
      <section className="form-panel" aria-label="Login Form">
        <div className="form-wrap">
          <p className="eyebrow">WELCOME BACK</p>
          <h2 className="form-title">Log in to TodoFlow</h2>
          <p className="form-subtitle">Pick up right where you left off.</p>

          <form onSubmit={submit} className="auth-form" noValidate>
            {error && (
              <div className="alert" role="alert">
                {error}
              </div>
            )}

            <AuthField
              id="login-email"
              label="Email address"
              type="email"
              icon="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />

            <div className="field-group">
              <AuthField
                id="login-password"
                label="Password"
                type="password"
                icon="lock"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                canReveal
                required
              />
              <div className="forgot-password-wrap">
                <button
                  type="button"
                  className="auth-forgot-link"
                  onClick={() => navigate('/forgot-password', { email })}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              className="primary-button"
              disabled={busy}
            >
              <span>{busy ? 'Logging in…' : 'Log in'}</span>
              <span className="btn-arrow" aria-hidden="true">→</span>
            </button>
          </form>

          <p className="switch-copy">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => navigate('/signup')}
            >
              Sign up
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}
