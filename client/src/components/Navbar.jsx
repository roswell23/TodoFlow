import { useAuth } from '../context/AuthContext'

/**
 * Top navigation bar shown on authenticated pages.
 * Displays the TodoFlow brand mark and a logout button.
 */
export default function Navbar({ navigate }) {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="topbar">
      <div className="logo">
        <span>✓</span>
        TodoFlow
      </div>
      {user && (
        <div className="nav-actions">
          <div className="nav-user-info" title={user?.email}>
            <div className="nav-avatar" aria-hidden="true">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="nav-user-meta">
              <span className="nav-user-name">{user?.name}</span>
              <span className="nav-user-email">{user?.email}</span>
            </div>
          </div>
          <button className="logout-button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      )}
    </header>
  )
}
