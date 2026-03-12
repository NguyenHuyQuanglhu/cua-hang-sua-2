/**
 * Script to add sample sales data for testing forecast feature
 * Creates sales transactions for the past 30 days with varying quantities
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

async function addSampleSalesForForecast() {
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

    // Get products with stock
    const productsResult = await pool.request()
      .input('storeId', sql.UniqueIdentifier, storeId)
      .query(`
        SELECT TOP 10 p.id, p.name, p.unit_id, p.price
        FROM Products p
        WHERE p.store_id = @storeId
        ORDER BY p.name
      `);

    if (productsResult.recordset.length === 0) {
      console.log('No products found!');
      return;
    }

    console.log(`Found ${productsResult.recordset.length} products`);

    // Generate sales for the past 30 days
    const today = new Date();
    const salesData: Array<{
      date: Date;
      productId: string;
      productName: string;
      quantity: number;
      price: number;
    }> = [];

    // Create varying sales patterns for each product
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const saleDate = new Date(today);
      saleDate.setDate(saleDate.getDate() - dayOffset);
      saleDate.setHours(10 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);

      // Randomly select 2-5 products to sell each day
      const numProductsToSell = 2 + Math.floor(Math.random() * 4);
      const shuffledProducts = [...productsResult.recordset].sort(() => Math.random() - 0.5);

      for (let i = 0; i < numProductsToSell && i < shuffledProducts.length; i++) {
        const product = shuffledProducts[i];
        
        // Generate quantity with some variation
        // More sales in recent days, less in older days
        const recencyFactor = 1 - (dayOffset / 60); // Decreases as we go back in time
        const baseQuantity = 5 + Math.floor(Math.random() * 15); // 5-20 units
        const quantity = Math.max(1, Math.floor(baseQuantity * recencyFactor));

        salesData.push({
          date: saleDate,
          productId: product.id,
          productName: product.name,
          quantity,
          price: product.price || 10000,
        });
      }
    }

    console.log(`Generated ${salesData.length} sale items across 30 days`);

    // Group sales by date to create transactions
    const salesByDate = new Map<string, typeof salesData>();
    salesData.forEach(sale => {
      const dateKey = sale.date.toISOString();
      if (!salesByDate.has(dateKey)) {
        salesByDate.set(dateKey, []);
      }
      salesByDate.get(dateKey)!.push(sale);
    });

    console.log(`Creating ${salesByDate.size} sales transactions...`);

    let transactionCount = 0;
    let itemCount = 0;

    for (const [dateKey, items] of salesByDate.entries()) {
      const saleDate = new Date(dateKey);
      const saleId = uuidv4();
      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

      // Create sale transaction
      await pool!.request()
        .input('id', sql.UniqueIdentifier, saleId)
        .input('storeId', sql.UniqueIdentifier, storeId)
        .input('invoiceNumber', sql.NVarChar(50), `INV-${Date.now()}-${transactionCount}`)
        .input('transactionDate', sql.DateTime, saleDate)
        .input('totalAmount', sql.Decimal(18, 2), totalAmount)
        .input('finalAmount', sql.Decimal(18, 2), totalAmount)
        .input('status', sql.NVarChar(50), 'completed')
        .input('createdAt', sql.DateTime, saleDate)
        .query(`
          INSERT INTO Sales (
            id, store_id, invoice_number, transaction_date, total_amount,
            final_amount, status, created_at, updated_at
          ) VALUES (
            @id, @storeId, @invoiceNumber, @transactionDate, @totalAmount,
            @finalAmount, @status, @createdAt, @createdAt
          )
        `);

      // Create sale items
      for (const item of items) {
        const itemId = uuidv4();
        await pool!.request()
          .input('id', sql.UniqueIdentifier, itemId)
          .input('salesTransactionId', sql.UniqueIdentifier, saleId)
          .input('productId', sql.UniqueIdentifier, item.productId)
          .input('quantity', sql.Decimal(18, 4), item.quantity)
          .input('price', sql.Decimal(18, 2), item.price)
          .query(`
            INSERT INTO SalesItems (
              id, sales_transaction_id, product_id, quantity, price
            ) VALUES (
              @id, @salesTransactionId, @productId, @quantity, @price
            )
          `);
        
        itemCount++;
      }

      transactionCount++;
      if (transactionCount % 5 === 0) {
        console.log(`Created ${transactionCount} transactions with ${itemCount} items...`);
      }
    }

    console.log('\n✅ Sample sales data added successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Transactions: ${transactionCount}`);
    console.log(`   - Items sold: ${itemCount}`);
    console.log(`   - Products: ${productsResult.recordset.length}`);
    console.log(`   - Date range: ${new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000).toLocaleDateString()} - ${today.toLocaleDateString()}`);
    console.log('\n💡 Now you can test the forecast feature in the Products page!');

  } catch (error) {
    console.error('Error adding sample sales:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('Database connection closed.');
    }
  }
}

// Run the script
addSampleSalesForForecast()
  .then(() => {
    console.log('Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
