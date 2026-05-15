/**
 * Authentication Service
 * Handles user creation and fetching from Firebase SQL database
 */

import { BaseUser, UserRole, UserProfile, SupplyUser, DistributionUser } from '@/types';
import { handleDataConnectError, executeMutation, executeQuery, getDataConnectInstance } from '../lib/dataConnect';

/**
 * Create a new user in the users table
 * Called after Firebase Auth signup
 * 
 * @param firebaseUid - Firebase Auth UID
 * @param email - User email
 * @param role - User role (supply or distribution)
 * @returns Created user object
 */
export async function createUser(
  firebaseUid: string,
  email: string,
  role: UserRole
): Promise<BaseUser> {
  try {
    console.log('Auth Service: createUser called for UID:', firebaseUid);
    
    // Create user object to return
    const newUser: BaseUser = {
      id: firebaseUid,
      firebase_uid: firebaseUid,
      email,
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Try to save to Firebase SQL via Data Connect
    try {
      const dataConnect = getDataConnectInstance();
      
      if (dataConnect) {
        const { mutationRef } = require('@firebase/data-connect');
        const createUserMutation = mutationRef(dataConnect, 'CreateUser');
        
        const result = await executeMutation(createUserMutation, {
          firebaseUid,
          email,
          role,
        });
        
        if (result) {
          console.log('Auth Service: User created in Firebase SQL:', firebaseUid);
          // Map Firebase SQL response to our format
          const userData = result.user || result;
          newUser.created_at = userData.createdAt || newUser.created_at;
          newUser.updated_at = userData.updatedAt || newUser.updated_at;
        }
      } else {
        console.warn('Data Connect not initialized, skipping SQL save');
      }
    } catch (dataConnectError) {
      console.warn('Failed to save user to Firebase SQL, falling back to localStorage:', dataConnectError);
    }
    
    // Always store in localStorage as fallback
    try {
      const users = JSON.parse(localStorage.getItem('users') || '{}');
      users[firebaseUid] = newUser;
      localStorage.setItem('users', JSON.stringify(users));
      localStorage.setItem(`user_${firebaseUid}`, JSON.stringify(newUser));
      console.log('Auth Service: User stored in localStorage (fallback):', newUser.id);
    } catch (e) {
      console.warn('localStorage not available (server-side render?):', e);
    }
    
    return newUser;
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error(handleDataConnectError(error));
  }
}

/**
 * Get user by Firebase UID
 * Used during login to fetch user from database
 * 
 * @param firebaseUid - Firebase Auth UID
 * @returns User object or null
 */
export async function getUserByFirebaseUid(firebaseUid: string): Promise<BaseUser | null> {
  try {
    console.log('Auth Service: getUserByFirebaseUid called for UID:', firebaseUid);
    
    // Try to fetch from Firebase SQL
    try {
      const dataConnect = getDataConnectInstance();
      
      if (dataConnect) {
        const { queryRef } = require('@firebase/data-connect');
        const getUserQuery = queryRef(dataConnect, 'GetUserByFirebaseUid');
        
        const result = await executeQuery(getUserQuery, {
          firebaseUid,
        });
        
        if (result) {
          console.log('Auth Service: User found in Firebase SQL:', firebaseUid);
          // Data Connect returns user data directly from the query
          const user = result.user || result;
          return {
            id: user.firebaseUid || firebaseUid,
            firebase_uid: user.firebaseUid,
            email: user.email,
            role: user.role,
            created_at: user.createdAt,
            updated_at: user.updatedAt,
          };
        }
      }
    } catch (dataConnectError) {
      console.warn('Failed to fetch from Firebase SQL, checking localStorage:', dataConnectError);
    }
    
    // Check localStorage as fallback
    try {
      const userData = localStorage.getItem(`user_${firebaseUid}`);
      if (userData) {
        const user = JSON.parse(userData) as BaseUser;
        console.log('Auth Service: User found in localStorage:', user.id);
        return user;
      }
    } catch (e) {
      console.warn('localStorage not available:', e);
    }

    console.log('Auth Service: User not found');
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw new Error(handleDataConnectError(error));
  }
}

/**
 * Get user by ID
 * 
 * @param userId - User ID
 * @returns User object or null
 */
export async function getUserById(userId: string): Promise<BaseUser | null> {
  try {
    // TODO: Implement Data Connect query
    return null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw new Error(handleDataConnectError(error));
  }
}

/**
 * Update user role
 * 
 * @param userId - User ID
 * @param role - New role
 * @returns Updated user object
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<BaseUser> {
  try {
    // TODO: Implement Data Connect mutation
    throw new Error('Not implemented');
  } catch (error) {
    console.error('Error updating user role:', error);
    throw new Error(handleDataConnectError(error));
  }
}
