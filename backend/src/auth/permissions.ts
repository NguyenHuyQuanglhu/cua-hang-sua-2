import type { Module, Permission, Permissions, UserRole } from '../types.js';
import { ROLE_HIERARCHY } from '../types.js';

/**
 * Default permissions per role based on RBAC hierarchy
 */
export const DEFAULT_PERMISSIONS: Record<UserRole, Permissions> = {
  owner: {
    // Full access to everything
    dashboard: ['view'],
    stores: ['view', 'add', 'edit', 'delete'],
    users: ['view', 'add', 'edit', 'delete'],
    products: ['view', 'add', 'edit', 'delete'],
    categories: ['view', 'add', 'edit', 'delete'],
    units: ['view', 'add', 'edit', 'delete'],
    sales: ['view', 'add', 'edit', 'delete'],
    purchases: ['view', 'add', 'edit', 'delete'],
    customers: ['view', 'add', 'edit', 'delete'],
    suppliers: ['view', 'add', 'edit', 'delete'],
    'cash-flow': ['view', 'add', 'edit', 'delete'],
    reports_shifts: ['view'],
    reports_income_statement: ['view'],
    reports_profit: ['view'],
    reports_debt: ['view'],
    reports_supplier_debt: ['view'],
    reports_transactions: ['view'],
    reports_supplier_debt_tracking: ['view'],
    reports_revenue: ['view'],
    reports_sold_products: ['view'],
    reports_inventory: ['view'],
    reports_ai_segmentation: ['view'],
    reports_ai_basket_analysis: ['view'],
    settings: ['view', 'edit'],
    pos: ['view', 'add'],
  },

  company_manager: {
    // All stores, no user management
    dashboard: ['view'],
    stores: ['view', 'edit'],
    users: ['view'], // read-only
    products: ['view', 'add', 'edit', 'delete'],
    categories: ['view', 'add', 'edit', 'delete'],
    units: ['view', 'add', 'edit', 'delete'],
    sales: ['view', 'add', 'edit'],
    purchases: ['view', 'add', 'edit'],
    customers: ['view', 'add', 'edit'],
    suppliers: ['view', 'add', 'edit'],
    'cash-flow': ['view', 'add', 'edit'],
    reports_shifts: ['view'],
    reports_income_statement: ['view'],
    reports_profit: ['view'],
    reports_debt: ['view'],
    reports_supplier_debt: ['view'],
    reports_transactions: ['view'],
    reports_supplier_debt_tracking: ['view'],
    reports_revenue: ['view'],
    reports_sold_products: ['view'],
    reports_inventory: ['view'],
    reports_ai_segmentation: ['view'],
    reports_ai_basket_analysis: ['view'],
    settings: ['view'],
    pos: ['view', 'add'],
  },

  store_manager: {
    // Assigned stores only
    dashboard: ['view'],
    products: ['view', 'add', 'edit'],
    categories: ['view', 'add', 'edit'],
    units: ['view', 'add', 'edit'],
    sales: ['view', 'add', 'edit'],
    purchases: ['view', 'add', 'edit'],
    customers: ['view', 'add', 'edit'],
    suppliers: ['view', 'add'],
    'cash-flow': ['view', 'add'],
    reports_shifts: ['view'],
    reports_profit: ['view'],
    reports_debt: ['view'],
    reports_transactions: ['view'],
    reports_revenue: ['view'],
    reports_sold_products: ['view'],
    reports_inventory: ['view'],
    pos: ['view', 'add'],
  },

  salesperson: {
    // POS and basic sales only
    dashboard: ['view'],
    products: ['view'],
    sales: ['view', 'add'],
    customers: ['view', 'add'],
    pos: ['view', 'add'],
  },
};

/**
 * Get effective permissions for a user (default + custom overrides)
 */
export function getEffectivePermissions(
  userRole: UserRole,
  customPermissions?: Permissions
): Permissions {
  const defaultPerms = DEFAULT_PERMISSIONS[userRole] || {};

  if (!customPermissions) {
    return { ...defaultPerms };
  }

  // Merge custom permissions with defaults (custom overrides default)
  const merged: Permissions = { ...defaultPerms };
  for (const [module, perms] of Object.entries(customPermissions)) {
    if (perms && perms.length > 0) {
      merged[module as Module] = perms;
    }
  }

  return merged;
}

/**
 * Check if user has a specific permission for a module
 */
export function hasPermission(
  userPermissions: Permissions | undefined,
  userRole: UserRole | undefined,
  module: Module,
  permission: Permission
): boolean {
  // Owner has all permissions
  if (userRole === 'owner') return true;

  // Get effective permissions
  const effectivePerms = userRole
    ? getEffectivePermissions(userRole, userPermissions)
    : userPermissions;

  const modulePermissions = effectivePerms?.[module];
  if (!modulePermissions) return false;

  return modulePermissions.includes(permission);
}


/**
 * Check if user can view a module
 */
export function canView(
  userPermissions: Permissions | undefined,
  userRole: UserRole | undefined,
  module: Module
): boolean {
  return hasPermission(userPermissions, userRole, module, 'view');
}

/**
 * Check if user can add to a module
 */
export function canAdd(
  userPermissions: Permissions | undefined,
  userRole: UserRole | undefined,
  module: Module
): boolean {
  return hasPermission(userPermissions, userRole, module, 'add');
}

/**
 * Check if user can edit in a module
 */
export function canEdit(
  userPermissions: Permissions | undefined,
  userRole: UserRole | undefined,
  module: Module
): boolean {
  return hasPermission(userPermissions, userRole, module, 'edit');
}

/**
 * Check if user can delete from a module
 */
export function canDelete(
  userPermissions: Permissions | undefined,
  userRole: UserRole | undefined,
  module: Module
): boolean {
  return hasPermission(userPermissions, userRole, module, 'delete');
}

/**
 * Get all permissions for a module
 */
export function getModulePermissions(
  userPermissions: Permissions | undefined,
  userRole: UserRole | undefined,
  module: Module
): Permission[] {
  // Owner has all permissions
  if (userRole === 'owner') {
    return ['view', 'add', 'edit', 'delete'];
  }

  const effectivePerms = userRole
    ? getEffectivePermissions(userRole, userPermissions)
    : userPermissions;

  return effectivePerms?.[module] || [];
}

/**
 * Check if user has any permission for a module
 */
export function hasAnyPermission(
  userPermissions: Permissions | undefined,
  userRole: UserRole | undefined,
  module: Module
): boolean {
  // Owner has all permissions
  if (userRole === 'owner') return true;

  const effectivePerms = userRole
    ? getEffectivePermissions(userRole, userPermissions)
    : userPermissions;

  const modulePermissions = effectivePerms?.[module];
  return modulePermissions !== undefined && modulePermissions.length > 0;
}

/**
 * Check if user has all specified permissions for a module
 */
export function hasAllPermissions(
  userPermissions: Permissions | undefined,
  userRole: UserRole | undefined,
  module: Module,
  requiredPermissions: Permission[]
): boolean {
  // Owner has all permissions
  if (userRole === 'owner') return true;

  return requiredPermissions.every(permission =>
    hasPermission(userPermissions, userRole, module, permission)
  );
}

/**
 * Get all accessible modules for a user
 */
export function getAccessibleModules(
  userPermissions: Permissions | undefined,
  userRole: UserRole | undefined
): Module[] {
  // Owner has access to all modules
  if (userRole === 'owner') {
    return Object.keys(DEFAULT_PERMISSIONS.owner) as Module[];
  }

  const effectivePerms = userRole
    ? getEffectivePermissions(userRole, userPermissions)
    : userPermissions;

  if (!effectivePerms) return [];

  return Object.keys(effectivePerms).filter(
    module => effectivePerms[module as Module]?.length ?? 0 > 0
  ) as Module[];
}

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
export function checkPermission(
  userPermissions: Permissions | undefined,
  userRole: UserRole | undefined,
  module: Module,
  permission: Permission
): PermissionCheckResult {
  // Owner has all permissions
  if (userRole === 'owner') {
    return { allowed: true };
  }

  const effectivePerms = userRole
    ? getEffectivePermissions(userRole, userPermissions)
    : userPermissions;

  // Check if user has any permissions defined
  if (!effectivePerms) {
    return {
      allowed: false,
      reason: 'Người dùng chưa được phân quyền',
    };
  }

  // Check module permissions
  const modulePermissions = effectivePerms[module];
  if (!modulePermissions || modulePermissions.length === 0) {
    return {
      allowed: false,
      reason: `Bạn không có quyền truy cập module này`,
    };
  }

  // Check specific permission
  if (!modulePermissions.includes(permission)) {
    const permissionNames: Record<Permission, string> = {
      view: 'xem',
      add: 'thêm',
      edit: 'sửa',
      delete: 'xóa',
    };
    return {
      allowed: false,
      reason: `Bạn không có quyền ${permissionNames[permission]}`,
    };
  }

  return { allowed: true };
}

/**
 * Create a permission checker function bound to user's permissions
 */
export function createPermissionChecker(
  userPermissions: Permissions | undefined,
  userRole: UserRole | undefined
) {
  return {
    hasPermission: (module: Module, permission: Permission) =>
      hasPermission(userPermissions, userRole, module, permission),
    canView: (module: Module) => canView(userPermissions, userRole, module),
    canAdd: (module: Module) => canAdd(userPermissions, userRole, module),
    canEdit: (module: Module) => canEdit(userPermissions, userRole, module),
    canDelete: (module: Module) => canDelete(userPermissions, userRole, module),
    getModulePermissions: (module: Module) =>
      getModulePermissions(userPermissions, userRole, module),
    hasAnyPermission: (module: Module) =>
      hasAnyPermission(userPermissions, userRole, module),
    hasAllPermissions: (module: Module, permissions: Permission[]) =>
      hasAllPermissions(userPermissions, userRole, module, permissions),
    getAccessibleModules: () => getAccessibleModules(userPermissions, userRole),
    checkPermission: (module: Module, permission: Permission) =>
      checkPermission(userPermissions, userRole, module, permission),
  };
}

/**
 * Check if a user can manage another user based on role hierarchy
 */
export function canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole];
}

/**
 * Get roles that a user can assign to others
 */
export function getAssignableRoles(userRole: UserRole): UserRole[] {
  const userLevel = ROLE_HIERARCHY[userRole];
  return (Object.keys(ROLE_HIERARCHY) as UserRole[]).filter(
    role => ROLE_HIERARCHY[role] < userLevel
  );
}
