import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Loading from './Loading'

/**
 * Renders children only when the user is authenticated.
 * Shows a loading screen while auth state is resolving,
 * and redirects to /login via useEffect (not during render) otherwise.
 */
export default function ProtectedRoute({ children, navigate }) {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      window.history.replaceState({}, '', '/login')
      navigate('/login')
    }
  }, [loading, user, navigate])

  if (loading) return <Loading />
  if (!user)   return <Loading message="Redirecting…" />

  return children
}
