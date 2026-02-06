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

async function addDefaultUpdatedAt() {
  try {
    await sql.connect(config);
    console.log('🔧 Adding default value for updated_at column...\n');

    // Check if updated_at has default value
    const checkDefault = await sql.query`
      SELECT COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'PurchaseOrders' AND COLUMN_NAME = 'updated_at'
    `;

    console.log('Current default:', checkDefault.recordset[0].COLUMN_DEFAULT);

    // Add default constraint
    try {
      await sql.query`
        ALTER TABLE PurchaseOrders
        ADD CONSTRAINT DF_PurchaseOrders_updated_at DEFAULT GETDATE() FOR updated_at
      `;
      console.log('✓ Added default constraint for updated_at');
    } catch (error: any) {
      if (error.message.includes('already an object')) {
        console.log('✓ Default constraint already exists');
      } else {
        throw error;
      }
    }

    // Also add trigger to auto-update updated_at on UPDATE
    console.log('\n🔧 Creating trigger to auto-update updated_at...');
    
    // Drop trigger if exists
    await sql.query`
      IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_PurchaseOrders_UpdatedAt')
      DROP TRIGGER trg_PurchaseOrders_UpdatedAt
    `;

    // Create trigger
    await sql.query`
      CREATE TRIGGER trg_PurchaseOrders_UpdatedAt
      ON PurchaseOrders
      AFTER UPDATE
      AS
      BEGIN
        SET NOCOUNT ON;
        UPDATE PurchaseOrders
        SET updated_at = GETDATE()
        FROM PurchaseOrders po
        INNER JOIN inserted i ON po.id = i.id
        WHERE po.updated_at = i.updated_at  -- Only update if updated_at wasn't explicitly set
      END
    `;

    console.log('✓ Created trigger for auto-updating updated_at');

    console.log('\n✅ Done! Now updated_at will be set automatically for:');
    console.log('  - New records (via DEFAULT constraint)');
    console.log('  - Updated records (via TRIGGER)');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.close();
  }
}

addDefaultUpdatedAt();
