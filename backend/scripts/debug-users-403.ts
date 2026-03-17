import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

import { getConnection } from '../src/db/connection';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function debugUsersPermission() {
  try {
    console.log('=== DEBUG USERS 403 ERROR ===');
    
    // Check if we can connect to database
    const pool = await getConnection();
    console.log('✅ Database connection successful');
    
    // Check users table
    const usersResult = await pool.request().query('SELECT COUNT(*) as count FROM Users');
    console.log(`📊 Users table has ${usersResult.recordset[0].count} records`);
    
    // Check sessions table
    const sessionsResult = await pool.request().query('SELECT COUNT(*) as count FROM Sessions WHERE expires_at > GETDATE()');
    console.log(`🔑 Active sessions: ${sessionsResult.recordset[0].count}`);
    
    // Check recent sessions
    const recentSessions = await pool.request().query(`
      SELECT TOP 5 s.id, s.user_id, u.email, u.role, s.expires_at
      FROM Sessions s
      JOIN Users u ON s.user_id = u.id
      WHERE s.expires_at > GETDATE()
      ORDER BY s.created_at DESC
    `);
    
    console.log('\n📋 Recent active sessions:');
    recentSessions.recordset.forEach(session => {
      console.log(`  - User: ${session.email} (${session.role})`);
      console.log(`    Session ID: ${session.id}`);
      console.log(`    Expires: ${session.expires_at}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugUsersPermission();