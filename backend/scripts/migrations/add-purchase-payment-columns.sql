-- Add payment tracking columns to PurchaseOrders table

-- Add paid_amount column (default 0)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'PurchaseOrders') AND name = 'paid_amount')
BEGIN
    ALTER TABLE PurchaseOrders ADD paid_amount DECIMAL(18, 2) NOT NULL DEFAULT 0;
    PRINT 'Added paid_amount column to PurchaseOrders';
END
ELSE
BEGIN
    PRINT 'paid_amount column already exists in PurchaseOrders';
END

-- Add remaining_debt column (default = total_amount)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'PurchaseOrders') AND name = 'remaining_debt')
BEGIN
    ALTER TABLE PurchaseOrders ADD remaining_debt DECIMAL(18, 2) NULL;
    PRINT 'Added remaining_debt column to PurchaseOrders';
END
ELSE
BEGIN
    PRINT 'remaining_debt column already exists in PurchaseOrders';
END
GO

-- Initialize remaining_debt = total_amount for existing records
UPDATE PurchaseOrders SET remaining_debt = total_amount WHERE remaining_debt IS NULL;
PRINT 'Initialized remaining_debt values';
GO

-- Make remaining_debt NOT NULL after initialization
ALTER TABLE PurchaseOrders ALTER COLUMN remaining_debt DECIMAL(18, 2) NOT NULL;
PRINT 'Set remaining_debt to NOT NULL';
GO

-- Add payment_status column (default 'unpaid')
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'PurchaseOrders') AND name = 'payment_status')
BEGIN
    ALTER TABLE PurchaseOrders ADD payment_status NVARCHAR(20) NOT NULL DEFAULT 'unpaid';
    PRINT 'Added payment_status column to PurchaseOrders';
END
ELSE
BEGIN
    PRINT 'payment_status column already exists in PurchaseOrders';
END

PRINT 'Migration completed successfully!';
