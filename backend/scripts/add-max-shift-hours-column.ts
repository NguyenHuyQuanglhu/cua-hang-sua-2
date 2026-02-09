import 'dotenv/config';
import { query } from '../src/db';

async function addMaxShiftHoursColumn() {
  try {
    console.log('🔧 Adding max_shift_hours column to Users table...');
    
    // Check if column exists
    const checkResult = await query(`
      SELECT COUNT(*) as count
      FROM sys.columns 
      WHERE object_id = OBJECT_ID('Users') 
      AND name = 'max_shift_hours'
    `);
    
    const exists = (checkResult[0] as { count: number }).count > 0;
    
    if (!exists) {
      // Add column
      await query(`
        ALTER TABLE Users ADD max_shift_hours DECIMAL(5,2) NULL
      `);
      console.log('✅ Added max_shift_hours column');
      
      // Set default value
      await query(`
        UPDATE Users 
        SET max_shift_hours = 8.0 
        WHERE max_shift_hours IS NULL
      `);
      console.log('✅ Set default max_shift_hours to 8.0 hours for all users');
    } else {
      console.log('ℹ️  max_shift_hours column already exists');
      
      // Update NULL values to default
      await query(`
        UPDATE Users 
        SET max_shift_hours = 8.0 
        WHERE max_shift_hours IS NULL
      `);
      console.log('✅ Updated NULL values to default 8.0 hours');
    }
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addMaxShiftHoursColumn();
