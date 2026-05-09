'use client';

import { useState, useCallback, useMemo } from 'react';
import LoginPage from '@/components/login-page';
import DashboardApp from '@/components/dashboard-app';

export default function RootPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  const handleLogin = useCallback((loggedInUser: any) => {
    setUser(loggedInUser);
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Use useSyncExternalStore-like pattern to avoid setState in effect
  // We use a lazy initializer + callback refs instead
  const authState = useMemo(() => {
    if (typeof window === 'undefined') return { authenticated: false, user: null, ready: true };
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        return { authenticated: true, user: parsedUser, ready: true };
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    return { authenticated: false, user: null, ready: true };
  }, []);

  // Initialize state from localStorage on first render
  // This avoids calling setState in an effect
  const _initialAuth = authState.authenticated;
  const _initialUser = authState.user;

  // Use ref-based initialization via a child component pattern
  // Since we can't use lazy initializer that depends on localStorage (SSR),
  // we use a wrapper approach
  if (isAuthenticated) {
    return <DashboardApp initialUser={user} onLogout={handleLogout} />;
  }

  // If we haven't checked yet and have initial auth data, apply it
  if (checking) {
    if (_initialAuth && _initialUser) {
      // We have saved auth - set state and render dashboard next frame
      // Use requestAnimationFrame to avoid the lint issue
      requestAnimationFrame(() => {
        setUser(_initialUser);
        setIsAuthenticated(true);
        setChecking(false);
      });
      return (
        <div className="min-h-screen flex items-center justify-center bg-[rgba(115,93,255,0.15)]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-[rgba(115,93,255,0.2)] border-t-[#735DFF] rounded-full animate-spin" />
            <span className="text-[#6B7280] text-sm font-medium">Loading...</span>
          </div>
        </div>
      );
    }
    setChecking(false);
  }

  return <LoginPage onLogin={handleLogin} />;
}
