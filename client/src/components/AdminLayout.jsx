import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'

export default function AdminLayout({ children, currentTab, navigate }) {
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Prevent background scrolling when mobile menu drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileMenuOpen])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/admin',
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="admin-nav-svg">
          <rect x="3" y="3" width="6" height="6" rx="1.5" />
          <rect x="11" y="3" width="6" height="6" rx="1.5" />
          <rect x="3" y="11" width="6" height="6" rx="1.5" />
          <rect x="11" y="11" width="6" height="6" rx="1.5" />
        </svg>
      ),
    },
    {
      id: 'users',
      label: 'Users',
      path: '/admin/users',
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="admin-nav-svg">
          <path d="M16 17v-1.5a3.5 3.5 0 00-3.5-3.5h-5A3.5 3.5 0 004 15.5V17" />
          <circle cx="10" cy="7" r="3.5" />
        </svg>
      ),
    },
    {
      id: 'todos',
      label: 'Todos',
      path: '/admin/todos',
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="admin-nav-svg">
          <path d="M7 10l2.5 2.5L14 8" />
          <rect x="3" y="3" width="14" height="14" rx="3" />
        </svg>
      ),
    },
  ]

  return (
    <div className="admin-layout">
      {/* Mobile Top Navigation Bar */}
      <header className="admin-mobile-header">
        <div className="admin-brand-mobile" onClick={() => navigate('/admin')}>
          <span className="admin-logo-mark small" aria-hidden="true">✓</span>
          <span className="admin-brand-title">TodoFlow</span>
          <span className="admin-tag small">ADMIN</span>
        </div>
        <div className="admin-mobile-actions">
          <ThemeToggle />
          <button
            type="button"
            className={`admin-menu-toggle${mobileMenuOpen ? ' open' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation drawer' : 'Open navigation drawer'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* Backdrop overlay for mobile drawer */}
      <div
        className={`admin-backdrop${mobileMenuOpen ? ' visible' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Admin Sidebar / Drawer */}
      <aside className={`admin-sidebar${mobileMenuOpen ? ' mobile-open' : ''}`} aria-label="Admin Sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-header-main">
            <div className="admin-logo">
              <span className="admin-logo-mark" aria-hidden="true">✓</span>
              <div className="admin-logo-text">
                <span className="brand-name">TodoFlow</span>
                <span className="admin-tag">ADMIN</span>
              </div>
            </div>
            {/* Mobile close button inside drawer */}
            <button
              type="button"
              className="admin-drawer-close-btn"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu drawer"
            >
              ✕
            </button>
          </div>
          <p className="admin-sidebar-caption">Platform Control Center</p>
        </div>

        <nav className="admin-nav" aria-label="Admin Navigation">
          <div className="admin-nav-section-label">MANAGE</div>
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`admin-nav-link${currentTab === item.id ? ' active' : ''}`}
              onClick={() => {
                navigate(item.path)
                setMobileMenuOpen(false)
              }}
            >
              {item.icon}
              <span>{item.label}</span>
              {currentTab === item.id && <span className="nav-active-pip" aria-hidden="true" />}
            </button>
          ))}

          <hr className="admin-nav-divider" />

          <div className="admin-nav-section-label">NAVIGATION</div>
          <button
            type="button"
            className="admin-nav-link secondary"
            onClick={() => {
              navigate('/dashboard')
              setMobileMenuOpen(false)
            }}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="admin-nav-svg">
              <path d="M10 16l-6-6 6-6" />
              <path d="M4 10h12" />
            </svg>
            <span>Back to TodoFlow</span>
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="admin-user-details">
              <span className="admin-user-name">{user?.name}</span>
              <span className="admin-user-role">Administrator</span>
            </div>
          </div>
          <div className="admin-footer-controls">
            <ThemeToggle />
            <button
              type="button"
              className="admin-logout-btn"
              onClick={handleLogout}
              title="Log out of administrator account"
            >
              Log out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        {children}
      </main>
    </div>
  )
}
