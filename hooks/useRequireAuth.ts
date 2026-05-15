/**
 * useRequireAuth Hook
 * Protects routes - redirects to login if not authenticated
 * Optionally redirects to unauthorized if role doesn't match
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { UserRole } from '@/types';

interface UseRequireAuthOptions {
  requiredRole?: UserRole;
  redirectTo?: string;
}

/**
 * Protect a page - ensures user is authenticated
 * Optionally checks for specific role
 * 
 * Usage:
 * - useRequireAuth() - just authenticate
 * - useRequireAuth({ requiredRole: UserRole.SUPPLY }) - supply only
 * - useRequireAuth({ redirectTo: '/login' }) - custom redirect
 */
export function useRequireAuth(options?: UseRequireAuthOptions) {
  const context = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (context?.loading) {
      // Still loading, don't redirect yet
      return;
    }

    // Not authenticated - redirect to login
    if (!context?.firebaseUser || !context?.isAuthenticated) {
      router.push(options?.redirectTo || '/login');
      return;
    }

    // Check role if required
    if (options?.requiredRole && context?.role !== options.requiredRole) {
      router.push('/unauthorized');
      return;
    }
  }, [context?.firebaseUser, context?.role, context?.loading, options, router]);
}

/**
 * Check if user is authenticated (without redirecting)
 */
export function useIsAuthenticated(): boolean {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useIsAuthenticated must be used within AuthProvider');
  }

  return context.isAuthenticated && !context.loading;
}

/**
 * Get loading state
 */
export function useAuthLoading(): boolean {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthLoading must be used within AuthProvider');
  }

  return context.loading;
}
