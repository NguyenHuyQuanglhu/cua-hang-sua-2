import 'dotenv/config';
import { query } from '../src/db';

async function checkUserRoles() {
  try {
    const users = await query(
      `SELECT id, email, role, status FROM Users WHERE email IN ('anh@lhu.edu.vn', 'bao@lhu.edu.vn')`
    );
    console.log('Users:');
    console.table(users);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUserRoles();
