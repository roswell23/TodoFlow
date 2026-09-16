import { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authService.getToken()) {
      setLoading(false)
      return
    }
    authService
      .me()
      .then(setUser)
      .catch(() => authService.clearToken())
      .finally(() => setLoading(false))
  }, [])

  const login = (nextUser, token) => {
    authService.saveSession(token, nextUser)
    setUser(nextUser)
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
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
