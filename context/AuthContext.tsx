"use client";

import React, { createContext, useEffect, useState } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  signInWithEmail,
  signUpWithEmail,
  sendPasswordReset,
  signOutUser,
} from "@/lib/auth";
import { AuthContextType, User } from "@/types";

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    await signInWithEmail(email, password);
  };

  const signUp = async (
    email: string,
    password: string,
    name: string
  ): Promise<void> => {
    await signUpWithEmail(email, password, name);
  };

  const signOut = async (): Promise<void> => {
    await signOutUser();
  };

  const resetPassword = async (email: string): Promise<void> => {
    await sendPasswordReset(email);
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
