"use strict";
/**
 * Script to check and fix inventory for Pokemon store
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
async function fixInventory() {
    try {
        console.log('Connecting to database...');
        const pool = await mssql_1.default.connect(config);
        const pokemonStore = '795393B0-343C-4B90-B734-C4368311C7EB';
        // Get default unit for the store (base unit like "Lá" or first unit)
        console.log('\n=== Getting default unit for Pokemon store ===');
        const defaultUnit = await pool.request()
            .input('storeId', mssql_1.default.NVarChar, pokemonStore)
            .query(`
        SELECT TOP 1 id, name FROM Units
        WHERE store_id = @storeId
        ORDER BY name
      `);
        if (defaultUnit.recordset.length === 0) {
            console.log('No units found for Pokemon store!');
            await pool.close();
            return;
        }
        const unitId = defaultUnit.recordset[0].id;
        console.log(`Using default unit: ${defaultUnit.recordset[0].name} (${unitId})`);
        // Check products with no or zero inventory
        console.log('\n=== Checking products with zero/no inventory ===');
        const zeroInventory = await pool.request()
            .input('storeId', mssql_1.default.NVarChar, pokemonStore)
            .query(`
        SELECT p.id, p.name, ISNULL(pi.Quantity, 0) as quantity
        FROM Products p
        LEFT JOIN ProductInventory pi ON p.id = pi.ProductId AND pi.StoreId = @storeId
        WHERE p.store_id = @storeId
        AND (pi.Quantity IS NULL OR pi.Quantity <= 0)
      `);
        console.log(`Found ${zeroInventory.recordset.length} products with zero/no inventory:`);
        // Add inventory for products that have none
        console.log('\n=== Adding inventory for products with zero stock ===');
        for (const product of zeroInventory.recordset) {
            // Check if inventory record exists
            const existingInventory = await pool.request()
                .input('productId', mssql_1.default.NVarChar, product.id)
                .input('storeId', mssql_1.default.NVarChar, pokemonStore)
                .query(`
          SELECT Id FROM ProductInventory
          WHERE ProductId = @productId AND StoreId = @storeId
        `);
            const randomQty = Math.floor(Math.random() * 50) + 10; // 10-60 units
            if (existingInventory.recordset.length > 0) {
                // Update existing record
                await pool.request()
                    .input('productId', mssql_1.default.NVarChar, product.id)
                    .input('storeId', mssql_1.default.NVarChar, pokemonStore)
                    .input('quantity', mssql_1.default.Decimal(18, 2), randomQty)
                    .query(`
            UPDATE ProductInventory
            SET Quantity = @quantity, UpdatedAt = GETDATE()
            WHERE ProductId = @productId AND StoreId = @storeId
          `);
                console.log(`  Updated ${product.name}: ${randomQty} units`);
            }
            else {
                // Insert new record with UnitId
                await pool.request()
                    .input('productId', mssql_1.default.NVarChar, product.id)
                    .input('storeId', mssql_1.default.NVarChar, pokemonStore)
                    .input('unitId', mssql_1.default.NVarChar, unitId)
                    .input('quantity', mssql_1.default.Decimal(18, 2), randomQty)
                    .query(`
            INSERT INTO ProductInventory (Id, ProductId, StoreId, UnitId, Quantity, CreatedAt, UpdatedAt)
            VALUES (NEWID(), @productId, @storeId, @unitId, @quantity, GETDATE(), GETDATE())
          `);
                console.log(`  Created ${product.name}: ${randomQty} units`);
            }
        }
        // Verify final state
        console.log('\n=== Final inventory state ===');
        const finalInventory = await pool.request()
            .input('storeId', mssql_1.default.NVarChar, pokemonStore)
            .query(`
        SELECT p.name, ISNULL(pi.Quantity, 0) as quantity
        FROM Products p
        LEFT JOIN ProductInventory pi ON p.id = pi.ProductId AND pi.StoreId = @storeId
        WHERE p.store_id = @storeId
        ORDER BY p.name
      `);
        console.log('Product inventory:');
        finalInventory.recordset.forEach((row) => {
            console.log(`  ${row.name}: ${row.quantity} units`);
        });
        await pool.close();
        console.log('\nDone!');
    }
    catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
fixInventory();
//# sourceMappingURL=fix-inventory.js.map