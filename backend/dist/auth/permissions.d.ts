import type { Module, Permission, Permissions, UserRole } from '../types.js';
/**
 * Default permissions per role based on RBAC hierarchy
 */
export declare const DEFAULT_PERMISSIONS: Record<UserRole, Permissions>;
/**
 * Get effective permissions for a user (default + custom overrides)
 */
export declare function getEffectivePermissions(userRole: UserRole, customPermissions?: Permissions): Permissions;
/**
 * Check if user has a specific permission for a module
 */
export declare function hasPermission(userPermissions: Permissions | undefined, userRole: UserRole | undefined, module: Module, permission: Permission): boolean;
/**
 * Check if user can view a module
 */
export declare function canView(userPermissions: Permissions | undefined, userRole: UserRole | undefined, module: Module): boolean;
/**
 * Check if user can add to a module
 */
export declare function canAdd(userPermissions: Permissions | undefined, userRole: UserRole | undefined, module: Module): boolean;
/**
 * Check if user can edit in a module
 */
export declare function canEdit(userPermissions: Permissions | undefined, userRole: UserRole | undefined, module: Module): boolean;
/**
 * Check if user can delete from a module
 */
export declare function canDelete(userPermissions: Permissions | undefined, userRole: UserRole | undefined, module: Module): boolean;
/**
 * Get all permissions for a module
 */
export declare function getModulePermissions(userPermissions: Permissions | undefined, userRole: UserRole | undefined, module: Module): Permission[];
/**
 * Check if user has any permission for a module
 */
export declare function hasAnyPermission(userPermissions: Permissions | undefined, userRole: UserRole | undefined, module: Module): boolean;
/**
 * Check if user has all specified permissions for a module
 */
export declare function hasAllPermissions(userPermissions: Permissions | undefined, userRole: UserRole | undefined, module: Module, requiredPermissions: Permission[]): boolean;
/**
 * Get all accessible modules for a user
 */
export declare function getAccessibleModules(userPermissions: Permissions | undefined, userRole: UserRole | undefined): Module[];
/**
 * Permission check result with details
 */
export interface PermissionCheckResult {
    allowed: boolean;
    reason?: string;
}
/**
 * Check permission with detailed result
 */
export declare function checkPermission(userPermissions: Permissions | undefined, userRole: UserRole | undefined, module: Module, permission: Permission): PermissionCheckResult;
/**
 * Create a permission checker function bound to user's permissions
 */
export declare function createPermissionChecker(userPermissions: Permissions | undefined, userRole: UserRole | undefined): {
    hasPermission: (module: Module, permission: Permission) => boolean;
    canView: (module: Module) => boolean;
    canAdd: (module: Module) => boolean;
    canEdit: (module: Module) => boolean;
    canDelete: (module: Module) => boolean;
    getModulePermissions: (module: Module) => Permission[];
    hasAnyPermission: (module: Module) => boolean;
    hasAllPermissions: (module: Module, permissions: Permission[]) => boolean;
    getAccessibleModules: () => Module[];
    checkPermission: (module: Module, permission: Permission) => PermissionCheckResult;
};
/**
 * Check if a user can manage another user based on role hierarchy
 */
export declare function canManageUser(managerRole: UserRole, targetRole: UserRole): boolean;
/**
 * Get roles that a user can assign to others
 */
export declare function getAssignableRoles(userRole: UserRole): UserRole[];
//# sourceMappingURL=permissions.d.ts.map