-- =============================================
-- Master Database Schema for Multi-tenant RBAC
-- =============================================
-- This script creates the Master Database tables
-- for managing tenants and tenant authentication.
-- =============================================

-- Create Master Database if not exists
-- Note: Run this separately with appropriate permissions
-- CREATE DATABASE SmartInventory_Master;
-- GO
-- USE SmartInventory_Master;
-- GO

-- =============================================
-- Table: Tenants
-- Stores tenant (customer) information
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Tenants' AND xtype='U')
CREATE TABLE Tenants (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    slug NVARCHAR(100) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    phone NVARCHAR(20),
    status NVARCHAR(20) NOT NULL DEFAULT 'active',
    subscription_plan NVARCHAR(50) NOT NULL DEFAULT 'basic',
    database_name NVARCHAR(100) NOT NULL,
    database_server NVARCHAR(255) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT UQ_Tenants_slug UNIQUE (slug),
    CONSTRAINT UQ_Tenants_email UNIQUE (email),
    CONSTRAINT UQ_Tenants_database_name UNIQUE (database_name),
    CONSTRAINT CHK_Tenants_status CHECK (status IN ('active', 'suspended', 'deleted'))
);
GO

-- =============================================
-- Table: TenantUsers
-- Stores user credentials for tenant authentication
-- This table is used for initial login lookup
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TenantUsers' AND xtype='U')
CREATE TABLE TenantUsers (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id UNIQUEIDENTIFIER NOT NULL,
    email NVARCHAR(255) NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    is_owner BIT NOT NULL DEFAULT 0,
    status NVARCHAR(20) NOT NULL DEFAULT 'active',
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until DATETIME2,
    last_login DATETIME2,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT FK_TenantUsers_Tenants FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE,
    CONSTRAINT UQ_TenantUsers_tenant_email UNIQUE (tenant_id, email),
    CONSTRAINT CHK_TenantUsers_status CHECK (status IN ('active', 'inactive', 'locked'))
);
GO

-- =============================================
-- Indexes for Performance
-- =============================================

-- Index for tenant lookup by slug (used in URL routing)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Tenants_slug')
CREATE INDEX IX_Tenants_slug ON Tenants(slug);
GO

-- Index for tenant lookup by email
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Tenants_email')
CREATE INDEX IX_Tenants_email ON Tenants(email);
GO

-- Index for tenant lookup by status (for filtering active tenants)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Tenants_status')
CREATE INDEX IX_Tenants_status ON Tenants(status);
GO

-- Index for user lookup by email (used in login)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TenantUsers_email')
CREATE INDEX IX_TenantUsers_email ON TenantUsers(email);
GO

-- Index for user lookup by tenant_id (for listing users per tenant)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TenantUsers_tenant_id')
CREATE INDEX IX_TenantUsers_tenant_id ON TenantUsers(tenant_id);
GO

-- Index for user status filtering
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TenantUsers_status')
CREATE INDEX IX_TenantUsers_status ON TenantUsers(status);
GO

-- Composite index for login lookup (email + status)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TenantUsers_email_status')
CREATE INDEX IX_TenantUsers_email_status ON TenantUsers(email, status);
GO

PRINT 'Master Database schema created successfully!';
GO
