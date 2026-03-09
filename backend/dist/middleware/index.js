"use strict";
/**
 * Middleware exports
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.MigrationError = exports.DatabaseConstraintError = exports.DatabaseTimeoutError = exports.DatabaseConnectionError = exports.DatabaseError = exports.AppError = exports.createValidationError = exports.handleMigrationOperation = exports.handleDatabaseOperation = exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = exports.validateStatusQuery = exports.validateAndNormalizeStatus = exports.permissions = exports.requireUserManagement = exports.requireMinRole = exports.requireStoreAccess = exports.requireAnyPermission = exports.requireAllPermissions = exports.requireModulePermission = exports.ensureTenantContext = exports.requirePermission = exports.authorize = exports.storeContext = exports.authenticate = void 0;
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
// Status validation middleware
var validateStatus_1 = require("./validateStatus");
Object.defineProperty(exports, "validateAndNormalizeStatus", { enumerable: true, get: function () { return validateStatus_1.validateAndNormalizeStatus; } });
Object.defineProperty(exports, "validateStatusQuery", { enumerable: true, get: function () { return validateStatus_1.validateStatusQuery; } });
// Error handling middleware
var errorHandler_1 = require("./errorHandler");
Object.defineProperty(exports, "errorHandler", { enumerable: true, get: function () { return errorHandler_1.errorHandler; } });
Object.defineProperty(exports, "asyncHandler", { enumerable: true, get: function () { return errorHandler_1.asyncHandler; } });
Object.defineProperty(exports, "notFoundHandler", { enumerable: true, get: function () { return errorHandler_1.notFoundHandler; } });
Object.defineProperty(exports, "handleDatabaseOperation", { enumerable: true, get: function () { return errorHandler_1.handleDatabaseOperation; } });
Object.defineProperty(exports, "handleMigrationOperation", { enumerable: true, get: function () { return errorHandler_1.handleMigrationOperation; } });
Object.defineProperty(exports, "createValidationError", { enumerable: true, get: function () { return errorHandler_1.createValidationError; } });
Object.defineProperty(exports, "AppError", { enumerable: true, get: function () { return errorHandler_1.AppError; } });
Object.defineProperty(exports, "DatabaseError", { enumerable: true, get: function () { return errorHandler_1.DatabaseError; } });
Object.defineProperty(exports, "DatabaseConnectionError", { enumerable: true, get: function () { return errorHandler_1.DatabaseConnectionError; } });
Object.defineProperty(exports, "DatabaseTimeoutError", { enumerable: true, get: function () { return errorHandler_1.DatabaseTimeoutError; } });
Object.defineProperty(exports, "DatabaseConstraintError", { enumerable: true, get: function () { return errorHandler_1.DatabaseConstraintError; } });
Object.defineProperty(exports, "MigrationError", { enumerable: true, get: function () { return errorHandler_1.MigrationError; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return errorHandler_1.ValidationError; } });
Object.defineProperty(exports, "NotFoundError", { enumerable: true, get: function () { return errorHandler_1.NotFoundError; } });
Object.defineProperty(exports, "UnauthorizedError", { enumerable: true, get: function () { return errorHandler_1.UnauthorizedError; } });
Object.defineProperty(exports, "ForbiddenError", { enumerable: true, get: function () { return errorHandler_1.ForbiddenError; } });
Object.defineProperty(exports, "ConflictError", { enumerable: true, get: function () { return errorHandler_1.ConflictError; } });
//# sourceMappingURL=index.js.map