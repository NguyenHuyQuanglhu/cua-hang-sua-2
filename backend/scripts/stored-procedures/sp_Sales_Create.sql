-- =============================================
-- Stored Procedure: sp_Sales_Create
-- Description: Creates a new sale with transaction handling
-- Requirements: 2.1
-- =============================================

IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Sales_Create')
    DROP PROCEDURE sp_Sales_Create;
GO

CREATE PROCEDURE sp_Sales_Create
    @id NVARCHAR(36),
    @storeId NVARCHAR(36),
    @invoiceNumber NVARCHAR(50),
    @customerId NVARCHAR(36) = NULL,
    @shiftId NVARCHAR(36) = NULL,
    @totalAmount DECIMAL(18,2),
    @vatAmount DECIMAL(18,2) = 0,
    @finalAmount DECIMAL(18,2),
    @discount DECIMAL(18,2) = 0,
    @discountType NVARCHAR(20) = NULL,
    @discountValue DECIMAL(18,2) = NULL,
    @tierDiscountPercentage DECIMAL(5,2) = NULL,
    @tierDiscountAmount DECIMAL(18,2) = NULL,
    @pointsUsed INT = 0,
    @pointsDiscount DECIMAL(18,2) = 0,
    @customerPayment DECIMAL(18,2) = 0,
    @previousDebt DECIMAL(18,2) = 0,
    @remainingDebt DECIMAL(18,2) = 0,
    @status NVARCHAR(20) = 'pending',
    @createdBy UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Insert into Sales table
        INSERT INTO Sales (
            id,
            store_id,
            invoice_number,
            customer_id,
            shift_id,
            transaction_date,
            status,
            total_amount,
            vat_amount,
            final_amount,
            discount,
            discount_type,
            discount_value,
            tier_discount_percentage,
            tier_discount_amount,
            points_used,
            points_discount,
            customer_payment,
            previous_debt,
            remaining_debt,
            CreatedBy,
            created_at,
            updated_at
        )
        VALUES (
            @id,
            @storeId,
            @invoiceNumber,
            @customerId,
            @shiftId,
            GETDATE(),
            @status,
            @totalAmount,
            @vatAmount,
            @finalAmount,
            @discount,
            @discountType,
            @discountValue,
            @tierDiscountPercentage,
            @tierDiscountAmount,
            @pointsUsed,
            @pointsDiscount,
            @customerPayment,
            @previousDebt,
            @remainingDebt,
            @createdBy,
            GETDATE(),
            GETDATE()
        );
        
        COMMIT TRANSACTION;
        
        -- Return the created sale
        SELECT 
            s.id AS id,
            s.store_id AS storeId,
            s.invoice_number AS invoiceNumber,
            s.customer_id AS customerId,
            c.full_name AS customerName,
            s.shift_id AS shiftId,
            s.transaction_date AS transactionDate,
            s.status AS status,
            s.total_amount AS totalAmount,
            s.vat_amount AS vatAmount,
            s.final_amount AS finalAmount,
            s.discount AS discount,
            s.discount_type AS discountType,
            s.discount_value AS discountValue,
            s.tier_discount_percentage AS tierDiscountPercentage,
            s.tier_discount_amount AS tierDiscountAmount,
            s.points_used AS pointsUsed,
            s.points_discount AS pointsDiscount,
            s.customer_payment AS customerPayment,
            s.previous_debt AS previousDebt,
            s.remaining_debt AS remainingDebt,
            s.CreatedBy AS createdBy,
            s.created_at AS createdAt,
            s.updated_at AS updatedAt
        FROM Sales s
        LEFT JOIN Customers c ON s.customer_id = c.id
        WHERE s.id = @id AND s.store_id = @storeId;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        THROW;
    END CATCH
END
GO
