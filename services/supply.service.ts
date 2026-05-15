/**
 * Supply Service
 * Handles supply user profile operations
 */

import { SupplyUser, UpdateProfileFormData } from '@/types';
import { handleDataConnectError, executeMutation, executeQuery, getDataConnectInstance } from '@/lib/dataConnect';

/**
 * Create a new supply user profile
 * Called after user creation during registration
 * 
 * @param firebaseUid - Firebase UID (used to link with user record)
 * @param data - Supply user data
 * @returns Created supply user
 */
export async function createSupplyUser(
  firebaseUid: string,
  data: {
    first_name: string;
    last_name: string;
    company_name: string;
    address: string;
    phone: string;
    voen: string;
    image_url?: string;
  }
): Promise<SupplyUser> {
  try {
    console.log('Supply Service: createSupplyUser called for firebase UID:', firebaseUid);
    
    // Create supply user object to return
    const newSupplyUser: SupplyUser = {
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
        const createSupplyUserMutation = mutationRef(dataConnect, 'CreateSupplyUser');
        
        const result = await executeMutation(createSupplyUserMutation, {
          firebaseUid,
          firstName: data.first_name,
          lastName: data.last_name,
          companyName: data.company_name,
          address: data.address,
          phone: data.phone,
          voen: data.voen,
          imageUrl: data.image_url || null,
        });
        
        if (result) {
          console.log('Supply Service: Supply user created in Firebase SQL:', firebaseUid);
          // Map Firebase SQL response to our format
          const supplyData = result.supplyUser || result;
          newSupplyUser.created_at = supplyData.createdAt || newSupplyUser.created_at;
          newSupplyUser.updated_at = supplyData.updatedAt || newSupplyUser.updated_at;
        }
      } else {
        console.warn('Data Connect not initialized, skipping SQL save');
      }
    } catch (dataConnectError) {
      console.warn('Failed to save supply user to Firebase SQL, falling back to localStorage:', dataConnectError);
    }
    
    // Always store in localStorage as fallback
    try {
      const supplyUsers = JSON.parse(localStorage.getItem('supply_users') || '{}');
      supplyUsers[firebaseUid] = newSupplyUser;
      localStorage.setItem('supply_users', JSON.stringify(supplyUsers));
      localStorage.setItem(`supply_user_${firebaseUid}`, JSON.stringify(newSupplyUser));
      console.log('Supply Service: Supply user stored in localStorage (fallback):', newSupplyUser.id);
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
    
    return newSupplyUser;
  } catch (error) {
    console.error('Error creating supply user:', error);
    throw new Error(handleDataConnectError(error));
  }
}

/**
 * Get supply user profile by firebase UID
 * 
 * @param firebaseUid - Firebase UID
 * @returns Supply user or null
 */
export async function getSupplyUser(firebaseUid: string): Promise<SupplyUser | null> {
  try {
    console.log('Supply Service: getSupplyUser called for firebase UID:', firebaseUid);
    
    // Try to fetch from Firebase SQL
    try {
      const dataConnect = getDataConnectInstance();
      
      if (dataConnect) {
        const { queryRef } = require('@firebase/data-connect');
        const getSupplyUserQuery = queryRef(dataConnect, 'GetSupplyUser');
        
        const result = await executeQuery(getSupplyUserQuery, {
          firebaseUid,
        });
        
        if (result) {
          console.log('Supply Service: Supply user found in Firebase SQL:', firebaseUid);
          // Data Connect returns supply user data directly from the query
          const supplyData = result.supplyUser || result;
          return {
            id: crypto.randomUUID(),
            user_id: supplyData.user?.firebaseUid || firebaseUid,
            first_name: supplyData.firstName,
            last_name: supplyData.lastName,
            company_name: supplyData.companyName,
            address: supplyData.address,
            phone: supplyData.phone,
            voen: supplyData.voen,
            image_url: supplyData.imageUrl || null,
            created_at: supplyData.createdAt,
            updated_at: supplyData.updatedAt,
          };
        }
      }
    } catch (dataConnectError) {
      console.warn('Failed to fetch from Firebase SQL, checking localStorage:', dataConnectError);
    }
    
    // Check localStorage as fallback
    try {
      const userData = localStorage.getItem(`supply_user_${firebaseUid}`);
      if (userData) {
        const user = JSON.parse(userData) as SupplyUser;
        console.log('Supply Service: Supply user found in localStorage:', user.id);
        return user;
      }
    } catch (e) {
      console.warn('localStorage not available:', e);
    }

    console.log('Supply Service: Supply user not found');
    return null;
  } catch (error) {
    console.error('Error getting supply user:', error);
    throw new Error(handleDataConnectError(error));
  }
}

/**
 * Update supply user profile
 * 
 * @param firebaseUid - Firebase UID
 * @param data - Fields to update
 * @returns Updated supply user
 */
export async function updateSupplyUser(
  firebaseUid: string,
  data: Partial<UpdateProfileFormData>
): Promise<SupplyUser> {
  try {
    // TODO: Implement Data Connect mutation
    throw new Error('Not implemented');
  } catch (error) {
    console.error('Error updating supply user:', error);
    throw new Error(handleDataConnectError(error));
  }
}

/**
 * Delete supply user profile
 * 
 * @param firebaseUid - Firebase UID
 */
export async function deleteSupplyUser(firebaseUid: string): Promise<void> {
  try {
    // TODO: Implement Data Connect mutation
    throw new Error('Not implemented');
  } catch (error) {
    console.error('Error deleting supply user:', error);
    throw new Error(handleDataConnectError(error));
  }
}
