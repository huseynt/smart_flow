/**
 * Distribution Service
 * Handles distribution user profile operations
 */

import { DistributionUser, UpdateProfileFormData } from '@/types';
import { handleDataConnectError, executeMutation, executeQuery, getDataConnectInstance } from '@/lib/dataConnect';

/**
 * Create a new distribution user profile
 * Called after user creation during registration
 * 
 * @param firebaseUid - Firebase UID (used to link with user record)
 * @param data - Distribution user data
 * @returns Created distribution user
 */
export async function createDistributionUser(
  firebaseUid: string,
  data: {
    first_name: string;
    last_name: string;
    image_url?: string;
  }
): Promise<DistributionUser> {
  try {
    console.log('Distribution Service: createDistributionUser called for firebase UID:', firebaseUid);
    
    // Create distribution user object to return
    const newDistributionUser: DistributionUser = {
      id: crypto.randomUUID(),
      user_id: firebaseUid,
      ...data,
      image_url: data.image_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Try to save to Firebase SQL via Data Connect
    try {
      const dataConnect = getDataConnectInstance();
      
      if (dataConnect) {
        const { mutationRef } = require('@firebase/data-connect');
        const createDistributionUserMutation = mutationRef(dataConnect, 'CreateDistributionUser');
        
        const result = await executeMutation(createDistributionUserMutation, {
          firebaseUid,
          firstName: data.first_name,
          lastName: data.last_name,
          imageUrl: data.image_url || null,
        });
        
        if (result) {
          console.log('Distribution Service: Distribution user created in Firebase SQL:', firebaseUid);
          // Map Firebase SQL response to our format
          const distData = (result as { distributionUser?: any })?.distributionUser || (result as any);
          newDistributionUser.created_at = distData?.createdAt || newDistributionUser.created_at;
          newDistributionUser.updated_at = distData?.updatedAt || newDistributionUser.updated_at;
        }
      } else {
        console.warn('Data Connect not initialized, skipping SQL save');
      }
    } catch (dataConnectError) {
      console.warn('Failed to save distribution user to Firebase SQL, falling back to localStorage:', dataConnectError);
    }
    
    // Always store in localStorage as fallback
    try {
      const distUsers = JSON.parse(localStorage.getItem('distribution_users') || '{}');
      distUsers[firebaseUid] = newDistributionUser;
      localStorage.setItem('distribution_users', JSON.stringify(distUsers));
      localStorage.setItem(`distribution_user_${firebaseUid}`, JSON.stringify(newDistributionUser));
      console.log('Distribution Service: Distribution user stored in localStorage (fallback):', newDistributionUser.id);
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
    
    return newDistributionUser;
  } catch (error) {
    console.error('Error creating distribution user:', error);
    throw new Error(handleDataConnectError(error));
  }
}

/**
 * Get distribution user profile by firebase UID
 * 
 * @param firebaseUid - Firebase UID
 * @returns Distribution user or null
 */
export async function getDistributionUser(firebaseUid: string): Promise<DistributionUser | null> {
  try {
    console.log('Distribution Service: getDistributionUser called for firebase UID:', firebaseUid);
    
    // Try to fetch from Firebase SQL
    try {
      const dataConnect = getDataConnectInstance();
      
      if (dataConnect) {
        const { queryRef } = require('@firebase/data-connect');
        const getDistributionUserQuery = queryRef(dataConnect, 'GetDistributionUser');
        
        const result = await executeQuery(getDistributionUserQuery, {
          firebaseUid,
        });
        
        if (result) {
          console.log('Distribution Service: Distribution user found in Firebase SQL:', firebaseUid);
          // Data Connect returns distribution user data directly from the query
          const distData = (result as { distributionUser?: any }).distributionUser || result;
          return {
            id: crypto.randomUUID(),
            user_id: distData.user?.firebaseUid || firebaseUid,
            first_name: distData.firstName,
            last_name: distData.lastName,
            image_url: distData.imageUrl || null,
            created_at: distData.createdAt,
            updated_at: distData.updatedAt,
          };
        }
      }
    } catch (dataConnectError) {
      console.warn('Failed to fetch from Firebase SQL, checking localStorage:', dataConnectError);
    }
    
    // Check localStorage as fallback
    try {
      const userData = localStorage.getItem(`distribution_user_${firebaseUid}`);
      if (userData) {
        const user = JSON.parse(userData) as DistributionUser;
        console.log('Distribution Service: Distribution user found in localStorage:', user.id);
        return user;
      }
    } catch (e) {
      console.warn('localStorage not available:', e);
    }

    console.log('Distribution Service: Distribution user not found');
    return null;
  } catch (error) {
    console.error('Error getting distribution user:', error);
    throw new Error(handleDataConnectError(error));
  }
}

/**
 * Update distribution user profile
 * 
 * @param firebaseUid - Firebase UID
 * @param data - Fields to update
 * @returns Updated distribution user
 */
export async function updateDistributionUser(
  firebaseUid: string,
  data: Partial<UpdateProfileFormData>
): Promise<DistributionUser> {
  try {
    // TODO: Implement Data Connect mutation
    throw new Error('Not implemented');
  } catch (error) {
    console.error('Error updating distribution user:', error);
    throw new Error(handleDataConnectError(error));
  }
}

/**
 * Delete distribution user profile
 * 
 * @param firebaseUid - Firebase UID
 */
export async function deleteDistributionUser(firebaseUid: string): Promise<void> {
  try {
    // TODO: Implement Data Connect mutation
    throw new Error('Not implemented');
  } catch (error) {
    console.error('Error deleting distribution user:', error);
    throw new Error(handleDataConnectError(error));
  }
}
