/**
 * useDistributionProfile Hook
 * Returns distribution user profile (type-safe, null if not a distribution user)
 */

'use client';

import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { DistributionUser, UserRole } from '@/types';

export function useDistributionProfile(): DistributionUser | null {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useDistributionProfile must be used within AuthProvider');
  }

  // Return profile only if user is a distribution user
  if (context.role === UserRole.DISTRIBUTION && context.profile) {
    return context.profile as DistributionUser;
  }

  return null;
}

/**
 * Ensure current user is distribution and return profile
 * Throws error if user is not distribution
 */
export function useRequireDistributionProfile(): DistributionUser {
  const profile = useDistributionProfile();

  if (!profile) {
    throw new Error('User is not a distribution user');
  }

  return profile;
}
