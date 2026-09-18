import { useState } from 'react'
import { authService } from '../services/authService'

function Field({ id, label, type = 'text', value, onChange, placeholder, autoComplete, canReveal = false }) {
  const [revealed, setRevealed] = useState(false)
  const inputType = canReveal && revealed ? 'text' : type

  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <div className="password-input-wrap">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
        />
        {canReveal && (
          <button
            type="button"
            className="password-toggle"
            onClick={() => setRevealed(!revealed)}
            aria-label={revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            aria-pressed={revealed}
          >
            {revealed ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
    </label>
  )
}

export default function Signup({ navigate }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) return setError('Please enter your name.')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.')

    setBusy(true)
    try {
      await authService.signup(form)
      navigate('/login')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="brand-panel" aria-hidden="true">
        <div className="brand-mark">✓</div>
        <p className="brand-name">TodoFlow</p>
        <h1>Make space for<br /><em>what matters.</em></h1>
        <p className="brand-copy">A calmer way to organize your day, one task at a time.</p>
        <div className="brand-decoration"><span /><span /><span /></div>
      </section>

      <section className="form-panel">
        <div className="form-wrap">
          <p className="eyebrow">Get started</p>
          <h2>Create your account</h2>
          <p className="form-subtitle">A little more focus, a lot less friction.</p>

          <form onSubmit={submit} className="auth-form" noValidate>
            {error && <div className="alert" role="alert">{error}</div>}
            <Field
              id="signup-name"
              label="Full name"
              value={form.name}
              onChange={update('name')}
              placeholder="Alex Morgan"
              autoComplete="name"
            />
            <Field
              id="signup-email"
              label="Email address"
              type="email"
              value={form.email}
              onChange={update('email')}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <Field
              id="signup-password"
              label="Password"
              type="password"
              value={form.password}
              onChange={update('password')}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              canReveal
            />
            <Field
              id="signup-confirm"
              label="Confirm password"
              type="password"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              placeholder="Repeat your password"
              autoComplete="new-password"
              canReveal
            />
            <button
              id="signup-submit-btn"
              type="submit"
              className="primary-button"
              disabled={busy}
            >
              {busy ? 'Creating account…' : 'Create account'} <span>→</span>
            </button>
          </form>

          <p className="switch-copy">
            Already have an account?{' '}
            <button className="text-button" onClick={() => navigate('/login')}>
              Log in
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}
