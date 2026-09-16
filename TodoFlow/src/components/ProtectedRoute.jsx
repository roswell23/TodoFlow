import { useAuth } from '../context/AuthContext'
import Loading from './Loading'

/**
 * Renders children only when the user is authenticated.
 * Shows a loading screen while auth state is resolving,
 * and redirects to /login otherwise.
 */
export default function ProtectedRoute({ children, navigate }) {
  const { user, loading } = useAuth()

  if (loading) return <Loading />

  if (!user) {
    window.history.replaceState({}, '', '/login')
    navigate('/login')
    return <Loading message="Redirecting…" />
  }

  return children
}
