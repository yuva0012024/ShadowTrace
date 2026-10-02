import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, signupUser, logoutUser, getCurrentUser, classifyApiError } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('shadowtrace_token') || null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('shadowtrace_token')));

  // Check authentication using GET /api/auth/me on startup
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function initializeAuth() {
      const storedToken = localStorage.getItem('shadowtrace_token');
      if (!storedToken) {
        if (isMounted) {
          setUser(null);
          setToken(null);
          setLoading(false);
        }
        return;
      }

      try {
        const data = await getCurrentUser({ signal: controller.signal, timeout: 3500 });
        if (isMounted && data.success && data.user) {
          setUser(data.user);
          setToken(storedToken);
        }
      } catch (err) {
        const classified = classifyApiError(err);
        if (classified.isCanceled || !isMounted) {
          return;
        }

        // Only discard stored token if server explicitly reports unauthorized (401)
        if (err.response?.status === 401) {
          console.warn('[ShadowTrace Auth] Session expired or invalid. Cleared credentials.');
          localStorage.removeItem('shadowtrace_token');
          if (isMounted) {
            setUser(null);
            setToken(null);
          }
        } else {
          // Backend is booting up or network is temporarily disconnected:
          // Keep token in storage so session restores once backend is reachable
          console.info(`[ShadowTrace Auth] Session validation deferred (${classified.type}):`, classified.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const login = async (email, password, isAdminLogin = false) => {
    const data = await loginUser({ email, password, isAdminLogin });
    if (data.requiresOtp) {
      return data;
    }
    if (data.success && data.token && data.user) {
      localStorage.setItem('shadowtrace_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    }
    throw new Error(data.error || 'Authentication failed');
  };

  const verifyLogin = async (email, otp) => {
    const data = await verifyLoginOtp(email, otp);
    if (data.success && data.token && data.user) {
      localStorage.setItem('shadowtrace_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    }
    throw new Error(data.error || 'Verification failed');
  };

  const signup = async (fullName, email, password) => {
    const data = await signupUser({ fullName, email, password });
    if (data.success && data.token && data.user) {
      localStorage.setItem('shadowtrace_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    }
    throw new Error(data.error || 'Registration failed');
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch {
      // Continue client cleanup even if network request fails
    } finally {
      localStorage.removeItem('shadowtrace_token');
      setToken(null);
      setUser(null);
    }
  };

  const updateUser = (updatedUserData) => {
    setUser((prev) => (prev ? { ...prev, ...updatedUserData } : updatedUserData));
  };

  const setSession = (newToken, newUser) => {
    localStorage.setItem('shadowtrace_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    loading,
    login,
    verifyLogin,
    signup,
    logout,
    updateUser,
    setSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
