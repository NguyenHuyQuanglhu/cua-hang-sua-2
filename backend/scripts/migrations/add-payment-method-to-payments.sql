-- Add payment_method column to Payments table
-- This allows tracking how debt payments were made (cash, card, transfer, etc.)

IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Payments') 
    AND name = 'payment_method'
)
BEGIN
    ALTER TABLE Payments
    ADD payment_method NVARCHAR(20) NULL DEFAULT 'cash';
    
    PRINT 'Added payment_method column to Payments table';
END
ELSE
BEGIN
    PRINT 'payment_method column already exists in Payments table';
END
GO

-- Update existing records to have default payment method
UPDATE Payments
SET payment_method = 'cash'
WHERE payment_method IS NULL;
GO

PRINT 'Migration completed: add-payment-method-to-payments.sql';
