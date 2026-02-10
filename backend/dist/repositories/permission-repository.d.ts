/**
 * Permission Repository
 *
 * Manages custom permissions per user per module with store-specific support.
 * These permissions override the default role-based permissions.
 */
import type { Module, Permission, Permissions } from '../types.js';
/**
 * Permission record from database
 */
export interface PermissionRecord {
    id: string;
    userId: string;
    module: Module;
    actions: Permission[];
    storeId: string | null;
    createdAt: string;
    updatedAt: string;
}
/**
 * Input for creating/updating a permission
 */
export interface SetPermissionInput {
    userId: string;
    module: Module;
    actions: Permission[];
    storeId?: string | null;
}
/**
 * Permission repository for managing custom user permissions
 */
export declare class PermissionRepository {
    /**
     * Get all custom permissions for a user
     */
    getByUserId(userId: string): Promise<PermissionRecord[]>;
    /**
     * Get custom permissions for a user for a specific store
     * Returns both global permissions (storeId = NULL) and store-specific permissions
     */
    getByUserAndStore(userId: string, storeId: string): Promise<PermissionRecord[]>;
    /**
     * Get a specific permission record
     */
    getByUserModuleStore(userId: string, module: Module, storeId: string | null): Promise<PermissionRecord | null>;
    /**
     * Set permission for a user on a module (create or update)
     */
    setPermission(input: SetPermissionInput): Promise<PermissionRecord>;
    /**
     * Set multiple permissions for a user at once
     */
    setPermissions(userId: string, permissions: Permissions, storeId?: string | null): Promise<void>;
    /**
     * Delete a specific permission
     */
    deletePermission(userId: string, module: Module, storeId: string | null): Promise<boolean>;
    /**
     * Delete all permissions for a user
     */
    deleteAllForUser(userId: string): Promise<boolean>;
    /**
     * Delete all permissions for a specific store
     */
    deleteAllForStore(storeId: string): Promise<boolean>;
    /**
     * Get effective permissions for a user for a specific store
     * Merges global permissions with store-specific permissions
     * Store-specific permissions take precedence
     */
    getEffectivePermissions(userId: string, storeId: string): Promise<Permissions>;
    /**
     * Convert user's custom permissions to Permissions object
     */
    toPermissionsObject(userId: string): Promise<Permissions>;
    /**
     * Check if user has a specific permission for a module in a store
     */
    hasPermission(userId: string, module: Module, action: Permission, storeId?: string): Promise<boolean>;
}
export declare const permissionRepository: PermissionRepository;
//# sourceMappingURL=permission-repository.d.ts.map