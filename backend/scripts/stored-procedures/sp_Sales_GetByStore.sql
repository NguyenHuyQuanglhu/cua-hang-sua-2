-- =============================================
-- Stored Procedure: sp_Sales_GetByStore
-- Description: Retrieves sales for a store with optional filters and pagination
-- Requirements: 2.3
-- =============================================

IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Sales_GetByStore')
    DROP PROCEDURE sp_Sales_GetByStore;
GO

CREATE PROCEDURE sp_Sales_GetByStore
    @storeId NVARCHAR(36),
    @status NVARCHAR(20) = NULL,
    @customerId NVARCHAR(36) = NULL,
    @startDate DATETIME = NULL,
    @endDate DATETIME = NULL,
    @searchTerm NVARCHAR(255) = NULL,
    @page INT = 1,
    @pageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @offset INT = (@page - 1) * @pageSize;
    DECLARE @total INT;
    
    -- Get total count
    SELECT @total = COUNT(*)
    FROM Sales s
    LEFT JOIN Customers c ON s.CustomerId = c.id
    WHERE s.StoreId = @storeId
        AND (@status IS NULL OR s.Status = @status)
        AND (@customerId IS NULL OR s.CustomerId = @customerId)
        AND (@startDate IS NULL OR s.TransactionDate >= @startDate)
        AND (@endDate IS NULL OR s.TransactionDate <= @endDate)
        AND (@searchTerm IS NULL OR s.InvoiceNumber LIKE '%' + @searchTerm + '%' OR c.full_name LIKE '%' + @searchTerm + '%');
    
    -- Return total count as first result set
    SELECT @total AS total;
    
    -- Return paginated sales
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
        s.UpdatedAt AS updatedAt,
        (SELECT COUNT(*) FROM SalesItems si WHERE si.SalesTransactionId = s.Id) AS itemCount
    FROM Sales s
    LEFT JOIN Customers c ON s.CustomerId = c.id
    WHERE s.StoreId = @storeId
        AND (@status IS NULL OR s.Status = @status)
        AND (@customerId IS NULL OR s.CustomerId = @customerId)
        AND (@startDate IS NULL OR s.TransactionDate >= @startDate)
        AND (@endDate IS NULL OR s.TransactionDate <= @endDate)
        AND (@searchTerm IS NULL OR s.InvoiceNumber LIKE '%' + @searchTerm + '%' OR c.full_name LIKE '%' + @searchTerm + '%')
    ORDER BY s.TransactionDate DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
END
GO
