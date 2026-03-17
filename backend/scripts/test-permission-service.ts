import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

import { permissionService } from '../src/services/permission-service';

async function testPermissionService() {
  try {
    console.log('=== TEST PERMISSION SERVICE ===');
    
    const userId = '3AEA61D7-EB71-4698-9728-AD97294D4689';
    
    console.log('🔍 Testing permission check for user:', userId);
    
    // Test permission check
    const result = await permissionService.checkPermission(
      userId,
      'users',
      'view'
    );
    
    console.log('📋 Permission check result:');
    console.log('  - Allowed:', result.allowed);
    console.log('  - Reason:', result.reason || 'N/A');
    console.log('  - Error Code:', result.errorCode || 'N/A');
    
    // Test getting permission context directly
    console.log('\n🔍 Getting permission context...');
    const context = await permissionService.getPermissionContext(userId);
    
    if (context) {
      console.log('👤 Permission context found:');
      console.log('  - User ID:', context.userId);
      console.log('  - Role:', context.role);
      console.log('  - Tenant ID:', context.tenantId || 'N/A');
      console.log('  - Custom Permissions:', context.customPermissions ? 'Yes' : 'No');
    } else {
      console.log('❌ Permission context is null');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testPermissionService();