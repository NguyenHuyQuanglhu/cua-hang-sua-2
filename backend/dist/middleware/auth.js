"use strict";
/**
 * Authentication Middleware for Multi-tenant RBAC
 *
 * Handles JWT validation and user context for both
 * multi-tenant and legacy authentication.
 *
 * Requirements: 5.1, 5.2
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.storeContext = storeContext;
exports.authorize = authorize;
exports.requirePermission = requirePermission;
exports.ensureTenantContext = ensureTenantContext;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mssql_1 = __importDefault(require("mssql"));
const db_1 = require("../db");
const tenant_router_1 = require("../db/tenant-router");
const getJwtSecret = () => process.env.JWT_SECRET || 'your-secret-key';
/**
 * Normalize JWT payload to handle both old and new formats
 */
function normalizePayload(decoded) {
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
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Token không được cung cấp' });
            return;
        }
        const token = authHeader.substring(7);
        // Verify JWT
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, getJwtSecret());
        }
        catch (jwtError) {
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
            const normalized = normalizePayload(decoded);
            if (!normalized || !normalized.tenantId) {
                res.status(401).json({ error: 'Token không hợp lệ' });
                return;
            }
            await authenticateMultiTenant(req, res, next, normalized);
        }
        else {
            // Legacy authentication
            await authenticateLegacy(req, res, next, decoded);
        }
    }
    catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Xác thực thất bại' });
    }
}
/**
 * Multi-tenant authentication handler
 */
async function authenticateMultiTenant(req, res, next, decoded) {
    try {
        // Initialize tenant router
        await tenant_router_1.tenantRouter.initialize();
        // Get tenant connection
        const tenantPool = await tenant_router_1.tenantRouter.getConnection(decoded.tenantId);
        // Validate session in Tenant DB
        const session = await tenantPool.request()
            .input('sessionId', mssql_1.default.UniqueIdentifier, decoded.sessionId)
            .input('userId', mssql_1.default.UniqueIdentifier, decoded.userId)
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
            .input('userId', mssql_1.default.UniqueIdentifier, decoded.userId)
            .query(`
        SELECT id, email, display_name, role, permissions, status 
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
            role: user.role,
            tenantId: decoded.tenantId,
            tenantUserId: decoded.tenantUserId,
            permissions: user.permissions ? JSON.parse(user.permissions) : undefined,
            stores: decoded.stores,
        };
        req.tenantId = decoded.tenantId;
        req.tenantPool = tenantPool;
        next();
    }
    catch (error) {
        console.error('Multi-tenant auth error:', error);
        res.status(500).json({ error: 'Xác thực thất bại' });
    }
}
/**
 * Legacy authentication handler
 */
async function authenticateLegacy(req, res, next, decoded) {
    // Check session in database
    const session = await (0, db_1.queryOne)('SELECT * FROM Sessions WHERE id = @sessionId AND expires_at > GETDATE()', { sessionId: decoded.sessionId });
    if (!session) {
        res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
        return;
    }
    // Get user
    const user = await (0, db_1.queryOne)('SELECT id, email, display_name, role, permissions, status FROM Users WHERE id = @userId', { userId: decoded.userId });
    if (!user || user.status !== 'active') {
        res.status(401).json({ error: 'Không tìm thấy người dùng hoặc tài khoản không hoạt động' });
        return;
    }
    req.user = {
        id: user.id,
        email: user.email,
        displayName: user.display_name || undefined,
        role: user.role,
        permissions: user.permissions ? JSON.parse(user.permissions) : undefined,
    };
    next();
}
/**
 * Store context middleware - extracts storeId from header
 * Also validates store access for multi-tenant users
 */
function storeContext(req, res, next) {
    const storeId = req.headers['x-store-id'];
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
function authorize(...allowedRoles) {
    return (req, res, next) => {
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
function requirePermission(module, action) {
    return (req, res, next) => {
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
        const permissions = req.user.permissions;
        const modulePermissions = permissions?.[module];
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
async function ensureTenantContext(req, res, next) {
    if (!req.tenantId || !req.tenantPool) {
        // Try to get tenant from token
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                const decoded = jsonwebtoken_1.default.verify(token, getJwtSecret());
                // Support both old and new format
                const tenantId = decoded.tenant_id || decoded.tenantId;
                if (tenantId) {
                    await tenant_router_1.tenantRouter.initialize();
                    req.tenantId = tenantId;
                    req.tenantPool = await tenant_router_1.tenantRouter.getConnection(tenantId);
                }
            }
            catch {
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
//# sourceMappingURL=auth.js.map