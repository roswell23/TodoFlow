import { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import Loading from './components/Loading'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminTodos from './pages/admin/AdminTodos'

const currentPath = () => window.location.pathname.replace(/\/$/, '') || '/login'

export default function App() {
  const { user, loading } = useAuth()
  const [path, setPath] = useState(currentPath())
  const [routeState, setRouteState] = useState(() => {
    try {
      return window.history.state || {}
    } catch {
      return {}
    }
  })

  const navigate = (next, state = {}) => {
    window.history.pushState(state, '', next)
    setRouteState(state || {})
    setPath(next)
  }

  useEffect(() => {
    const onPop = () => {
      setPath(currentPath())
      setRouteState(window.history.state || {})
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Redirect authenticated users away from auth pages (via effect, not render)
  useEffect(() => {
    if (!loading && user && (path === '/login' || path === '/signup' || path === '/verify-email' || path === '/forgot-password')) {
      if (user.role === 'ADMIN') {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }
    }
  }, [loading, user, path])

  if (loading) return <Loading />

  // Admin Routes
  if (path === '/admin') {
    return (
      <AdminRoute navigate={navigate}>
        <AdminDashboard navigate={navigate} />
      </AdminRoute>
    )
  }

  if (path === '/admin/users') {
    return (
      <AdminRoute navigate={navigate}>
        <AdminUsers navigate={navigate} />
      </AdminRoute>
    )
  }

  if (path === '/admin/todos') {
    return (
      <AdminRoute navigate={navigate}>
        <AdminTodos navigate={navigate} />
      </AdminRoute>
    )
  }

  // Normal User Dashboard
  if (path === '/dashboard') {
    return (
      <ProtectedRoute navigate={navigate}>
        <Dashboard navigate={navigate} />
      </ProtectedRoute>
    )
  }

  if (path === '/signup') return <Signup navigate={navigate} />
  if (path === '/verify-email') return <VerifyEmail navigate={navigate} initialEmail={routeState?.email || ''} />
  if (path === '/forgot-password') return <ForgotPassword navigate={navigate} initialEmail={routeState?.email || ''} />

  return <Login navigate={navigate} />
}
