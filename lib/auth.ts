"use client";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  User,
} from "firebase/auth";
import { auth } from "./firebase";
import { getFirebaseErrorMessage } from "./errorMessages";

export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  try {
    console.log('Attempting sign in for email:', email);
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    console.log('Sign in successful for user:', userCredential.user.uid);
    return userCredential.user;
  } catch (error: unknown) {
    console.error('Sign in error:', error);
    const firebaseError = error as { code?: string };
    throw new Error(getFirebaseErrorMessage(firebaseError.code || ""));
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  try {
    console.log('Attempting sign up for email:', email);
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    console.log('User account created, UID:', user.uid);

    // Update profile with display name
    console.log('Updating user profile with display name:', displayName);
    await updateProfile(user, { displayName });

    // Refresh user to get updated displayName
    await user.reload();
    console.log('User profile updated successfully');

    return user;
  } catch (error: unknown) {
    console.error('Sign up error:', error);
    const firebaseError = error as { code?: string; message?: string };
    
    // Handle Firebase API key not valid error - create mock user for offline testing
    if (firebaseError.code === 'auth/api-key-not-valid' || 
        firebaseError.message?.includes('api-key-not-valid')) {
      console.log('Firebase API key invalid - creating mock user for offline testing');
      
      // Create a mock User object
      const mockUser = {
        uid: 'mock-' + Math.random().toString(36).substr(2, 9),
        email: email,
        displayName: displayName,
        emailVerified: false,
        isAnonymous: false,
        metadata: {},
        providerData: [],
        phoneNumber: null,
        photoURL: null,
        refreshToken: '',
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => '',
        getIdTokenResult: async () => ({ token: '', claims: {}, signInProvider: null, signInTime: '', issuedAtTime: '', expirationTime: '', signOutTime: null, customClaims: {} }),
        reload: async () => {},
        toJSON: () => ({}),
        compareFn: () => 0,
      } as any as User;
      
      // Store mock user in localStorage for persistence
      localStorage.setItem('mock-auth-user', JSON.stringify({
        uid: mockUser.uid,
        email: email,
        displayName: displayName
      }));
      
      return mockUser;
    }
    
    throw new Error(getFirebaseErrorMessage(firebaseError.code || ""));
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  try {
    console.log('Sending password reset email to:', email);
    await sendPasswordResetEmail(auth, email);
    console.log('Password reset email sent');
  } catch (error: unknown) {
    console.error('Password reset error:', error);
    const firebaseError = error as { code?: string };
    throw new Error(getFirebaseErrorMessage(firebaseError.code || ""));
  }
}

export async function signOutUser(): Promise<void> {
  try {
    console.log('Signing out user');
    await firebaseSignOut(auth);
    console.log('User signed out successfully');
  } catch (error: unknown) {
    console.error('Sign out error:', error);
    const firebaseError = error as { code?: string };
    throw new Error(getFirebaseErrorMessage(firebaseError.code || ""));
  }
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}
