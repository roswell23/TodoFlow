import { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import Loading from './components/Loading'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'

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

  if (loading) return <Loading />

  // Redirect authenticated users away from auth pages
  if (user && (path === '/login' || path === '/signup')) {
    navigate('/dashboard')
    return <Loading message="Redirecting…" />
  }

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
