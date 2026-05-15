/**
 * useRole Hook
 * Returns current user's role
 */

'use client';

import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { UserRole } from '@/types';

export function useRole(): UserRole | null {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useRole must be used within AuthProvider');
  }

  return context.role;
}

/**
 * useIsSupply Hook
 * Check if current user is a supply user
 */
export function useIsSupply(): boolean {
  const role = useRole();
  return role === UserRole.SUPPLY;
}

/**
 * useIsDistribution Hook
 * Check if current user is a distribution user
 */
export function useIsDistribution(): boolean {
  const role = useRole();
  return role === UserRole.DISTRIBUTION;
}
