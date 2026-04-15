"use strict";
/**
 * Script to check Sales table structure
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
async function checkSalesTable() {
    try {
        console.log('Connecting to database...');
        const pool = await mssql_1.default.connect(config);
        // Check Sales table structure
        console.log('\n=== Checking Sales table structure ===');
        const columns = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Sales'
      ORDER BY ORDINAL_POSITION
    `);
        console.log('Sales columns:');
        columns.recordset.forEach((row) => {
            console.log(`  ${row.COLUMN_NAME} (${row.DATA_TYPE})`);
        });
        // Check sample sales data
        console.log('\n=== Sample sales for Pokemon store ===');
        const pokemonStore = '795393B0-343C-4B90-B734-C4368311C7EB';
        const samples = await pool.request()
            .input('storeId', mssql_1.default.NVarChar, pokemonStore)
            .query(`
        SELECT TOP 5 id, invoice_number, status, store_id
        FROM Sales
        WHERE store_id = @storeId
        ORDER BY transaction_date DESC
      `);
        console.log('Sample records:');
        samples.recordset.forEach((row) => {
            console.log(`  ID: ${row.id}, Invoice: ${row.invoice_number}, Status: ${row.status}`);
        });
        await pool.close();
        console.log('\nDone!');
    }
    catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
checkSalesTable();
//# sourceMappingURL=check-sales-table.js.map