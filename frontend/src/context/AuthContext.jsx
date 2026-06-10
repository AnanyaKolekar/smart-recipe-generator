import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getMemory, loginUser, registerUser } from '../services/api'

const AuthContext = createContext(null)

const TOKEN_KEY = 'recipegenai_token'
const USER_KEY = 'recipegenai_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [memory, setMemory] = useState(null)
  const [authLoading, setAuthLoading] = useState(false)

  const loadMemory = useCallback(async (authToken) => {
    if (!authToken) {
      setMemory(null)
      return
    }
    try {
      const data = await getMemory(authToken)
      setMemory(data)
    } catch {
      setMemory(null)
    }
  }, [])

  useEffect(() => {
    loadMemory(token)
  }, [token, loadMemory])

  const login = async (username, password) => {
    setAuthLoading(true)
    try {
      const data = await loginUser({ username, password })
      localStorage.setItem(TOKEN_KEY, data.access_token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      setToken(data.access_token)
      setUser(data.user)
      await loadMemory(data.access_token)
      return data
    } finally {
      setAuthLoading(false)
    }
  }

  const register = async (username, email, password) => {
    setAuthLoading(true)
    try {
      await registerUser({ username, email, password })
      return login(username, password)
    } finally {
      setAuthLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
    setMemory(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        memory,
        authLoading,
        isAuthenticated: !!token,
        login,
        register,
        logout,
        refreshMemory: () => loadMemory(token),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
