'use client'

// Utility functions for authentication
export const AuthUtils = {
  // Check if user is authenticated (client-side)
  isAuthenticated: (): boolean => {
    if (typeof document === 'undefined') return false
    return document.cookie.includes('threadcub_auth=authenticated')
  },

  // Logout function
  logout: (): void => {
    // Clear the authentication cookie
    document.cookie = 'threadcub_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    
    // Redirect to login
    window.location.href = '/login'
  },

  // Get current auth status
  getAuthStatus: (): 'authenticated' | 'unauthenticated' => {
    return AuthUtils.isAuthenticated() ? 'authenticated' : 'unauthenticated'
  }
}

// React hook for authentication state
import { useState, useEffect } from 'react'

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsAuthenticated(AuthUtils.isAuthenticated())
    setIsLoading(false)
  }, [])

  const logout = () => {
    AuthUtils.logout()
    setIsAuthenticated(false)
  }

  return {
    isAuthenticated,
    isLoading,
    logout
  }
}