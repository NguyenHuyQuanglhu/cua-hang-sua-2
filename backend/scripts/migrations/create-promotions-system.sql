-- Drop existing tables if they exist (in correct order due to foreign keys)
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'VoucherUsage')
    DROP TABLE VoucherUsage;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'VoucherCategories')
    DROP TABLE VoucherCategories;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'VoucherProducts')
    DROP TABLE VoucherProducts;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Vouchers')
    DROP TABLE Vouchers;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'PromotionCategories')
    DROP TABLE PromotionCategories;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'PromotionProducts')
    DROP TABLE PromotionProducts;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Promotions')
    DROP TABLE Promotions;

-- Create Promotions table
CREATE TABLE Promotions (
    id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
    store_id NVARCHAR(36) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    promotion_type NVARCHAR(50) NOT NULL,
    discount_percentage DECIMAL(5,2),
    discount_amount DECIMAL(18,2),
    buy_quantity INT,
    get_quantity INT,
    quantity_tiers NVARCHAR(MAX),
    apply_to NVARCHAR(50) NOT NULL,
    min_purchase_amount DECIMAL(18,2),
    max_discount_amount DECIMAL(18,2),
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active BIT DEFAULT 1,
    usage_limit INT,
    usage_per_customer INT,
    current_usage INT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (store_id) REFERENCES Stores(id)
);

CREATE INDEX IX_Promotions_StoreId ON Promotions(store_id);
CREATE INDEX IX_Promotions_Active ON Promotions(is_active, start_date, end_date);

-- Create PromotionProducts table
CREATE TABLE PromotionProducts (
    id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
    promotion_id NVARCHAR(36) NOT NULL,
    product_id NVARCHAR(36) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (promotion_id) REFERENCES Promotions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE
);

CREATE INDEX IX_PromotionProducts_PromotionId ON PromotionProducts(promotion_id);
CREATE INDEX IX_PromotionProducts_ProductId ON PromotionProducts(product_id);

-- Create PromotionCategories table
CREATE TABLE PromotionCategories (
    id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
    promotion_id NVARCHAR(36) NOT NULL,
    category_id NVARCHAR(36) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (promotion_id) REFERENCES Promotions(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES Categories(id) ON DELETE CASCADE
);

CREATE INDEX IX_PromotionCategories_PromotionId ON PromotionCategories(promotion_id);
CREATE INDEX IX_PromotionCategories_CategoryId ON PromotionCategories(category_id);

-- Create Vouchers table
CREATE TABLE Vouchers (
    id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
    store_id NVARCHAR(36) NOT NULL,
    code NVARCHAR(50) NOT NULL UNIQUE,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    discount_type NVARCHAR(50) NOT NULL,
    discount_value DECIMAL(18,2) NOT NULL,
    max_discount_amount DECIMAL(18,2),
    min_purchase_amount DECIMAL(18,2),
    apply_to NVARCHAR(50) NOT NULL DEFAULT 'all',
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active BIT DEFAULT 1,
    usage_limit INT,
    usage_per_customer INT,
    current_usage INT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (store_id) REFERENCES Stores(id)
);

CREATE INDEX IX_Vouchers_StoreId ON Vouchers(store_id);
CREATE INDEX IX_Vouchers_Code ON Vouchers(code);
CREATE INDEX IX_Vouchers_Active ON Vouchers(is_active, start_date, end_date);

-- Create VoucherProducts table
CREATE TABLE VoucherProducts (
    id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
    voucher_id NVARCHAR(36) NOT NULL,
    product_id NVARCHAR(36) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (voucher_id) REFERENCES Vouchers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE
);

CREATE INDEX IX_VoucherProducts_VoucherId ON VoucherProducts(voucher_id);
CREATE INDEX IX_VoucherProducts_ProductId ON VoucherProducts(product_id);

-- Create VoucherCategories table
CREATE TABLE VoucherCategories (
    id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
    voucher_id NVARCHAR(36) NOT NULL,
    category_id NVARCHAR(36) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (voucher_id) REFERENCES Vouchers(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES Categories(id) ON DELETE CASCADE
);

CREATE INDEX IX_VoucherCategories_VoucherId ON VoucherCategories(voucher_id);
CREATE INDEX IX_VoucherCategories_CategoryId ON VoucherCategories(category_id);

-- Create VoucherUsage table
CREATE TABLE VoucherUsage (
    id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
    voucher_id NVARCHAR(36) NOT NULL,
    customer_id NVARCHAR(36),
    sale_id NVARCHAR(36),
    discount_amount DECIMAL(18,2) NOT NULL,
    used_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (voucher_id) REFERENCES Vouchers(id),
    FOREIGN KEY (customer_id) REFERENCES Customers(id),
    FOREIGN KEY (sale_id) REFERENCES Sales(id)
);

CREATE INDEX IX_VoucherUsage_VoucherId ON VoucherUsage(voucher_id);
CREATE INDEX IX_VoucherUsage_CustomerId ON VoucherUsage(customer_id);

PRINT 'Promotions system tables created successfully';
