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

async function allowNullSupplier() {
  try {
    await sql.connect(config);
    console.log('🔧 Modifying SupplierPayments table to allow NULL supplier_id...\n');

    // Modify supplier_id to allow NULL
    await sql.query`
      ALTER TABLE SupplierPayments 
      ALTER COLUMN supplier_id UNIQUEIDENTIFIER NULL
    `;

    console.log('✅ Successfully modified SupplierPayments table!');
    console.log('Now you can create payments for purchase orders without supplier.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.close();
  }
}

allowNullSupplier();
