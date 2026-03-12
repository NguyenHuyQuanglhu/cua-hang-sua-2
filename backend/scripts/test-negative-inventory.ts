/**
 * Script to create negative inventory scenarios for testing
 * Creates sales that exceed current inventory to test negative inventory handling
 */

import sql from 'mssql';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'CuaHangSua',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  port: parseInt(process.env.DB_PORT || '1433'),
};

async function createNegativeInventoryScenarios() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully!');

    // Get first store
    const storeResult = await pool.request().query(`
      SELECT TOP 1 id FROM Stores WHERE status = 'active'
    `);

    if (storeResult.recordset.length === 0) {
      console.log('No active store found!');
      return;
    }

    const storeId = storeResult.recordset[0].id;
    console.log('Using store:', storeId);

    // Get first user (salesperson)
    const userResult = await pool.request().query(`
      SELECT TOP 1 id FROM Users WHERE status = 'active'
    `);

    if (userResult.recordset.length === 0) {
      console.log('No active user found!');
      return;
    }

    const userId = userResult.recordset[0].id;
    console.log('Using user:', userId);

    // Get products with low stock to create negative inventory
    const productsResult = await pool.request()
      .input('storeId', sql.UniqueIdentifier, storeId)
      .query(`
        SELECT TOP 5 p.id, p.name, p.unit_id, p.price,
               COALESCE(SUM(pl.quantity), 0) as total_imported,
               COALESCE(SUM(si.quantity), 0) as total_sold
        FROM Products p
        LEFT JOIN PurchaseLots pl ON p.id = pl.product_id
        LEFT JOIN SalesItems si ON p.id = si.product_id
        WHERE p.store_id = @storeId AND p.status = 'active'
        GROUP BY p.id, p.name, p.unit_id, p.price
        HAVING COALESCE(SUM(pl.quantity), 0) - COALESCE(SUM(si.quantity), 0) <= 10
        ORDER BY (COALESCE(SUM(pl.quantity), 0) - COALESCE(SUM(si.quantity), 0)) ASC
      `);

    if (productsResult.recordset.length === 0) {
      console.log('No products with low stock found! Creating sales for random products...');
      
      // If no low stock products, get any products
      const fallbackProducts = await pool.request()
        .input('storeId', sql.UniqueIdentifier, storeId)
        .query(`
          SELECT TOP 5 p.id, p.name, p.unit_id, p.price,
                 COALESCE(SUM(pl.quantity), 0) as total_imported,
                 COALESCE(SUM(si.quantity), 0) as total_sold
          FROM Products p
          LEFT JOIN PurchaseLots pl ON p.id = pl.product_id
          LEFT JOIN SalesItems si ON p.id = si.product_id
          WHERE p.store_id = @storeId AND p.status = 'active'
          GROUP BY p.id, p.name, p.unit_id, p.price
          ORDER BY NEWID()
        `);

      if (fallbackProducts.recordset.length === 0) {
        console.log('No products found at all!');
        return;
      }

      productsResult.recordset = fallbackProducts.recordset;
    }

    console.log(`Found ${productsResult.recordset.length} products to create negative inventory`);

    // Create excessive sales to create negative inventory
    const today = new Date();
    let transactionCount = 0;

    for (const product of productsResult.recordset) {
      const currentStock = (product.total_imported || 0) - (product.total_sold || 0);
      const excessQuantity = Math.max(20, currentStock + 50); // Sell enough to create negative inventory

      console.log(`\nProduct: ${product.name}`);
      console.log(`Current stock: ${currentStock}`);
      console.log(`Will sell: ${excessQuantity} units`);

      // Create a large sale transaction
      const saleId = uuidv4();
      const totalAmount = excessQuantity * (product.price || 10000);

      await pool.request()
        .input('id', sql.UniqueIdentifier, saleId)
        .input('storeId', sql.UniqueIdentifier, storeId)
        .input('invoiceNumber', sql.NVarChar(50), `NEG-TEST-${Date.now()}-${transactionCount}`)
        .input('transactionDate', sql.DateTime, today)
        .input('totalAmount', sql.Decimal(18, 2), totalAmount)
        .input('finalAmount', sql.Decimal(18, 2), totalAmount)
        .input('status', sql.NVarChar(50), 'completed')
        .input('createdAt', sql.DateTime, today)
        .query(`
          INSERT INTO Sales (
            id, store_id, invoice_number, transaction_date, total_amount,
            final_amount, status, created_at, updated_at
          ) VALUES (
            @id, @storeId, @invoiceNumber, @transactionDate, @totalAmount,
            @finalAmount, @status, @createdAt, @createdAt
          )
        `);

      // Create sale item
      const itemId = uuidv4();
      await pool.request()
        .input('id', sql.UniqueIdentifier, itemId)
        .input('salesTransactionId', sql.UniqueIdentifier, saleId)
        .input('productId', sql.UniqueIdentifier, product.id)
        .input('quantity', sql.Decimal(18, 4), excessQuantity)
        .input('price', sql.Decimal(18, 2), product.price || 10000)
        .query(`
          INSERT INTO SalesItems (
            id, sales_transaction_id, product_id, quantity, price
          ) VALUES (
            @id, @salesTransactionId, @productId, @quantity, @price
          )
        `);

      transactionCount++;
      console.log(`✅ Created negative inventory for ${product.name}`);
    }

    console.log('\n✅ Negative inventory scenarios created successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Transactions: ${transactionCount}`);
    console.log(`   - Products with negative inventory: ${productsResult.recordset.length}`);
    console.log('\n💡 Now you can test the AI forecast feature with negative inventory!');
    console.log('   Go to Products page → Click "Dự báo & Đề xuất" → "Chạy lại phân tích"');

  } catch (error) {
    console.error('Error creating negative inventory scenarios:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('Database connection closed.');
    }
  }
}

// Run script
createNegativeInventoryScenarios()
  .then(() => {
    console.log('Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
