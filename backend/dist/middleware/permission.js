"use strict";
/**
 * Permission Middleware for Multi-tenant RBAC
 *
 * Intercepts API requests and verifies permissions before processing.
 * Returns 403 Forbidden if user lacks required permissions.
 *
 * Requirements: 6.3, 6.4
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissions = void 0;
exports.requireModulePermission = requireModulePermission;
exports.requireAllPermissions = requireAllPermissions;
exports.requireAnyPermission = requireAnyPermission;
exports.requireStoreAccess = requireStoreAccess;
exports.requireMinRole = requireMinRole;
exports.requireUserManagement = requireUserManagement;
const permission_service_1 = require("../services/permission-service");
const types_1 = require("../types");
/**
 * Create permission middleware for a specific module and action
 *
 * @param module - Module to check permission for
 * @param action - Required action (view, add, edit, delete)
 * @param options - Additional options
 *
 * Requirements: 6.3, 6.4
 */
function requireModulePermission(module, action, options = {}) {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    error: 'Chưa xác thực',
                    errorCode: 'AUTH001',
                });
                return;
            }
            const userId = req.user.id;
            const tenantId = req.tenantId;
            const storeId = options.checkStoreAccess ? req.storeId : undefined;
            // Check permission using PermissionService
            const result = await permission_service_1.permissionService.checkPermission(userId, module, action, storeId, tenantId ? {
                userId,
                tenantId,
                role: req.user.role,
                customPermissions: req.user.permissions,
            } : undefined);
            if (!result.allowed) {
                res.status(403).json({
                    error: result.reason || 'Không đủ quyền hạn',
                    errorCode: result.errorCode || 'PERM001',
                });
                return;
            }
            next();
        }
        catch (error) {
            console.error('Permission middleware error:', error);
            res.status(500).json({
                error: 'Lỗi kiểm tra quyền hạn',
                errorCode: 'PERM001',
            });
        }
    };
}
/**
 * Create middleware to check multiple permissions (user must have ALL)
 */
function requireAllPermissions(permissions) {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    error: 'Chưa xác thực',
                    errorCode: 'AUTH001',
                });
                return;
            }
            const userId = req.user.id;
            const tenantId = req.tenantId;
            // Check all permissions
            for (const perm of permissions) {
                const result = await permission_service_1.permissionService.checkPermission(userId, perm.module, perm.action, req.storeId, tenantId ? {
                    userId,
                    tenantId,
                    role: req.user.role,
                    customPermissions: req.user.permissions,
                } : undefined);
                if (!result.allowed) {
                    res.status(403).json({
                        error: result.reason || 'Không đủ quyền hạn',
                        errorCode: result.errorCode || 'PERM001',
                    });
                    return;
                }
            }
            next();
        }
        catch (error) {
            console.error('Permission middleware error:', error);
            res.status(500).json({
                error: 'Lỗi kiểm tra quyền hạn',
                errorCode: 'PERM001',
            });
        }
    };
}
/**
 * Create middleware to check multiple permissions (user must have ANY)
 */
function requireAnyPermission(permissions) {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    error: 'Chưa xác thực',
                    errorCode: 'AUTH001',
                });
                return;
            }
            const userId = req.user.id;
            const tenantId = req.tenantId;
            // Check if user has any of the permissions
            for (const perm of permissions) {
                const result = await permission_service_1.permissionService.checkPermission(userId, perm.module, perm.action, req.storeId, tenantId ? {
                    userId,
                    tenantId,
                    role: req.user.role,
                    customPermissions: req.user.permissions,
                } : undefined);
                if (result.allowed) {
                    next();
                    return;
                }
            }
            // None of the permissions matched
            res.status(403).json({
                error: 'Không đủ quyền hạn',
                errorCode: 'PERM001',
            });
        }
        catch (error) {
            console.error('Permission middleware error:', error);
            res.status(500).json({
                error: 'Lỗi kiểm tra quyền hạn',
                errorCode: 'PERM001',
            });
        }
    };
}
/**
 * Middleware to verify store access
 * Checks if user has access to the store specified in request
 *
 * Requirements: 5.5, 3.4, 3.5
 */
function requireStoreAccess() {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    error: 'Chưa xác thực',
                    errorCode: 'AUTH001',
                });
                return;
            }
            const storeId = req.storeId || req.headers['x-store-id'];
            if (!storeId) {
                res.status(400).json({
                    error: 'Store ID là bắt buộc',
                    errorCode: 'PERM002',
                });
                return;
            }
            const userId = req.user.id;
            const tenantId = req.tenantId;
            const result = await permission_service_1.permissionService.checkStoreAccess(userId, storeId, tenantId);
            if (!result.allowed) {
                res.status(403).json({
                    error: result.reason || 'Bạn không có quyền truy cập cửa hàng này',
                    errorCode: result.errorCode || 'PERM002',
                });
                return;
            }
            // Set storeId on request if not already set
            if (!req.storeId) {
                req.storeId = storeId;
            }
            next();
        }
        catch (error) {
            console.error('Store access middleware error:', error);
            res.status(500).json({
                error: 'Lỗi kiểm tra quyền truy cập cửa hàng',
                errorCode: 'PERM002',
            });
        }
    };
}
/**
 * Middleware to check minimum role level
 *
 * @param minRole - Minimum role required
 */
function requireMinRole(minRole) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                error: 'Chưa xác thực',
                errorCode: 'AUTH001',
            });
            return;
        }
        const userRole = req.user.role;
        const userLevel = types_1.ROLE_HIERARCHY[userRole] || 0;
        const requiredLevel = types_1.ROLE_HIERARCHY[minRole] || 0;
        if (userLevel < requiredLevel) {
            res.status(403).json({
                error: 'Không đủ quyền hạn',
                errorCode: 'PERM001',
            });
            return;
        }
        next();
    };
}
/**
 * Middleware to check if user can manage another user
 * Used for user management operations
 *
 * Requirements: 4.1, 4.2
 */
function requireUserManagement(targetRoleParam = 'role') {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                error: 'Chưa xác thực',
                errorCode: 'AUTH001',
            });
            return;
        }
        const userRole = req.user.role;
        const targetRole = (req.body[targetRoleParam] || req.params[targetRoleParam]);
        // If no target role specified, allow (will be validated elsewhere)
        if (!targetRole) {
            next();
            return;
        }
        const userLevel = types_1.ROLE_HIERARCHY[userRole] || 0;
        const targetLevel = types_1.ROLE_HIERARCHY[targetRole] || 0;
        // User can only manage users with lower role level
        if (userLevel <= targetLevel) {
            res.status(403).json({
                error: 'Bạn không có quyền quản lý người dùng với vai trò này',
                errorCode: 'PERM001',
            });
            return;
        }
        next();
    };
}
/**
 * Convenience middleware factories for common permission checks
 */
exports.permissions = {
    // Dashboard
    viewDashboard: () => requireModulePermission('dashboard', 'view'),
    // Products
    viewProducts: () => requireModulePermission('products', 'view'),
    addProducts: () => requireModulePermission('products', 'add'),
    editProducts: () => requireModulePermission('products', 'edit'),
    deleteProducts: () => requireModulePermission('products', 'delete'),
    // Categories
    viewCategories: () => requireModulePermission('categories', 'view'),
    addCategories: () => requireModulePermission('categories', 'add'),
    editCategories: () => requireModulePermission('categories', 'edit'),
    deleteCategories: () => requireModulePermission('categories', 'delete'),
    // Sales
    viewSales: () => requireModulePermission('sales', 'view'),
    addSales: () => requireModulePermission('sales', 'add'),
    editSales: () => requireModulePermission('sales', 'edit'),
    deleteSales: () => requireModulePermission('sales', 'delete'),
    // Purchases
    viewPurchases: () => requireModulePermission('purchases', 'view'),
    addPurchases: () => requireModulePermission('purchases', 'add'),
    editPurchases: () => requireModulePermission('purchases', 'edit'),
    deletePurchases: () => requireModulePermission('purchases', 'delete'),
    // Customers
    viewCustomers: () => requireModulePermission('customers', 'view'),
    addCustomers: () => requireModulePermission('customers', 'add'),
    editCustomers: () => requireModulePermission('customers', 'edit'),
    deleteCustomers: () => requireModulePermission('customers', 'delete'),
    // Suppliers
    viewSuppliers: () => requireModulePermission('suppliers', 'view'),
    addSuppliers: () => requireModulePermission('suppliers', 'add'),
    editSuppliers: () => requireModulePermission('suppliers', 'edit'),
    deleteSuppliers: () => requireModulePermission('suppliers', 'delete'),
    // Users
    viewUsers: () => requireModulePermission('users', 'view'),
    addUsers: () => requireModulePermission('users', 'add'),
    editUsers: () => requireModulePermission('users', 'edit'),
    deleteUsers: () => requireModulePermission('users', 'delete'),
    // Stores
    viewStores: () => requireModulePermission('stores', 'view'),
    addStores: () => requireModulePermission('stores', 'add'),
    editStores: () => requireModulePermission('stores', 'edit'),
    deleteStores: () => requireModulePermission('stores', 'delete'),
    // Settings
    viewSettings: () => requireModulePermission('settings', 'view'),
    editSettings: () => requireModulePermission('settings', 'edit'),
    // POS
    viewPOS: () => requireModulePermission('pos', 'view'),
    usePOS: () => requireModulePermission('pos', 'add'),
    // Cash Flow
    viewCashFlow: () => requireModulePermission('cash-flow', 'view'),
    addCashFlow: () => requireModulePermission('cash-flow', 'add'),
    editCashFlow: () => requireModulePermission('cash-flow', 'edit'),
    deleteCashFlow: () => requireModulePermission('cash-flow', 'delete'),
};
//# sourceMappingURL=permission.js.map