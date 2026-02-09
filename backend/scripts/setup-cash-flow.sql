-- Script to create CashTransactions table and sync data
-- Run this directly in SQL Server Management Studio or Azure Data Studio

USE Data_quanlybanhang_online;
GO

-- 1. Create CashTransactions table if not exists
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CashTransactions')
BEGIN
    PRINT 'Creating CashTransactions table...';
    
    CREATE TABLE CashTransactions (
        id NVARCHAR(36) PRIMARY KEY,
        store_id NVARCHAR(36) NOT NULL,
        type NVARCHAR(10) NOT NULL CHECK (type IN ('thu', 'chi')),
        transaction_date DATETIME NOT NULL,
        amount DECIMAL(18, 2) NOT NULL,
        reason NVARCHAR(500) NOT NULL,
        category NVARCHAR(100),
        related_invoice_id NVARCHAR(36),
        created_by NVARCHAR(36),
        created_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (store_id) REFERENCES Stores(id) ON DELETE CASCADE
    );
    
    PRINT '✓ CashTransactions table created';
    
    -- Create indexes
    CREATE INDEX IX_CashTransactions_StoreId ON CashTransactions(store_id);
    CREATE INDEX IX_CashTransactions_TransactionDate ON CashTransactions(transaction_date);
    CREATE INDEX IX_CashTransactions_Type ON CashTransactions(type);
    
    PRINT '✓ Indexes created';
END
ELSE
BEGIN
    PRINT '✓ CashTransactions table already exists';
END
GO

-- 2. Sync existing sales to cash transactions
PRINT '';
PRINT '1. Syncing sales to cash transactions...';

INSERT INTO CashTransactions (id, store_id, type, transaction_date, amount, reason, category, related_invoice_id, created_at)
SELECT 
    NEWID() as id,
    s.store_id,
    'thu' as type,
    s.transaction_date,
    s.customer_payment as amount,
    'Thu tiền bán hàng - ' + s.invoice_number as reason,
    N'Bán hàng' as category,
    s.id as related_invoice_id,
    s.created_at
FROM Sales s
WHERE s.customer_payment > 0
    AND NOT EXISTS (
        SELECT 1 FROM CashTransactions ct 
        WHERE ct.related_invoice_id = s.id AND ct.type = 'thu'
    );

PRINT '✓ Synced ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + ' sales transactions';
GO

-- 3. Sync purchase orders to cash transactions
PRINT '';
PRINT '2. Syncing purchase orders to cash transactions...';

INSERT INTO CashTransactions (id, store_id, type, transaction_date, amount, reason, category, related_invoice_id, created_at)
SELECT 
    NEWID() as id,
    po.store_id,
    'chi' as type,
    po.import_date as transaction_date,
    po.total_amount as amount,
    N'Chi tiền nhập hàng - ' + po.order_number + 
        CASE WHEN s.name IS NOT NULL THEN N' từ ' + s.name ELSE '' END as reason,
    N'Nhập hàng' as category,
    po.id as related_invoice_id,
    po.created_at
FROM PurchaseOrders po
LEFT JOIN Suppliers s ON po.supplier_id = s.id
WHERE NOT EXISTS (
    SELECT 1 FROM CashTransactions ct 
    WHERE ct.related_invoice_id = po.id AND ct.type = 'chi' AND ct.category = N'Nhập hàng'
);

PRINT '✓ Synced ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + ' purchase transactions';
GO

-- 4. Sync supplier payments to cash transactions
PRINT '';
PRINT '3. Syncing supplier payments to cash transactions...';

INSERT INTO CashTransactions (id, store_id, type, transaction_date, amount, reason, category, related_invoice_id, created_at)
SELECT 
    NEWID() as id,
    sp.store_id,
    'chi' as type,
    sp.payment_date as transaction_date,
    sp.amount,
    N'Thanh toán cho ' + ISNULL(s.name, N'Nhà cung cấp') + 
        CASE WHEN sp.notes IS NOT NULL THEN ' - ' + sp.notes ELSE '' END as reason,
    N'Thanh toán nhà cung cấp' as category,
    sp.id as related_invoice_id,
    sp.created_at
FROM SupplierPayments sp
LEFT JOIN Suppliers s ON sp.supplier_id = s.id
WHERE NOT EXISTS (
    SELECT 1 FROM CashTransactions ct 
    WHERE ct.related_invoice_id = sp.id AND ct.type = 'chi' AND ct.category = N'Thanh toán nhà cung cấp'
);

PRINT '✓ Synced ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + ' supplier payment transactions';
GO

-- 5. Show summary
PRINT '';
PRINT '=== Summary ===';
PRINT '';

SELECT 
    type as [Loại],
    category as [Danh mục],
    COUNT(*) as [Số giao dịch],
    FORMAT(SUM(amount), 'N0') + ' ₫' as [Tổng tiền]
FROM CashTransactions
GROUP BY type, category
ORDER BY type, category;

PRINT '';
PRINT '=== Tổng kết ===';

DECLARE @totalIncome DECIMAL(18,2);
DECLARE @totalExpense DECIMAL(18,2);
DECLARE @balance DECIMAL(18,2);

SELECT 
    @totalIncome = ISNULL(SUM(CASE WHEN type = 'thu' THEN amount ELSE 0 END), 0),
    @totalExpense = ISNULL(SUM(CASE WHEN type = 'chi' THEN amount ELSE 0 END), 0)
FROM CashTransactions;

SET @balance = @totalIncome - @totalExpense;

PRINT '📈 Tổng thu: ' + FORMAT(@totalIncome, 'N0') + ' ₫';
PRINT '📉 Tổng chi: ' + FORMAT(@totalExpense, 'N0') + ' ₫';
PRINT '💰 Số dư: ' + FORMAT(@balance, 'N0') + ' ₫';
PRINT '';
PRINT '✓ Sync complete!';
GO
