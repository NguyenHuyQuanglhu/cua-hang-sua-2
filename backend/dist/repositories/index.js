"use strict";
/**
 * Repository Factory and Exports
 *
 * This module provides a centralized way to access all repositories
 * with dependency injection support.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnlineStoreRepository = exports.auditLogRepository = exports.AuditLogRepository = exports.permissionRepository = exports.PermissionRepository = exports.userRepository = exports.UserRepository = exports.shiftRepository = exports.ShiftRepository = exports.cashTransactionRepository = exports.CashTransactionRepository = exports.supplierPaymentRepository = exports.SupplierPaymentRepository = exports.paymentRepository = exports.PaymentRepository = exports.salesSPRepository = exports.SalesSPRepository = exports.salesRepository = exports.SalesRepository = exports.purchaseOrderRepository = exports.PurchaseOrderRepository = exports.customerRepository = exports.CustomerRepository = exports.supplierRepository = exports.SupplierRepository = exports.categoriesSPRepository = exports.CategoriesSPRepository = exports.unitsSPRepository = exports.UnitsSPRepository = exports.settingsSPRepository = exports.SettingsSPRepository = exports.customersSPRepository = exports.CustomersSPRepository = exports.inventorySPRepository = exports.InventorySPRepository = exports.productsSPRepository = exports.ProductsSPRepository = exports.productRepository = exports.ProductRepository = exports.unitRepository = exports.UnitRepository = exports.categoryRepository = exports.CategoryRepository = exports.tenantUserRepository = exports.TenantUserRepository = exports.tenantRepository = exports.TenantRepository = exports.SPBaseRepository = exports.TransactionRepository = exports.BaseRepository = void 0;
exports.REPOSITORY_NAMES = exports.repositoryFactory = exports.unitConversionLogRepository = exports.UnitConversionLogRepository = exports.productInventoryRepository = exports.ProductInventoryRepository = exports.productUnitsRepository = exports.ProductUnitsRepository = exports.inventoryTransferRepository = exports.InventoryTransferRepository = exports.shippingZoneRepository = exports.ShippingZoneRepository = exports.onlineCustomerRepository = exports.OnlineCustomerRepository = exports.onlineOrderRepository = exports.OnlineOrderRepository = exports.shoppingCartRepository = exports.ShoppingCartRepository = exports.onlineProductRepository = exports.OnlineProductRepository = exports.onlineStoreRepository = void 0;
exports.getRepository = getRepository;
exports.registerRepository = registerRepository;
// Export base repository classes and types
var base_repository_1 = require("./base-repository");
Object.defineProperty(exports, "BaseRepository", { enumerable: true, get: function () { return base_repository_1.BaseRepository; } });
Object.defineProperty(exports, "TransactionRepository", { enumerable: true, get: function () { return base_repository_1.TransactionRepository; } });
// Export SP base repository for stored procedure operations
var sp_base_repository_1 = require("./sp-base-repository");
Object.defineProperty(exports, "SPBaseRepository", { enumerable: true, get: function () { return sp_base_repository_1.SPBaseRepository; } });
// Export Tenant repository (Master DB)
var tenant_repository_1 = require("./tenant-repository");
Object.defineProperty(exports, "TenantRepository", { enumerable: true, get: function () { return tenant_repository_1.TenantRepository; } });
Object.defineProperty(exports, "tenantRepository", { enumerable: true, get: function () { return tenant_repository_1.tenantRepository; } });
// Export TenantUser repository (Master DB)
var tenant_user_repository_1 = require("./tenant-user-repository");
Object.defineProperty(exports, "TenantUserRepository", { enumerable: true, get: function () { return tenant_user_repository_1.TenantUserRepository; } });
Object.defineProperty(exports, "tenantUserRepository", { enumerable: true, get: function () { return tenant_user_repository_1.tenantUserRepository; } });
// Export Category repository
// @deprecated - Use CategoriesSPRepository for new code
var category_repository_1 = require("./category-repository");
Object.defineProperty(exports, "CategoryRepository", { enumerable: true, get: function () { return category_repository_1.CategoryRepository; } });
Object.defineProperty(exports, "categoryRepository", { enumerable: true, get: function () { return category_repository_1.categoryRepository; } });
// Export Unit repository
// @deprecated - Use UnitsSPRepository for new code
var unit_repository_1 = require("./unit-repository");
Object.defineProperty(exports, "UnitRepository", { enumerable: true, get: function () { return unit_repository_1.UnitRepository; } });
Object.defineProperty(exports, "unitRepository", { enumerable: true, get: function () { return unit_repository_1.unitRepository; } });
// Export Product repository
// @deprecated - Use ProductsSPRepository for new code
var product_repository_1 = require("./product-repository");
Object.defineProperty(exports, "ProductRepository", { enumerable: true, get: function () { return product_repository_1.ProductRepository; } });
Object.defineProperty(exports, "productRepository", { enumerable: true, get: function () { return product_repository_1.productRepository; } });
// Export Products SP Repository (stored procedures)
var products_sp_repository_1 = require("./products-sp-repository");
Object.defineProperty(exports, "ProductsSPRepository", { enumerable: true, get: function () { return products_sp_repository_1.ProductsSPRepository; } });
Object.defineProperty(exports, "productsSPRepository", { enumerable: true, get: function () { return products_sp_repository_1.productsSPRepository; } });
// Export Inventory SP Repository (stored procedures)
var inventory_sp_repository_1 = require("./inventory-sp-repository");
Object.defineProperty(exports, "InventorySPRepository", { enumerable: true, get: function () { return inventory_sp_repository_1.InventorySPRepository; } });
Object.defineProperty(exports, "inventorySPRepository", { enumerable: true, get: function () { return inventory_sp_repository_1.inventorySPRepository; } });
// Export Customers SP Repository (stored procedures)
var customers_sp_repository_1 = require("./customers-sp-repository");
Object.defineProperty(exports, "CustomersSPRepository", { enumerable: true, get: function () { return customers_sp_repository_1.CustomersSPRepository; } });
Object.defineProperty(exports, "customersSPRepository", { enumerable: true, get: function () { return customers_sp_repository_1.customersSPRepository; } });
// Export Settings SP Repository (stored procedures)
var settings_sp_repository_1 = require("./settings-sp-repository");
Object.defineProperty(exports, "SettingsSPRepository", { enumerable: true, get: function () { return settings_sp_repository_1.SettingsSPRepository; } });
Object.defineProperty(exports, "settingsSPRepository", { enumerable: true, get: function () { return settings_sp_repository_1.settingsSPRepository; } });
// Export Units SP Repository (stored procedures)
var units_sp_repository_1 = require("./units-sp-repository");
Object.defineProperty(exports, "UnitsSPRepository", { enumerable: true, get: function () { return units_sp_repository_1.UnitsSPRepository; } });
Object.defineProperty(exports, "unitsSPRepository", { enumerable: true, get: function () { return units_sp_repository_1.unitsSPRepository; } });
// Export Categories SP Repository (stored procedures)
var categories_sp_repository_1 = require("./categories-sp-repository");
Object.defineProperty(exports, "CategoriesSPRepository", { enumerable: true, get: function () { return categories_sp_repository_1.CategoriesSPRepository; } });
Object.defineProperty(exports, "categoriesSPRepository", { enumerable: true, get: function () { return categories_sp_repository_1.categoriesSPRepository; } });
// Export Supplier repository
var supplier_repository_1 = require("./supplier-repository");
Object.defineProperty(exports, "SupplierRepository", { enumerable: true, get: function () { return supplier_repository_1.SupplierRepository; } });
Object.defineProperty(exports, "supplierRepository", { enumerable: true, get: function () { return supplier_repository_1.supplierRepository; } });
// Export Customer repository
// @deprecated - Use CustomersSPRepository for new code
var customer_repository_1 = require("./customer-repository");
Object.defineProperty(exports, "CustomerRepository", { enumerable: true, get: function () { return customer_repository_1.CustomerRepository; } });
Object.defineProperty(exports, "customerRepository", { enumerable: true, get: function () { return customer_repository_1.customerRepository; } });
// Export PurchaseOrder repository
var purchase_order_repository_1 = require("./purchase-order-repository");
Object.defineProperty(exports, "PurchaseOrderRepository", { enumerable: true, get: function () { return purchase_order_repository_1.PurchaseOrderRepository; } });
Object.defineProperty(exports, "purchaseOrderRepository", { enumerable: true, get: function () { return purchase_order_repository_1.purchaseOrderRepository; } });
// Export Sales repository
// @deprecated - Use SalesSPRepository for new code
var sales_repository_1 = require("./sales-repository");
Object.defineProperty(exports, "SalesRepository", { enumerable: true, get: function () { return sales_repository_1.SalesRepository; } });
Object.defineProperty(exports, "salesRepository", { enumerable: true, get: function () { return sales_repository_1.salesRepository; } });
// Export Sales SP Repository (stored procedures)
var sales_sp_repository_1 = require("./sales-sp-repository");
Object.defineProperty(exports, "SalesSPRepository", { enumerable: true, get: function () { return sales_sp_repository_1.SalesSPRepository; } });
Object.defineProperty(exports, "salesSPRepository", { enumerable: true, get: function () { return sales_sp_repository_1.salesSPRepository; } });
// Export Payment repository (customer payments)
var payment_repository_1 = require("./payment-repository");
Object.defineProperty(exports, "PaymentRepository", { enumerable: true, get: function () { return payment_repository_1.PaymentRepository; } });
Object.defineProperty(exports, "paymentRepository", { enumerable: true, get: function () { return payment_repository_1.paymentRepository; } });
// Export SupplierPayment repository
var supplier_payment_repository_1 = require("./supplier-payment-repository");
Object.defineProperty(exports, "SupplierPaymentRepository", { enumerable: true, get: function () { return supplier_payment_repository_1.SupplierPaymentRepository; } });
Object.defineProperty(exports, "supplierPaymentRepository", { enumerable: true, get: function () { return supplier_payment_repository_1.supplierPaymentRepository; } });
// Export CashTransaction repository
var cash_transaction_repository_1 = require("./cash-transaction-repository");
Object.defineProperty(exports, "CashTransactionRepository", { enumerable: true, get: function () { return cash_transaction_repository_1.CashTransactionRepository; } });
Object.defineProperty(exports, "cashTransactionRepository", { enumerable: true, get: function () { return cash_transaction_repository_1.cashTransactionRepository; } });
// Export Shift repository
var shift_repository_1 = require("./shift-repository");
Object.defineProperty(exports, "ShiftRepository", { enumerable: true, get: function () { return shift_repository_1.ShiftRepository; } });
Object.defineProperty(exports, "shiftRepository", { enumerable: true, get: function () { return shift_repository_1.shiftRepository; } });
// Export User repository
var user_repository_1 = require("./user-repository");
Object.defineProperty(exports, "UserRepository", { enumerable: true, get: function () { return user_repository_1.UserRepository; } });
Object.defineProperty(exports, "userRepository", { enumerable: true, get: function () { return user_repository_1.userRepository; } });
// Export Permission repository
var permission_repository_1 = require("./permission-repository");
Object.defineProperty(exports, "PermissionRepository", { enumerable: true, get: function () { return permission_repository_1.PermissionRepository; } });
Object.defineProperty(exports, "permissionRepository", { enumerable: true, get: function () { return permission_repository_1.permissionRepository; } });
// Export AuditLog repository
var audit_log_repository_1 = require("./audit-log-repository");
Object.defineProperty(exports, "AuditLogRepository", { enumerable: true, get: function () { return audit_log_repository_1.AuditLogRepository; } });
Object.defineProperty(exports, "auditLogRepository", { enumerable: true, get: function () { return audit_log_repository_1.auditLogRepository; } });
// Export OnlineStore repository
var online_store_repository_1 = require("./online-store-repository");
Object.defineProperty(exports, "OnlineStoreRepository", { enumerable: true, get: function () { return online_store_repository_1.OnlineStoreRepository; } });
Object.defineProperty(exports, "onlineStoreRepository", { enumerable: true, get: function () { return online_store_repository_1.onlineStoreRepository; } });
// Export OnlineProduct repository
var online_product_repository_1 = require("./online-product-repository");
Object.defineProperty(exports, "OnlineProductRepository", { enumerable: true, get: function () { return online_product_repository_1.OnlineProductRepository; } });
Object.defineProperty(exports, "onlineProductRepository", { enumerable: true, get: function () { return online_product_repository_1.onlineProductRepository; } });
// Export ShoppingCart repository
var shopping_cart_repository_1 = require("./shopping-cart-repository");
Object.defineProperty(exports, "ShoppingCartRepository", { enumerable: true, get: function () { return shopping_cart_repository_1.ShoppingCartRepository; } });
Object.defineProperty(exports, "shoppingCartRepository", { enumerable: true, get: function () { return shopping_cart_repository_1.shoppingCartRepository; } });
// Export OnlineOrder repository
var online_order_repository_1 = require("./online-order-repository");
Object.defineProperty(exports, "OnlineOrderRepository", { enumerable: true, get: function () { return online_order_repository_1.OnlineOrderRepository; } });
Object.defineProperty(exports, "onlineOrderRepository", { enumerable: true, get: function () { return online_order_repository_1.onlineOrderRepository; } });
// Export OnlineCustomer repository
var online_customer_repository_1 = require("./online-customer-repository");
Object.defineProperty(exports, "OnlineCustomerRepository", { enumerable: true, get: function () { return online_customer_repository_1.OnlineCustomerRepository; } });
Object.defineProperty(exports, "onlineCustomerRepository", { enumerable: true, get: function () { return online_customer_repository_1.onlineCustomerRepository; } });
// Export ShippingZone repository
var shipping_zone_repository_1 = require("./shipping-zone-repository");
Object.defineProperty(exports, "ShippingZoneRepository", { enumerable: true, get: function () { return shipping_zone_repository_1.ShippingZoneRepository; } });
Object.defineProperty(exports, "shippingZoneRepository", { enumerable: true, get: function () { return shipping_zone_repository_1.shippingZoneRepository; } });
// Export InventoryTransfer repository
var inventory_transfer_repository_1 = require("./inventory-transfer-repository");
Object.defineProperty(exports, "InventoryTransferRepository", { enumerable: true, get: function () { return inventory_transfer_repository_1.InventoryTransferRepository; } });
Object.defineProperty(exports, "inventoryTransferRepository", { enumerable: true, get: function () { return inventory_transfer_repository_1.inventoryTransferRepository; } });
// Export ProductUnits repository
var product_units_repository_1 = require("./product-units-repository");
Object.defineProperty(exports, "ProductUnitsRepository", { enumerable: true, get: function () { return product_units_repository_1.ProductUnitsRepository; } });
Object.defineProperty(exports, "productUnitsRepository", { enumerable: true, get: function () { return product_units_repository_1.productUnitsRepository; } });
// Export ProductInventory repository
var product_inventory_repository_1 = require("./product-inventory-repository");
Object.defineProperty(exports, "ProductInventoryRepository", { enumerable: true, get: function () { return product_inventory_repository_1.ProductInventoryRepository; } });
Object.defineProperty(exports, "productInventoryRepository", { enumerable: true, get: function () { return product_inventory_repository_1.productInventoryRepository; } });
// Export UnitConversionLog repository
var unit_conversion_log_repository_1 = require("./unit-conversion-log-repository");
Object.defineProperty(exports, "UnitConversionLogRepository", { enumerable: true, get: function () { return unit_conversion_log_repository_1.UnitConversionLogRepository; } });
Object.defineProperty(exports, "unitConversionLogRepository", { enumerable: true, get: function () { return unit_conversion_log_repository_1.unitConversionLogRepository; } });
/**
 * Repository factory class implementing dependency injection pattern
 * Provides singleton instances of repositories
 */
class RepositoryFactory {
    static instance;
    repositories = new Map();
    constructor() { }
    /**
     * Get the singleton instance of the factory
     */
    static getInstance() {
        if (!RepositoryFactory.instance) {
            RepositoryFactory.instance = new RepositoryFactory();
        }
        return RepositoryFactory.instance;
    }
    /**
     * Register a repository instance
     */
    register(name, repository) {
        this.repositories.set(name, repository);
    }
    /**
     * Get a repository by name
     */
    get(name) {
        const repository = this.repositories.get(name);
        if (!repository) {
            throw new Error(`Repository '${name}' not registered`);
        }
        return repository;
    }
    /**
     * Check if a repository is registered
     */
    has(name) {
        return this.repositories.has(name);
    }
    /**
     * Clear all registered repositories (useful for testing)
     */
    clear() {
        this.repositories.clear();
    }
}
// Export singleton factory instance
exports.repositoryFactory = RepositoryFactory.getInstance();
/**
 * Helper function to get a repository from the factory
 */
function getRepository(name) {
    return exports.repositoryFactory.get(name);
}
/**
 * Helper function to register a repository
 */
function registerRepository(name, repository) {
    exports.repositoryFactory.register(name, repository);
}
// Repository names constants for type safety
exports.REPOSITORY_NAMES = {
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
};
//# sourceMappingURL=index.js.map