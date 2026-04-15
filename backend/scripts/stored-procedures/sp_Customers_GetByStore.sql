-- =============================================
-- Stored Procedure: sp_Customers_GetByStore
-- Description: Retrieves all customers for a store with debt information
-- Requirements: 3.4
-- =============================================

IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Customers_GetByStore')
    DROP PROCEDURE sp_Customers_GetByStore;
GO

CREATE PROCEDURE sp_Customers_GetByStore
    @storeId NVARCHAR(36),
    @status NVARCHAR(20) = NULL,
    @customerType NVARCHAR(50) = NULL,
    @searchTerm NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        c.id,
        c.store_id AS storeId,
        c.full_name AS name,
        c.email,
        c.phone,
        c.address,
        c.customer_type AS customerType,
        c.customer_group AS customerGroup,
        c.gender,
        c.birthday,
        c.zalo,
        c.bank_name AS bankName,
        c.bank_account_number AS bankAccountNumber,
        c.bank_branch AS bankBranch,
        c.credit_limit AS creditLimit,
        c.status,
        ISNULL(c.lifetime_points, 0) AS lifetimePoints,
        ISNULL(c.loyalty_points, 0) AS loyaltyPoints,
        c.loyalty_tier AS loyaltyTier,
        c.notes,
        -- FORCE ALL DEBT VALUES TO ZERO
        0 AS totalDebt,
        0 AS totalPaid,
        -- Keep original calculations for reference (but not used in frontend)
        ISNULL((
            SELECT SUM(s.final_amount) 
            FROM Sales s 
            WHERE s.customer_id = c.id AND s.store_id = c.store_id AND s.status != 'cancelled'
        ), 0) AS totalSales,
        -- Calculate total payments from Payments table (for reference only)
        ISNULL((
            SELECT SUM(p.amount)
            FROM Payments p
            WHERE p.customer_id = c.id AND p.store_id = c.store_id
        ), 0) AS totalPayments,
        -- Force calculated debt to zero as well
        0 AS calculatedDebt,
        c.created_at AS createdAt,
        c.updated_at AS updatedAt
    FROM Customers c
    WHERE c.store_id = @storeId
        AND c.status != 'deleted'
        AND (@status IS NULL OR c.status = @status)
        AND (@customerType IS NULL OR c.customer_type = @customerType)
        AND (@searchTerm IS NULL OR c.full_name LIKE '%' + @searchTerm + '%' OR c.phone LIKE '%' + @searchTerm + '%' OR c.email LIKE '%' + @searchTerm + '%')
    ORDER BY c.full_name ASC;
END
GO
