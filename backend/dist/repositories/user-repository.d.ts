import type { Permissions, UserRole } from '../types.js';
/**
 * User entity interface
 */
export interface User {
    id: string;
    email: string;
    displayName?: string;
    role: UserRole;
    permissions?: Permissions;
    status: 'active' | 'inactive';
    failedLoginAttempts: number;
    lockedUntil?: string;
    createdAt?: string;
    updatedAt?: string;
}
/**
 * User with assigned stores
 */
export interface UserWithStores extends User {
    stores: UserStoreAssignment[];
}
/**
 * User-Store assignment with RBAC support
 */
export interface UserStoreAssignment {
    storeId: string;
    storeName: string;
    storeCode: string;
    roleOverride?: UserRole;
    permissionsOverride?: Permissions;
}
/**
 * Input for assigning a store to a user with optional role override
 */
export interface AssignStoreInput {
    storeId: string;
    roleOverride?: UserRole;
    permissionsOverride?: Permissions;
}
/**
 * Create user input
 */
export interface CreateUserInput {
    email: string;
    password: string;
    displayName?: string;
    role: UserRole;
    permissions?: Permissions;
    storeIds?: string[];
}
/**
 * Update user input
 */
export interface UpdateUserInput {
    email?: string;
    password?: string;
    displayName?: string;
    role?: UserRole;
    permissions?: Permissions;
    status?: 'active' | 'inactive';
    storeIds?: string[];
}
/**
 * User repository for managing users and user-store assignments
 */
export declare class UserRepository {
    /**
     * Find all users (for admin)
     */
    findAll(): Promise<User[]>;
    /**
     * Find all users assigned to a specific store
     */
    findByStore(storeId: string): Promise<UserWithStores[]>;
    /**
     * Find user by ID
     */
    findById(id: string): Promise<User | null>;
    /**
     * Find user by ID with stores
     */
    findByIdWithStores(id: string): Promise<UserWithStores | null>;
    /**
     * Find user by email
     */
    findByEmail(email: string): Promise<User | null>;
    /**
     * Check if email exists (for validation)
     */
    emailExists(email: string, excludeId?: string): Promise<boolean>;
    /**
     * Get stores assigned to a user with role/permission overrides
     */
    getUserStores(userId: string): Promise<UserStoreAssignment[]>;
    /**
     * Create a new user
     */
    create(input: CreateUserInput): Promise<User>;
    /**
     * Update an existing user
     */
    update(id: string, input: UpdateUserInput): Promise<User>;
    /**
     * Delete a user
     */
    delete(id: string): Promise<boolean>;
    /**
     * Assign stores to a user with optional role/permission overrides
     */
    assignStores(userId: string, storeIds: string[]): Promise<void>;
    /**
     * Assign a store to a user with role/permission overrides
     */
    assignStoreWithOverrides(userId: string, input: AssignStoreInput): Promise<void>;
    /**
     * Get user's effective role for a specific store
     * Returns roleOverride if set, otherwise returns user's base role
     */
    getEffectiveRoleForStore(userId: string, storeId: string): Promise<UserRole | null>;
    /**
     * Update store assignments (replace all)
     */
    updateStoreAssignments(userId: string, storeIds: string[]): Promise<void>;
    /**
     * Check if user has access to a store
     */
    hasStoreAccess(userId: string, storeId: string): Promise<boolean>;
    /**
     * Count users assigned to a store
     */
    countByStore(storeId: string): Promise<number>;
    /**
     * Remove a user's access to a specific store
     */
    removeStoreAccess(userId: string, storeId: string): Promise<boolean>;
}
export declare const userRepository: UserRepository;
//# sourceMappingURL=user-repository.d.ts.map