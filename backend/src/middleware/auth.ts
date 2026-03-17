/**
 * Authentication Middleware for Multi-tenant RBAC
 * 
 * Handles JWT validation and user context for both
 * multi-tenant and legacy authentication.
 * 
 * Requirements: 5.1, 5.2
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import sql from 'mssql';
import { queryOne } from '../db';
import { tenantRouter } from '../db/tenant-router';
import type { UserRole, Permissions } from '../types';
import type { MultiTenantJwtPayload } from '../auth/jwt';

const getJwtSecret = () => process.env.JWT_SECRET || 'your-secret-key';

/**
 * Authenticated user info
 */
export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: string;
  storeId?: string;
  // Multi-tenant fields
  tenantId?: string;
  tenantUserId?: string;
  permissions?: Permissions;
  stores?: string[];
}

/**
 * Extended request with auth info
 */
export interface AuthRequest extends Request {
  user?: AuthUser;
  storeId?: string;
  tenantId?: string;
  tenantPool?: sql.ConnectionPool;
}

/**
 * Multi-tenant JWT payload (supports both old and new format)
 * Old format: userId, tenantId, tenantUserId, sessionId
 * New format: sub, tenant_id, tenant_user_id, session_id
 */
interface DecodedMultiTenantPayload {
  // New format fields
  sub?: string;
  tenant_id?: string;
  tenant_user_id?: string;
  session_id?: string;
  // Old format fields (for backward compatibility)
  userId?: string;
  tenantUserId?: string;
  tenantId?: string;
  sessionId?: string;
  // Common fields
  email?: string;
  role?: string;
  stores?: string[];
  iat?: number;
  exp?: number;
}

/**
 * Normalized multi-tenant payload
 */
interface NormalizedMultiTenantPayload {
  userId: string;
  tenantUserId: string;
  tenantId: string;
  sessionId: string;
  email?: string;
  role?: string;
  stores?: string[];
}

/**
 * Legacy JWT payload
 */
interface LegacyJwtPayload {
  userId: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

// Database record types
interface SessionRecord {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
}

interface UserRecord {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  permissions: string | null;
  status: string;
  photo_url: string | null;
}

/**
 * Normalize JWT payload to handle both old and new formats
 */
function normalizePayload(decoded: DecodedMultiTenantPayload): NormalizedMultiTenantPayload | null {
  const userId = decoded.sub || decoded.userId;
  const tenantId = decoded.tenant_id || decoded.tenantId;
  const tenantUserId = decoded.tenant_user_id || decoded.tenantUserId;
  const sessionId = decoded.session_id || decoded.sessionId;

  if (!userId || !sessionId) {
    return null;
  }

  return {
    userId,
    tenantId: tenantId || '',
    tenantUserId: tenantUserId || '',
    sessionId,
    email: decoded.email,
    role: decoded.role,
    stores: decoded.stores,
  };
}

/**
 * Authentication middleware
 * 
 * Supports both multi-tenant and legacy JWT tokens.
 * For multi-tenant tokens, validates session in Tenant DB.
 * For legacy tokens, validates session in current DB.
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token không được cung cấp' });
      return;
    }

    const token = authHeader.substring(7);

    // Verify JWT
    let decoded: DecodedMultiTenantPayload | LegacyJwtPayload;
    try {
      decoded = jwt.verify(token, getJwtSecret()) as DecodedMultiTenantPayload | LegacyJwtPayload;
    } catch (jwtError) {
      console.log('[authenticate] JWT verify failed:', jwtError);
      res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
      return;
    }

    // Check if this is a multi-tenant token (supports both old and new format)
    const isMultiTenant = ('tenant_id' in decoded && decoded.tenant_id) || 
                          ('tenantId' in decoded && decoded.tenantId);
    
    console.log('[authenticate] isMultiTenant:', isMultiTenant);

    if (isMultiTenant) {
      // Multi-tenant authentication
      const normalized = normalizePayload(decoded as DecodedMultiTenantPayload);
      if (!normalized || !normalized.tenantId) {
        res.status(401).json({ error: 'Token không hợp lệ' });
        return;
      }
      await authenticateMultiTenant(req, res, next, normalized);
    } else {
      // Legacy authentication
      await authenticateLegacy(req, res, next, decoded as LegacyJwtPayload);
    }
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Xác thực thất bại' });
  }
}

/**
 * Multi-tenant authentication handler
 */
async function authenticateMultiTenant(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
  decoded: NormalizedMultiTenantPayload
): Promise<void> {
  try {
    // Initialize tenant router
    await tenantRouter.initialize();

    // Get tenant connection
    const tenantPool = await tenantRouter.getConnection(decoded.tenantId);

    // Validate session in Tenant DB
    const session = await tenantPool.request()
      .input('sessionId', sql.UniqueIdentifier, decoded.sessionId)
      .input('userId', sql.UniqueIdentifier, decoded.userId)
      .query(`
        SELECT id FROM Sessions 
        WHERE id = @sessionId 
          AND user_id = @userId 
          AND expires_at > GETDATE()
      `);

    if (session.recordset.length === 0) {
      res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
      return;
    }

    // Get user from Tenant DB
    const userResult = await tenantPool.request()
      .input('userId', sql.UniqueIdentifier, decoded.userId)
      .query(`
        SELECT id, email, display_name, role, permissions, status, photo_url 
        FROM Users 
        WHERE id = @userId
      `);

    if (userResult.recordset.length === 0) {
      res.status(401).json({ error: 'Không tìm thấy người dùng' });
      return;
    }

    const user = userResult.recordset[0];

    if (user.status !== 'active') {
      res.status(401).json({ error: 'Tài khoản đã bị vô hiệu hóa' });
      return;
    }

    // Set request context
    req.user = {
      id: user.id,
      email: user.email,
      displayName: user.display_name || undefined,
      photoURL: user.photo_url || undefined,
      role: user.role,
      tenantId: decoded.tenantId,
      tenantUserId: decoded.tenantUserId,
      permissions: user.permissions ? JSON.parse(user.permissions) : undefined,
      stores: decoded.stores,
    };
    req.tenantId = decoded.tenantId;
    req.tenantPool = tenantPool;

    next();
  } catch (error) {
    console.error('Multi-tenant auth error:', error);
    res.status(500).json({ error: 'Xác thực thất bại' });
  }
}

/**
 * Legacy authentication handler
 */
async function authenticateLegacy(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
  decoded: LegacyJwtPayload
): Promise<void> {
  // Check session in database
  const session = await queryOne<SessionRecord>(
    'SELECT * FROM Sessions WHERE id = @sessionId AND expires_at > GETDATE()',
    { sessionId: decoded.sessionId }
  );

  if (!session) {
    res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
    return;
  }

  // Get user
  const user = await queryOne<UserRecord>(
    'SELECT id, email, display_name, role, permissions, status, photo_url FROM Users WHERE id = @userId',
    { userId: decoded.userId }
  );

  if (!user || user.status !== 'active') {
    res.status(401).json({ error: 'Không tìm thấy người dùng hoặc tài khoản không hoạt động' });
    return;
  }

  req.user = {
    id: user.id,
    email: user.email,
    displayName: user.display_name || undefined,
    photoURL: user.photo_url || undefined,
    role: user.role,
    permissions: user.permissions ? JSON.parse(user.permissions) : undefined,
  };

  next();
}

/**
 * Store context middleware - extracts storeId from header
 * Also validates store access for multi-tenant users
 */
export function storeContext(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const storeId = req.headers['x-store-id'] as string;

  if (!storeId) {
    res.status(400).json({ error: 'Store ID là bắt buộc' });
    return;
  }

  // For multi-tenant users, verify store access
  // Owner and company_manager have access to all stores
  const role = req.user?.role;
  if (role === 'owner' || role === 'company_manager') {
    req.storeId = storeId;
    next();
    return;
  }

  // For store_manager and salesperson, check if they have access to this store
  if (req.user?.stores && req.user.stores.length > 0) {
    if (!req.user.stores.includes(storeId)) {
      res.status(403).json({ error: 'Bạn không có quyền truy cập cửa hàng này' });
      return;
    }
  }
  // If stores array is empty or undefined, allow access (legacy mode or single-store setup)

  req.storeId = storeId;
  next();
}

/**
 * Role-based authorization middleware
 */
export function authorize(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Chưa xác thực' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Không đủ quyền hạn' });
      return;
    }

    next();
  };
}

/**
 * Permission-based authorization middleware
 * Checks if user has specific permission for a module
 */
export function requirePermission(module: string, action: 'view' | 'add' | 'edit' | 'delete') {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Chưa xác thực' });
      return;
    }

    // Owner has all permissions
    if (req.user.role === 'owner') {
      next();
      return;
    }

    // Check permissions
    const permissions = req.user.permissions as Permissions | undefined;
    const modulePermissions = permissions?.[module as keyof Permissions];

    if (!modulePermissions || !modulePermissions.includes(action)) {
      res.status(403).json({ 
        error: `Bạn không có quyền ${action} cho module ${module}`,
        errorCode: 'PERM001',
      });
      return;
    }

    next();
  };
}

/**
 * Tenant context middleware
 * Ensures tenant connection is available for multi-tenant requests
 */
export async function ensureTenantContext(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.tenantId || !req.tenantPool) {
    // Try to get tenant from token
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, getJwtSecret()) as DecodedMultiTenantPayload;
        // Support both old and new format
        const tenantId = decoded.tenant_id || decoded.tenantId;
        if (tenantId) {
          await tenantRouter.initialize();
          req.tenantId = tenantId;
          req.tenantPool = await tenantRouter.getConnection(tenantId);
        }
      } catch {
        // Token invalid or not multi-tenant
      }
    }
  }

  if (!req.tenantId) {
    res.status(400).json({ error: 'Tenant context không khả dụng' });
    return;
  }

  next();
}
