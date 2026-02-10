"use strict";
/**
 * Script to fix sp_Categories_Create to handle UUID conversion
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
async function fixCategoriesSP() {
    try {
        console.log('Connecting to database...');
        const pool = await mssql_1.default.connect(config);
        // Drop and recreate sp_Categories_Create with CONVERT
        console.log('\n=== Updating sp_Categories_Create ===');
        await pool.request().query(`
      IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Categories_Create')
        DROP PROCEDURE sp_Categories_Create
    `);
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
              -- Insert into Categories table with CONVERT for uniqueidentifier columns
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
                  CONVERT(uniqueidentifier, @id),
                  CONVERT(uniqueidentifier, @storeId),
                  @name,
                  @description,
                  CASE WHEN @parentId IS NOT NULL THEN CONVERT(uniqueidentifier, @parentId) ELSE NULL END,
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
              WHERE id = CONVERT(uniqueidentifier, @id) AND store_id = CONVERT(uniqueidentifier, @storeId);

          END TRY
          BEGIN CATCH
              THROW;
          END CATCH
      END
    `);
        console.log('sp_Categories_Create updated');
        // Also update sp_Categories_GetByStore
        console.log('\n=== Updating sp_Categories_GetByStore ===');
        await pool.request().query(`
      IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Categories_GetByStore')
        DROP PROCEDURE sp_Categories_GetByStore
    `);
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
          WHERE store_id = CONVERT(uniqueidentifier, @storeId)
          ORDER BY name;
      END
    `);
        console.log('sp_Categories_GetByStore updated');
        // Update sp_Categories_Update
        console.log('\n=== Updating sp_Categories_Update ===');
        await pool.request().query(`
      IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Categories_Update')
        DROP PROCEDURE sp_Categories_Update
    `);
        await pool.request().query(`
      CREATE PROCEDURE sp_Categories_Update
          @id NVARCHAR(36),
          @storeId NVARCHAR(36),
          @name NVARCHAR(255) = NULL,
          @description NVARCHAR(500) = NULL,
          @parentId NVARCHAR(36) = NULL
      AS
      BEGIN
          SET NOCOUNT ON;

          UPDATE Categories SET
              name = COALESCE(@name, name),
              description = COALESCE(@description, description),
              parent_id = CASE WHEN @parentId IS NOT NULL THEN CONVERT(uniqueidentifier, @parentId) ELSE parent_id END,
              updated_at = GETDATE()
          WHERE id = CONVERT(uniqueidentifier, @id) AND store_id = CONVERT(uniqueidentifier, @storeId);

          SELECT @@ROWCOUNT AS AffectedRows;
      END
    `);
        console.log('sp_Categories_Update updated');
        // Update sp_Categories_Delete
        console.log('\n=== Updating sp_Categories_Delete ===');
        await pool.request().query(`
      IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Categories_Delete')
        DROP PROCEDURE sp_Categories_Delete
    `);
        await pool.request().query(`
      CREATE PROCEDURE sp_Categories_Delete
          @id NVARCHAR(36),
          @storeId NVARCHAR(36)
      AS
      BEGIN
          SET NOCOUNT ON;

          DELETE FROM Categories
          WHERE id = CONVERT(uniqueidentifier, @id) AND store_id = CONVERT(uniqueidentifier, @storeId);

          SELECT @@ROWCOUNT AS AffectedRows;
      END
    `);
        console.log('sp_Categories_Delete updated');
        // Test
        console.log('\n=== Testing updated procedures ===');
        const pokemonStore = '795393B0-343C-4B90-B734-C4368311C7EB';
        const testId = require('crypto').randomUUID();
        try {
            const result = await pool.request()
                .input('id', mssql_1.default.NVarChar, testId)
                .input('storeId', mssql_1.default.NVarChar, pokemonStore)
                .input('name', mssql_1.default.NVarChar, 'Test Category After Fix')
                .input('description', mssql_1.default.NVarChar, 'Test description')
                .input('parentId', mssql_1.default.NVarChar, null)
                .execute('sp_Categories_Create');
            console.log('Test result:', result.recordset);
            // Delete test category
            await pool.request()
                .input('id', mssql_1.default.NVarChar, testId)
                .input('storeId', mssql_1.default.NVarChar, pokemonStore)
                .execute('sp_Categories_Delete');
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
fixCategoriesSP();
//# sourceMappingURL=fix-categories-sp.js.map