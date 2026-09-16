import { useState } from 'react'
import { authService } from '../services/authService'

function Field({ label, type = 'text', value, onChange, placeholder, autoComplete }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
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
      <section className="brand-panel">
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

          <form onSubmit={submit} className="auth-form">
            {error && <div className="alert">{error}</div>}
            <Field
              label="Full name"
              value={form.name}
              onChange={update('name')}
              placeholder="Alex Morgan"
              autoComplete="name"
            />
            <Field
              label="Email address"
              type="email"
              value={form.email}
              onChange={update('email')}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <Field
              label="Password"
              type="password"
              value={form.password}
              onChange={update('password')}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <Field
              label="Confirm password"
              type="password"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              placeholder="Repeat your password"
              autoComplete="new-password"
            />
            <button className="primary-button" disabled={busy}>
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
