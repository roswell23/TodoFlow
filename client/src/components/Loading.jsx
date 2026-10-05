export default function Loading({ message = 'Loading your workspace…' }) {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}
