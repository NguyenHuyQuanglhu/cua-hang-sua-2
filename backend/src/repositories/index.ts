/**
 * Repository Factory and Exports
 * 
 * This module provides a centralized way to access all repositories
 * with dependency injection support.
 */

// Export base repository classes and types
export {
  BaseRepository,
  TransactionRepository,
  type QueryOptions,
  type PaginationOptions,
  type PaginatedResult,
} from './base-repository';

// Export SP base repository for stored procedure operations
export {
  SPBaseRepository,
  type SPParamValue,
  type SPParams,
  type SPMultipleResults,
  type SPTransactionHelpers,
} from './sp-base-repository';

// Export Tenant repository (Master DB)
export {
  TenantRepository,
  tenantRepository,
  type Tenant,
  type CreateTenantInput,
  type UpdateTenantInput,
} from './tenant-repository';

// Export TenantUser repository (Master DB)
export {
  TenantUserRepository,
  tenantUserRepository,
  type TenantUser,
  type TenantUserWithTenant,
  type CreateTenantUserInput,
  type UpdateTenantUserInput,
  type LoginResult,
} from './tenant-user-repository';

// Export Category repository
// @deprecated - Use CategoriesSPRepository for new code
export {
  CategoryRepository,
  categoryRepository,
  type Category,
} from './category-repository';

// Export Unit repository
// @deprecated - Use UnitsSPRepository for new code
export {
  UnitRepository,
  unitRepository,
  type Unit,
  type UnitWithBaseUnit,
} from './unit-repository';

// Export Product repository
// @deprecated - Use ProductsSPRepository for new code
export {
  ProductRepository,
  productRepository,
  type Product,
  type ProductWithStock,
} from './product-repository';

// Export Products SP Repository (stored procedures)
export {
  ProductsSPRepository,
  productsSPRepository,
  type CreateProductSPInput,
  type UpdateProductSPInput,
} from './products-sp-repository';

// Export Inventory SP Repository (stored procedures)
export {
  InventorySPRepository,
  inventorySPRepository,
  type Inventory,
} from './inventory-sp-repository';

// Export Customers SP Repository (stored procedures)
export {
  CustomersSPRepository,
  customersSPRepository,
  type Customer as CustomerSP,
  type CreateCustomerSPInput,
  type UpdateCustomerSPInput,
} from './customers-sp-repository';

// Export Settings SP Repository (stored procedures)
export {
  SettingsSPRepository,
  settingsSPRepository,
  type Settings,
} from './settings-sp-repository';

// Export Units SP Repository (stored procedures)
export {
  UnitsSPRepository,
  unitsSPRepository,
  type Unit as UnitSP,
  type CreateUnitSPInput,
  type UpdateUnitSPInput,
} from './units-sp-repository';

// Export Categories SP Repository (stored procedures)
export {
  CategoriesSPRepository,
  categoriesSPRepository,
  type Category as CategorySP,
  type CreateCategorySPInput,
  type UpdateCategorySPInput,
} from './categories-sp-repository';

// Export Supplier repository
export {
  SupplierRepository,
  supplierRepository,
  type Supplier,
  type SupplierWithDebt,
} from './supplier-repository';

// Export Customer repository
// @deprecated - Use CustomersSPRepository for new code
export {
  CustomerRepository,
  customerRepository,
  type Customer,
  type CustomerWithDebt,
} from './customer-repository';

// Export PurchaseOrder repository
export {
  PurchaseOrderRepository,
  purchaseOrderRepository,
  type PurchaseOrder,
  type PurchaseOrderItem,
  type PurchaseLot as PurchaseOrderLot,
  type PurchaseOrderWithDetails,
  type PurchaseOrderItemWithProduct,
  type CreatePurchaseOrderInput,
  type CreatePurchaseOrderItemInput,
} from './purchase-order-repository';

// Export Sales repository
// @deprecated - Use SalesSPRepository for new code
export {
  SalesRepository,
  salesRepository,
  type Sale,
  type SalesItem,
} from './sales-repository';

// Export Sales SP Repository (stored procedures)
export {
  SalesSPRepository,
  salesSPRepository,
  type SaleWithCustomer,
  type SalesItemWithDetails,
  type SaleWithItems,
  type CreateSaleSPInput,
  type CreateSalesItemSPInput,
  type GetSalesByStoreFilters,
} from './sales-sp-repository';

// Export SupplierPayment repository
export {
  SupplierPaymentRepository,
  supplierPaymentRepository,
  type SupplierPayment,
  type SupplierPaymentWithSupplier,
} from './supplier-payment-repository';

// Export CashTransaction repository
export {
  CashTransactionRepository,
  cashTransactionRepository,
  type CashTransaction,
  type CashFlowSummary,
} from './cash-transaction-repository';

// Export Shift repository
export {
  ShiftRepository,
  shiftRepository,
  type Shift,
  type ShiftWithSummary,
  type CreateShiftInput,
  type CloseShiftInput,
} from './shift-repository';

// Export User repository
export {
  UserRepository,
  userRepository,
  type User,
  type UserWithStores,
  type UserStoreAssignment,
  type AssignStoreInput,
  type CreateUserInput,
  type UpdateUserInput,
} from './user-repository';

// Export Permission repository
export {
  PermissionRepository,
  permissionRepository,
  type PermissionRecord,
  type SetPermissionInput,
} from './permission-repository';

// Export AuditLog repository
export {
  AuditLogRepository,
  auditLogRepository,
  type AuditLog,
  type AuditAction,
  type CreateAuditLogInput,
  type AuditLogFilterOptions,
  type PaginatedAuditLogs,
} from './audit-log-repository';

// Export OnlineStore repository
export {
  OnlineStoreRepository,
  onlineStoreRepository,
  type OnlineStore,
  type CreateOnlineStoreInput,
  type UpdateOnlineStoreInput,
} from './online-store-repository';

// Export OnlineProduct repository
export {
  OnlineProductRepository,
  onlineProductRepository,
  type OnlineProduct,
  type OnlineProductWithDetails,
  type CreateOnlineProductInput,
  type UpdateOnlineProductInput,
} from './online-product-repository';

// Export ShoppingCart repository
export {
  ShoppingCartRepository,
  shoppingCartRepository,
  type ShoppingCart,
  type CartItem,
  type CartItemWithProduct,
  type ShoppingCartWithItems,
} from './shopping-cart-repository';

// Export OnlineOrder repository
export {
  OnlineOrderRepository,
  onlineOrderRepository,
  type OnlineOrder,
  type OnlineOrderItem,
  type OnlineOrderWithItems,
  type OrderStatus,
  type PaymentStatus,
  type PaymentMethod,
  type ShippingAddress,
  type CreateOnlineOrderInput,
  type CreateOnlineOrderItemInput,
  type OrderFilterOptions,
} from './online-order-repository';

// Export OnlineCustomer repository
export {
  OnlineCustomerRepository,
  onlineCustomerRepository,
  type OnlineCustomer,
  type CustomerAddress,
  type OnlineCustomerWithAddresses,
  type CreateOnlineCustomerInput,
  type CreateCustomerAddressInput,
} from './online-customer-repository';

// Export ShippingZone repository
export {
  ShippingZoneRepository,
  shippingZoneRepository,
  type ShippingZone,
  type CreateShippingZoneInput,
  type UpdateShippingZoneInput,
  type ShippingFeeResult,
} from './shipping-zone-repository';

// Export InventoryTransfer repository
export {
  InventoryTransferRepository,
  inventoryTransferRepository,
  type InventoryTransfer,
  type InventoryTransferItem,
  type InventoryTransferWithDetails,
  type InventoryTransferItemWithProduct,
  type CreateInventoryTransferInput,
  type CreateInventoryTransferItemInput,
} from './inventory-transfer-repository';

// Export ProductUnits repository
export {
  ProductUnitsRepository,
  productUnitsRepository,
  type ProductUnit,
  type ProductUnitWithNames,
} from './product-units-repository';

// Export ProductInventory repository
export {
  ProductInventoryRepository,
  productInventoryRepository,
  type ProductInventory,
  type ProductInventoryWithDetails,
} from './product-inventory-repository';

// Export UnitConversionLog repository
export {
  UnitConversionLogRepository,
  unitConversionLogRepository,
  type UnitConversionLog,
  type UnitConversionLogWithDetails,
} from './unit-conversion-log-repository';

/**
 * Repository container interface for dependency injection
 */
export interface RepositoryContainer {
  // Repositories will be added here as they are implemented
  // Example:
  // category: CategoryRepository;
  // unit: UnitRepository;
  // product: ProductRepository;
  // supplier: SupplierRepository;
  // customer: CustomerRepository;
  // sale: SalesRepository;
  // purchaseOrder: PurchaseOrderRepository;
  // payment: PaymentRepository;
  // supplierPayment: SupplierPaymentRepository;
  // cashTransaction: CashTransactionRepository;
  // shift: ShiftRepository;
  // user: UserRepository;
  // auditLog: AuditLogRepository;
}

/**
 * Repository factory class implementing dependency injection pattern
 * Provides singleton instances of repositories
 */
class RepositoryFactory {
  private static instance: RepositoryFactory;
  private repositories: Map<string, unknown> = new Map();

  private constructor() {}

  /**
   * Get the singleton instance of the factory
   */
  static getInstance(): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory();
    }
    return RepositoryFactory.instance;
  }

  /**
   * Register a repository instance
   */
  register<T>(name: string, repository: T): void {
    this.repositories.set(name, repository);
  }

  /**
   * Get a repository by name
   */
  get<T>(name: string): T {
    const repository = this.repositories.get(name);
    if (!repository) {
      throw new Error(`Repository '${name}' not registered`);
    }
    return repository as T;
  }

  /**
   * Check if a repository is registered
   */
  has(name: string): boolean {
    return this.repositories.has(name);
  }

  /**
   * Clear all registered repositories (useful for testing)
   */
  clear(): void {
    this.repositories.clear();
  }
}

// Export singleton factory instance
export const repositoryFactory = RepositoryFactory.getInstance();

/**
 * Helper function to get a repository from the factory
 */
export function getRepository<T>(name: string): T {
  return repositoryFactory.get<T>(name);
}

/**
 * Helper function to register a repository
 */
export function registerRepository<T>(name: string, repository: T): void {
  repositoryFactory.register(name, repository);
}

// Repository names constants for type safety
export const REPOSITORY_NAMES = {
  // Master DB repositories
  TENANT: 'tenant',
  TENANT_USER: 'tenantUser',
  // Tenant DB repositories
  CATEGORY: 'category',
  UNIT: 'unit',
  PRODUCT: 'product',
  PRODUCT_SP: 'productSP',
  INVENTORY_SP: 'inventorySP',
  CUSTOMER_SP: 'customerSP',
  SETTINGS_SP: 'settingsSP',
  UNITS_SP: 'unitsSP',
  CATEGORIES_SP: 'categoriesSP',
  SUPPLIER: 'supplier',
  CUSTOMER: 'customer',
  SALE: 'sale',
  PURCHASE_ORDER: 'purchaseOrder',
  PAYMENT: 'payment',
  SUPPLIER_PAYMENT: 'supplierPayment',
  CASH_TRANSACTION: 'cashTransaction',
  SHIFT: 'shift',
  USER: 'user',
  PERMISSION: 'permission',
  AUDIT_LOG: 'auditLog',
  STORE: 'store',
  ONLINE_STORE: 'onlineStore',
  ONLINE_PRODUCT: 'onlineProduct',
  SHOPPING_CART: 'shoppingCart',
  ONLINE_ORDER: 'onlineOrder',
  ONLINE_CUSTOMER: 'onlineCustomer',
  SHIPPING_ZONE: 'shippingZone',
  INVENTORY_TRANSFER: 'inventoryTransfer',
  PRODUCT_UNITS: 'productUnits',
  PRODUCT_INVENTORY: 'productInventory',
  UNIT_CONVERSION_LOG: 'unitConversionLog',
} as const;

export type RepositoryName = typeof REPOSITORY_NAMES[keyof typeof REPOSITORY_NAMES];
