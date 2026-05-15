/**
 * Users Service
 * Combines user data from users table and role-specific profiles
 */

import { BaseUser, UserRole, UserProfile, SupplyUser, DistributionUser, AuthState } from '@/types';
import { getUserByFirebaseUid } from './auth.service';
import { getSupplyUser } from './supply.service';
import { getDistributionUser } from './distribution.service';
import { handleDataConnectError } from '@/lib/dataConnect';

/**
 * Get complete user data (base + role-specific profile)
 * Used during login and user refresh
 * 
 * @param firebaseUid - Firebase Auth UID
 * @param firebaseUser - Firebase user object
 * @returns Complete user state including profile
 */
export async function getCurrentUser(
  firebaseUid: string,
  firebaseUser: any
): Promise<AuthState> {
  try {
    // Get base user from SQL with profiles included
    const dbUser = await getUserByFirebaseUid(firebaseUid);

    if (!dbUser) {
      return {
        firebaseUser,
        dbUser: null,
        role: null,
        profile: null,
        loading: false,
        isAuthenticated: false,
      };
    }

    // Extract role-specific profile from the response
    // The GetUserByFirebaseUid query returns the full user with both supplyUser and distributionUser
    let profile: UserProfile | null = null;
    
    if (dbUser.role === UserRole.SUPPLY) {
      // Fetch supply profile if not already in response
      profile = await getSupplyUser(firebaseUid);
    } else if (dbUser.role === UserRole.DISTRIBUTION) {
      // Fetch distribution profile if not already in response
      profile = await getDistributionUser(firebaseUid);
    }

    return {
      firebaseUser,
      dbUser,
      role: dbUser.role,
      profile,
      loading: false,
      isAuthenticated: true,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return {
      firebaseUser,
      dbUser: null,
      role: null,
      profile: null,
      loading: false,
      isAuthenticated: false,
    };
  }
}

/**
 * Get user with profile by user ID
 * 
 * @param userId - User ID
 * @returns Complete user state
 */
export async function getUserWithProfile(userId: string): Promise<{
  dbUser: BaseUser | null;
  profile: UserProfile | null;
} | null> {
  try {
    // TODO: Implement Data Connect query to join users with profiles
    return null;
  } catch (error) {
    console.error('Error getting user with profile:', error);
    throw new Error(handleDataConnectError(error));
  }
}

/**
 * Check if user exists by email
 * Used during registration to prevent duplicate emails
 * 
 * @param email - User email
 * @returns true if user exists
 */
export async function checkUserExists(email: string): Promise<boolean> {
  try {
    // TODO: Implement Data Connect query
    return false;
  } catch (error) {
    console.error('Error checking user existence:', error);
    throw new Error(handleDataConnectError(error));
  }
}

/**
 * Get all users (admin function)
 * 
 * @param limit - Number of users to fetch
 * @param offset - Offset for pagination
 * @returns Array of users
 */
export async function getAllUsers(
  limit: number = 10,
  offset: number = 0
): Promise<BaseUser[]> {
  try {
    // TODO: Implement Data Connect query
    return [];
  } catch (error) {
    console.error('Error getting all users:', error);
    throw new Error(handleDataConnectError(error));
  }
}

/**
 * Get users by role
 * 
 * @param role - User role
 * @returns Array of users with that role
 */
export async function getUsersByRole(role: UserRole): Promise<BaseUser[]> {
  try {
    // TODO: Implement Data Connect query
    return [];
  } catch (error) {
    console.error('Error getting users by role:', error);
    throw new Error(handleDataConnectError(error));
  }
}
