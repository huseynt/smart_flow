// =====================================================
// ROLES & AUTHENTICATION
// =====================================================

export enum UserRole {
  SUPPLY = "supply",
  DISTRIBUTION = "distribution",
}

/**
 * Firebase Auth User (from Firebase Authentication)
 */
export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * Base User from SQL database
 */
export interface BaseUser {
  id: string; // UUID
  firebase_uid: string; // from Firebase Auth
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

/**
 * Supply User Profile
 */
export interface SupplyUser {
  id: string; // UUID
  user_id: string; // foreign key to users.id
  first_name: string;
  last_name: string;
  company_name: string;
  address: string;
  phone: string;
  voen: string; // Tax ID
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Distribution User Profile
 */
export interface DistributionUser {
  id: string; // UUID
  user_id: string; // foreign key to users.id
  first_name: string;
  last_name: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Union type for user profiles
 */
export type UserProfile = SupplyUser | DistributionUser;

/**
 * Complete user state (combining Firebase + SQL data)
 */
export interface AuthState {
  // Firebase user
  firebaseUser: FirebaseUser | null;

  // SQL database user
  dbUser: BaseUser | null;

  // User role
  role: UserRole | null;

  // Role-specific profile
  profile: UserProfile | null;

  // Loading state
  loading: boolean;

  // Authentication status
  isAuthenticated: boolean;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (role: UserRole, data: RegisterFormData) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  fetchCurrentUser: (firebaseUser: any) => Promise<void>;
}

// =====================================================
// FORM DATA TYPES
// =====================================================

export interface SupplyRegisterFormData {
  role: UserRole.SUPPLY;
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  address: string;
  phone: string;
  voen: string;
  image_url?: string;
  password: string;
  confirmPassword: string;
}

export interface DistributionRegisterFormData {
  role: UserRole.DISTRIBUTION;
  first_name: string;
  last_name: string;
  image_url?: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type RegisterFormData = SupplyRegisterFormData | DistributionRegisterFormData;

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface UpdateProfileFormData {
  first_name?: string;
  last_name?: string;
  company_name?: string;
  address?: string;
  phone?: string;
  voen?: string;
  image_url?: string;
}

// =====================================================
// UI & THEME
// =====================================================

export type Theme = "light" | "dark" | "system";
export type Language = "az" | "en" | "ru";
