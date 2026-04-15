export {
  OrderProcessingService,
  orderProcessingService,
  InsufficientStockError,
  type InsufficientStockItem,
} from './order-processing-service';

export {
  OrderStatusService,
  orderStatusService,
  InvalidStatusTransitionError,
  OrderNotFoundError,
  type StatusTransitionResult,
} from './order-status-service';

export {
  PaymentService,
  paymentService,
  PaymentStatusError,
  type BankTransferConfirmationInput,
  type CODPaymentInput,
  type PaymentResult,
  type BankAccountInfo,
} from './payment-service';

export {
  EmailNotificationService,
  emailNotificationService,
} from './email-notification-service';

export {
  AuthService,
  authService,
  type MultiTenantJwtPayload,
  type AuthenticationResult,
  type TenantDbUser,
  type UserStoreInfo,
} from './auth-service';

export {
  PermissionService,
  permissionService,
  invalidateUserPermissionCache,
  invalidateTenantPermissionCache,
  invalidateRolePermissionCache,
  invalidateStorePermissionCache,
  type PermissionCheckResult,
  type UserPermissionContext,
  type PermissionServiceConfig,
  type CacheStats,
} from './permission-service';

// Cache module exports
export {
  MemoryCache,
  PermissionCache,
  permissionCache,
  type ICache,
  type CacheConfig,
  type CacheEntry,
} from './cache';

// Inventory Transfer service
export {
  InventoryTransferService,
  inventoryTransferService,
  InsufficientStockException,
  type TransferItemInput,
  type InventoryTransferRequest,
  type TransferredItem,
  type InventoryTransferResult,
  type InsufficientStockError as TransferInsufficientStockError,
} from './inventory-transfer-service';

// Sync Data service
export {
  SyncDataService,
  syncDataService,
  UNITS_BY_STORE_TYPE,
  SUPPLIERS_BY_STORE_TYPE,
  SAMPLE_CUSTOMERS,
  type SyncDataResult,
} from './sync-data-service';

// Inventory service (Unit Conversion)
export {
  InventoryService,
  inventoryService,
  InsufficientStockError as InventoryInsufficientStockError,
  type DeductInventoryResult,
  type InventoryDisplayInfo,
} from './inventory-service';

// Sales service
export {
  SalesService,
  salesService,
  type CreateSaleItemInput,
  type CreateSaleInput,
  type CreateSaleResult,
} from './sales-service';

// Status Mapper service
export {
  StatusMapper,
} from './statusMapper';
