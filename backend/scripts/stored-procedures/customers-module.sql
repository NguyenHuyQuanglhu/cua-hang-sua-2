-- =============================================
-- Customers Module - All Stored Procedures
-- Description: Combined file for all Customers-related stored procedures
-- Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
-- =============================================

-- =============================================
-- sp_Customers_Create
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
    @status NVARCHAR(20) = 'active',
    @lifetimePoints INT = 0,
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
            status,
            lifetime_points,
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
            @status,
            @lifetimePoints,
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
            status,
            lifetime_points AS lifetimePoints,
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

-- =============================================
-- sp_Customers_Update
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
    @status NVARCHAR(20) = NULL,
    @lifetimePoints INT = NULL,
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
        status = COALESCE(@status, status),
        lifetime_points = COALESCE(@lifetimePoints, lifetime_points),
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
        ISNULL(total_debt, 0) AS totalDebt,
        ISNULL(total_paid, 0) AS totalPaid,
        created_at AS createdAt,
        updated_at AS updatedAt
    FROM Customers
    WHERE id = @id AND store_id = @storeId;
END
GO

-- =============================================
-- sp_Customers_Delete
-- Description: Deletes a customer
-- Requirements: 3.3
-- =============================================

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
    
    -- Delete the customer
    DELETE FROM Customers 
    WHERE id = @id AND store_id = @storeId;
    
    -- Return affected rows count
    SELECT @@ROWCOUNT AS AffectedRows;
END
GO

-- =============================================
-- sp_Customers_GetByStore
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
        c.status,
        c.lifetime_points AS lifetimePoints,
        c.loyalty_tier AS loyaltyTier,
        c.notes,
        ISNULL(c.total_debt, 0) AS totalDebt,
        ISNULL(c.total_paid, 0) AS totalPaid,
        -- Always calculate debt from Sales remaining_debt (prioritize calculated value)
        (
            SELECT COALESCE(SUM(s.remaining_debt), 0)
            FROM Sales s
            WHERE s.customer_id = c.id AND s.remaining_debt > 0
        ) AS calculatedDebt,
        -- Always calculate payments total
        (
            SELECT COALESCE(SUM(p.amount), 0)
            FROM Payments p
            WHERE p.customer_id = c.id
        ) AS totalPayments,
        c.created_at AS createdAt,
        c.updated_at AS updatedAt
    FROM Customers c
    WHERE c.store_id = @storeId
        AND (@status IS NULL OR c.status = @status)
        AND (@customerType IS NULL OR c.customer_type = @customerType)
        AND (@searchTerm IS NULL OR c.full_name LIKE '%' + @searchTerm + '%' OR c.phone LIKE '%' + @searchTerm + '%' OR c.email LIKE '%' + @searchTerm + '%')
    ORDER BY c.full_name ASC;
END
GO

-- =============================================
-- sp_Customers_GetById
-- Description: Retrieves a single customer by ID
-- Requirements: 3.4
-- =============================================

IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Customers_GetById')
    DROP PROCEDURE sp_Customers_GetById;
GO

CREATE PROCEDURE sp_Customers_GetById
    @id NVARCHAR(36),
    @storeId NVARCHAR(36)
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
        c.status,
        c.lifetime_points AS lifetimePoints,
        c.loyalty_tier AS loyaltyTier,
        c.notes,
        ISNULL(c.total_debt, 0) AS totalDebt,
        ISNULL(c.total_paid, 0) AS totalPaid,
        -- Always calculate debt from Sales remaining_debt (prioritize calculated value)
        (
            SELECT COALESCE(SUM(s.remaining_debt), 0)
            FROM Sales s
            WHERE s.customer_id = c.id AND s.remaining_debt > 0
        ) AS calculatedDebt,
        -- Always calculate payments total
        (
            SELECT COALESCE(SUM(p.amount), 0)
            FROM Payments p
            WHERE p.customer_id = c.id
        ) AS totalPayments,
        c.created_at AS createdAt,
        c.updated_at AS updatedAt
    FROM Customers c
    WHERE c.id = @id AND c.store_id = @storeId;
END
GO

-- =============================================
-- sp_Customers_UpdateDebt
-- Description: Updates customer debt information
-- Requirements: 3.5
-- =============================================

IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Customers_UpdateDebt')
    DROP PROCEDURE sp_Customers_UpdateDebt;
GO

CREATE PROCEDURE sp_Customers_UpdateDebt
    @id NVARCHAR(36),
    @storeId NVARCHAR(36),
    @debtAmount DECIMAL(18,2) = 0,
    @paidAmount DECIMAL(18,2) = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Check if customer exists
    IF NOT EXISTS (SELECT 1 FROM Customers WHERE id = @id AND store_id = @storeId)
    BEGIN
        RAISERROR('Customer not found', 16, 1);
        RETURN;
    END
    
    -- Update debt and paid amounts
    UPDATE Customers SET
        total_debt = ISNULL(total_debt, 0) + @debtAmount,
        total_paid = ISNULL(total_paid, 0) + @paidAmount,
        updated_at = GETDATE()
    WHERE id = @id AND store_id = @storeId;
    
    -- Return updated debt information
    SELECT 
        id,
        store_id AS storeId,
        full_name AS name,
        ISNULL(total_debt, 0) AS totalDebt,
        ISNULL(total_paid, 0) AS totalPaid,
        ISNULL(total_debt, 0) - ISNULL(total_paid, 0) AS currentDebt,
        updated_at AS updatedAt
    FROM Customers
    WHERE id = @id AND store_id = @storeId;
END
GO

-- =============================================
-- sp_Customers_GetDebtHistory
-- Description: Gets customer debt history from Sales and Payments
-- Requirements: 3.6
-- =============================================

IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Customers_GetDebtHistory')
    DROP PROCEDURE sp_Customers_GetDebtHistory;
GO

CREATE PROCEDURE sp_Customers_GetDebtHistory
    @customerId NVARCHAR(36),
    @storeId NVARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;

    -- Check if customer exists
    IF NOT EXISTS (SELECT 1 FROM Customers WHERE id = @customerId AND store_id = @storeId)
    BEGIN
        RAISERROR('Customer not found', 16, 1);
        RETURN;
    END

    -- Return combined history of Sales (debt) and Payments
    -- Using UNION ALL to combine multiple sources
    SELECT * FROM (
        -- Sales transactions (debt additions) - show remaining_debt as the debt amount
        SELECT
            s.id AS id,
            @customerId AS customerId,
            s.remaining_debt AS amount,  -- Use remaining_debt (unpaid portion)
            'sale' AS type,
            s.transaction_date AS date,
            CONCAT(N'Hóa đơn #', s.invoice_number, N' (Tổng: ', FORMAT(s.final_amount, 'N0'), N'đ)') AS description,
            s.remaining_debt AS remainingDebt,
            s.created_at AS createdAt
        FROM Sales s
        WHERE s.customer_id = @customerId
            AND s.store_id = @storeId
            AND s.status IN ('completed', 'pending')
            AND s.remaining_debt > 0  -- Only show sales with remaining debt

        UNION ALL

        -- Payments at time of sale (from Sales.customer_payment)
        SELECT
            CONCAT(s.id, '-payment') AS id,
            @customerId AS customerId,
            s.customer_payment AS amount,
            'payment' AS type,
            s.transaction_date AS date,
            CONCAT(N'Thanh toán tại quầy - HĐ #', s.invoice_number) AS description,
            NULL AS remainingDebt,
            s.created_at AS createdAt
        FROM Sales s
        WHERE s.customer_id = @customerId
            AND s.store_id = @storeId
            AND s.status IN ('completed', 'pending')
            AND s.customer_payment > 0  -- Only show if there was a payment

        UNION ALL

        -- Separate payments from Payments table (debt reductions)
        SELECT
            p.id AS id,
            @customerId AS customerId,
            p.amount AS amount,
            'payment' AS type,
            p.payment_date AS date,
            ISNULL(p.notes, N'Thanh toán công nợ') AS description,
            NULL AS remainingDebt,
            p.created_at AS createdAt
        FROM Payments p
        WHERE p.customer_id = @customerId
            AND p.store_id = @storeId
    ) AS history
    ORDER BY date ASC, createdAt ASC;
END
GO

PRINT 'Customers module stored procedures created successfully!';
GO
