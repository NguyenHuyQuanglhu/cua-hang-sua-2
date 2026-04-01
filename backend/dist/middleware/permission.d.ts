/**
 * Permission Middleware for Multi-tenant RBAC
 *
 * Intercepts API requests and verifies permissions before processing.
 * Returns 403 Forbidden if user lacks required permissions.
 *
 * Requirements: 6.3, 6.4
 */
import { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth';
import type { Module, Permission, UserRole } from '../types';
/**
 * Permission check options
 */
export interface PermissionCheckOptions {
    /** Check store-specific permissions */
    checkStoreAccess?: boolean;
    /** Allow if user has any of the specified permissions */
    anyOf?: boolean;
}
/**
 * Create permission middleware for a specific module and action
 *
 * @param module - Module to check permission for
 * @param action - Required action (view, add, edit, delete)
 * @param options - Additional options
 *
 * Requirements: 6.3, 6.4
 */
export declare function requireModulePermission(module: Module, action: Permission, options?: PermissionCheckOptions): (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Create middleware to check multiple permissions (user must have ALL)
 */
export declare function requireAllPermissions(permissions: Array<{
    module: Module;
    action: Permission;
}>): (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Create middleware to check multiple permissions (user must have ANY)
 */
export declare function requireAnyPermission(permissions: Array<{
    module: Module;
    action: Permission;
}>): (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to verify store access
 * Checks if user has access to the store specified in request
 *
 * Requirements: 5.5, 3.4, 3.5
 */
export declare function requireStoreAccess(): (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to check minimum role level
 *
 * @param minRole - Minimum role required
 */
export declare function requireMinRole(minRole: UserRole): (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware to check if user can manage another user
 * Used for user management operations
 *
 * Requirements: 4.1, 4.2
 */
export declare function requireUserManagement(targetRoleParam?: string): (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Convenience middleware factories for common permission checks
 */
export declare const permissions: {
    viewDashboard: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    viewProducts: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    addProducts: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    editProducts: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    deleteProducts: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    viewCategories: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    addCategories: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    editCategories: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    deleteCategories: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    viewSales: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    addSales: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    editSales: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    deleteSales: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    viewPurchases: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    addPurchases: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    editPurchases: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    deletePurchases: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    viewCustomers: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    addCustomers: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    editCustomers: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    deleteCustomers: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    viewSuppliers: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    addSuppliers: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    editSuppliers: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    deleteSuppliers: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    viewUsers: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    addUsers: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    editUsers: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    deleteUsers: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    viewStores: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    addStores: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    editStores: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    deleteStores: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    viewSettings: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    editSettings: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    viewPOS: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    usePOS: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    viewCashFlow: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    addCashFlow: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    editCashFlow: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    deleteCashFlow: () => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
};
//# sourceMappingURL=permission.d.ts.map