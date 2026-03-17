import dotenv from 'dotenv';
import path from 'path';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

import { getConnection } from '../src/db/connection';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function generateTestToken() {
  try {
    console.log('=== GENERATE TEST TOKEN ===');
    
    const pool = await getConnection();
    
    // Get an active session
    const sessionResult = await pool.request().query(`
      SELECT TOP 1 s.id as sessionId, s.user_id as userId, u.email, u.role
      FROM Sessions s
      JOIN Users u ON s.user_id = u.id
      WHERE s.expires_at > GETDATE()
      ORDER BY s.created_at DESC
    `);
    
    if (sessionResult.recordset.length === 0) {
      console.log('❌ No active sessions found');
      return;
    }
    
    const session = sessionResult.recordset[0];
    console.log('📋 Using session for:', session.email, `(${session.role})`);
    
    // Generate JWT token
    const payload = {
      userId: session.userId,
      sessionId: session.sessionId
    };
    
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    
    console.log('\n🔑 Generated Token:');
    console.log(token);
    
    console.log('\n📝 Test command:');
    console.log(`Invoke-WebRequest -Uri "http://localhost:3001/api/users" -Headers @{"Authorization"="Bearer ${token}"} -Method GET`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

generateTestToken();