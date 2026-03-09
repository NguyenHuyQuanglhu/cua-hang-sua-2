/**
 * Backend Type Definitions
 *
 * This file contains shared type definitions for the backend.
 */
export type Permission = 'view' | 'add' | 'edit' | 'delete';
export type Module = 'dashboard' | 'categories' | 'units' | 'products' | 'purchases' | 'suppliers' | 'sales' | 'customers' | 'cash-flow' | 'reports_shifts' | 'reports_income_statement' | 'reports_profit' | 'reports_debt' | 'reports_supplier_debt' | 'reports_transactions' | 'reports_supplier_debt_tracking' | 'reports_revenue' | 'reports_sold_products' | 'reports_inventory' | 'reports_ai_segmentation' | 'reports_ai_basket_analysis' | 'users' | 'settings' | 'pos' | 'ai_forecast' | 'stores';
export type Permissions = {
    [key in Module]?: Permission[];
};
/**
 * Role hierarchy for Multi-tenant RBAC
 * owner > company_manager > store_manager > salesperson
 */
export type UserRole = 'owner' | 'company_manager' | 'store_manager' | 'salesperson';
/**
 * Role hierarchy levels (higher number = more permissions)
 */
export declare const ROLE_HIERARCHY: Record<UserRole, number>;
/**
 * Check if a role has higher or equal authority than another role
 */
export declare function hasRoleAuthority(userRole: UserRole, requiredRole: UserRole): boolean;
/**
 * Get roles that a user can manage (roles below their own)
 */
export declare function getManageableRoles(userRole: UserRole): UserRole[];
//# sourceMappingURL=types.d.ts.map