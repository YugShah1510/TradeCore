/**
 * Authentication Context & Provider
 * 
 * Strict Cookie-Based Authentication & Database Persistence:
 * - Zero tokens or user profiles stored in localStorage
 * - Tokens reside in secure httpOnly cookies managed by the browser
 * - The authenticated user profile and live balances are retrieved directly from PostgreSQL via GET /api/auth/me
 * - Access token rotation happens seamlessly via the Axios response interceptor
 * - Logout deletes the refresh token from the database and clears cookies
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // User profile state is stored strictly in React memory - zero localStorage persistence
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Validate session on mount by checking the database via /api/auth/me
  useEffect(() => {
    async function loadUser() {
      // Ensure any legacy localStorage items are purged
      try {
        localStorage.removeItem('tradecore_access_token');
        localStorage.removeItem('tradecore_refresh_token');
        localStorage.removeItem('tradecore_token');
        localStorage.removeItem('tradecore_user');
      } catch (e) {
        // Ignore
      }

      try {
        // Query PostgreSQL database directly via /api/auth/me using credentials/cookies
        const res = await authApi.getMe();
        if (res.success && res.user) {
          setUser(res.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        // Not logged in or session expired
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  // Login handler: Authenticates credentials, receives httpOnly cookies, hydrates user from database
  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.success) {
      // Fetch authoritative user profile and live cash balances directly from PostgreSQL
      try {
        const meRes = await authApi.getMe();
        if (meRes.success && meRes.user) {
          setUser(meRes.user);
          return meRes.user;
        }
      } catch (e) {
        // Fallback to response payload if immediate check races
      }

      const freshUser = {
        ...res.user,
        cashAccount: res.cashAccount,
      };
      setUser(freshUser);
      return freshUser;
    }
  };

  // Register handler: Registers account, receives cookies, hydrates user from database
  const register = async (name, email, password, confirmPassword) => {
    const res = await authApi.register({ name, email, password, confirmPassword });
    if (res.success) {
      try {
        const meRes = await authApi.getMe();
        if (meRes.success && meRes.user) {
          setUser(meRes.user);
          return meRes.user;
        }
      } catch (e) {
        // Fallback
      }

      const freshUser = {
        ...res.user,
        cashAccount: {
          availableBalance: 100000.0,
          reservedBalance: 0.0,
          initialBalance: 100000.0,
        },
      };
      setUser(freshUser);
      return freshUser;
    }
  };

  // Logout handler: Deletes the refresh token from PostgreSQL database and clears cookies
  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      // Ensure local storage remains completely clean
      try {
        localStorage.removeItem('tradecore_access_token');
        localStorage.removeItem('tradecore_refresh_token');
        localStorage.removeItem('tradecore_token');
        localStorage.removeItem('tradecore_user');
      } catch (e) {
        // Ignore
      }
    }
  };

  // Re-fetch user to refresh live cash balances and portfolio stats from PostgreSQL
  const refreshUser = async () => {
    try {
      const res = await authApi.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      }
    } catch (e) {
      console.error('Failed to refresh user profile from database:', e);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
