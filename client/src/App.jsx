import { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import Loading from './components/Loading'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminTodos from './pages/admin/AdminTodos'

const currentPath = () => window.location.pathname.replace(/\/$/, '') || '/login'

export default function App() {
  const { user, loading } = useAuth()
  const [path, setPath] = useState(currentPath())

  const navigate = (next) => {
    window.history.pushState({}, '', next)
    setPath(next)
  }

  useEffect(() => {
    const onPop = () => setPath(currentPath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Redirect authenticated users away from auth pages (via effect, not render)
  useEffect(() => {
    if (!loading && user && (path === '/login' || path === '/signup')) {
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

  return <Login navigate={navigate} />
}
