/**
 * Migration: Add created_by column to Sales table
 * This allows filtering sales by the employee who created them
 */

import { query } from '../src/db';

async function addCreatedByColumn() {
  try {
    console.log('Adding created_by column to Sales table...');

    // Check if column already exists
    const columnCheck = await query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Sales' AND COLUMN_NAME = 'CreatedBy'
    `);

    if ((columnCheck as any)[0].count > 0) {
      console.log('✓ CreatedBy column already exists');
      return;
    }

    // Add created_by column
    await query(`
      ALTER TABLE Sales
      ADD CreatedBy NVARCHAR(36) NULL
    `);

    console.log('✓ Added CreatedBy column to Sales table');

    // Add foreign key constraint
    await query(`
      ALTER TABLE Sales
      ADD CONSTRAINT FK_Sales_CreatedBy
      FOREIGN KEY (CreatedBy) REFERENCES Users(Id)
    `);

    console.log('✓ Added foreign key constraint');

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNote: Existing sales will have NULL created_by.');
    console.log('New sales will automatically record the creator.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
addCreatedByColumn()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
