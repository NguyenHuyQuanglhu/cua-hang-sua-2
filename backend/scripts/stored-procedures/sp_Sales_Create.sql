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
    @createdBy NVARCHAR(36) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Insert into Sales table
        INSERT INTO Sales (
            Id,
            StoreId,
            InvoiceNumber,
            CustomerId,
            ShiftId,
            TransactionDate,
            Status,
            TotalAmount,
            VatAmount,
            FinalAmount,
            Discount,
            DiscountType,
            DiscountValue,
            TierDiscountPercentage,
            TierDiscountAmount,
            PointsUsed,
            PointsDiscount,
            CustomerPayment,
            PreviousDebt,
            RemainingDebt,
            CreatedBy,
            CreatedAt,
            UpdatedAt
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
            s.Id AS id,
            s.StoreId AS storeId,
            s.InvoiceNumber AS invoiceNumber,
            s.CustomerId AS customerId,
            c.full_name AS customerName,
            s.ShiftId AS shiftId,
            s.TransactionDate AS transactionDate,
            s.Status AS status,
            s.TotalAmount AS totalAmount,
            s.VatAmount AS vatAmount,
            s.FinalAmount AS finalAmount,
            s.Discount AS discount,
            s.DiscountType AS discountType,
            s.DiscountValue AS discountValue,
            s.TierDiscountPercentage AS tierDiscountPercentage,
            s.TierDiscountAmount AS tierDiscountAmount,
            s.PointsUsed AS pointsUsed,
            s.PointsDiscount AS pointsDiscount,
            s.CustomerPayment AS customerPayment,
            s.PreviousDebt AS previousDebt,
            s.RemainingDebt AS remainingDebt,
            s.CreatedBy AS createdBy,
            s.CreatedAt AS createdAt,
            s.UpdatedAt AS updatedAt
        FROM Sales s
        LEFT JOIN Customers c ON s.CustomerId = c.id
        WHERE s.Id = @id AND s.StoreId = @storeId;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        THROW;
    END CATCH
END
GO
