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
        <span>✓</span> TodoFlow
      </div>
      {user && (
        <button className="logout-button" onClick={handleLogout}>
          Log out
        </button>
      )}
    </header>
  )
}
