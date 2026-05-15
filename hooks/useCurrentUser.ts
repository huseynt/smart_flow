/**
 * useCurrentUser Hook
 * Returns current user data from AuthContext
 */

'use client';

import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { BaseUser, UserProfile, UserRole } from '@/types';

interface UseCurrentUserReturn {
  dbUser: BaseUser | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
}

export function useCurrentUser(): UseCurrentUserReturn {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useCurrentUser must be used within AuthProvider');
  }

  return {
    dbUser: context.dbUser,
    profile: context.profile,
    role: context.role,
    loading: context.loading,
  };
}
