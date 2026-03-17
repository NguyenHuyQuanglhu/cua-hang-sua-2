/**
 * Permission Middleware for Multi-tenant RBAC
 * 
 * Intercepts API requests and verifies permissions before processing.
 * Returns 403 Forbidden if user lacks required permissions.
 * 
 * Requirements: 6.3, 6.4
 */

import { Response, NextFunction } from 'express';
import { permissionService } from '../services/permission-service';
import type { AuthRequest } from './auth';
import type { Module, Permission, UserRole } from '../types';
import { ROLE_HIERARCHY } from '../types';

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
export function requireModulePermission(
  module: Module,
  action: Permission,
  options: PermissionCheckOptions = {}
) {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        console.log('[PERMISSION] No user in request');
        res.status(401).json({ 
          error: 'Chưa xác thực',
          errorCode: 'AUTH001',
        });
        return;
      }

      const userId = req.user.id;
      const tenantId = req.tenantId;
      const storeId = options.checkStoreAccess ? req.storeId : undefined;

      console.log('[PERMISSION] Checking permission:', {
        userId,
        module,
        action,
        userRole: req.user.role,
        storeId,
        tenantId
      });

      // Check permission using PermissionService
      const result = await permissionService.checkPermission(
        userId,
        module,
        action,
        storeId,
        tenantId ? {
          userId,
          tenantId,
          role: req.user.role as UserRole,
          customPermissions: req.user.permissions,
        } : undefined
      );

      console.log('[PERMISSION] Permission check result:', result);

      if (!result.allowed) {
        console.log('[PERMISSION] Access denied:', result.reason);
        res.status(403).json({
          error: result.reason || 'Không đủ quyền hạn',
          errorCode: result.errorCode || 'PERM001',
        });
        return;
      }

      console.log('[PERMISSION] Access granted');
      next();
    } catch (error) {
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
export function requireAllPermissions(
  permissions: Array<{ module: Module; action: Permission }>
) {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
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
        const result = await permissionService.checkPermission(
          userId,
          perm.module,
          perm.action,
          req.storeId,
          tenantId ? {
            userId,
            tenantId,
            role: req.user.role as UserRole,
            customPermissions: req.user.permissions,
          } : undefined
        );

        if (!result.allowed) {
          res.status(403).json({
            error: result.reason || 'Không đủ quyền hạn',
            errorCode: result.errorCode || 'PERM001',
          });
          return;
        }
      }

      next();
    } catch (error) {
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
export function requireAnyPermission(
  permissions: Array<{ module: Module; action: Permission }>
) {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
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
        const result = await permissionService.checkPermission(
          userId,
          perm.module,
          perm.action,
          req.storeId,
          tenantId ? {
            userId,
            tenantId,
            role: req.user.role as UserRole,
            customPermissions: req.user.permissions,
          } : undefined
        );

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
    } catch (error) {
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
export function requireStoreAccess() {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Chưa xác thực',
          errorCode: 'AUTH001',
        });
        return;
      }

      const storeId = req.storeId || req.headers['x-store-id'] as string;
      
      if (!storeId) {
        res.status(400).json({ 
          error: 'Store ID là bắt buộc',
          errorCode: 'PERM002',
        });
        return;
      }

      const userId = req.user.id;
      const tenantId = req.tenantId;

      const result = await permissionService.checkStoreAccess(
        userId,
        storeId,
        tenantId
      );

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
    } catch (error) {
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
export function requireMinRole(minRole: UserRole) {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Chưa xác thực',
        errorCode: 'AUTH001',
      });
      return;
    }

    const userRole = req.user.role as UserRole;
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

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
export function requireUserManagement(targetRoleParam: string = 'role') {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Chưa xác thực',
        errorCode: 'AUTH001',
      });
      return;
    }

    const userRole = req.user.role as UserRole;
    const targetRole = (req.body[targetRoleParam] || req.params[targetRoleParam]) as UserRole;

    // If no target role specified, allow (will be validated elsewhere)
    if (!targetRole) {
      next();
      return;
    }

    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const targetLevel = ROLE_HIERARCHY[targetRole] || 0;

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
export const permissions = {
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
