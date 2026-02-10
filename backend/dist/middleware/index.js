"use strict";
/**
 * Middleware exports
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissions = exports.requireUserManagement = exports.requireMinRole = exports.requireStoreAccess = exports.requireAnyPermission = exports.requireAllPermissions = exports.requireModulePermission = exports.ensureTenantContext = exports.requirePermission = exports.authorize = exports.storeContext = exports.authenticate = void 0;
// Authentication middleware
var auth_1 = require("./auth");
Object.defineProperty(exports, "authenticate", { enumerable: true, get: function () { return auth_1.authenticate; } });
Object.defineProperty(exports, "storeContext", { enumerable: true, get: function () { return auth_1.storeContext; } });
Object.defineProperty(exports, "authorize", { enumerable: true, get: function () { return auth_1.authorize; } });
Object.defineProperty(exports, "requirePermission", { enumerable: true, get: function () { return auth_1.requirePermission; } });
Object.defineProperty(exports, "ensureTenantContext", { enumerable: true, get: function () { return auth_1.ensureTenantContext; } });
// Permission middleware
var permission_1 = require("./permission");
Object.defineProperty(exports, "requireModulePermission", { enumerable: true, get: function () { return permission_1.requireModulePermission; } });
Object.defineProperty(exports, "requireAllPermissions", { enumerable: true, get: function () { return permission_1.requireAllPermissions; } });
Object.defineProperty(exports, "requireAnyPermission", { enumerable: true, get: function () { return permission_1.requireAnyPermission; } });
Object.defineProperty(exports, "requireStoreAccess", { enumerable: true, get: function () { return permission_1.requireStoreAccess; } });
Object.defineProperty(exports, "requireMinRole", { enumerable: true, get: function () { return permission_1.requireMinRole; } });
Object.defineProperty(exports, "requireUserManagement", { enumerable: true, get: function () { return permission_1.requireUserManagement; } });
Object.defineProperty(exports, "permissions", { enumerable: true, get: function () { return permission_1.permissions; } });
//# sourceMappingURL=index.js.map