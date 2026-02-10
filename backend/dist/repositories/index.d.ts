/**
 * Repository Factory and Exports
 *
 * This module provides a centralized way to access all repositories
 * with dependency injection support.
 */
export { BaseRepository, TransactionRepository, type QueryOptions, type PaginationOptions, type PaginatedResult, } from './base-repository';
export { SPBaseRepository, type SPParamValue, type SPParams, type SPMultipleResults, type SPTransactionHelpers, } from './sp-base-repository';
export { TenantRepository, tenantRepository, type Tenant, type CreateTenantInput, type UpdateTenantInput, } from './tenant-repository';
export { TenantUserRepository, tenantUserRepository, type TenantUser, type TenantUserWithTenant, type CreateTenantUserInput, type UpdateTenantUserInput, type LoginResult, } from './tenant-user-repository';
export { CategoryRepository, categoryRepository, type Category, } from './category-repository';
export { UnitRepository, unitRepository, type Unit, type UnitWithBaseUnit, } from './unit-repository';
export { ProductRepository, productRepository, type Product, type ProductWithStock, } from './product-repository';
export { ProductsSPRepository, productsSPRepository, type CreateProductSPInput, type UpdateProductSPInput, } from './products-sp-repository';
export { InventorySPRepository, inventorySPRepository, type Inventory, } from './inventory-sp-repository';
export { CustomersSPRepository, customersSPRepository, type Customer as CustomerSP, type CreateCustomerSPInput, type UpdateCustomerSPInput, } from './customers-sp-repository';
export { SettingsSPRepository, settingsSPRepository, type Settings, } from './settings-sp-repository';
export { UnitsSPRepository, unitsSPRepository, type Unit as UnitSP, type CreateUnitSPInput, type UpdateUnitSPInput, } from './units-sp-repository';
export { CategoriesSPRepository, categoriesSPRepository, type Category as CategorySP, type CreateCategorySPInput, type UpdateCategorySPInput, } from './categories-sp-repository';
export { SupplierRepository, supplierRepository, type Supplier, type SupplierWithDebt, } from './supplier-repository';
export { CustomerRepository, customerRepository, type Customer, type CustomerWithDebt, } from './customer-repository';
export { PurchaseOrderRepository, purchaseOrderRepository, type PurchaseOrder, type PurchaseOrderItem, type PurchaseLot as PurchaseOrderLot, type PurchaseOrderWithDetails, type PurchaseOrderItemWithProduct, type CreatePurchaseOrderInput, type CreatePurchaseOrderItemInput, } from './purchase-order-repository';
export { SalesRepository, salesRepository, type Sale, type SalesItem, } from './sales-repository';
export { SalesSPRepository, salesSPRepository, type SaleWithCustomer, type SalesItemWithDetails, type SaleWithItems, type CreateSaleSPInput, type CreateSalesItemSPInput, type GetSalesByStoreFilters, } from './sales-sp-repository';
export { PaymentRepository, paymentRepository, type Payment, } from './payment-repository';
export { SupplierPaymentRepository, supplierPaymentRepository, type SupplierPayment, type SupplierPaymentWithSupplier, } from './supplier-payment-repository';
export { CashTransactionRepository, cashTransactionRepository, type CashTransaction, type CashFlowSummary, } from './cash-transaction-repository';
export { ShiftRepository, shiftRepository, type Shift, type ShiftWithSummary, type CreateShiftInput, type CloseShiftInput, } from './shift-repository';
export { UserRepository, userRepository, type User, type UserWithStores, type UserStoreAssignment, type AssignStoreInput, type CreateUserInput, type UpdateUserInput, } from './user-repository';
export { PermissionRepository, permissionRepository, type PermissionRecord, type SetPermissionInput, } from './permission-repository';
export { AuditLogRepository, auditLogRepository, type AuditLog, type AuditAction, type CreateAuditLogInput, type AuditLogFilterOptions, type PaginatedAuditLogs, } from './audit-log-repository';
export { OnlineStoreRepository, onlineStoreRepository, type OnlineStore, type CreateOnlineStoreInput, type UpdateOnlineStoreInput, } from './online-store-repository';
export { OnlineProductRepository, onlineProductRepository, type OnlineProduct, type OnlineProductWithDetails, type CreateOnlineProductInput, type UpdateOnlineProductInput, } from './online-product-repository';
export { ShoppingCartRepository, shoppingCartRepository, type ShoppingCart, type CartItem, type CartItemWithProduct, type ShoppingCartWithItems, } from './shopping-cart-repository';
export { OnlineOrderRepository, onlineOrderRepository, type OnlineOrder, type OnlineOrderItem, type OnlineOrderWithItems, type OrderStatus, type PaymentStatus, type PaymentMethod, type ShippingAddress, type CreateOnlineOrderInput, type CreateOnlineOrderItemInput, type OrderFilterOptions, } from './online-order-repository';
export { OnlineCustomerRepository, onlineCustomerRepository, type OnlineCustomer, type CustomerAddress, type OnlineCustomerWithAddresses, type CreateOnlineCustomerInput, type CreateCustomerAddressInput, } from './online-customer-repository';
export { ShippingZoneRepository, shippingZoneRepository, type ShippingZone, type CreateShippingZoneInput, type UpdateShippingZoneInput, type ShippingFeeResult, } from './shipping-zone-repository';
export { InventoryTransferRepository, inventoryTransferRepository, type InventoryTransfer, type InventoryTransferItem, type InventoryTransferWithDetails, type InventoryTransferItemWithProduct, type CreateInventoryTransferInput, type CreateInventoryTransferItemInput, } from './inventory-transfer-repository';
export { ProductUnitsRepository, productUnitsRepository, type ProductUnit, type ProductUnitWithNames, } from './product-units-repository';
export { ProductInventoryRepository, productInventoryRepository, type ProductInventory, type ProductInventoryWithDetails, } from './product-inventory-repository';
export { UnitConversionLogRepository, unitConversionLogRepository, type UnitConversionLog, type UnitConversionLogWithDetails, } from './unit-conversion-log-repository';
/**
 * Repository container interface for dependency injection
 */
export interface RepositoryContainer {
}
/**
 * Repository factory class implementing dependency injection pattern
 * Provides singleton instances of repositories
 */
declare class RepositoryFactory {
    private static instance;
    private repositories;
    private constructor();
    /**
     * Get the singleton instance of the factory
     */
    static getInstance(): RepositoryFactory;
    /**
     * Register a repository instance
     */
    register<T>(name: string, repository: T): void;
    /**
     * Get a repository by name
     */
    get<T>(name: string): T;
    /**
     * Check if a repository is registered
     */
    has(name: string): boolean;
    /**
     * Clear all registered repositories (useful for testing)
     */
    clear(): void;
}
export declare const repositoryFactory: RepositoryFactory;
/**
 * Helper function to get a repository from the factory
 */
export declare function getRepository<T>(name: string): T;
/**
 * Helper function to register a repository
 */
export declare function registerRepository<T>(name: string, repository: T): void;
export declare const REPOSITORY_NAMES: {
    readonly TENANT: "tenant";
    readonly TENANT_USER: "tenantUser";
    readonly CATEGORY: "category";
    readonly UNIT: "unit";
    readonly PRODUCT: "product";
    readonly PRODUCT_SP: "productSP";
    readonly INVENTORY_SP: "inventorySP";
    readonly CUSTOMER_SP: "customerSP";
    readonly SETTINGS_SP: "settingsSP";
    readonly UNITS_SP: "unitsSP";
    readonly CATEGORIES_SP: "categoriesSP";
    readonly SUPPLIER: "supplier";
    readonly CUSTOMER: "customer";
    readonly SALE: "sale";
    readonly PURCHASE_ORDER: "purchaseOrder";
    readonly PAYMENT: "payment";
    readonly SUPPLIER_PAYMENT: "supplierPayment";
    readonly CASH_TRANSACTION: "cashTransaction";
    readonly SHIFT: "shift";
    readonly USER: "user";
    readonly PERMISSION: "permission";
    readonly AUDIT_LOG: "auditLog";
    readonly STORE: "store";
    readonly ONLINE_STORE: "onlineStore";
    readonly ONLINE_PRODUCT: "onlineProduct";
    readonly SHOPPING_CART: "shoppingCart";
    readonly ONLINE_ORDER: "onlineOrder";
    readonly ONLINE_CUSTOMER: "onlineCustomer";
    readonly SHIPPING_ZONE: "shippingZone";
    readonly INVENTORY_TRANSFER: "inventoryTransfer";
    readonly PRODUCT_UNITS: "productUnits";
    readonly PRODUCT_INVENTORY: "productInventory";
    readonly UNIT_CONVERSION_LOG: "unitConversionLog";
};
export type RepositoryName = typeof REPOSITORY_NAMES[keyof typeof REPOSITORY_NAMES];
//# sourceMappingURL=index.d.ts.map