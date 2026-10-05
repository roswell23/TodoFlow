import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Loading from './Loading'

/**
 * Route guard that ensures the user is authenticated AND has the ADMIN role.
 * Normal users attempting to access admin routes are redirected to /dashboard.
 */
export default function AdminRoute({ children, navigate }) {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        window.history.replaceState({}, '', '/login')
        navigate('/login')
      } else if (user.role !== 'ADMIN') {
        window.history.replaceState({}, '', '/dashboard')
        navigate('/dashboard')
      }
    }
  }, [loading, user, navigate])

  if (loading) return <Loading message="Verifying admin credentials…" />
  if (!user || user.role !== 'ADMIN') return <Loading message="Access denied. Redirecting to user dashboard…" />

  return children
}
