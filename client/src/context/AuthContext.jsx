import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const handleUnauthorized = useCallback(() => {
    authService.clearToken()
    setUser(null)
  }, [])

  // Listen for 401 unauthorized events dispatched from API services
  useEffect(() => {
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [handleUnauthorized])

  // Hydrate auth session on initial app load
  useEffect(() => {
    const token = authService.getToken()
    if (!token) {
      setLoading(false)
      return
    }

    authService
      .me()
      .then(setUser)
      .catch(() => {
        authService.clearToken()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = (nextUser, token) => {
    authService.saveSession(token, nextUser)
    setUser(nextUser)
  }

  const logout = async () => {
    try {
      await authService.logout()
    } finally {
      authService.clearToken()
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
