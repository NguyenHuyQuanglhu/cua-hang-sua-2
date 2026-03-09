"use strict";
/**
 * Authentication Service for Multi-tenant RBAC
 *
 * Handles authentication flow using Master DB for user lookup
 * and Tenant DB for full user info and permissions.
 *
 * Requirements: 5.1, 5.2, 5.3
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const mssql_1 = __importDefault(require("mssql"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const tenant_router_1 = require("../db/tenant-router");
const tenant_user_repository_1 = require("../repositories/tenant-user-repository");
const permissions_1 = require("../auth/permissions");
const jwt_1 = require("../auth/jwt");
const JWT_SECRET = process.env.JWT_SECRET || 'smart-inventory-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h'; // 8 hours as per requirement 5.4
const SESSION_DURATION_DAYS = 7;
/**
 * Authentication Service class
 */
class AuthService {
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
    async authenticate(email, password) {
        try {
            // Ensure tenant router is initialized
            await tenant_router_1.tenantRouter.initialize();
            // Step 1 & 2: Authenticate against Master DB (includes lockout check)
            const masterAuthResult = await tenant_user_repository_1.tenantUserRepository.authenticate(email, password);
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
            const tenantPool = await tenant_router_1.tenantRouter.getConnection(tenantUser.tenantId);
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
            const effectivePermissions = (0, permissions_1.getEffectivePermissions)(tenantDbUser.role, tenantDbUser.permissions);
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
            const token = (0, jwt_1.generateMultiTenantToken)({
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
        }
        catch (error) {
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
    async getTenantDbUser(pool, email) {
        const result = await pool.request()
            .input('email', mssql_1.default.NVarChar, email)
            .query(`
        SELECT id, email, display_name, role, permissions, status
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
            role: row.role,
            permissions: row.permissions ? JSON.parse(row.permissions) : undefined,
            status: row.status,
        };
    }
    /**
     * Get user's accessible stores from Tenant DB
     * For owner and company_manager, returns all active stores
     * For other roles, returns only assigned stores
     */
    async getUserStores(pool, userId, role) {
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
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
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
            roleOverride: row.role_override,
        }));
    }
    /**
     * Create session in Tenant DB
     */
    async createSession(pool, session) {
        // Generate a placeholder token for the session record
        // The actual JWT token is generated separately
        const sessionToken = `session_${session.id}`;
        await pool.request()
            .input('id', mssql_1.default.UniqueIdentifier, session.id)
            .input('userId', mssql_1.default.UniqueIdentifier, session.userId)
            .input('token', mssql_1.default.NVarChar, sessionToken)
            .input('expiresAt', mssql_1.default.DateTime2, session.expiresAt)
            .query(`
        INSERT INTO Sessions (id, user_id, token, expires_at, created_at)
        VALUES (@id, @userId, @token, @expiresAt, GETDATE())
      `);
    }
    /**
     * Validate and decode JWT token
     * Uses the new multi-tenant token format with 'sub' and 'tenant_id' fields
     */
    validateToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            // Handle both old format (userId, tenantId) and new format (sub, tenant_id)
            const payload = {
                sub: decoded.sub || decoded.userId,
                tenant_id: decoded.tenant_id || decoded.tenantId,
                tenant_user_id: decoded.tenant_user_id || decoded.tenantUserId,
                email: decoded.email,
                role: decoded.role,
                stores: decoded.stores,
                session_id: decoded.session_id || decoded.sessionId,
                iat: decoded.iat,
                exp: decoded.exp,
            };
            return payload;
        }
        catch {
            return null;
        }
    }
    /**
     * Logout - invalidate session
     */
    async logout(tenantId, sessionId) {
        try {
            await tenant_router_1.tenantRouter.initialize();
            const pool = await tenant_router_1.tenantRouter.getConnection(tenantId);
            await pool.request()
                .input('sessionId', mssql_1.default.UniqueIdentifier, sessionId)
                .query(`DELETE FROM Sessions WHERE id = @sessionId`);
            return true;
        }
        catch (error) {
            console.error('Logout error:', error);
            return false;
        }
    }
    /**
     * Validate session exists and is not expired
     */
    async validateSession(tenantId, sessionId, userId) {
        try {
            await tenant_router_1.tenantRouter.initialize();
            const pool = await tenant_router_1.tenantRouter.getConnection(tenantId);
            const result = await pool.request()
                .input('sessionId', mssql_1.default.UniqueIdentifier, sessionId)
                .input('userId', mssql_1.default.UniqueIdentifier, userId)
                .query(`
          SELECT 1 FROM Sessions 
          WHERE id = @sessionId 
            AND user_id = @userId 
            AND expires_at > GETDATE()
        `);
            return result.recordset.length > 0;
        }
        catch (error) {
            console.error('Session validation error:', error);
            return false;
        }
    }
    /**
     * Get current user info (for /me endpoint)
     */
    async getCurrentUser(tenantId, userId) {
        try {
            await tenant_router_1.tenantRouter.initialize();
            // Get tenant info
            const tenantInfo = await tenant_router_1.tenantRouter.getTenantInfo(tenantId);
            if (!tenantInfo) {
                return null;
            }
            const pool = await tenant_router_1.tenantRouter.getConnection(tenantId);
            // Get user from Tenant DB
            const userResult = await pool.request()
                .input('userId', mssql_1.default.UniqueIdentifier, userId)
                .query(`
          SELECT id, email, display_name, role, permissions, status
          FROM Users
          WHERE id = @userId AND status = 'active'
        `);
            if (userResult.recordset.length === 0) {
                return null;
            }
            const row = userResult.recordset[0];
            const user = {
                id: row.id,
                email: row.email,
                displayName: row.display_name || undefined,
                role: row.role,
                permissions: row.permissions ? JSON.parse(row.permissions) : undefined,
                status: row.status,
            };
            // Get stores
            const stores = await this.getUserStores(pool, userId, user.role);
            // Get effective permissions
            const effectivePermissions = (0, permissions_1.getEffectivePermissions)(user.role, user.permissions);
            // Get tenant user ID from Master DB
            const masterPool = tenant_router_1.tenantRouter.getMasterConnection();
            const tenantUserResult = await masterPool.request()
                .input('email', mssql_1.default.NVarChar, user.email)
                .input('tenantId', mssql_1.default.UniqueIdentifier, tenantId)
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
        }
        catch (error) {
            console.error('Get current user error:', error);
            return null;
        }
    }
}
exports.AuthService = AuthService;
// Export singleton instance
exports.authService = new AuthService();
//# sourceMappingURL=auth-service.js.map