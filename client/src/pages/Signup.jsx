import { useState } from 'react'
import { authService } from '../services/authService'
import AuthBranding from '../components/AuthBranding'
import AuthField from '../components/AuthField'
import ThemeToggle from '../components/ThemeToggle'

export default function Signup({ navigate }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const update = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value })
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: '' }))
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    const errs = {}
    if (!form.name.trim()) {
      errs.name = 'Please enter your full name.'
    }
    if (!form.email.trim()) {
      errs.email = 'Please enter your email address.'
    }
    if (form.password.length < 8) {
      errs.password = 'Password must be at least 8 characters.'
    }
    if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.'
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }

    setBusy(true)
    try {
      await authService.signup(form)
      const cleanEmail = form.email.toLowerCase().trim()
      try {
        sessionStorage.setItem('todoflow_verify_email', cleanEmail)
      } catch {}
      navigate('/verify-email', { email: cleanEmail })
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

      {/* Right Registration Panel */}
      <section className="form-panel" aria-label="Sign Up Form">
        <div className="form-wrap auth-signup-wrap">
          <p className="eyebrow">GET STARTED</p>
          <h2 className="form-title">Create your account</h2>
          <p className="form-subtitle">A little more focus, a lot less friction.</p>

          <form onSubmit={submit} className="auth-form" noValidate>
            {error && (
              <div className="alert" role="alert">
                {error}
              </div>
            )}

            <AuthField
              id="signup-name"
              label="Full name"
              icon="user"
              value={form.name}
              onChange={update('name')}
              placeholder="John Doe"
              autoComplete="name"
              error={fieldErrors.name}
              required
            />

            <AuthField
              id="signup-email"
              label="Email address"
              type="email"
              icon="email"
              value={form.email}
              onChange={update('email')}
              placeholder="you@example.com"
              autoComplete="email"
              error={fieldErrors.email}
              required
            />

            <AuthField
              id="signup-password"
              label="Password"
              type="password"
              icon="lock"
              value={form.password}
              onChange={update('password')}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              canReveal
              error={fieldErrors.password}
              required
            />

            <AuthField
              id="signup-confirm"
              label="Confirm password"
              type="password"
              icon="lock"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              placeholder="Repeat your password"
              autoComplete="new-password"
              canReveal
              error={fieldErrors.confirmPassword}
              required
            />

            <button
              id="signup-submit-btn"
              type="submit"
              className="primary-button"
              disabled={busy}
            >
              <span>{busy ? 'Creating account…' : 'Create account'}</span>
              <span className="btn-arrow" aria-hidden="true">→</span>
            </button>
          </form>

          <p className="switch-copy">
            Already have an account?{' '}
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => navigate('/login')}
            >
              Log in
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}
