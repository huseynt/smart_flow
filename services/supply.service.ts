/**
 * Supply Service
 * Handles supply user profile operations via Firestore
 */

import { SupplyUser, UpdateProfileFormData } from '@/types';
import { db } from '@/lib/firebase';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

/**
 * Create a new supply user profile in Firestore "supply_users" collection
 * Called after user creation during registration
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
  console.log('Supply Service: createSupplyUser called for UID:', firebaseUid);

  const now = new Date().toISOString();

  const newSupplyUser: SupplyUser = {
    id: firebaseUid,
    user_id: firebaseUid,
    first_name: data.first_name,
    last_name: data.last_name,
    company_name: data.company_name,
    address: data.address,
    phone: data.phone,
    voen: data.voen,
    image_url: data.image_url || null,
    created_at: now,
    updated_at: now,
  };

  await setDoc(doc(db, 'supply_users', firebaseUid), {
    user_id: firebaseUid,
    first_name: data.first_name,
    last_name: data.last_name,
    company_name: data.company_name,
    address: data.address,
    phone: data.phone,
    voen: data.voen,
    image_url: data.image_url || null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  console.log('Supply Service: Supply user created in Firestore:', firebaseUid);
  return newSupplyUser;
}

/**
 * Get supply user profile by Firebase UID
 */
export async function getSupplyUser(
  firebaseUid: string
): Promise<SupplyUser | null> {
  console.log('Supply Service: getSupplyUser called for UID:', firebaseUid);

  const snap = await getDoc(doc(db, 'supply_users', firebaseUid));

  if (!snap.exists()) {
    console.log('Supply Service: Supply user not found:', firebaseUid);
    return null;
  }

  const data = snap.data();
  console.log('Supply Service: Supply user found in Firestore:', firebaseUid);

  return {
    id: firebaseUid,
    user_id: firebaseUid,
    first_name: data.first_name,
    last_name: data.last_name,
    company_name: data.company_name,
    address: data.address,
    phone: data.phone,
    voen: data.voen,
    image_url: data.image_url || null,
    created_at: data.created_at?.toDate?.().toISOString() ?? data.created_at,
    updated_at: data.updated_at?.toDate?.().toISOString() ?? data.updated_at,
  };
}

/**
 * Update supply user profile
 */
export async function updateSupplyUser(
  firebaseUid: string,
  data: Partial<UpdateProfileFormData>
): Promise<SupplyUser> {
  const updateData: Record<string, unknown> = {
    updated_at: serverTimestamp(),
  };

  if ('first_name' in data && data.first_name !== undefined)
    updateData.first_name = data.first_name;
  if ('last_name' in data && data.last_name !== undefined)
    updateData.last_name = data.last_name;
  if ('company_name' in data && data.company_name !== undefined)
    updateData.company_name = data.company_name;
  if ('address' in data && data.address !== undefined)
    updateData.address = data.address;
  if ('phone' in data && data.phone !== undefined)
    updateData.phone = data.phone;
  if ('voen' in data && data.voen !== undefined)
    updateData.voen = data.voen;
  if ('image_url' in data)
    updateData.image_url = data.image_url ?? null;

  await updateDoc(doc(db, 'supply_users', firebaseUid), updateData);

  const updated = await getSupplyUser(firebaseUid);
  if (!updated) throw new Error('Supply user not found after update');
  return updated;
}

/**
 * Delete supply user profile
 */
export async function deleteSupplyUser(firebaseUid: string): Promise<void> {
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'supply_users', firebaseUid));
  console.log('Supply Service: Supply user deleted from Firestore:', firebaseUid);
}