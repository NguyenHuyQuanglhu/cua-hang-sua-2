import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

import { getConnection } from '../src/db/connection';

async function checkUserPermissions() {
  try {
    console.log('=== CHECK USER PERMISSIONS ===');
    
    const pool = await getConnection();
    
    // Check the specific user from our token
    const userId = '3AEA61D7-EB71-4698-9728-AD97294D4689';
    
    console.log('🔍 Checking user:', userId);
    
    const userResult = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT id, email, display_name, role, permissions, status
        FROM Users
        WHERE id = @userId
      `);
    
    if (userResult.recordset.length === 0) {
      console.log('❌ User not found in database');
      return;
    }
    
    const user = userResult.recordset[0];
    console.log('👤 User found:');
    console.log('  - Email:', user.email);
    console.log('  - Role:', user.role);
    console.log('  - Status:', user.status);
    console.log('  - Permissions:', user.permissions || 'null');
    
    // Check if user has active status
    if (user.status !== 'active') {
      console.log('⚠️  User status is not active!');
    }
    
    // Check permissions table if exists
    try {
      const permsResult = await pool.request()
        .input('userId', userId)
        .query(`
          SELECT StoreId, Module, Actions
          FROM Permissions
          WHERE UserId = @userId
        `);
      
      console.log('\n🔐 Store-specific permissions:');
      if (permsResult.recordset.length === 0) {
        console.log('  - No store-specific permissions found');
      } else {
        permsResult.recordset.forEach(perm => {
          console.log(`  - Store: ${perm.StoreId}, Module: ${perm.Module}, Actions: ${perm.Actions}`);
        });
      }
    } catch (error) {
      console.log('📝 Permissions table not found (using default permissions)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUserPermissions();