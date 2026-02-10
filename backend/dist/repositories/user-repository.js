"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = exports.UserRepository = void 0;
const index_js_1 = require("../db/index.js");
const password_js_1 = require("../auth/password.js");
const permission_service_js_1 = require("../services/permission-service.js");
/**
 * User repository for managing users and user-store assignments
 */
class UserRepository {
    /**
     * Find all users (for admin)
     */
    async findAll() {
        const results = await (0, index_js_1.query)(`SELECT * FROM Users ORDER BY display_name, email`);
        return results.map(r => ({
            id: r.id,
            email: r.email,
            displayName: r.display_name || undefined,
            role: r.role,
            permissions: r.permissions ? JSON.parse(r.permissions) : undefined,
            status: r.status || 'active',
            failedLoginAttempts: r.failed_login_attempts || 0,
            lockedUntil: r.locked_until
                ? (r.locked_until instanceof Date ? r.locked_until.toISOString() : String(r.locked_until))
                : undefined,
            createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
            updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
        }));
    }
    /**
     * Find all users assigned to a specific store
     */
    async findByStore(storeId) {
        const results = await (0, index_js_1.query)(`SELECT u.*
       FROM Users u
       INNER JOIN UserStores us ON u.id = us.user_id
       WHERE us.store_id = @storeId
       ORDER BY u.display_name, u.email`, { storeId });
        const users = [];
        for (const r of results) {
            const user = {
                id: r.id,
                email: r.email,
                displayName: r.display_name || undefined,
                role: r.role,
                permissions: r.permissions ? JSON.parse(r.permissions) : undefined,
                status: r.status || 'active',
                failedLoginAttempts: r.failed_login_attempts || 0,
                lockedUntil: r.locked_until
                    ? (r.locked_until instanceof Date ? r.locked_until.toISOString() : String(r.locked_until))
                    : undefined,
                createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
                updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
            };
            const stores = await this.getUserStores(user.id);
            users.push({ ...user, stores });
        }
        return users;
    }
    /**
     * Find user by ID
     */
    async findById(id) {
        const result = await (0, index_js_1.queryOne)(`SELECT * FROM Users WHERE id = @id`, { id });
        if (!result)
            return null;
        return {
            id: result.id,
            email: result.email,
            displayName: result.display_name || undefined,
            role: result.role,
            permissions: result.permissions ? JSON.parse(result.permissions) : undefined,
            status: result.status || 'active',
            failedLoginAttempts: result.failed_login_attempts || 0,
            lockedUntil: result.locked_until
                ? (result.locked_until instanceof Date ? result.locked_until.toISOString() : String(result.locked_until))
                : undefined,
            createdAt: result.created_at instanceof Date ? result.created_at.toISOString() : String(result.created_at),
            updatedAt: result.updated_at instanceof Date ? result.updated_at.toISOString() : String(result.updated_at),
        };
    }
    /**
     * Find user by ID with stores
     */
    async findByIdWithStores(id) {
        const user = await this.findById(id);
        if (!user)
            return null;
        const stores = await this.getUserStores(id);
        return { ...user, stores };
    }
    /**
     * Find user by email
     */
    async findByEmail(email) {
        const result = await (0, index_js_1.queryOne)(`SELECT * FROM Users WHERE email = @email`, { email });
        if (!result)
            return null;
        return {
            id: result.id,
            email: result.email,
            displayName: result.display_name || undefined,
            role: result.role,
            permissions: result.permissions ? JSON.parse(result.permissions) : undefined,
            status: result.status || 'active',
            failedLoginAttempts: result.failed_login_attempts || 0,
            lockedUntil: result.locked_until
                ? (result.locked_until instanceof Date ? result.locked_until.toISOString() : String(result.locked_until))
                : undefined,
            createdAt: result.created_at instanceof Date ? result.created_at.toISOString() : String(result.created_at),
            updatedAt: result.updated_at instanceof Date ? result.updated_at.toISOString() : String(result.updated_at),
        };
    }
    /**
     * Check if email exists (for validation)
     */
    async emailExists(email, excludeId) {
        let queryString = `SELECT 1 FROM Users WHERE email = @email`;
        const params = { email };
        if (excludeId) {
            queryString += ` AND id != @excludeId`;
            params.excludeId = excludeId;
        }
        const result = await (0, index_js_1.queryOne)(queryString, params);
        return result !== null;
    }
    /**
     * Get stores assigned to a user with role/permission overrides
     */
    async getUserStores(userId) {
        const results = await (0, index_js_1.query)(`SELECT us.UserId as user_id, us.StoreId as store_id, 
              s.Name as store_name, s.Slug as store_slug,
              us.RoleOverride as role_override, us.PermissionsOverride as permissions_override
       FROM UserStores us
       INNER JOIN Stores s ON us.StoreId = s.Id
       WHERE us.UserId = @userId AND s.Status = 'active'
       ORDER BY s.Name`, { userId });
        return results.map(r => ({
            storeId: r.store_id,
            storeName: r.store_name,
            storeCode: r.store_slug,
            roleOverride: r.role_override,
            permissionsOverride: r.permissions_override ? JSON.parse(r.permissions_override) : undefined,
        }));
    }
    /**
     * Create a new user
     */
    async create(input) {
        const emailExists = await this.emailExists(input.email);
        if (emailExists) {
            throw new Error('Email đã được sử dụng');
        }
        const passwordHash = await (0, password_js_1.hashPassword)(input.password);
        const id = crypto.randomUUID();
        await (0, index_js_1.query)(`INSERT INTO Users (id, email, password_hash, display_name, role, permissions, status, failed_login_attempts, created_at, updated_at)
       VALUES (@id, @email, @passwordHash, @displayName, @role, @permissions, 'active', 0, GETDATE(), GETDATE())`, {
            id,
            email: input.email,
            passwordHash,
            displayName: input.displayName || null,
            role: input.role,
            permissions: input.permissions ? JSON.stringify(input.permissions) : null,
        });
        if (input.storeIds && input.storeIds.length > 0) {
            await this.assignStores(id, input.storeIds);
        }
        const created = await this.findById(id);
        if (!created) {
            throw new Error('Không thể tạo người dùng');
        }
        return created;
    }
    /**
     * Update an existing user
     */
    async update(id, input) {
        const existing = await this.findById(id);
        if (!existing) {
            throw new Error('Không tìm thấy người dùng');
        }
        if (input.email && input.email !== existing.email) {
            const emailExists = await this.emailExists(input.email, id);
            if (emailExists) {
                throw new Error('Email đã được sử dụng');
            }
        }
        let passwordHash = undefined;
        if (input.password) {
            passwordHash = await (0, password_js_1.hashPassword)(input.password);
        }
        // Check if role or permissions changed - need to invalidate cache
        const roleChanged = input.role && input.role !== existing.role;
        const permissionsChanged = input.permissions !== undefined;
        await (0, index_js_1.query)(`UPDATE Users SET 
        email = @email,
        display_name = @displayName,
        role = @role,
        permissions = @permissions,
        status = @status,
        ${passwordHash ? 'password_hash = @passwordHash,' : ''}
        updated_at = GETDATE()
       WHERE id = @id`, {
            id,
            email: input.email ?? existing.email,
            displayName: input.displayName ?? existing.displayName ?? null,
            role: input.role ?? existing.role,
            permissions: input.permissions ? JSON.stringify(input.permissions) : (existing.permissions ? JSON.stringify(existing.permissions) : null),
            status: input.status ?? existing.status,
            ...(passwordHash && { passwordHash }),
        });
        if (input.storeIds !== undefined) {
            await this.updateStoreAssignments(id, input.storeIds);
        }
        // Invalidate permission cache if role or permissions changed
        // Requirements: 6.5
        if (roleChanged || permissionsChanged) {
            (0, permission_service_js_1.invalidateUserPermissionCache)(id);
        }
        const updated = await this.findById(id);
        if (!updated) {
            throw new Error('Không thể cập nhật người dùng');
        }
        return updated;
    }
    /**
     * Delete a user
     */
    async delete(id) {
        const existing = await this.findById(id);
        if (!existing) {
            throw new Error('Không tìm thấy người dùng');
        }
        await (0, index_js_1.query)(`DELETE FROM UserStores WHERE UserId = @userId`, { userId: id });
        await (0, index_js_1.query)(`DELETE FROM Sessions WHERE UserId = @userId`, { userId: id });
        await (0, index_js_1.query)(`DELETE FROM Users WHERE Id = @id`, { id });
        return true;
    }
    /**
     * Assign stores to a user with optional role/permission overrides
     */
    async assignStores(userId, storeIds) {
        for (const storeId of storeIds) {
            const existing = await (0, index_js_1.queryOne)(`SELECT UserId FROM UserStores WHERE UserId = @userId AND StoreId = @storeId`, { userId, storeId });
            if (!existing) {
                const id = crypto.randomUUID();
                await (0, index_js_1.query)(`INSERT INTO UserStores (Id, UserId, StoreId, CreatedAt, UpdatedAt) 
           VALUES (@id, @userId, @storeId, GETDATE(), GETDATE())`, { id, userId, storeId });
            }
        }
    }
    /**
     * Assign a store to a user with role/permission overrides
     */
    async assignStoreWithOverrides(userId, input) {
        const existing = await (0, index_js_1.queryOne)(`SELECT UserId FROM UserStores WHERE UserId = @userId AND StoreId = @storeId`, { userId, storeId: input.storeId });
        if (existing) {
            // Update existing assignment
            await (0, index_js_1.query)(`UPDATE UserStores SET 
          RoleOverride = @roleOverride,
          PermissionsOverride = @permissionsOverride,
          UpdatedAt = GETDATE()
         WHERE UserId = @userId AND StoreId = @storeId`, {
                userId,
                storeId: input.storeId,
                roleOverride: input.roleOverride || null,
                permissionsOverride: input.permissionsOverride
                    ? JSON.stringify(input.permissionsOverride)
                    : null,
            });
        }
        else {
            // Create new assignment
            const id = crypto.randomUUID();
            await (0, index_js_1.query)(`INSERT INTO UserStores (Id, UserId, StoreId, RoleOverride, PermissionsOverride, CreatedAt, UpdatedAt) 
         VALUES (@id, @userId, @storeId, @roleOverride, @permissionsOverride, GETDATE(), GETDATE())`, {
                id,
                userId,
                storeId: input.storeId,
                roleOverride: input.roleOverride || null,
                permissionsOverride: input.permissionsOverride
                    ? JSON.stringify(input.permissionsOverride)
                    : null,
            });
        }
        // Invalidate permission cache when store assignments change
        // Requirements: 6.5
        (0, permission_service_js_1.invalidateUserPermissionCache)(userId);
    }
    /**
     * Get user's effective role for a specific store
     * Returns roleOverride if set, otherwise returns user's base role
     */
    async getEffectiveRoleForStore(userId, storeId) {
        const result = await (0, index_js_1.queryOne)(`SELECT u.Role as base_role, us.RoleOverride as role_override
       FROM Users u
       LEFT JOIN UserStores us ON u.Id = us.UserId AND us.StoreId = @storeId
       WHERE u.Id = @userId`, { userId, storeId });
        if (!result)
            return null;
        return (result.role_override || result.base_role);
    }
    /**
     * Update store assignments (replace all)
     */
    async updateStoreAssignments(userId, storeIds) {
        await (0, index_js_1.query)(`DELETE FROM UserStores WHERE UserId = @userId`, { userId });
        if (storeIds.length > 0) {
            await this.assignStores(userId, storeIds);
        }
        // Invalidate permission cache when store assignments change
        // Requirements: 6.5
        (0, permission_service_js_1.invalidateUserPermissionCache)(userId);
    }
    /**
     * Check if user has access to a store
     */
    async hasStoreAccess(userId, storeId) {
        const result = await (0, index_js_1.queryOne)(`SELECT UserId FROM UserStores WHERE UserId = @userId AND StoreId = @storeId`, { userId, storeId });
        return result !== null;
    }
    /**
     * Count users assigned to a store
     */
    async countByStore(storeId) {
        const result = await (0, index_js_1.queryOne)(`SELECT COUNT(*) as total FROM UserStores WHERE StoreId = @storeId`, { storeId });
        return result?.total ?? 0;
    }
    /**
     * Remove a user's access to a specific store
     */
    async removeStoreAccess(userId, storeId) {
        await (0, index_js_1.query)(`DELETE FROM UserStores WHERE UserId = @userId AND StoreId = @storeId`, { userId, storeId });
        return true;
    }
}
exports.UserRepository = UserRepository;
// Export singleton instance
exports.userRepository = new UserRepository();
//# sourceMappingURL=user-repository.js.map