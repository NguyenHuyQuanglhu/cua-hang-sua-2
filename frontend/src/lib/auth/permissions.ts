'use client';

import type { Module, Permission, Permissions } from '@/lib/types';

/**
 * Navigation item configuration with permission requirements
 */
export interface NavItem {
  path: string;
  label: string;
  icon?: string;
  module: Module;
  permission: Permission;
  children?: NavItem[];
}

/**
 * Permission checker utility class
 */
export interface PermissionChecker {
  hasPermission: (module: Module, permission: Permission) => boolean;
  canView: (module: Module) => boolean;
  canAdd: (module: Module) => boolean;
  canEdit: (module: Module) => boolean;
  canDelete: (module: Module) => boolean;
  getModulePermissions: (module: Module) => Permission[];
  hasAnyPermission: (module: Module) => boolean;
  getAccessibleModules: () => Module[];
}

/**
 * Creates a permission checker instance for the given permissions and role
 */
export function createPermissionChecker(
  permissions: Permissions | undefined,
  role: string | undefined
): PermissionChecker {
  const hasPermission = (module: Module, permission: Permission): boolean => {
    if (!permissions) return false;
    const modulePermissions = permissions[module];
    return modulePermissions?.includes(permission) ?? false;
  };

  const canView = (module: Module): boolean => hasPermission(module, 'view');
  const canAdd = (module: Module): boolean => hasPermission(module, 'add');
  const canEdit = (module: Module): boolean => hasPermission(module, 'edit');
  const canDelete = (module: Module): boolean => hasPermission(module, 'delete');

  const getModulePermissions = (module: Module): Permission[] => {
    if (!permissions) return [];
    return permissions[module] ?? [];
  };

  const hasAnyPermission = (module: Module): boolean => {
    if (!permissions) return false;
    const modulePermissions = permissions[module];
    return modulePermissions !== undefined && modulePermissions.length > 0;
  };

  const getAccessibleModules = (): Module[] => {
    if (!permissions) return [];
    return Object.keys(permissions).filter(
      (module) => hasAnyPermission(module as Module)
    ) as Module[];
  };

  return {
    hasPermission,
    canView,
    canAdd,
    canEdit,
    canDelete,
    getModulePermissions,
    hasAnyPermission,
    getAccessibleModules,
  };
}

/**
 * Map of routes to their required module and permission
 */
export const ROUTE_PERMISSIONS: Record<string, { module: Module; permission: Permission }> = {
  '/dashboard': { module: 'dashboard', permission: 'view' },
  '/pos': { module: 'pos', permission: 'view' },
  '/categories': { module: 'categories', permission: 'view' },
  '/units': { module: 'units', permission: 'view' },
  '/customers': { module: 'customers', permission: 'view' },
  '/suppliers': { module: 'suppliers', permission: 'view' },
  '/contractors': { module: 'suppliers', permission: 'view' },
  '/products': { module: 'products', permission: 'view' },
  '/purchases': { module: 'purchases', permission: 'view' },
  '/sales': { module: 'sales', permission: 'view' },
  '/cash-flow': { module: 'cash-flow', permission: 'view' },
  '/shifts': { module: 'reports_shifts', permission: 'view' },
  '/reports/income-statement': { module: 'reports_income_statement', permission: 'view' },
  '/reports/profit': { module: 'reports_profit', permission: 'view' },
  '/reports/debt': { module: 'reports_debt', permission: 'view' },
  '/reports/supplier-debt': { module: 'reports_supplier_debt', permission: 'view' },
  '/reports/transactions': { module: 'reports_transactions', permission: 'view' },
  '/reports/supplier-debt-tracking': { module: 'reports_supplier_debt_tracking', permission: 'view' },
  '/reports/revenue': { module: 'reports_revenue', permission: 'view' },
  '/reports/sold-products': { module: 'reports_sold_products', permission: 'view' },
  '/reports/inventory': { module: 'reports_inventory', permission: 'view' },
  '/reports/customer-segments': { module: 'reports_ai_segmentation', permission: 'view' },
  '/reports/market-basket-analysis': { module: 'reports_ai_basket_analysis', permission: 'view' },
  '/users': { module: 'users', permission: 'view' },
  '/settings': { module: 'settings', permission: 'view' },
};

/**
 * Check if a route requires permission and if user has access
 */
export function checkRoutePermission(
  pathname: string,
  permissions: Permissions | undefined,
  role: string | undefined
): { requiresPermission: boolean; hasAccess: boolean; module?: Module } {
  // Find matching route (handle dynamic routes)
  let routeConfig = ROUTE_PERMISSIONS[pathname];
  
  // If no exact match, try to find a prefix match
  if (!routeConfig) {
    for (const [route, config] of Object.entries(ROUTE_PERMISSIONS)) {
      if (pathname.startsWith(route + '/') || pathname === route) {
        routeConfig = config;
        break;
      }
    }
  }

  // Route doesn't require permission check
  if (!routeConfig) {
    return { requiresPermission: false, hasAccess: true };
  }

  const checker = createPermissionChecker(permissions, role);
  const hasAccess = checker.hasPermission(routeConfig.module, routeConfig.permission);

  return {
    requiresPermission: true,
    hasAccess,
    module: routeConfig.module,
  };
}
