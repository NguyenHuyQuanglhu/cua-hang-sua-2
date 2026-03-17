-- =============================================
-- Stored Procedure: sp_Customers_Delete
-- Description: Deletes a customer
-- Requirements: 3.3
-- =============================================

IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Customers_Delete')
    DROP PROCEDURE sp_Customers_Delete;
GO

CREATE PROCEDURE sp_Customers_Delete
    @id NVARCHAR(36),
    @storeId NVARCHAR(36),
    @forceDelete BIT = 0  -- Admin can set this to 1 to force delete
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Check if customer exists
    IF NOT EXISTS (SELECT 1 FROM Customers WHERE id = @id AND store_id = @storeId)
    BEGIN
        RAISERROR('Customer not found', 16, 1);
        RETURN;
    END
    
    -- Check for existing transactions (only if not force delete)
    IF @forceDelete = 0
    BEGIN
        DECLARE @salesCount INT = 0;
        DECLARE @paymentsCount INT = 0;
        
        SELECT @salesCount = COUNT(*) FROM Sales WHERE customer_id = @id;
        SELECT @paymentsCount = COUNT(*) FROM Payments WHERE customer_id = @id;
        
        IF @salesCount > 0 OR @paymentsCount > 0
        BEGIN
            -- Return specific error for transactions
            RAISERROR('Cannot delete customer with existing transactions. Use force delete if you are admin.', 16, 1);
            RETURN;
        END
    END
    ELSE
    BEGIN
        -- Admin force delete: Remove related records first
        PRINT 'Admin force delete: Removing related records...';
        
        -- Delete SalesItems first (FK constraint)
        DELETE si FROM SalesItems si
        INNER JOIN Sales s ON si.sales_transaction_id = s.id
        WHERE s.customer_id = @id;
        
        -- Delete Sales
        DELETE FROM Sales WHERE customer_id = @id;
        
        -- Delete Payments
        DELETE FROM Payments WHERE customer_id = @id;
        
        PRINT 'Related records removed successfully.';
    END
    
    -- Delete the customer
    DELETE FROM Customers 
    WHERE id = @id AND store_id = @storeId;
    
    -- Return affected rows count
    SELECT @@ROWCOUNT AS AffectedRows;
END
GO
