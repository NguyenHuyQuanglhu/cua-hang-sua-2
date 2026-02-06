import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

async function checkPurchaseSupplierIds() {
  try {
    await sql.connect(config);
    console.log('Connected to database\n');

    // Check the purchase order that's being paid
    const result = await sql.query`
      SELECT 
        po.id,
        po.order_number,
        po.supplier_id,
        s.name as supplier_name
      FROM PurchaseOrders po
      LEFT JOIN Suppliers s ON po.supplier_id = s.id
      WHERE po.order_number = 'PN2026010024'
    `;

    console.log('=== Purchase Order PN2026010024 ===');
    if (result.recordset.length > 0) {
      const po = result.recordset[0];
      console.log('ID:', po.id);
      console.log('Order Number:', po.order_number);
      console.log('Supplier ID:', po.supplier_id);
      console.log('Supplier Name:', po.supplier_name);
      console.log('\nSupplier ID is NULL?', po.supplier_id === null);
    } else {
      console.log('Purchase order not found!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

checkPurchaseSupplierIds();
