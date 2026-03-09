"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PERMISSIONS = void 0;
exports.getEffectivePermissions = getEffectivePermissions;
exports.hasPermission = hasPermission;
exports.canView = canView;
exports.canAdd = canAdd;
exports.canEdit = canEdit;
exports.canDelete = canDelete;
exports.getModulePermissions = getModulePermissions;
exports.hasAnyPermission = hasAnyPermission;
exports.hasAllPermissions = hasAllPermissions;
exports.getAccessibleModules = getAccessibleModules;
exports.checkPermission = checkPermission;
exports.createPermissionChecker = createPermissionChecker;
exports.canManageUser = canManageUser;
exports.getAssignableRoles = getAssignableRoles;
const types_js_1 = require("../types.js");
/**
 * Default permissions per role based on RBAC hierarchy
 */
exports.DEFAULT_PERMISSIONS = {
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
function getEffectivePermissions(userRole, customPermissions) {
    const defaultPerms = exports.DEFAULT_PERMISSIONS[userRole] || {};
    if (!customPermissions) {
        return { ...defaultPerms };
    }
    // Merge custom permissions with defaults (custom overrides default)
    const merged = { ...defaultPerms };
    for (const [module, perms] of Object.entries(customPermissions)) {
        if (perms && perms.length > 0) {
            merged[module] = perms;
        }
    }
    return merged;
}
/**
 * Check if user has a specific permission for a module
 */
function hasPermission(userPermissions, userRole, module, permission) {
    // Owner has all permissions
    if (userRole === 'owner')
        return true;
    // Get effective permissions
    const effectivePerms = userRole
        ? getEffectivePermissions(userRole, userPermissions)
        : userPermissions;
    const modulePermissions = effectivePerms?.[module];
    if (!modulePermissions)
        return false;
    return modulePermissions.includes(permission);
}
/**
 * Check if user can view a module
 */
function canView(userPermissions, userRole, module) {
    return hasPermission(userPermissions, userRole, module, 'view');
}
/**
 * Check if user can add to a module
 */
function canAdd(userPermissions, userRole, module) {
    return hasPermission(userPermissions, userRole, module, 'add');
}
/**
 * Check if user can edit in a module
 */
function canEdit(userPermissions, userRole, module) {
    return hasPermission(userPermissions, userRole, module, 'edit');
}
/**
 * Check if user can delete from a module
 */
function canDelete(userPermissions, userRole, module) {
    return hasPermission(userPermissions, userRole, module, 'delete');
}
/**
 * Get all permissions for a module
 */
function getModulePermissions(userPermissions, userRole, module) {
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
function hasAnyPermission(userPermissions, userRole, module) {
    // Owner has all permissions
    if (userRole === 'owner')
        return true;
    const effectivePerms = userRole
        ? getEffectivePermissions(userRole, userPermissions)
        : userPermissions;
    const modulePermissions = effectivePerms?.[module];
    return modulePermissions !== undefined && modulePermissions.length > 0;
}
/**
 * Check if user has all specified permissions for a module
 */
function hasAllPermissions(userPermissions, userRole, module, requiredPermissions) {
    // Owner has all permissions
    if (userRole === 'owner')
        return true;
    return requiredPermissions.every(permission => hasPermission(userPermissions, userRole, module, permission));
}
/**
 * Get all accessible modules for a user
 */
function getAccessibleModules(userPermissions, userRole) {
    // Owner has access to all modules
    if (userRole === 'owner') {
        return Object.keys(exports.DEFAULT_PERMISSIONS.owner);
    }
    const effectivePerms = userRole
        ? getEffectivePermissions(userRole, userPermissions)
        : userPermissions;
    if (!effectivePerms)
        return [];
    return Object.keys(effectivePerms).filter(module => effectivePerms[module]?.length ?? 0 > 0);
}
/**
 * Check permission with detailed result
 */
function checkPermission(userPermissions, userRole, module, permission) {
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
        const permissionNames = {
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
function createPermissionChecker(userPermissions, userRole) {
    return {
        hasPermission: (module, permission) => hasPermission(userPermissions, userRole, module, permission),
        canView: (module) => canView(userPermissions, userRole, module),
        canAdd: (module) => canAdd(userPermissions, userRole, module),
        canEdit: (module) => canEdit(userPermissions, userRole, module),
        canDelete: (module) => canDelete(userPermissions, userRole, module),
        getModulePermissions: (module) => getModulePermissions(userPermissions, userRole, module),
        hasAnyPermission: (module) => hasAnyPermission(userPermissions, userRole, module),
        hasAllPermissions: (module, permissions) => hasAllPermissions(userPermissions, userRole, module, permissions),
        getAccessibleModules: () => getAccessibleModules(userPermissions, userRole),
        checkPermission: (module, permission) => checkPermission(userPermissions, userRole, module, permission),
    };
}
/**
 * Check if a user can manage another user based on role hierarchy
 */
function canManageUser(managerRole, targetRole) {
    return types_js_1.ROLE_HIERARCHY[managerRole] > types_js_1.ROLE_HIERARCHY[targetRole];
}
/**
 * Get roles that a user can assign to others
 */
function getAssignableRoles(userRole) {
    const userLevel = types_js_1.ROLE_HIERARCHY[userRole];
    return Object.keys(types_js_1.ROLE_HIERARCHY).filter(role => types_js_1.ROLE_HIERARCHY[role] < userLevel);
}
//# sourceMappingURL=permissions.js.map