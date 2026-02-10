import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

import { getConnection } from '../src/db/connection';

/**
 * Script to create UnitConversionLog table
 */

async function createUnitConversionLog() {
  console.log('Creating UnitConversionLog table...');

  try {
    const pool = await getConnection();

    // Check if table exists
    const tableCheck = await pool.request().query(`
      SELECT * FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'UnitConversionLog'
    `);

    if (tableCheck.recordset.length > 0) {
      console.log('UnitConversionLog table already exists');
      return;
    }

    // Create table
    await pool.request().query(`
      CREATE TABLE UnitConversionLog (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        ProductId UNIQUEIDENTIFIER NOT NULL,
        StoreId UNIQUEIDENTIFIER NOT NULL,
        FromUnitId UNIQUEIDENTIFIER NOT NULL,
        ToUnitId UNIQUEIDENTIFIER NOT NULL,
        FromQuantity DECIMAL(18,4) NOT NULL,
        ToQuantity DECIMAL(18,4) NOT NULL,
        ConversionRate DECIMAL(18,4) NOT NULL DEFAULT 1,
        ReferenceType NVARCHAR(50),
        ReferenceId UNIQUEIDENTIFIER,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT FK_UnitConversionLog_Product FOREIGN KEY (ProductId) REFERENCES Products(Id),
        CONSTRAINT FK_UnitConversionLog_Store FOREIGN KEY (StoreId) REFERENCES Stores(Id),
        CONSTRAINT FK_UnitConversionLog_FromUnit FOREIGN KEY (FromUnitId) REFERENCES Units(Id),
        CONSTRAINT FK_UnitConversionLog_ToUnit FOREIGN KEY (ToUnitId) REFERENCES Units(Id)
      )
    `);

    console.log('✓ Created UnitConversionLog table');

    // Create indexes
    await pool.request().query(`
      CREATE INDEX IX_UnitConversionLog_Product ON UnitConversionLog(ProductId, StoreId);
      CREATE INDEX IX_UnitConversionLog_Reference ON UnitConversionLog(ReferenceType, ReferenceId);
    `);

    console.log('✓ Created indexes');

  } catch (error) {
    console.error('Failed to create table:', error);
    throw error;
  }
}

// Run script
createUnitConversionLog()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
