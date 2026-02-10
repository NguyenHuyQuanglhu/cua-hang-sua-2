-- Create Users table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
CREATE TABLE Users (
    Id NVARCHAR(36) PRIMARY KEY,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    DisplayName NVARCHAR(255),
    Role NVARCHAR(50) NOT NULL DEFAULT 'salesperson',
    Permissions NVARCHAR(MAX),
    Status NVARCHAR(20) NOT NULL DEFAULT 'active',
    FailedLoginAttempts INT NOT NULL DEFAULT 0,
    LockedUntil DATETIME,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
);

-- Create Sessions table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Sessions' AND xtype='U')
CREATE TABLE Sessions (
    Id NVARCHAR(36) PRIMARY KEY,
    UserId NVARCHAR(36) NOT NULL,
    Token NVARCHAR(MAX) NOT NULL,
    ExpiresAt DATETIME NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(Id)
);

-- Create UserStores table (many-to-many relationship)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UserStores' AND xtype='U')
CREATE TABLE UserStores (
    Id NVARCHAR(36) PRIMARY KEY,
    UserId NVARCHAR(36) NOT NULL,
    StoreId NVARCHAR(36) NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(Id),
    FOREIGN KEY (StoreId) REFERENCES Stores(Id),
    UNIQUE (UserId, StoreId)
);

-- Create Units table
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
);

-- Create Suppliers table
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
    Notes NVARCHAR(MAX),
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (StoreId) REFERENCES Stores(Id)
);

-- Create SupplierPayments table
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
);


-- Create Shifts table
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
);

-- Create Sales table
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
);

-- Create SalesItems table
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
);

-- Create Payments table (customer debt payments)
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
);

-- Create PurchaseOrders table
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
);

-- Create PurchaseOrderItems table
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
);

-- Create CashTransactions table
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
);

-- Create AuditLogs table
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
);

-- Create Settings table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Settings' AND xtype='U')
CREATE TABLE Settings (
    Id NVARCHAR(36) PRIMARY KEY,
    StoreId NVARCHAR(36) NOT NULL UNIQUE,
    Settings NVARCHAR(MAX),
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (StoreId) REFERENCES Stores(Id)
);
