"use strict";
/**
 * Script to fix negative inventory quantities
 * Sets all negative quantities to 0
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
async function fixNegativeInventory() {
    try {
        console.log('Connecting to database...');
        const pool = await mssql_1.default.connect(config);
        // Find all products with negative inventory
        console.log('\n=== Finding products with negative inventory ===');
        const negativeInventory = await pool.request()
            .query(`
        SELECT 
          p.id,
          p.name,
          p.store_id,
          pi.Quantity as current_quantity,
          s.name as store_name
        FROM Products p
        LEFT JOIN ProductInventory pi ON p.id = pi.ProductId
        LEFT JOIN Stores s ON p.store_id = s.id
        WHERE pi.Quantity < 0
        ORDER BY pi.Quantity ASC
      `);
        if (negativeInventory.recordset.length === 0) {
            console.log('✓ No negative inventory found!');
            await pool.close();
            return;
        }
        console.log(`Found ${negativeInventory.recordset.length} products with negative inventory:`);
        negativeInventory.recordset.forEach((row) => {
            console.log(`  - ${row.name} (${row.store_name}): ${row.current_quantity}`);
        });
        // Fix negative inventory by setting to 0
        console.log('\n=== Fixing negative inventory ===');
        const result = await pool.request()
            .query(`
        UPDATE ProductInventory
        SET Quantity = 0, UpdatedAt = GETDATE()
        WHERE Quantity < 0
      `);
        console.log(`✓ Fixed ${result.rowsAffected[0]} inventory records`);
        // Verify fix
        console.log('\n=== Verifying fix ===');
        const verifyNegative = await pool.request()
            .query(`
        SELECT COUNT(*) as count
        FROM ProductInventory
        WHERE Quantity < 0
      `);
        if (verifyNegative.recordset[0].count === 0) {
            console.log('✓ All negative inventory has been fixed!');
        }
        else {
            console.log(`⚠ Still have ${verifyNegative.recordset[0].count} negative records`);
        }
        // Show summary of all inventory
        console.log('\n=== Inventory Summary ===');
        const summary = await pool.request()
            .query(`
        SELECT 
          s.name as store_name,
          COUNT(DISTINCT p.id) as total_products,
          COUNT(pi.Id) as products_with_inventory,
          SUM(CASE WHEN pi.Quantity = 0 THEN 1 ELSE 0 END) as zero_stock,
          SUM(CASE WHEN pi.Quantity > 0 AND pi.Quantity <= 5 THEN 1 ELSE 0 END) as low_stock,
          SUM(CASE WHEN pi.Quantity > 5 THEN 1 ELSE 0 END) as in_stock
        FROM Stores s
        LEFT JOIN Products p ON s.id = p.store_id
        LEFT JOIN ProductInventory pi ON p.id = pi.ProductId
        WHERE p.status = 'active'
        GROUP BY s.name
      `);
        console.log('\nInventory by store:');
        summary.recordset.forEach((row) => {
            console.log(`\n${row.store_name}:`);
            console.log(`  Total products: ${row.total_products}`);
            console.log(`  With inventory: ${row.products_with_inventory}`);
            console.log(`  Zero stock: ${row.zero_stock}`);
            console.log(`  Low stock (1-5): ${row.low_stock}`);
            console.log(`  In stock (>5): ${row.in_stock}`);
        });
        await pool.close();
        console.log('\n✓ Done!');
    }
    catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
fixNegativeInventory();
//# sourceMappingURL=fix-negative-inventory.js.map