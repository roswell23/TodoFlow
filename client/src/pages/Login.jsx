import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
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

export default function Login({ navigate }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
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
      <section className="brand-panel">
        <div className="brand-mark">✓</div>
        <p className="brand-name">TodoFlow</p>
        <h1>Make space for<br /><em>what matters.</em></h1>
        <p className="brand-copy">A calmer way to organize your day, one task at a time.</p>
        <div className="brand-decoration"><span /><span /><span /></div>
      </section>

      <section className="form-panel">
        <div className="form-wrap">
          <p className="eyebrow">Welcome back</p>
          <h2>Log in to TodoFlow</h2>
          <p className="form-subtitle">Pick up right where you left off.</p>

          <form onSubmit={submit} className="auth-form">
            {error && <div className="alert">{error}</div>}
            <Field
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <button className="primary-button" disabled={busy}>
              {busy ? 'Logging in…' : 'Log in'} <span>→</span>
            </button>
          </form>

          <p className="switch-copy">
            Don&apos;t have an account?{' '}
            <button className="text-button" onClick={() => navigate('/signup')}>
              Sign up
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}
