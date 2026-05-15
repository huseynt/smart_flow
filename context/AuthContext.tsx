'use client';

import React, { createContext, useEffect, useState, useCallback } from 'react';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  signInWithEmail,
  signUpWithEmail,
  sendPasswordReset,
  signOutUser,
} from '@/lib/auth';
import {
  AuthContextType,
  AuthState,
  FirebaseUser as AuthFirebaseUser,
  BaseUser,
  UserRole,
  UserProfile,
  RegisterFormData,
} from '@/types';
import * as authService from '@/services/auth.service';
import * as supplyService from '@/services/supply.service';
import * as distributionService from '@/services/distribution.service';
import * as usersService from '@/services/users.service';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * AuthProvider Component
 * Manages authentication state including Firebase user and database user profile
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    firebaseUser: null,
    dbUser: null,
    role: null,
    profile: null,
    loading: true,
    isAuthenticated: false,
  });

  /**
   * Fetch current user from database
   * Called after Firebase authentication to get role and profile
   */
  const fetchCurrentUser = useCallback(async (firebaseUser: AuthUser) => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true }));

      // Convert Firebase user to our format
      const authFirebaseUser: AuthFirebaseUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      };

      // Fetch complete user data (base + profile)
      const userState = await usersService.getCurrentUser(
        firebaseUser.uid,
        authFirebaseUser
      );

      setAuthState((prev) => ({
        ...prev,
        ...userState,
        loading: false,
      }));
    } catch (error) {
      console.error('Error fetching current user:', error);
      setAuthState((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  }, []);

  /**
   * Refresh user data
   */
  const refreshUser = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      await fetchCurrentUser(firebaseUser);
    }
  }, [fetchCurrentUser]);

  /**
   * Listen to Firebase auth state changes
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // User is logged in, fetch profile data
          await fetchCurrentUser(firebaseUser);
        } else {
          // User is logged out
          setAuthState({
            firebaseUser: null,
            dbUser: null,
            role: null,
            profile: null,
            loading: false,
            isAuthenticated: false,
          });
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setAuthState((prev) => ({ ...prev, loading: false }));
      }
    });

    return () => unsubscribe();
  }, [fetchCurrentUser]);

  /**
   * Login user
   */
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      try {
        setAuthState((prev) => ({ ...prev, loading: true }));

        // Firebase authentication
        const firebaseUser = await signInWithEmail(email, password);

        if (firebaseUser) {
          // Fetch user profile from database
          await fetchCurrentUser(firebaseUser);
        }
      } catch (error) {
        console.error('Login error:', error);
        setAuthState((prev) => ({ ...prev, loading: false }));
        throw error;
      }
    },
    [fetchCurrentUser]
  );

  /**
   * Register user with role
   */
  const register = useCallback(
    async (role: UserRole, data: RegisterFormData): Promise<void> => {
      try {
        console.log('AuthContext.register started with role:', role);
        setAuthState((prev) => ({ ...prev, loading: true }));

        const { email, password } = data;
        const firstName =
          'first_name' in data
            ? data.first_name
            : '';
        const lastName =
          'last_name' in data
            ? data.last_name
            : '';

        // Step 1: Create Firebase Auth account
        console.log('Step 1: Creating Firebase account for email:', email);
        const firebaseUser = await signUpWithEmail(
          email,
          password,
          `${firstName} ${lastName}`
        );

        if (!firebaseUser) {
          throw new Error('Failed to create Firebase account');
        }
        console.log('Step 1 complete: Firebase user created with UID:', firebaseUser.uid);

        // Step 2: Create user in database
        console.log('Step 2: Creating database user record');
        const dbUser = await authService.createUser(
          firebaseUser.uid,
          email,
          role
        );
        console.log('Step 2 complete: Database user created with ID:', dbUser.id);

        // Step 3: Create role-specific profile
        console.log('Step 3: Creating role-specific profile for role:', role);
        let profile: UserProfile | null = null;

        if (role === UserRole.SUPPLY && 'company_name' in data) {
          profile = await supplyService.createSupplyUser(firebaseUser.uid, {
            first_name: data.first_name,
            last_name: data.last_name,
            company_name: data.company_name,
            address: data.address,
            phone: data.phone,
            voen: data.voen,
            image_url: data.image_url,
          });
          console.log('Step 3 complete: Supply user profile created with ID:', profile?.id);
        } else if (role === UserRole.DISTRIBUTION && !('company_name' in data)) {
          profile = await distributionService.createDistributionUser(
            firebaseUser.uid,
            {
              first_name: data.first_name,
              last_name: data.last_name,
              image_url: data.image_url,
            }
          );
          console.log('Step 3 complete: Distribution user profile created with ID:', profile?.id);
        }

        // Step 4: Update auth state
        console.log('Step 4: Updating auth state');
        const authFirebaseUser: AuthFirebaseUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };

        setAuthState({
          firebaseUser: authFirebaseUser,
          dbUser,
          role,
          profile,
          loading: false,
          isAuthenticated: true,
        });
        console.log('Registration complete: User is now authenticated');
      } catch (error) {
        console.error('Register error:', error);
        setAuthState((prev) => ({ ...prev, loading: false }));
        throw error;
      }
    },
    []
  );

  /**
   * Reset password for user
   */
  const resetPassword = useCallback(async (email: string): Promise<void> => {
    try {
      await sendPasswordReset(email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true }));
      await signOutUser();
      setAuthState({
        firebaseUser: null,
        dbUser: null,
        role: null,
        profile: null,
        loading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Logout error:', error);
      setAuthState((prev) => ({ ...prev, loading: false }));
      throw error;
    }
  }, []);

  const value: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    resetPassword,
    refreshUser,
    fetchCurrentUser,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
