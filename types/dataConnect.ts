/**
 * Firebase Data Connect Type Definitions
 * These types correspond to the GraphQL schema operations
 * Generated for use with lib/dataConnect operations
 */

// ============================================================
// USER TYPES
// ============================================================

/**
 * User response from GetUserByFirebaseUid query
 */
export interface UserWithProfile {
  firebaseUid: string;
  email: string;
  role: 'supply' | 'distribution';
  createdAt: string;
  updatedAt: string;
  supplyUser?: SupplyUserResponse | null;
  distributionUser?: DistributionUserResponse | null;
}

/**
 * Supply user response
 */
export interface SupplyUserResponse {
  user: {
    firebaseUid: string;
    email: string;
    role: string;
  };
  firstName: string;
  lastName: string;
  companyName: string;
  address: string;
  phone: string;
  voen: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Distribution user response
 */
export interface DistributionUserResponse {
  user: {
    firebaseUid: string;
    email: string;
    role: string;
  };
  firstName: string;
  lastName: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// MUTATION RESPONSES
// ============================================================

/**
 * Response from CreateUser mutation
 */
export interface CreateUserResponse {
  user_insert: {
    firebaseUid: string;
    email: string;
    role: string;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Response from CreateSupplyUser mutation
 */
export interface CreateSupplyUserResponse {
  supplyUser_insert: SupplyUserResponse;
}

/**
 * Response from CreateDistributionUser mutation
 */
export interface CreateDistributionUserResponse {
  distributionUser_insert: DistributionUserResponse;
}

/**
 * Response from UpdateSupplyUser mutation
 */
export interface UpdateSupplyUserResponse {
  supplyUser_update: SupplyUserResponse;
}

/**
 * Response from UpdateDistributionUser mutation
 */
export interface UpdateDistributionUserResponse {
  distributionUser_update: DistributionUserResponse;
}

// ============================================================
// QUERY RESPONSES
// ============================================================

/**
 * Response from GetUserByFirebaseUid query
 */
export interface GetUserByFirebaseUidResponse {
  user: UserWithProfile | null;
}

/**
 * Response from GetSupplyUser query
 */
export interface GetSupplyUserResponse {
  supplyUser: SupplyUserResponse | null;
}

/**
 * Response from GetDistributionUser query
 */
export interface GetDistributionUserResponse {
  distributionUser: DistributionUserResponse | null;
}

/**
 * Response from GetUsersByRole query
 */
export interface GetUsersByRoleResponse {
  users: UserWithProfile[];
}

/**
 * Response from CheckUserExists query
 */
export interface CheckUserExistsResponse {
  users: Array<{
    firebaseUid: string;
    email: string;
  }>;
}

// ============================================================
// INPUT TYPES (for mutations)
// ============================================================

export interface CreateSupplyUserInput {
  firebaseUid: string;
  firstName: string;
  lastName: string;
  companyName: string;
  address: string;
  phone: string;
  voen: string;
  imageUrl?: string;
}

export interface CreateDistributionUserInput {
  firebaseUid: string;
  firstName: string;
  lastName: string;
  imageUrl?: string;
}

export interface UpdateSupplyUserInput {
  firebaseUid: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  address?: string;
  phone?: string;
  voen?: string;
  imageUrl?: string;
}

export interface UpdateDistributionUserInput {
  firebaseUid: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}
