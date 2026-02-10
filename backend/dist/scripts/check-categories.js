"use strict";
/**
 * Script to check and fix Categories table and stored procedures
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mssql_1 = __importDefault(require("mssql"));
const config = {
    user: process.env.DB_USER || 'userquanlybanhangonline',
    password: process.env.DB_PASSWORD || '123456789',
    server: process.env.DB_SERVER || '118.69.126.49',
    database: process.env.DB_NAME || 'Data_QuanLyBanHang_Online',
    port: parseInt(process.env.DB_PORT || '1433'),
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};
async function checkCategories() {
    try {
        console.log('Connecting to database...');
        const pool = await mssql_1.default.connect(config);
        // Check Categories table structure
        console.log('\n=== Checking Categories table structure ===');
        const columns = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Categories'
      ORDER BY ORDINAL_POSITION
    `);
        console.log('Categories columns:');
        columns.recordset.forEach((row) => {
            console.log(`  ${row.COLUMN_NAME} (${row.DATA_TYPE})`);
        });
        // Check if sp_Categories_Create exists
        console.log('\n=== Checking stored procedures ===');
        const spExists = await pool.request().query(`
      SELECT name FROM sys.objects
      WHERE type = 'P' AND name LIKE 'sp_Categories%'
    `);
        console.log('Category stored procedures:');
        spExists.recordset.forEach((row) => {
            console.log(`  ${row.name}`);
        });
        // If sp_Categories_Create doesn't exist, create it
        if (!spExists.recordset.some((r) => r.name === 'sp_Categories_Create')) {
            console.log('\nsp_Categories_Create does not exist. Creating...');
            await pool.request().query(`
        CREATE PROCEDURE sp_Categories_Create
            @id NVARCHAR(36),
            @storeId NVARCHAR(36),
            @name NVARCHAR(255),
            @description NVARCHAR(500) = NULL,
            @parentId NVARCHAR(36) = NULL
        AS
        BEGIN
            SET NOCOUNT ON;

            BEGIN TRY
                -- Insert into Categories table
                INSERT INTO Categories (
                    id,
                    store_id,
                    name,
                    description,
                    parent_id,
                    created_at,
                    updated_at
                )
                VALUES (
                    @id,
                    @storeId,
                    @name,
                    @description,
                    @parentId,
                    GETDATE(),
                    GETDATE()
                );

                -- Return the created category
                SELECT
                    id,
                    store_id AS storeId,
                    name,
                    description,
                    parent_id AS parentId,
                    created_at AS createdAt,
                    updated_at AS updatedAt
                FROM Categories
                WHERE id = @id AND store_id = @storeId;

            END TRY
            BEGIN CATCH
                THROW;
            END CATCH
        END
      `);
            console.log('sp_Categories_Create created successfully');
        }
        // If sp_Categories_GetByStore doesn't exist, create it
        if (!spExists.recordset.some((r) => r.name === 'sp_Categories_GetByStore')) {
            console.log('\nsp_Categories_GetByStore does not exist. Creating...');
            await pool.request().query(`
        CREATE PROCEDURE sp_Categories_GetByStore
            @storeId NVARCHAR(36)
        AS
        BEGIN
            SET NOCOUNT ON;

            SELECT
                id,
                store_id AS storeId,
                name,
                description,
                parent_id AS parentId,
                created_at AS createdAt,
                updated_at AS updatedAt
            FROM Categories
            WHERE store_id = @storeId
            ORDER BY name;
        END
      `);
            console.log('sp_Categories_GetByStore created successfully');
        }
        // Test creating a category
        console.log('\n=== Testing category creation ===');
        const pokemonStore = '795393B0-343C-4B90-B734-C4368311C7EB';
        const testId = require('crypto').randomUUID(); // Use proper UUID
        try {
            const result = await pool.request()
                .input('id', mssql_1.default.UniqueIdentifier, testId)
                .input('storeId', mssql_1.default.UniqueIdentifier, pokemonStore)
                .input('name', mssql_1.default.NVarChar, 'Test Category')
                .input('description', mssql_1.default.NVarChar, 'Test description')
                .input('parentId', mssql_1.default.UniqueIdentifier, null)
                .execute('sp_Categories_Create');
            console.log('Test result:', result.recordset);
            // Delete test category
            await pool.request()
                .input('testId', mssql_1.default.UniqueIdentifier, testId)
                .query(`DELETE FROM Categories WHERE id = @testId`);
            console.log('Test category deleted');
        }
        catch (e) {
            console.error('Test failed:', e.message);
        }
        await pool.close();
        console.log('\nDone!');
    }
    catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
checkCategories();
//# sourceMappingURL=check-categories.js.map