/**
 * Authentication Service
 * Handles user creation and fetching from Firestore database
 */

import { BaseUser, UserRole } from '@/types';
import { db } from '@/lib/firebase';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

/**
 * Create a new user in Firestore "users" collection
 * Called after Firebase Auth signup
 */
export async function createUser(
  firebaseUid: string,
  email: string,
  role: UserRole
): Promise<BaseUser> {
  console.log('Auth Service: createUser called for UID:', firebaseUid);

  const now = new Date().toISOString();

  const newUser: BaseUser = {
    id: firebaseUid,
    firebase_uid: firebaseUid,
    email,
    role,
    created_at: now,
    updated_at: now,
  };

  await setDoc(doc(db, 'users', firebaseUid), {
    firebase_uid: firebaseUid,
    email,
    role,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  console.log('Auth Service: User created in Firestore:', firebaseUid);
  return newUser;
}

/**
 * Get user by Firebase UID from Firestore
 * Used during login to fetch user role and data
 */
export async function getUserByFirebaseUid(
  firebaseUid: string
): Promise<BaseUser | null> {
  console.log('Auth Service: getUserByFirebaseUid called for UID:', firebaseUid);

  const snap = await getDoc(doc(db, 'users', firebaseUid));

  if (!snap.exists()) {
    console.log('Auth Service: User not found in Firestore:', firebaseUid);
    return null;
  }

  const data = snap.data();
  console.log('Auth Service: User found in Firestore:', firebaseUid);

  return {
    id: firebaseUid,
    firebase_uid: firebaseUid,
    email: data.email,
    role: data.role,
    created_at: data.created_at?.toDate?.().toISOString() ?? data.created_at,
    updated_at: data.updated_at?.toDate?.().toISOString() ?? data.updated_at,
  };
}

/**
 * Get user by ID (alias for getByFirebaseUid — IDs are the same)
 */
export async function getUserById(userId: string): Promise<BaseUser | null> {
  return getUserByFirebaseUid(userId);
}

/**
 * Update user role in Firestore
 */
export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<BaseUser> {
  await updateDoc(doc(db, 'users', userId), {
    role,
    updated_at: serverTimestamp(),
  });

  const updated = await getUserByFirebaseUid(userId);
  if (!updated) throw new Error('User not found after role update');
  return updated;
}