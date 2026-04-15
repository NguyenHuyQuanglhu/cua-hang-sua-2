"use strict";
/**
 * Script to update sp_Sales_UpdateStatus stored procedure
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
async function updateStoredProcedure() {
    try {
        console.log('Connecting to database...');
        const pool = await mssql_1.default.connect(config);
        // Drop existing procedure
        console.log('\n=== Dropping existing sp_Sales_UpdateStatus ===');
        try {
            await pool.request().query(`
        IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Sales_UpdateStatus')
          DROP PROCEDURE sp_Sales_UpdateStatus
      `);
            console.log('Dropped existing procedure');
        }
        catch (e) {
            console.log('No existing procedure to drop');
        }
        // Create new procedure with snake_case column names
        console.log('\n=== Creating sp_Sales_UpdateStatus with snake_case columns ===');
        await pool.request().query(`
      CREATE PROCEDURE sp_Sales_UpdateStatus
          @id NVARCHAR(36),
          @storeId NVARCHAR(36),
          @status NVARCHAR(20),
          @customerPayment DECIMAL(18,2) = NULL,
          @remainingDebt DECIMAL(18,2) = NULL
      AS
      BEGIN
          SET NOCOUNT ON;

          -- Check if sale exists (using snake_case column names)
          IF NOT EXISTS (SELECT 1 FROM Sales WHERE id = @id AND store_id = @storeId)
          BEGIN
              RAISERROR('Sale not found', 16, 1);
              RETURN;
          END

          -- Update sale status and optional fields
          UPDATE Sales SET
              status = @status,
              customer_payment = COALESCE(@customerPayment, customer_payment),
              remaining_debt = COALESCE(@remainingDebt, remaining_debt),
              updated_at = GETDATE()
          WHERE id = @id AND store_id = @storeId;

          -- Return affected rows count and updated sale
          SELECT
              @@ROWCOUNT AS affectedRows,
              s.id AS id,
              s.store_id AS storeId,
              s.invoice_number AS invoiceNumber,
              s.status AS status,
              s.customer_payment AS customerPayment,
              s.remaining_debt AS remainingDebt,
              s.updated_at AS updatedAt
          FROM Sales s
          WHERE s.id = @id AND s.store_id = @storeId;
      END
    `);
        console.log('Created new procedure');
        // Test the procedure
        console.log('\n=== Testing procedure ===');
        const pokemonStore = '795393B0-343C-4B90-B734-C4368311C7EB';
        // Get a sample sale ID
        const sampleSale = await pool.request()
            .input('storeId', mssql_1.default.NVarChar, pokemonStore)
            .query(`
        SELECT TOP 1 id, status FROM Sales WHERE store_id = @storeId
      `);
        if (sampleSale.recordset.length > 0) {
            const saleId = sampleSale.recordset[0].id;
            const currentStatus = sampleSale.recordset[0].status;
            console.log(`Testing with sale ID: ${saleId}, current status: ${currentStatus}`);
            // Try updating to 'printed'
            const testResult = await pool.request()
                .input('id', mssql_1.default.NVarChar, saleId)
                .input('storeId', mssql_1.default.NVarChar, pokemonStore)
                .input('status', mssql_1.default.NVarChar, 'printed')
                .execute('sp_Sales_UpdateStatus');
            console.log('Test result:', testResult.recordset);
            // Restore original status
            await pool.request()
                .input('id', mssql_1.default.NVarChar, saleId)
                .input('storeId', mssql_1.default.NVarChar, pokemonStore)
                .input('status', mssql_1.default.NVarChar, currentStatus)
                .execute('sp_Sales_UpdateStatus');
            console.log(`Restored status to: ${currentStatus}`);
        }
        else {
            console.log('No sales found for testing');
        }
        await pool.close();
        console.log('\nDone!');
    }
    catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
updateStoredProcedure();
//# sourceMappingURL=update-sp-sales-status.js.map