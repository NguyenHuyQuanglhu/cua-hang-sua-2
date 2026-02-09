-- =============================================
-- Stored Procedure: sp_Customers_Create
-- Description: Creates a new customer
-- Requirements: 3.1
-- =============================================

IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Customers_Create')
    DROP PROCEDURE sp_Customers_Create;
GO

CREATE PROCEDURE sp_Customers_Create
    @id NVARCHAR(36),
    @storeId NVARCHAR(36),
    @name NVARCHAR(255),
    @email NVARCHAR(255) = NULL,
    @phone NVARCHAR(50) = NULL,
    @address NVARCHAR(500) = NULL,
    @customerType NVARCHAR(50) = 'personal',
    @customerGroup NVARCHAR(100) = NULL,
    @gender NVARCHAR(20) = NULL,
    @birthday DATE = NULL,
    @zalo NVARCHAR(50) = NULL,
    @bankName NVARCHAR(255) = NULL,
    @bankAccountNumber NVARCHAR(50) = NULL,
    @bankBranch NVARCHAR(255) = NULL,
    @creditLimit DECIMAL(18,2) = 0,
    @status NVARCHAR(20) = 'active',
    @lifetimePoints INT = 0,
    @loyaltyPoints INT = 0,
    @loyaltyTier NVARCHAR(50) = NULL,
    @notes NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Insert into Customers table
        INSERT INTO Customers (
            id,
            store_id,
            full_name,
            email,
            phone,
            address,
            customer_type,
            customer_group,
            gender,
            birthday,
            zalo,
            bank_name,
            bank_account_number,
            bank_branch,
            credit_limit,
            status,
            lifetime_points,
            loyalty_points,
            loyalty_tier,
            notes,
            total_debt,
            total_paid,
            created_at,
            updated_at
        )
        VALUES (
            @id,
            @storeId,
            @name,
            @email,
            @phone,
            @address,
            @customerType,
            @customerGroup,
            @gender,
            @birthday,
            @zalo,
            @bankName,
            @bankAccountNumber,
            @bankBranch,
            @creditLimit,
            @status,
            @lifetimePoints,
            @loyaltyPoints,
            @loyaltyTier,
            @notes,
            0,
            0,
            GETDATE(),
            GETDATE()
        );
        
        -- Return the created customer
        SELECT 
            id,
            store_id AS storeId,
            full_name AS name,
            email,
            phone,
            address,
            customer_type AS customerType,
            customer_group AS customerGroup,
            gender,
            birthday,
            zalo,
            bank_name AS bankName,
            bank_account_number AS bankAccountNumber,
            bank_branch AS bankBranch,
            credit_limit AS creditLimit,
            status,
            lifetime_points AS lifetimePoints,
            loyalty_points AS loyaltyPoints,
            loyalty_tier AS loyaltyTier,
            notes,
            ISNULL(total_debt, 0) AS totalDebt,
            ISNULL(total_paid, 0) AS totalPaid,
            created_at AS createdAt,
            updated_at AS updatedAt
        FROM Customers
        WHERE id = @id AND store_id = @storeId;
        
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO
