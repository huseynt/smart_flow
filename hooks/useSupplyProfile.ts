/**
 * useSupplyProfile Hook
 * Returns supply user profile (type-safe, null if not a supply user)
 */

'use client';

import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { SupplyUser, UserRole } from '@/types';

export function useSupplyProfile(): SupplyUser | null {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useSupplyProfile must be used within AuthProvider');
  }

  // Return profile only if user is a supply user
  if (context.role === UserRole.SUPPLY && context.profile) {
    return context.profile as SupplyUser;
  }

  return null;
}

/**
 * Ensure current user is supply and return profile
 * Throws error if user is not supply
 */
export function useRequireSupplyProfile(): SupplyUser {
  const profile = useSupplyProfile();

  if (!profile) {
    throw new Error('User is not a supply user');
  }

  return profile;
}
