import { useState } from 'react'

function UserIcon() {
  return (
    <svg
      className="field-left-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg
      className="field-left-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg
      className="field-left-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

export default function AuthField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  required = true,
  canReveal = false,
  icon,
  error,
}) {
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password' || canReveal
  const inputType = isPassword && revealed ? 'text' : type
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className={`auth-input-container ${icon ? 'has-icon' : ''}`}>
        {icon === 'user' && <UserIcon />}
        {icon === 'email' && <EmailIcon />}
        {icon === 'lock' && <LockIcon />}

        <input
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className="auth-input"
        />

        {isPassword && (
          <button
            type="button"
            className="password-toggle-text"
            onClick={() => setRevealed((prev) => !prev)}
            aria-label={revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            aria-pressed={revealed}
          >
            {revealed ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {error && (
        <span id={errorId} className="field-error-msg" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
