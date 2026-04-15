-- =============================================
-- Stored Procedure: sp_Customers_Update
-- Description: Updates an existing customer with COALESCE for partial updates
-- Requirements: 3.2
-- =============================================

IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Customers_Update')
    DROP PROCEDURE sp_Customers_Update;
GO

CREATE PROCEDURE sp_Customers_Update
    @id NVARCHAR(36),
    @storeId NVARCHAR(36),
    @name NVARCHAR(255) = NULL,
    @email NVARCHAR(255) = NULL,
    @phone NVARCHAR(50) = NULL,
    @address NVARCHAR(500) = NULL,
    @customerType NVARCHAR(50) = NULL,
    @customerGroup NVARCHAR(100) = NULL,
    @gender NVARCHAR(20) = NULL,
    @birthday DATE = NULL,
    @zalo NVARCHAR(50) = NULL,
    @bankName NVARCHAR(255) = NULL,
    @bankAccountNumber NVARCHAR(50) = NULL,
    @bankBranch NVARCHAR(255) = NULL,
    @creditLimit DECIMAL(18,2) = NULL,
    @status NVARCHAR(20) = NULL,
    @lifetimePoints INT = NULL,
    @loyaltyPoints INT = NULL,
    @loyaltyTier NVARCHAR(50) = NULL,
    @notes NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Check if customer exists
    IF NOT EXISTS (SELECT 1 FROM Customers WHERE id = @id AND store_id = @storeId)
    BEGIN
        RAISERROR('Customer not found', 16, 1);
        RETURN;
    END
    
    -- Update customer with COALESCE for partial updates
    UPDATE Customers SET
        full_name = COALESCE(@name, full_name),
        email = COALESCE(@email, email),
        phone = COALESCE(@phone, phone),
        address = COALESCE(@address, address),
        customer_type = COALESCE(@customerType, customer_type),
        customer_group = COALESCE(@customerGroup, customer_group),
        gender = COALESCE(@gender, gender),
        birthday = COALESCE(@birthday, birthday),
        zalo = COALESCE(@zalo, zalo),
        bank_name = COALESCE(@bankName, bank_name),
        bank_account_number = COALESCE(@bankAccountNumber, bank_account_number),
        bank_branch = COALESCE(@bankBranch, bank_branch),
        credit_limit = COALESCE(@creditLimit, credit_limit),
        status = COALESCE(@status, status),
        lifetime_points = COALESCE(@lifetimePoints, lifetime_points),
        loyalty_points = COALESCE(@loyaltyPoints, loyalty_points),
        loyalty_tier = COALESCE(@loyaltyTier, loyalty_tier),
        notes = COALESCE(@notes, notes),
        updated_at = GETDATE()
    WHERE id = @id AND store_id = @storeId;
    
    -- Return the updated customer
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
END
GO
