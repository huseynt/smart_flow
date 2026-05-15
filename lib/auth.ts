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
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential.user;
  } catch (error: unknown) {
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
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Update profile with display name
    await updateProfile(user, { displayName });

    // Refresh user to get updated displayName
    await user.reload();

    return user;
  } catch (error: unknown) {
    const firebaseError = error as { code?: string };
    throw new Error(getFirebaseErrorMessage(firebaseError.code || ""));
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: unknown) {
    const firebaseError = error as { code?: string };
    throw new Error(getFirebaseErrorMessage(firebaseError.code || ""));
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error: unknown) {
    const firebaseError = error as { code?: string };
    throw new Error(getFirebaseErrorMessage(firebaseError.code || ""));
  }
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}
