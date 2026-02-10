"use strict";
/**
 * Permission Repository
 *
 * Manages custom permissions per user per module with store-specific support.
 * These permissions override the default role-based permissions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissionRepository = exports.PermissionRepository = void 0;
const index_js_1 = require("../db/index.js");
/**
 * Permission repository for managing custom user permissions
 */
class PermissionRepository {
    /**
     * Get all custom permissions for a user
     */
    async getByUserId(userId) {
        const results = await (0, index_js_1.query)(`SELECT Id, UserId, Module, Actions, StoreId, CreatedAt, UpdatedAt
       FROM Permissions
       WHERE UserId = @userId
       ORDER BY Module, StoreId`, { userId });
        return results.map(r => ({
            id: r.Id,
            userId: r.UserId,
            module: r.Module,
            actions: JSON.parse(r.Actions),
            storeId: r.StoreId,
            createdAt: r.CreatedAt instanceof Date ? r.CreatedAt.toISOString() : String(r.CreatedAt),
            updatedAt: r.UpdatedAt instanceof Date ? r.UpdatedAt.toISOString() : String(r.UpdatedAt),
        }));
    }
    /**
     * Get custom permissions for a user for a specific store
     * Returns both global permissions (storeId = NULL) and store-specific permissions
     */
    async getByUserAndStore(userId, storeId) {
        const results = await (0, index_js_1.query)(`SELECT Id, UserId, Module, Actions, StoreId, CreatedAt, UpdatedAt
       FROM Permissions
       WHERE UserId = @userId AND (StoreId IS NULL OR StoreId = @storeId)
       ORDER BY Module, StoreId`, { userId, storeId });
        return results.map(r => ({
            id: r.Id,
            userId: r.UserId,
            module: r.Module,
            actions: JSON.parse(r.Actions),
            storeId: r.StoreId,
            createdAt: r.CreatedAt instanceof Date ? r.CreatedAt.toISOString() : String(r.CreatedAt),
            updatedAt: r.UpdatedAt instanceof Date ? r.UpdatedAt.toISOString() : String(r.UpdatedAt),
        }));
    }
    /**
     * Get a specific permission record
     */
    async getByUserModuleStore(userId, module, storeId) {
        const storeCondition = storeId === null
            ? 'StoreId IS NULL'
            : 'StoreId = @storeId';
        const result = await (0, index_js_1.queryOne)(`SELECT Id, UserId, Module, Actions, StoreId, CreatedAt, UpdatedAt
       FROM Permissions
       WHERE UserId = @userId AND Module = @module AND ${storeCondition}`, { userId, module, storeId });
        if (!result)
            return null;
        return {
            id: result.Id,
            userId: result.UserId,
            module: result.Module,
            actions: JSON.parse(result.Actions),
            storeId: result.StoreId,
            createdAt: result.CreatedAt instanceof Date ? result.CreatedAt.toISOString() : String(result.CreatedAt),
            updatedAt: result.UpdatedAt instanceof Date ? result.UpdatedAt.toISOString() : String(result.UpdatedAt),
        };
    }
    /**
     * Set permission for a user on a module (create or update)
     */
    async setPermission(input) {
        const { userId, module, actions, storeId = null } = input;
        // Check if permission already exists
        const existing = await this.getByUserModuleStore(userId, module, storeId);
        if (existing) {
            // Update existing permission
            await (0, index_js_1.query)(`UPDATE Permissions 
         SET Actions = @actions, UpdatedAt = GETDATE()
         WHERE Id = @id`, {
                id: existing.id,
                actions: JSON.stringify(actions)
            });
            return {
                ...existing,
                actions,
                updatedAt: new Date().toISOString(),
            };
        }
        else {
            // Create new permission
            const id = crypto.randomUUID();
            await (0, index_js_1.query)(`INSERT INTO Permissions (Id, UserId, Module, Actions, StoreId, CreatedAt, UpdatedAt)
         VALUES (@id, @userId, @module, @actions, @storeId, GETDATE(), GETDATE())`, {
                id,
                userId,
                module,
                actions: JSON.stringify(actions),
                storeId,
            });
            const created = await this.getByUserModuleStore(userId, module, storeId);
            if (!created) {
                throw new Error('Failed to create permission');
            }
            return created;
        }
    }
    /**
     * Set multiple permissions for a user at once
     */
    async setPermissions(userId, permissions, storeId) {
        for (const [module, actions] of Object.entries(permissions)) {
            if (actions && actions.length > 0) {
                await this.setPermission({
                    userId,
                    module: module,
                    actions,
                    storeId: storeId ?? null,
                });
            }
            else {
                // Remove permission if actions is empty
                await this.deletePermission(userId, module, storeId ?? null);
            }
        }
    }
    /**
     * Delete a specific permission
     */
    async deletePermission(userId, module, storeId) {
        const storeCondition = storeId === null
            ? 'StoreId IS NULL'
            : 'StoreId = @storeId';
        await (0, index_js_1.query)(`DELETE FROM Permissions 
       WHERE UserId = @userId AND Module = @module AND ${storeCondition}`, { userId, module, storeId });
        return true;
    }
    /**
     * Delete all permissions for a user
     */
    async deleteAllForUser(userId) {
        await (0, index_js_1.query)(`DELETE FROM Permissions WHERE UserId = @userId`, { userId });
        return true;
    }
    /**
     * Delete all permissions for a specific store
     */
    async deleteAllForStore(storeId) {
        await (0, index_js_1.query)(`DELETE FROM Permissions WHERE StoreId = @storeId`, { storeId });
        return true;
    }
    /**
     * Get effective permissions for a user for a specific store
     * Merges global permissions with store-specific permissions
     * Store-specific permissions take precedence
     */
    async getEffectivePermissions(userId, storeId) {
        const records = await this.getByUserAndStore(userId, storeId);
        const permissions = {};
        // First, apply global permissions (storeId = NULL)
        for (const record of records.filter(r => r.storeId === null)) {
            permissions[record.module] = record.actions;
        }
        // Then, override with store-specific permissions
        for (const record of records.filter(r => r.storeId === storeId)) {
            permissions[record.module] = record.actions;
        }
        return permissions;
    }
    /**
     * Convert user's custom permissions to Permissions object
     */
    async toPermissionsObject(userId) {
        const records = await this.getByUserId(userId);
        const permissions = {};
        for (const record of records.filter(r => r.storeId === null)) {
            permissions[record.module] = record.actions;
        }
        return permissions;
    }
    /**
     * Check if user has a specific permission for a module in a store
     */
    async hasPermission(userId, module, action, storeId) {
        // Get store-specific permission first
        if (storeId) {
            const storePermission = await this.getByUserModuleStore(userId, module, storeId);
            if (storePermission) {
                return storePermission.actions.includes(action);
            }
        }
        // Fall back to global permission
        const globalPermission = await this.getByUserModuleStore(userId, module, null);
        if (globalPermission) {
            return globalPermission.actions.includes(action);
        }
        return false;
    }
}
exports.PermissionRepository = PermissionRepository;
// Export singleton instance
exports.permissionRepository = new PermissionRepository();
//# sourceMappingURL=permission-repository.js.map