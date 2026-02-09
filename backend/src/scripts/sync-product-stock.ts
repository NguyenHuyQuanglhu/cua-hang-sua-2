/**
 * Script to sync Products.stock_quantity from ProductInventory
 */

import sql from 'mssql';

const config: sql.config = {
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

async function syncStock() {
  try {
    console.log('Connecting to database...');
    const pool = await sql.connect(config);

    // Find products with mismatched stock
    console.log('\n=== Finding products with mismatched stock ===');
    const mismatched = await pool.request()
      .query(`
        SELECT 
          p.id,
          p.name,
          p.stock_quantity as old_stock,
          ISNULL((
            SELECT SUM(
              CASE 
                WHEN u.base_unit_id IS NULL THEN pi.Quantity
                ELSE pi.Quantity * ISNULL(u.conversion_factor, 1)
              END
            )
            FROM ProductInventory pi
            LEFT JOIN Units u ON pi.UnitId = u.id
            WHERE pi.ProductId = p.id
          ), 0) as new_stock
        FROM Products p
        WHERE p.status = 'active'
        AND p.stock_quantity != ISNULL((
          SELECT SUM(
            CASE 
              WHEN u.base_unit_id IS NULL THEN pi.Quantity
              ELSE pi.Quantity * ISNULL(u.conversion_factor, 1)
            END
          )
          FROM ProductInventory pi
          LEFT JOIN Units u ON pi.UnitId = u.id
          WHERE pi.ProductId = p.id
        ), 0)
      `);

    console.log(`Found ${mismatched.recordset.length} products with mismatched stock:`);
    mismatched.recordset.forEach((p: any) => {
      console.log(`  - ${p.name}: ${p.old_stock} → ${p.new_stock}`);
    });

    if (mismatched.recordset.length === 0) {
      console.log('✓ All products are in sync!');
      await pool.close();
      return;
    }

    // Update stock_quantity for all products
    console.log('\n=== Syncing stock_quantity ===');
    const result = await pool.request()
      .query(`
        UPDATE p
        SET p.stock_quantity = ISNULL((
          SELECT SUM(
            CASE 
              WHEN u.base_unit_id IS NULL THEN pi.Quantity
              ELSE pi.Quantity * ISNULL(u.conversion_factor, 1)
            END
          )
          FROM ProductInventory pi
          LEFT JOIN Units u ON pi.UnitId = u.id
          WHERE pi.ProductId = p.id
        ), 0),
        p.updated_at = GETDATE()
        FROM Products p
        WHERE p.status = 'active'
      `);

    console.log(`✓ Updated ${result.rowsAffected[0]} products`);

    // Verify
    console.log('\n=== Verifying sync ===');
    const verify = await pool.request()
      .query(`
        SELECT COUNT(*) as count
        FROM Products p
        WHERE p.status = 'active'
        AND p.stock_quantity != ISNULL((
          SELECT SUM(
            CASE 
              WHEN u.base_unit_id IS NULL THEN pi.Quantity
              ELSE pi.Quantity * ISNULL(u.conversion_factor, 1)
            END
          )
          FROM ProductInventory pi
          LEFT JOIN Units u ON pi.UnitId = u.id
          WHERE pi.ProductId = p.id
        ), 0)
      `);

    if (verify.recordset[0].count === 0) {
      console.log('✓ All products are now in sync!');
    } else {
      console.log(`⚠ Still have ${verify.recordset[0].count} mismatched products`);
    }

    // Show summary
    console.log('\n=== Stock Summary ===');
    const summary = await pool.request()
      .query(`
        SELECT 
          COUNT(*) as total_products,
          SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) as zero_stock,
          SUM(CASE WHEN stock_quantity < 0 THEN 1 ELSE 0 END) as negative_stock,
          SUM(CASE WHEN stock_quantity > 0 AND stock_quantity <= 5 THEN 1 ELSE 0 END) as low_stock,
          SUM(CASE WHEN stock_quantity > 5 THEN 1 ELSE 0 END) as in_stock
        FROM Products
        WHERE status = 'active'
      `);

    const s = summary.recordset[0];
    console.log(`Total products: ${s.total_products}`);
    console.log(`Zero stock: ${s.zero_stock}`);
    console.log(`Negative stock: ${s.negative_stock}`);
    console.log(`Low stock (1-5): ${s.low_stock}`);
    console.log(`In stock (>5): ${s.in_stock}`);

    await pool.close();
    console.log('\n✓ Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

syncStock();
