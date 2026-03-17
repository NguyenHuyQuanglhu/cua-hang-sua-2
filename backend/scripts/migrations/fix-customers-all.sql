-- Fix sp_Customers_Create
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
    @status NVARCHAR(20) = 'active',
    @lifetimePoints INT = 0,
    @loyaltyTier NVARCHAR(50) = NULL,
    @notes NVARCHAR(MAX) = NULL,
    @gender NVARCHAR(20) = NULL,
    @birthday DATE = NULL,
    @zalo NVARCHAR(50) = NULL,
    @bankName NVARCHAR(255) = NULL,
    @bankAccountNumber NVARCHAR(50) = NULL,
    @bankBranch NVARCHAR(255) = NULL,
    @creditLimit DECIMAL(18,2) = 0,
    @loyaltyPoints INT = 0
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
            status,
            lifetime_points,
            loyalty_tier,
            notes,
            gender,
            birthday,
            zalo,
            bank_name,
            bank_account_number,
            bank_branch,
            credit_limit,
            loyalty_points,
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
            @status,
            @lifetimePoints,
            @loyaltyTier,
            @notes,
            @gender,
            @birthday,
            @zalo,
            @bankName,
            @bankAccountNumber,
            @bankBranch,
            @creditLimit,
            @loyaltyPoints,
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
            status,
            lifetime_points AS lifetimePoints,
            loyalty_tier AS loyaltyTier,
            notes,
            gender,
            birthday,
            zalo,
            bank_name AS bankName,
            bank_account_number AS bankAccountNumber,
            bank_branch AS bankBranch,
            credit_limit AS creditLimit,
            loyalty_points AS loyaltyPoints,
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

-- Fix sp_Customers_Update
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
        status,
        lifetime_points AS lifetimePoints,
        loyalty_tier AS loyaltyTier,
        notes,
        gender,
        birthday,
        zalo,
        bank_name AS bankName,
        bank_account_number AS bankAccountNumber,
        bank_branch AS bankBranch,
        credit_limit AS creditLimit,
        loyalty_points AS loyaltyPoints,
        ISNULL(total_debt, 0) AS totalDebt,
        ISNULL(total_paid, 0) AS totalPaid,
        created_at AS createdAt,
        updated_at AS updatedAt
    FROM Customers
    WHERE id = @id AND store_id = @storeId;
END
GO

-- Fix sp_Customers_Delete
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Customers_Delete')
    DROP PROCEDURE sp_Customers_Delete;
GO

CREATE PROCEDURE sp_Customers_Delete
    @id NVARCHAR(36),
    @storeId NVARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Check if customer exists
    IF NOT EXISTS (SELECT 1 FROM Customers WHERE id = @id AND store_id = @storeId)
    BEGIN
        RAISERROR('Customer not found', 16, 1);
        RETURN;
    END

    -- Check if it has any sales or payments manually to throw a predictable error
    IF EXISTS (SELECT 1 FROM Sales WHERE customer_id = @id) OR EXISTS (SELECT 1 FROM Payments WHERE customer_id = @id)
    BEGIN
        RAISERROR('FOREIGN KEY constraint violation: Cannot delete customer with existing sales or payments', 16, 1);
        RETURN;
    END
    
    -- Delete the customer
    DELETE FROM Customers 
    WHERE id = @id AND store_id = @storeId;
    
    -- Return affected rows count
    SELECT @@ROWCOUNT AS AffectedRows;
END
GO
