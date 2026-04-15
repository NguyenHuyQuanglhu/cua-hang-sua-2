/**
 * Authentication Routes for Multi-tenant RBAC
 * 
 * Handles login, logout, and user info endpoints using
 * Master DB for authentication and Tenant DB for user data.
 * 
 * Requirements: 5.1, 5.2, 5.3
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, insert } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authService, type MultiTenantJwtPayload } from '../services/auth-service';
import { tenantRouter } from '../db/tenant-router';

const router = Router();

// Legacy types for backward compatibility
interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  role: string;
  permissions: string | null;
  status: string;
  failed_login_attempts: number;
  locked_until: Date | null;
  photo_url: string | null;
}

interface UserStoreRecord {
  store_id: string;
}

/**
 * POST /api/auth/login
 * 
 * Multi-tenant login flow:
 * 1. Lookup user in Master DB (TenantUsers)
 * 2. Verify password and check lockout
 * 3. Connect to Tenant DB
 * 4. Get full user info and permissions
 * 5. Generate JWT with tenant_id, role, stores
 * 
 * Requirements: 5.1, 5.2, 5.3
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email và mật khẩu là bắt buộc' });
      return;
    }

    // Check if multi-tenant mode is enabled (MASTER_DB_NAME is set)
    const isMultiTenant = !!process.env.MASTER_DB_NAME;

    if (isMultiTenant) {
      // Use multi-tenant auth service
      const result = await authService.authenticate(email.toLowerCase(), password);

      if (!result.success) {
        // Determine appropriate status code
        let statusCode = 401;
        if (result.isLocked) {
          statusCode = 423; // Locked
        } else if (result.errorCode === 'AUTH003') {
          statusCode = 403; // Forbidden (tenant suspended)
        }

        res.status(statusCode).json({
          error: result.error,
          errorCode: result.errorCode,
          isLocked: result.isLocked,
          lockRemainingMinutes: result.lockRemainingMinutes,
        });
        return;
      }

      // Return successful login response
      res.json({
        user: {
          id: result.user!.id,
          tenantUserId: result.user!.tenantUserId,
          tenantId: result.user!.tenantId,
          email: result.user!.email,
          displayName: result.user!.displayName,
          role: result.user!.role,
          permissions: result.user!.permissions,
        },
        tenant: result.tenant,
        stores: result.stores,
        token: result.token,
        expiresAt: result.expiresAt,
      });
    } else {
      // Legacy single-tenant login
      const bcrypt = await import('bcryptjs');
      const jwtModule = await import('jsonwebtoken');
      const jwt = jwtModule.default || jwtModule;
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
      const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

      // Find user in current tenant DB
      const user = await queryOne<UserRecord>(
        'SELECT * FROM Users WHERE email = @email',
        { email: email.toLowerCase() }
      );

      if (!user) {
        res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
        return;
      }

      if (!user.password_hash) {
        console.error('User has no password hash:', user.email);
        res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
        return;
      }

      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        res.status(423).json({ error: 'Tài khoản đã bị khóa. Vui lòng thử lại sau.' });
        return;
      }

      const isValid = await bcrypt.compare(password, user.password_hash);

      if (!isValid) {
        res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
        return;
      }

      if (user.status !== 'active') {
        res.status(403).json({ error: 'Tài khoản chưa được kích hoạt' });
        return;
      }

      const stores = await query<UserStoreRecord>(
        'SELECT store_id FROM UserStores WHERE user_id = @userId',
        { userId: user.id }
      );

      const sessionId = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const token = (jwt.sign as Function)({ userId: user.id, sessionId }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
      });

      await insert('Sessions', {
        id: sessionId,
        user_id: user.id,
        token: token,
        expires_at: expiresAt,
        created_at: new Date(),
      });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          role: user.role,
          permissions: user.permissions ? JSON.parse(user.permissions) : null,
          photoURL: user.photo_url || undefined,
        },
        stores: stores.map((s) => s.store_id),
        token,
        expiresAt: expiresAt.toISOString(),
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Đăng nhập thất bại: ${errorMessage}` });
  }
});

/**
 * POST /api/auth/login-legacy
 * 
 * Legacy login endpoint for backward compatibility.
 * Uses single-tenant authentication (direct Tenant DB).
 * 
 * @deprecated Use /api/auth/login for multi-tenant support
 */
router.post('/login-legacy', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const bcrypt = await import('bcryptjs');
    const jwtModule = await import('jsonwebtoken');
    const jwt = jwtModule.default || jwtModule;
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

    // Find user in current tenant DB
    const user = await queryOne<UserRecord>(
      'SELECT * FROM Users WHERE email = @email',
      { email: email.toLowerCase() }
    );

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (!user.password_hash) {
      console.error('User has no password hash:', user.email);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      res.status(423).json({ error: 'Account is locked. Try again later.' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ error: 'Account is not active' });
      return;
    }

    const stores = await query<UserStoreRecord>(
      'SELECT store_id FROM UserStores WHERE user_id = @userId',
      { userId: user.id }
    );

    const sessionId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const token = (jwt.sign as Function)({ userId: user.id, sessionId }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    await insert('Sessions', {
      id: sessionId,
      user_id: user.id,
      token: token,
      expires_at: expiresAt,
      created_at: new Date(),
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        permissions: user.permissions ? JSON.parse(user.permissions) : null,
        photoURL: user.photo_url || undefined,
      },
      stores: stores.map((s) => s.store_id),
      token,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Legacy login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Login failed: ${errorMessage}` });
  }
});

/**
 * POST /api/auth/logout
 * 
 * Logout and invalidate session.
 * Supports both multi-tenant and legacy sessions.
 */
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7);

    if (token) {
      // Try to decode as multi-tenant token
      const payload = authService.validateToken(token);
      
      if (payload && payload.tenant_id && payload.session_id) {
        // Multi-tenant logout
        await authService.logout(payload.tenant_id, payload.session_id);
      } else {
        // Legacy logout - delete from current tenant DB
        await queryOne('DELETE FROM Sessions WHERE token = @token', { token });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Đăng xuất thất bại' });
  }
});

/**
 * GET /api/auth/me
 * 
 * Get current user info.
 * Supports both multi-tenant and legacy authentication.
 */
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7);

    console.log('[/me] Processing request for user:', user?.email);

    if (token) {
      // Try to decode as multi-tenant token
      const payload = authService.validateToken(token);
      console.log('[/me] Token payload:', payload ? 'valid' : 'invalid');
      
      if (payload && payload.tenant_id) {
        // Multi-tenant: get full user info from service
        console.log('[/me] Getting user from tenant:', payload.tenant_id);
        const result = await authService.getCurrentUser(payload.tenant_id, payload.sub);
        console.log('[/me] getCurrentUser result:', result?.success);
        
        if (!result || !result.success) {
          console.log('[/me] User not found');
          res.status(401).json({ error: 'Không tìm thấy thông tin người dùng' });
          return;
        }

        console.log('[/me] Returning user:', result.user?.email);
        res.json({
          user: result.user,
          tenant: result.tenant,
          stores: result.stores,
        });
        return;
      }
    }

    // Legacy: get stores from current tenant DB
    console.log('[/me] Using legacy mode for user:', user.id);
    const stores = await query<UserStoreRecord>(
      'SELECT store_id FROM UserStores WHERE user_id = @userId',
      { userId: user.id }
    );

    res.json({
      user,
      stores: stores.map((s) => s.store_id),
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Không thể lấy thông tin người dùng' });
  }
});

/**
 * POST /api/auth/refresh
 * 
 * Refresh user session and get updated permissions.
 * Useful when user's role or permissions have changed.
 */
router.post('/refresh', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7);

    if (!token) {
      res.status(401).json({ error: 'Token không hợp lệ' });
      return;
    }

    const payload = authService.validateToken(token);
    
    if (!payload || !payload.tenant_id) {
      res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
      return;
    }

    // Get updated user info
    const result = await authService.getCurrentUser(payload.tenant_id, payload.sub);
    
    if (!result || !result.success) {
      res.status(401).json({ error: 'Không tìm thấy thông tin người dùng' });
      return;
    }

    res.json({
      user: result.user,
      tenant: result.tenant,
      stores: result.stores,
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Không thể làm mới phiên đăng nhập' });
  }
});

/**
 * POST /api/auth/verify-password
 * 
 * Verify password for dangerous zone access in settings.
 * Uses a fixed password: 123456789
 * Note: This endpoint does NOT require authentication since it's just
 * verifying a fixed password for UI access control.
 */
router.post('/verify-password', async (req: Request, res: Response) => {
  try {
    const { password } = req.body;

    if (!password) {
      res.status(400).json({ error: 'Mật khẩu là bắt buộc' });
      return;
    }

    // Fixed password for dangerous zone: 123456789
    const DANGER_ZONE_PASSWORD = '123456789';

    if (password !== DANGER_ZONE_PASSWORD) {
      res.status(401).json({ error: 'Mật khẩu không chính xác' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Verify password error:', error);
    res.status(500).json({ error: 'Không thể xác thực mật khẩu' });
  }
});

export default router;
