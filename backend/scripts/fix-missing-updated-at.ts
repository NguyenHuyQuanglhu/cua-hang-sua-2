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

async function fixMissingUpdatedAt() {
  try {
    await sql.connect(config);
    console.log('Connected to database');

    // Update all records where updated_at is NULL
    const result = await sql.query`
      UPDATE PurchaseOrders 
      SET updated_at = created_at 
      WHERE updated_at IS NULL
    `;

    console.log('Updated records:', result.rowsAffected[0]);

    // Verify
    const check = await sql.query`
      SELECT COUNT(*) as count 
      FROM PurchaseOrders 
      WHERE updated_at IS NULL
    `;

    console.log('Remaining NULL updated_at:', check.recordset[0].count);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

fixMissingUpdatedAt();
