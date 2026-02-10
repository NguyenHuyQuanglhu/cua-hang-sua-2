"use strict";
/**
 * Script to fix sales status values and check cash transactions
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
async function checkCashTransactions() {
    try {
        console.log('Connecting to database...');
        const pool = await mssql_1.default.connect(config);
        // Check if CashTransactions table exists
        console.log('\n=== Checking CashTransactions table ===');
        const tableExists = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'CashTransactions'
    `);
        if (tableExists.recordset.length === 0) {
            console.log('CashTransactions table does NOT exist!');
            // Create the table
            console.log('\nCreating CashTransactions table...');
            await pool.request().query(`
        CREATE TABLE CashTransactions (
          id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
          store_id NVARCHAR(36) NOT NULL,
          type NVARCHAR(10) NOT NULL CHECK (type IN ('thu', 'chi')),
          transaction_date DATETIME NOT NULL DEFAULT GETDATE(),
          amount DECIMAL(18,2) NOT NULL,
          reason NVARCHAR(500) NOT NULL,
          category NVARCHAR(100),
          related_invoice_id NVARCHAR(36),
          created_by NVARCHAR(36),
          created_at DATETIME NOT NULL DEFAULT GETDATE()
        )
      `);
            console.log('CashTransactions table created!');
            // Create sample data for Pokemon store
            console.log('\nCreating sample cash transactions...');
            const storeId = '795393B0-343C-4B90-B734-C4368311C7EB'; // Pokemon store
            const sampleTransactions = [
                { type: 'thu', amount: 5000000, reason: 'Doanh thu bán hàng ngày 20/01', category: 'Bán hàng' },
                { type: 'thu', amount: 2500000, reason: 'Doanh thu bán hàng ngày 21/01', category: 'Bán hàng' },
                { type: 'chi', amount: 1000000, reason: 'Nhập hàng Pokemon cards', category: 'Nhập hàng' },
                { type: 'chi', amount: 500000, reason: 'Tiền điện tháng 1', category: 'Chi phí vận hành' },
                { type: 'chi', amount: 200000, reason: 'Mua văn phòng phẩm', category: 'Chi phí khác' },
                { type: 'thu', amount: 3000000, reason: 'Doanh thu bán hàng ngày 22/01', category: 'Bán hàng' },
                { type: 'chi', amount: 800000, reason: 'Tiền internet tháng 1', category: 'Chi phí vận hành' },
            ];
            for (const tx of sampleTransactions) {
                await pool.request()
                    .input('storeId', mssql_1.default.NVarChar, storeId)
                    .input('type', mssql_1.default.NVarChar, tx.type)
                    .input('amount', mssql_1.default.Decimal(18, 2), tx.amount)
                    .input('reason', mssql_1.default.NVarChar, tx.reason)
                    .input('category', mssql_1.default.NVarChar, tx.category)
                    .query(`
            INSERT INTO CashTransactions (id, store_id, type, transaction_date, amount, reason, category, created_at)
            VALUES (NEWID(), @storeId, @type, GETDATE(), @amount, @reason, @category, GETDATE())
          `);
            }
            console.log(`Created ${sampleTransactions.length} sample transactions`);
        }
        else {
            console.log('CashTransactions table exists');
            // Check data count
            const countResult = await pool.request().query(`
        SELECT COUNT(*) as count FROM CashTransactions
      `);
            console.log(`Total records: ${countResult.recordset[0].count}`);
            // Check by store
            const storeCount = await pool.request().query(`
        SELECT store_id, COUNT(*) as count
        FROM CashTransactions
        GROUP BY store_id
      `);
            console.log('\nRecords by store:');
            storeCount.recordset.forEach((row) => {
                console.log(`  Store ${row.store_id}: ${row.count} records`);
            });
            // Check for Pokemon store specifically
            const pokemonStore = '795393B0-343C-4B90-B734-C4368311C7EB';
            const pokemonCount = await pool.request()
                .input('storeId', mssql_1.default.NVarChar, pokemonStore)
                .query(`
          SELECT COUNT(*) as count FROM CashTransactions WHERE store_id = @storeId
        `);
            console.log(`\nPokemon store (${pokemonStore}): ${pokemonCount.recordset[0].count} records`);
            if (pokemonCount.recordset[0].count === 0) {
                console.log('\nNo data for Pokemon store. Creating sample data...');
                const sampleTransactions = [
                    { type: 'thu', amount: 5000000, reason: 'Doanh thu bán hàng ngày 20/01', category: 'Bán hàng' },
                    { type: 'thu', amount: 2500000, reason: 'Doanh thu bán hàng ngày 21/01', category: 'Bán hàng' },
                    { type: 'chi', amount: 1000000, reason: 'Nhập hàng Pokemon cards', category: 'Nhập hàng' },
                    { type: 'chi', amount: 500000, reason: 'Tiền điện tháng 1', category: 'Chi phí vận hành' },
                    { type: 'chi', amount: 200000, reason: 'Mua văn phòng phẩm', category: 'Chi phí khác' },
                    { type: 'thu', amount: 3000000, reason: 'Doanh thu bán hàng ngày 22/01', category: 'Bán hàng' },
                    { type: 'chi', amount: 800000, reason: 'Tiền internet tháng 1', category: 'Chi phí vận hành' },
                ];
                for (const tx of sampleTransactions) {
                    await pool.request()
                        .input('storeId', mssql_1.default.NVarChar, pokemonStore)
                        .input('type', mssql_1.default.NVarChar, tx.type)
                        .input('amount', mssql_1.default.Decimal(18, 2), tx.amount)
                        .input('reason', mssql_1.default.NVarChar, tx.reason)
                        .input('category', mssql_1.default.NVarChar, tx.category)
                        .query(`
              INSERT INTO CashTransactions (id, store_id, type, transaction_date, amount, reason, category, created_at)
              VALUES (NEWID(), @storeId, @type, GETDATE(), @amount, @reason, @category, GETDATE())
            `);
                }
                console.log(`Created ${sampleTransactions.length} sample transactions for Pokemon store`);
            }
        }
        await pool.close();
        console.log('\nDone!');
    }
    catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
checkCashTransactions();
//# sourceMappingURL=fix-sales-status.js.map