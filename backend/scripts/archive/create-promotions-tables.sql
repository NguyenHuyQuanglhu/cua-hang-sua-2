-- =============================================
-- Promotions Module - Database Schema
-- =============================================

-- 1. Promotions Table (Chương trình khuyến mãi)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Promotions')
BEGIN
    CREATE TABLE Promotions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        store_id UNIQUEIDENTIFIER NOT NULL,
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        type NVARCHAR(50) NOT NULL, -- 'percentage', 'fixed_amount', 'buy_x_get_y', 'bundle', 'voucher'
        status NVARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'expired', 'scheduled'
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        
        -- Discount settings
        discount_type NVARCHAR(20), -- 'percentage', 'fixed'
        discount_value DECIMAL(18, 2),
        max_discount_amount DECIMAL(18, 2), -- Giảm tối đa (cho %)
        
        -- Buy X Get Y settings
        buy_quantity INT,
        get_quantity INT,
        
        -- Minimum requirements
        min_purchase_amount DECIMAL(18, 2),
        min_quantity INT,
        
        -- Usage limits
        usage_limit INT, -- Số lần sử dụng tối đa (null = unlimited)
        usage_count INT DEFAULT 0, -- Số lần đã sử dụng
        usage_per_customer INT, -- Giới hạn mỗi khách hàng
        
        -- Priority (số càng cao càng ưu tiên)
        priority INT DEFAULT 0,
        
        -- Applicable to
        apply_to NVARCHAR(20) DEFAULT 'all', -- 'all', 'specific_products', 'specific_categories', 'specific_customers'
        
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        
        FOREIGN KEY (store_id) REFERENCES Stores(id)
    );
    PRINT 'Created Promotions table';
END

-- 2. PromotionProducts Table (Sản phẩm áp dụng khuyến mãi)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PromotionProducts')
BEGIN
    CREATE TABLE PromotionProducts (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        promotion_id UNIQUEIDENTIFIER NOT NULL,
        product_id UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        
        FOREIGN KEY (promotion_id) REFERENCES Promotions(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE,
        UNIQUE (promotion_id, product_id)
    );
    PRINT 'Created PromotionProducts table';
END

-- 3. PromotionCategories Table (Danh mục áp dụng khuyến mãi)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PromotionCategories')
BEGIN
    CREATE TABLE PromotionCategories (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        promotion_id UNIQUEIDENTIFIER NOT NULL,
        category_id UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        
        FOREIGN KEY (promotion_id) REFERENCES Promotions(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES Categories(id) ON DELETE CASCADE,
        UNIQUE (promotion_id, category_id)
    );
    PRINT 'Created PromotionCategories table';
END

-- 4. PromotionCustomers Table (Khách hàng áp dụng khuyến mãi)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PromotionCustomers')
BEGIN
    CREATE TABLE PromotionCustomers (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        promotion_id UNIQUEIDENTIFIER NOT NULL,
        customer_id UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        
        FOREIGN KEY (promotion_id) REFERENCES Promotions(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES Customers(id) ON DELETE CASCADE,
        UNIQUE (promotion_id, customer_id)
    );
    PRINT 'Created PromotionCustomers table';
END

-- 5. Vouchers Table (Mã giảm giá)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Vouchers')
BEGIN
    CREATE TABLE Vouchers (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        store_id UNIQUEIDENTIFIER NOT NULL,
        promotion_id UNIQUEIDENTIFIER, -- Link to promotion (optional)
        code NVARCHAR(50) NOT NULL UNIQUE,
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        
        discount_type NVARCHAR(20) NOT NULL, -- 'percentage', 'fixed'
        discount_value DECIMAL(18, 2) NOT NULL,
        max_discount_amount DECIMAL(18, 2),
        
        min_purchase_amount DECIMAL(18, 2),
        
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        
        usage_limit INT,
        usage_count INT DEFAULT 0,
        usage_per_customer INT DEFAULT 1,
        
        status NVARCHAR(20) NOT NULL DEFAULT 'active',
        
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        
        FOREIGN KEY (store_id) REFERENCES Stores(id),
        FOREIGN KEY (promotion_id) REFERENCES Promotions(id) ON DELETE SET NULL
    );
    PRINT 'Created Vouchers table';
END

-- 6. VoucherUsage Table (Lịch sử sử dụng voucher)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'VoucherUsage')
BEGIN
    CREATE TABLE VoucherUsage (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        voucher_id UNIQUEIDENTIFIER NOT NULL,
        customer_id UNIQUEIDENTIFIER,
        sale_id UNIQUEIDENTIFIER,
        discount_amount DECIMAL(18, 2) NOT NULL,
        used_at DATETIME DEFAULT GETDATE(),
        
        FOREIGN KEY (voucher_id) REFERENCES Vouchers(id),
        FOREIGN KEY (customer_id) REFERENCES Customers(id),
        FOREIGN KEY (sale_id) REFERENCES Sales(id)
    );
    PRINT 'Created VoucherUsage table';
END

-- 7. PromotionUsage Table (Lịch sử sử dụng khuyến mãi)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PromotionUsage')
BEGIN
    CREATE TABLE PromotionUsage (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        promotion_id UNIQUEIDENTIFIER NOT NULL,
        customer_id UNIQUEIDENTIFIER,
        sale_id UNIQUEIDENTIFIER,
        discount_amount DECIMAL(18, 2) NOT NULL,
        used_at DATETIME DEFAULT GETDATE(),
        
        FOREIGN KEY (promotion_id) REFERENCES Promotions(id),
        FOREIGN KEY (customer_id) REFERENCES Customers(id),
        FOREIGN KEY (sale_id) REFERENCES Sales(id)
    );
    PRINT 'Created PromotionUsage table';
END

-- 8. BundleDeals Table (Combo sản phẩm)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BundleDeals')
BEGIN
    CREATE TABLE BundleDeals (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        store_id UNIQUEIDENTIFIER NOT NULL,
        promotion_id UNIQUEIDENTIFIER,
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        
        bundle_price DECIMAL(18, 2) NOT NULL,
        original_price DECIMAL(18, 2),
        
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        
        status NVARCHAR(20) NOT NULL DEFAULT 'active',
        
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        
        FOREIGN KEY (store_id) REFERENCES Stores(id),
        FOREIGN KEY (promotion_id) REFERENCES Promotions(id) ON DELETE SET NULL
    );
    PRINT 'Created BundleDeals table';
END

-- 9. BundleProducts Table (Sản phẩm trong combo)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BundleProducts')
BEGIN
    CREATE TABLE BundleProducts (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        bundle_id UNIQUEIDENTIFIER NOT NULL,
        product_id UNIQUEIDENTIFIER NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),
        
        FOREIGN KEY (bundle_id) REFERENCES BundleDeals(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE
    );
    PRINT 'Created BundleProducts table';
END

-- Create indexes for better performance
CREATE INDEX IX_Promotions_StoreId_Status ON Promotions(store_id, status);
CREATE INDEX IX_Promotions_Dates ON Promotions(start_date, end_date);
CREATE INDEX IX_Vouchers_Code ON Vouchers(code);
CREATE INDEX IX_Vouchers_StoreId_Status ON Vouchers(store_id, status);
CREATE INDEX IX_VoucherUsage_VoucherId ON VoucherUsage(voucher_id);
CREATE INDEX IX_PromotionUsage_PromotionId ON PromotionUsage(promotion_id);
CREATE INDEX IX_BundleDeals_StoreId_Status ON BundleDeals(store_id, status);

PRINT 'All promotion tables created successfully!';
