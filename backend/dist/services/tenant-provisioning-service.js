"use strict";
/**
 * Tenant Provisioning Service
 *
 * Handles database provisioning for new tenants including:
 * - Creating new tenant database
 * - Running schema migrations
 * - Creating owner account
 *
 * Requirements: 1.2, 1.3, 1.5
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantProvisioningService = exports.TenantProvisioningService = void 0;
const mssql_1 = __importDefault(require("mssql"));
const tenant_router_1 = require("../db/tenant-router");
const password_1 = require("../auth/password");
// Store provisioning progress in memory (could be Redis in production)
const provisioningProgress = new Map();
/**
 * Tenant Provisioning Service class
 */
class TenantProvisioningService {
    /**
     * Get provisioning progress for a tenant
     */
    getProgress(tenantId) {
        return provisioningProgress.get(tenantId) || null;
    }
    /**
     * Update provisioning progress
     */
    updateProgress(tenantId, status, progress, message, error) {
        provisioningProgress.set(tenantId, { status, progress, message, error });
    }
    /**
     * Clear provisioning progress
     */
    clearProgress(tenantId) {
        provisioningProgress.delete(tenantId);
    }
    /**
     * Provision a new tenant database
     */
    async provisionTenant(input) {
        const { tenantId, databaseName, databaseServer, ownerEmail, ownerPassword, ownerDisplayName, defaultStoreName } = input;
        try {
            // Step 1: Create database
            this.updateProgress(tenantId, 'creating_database', 10, 'Đang tạo database...');
            await this.createDatabase(databaseName, databaseServer);
            // Step 2: Run migrations
            this.updateProgress(tenantId, 'running_migrations', 30, 'Đang tạo cấu trúc bảng...');
            await this.runMigrations(databaseName, databaseServer);
            // Step 3: Create owner account
            this.updateProgress(tenantId, 'creating_owner', 60, 'Đang tạo tài khoản chủ sở hữu...');
            const ownerId = await this.createOwnerAccount(databaseName, databaseServer, ownerEmail, ownerPassword, ownerDisplayName);
            // Step 4: Create default store
            this.updateProgress(tenantId, 'creating_default_store', 80, 'Đang tạo cửa hàng mặc định...');
            const storeName = defaultStoreName || 'Cửa hàng chính';
            const defaultStoreId = await this.createDefaultStore(databaseName, databaseServer, ownerId, storeName);
            // Step 5: Assign owner to store
            await this.assignOwnerToStore(databaseName, databaseServer, ownerId, defaultStoreId);
            this.updateProgress(tenantId, 'completed', 100, 'Hoàn tất!');
            return {
                success: true,
                ownerId,
                defaultStoreId,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.updateProgress(tenantId, 'failed', 0, 'Lỗi khi tạo tenant', errorMessage);
            // Attempt cleanup on failure
            await this.cleanupFailedProvisioning(databaseName, databaseServer);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }
    /**
     * Create a new database for the tenant
     */
    async createDatabase(databaseName, databaseServer) {
        // Connect to master database to create new database
        const masterPool = tenant_router_1.tenantRouter.getMasterConnection();
        // Check if database already exists
        const checkResult = await masterPool.request()
            .input('dbName', mssql_1.default.NVarChar, databaseName)
            .query(`SELECT DB_ID(@dbName) as db_id`);
        if (checkResult.recordset[0].db_id !== null) {
            throw new Error(`Database ${databaseName} đã tồn tại`);
        }
        // Create the database
        // Note: We need to use dynamic SQL because database names can't be parameterized
        await masterPool.request().query(`
      CREATE DATABASE [${databaseName}]
    `);
        // Wait for database to be ready
        await this.waitForDatabase(databaseName, databaseServer);
    }
    /**
     * Wait for database to be ready
     */
    async waitForDatabase(databaseName, databaseServer, maxAttempts = 10) {
        const masterPool = tenant_router_1.tenantRouter.getMasterConnection();
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const result = await masterPool.request()
                    .input('dbName', mssql_1.default.NVarChar, databaseName)
                    .query(`SELECT state_desc FROM sys.databases WHERE name = @dbName`);
                if (result.recordset.length > 0 && result.recordset[0].state_desc === 'ONLINE') {
                    return;
                }
            }
            catch {
                // Database not ready yet
            }
            // Wait 1 second before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        throw new Error(`Database ${databaseName} không sẵn sàng sau ${maxAttempts} lần thử`);
    }
    /**
     * Run schema migrations on the new tenant database
     */
    async runMigrations(databaseName, databaseServer) {
        // Create a connection to the new tenant database
        const pool = new mssql_1.default.ConnectionPool({
            server: databaseServer,
            database: databaseName,
            user: process.env.DB_USER || 'sa',
            password: process.env.DB_PASSWORD || '',
            port: parseInt(process.env.DB_PORT || '1433'),
            options: {
                encrypt: false,
                trustServerCertificate: true,
            },
            connectionTimeout: 30000,
            requestTimeout: 60000,
        });
        await pool.connect();
        try {
            // Create all required tables
            await this.createTenantTables(pool);
        }
        finally {
            await pool.close();
        }
    }
    /**
     * Create all tenant database tables
     */
    async createTenantTables(pool) {
        // Create tables in order (respecting foreign key dependencies)
        // 1. Users table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
      CREATE TABLE Users (
        Id NVARCHAR(36) PRIMARY KEY,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(255) NOT NULL,
        DisplayName NVARCHAR(255),
        Phone NVARCHAR(20),
        Role NVARCHAR(50) NOT NULL DEFAULT 'salesperson',
        Permissions NVARCHAR(MAX),
        Status NVARCHAR(20) NOT NULL DEFAULT 'active',
        FailedLoginAttempts INT NOT NULL DEFAULT 0,
        LockedUntil DATETIME,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
      )
    `);
        // 2. Sessions table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Sessions' AND xtype='U')
      CREATE TABLE Sessions (
        Id NVARCHAR(36) PRIMARY KEY,
        UserId NVARCHAR(36) NOT NULL,
        Token NVARCHAR(MAX) NOT NULL,
        ExpiresAt DATETIME NOT NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (UserId) REFERENCES Users(Id)
      )
    `);
        // 3. Stores table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Stores' AND xtype='U')
      CREATE TABLE Stores (
        Id NVARCHAR(36) PRIMARY KEY,
        OwnerId NVARCHAR(36) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Slug NVARCHAR(100) UNIQUE,
        Description NVARCHAR(500),
        LogoUrl NVARCHAR(500),
        Address NVARCHAR(500),
        Phone NVARCHAR(50),
        BusinessType NVARCHAR(100),
        Domain NVARCHAR(255),
        Status NVARCHAR(20) NOT NULL DEFAULT 'active',
        Settings NVARCHAR(MAX),
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (OwnerId) REFERENCES Users(Id)
      )
    `);
        // 4. UserStores table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UserStores' AND xtype='U')
      CREATE TABLE UserStores (
        Id NVARCHAR(36) PRIMARY KEY,
        UserId NVARCHAR(36) NOT NULL,
        StoreId NVARCHAR(36) NOT NULL,
        RoleOverride NVARCHAR(50),
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (UserId) REFERENCES Users(Id),
        FOREIGN KEY (StoreId) REFERENCES Stores(Id),
        UNIQUE (UserId, StoreId)
      )
    `);
        // 5. Permissions table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Permissions' AND xtype='U')
      CREATE TABLE Permissions (
        Id NVARCHAR(36) PRIMARY KEY,
        UserId NVARCHAR(36) NOT NULL,
        Module NVARCHAR(100) NOT NULL,
        Actions NVARCHAR(255) NOT NULL,
        StoreId NVARCHAR(36),
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (UserId) REFERENCES Users(Id),
        FOREIGN KEY (StoreId) REFERENCES Stores(Id),
        UNIQUE (UserId, Module, StoreId)
      )
    `);
        // 6. Categories table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Categories' AND xtype='U')
      CREATE TABLE Categories (
        Id NVARCHAR(36) PRIMARY KEY,
        StoreId NVARCHAR(36) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Description NVARCHAR(500),
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (StoreId) REFERENCES Stores(Id)
      )
    `);
        // 7. Customers table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Customers' AND xtype='U')
      CREATE TABLE Customers (
        Id NVARCHAR(36) PRIMARY KEY,
        StoreId NVARCHAR(36) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Phone NVARCHAR(50),
        Email NVARCHAR(255),
        Address NVARCHAR(500),
        TotalDebt DECIMAL(18,2) NOT NULL DEFAULT 0,
        TotalPurchases DECIMAL(18,2) NOT NULL DEFAULT 0,
        TotalPoints INT NOT NULL DEFAULT 0,
        CustomerTier NVARCHAR(50),
        Notes NVARCHAR(MAX),
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (StoreId) REFERENCES Stores(Id)
      )
    `);
        // Continue with more tables...
        await this.createMoreTenantTables(pool);
    }
    /**
     * Create additional tenant tables
     */
    async createMoreTenantTables(pool) {
        // 8. Units table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Units' AND xtype='U')
      CREATE TABLE Units (
        Id NVARCHAR(36) PRIMARY KEY,
        StoreId NVARCHAR(36) NOT NULL,
        Name NVARCHAR(100) NOT NULL,
        Description NVARCHAR(500),
        BaseUnitId NVARCHAR(36),
        ConversionFactor DECIMAL(18,4),
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (StoreId) REFERENCES Stores(Id)
      )
    `);
        // 9. Products table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Products' AND xtype='U')
      CREATE TABLE Products (
        Id NVARCHAR(36) PRIMARY KEY,
        StoreId NVARCHAR(36) NOT NULL,
        CategoryId NVARCHAR(36),
        UnitId NVARCHAR(36),
        Name NVARCHAR(255) NOT NULL,
        Sku NVARCHAR(100),
        Barcode NVARCHAR(100),
        Description NVARCHAR(MAX),
        CostPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
        SellingPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
        Stock DECIMAL(18,4) NOT NULL DEFAULT 0,
        MinStock DECIMAL(18,4),
        MaxStock DECIMAL(18,4),
        ImageUrl NVARCHAR(500),
        Status NVARCHAR(20) NOT NULL DEFAULT 'active',
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (StoreId) REFERENCES Stores(Id),
        FOREIGN KEY (CategoryId) REFERENCES Categories(Id),
        FOREIGN KEY (UnitId) REFERENCES Units(Id)
      )
    `);
        // 10. Suppliers table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Suppliers' AND xtype='U')
      CREATE TABLE Suppliers (
        Id NVARCHAR(36) PRIMARY KEY,
        StoreId NVARCHAR(36) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        ContactPerson NVARCHAR(255),
        Email NVARCHAR(255),
        Phone NVARCHAR(50),
        Address NVARCHAR(500),
        TaxCode NVARCHAR(50),
        TotalDebt DECIMAL(18,2) NOT NULL DEFAULT 0,
        Notes NVARCHAR(MAX),
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (StoreId) REFERENCES Stores(Id)
      )
    `);
        // 11. Shifts table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Shifts' AND xtype='U')
      CREATE TABLE Shifts (
        Id NVARCHAR(36) PRIMARY KEY,
        StoreId NVARCHAR(36) NOT NULL,
        UserId NVARCHAR(36) NOT NULL,
        UserName NVARCHAR(255) NOT NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'active',
        StartTime DATETIME NOT NULL,
        EndTime DATETIME,
        StartingCash DECIMAL(18,2) NOT NULL DEFAULT 0,
        EndingCash DECIMAL(18,2),
        CashSales DECIMAL(18,2),
        CashPayments DECIMAL(18,2),
        TotalCashInDrawer DECIMAL(18,2),
        CashDifference DECIMAL(18,2),
        TotalRevenue DECIMAL(18,2) NOT NULL DEFAULT 0,
        SalesCount INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (StoreId) REFERENCES Stores(Id),
        FOREIGN KEY (UserId) REFERENCES Users(Id)
      )
    `);
        // 12. Sales table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Sales' AND xtype='U')
      CREATE TABLE Sales (
        Id NVARCHAR(36) PRIMARY KEY,
        StoreId NVARCHAR(36) NOT NULL,
        InvoiceNumber NVARCHAR(50) NOT NULL,
        CustomerId NVARCHAR(36),
        ShiftId NVARCHAR(36),
        TransactionDate DATETIME NOT NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'pending',
        TotalAmount DECIMAL(18,2) NOT NULL,
        VatAmount DECIMAL(18,2),
        FinalAmount DECIMAL(18,2) NOT NULL,
        Discount DECIMAL(18,2),
        DiscountType NVARCHAR(20),
        DiscountValue DECIMAL(18,2),
        TierDiscountPercentage DECIMAL(5,2),
        TierDiscountAmount DECIMAL(18,2),
        PointsUsed INT,
        PointsDiscount DECIMAL(18,2),
        CustomerPayment DECIMAL(18,2),
        PreviousDebt DECIMAL(18,2),
        RemainingDebt DECIMAL(18,2),
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (StoreId) REFERENCES Stores(Id),
        FOREIGN KEY (CustomerId) REFERENCES Customers(Id),
        FOREIGN KEY (ShiftId) REFERENCES Shifts(Id)
      )
    `);
        // 13. SalesItems table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SalesItems' AND xtype='U')
      CREATE TABLE SalesItems (
        Id NVARCHAR(36) PRIMARY KEY,
        SalesTransactionId NVARCHAR(36) NOT NULL,
        ProductId NVARCHAR(36) NOT NULL,
        Quantity DECIMAL(18,4) NOT NULL,
        Price DECIMAL(18,2) NOT NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (SalesTransactionId) REFERENCES Sales(Id),
        FOREIGN KEY (ProductId) REFERENCES Products(Id)
      )
    `);
        // Continue with remaining tables
        await this.createRemainingTenantTables(pool);
    }
    /**
     * Create remaining tenant tables
     */
    async createRemainingTenantTables(pool) {
        // 14. PurchaseOrders table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PurchaseOrders' AND xtype='U')
      CREATE TABLE PurchaseOrders (
        Id NVARCHAR(36) PRIMARY KEY,
        StoreId NVARCHAR(36) NOT NULL,
        OrderNumber NVARCHAR(50) NOT NULL,
        SupplierId NVARCHAR(36),
        ImportDate DATETIME NOT NULL,
        TotalAmount DECIMAL(18,2) NOT NULL,
        Notes NVARCHAR(MAX),
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (StoreId) REFERENCES Stores(Id),
        FOREIGN KEY (SupplierId) REFERENCES Suppliers(Id)
      )
    `);
        // 15. PurchaseOrderItems table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PurchaseOrderItems' AND xtype='U')
      CREATE TABLE PurchaseOrderItems (
        Id NVARCHAR(36) PRIMARY KEY,
        PurchaseOrderId NVARCHAR(36) NOT NULL,
        ProductId NVARCHAR(36) NOT NULL,
        Quantity DECIMAL(18,4) NOT NULL,
        Cost DECIMAL(18,2) NOT NULL,
        UnitId NVARCHAR(36),
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (PurchaseOrderId) REFERENCES PurchaseOrders(Id),
        FOREIGN KEY (ProductId) REFERENCES Products(Id),
        FOREIGN KEY (UnitId) REFERENCES Units(Id)
      )
    `);
        // 16. Payments table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Payments' AND xtype='U')
      CREATE TABLE Payments (
        Id NVARCHAR(36) PRIMARY KEY,
        StoreId NVARCHAR(36) NOT NULL,
        CustomerId NVARCHAR(36) NOT NULL,
        PaymentDate DATETIME NOT NULL,
        Amount DECIMAL(18,2) NOT NULL,
        Notes NVARCHAR(MAX),
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (StoreId) REFERENCES Stores(Id),
        FOREIGN KEY (CustomerId) REFERENCES Customers(Id)
      )
    `);
        // 17. SupplierPayments table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SupplierPayments' AND xtype='U')
      CREATE TABLE SupplierPayments (
        Id NVARCHAR(36) PRIMARY KEY,
        StoreId NVARCHAR(36) NOT NULL,
        SupplierId NVARCHAR(36) NOT NULL,
        PaymentDate DATETIME NOT NULL,
        Amount DECIMAL(18,2) NOT NULL,
        Notes NVARCHAR(MAX),
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (StoreId) REFERENCES Stores(Id),
        FOREIGN KEY (SupplierId) REFERENCES Suppliers(Id)
      )
    `);
        // 18. CashTransactions table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CashTransactions' AND xtype='U')
      CREATE TABLE CashTransactions (
        Id NVARCHAR(36) PRIMARY KEY,
        StoreId NVARCHAR(36) NOT NULL,
        Type NVARCHAR(10) NOT NULL,
        TransactionDate DATETIME NOT NULL,
        Amount DECIMAL(18,2) NOT NULL,
        Reason NVARCHAR(500) NOT NULL,
        Category NVARCHAR(100),
        RelatedInvoiceId NVARCHAR(36),
        CreatedBy NVARCHAR(36),
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (StoreId) REFERENCES Stores(Id)
      )
    `);
        // 19. AuditLogs table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AuditLogs' AND xtype='U')
      CREATE TABLE AuditLogs (
        Id NVARCHAR(36) PRIMARY KEY,
        StoreId NVARCHAR(36) NOT NULL,
        UserId NVARCHAR(36),
        Action NVARCHAR(50) NOT NULL,
        EntityType NVARCHAR(50) NOT NULL,
        EntityId NVARCHAR(36),
        OldValues NVARCHAR(MAX),
        NewValues NVARCHAR(MAX),
        IpAddress NVARCHAR(50),
        UserAgent NVARCHAR(500),
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (StoreId) REFERENCES Stores(Id)
      )
    `);
        // 20. Settings table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Settings' AND xtype='U')
      CREATE TABLE Settings (
        Id NVARCHAR(36) PRIMARY KEY,
        StoreId NVARCHAR(36) NOT NULL UNIQUE,
        Settings NVARCHAR(MAX),
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (StoreId) REFERENCES Stores(Id)
      )
    `);
        // Create indexes for performance
        await this.createIndexes(pool);
    }
    /**
     * Create indexes for performance
     */
    async createIndexes(pool) {
        const indexes = [
            'CREATE INDEX IX_Users_Email ON Users(Email)',
            'CREATE INDEX IX_Users_Role ON Users(Role)',
            'CREATE INDEX IX_Stores_OwnerId ON Stores(OwnerId)',
            'CREATE INDEX IX_Stores_Status ON Stores(Status)',
            'CREATE INDEX IX_UserStores_UserId ON UserStores(UserId)',
            'CREATE INDEX IX_UserStores_StoreId ON UserStores(StoreId)',
            'CREATE INDEX IX_Products_StoreId ON Products(StoreId)',
            'CREATE INDEX IX_Products_CategoryId ON Products(CategoryId)',
            'CREATE INDEX IX_Products_Sku ON Products(Sku)',
            'CREATE INDEX IX_Sales_StoreId ON Sales(StoreId)',
            'CREATE INDEX IX_Sales_CustomerId ON Sales(CustomerId)',
            'CREATE INDEX IX_Sales_TransactionDate ON Sales(TransactionDate)',
            'CREATE INDEX IX_Customers_StoreId ON Customers(StoreId)',
            'CREATE INDEX IX_Customers_Phone ON Customers(Phone)',
            'CREATE INDEX IX_AuditLogs_StoreId ON AuditLogs(StoreId)',
            'CREATE INDEX IX_AuditLogs_UserId ON AuditLogs(UserId)',
            'CREATE INDEX IX_AuditLogs_CreatedAt ON AuditLogs(CreatedAt)',
        ];
        for (const indexSql of indexes) {
            try {
                await pool.request().query(indexSql);
            }
            catch {
                // Index may already exist, ignore error
            }
        }
    }
    /**
     * Create owner account in tenant database
     */
    async createOwnerAccount(databaseName, databaseServer, email, password, displayName) {
        const pool = new mssql_1.default.ConnectionPool({
            server: databaseServer,
            database: databaseName,
            user: process.env.DB_USER || 'sa',
            password: process.env.DB_PASSWORD || '',
            port: parseInt(process.env.DB_PORT || '1433'),
            options: {
                encrypt: false,
                trustServerCertificate: true,
            },
        });
        await pool.connect();
        try {
            const ownerId = crypto.randomUUID();
            const passwordHash = await (0, password_1.hashPassword)(password);
            await pool.request()
                .input('id', mssql_1.default.NVarChar, ownerId)
                .input('email', mssql_1.default.NVarChar, email)
                .input('passwordHash', mssql_1.default.NVarChar, passwordHash)
                .input('displayName', mssql_1.default.NVarChar, displayName)
                .query(`
          INSERT INTO Users (Id, Email, PasswordHash, DisplayName, Role, Status, CreatedAt, UpdatedAt)
          VALUES (@id, @email, @passwordHash, @displayName, 'owner', 'active', GETDATE(), GETDATE())
        `);
            return ownerId;
        }
        finally {
            await pool.close();
        }
    }
    /**
     * Create default store for tenant
     */
    async createDefaultStore(databaseName, databaseServer, ownerId, storeName) {
        const pool = new mssql_1.default.ConnectionPool({
            server: databaseServer,
            database: databaseName,
            user: process.env.DB_USER || 'sa',
            password: process.env.DB_PASSWORD || '',
            port: parseInt(process.env.DB_PORT || '1433'),
            options: {
                encrypt: false,
                trustServerCertificate: true,
            },
        });
        await pool.connect();
        try {
            const storeId = crypto.randomUUID();
            const slug = this.generateSlug(storeName);
            await pool.request()
                .input('id', mssql_1.default.NVarChar, storeId)
                .input('ownerId', mssql_1.default.NVarChar, ownerId)
                .input('name', mssql_1.default.NVarChar, storeName)
                .input('slug', mssql_1.default.NVarChar, slug)
                .query(`
          INSERT INTO Stores (Id, OwnerId, Name, Slug, Status, CreatedAt, UpdatedAt)
          VALUES (@id, @ownerId, @name, @slug, 'active', GETDATE(), GETDATE())
        `);
            // Create default settings for the store
            const settingsId = crypto.randomUUID();
            await pool.request()
                .input('id', mssql_1.default.NVarChar, settingsId)
                .input('storeId', mssql_1.default.NVarChar, storeId)
                .input('settings', mssql_1.default.NVarChar, JSON.stringify({
                currency: 'VND',
                timezone: 'Asia/Ho_Chi_Minh',
                dateFormat: 'DD/MM/YYYY',
                vatRate: 10,
            }))
                .query(`
          INSERT INTO Settings (Id, StoreId, Settings, CreatedAt, UpdatedAt)
          VALUES (@id, @storeId, @settings, GETDATE(), GETDATE())
        `);
            return storeId;
        }
        finally {
            await pool.close();
        }
    }
    /**
     * Assign owner to store
     */
    async assignOwnerToStore(databaseName, databaseServer, ownerId, storeId) {
        const pool = new mssql_1.default.ConnectionPool({
            server: databaseServer,
            database: databaseName,
            user: process.env.DB_USER || 'sa',
            password: process.env.DB_PASSWORD || '',
            port: parseInt(process.env.DB_PORT || '1433'),
            options: {
                encrypt: false,
                trustServerCertificate: true,
            },
        });
        await pool.connect();
        try {
            const userStoreId = crypto.randomUUID();
            await pool.request()
                .input('id', mssql_1.default.NVarChar, userStoreId)
                .input('userId', mssql_1.default.NVarChar, ownerId)
                .input('storeId', mssql_1.default.NVarChar, storeId)
                .query(`
          INSERT INTO UserStores (Id, UserId, StoreId, CreatedAt)
          VALUES (@id, @userId, @storeId, GETDATE())
        `);
        }
        finally {
            await pool.close();
        }
    }
    /**
     * Generate URL-friendly slug from name
     */
    generateSlug(name) {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 100);
    }
    /**
     * Cleanup failed provisioning (drop database if created)
     */
    async cleanupFailedProvisioning(databaseName, databaseServer) {
        try {
            const masterPool = tenant_router_1.tenantRouter.getMasterConnection();
            // Check if database exists
            const checkResult = await masterPool.request()
                .input('dbName', mssql_1.default.NVarChar, databaseName)
                .query(`SELECT DB_ID(@dbName) as db_id`);
            if (checkResult.recordset[0].db_id !== null) {
                // Set database to single user mode and drop
                await masterPool.request().query(`
          ALTER DATABASE [${databaseName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
          DROP DATABASE [${databaseName}];
        `);
                console.log(`Cleaned up failed provisioning: dropped database ${databaseName}`);
            }
        }
        catch (error) {
            console.error('Error cleaning up failed provisioning:', error);
        }
    }
}
exports.TenantProvisioningService = TenantProvisioningService;
// Export singleton instance
exports.tenantProvisioningService = new TenantProvisioningService();
//# sourceMappingURL=tenant-provisioning-service.js.map