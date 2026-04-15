/**
 * Middleware exports
 */

// Authentication middleware
export {
  authenticate,
  storeContext,
  authorize,
  requirePermission,
  ensureTenantContext,
  type AuthUser,
  type AuthRequest,
} from './auth';

// Permission middleware
export {
  requireModulePermission,
  requireAllPermissions,
  requireAnyPermission,
  requireStoreAccess,
  requireMinRole,
  requireUserManagement,
  permissions,
  type PermissionCheckOptions,
} from './permission';

// Status validation middleware
export {
  validateAndNormalizeStatus,
  validateStatusQuery,
} from './validateStatus';

// Error handling middleware
export {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  handleDatabaseOperation,
  handleMigrationOperation,
  createValidationError,
  AppError,
  DatabaseError,
  DatabaseConnectionError,
  DatabaseTimeoutError,
  DatabaseConstraintError,
  MigrationError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from './errorHandler';
