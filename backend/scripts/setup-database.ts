import { getConnection, closeConnection, sql } from '../src/db';
import { hashPassword } from '../src/auth/password';
import { v4 as uuidv4 } from 'uuid';

async function setupDatabase() {
  console.log('🚀 Starting database setup...\n');
  
  try {
    const pool = await getConnection();
    console.log('✅ Connected to SQL Server\n');
    console.log('📋 Cleaning up and creating tables...\n');

    // Drop existing tables if they exist (in correct order due to FK constraints)
    const tablesToDrop = [
      'AuditLogs', 'Settings', 'CashTransactions', 'PurchaseOrderItems', 
      'PurchaseOrders', 'SupplierPayments', 'Payments', 'SalesItems', 
      'Sales', 'Shifts', 'Contractors', 'Suppliers', 'Units', 'UserStores', 'Sessions', 'Users'
    ];
    
    for (const table of tablesToDrop) {
      try {
        await pool.request().query(`
          IF EXISTS (SELECT * FROM sysobjects WHERE name='${table}' AND xtype='U')
          DROP TABLE ${table}
        `);
      } catch (e) {
        // Ignore errors
      }
    }
    console.log('  ✅ Cleaned up existing tables');

    // Create Users table
    await pool.request().query(`
      CREATE TABLE Users (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        email NVARCHAR(255) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        display_name NVARCHAR(255),
        role NVARCHAR(50) NOT NULL DEFAULT 'salesperson',
        permissions NVARCHAR(MAX),
        status NVARCHAR(20) NOT NULL DEFAULT 'active',
        failed_login_attempts INT NOT NULL DEFAULT 0,
        locked_until DATETIME2,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
      )
    `);
    console.log('  ✅ Users table created');

    // Create Sessions table
    await pool.request().query(`
      CREATE TABLE Sessions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        token NVARCHAR(MAX) NOT NULL,
        expires_at DATETIME2 NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (user_id) REFERENCES Users(id)
      )
    `);
    console.log('  ✅ Sessions table created');

    // Create UserStores table
    await pool.request().query(`
      CREATE TABLE UserStores (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        store_id UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (user_id) REFERENCES Users(id),
        FOREIGN KEY (store_id) REFERENCES Stores(id),
        UNIQUE (user_id, store_id)
      )
    `);
    console.log('  ✅ UserStores table created');

    // Create Units table
    await pool.request().query(`
      CREATE TABLE Units (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        store_id UNIQUEIDENTIFIER NOT NULL,
        name NVARCHAR(100) NOT NULL,
        description NVARCHAR(500),
        base_unit_id UNIQUEIDENTIFIER,
        conversion_factor DECIMAL(18,4),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (store_id) REFERENCES Stores(id)
      )
    `);
    console.log('  ✅ Units table created');

    // Create Suppliers table
    await pool.request().query(`
      CREATE TABLE Suppliers (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        store_id UNIQUEIDENTIFIER NOT NULL,
        name NVARCHAR(255) NOT NULL,
        contact_person NVARCHAR(255),
        email NVARCHAR(255),
        phone NVARCHAR(50),
        address NVARCHAR(500),
        tax_code NVARCHAR(50),
        notes NVARCHAR(MAX),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (store_id) REFERENCES Stores(id)
      )
    `);
    console.log('  ✅ Suppliers table created');

    // Create Contractors table
    await pool.request().query(`
      CREATE TABLE Contractors (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        store_id UNIQUEIDENTIFIER NOT NULL,
        name NVARCHAR(255) NOT NULL,
        contact_person NVARCHAR(255),
        email NVARCHAR(255),
        phone NVARCHAR(50),
        address NVARCHAR(500),
        tax_code NVARCHAR(50),
        identity_number NVARCHAR(50),
        description NVARCHAR(MAX),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (store_id) REFERENCES Stores(id)
      )
    `);
    console.log('  âœ… Contractors table created');

    // Create Shifts table
    await pool.request().query(`
      CREATE TABLE Shifts (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        store_id UNIQUEIDENTIFIER NOT NULL,
        user_id UNIQUEIDENTIFIER NOT NULL,
        user_name NVARCHAR(255) NOT NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'active',
        start_time DATETIME2 NOT NULL,
        end_time DATETIME2,
        starting_cash DECIMAL(18,2) NOT NULL DEFAULT 0,
        ending_cash DECIMAL(18,2),
        cash_sales DECIMAL(18,2),
        cash_payments DECIMAL(18,2),
        total_cash_in_drawer DECIMAL(18,2),
        cash_difference DECIMAL(18,2),
        total_revenue DECIMAL(18,2) NOT NULL DEFAULT 0,
        sales_count INT NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (store_id) REFERENCES Stores(id),
        FOREIGN KEY (user_id) REFERENCES Users(id)
      )
    `);
    console.log('  ✅ Shifts table created');

    // Create Sales table
    await pool.request().query(`
      CREATE TABLE Sales (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        store_id UNIQUEIDENTIFIER NOT NULL,
        invoice_number NVARCHAR(50) NOT NULL,
        customer_id UNIQUEIDENTIFIER,
        contractor_id UNIQUEIDENTIFIER,
        shift_id UNIQUEIDENTIFIER,
        transaction_date DATETIME2 NOT NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'pending',
        total_amount DECIMAL(18,2) NOT NULL,
        vat_amount DECIMAL(18,2),
        final_amount DECIMAL(18,2) NOT NULL,
        discount DECIMAL(18,2),
        discount_type NVARCHAR(20),
        discount_value DECIMAL(18,2),
        tier_discount_percentage DECIMAL(5,2),
        tier_discount_amount DECIMAL(18,2),
        points_used INT,
        points_discount DECIMAL(18,2),
        customer_payment DECIMAL(18,2),
        previous_debt DECIMAL(18,2),
        remaining_debt DECIMAL(18,2),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (store_id) REFERENCES Stores(id),
        FOREIGN KEY (customer_id) REFERENCES Customers(id),
        FOREIGN KEY (contractor_id) REFERENCES Contractors(id),
        FOREIGN KEY (shift_id) REFERENCES Shifts(id)
      )
    `);
    console.log('  ✅ Sales table created');

    // Create SalesItems table
    await pool.request().query(`
      CREATE TABLE SalesItems (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        sales_transaction_id UNIQUEIDENTIFIER NOT NULL,
        product_id UNIQUEIDENTIFIER NOT NULL,
        quantity DECIMAL(18,4) NOT NULL,
        price DECIMAL(18,2) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (sales_transaction_id) REFERENCES Sales(id),
        FOREIGN KEY (product_id) REFERENCES Products(id)
      )
    `);
    console.log('  ✅ SalesItems table created');

    // Create Payments table
    await pool.request().query(`
      CREATE TABLE Payments (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        store_id UNIQUEIDENTIFIER NOT NULL,
        customer_id UNIQUEIDENTIFIER NOT NULL,
        payment_date DATETIME2 NOT NULL,
        amount DECIMAL(18,2) NOT NULL,
        notes NVARCHAR(MAX),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (store_id) REFERENCES Stores(id),
        FOREIGN KEY (customer_id) REFERENCES Customers(id)
      )
    `);
    console.log('  ✅ Payments table created');

    // Create SupplierPayments table
    await pool.request().query(`
      CREATE TABLE SupplierPayments (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        store_id UNIQUEIDENTIFIER NOT NULL,
        supplier_id UNIQUEIDENTIFIER NOT NULL,
        payment_date DATETIME2 NOT NULL,
        amount DECIMAL(18,2) NOT NULL,
        notes NVARCHAR(MAX),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (store_id) REFERENCES Stores(id),
        FOREIGN KEY (supplier_id) REFERENCES Suppliers(id)
      )
    `);
    console.log('  ✅ SupplierPayments table created');

    // Create PurchaseOrders table
    await pool.request().query(`
      CREATE TABLE PurchaseOrders (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        store_id UNIQUEIDENTIFIER NOT NULL,
        order_number NVARCHAR(50) NOT NULL,
        supplier_id UNIQUEIDENTIFIER,
        contractor_id UNIQUEIDENTIFIER,
        import_date DATETIME2 NOT NULL,
        total_amount DECIMAL(18,2) NOT NULL,
        notes NVARCHAR(MAX),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (store_id) REFERENCES Stores(id),
        FOREIGN KEY (supplier_id) REFERENCES Suppliers(id),
        FOREIGN KEY (contractor_id) REFERENCES Contractors(id)
      )
    `);
    console.log('  ✅ PurchaseOrders table created');

    // Create PurchaseOrderItems table
    await pool.request().query(`
      CREATE TABLE PurchaseOrderItems (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        purchase_order_id UNIQUEIDENTIFIER NOT NULL,
        product_id UNIQUEIDENTIFIER NOT NULL,
        quantity DECIMAL(18,4) NOT NULL,
        cost DECIMAL(18,2) NOT NULL,
        unit_id UNIQUEIDENTIFIER,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (purchase_order_id) REFERENCES PurchaseOrders(id),
        FOREIGN KEY (product_id) REFERENCES Products(id),
        FOREIGN KEY (unit_id) REFERENCES Units(id)
      )
    `);
    console.log('  ✅ PurchaseOrderItems table created');

    // Create CashTransactions table
    await pool.request().query(`
      CREATE TABLE CashTransactions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        store_id UNIQUEIDENTIFIER NOT NULL,
        type NVARCHAR(10) NOT NULL,
        transaction_date DATETIME2 NOT NULL,
        amount DECIMAL(18,2) NOT NULL,
        reason NVARCHAR(500) NOT NULL,
        category NVARCHAR(100),
        related_invoice_id UNIQUEIDENTIFIER,
        created_by UNIQUEIDENTIFIER,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (store_id) REFERENCES Stores(id)
      )
    `);
    console.log('  ✅ CashTransactions table created');

    // Create AuditLogs table
    await pool.request().query(`
      CREATE TABLE AuditLogs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        store_id UNIQUEIDENTIFIER NOT NULL,
        user_id UNIQUEIDENTIFIER,
        action NVARCHAR(50) NOT NULL,
        entity_type NVARCHAR(50) NOT NULL,
        entity_id UNIQUEIDENTIFIER,
        old_values NVARCHAR(MAX),
        new_values NVARCHAR(MAX),
        ip_address NVARCHAR(50),
        user_agent NVARCHAR(500),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (store_id) REFERENCES Stores(id)
      )
    `);
    console.log('  ✅ AuditLogs table created');

    // Create Settings table
    await pool.request().query(`
      CREATE TABLE Settings (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        store_id UNIQUEIDENTIFIER NOT NULL UNIQUE,
        settings NVARCHAR(MAX),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (store_id) REFERENCES Stores(id)
      )
    `);
    console.log('  ✅ Settings table created');

    // Setup users
    console.log('\n👤 Setting up users...\n');
    
    // Create admin user
    const adminId = uuidv4();
    const adminPasswordHash = await hashPassword('admin123');
    
    await pool.request()
      .input('id', sql.UniqueIdentifier, adminId)
      .input('email', sql.NVarChar, 'admin@smartinventory.com')
      .input('passwordHash', sql.NVarChar, adminPasswordHash)
      .input('displayName', sql.NVarChar, 'Administrator')
      .input('role', sql.NVarChar, 'admin')
      .input('permissions', sql.NVarChar, JSON.stringify({}))
      .input('status', sql.NVarChar, 'active')
      .query(`
        INSERT INTO Users (id, email, password_hash, display_name, role, permissions, status)
        VALUES (@id, @email, @passwordHash, @displayName, @role, @permissions, @status)
      `);
    
    console.log('  ✅ Admin user created');
    console.log('     Email: admin@smartinventory.com');
    console.log('     Password: admin123');

    // Create test user
    const testUserId = uuidv4();
    const testPasswordHash = await hashPassword('123456789');
    
    await pool.request()
      .input('id', sql.UniqueIdentifier, testUserId)
      .input('email', sql.NVarChar, 'phuc@lhu.edu.vn')
      .input('passwordHash', sql.NVarChar, testPasswordHash)
      .input('displayName', sql.NVarChar, 'Phuc')
      .input('role', sql.NVarChar, 'admin')
      .input('permissions', sql.NVarChar, JSON.stringify({}))
      .input('status', sql.NVarChar, 'active')
      .query(`
        INSERT INTO Users (id, email, password_hash, display_name, role, permissions, status)
        VALUES (@id, @email, @passwordHash, @displayName, @role, @permissions, @status)
      `);
    
    console.log('  ✅ User phuc@lhu.edu.vn created');
    console.log('     Password: 123456789');

    // Link users to stores
    const stores = await pool.request().query('SELECT id FROM Stores');
    console.log(`\n🏪 Linking users to ${stores.recordset.length} store(s)...\n`);
    
    for (const store of stores.recordset) {
      // Link admin
      await pool.request()
        .input('id', sql.UniqueIdentifier, uuidv4())
        .input('userId', sql.UniqueIdentifier, adminId)
        .input('storeId', sql.UniqueIdentifier, store.id)
        .query('INSERT INTO UserStores (id, user_id, store_id) VALUES (@id, @userId, @storeId)');

      // Link test user
      await pool.request()
        .input('id', sql.UniqueIdentifier, uuidv4())
        .input('userId', sql.UniqueIdentifier, testUserId)
        .input('storeId', sql.UniqueIdentifier, store.id)
        .query('INSERT INTO UserStores (id, user_id, store_id) VALUES (@id, @userId, @storeId)');
    }
    console.log('  ✅ Users linked to stores');

    await closeConnection();
    console.log('\n✅ Database setup completed!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();
