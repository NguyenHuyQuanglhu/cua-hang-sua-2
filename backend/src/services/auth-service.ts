/**
 * Authentication Service for Multi-tenant RBAC
 * 
 * Handles authentication flow using Master DB for user lookup
 * and Tenant DB for full user info and permissions.
 * 
 * Requirements: 5.1, 5.2, 5.3
 */

import sql from 'mssql';
import jwt from 'jsonwebtoken';
import { tenantRouter } from '../db/tenant-router';
import { tenantUserRepository, type TenantUserWithTenant, type LoginResult } from '../repositories/tenant-user-repository';
import { verifyPassword } from '../auth/password';
import type { Permissions, UserRole } from '../types';
import { DEFAULT_PERMISSIONS, getEffectivePermissions } from '../auth/permissions';
import { generateMultiTenantToken, type MultiTenantJwtPayload } from '../auth/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'smart-inventory-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h'; // 8 hours as per requirement 5.4
const SESSION_DURATION_DAYS = 7;

/**
 * Re-export MultiTenantJwtPayload for backward compatibility
 * The canonical definition is now in auth/jwt.ts
 */
export type { MultiTenantJwtPayload } from '../auth/jwt';

/**
 * User info from Tenant DB
 */
export interface TenantDbUser {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  permissions?: Permissions;
  status: string;
  photoURL?: string;
}

/**
 * Store assignment info
 */
export interface UserStoreInfo {
  storeId: string;
  storeName: string;
  storeCode: string;
  roleOverride?: UserRole;
}

/**
 * Full authentication result
 */
export interface AuthenticationResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  isLocked?: boolean;
  lockRemainingMinutes?: number;
  token?: string;
  expiresAt?: string;
  user?: {
    id: string;
    tenantUserId: string;
    tenantId: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    role: UserRole;
    permissions: Permissions;
  };
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
  stores?: UserStoreInfo[];
}

/**
 * Authentication Service class
 */
export class AuthService {
  /**
   * Authenticate user using Master DB first, then Tenant DB
   * 
   * Flow:
   * 1. Lookup user in Master DB (TenantUsers)
   * 2. Verify password and check lockout
   * 3. Get tenant info and connect to Tenant DB
   * 4. Get full user info and permissions from Tenant DB
   * 5. Generate JWT with tenant_id, role, and accessible stores
   * 
   * Requirements: 5.1, 5.2, 5.3
   */
  async authenticate(email: string, password: string): Promise<AuthenticationResult> {
    try {
      // Ensure tenant router is initialized
      await tenantRouter.initialize();

      // Step 1 & 2: Authenticate against Master DB (includes lockout check)
      const masterAuthResult = await tenantUserRepository.authenticate(email, password);

      if (!masterAuthResult.success || !masterAuthResult.user) {
        return {
          success: false,
          error: masterAuthResult.error || 'Đăng nhập thất bại',
          errorCode: masterAuthResult.isLocked ? 'AUTH002' : 'AUTH001',
          isLocked: masterAuthResult.isLocked,
          lockRemainingMinutes: masterAuthResult.lockRemainingMinutes,
        };
      }

      const tenantUser = masterAuthResult.user;

      // Check tenant status
      if (tenantUser.tenantStatus !== 'active') {
        return {
          success: false,
          error: 'Tài khoản tenant đã bị tạm ngưng',
          errorCode: 'AUTH003',
        };
      }

      // Step 3: Connect to Tenant DB
      const tenantPool = await tenantRouter.getConnection(tenantUser.tenantId);

      // Step 4: Get full user info from Tenant DB
      const tenantDbUser = await this.getTenantDbUser(tenantPool, email);

      if (!tenantDbUser) {
        // User exists in Master DB but not in Tenant DB - sync issue
        console.error(`User ${email} exists in Master DB but not in Tenant DB ${tenantUser.tenantId}`);
        return {
          success: false,
          error: 'Tài khoản chưa được đồng bộ. Vui lòng liên hệ quản trị viên.',
          errorCode: 'AUTH001',
        };
      }

      if (tenantDbUser.status !== 'active') {
        return {
          success: false,
          error: 'Tài khoản đã bị vô hiệu hóa',
          errorCode: 'AUTH001',
        };
      }

      // Get user's accessible stores
      const stores = await this.getUserStores(tenantPool, tenantDbUser.id, tenantDbUser.role);

      // Get effective permissions (default + custom)
      const effectivePermissions = getEffectivePermissions(
        tenantDbUser.role,
        tenantDbUser.permissions
      );

      // Step 5: Create session and generate JWT
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

      // Create session in Tenant DB
      await this.createSession(tenantPool, {
        id: sessionId,
        userId: tenantDbUser.id,
        expiresAt,
      });

      // Generate JWT with multi-tenant payload
      const token = generateMultiTenantToken({
        userId: tenantDbUser.id,
        tenantUserId: tenantUser.id,
        tenantId: tenantUser.tenantId,
        email: tenantDbUser.email,
        role: tenantDbUser.role,
        stores: stores.map(s => s.storeId),
        sessionId,
      });

      return {
        success: true,
        token,
        expiresAt: expiresAt.toISOString(),
        user: {
          id: tenantDbUser.id,
          tenantUserId: tenantUser.id,
          tenantId: tenantUser.tenantId,
          email: tenantDbUser.email,
          displayName: tenantDbUser.displayName,
          photoURL: tenantDbUser.photoURL,
          role: tenantDbUser.role,
          permissions: effectivePermissions,
        },
        tenant: {
          id: tenantUser.tenantId,
          name: tenantUser.tenantName,
          slug: tenantUser.tenantSlug,
        },
        stores,
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: 'Đăng nhập thất bại. Vui lòng thử lại.',
        errorCode: 'AUTH001',
      };
    }
  }

  /**
   * Get user info from Tenant DB
   */
  private async getTenantDbUser(pool: sql.ConnectionPool, email: string): Promise<TenantDbUser | null> {
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query(`
        SELECT id, email, display_name, role, permissions, status, photo_url
        FROM Users
        WHERE email = @email
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    const row = result.recordset[0];
    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name || undefined,
      role: row.role as UserRole,
      permissions: row.permissions ? JSON.parse(row.permissions) : undefined,
      status: row.status,
      photoURL: row.photo_url || undefined,
    };
  }

  /**
   * Get user's accessible stores from Tenant DB
   * For owner and company_manager, returns all active stores
   * For other roles, returns only assigned stores
   */
  private async getUserStores(pool: sql.ConnectionPool, userId: string, role?: UserRole): Promise<UserStoreInfo[]> {
    // Owner and company_manager have access to all stores
    if (role === 'owner' || role === 'company_manager') {
      const result = await pool.request()
        .query(`
          SELECT 
            Id as store_id,
            Name as store_name,
            Slug as store_code
          FROM Stores
          WHERE Status = 'active'
          ORDER BY Name
        `);

      return result.recordset.map(row => ({
        storeId: row.store_id,
        storeName: row.store_name,
        storeCode: row.store_code,
      }));
    }

    // For other roles, get assigned stores
    const result = await pool.request()
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          us.StoreId as store_id,
          s.Name as store_name,
          s.Slug as store_code,
          us.RoleOverride as role_override
        FROM UserStores us
        INNER JOIN Stores s ON us.StoreId = s.Id
        WHERE us.UserId = @userId AND s.Status = 'active'
        ORDER BY s.Name
      `);

    return result.recordset.map(row => ({
      storeId: row.store_id,
      storeName: row.store_name,
      storeCode: row.store_code,
      roleOverride: row.role_override as UserRole | undefined,
    }));
  }

  /**
   * Create session in Tenant DB
   */
  private async createSession(
    pool: sql.ConnectionPool,
    session: { id: string; userId: string; expiresAt: Date }
  ): Promise<void> {
    // Generate a placeholder token for the session record
    // The actual JWT token is generated separately
    const sessionToken = `session_${session.id}`;

    await pool.request()
      .input('id', sql.UniqueIdentifier, session.id)
      .input('userId', sql.UniqueIdentifier, session.userId)
      .input('token', sql.NVarChar, sessionToken)
      .input('expiresAt', sql.DateTime2, session.expiresAt)
      .query(`
        INSERT INTO Sessions (id, user_id, token, expires_at, created_at)
        VALUES (@id, @userId, @token, @expiresAt, GETDATE())
      `);
  }

  /**
   * Validate and decode JWT token
   * Uses the new multi-tenant token format with 'sub' and 'tenant_id' fields
   */
  validateToken(token: string): MultiTenantJwtPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
      
      // Handle both old format (userId, tenantId) and new format (sub, tenant_id)
      const payload: MultiTenantJwtPayload = {
        sub: (decoded.sub as string) || (decoded.userId as string),
        tenant_id: (decoded.tenant_id as string) || (decoded.tenantId as string),
        tenant_user_id: (decoded.tenant_user_id as string) || (decoded.tenantUserId as string),
        email: decoded.email as string,
        role: decoded.role as UserRole,
        stores: decoded.stores as string[],
        session_id: (decoded.session_id as string) || (decoded.sessionId as string),
        iat: decoded.iat as number,
        exp: decoded.exp as number,
      };
      
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Logout - invalidate session
   */
  async logout(tenantId: string, sessionId: string): Promise<boolean> {
    try {
      await tenantRouter.initialize();
      const pool = await tenantRouter.getConnection(tenantId);

      await pool.request()
        .input('sessionId', sql.UniqueIdentifier, sessionId)
        .query(`DELETE FROM Sessions WHERE id = @sessionId`);

      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  /**
   * Validate session exists and is not expired
   */
  async validateSession(tenantId: string, sessionId: string, userId: string): Promise<boolean> {
    try {
      await tenantRouter.initialize();
      const pool = await tenantRouter.getConnection(tenantId);

      const result = await pool.request()
        .input('sessionId', sql.UniqueIdentifier, sessionId)
        .input('userId', sql.UniqueIdentifier, userId)
        .query(`
          SELECT 1 FROM Sessions 
          WHERE id = @sessionId 
            AND user_id = @userId 
            AND expires_at > GETDATE()
        `);

      return result.recordset.length > 0;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  /**
   * Get current user info (for /me endpoint)
   */
  async getCurrentUser(tenantId: string, userId: string): Promise<AuthenticationResult | null> {
    try {
      await tenantRouter.initialize();
      
      // Get tenant info
      const tenantInfo = await tenantRouter.getTenantInfo(tenantId);
      if (!tenantInfo) {
        return null;
      }

      const pool = await tenantRouter.getConnection(tenantId);

      // Get user from Tenant DB
      const userResult = await pool.request()
        .input('userId', sql.UniqueIdentifier, userId)
        .query(`
          SELECT id, email, display_name, role, permissions, status, photo_url
          FROM Users
          WHERE id = @userId AND status = 'active'
        `);

      if (userResult.recordset.length === 0) {
        return null;
      }

      const row = userResult.recordset[0];
      const user: TenantDbUser = {
        id: row.id,
        email: row.email,
        displayName: row.display_name || undefined,
        role: row.role as UserRole,
        permissions: row.permissions ? JSON.parse(row.permissions) : undefined,
        status: row.status,
        photoURL: row.photo_url || undefined,
      };

      // Get stores
      const stores = await this.getUserStores(pool, userId, user.role);

      // Get effective permissions
      const effectivePermissions = getEffectivePermissions(user.role, user.permissions);

      // Get tenant user ID from Master DB
      const masterPool = tenantRouter.getMasterConnection();
      const tenantUserResult = await masterPool.request()
        .input('email', sql.NVarChar, user.email)
        .input('tenantId', sql.UniqueIdentifier, tenantId)
        .query(`
          SELECT id FROM TenantUsers 
          WHERE email = @email AND tenant_id = @tenantId
        `);

      const tenantUserId = tenantUserResult.recordset[0]?.id || '';

      return {
        success: true,
        user: {
          id: user.id,
          tenantUserId,
          tenantId,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: user.role,
          permissions: effectivePermissions,
        },
        tenant: {
          id: tenantId,
          name: tenantInfo.name,
          slug: tenantInfo.slug,
        },
        stores,
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
