'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const requestRef = useRef(false);

  const normalizeAdmin = useCallback((user) => {
    if (!user) return null;

    const directPermissions = Array.isArray(user.permissions) ? user.permissions : [];
    const customPermissions = Array.isArray(user.customRole?.permissions) ? user.customRole.permissions : [];

    return {
      ...user,
      permissions: Array.from(new Set([...directPermissions, ...customPermissions].map((item) => String(item || '').trim()).filter(Boolean))),
    };
  }, []);

  const loadAdmin = useCallback(async ({ redirectOnFail = true } = {}) => {
    if (requestRef.current) return;
    requestRef.current = true;
    setLoading(true);

    try {
      const response = await fetch('/api/admin/me', { credentials: 'include' });
      const data = await response.json();

      if (!data.success) {
        setAdmin(null);
        const currentPathname = typeof window !== 'undefined' ? window.location.pathname : '';
        if (redirectOnFail && currentPathname.startsWith('/admin')) {
          router.push('/');
        }
        return null;
      }

      const normalized = normalizeAdmin(data.data);
      setAdmin(normalized);
      sessionStorage.setItem('authDetails', JSON.stringify({ loggedIn: true, user: normalized }));
      return normalized;
    } catch (error) {
      console.error('Admin auth load failed:', error);
      setAdmin(null);
      const currentPathname = typeof window !== 'undefined' ? window.location.pathname : '';
      if (redirectOnFail && currentPathname.startsWith('/admin')) {
        router.push('/');
      }
      return null;
    } finally {
      setLoading(false);
      requestRef.current = false;
    }
  }, [normalizeAdmin, router]);

  useEffect(() => {
    const cachedAuth = typeof window !== 'undefined' ? sessionStorage.getItem('authDetails') : null;

    if (cachedAuth) {
      try {
        const parsed = JSON.parse(cachedAuth);
        const normalized = normalizeAdmin(parsed?.user);
        if (normalized) {
          setAdmin(normalized);
          setLoading(false);
        }
      } catch (error) {
        console.error('Admin auth cache parse failed:', error);
      }
    }

    loadAdmin({ redirectOnFail: true });
  }, [loadAdmin, normalizeAdmin]);

  const value = useMemo(() => ({
    admin,
    loading,
    refreshAdmin: () => loadAdmin({ redirectOnFail: true }),
    isAuthenticated: Boolean(admin),
  }), [admin, loading, loadAdmin]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  }
  return context;
}
