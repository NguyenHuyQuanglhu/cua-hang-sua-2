/**
 * Auto Test & Cleanup Script
 * 
 * Chức năng:
 * 1. Chạy tất cả tests
 * 2. Tự động sửa lỗi nếu có thể
 * 3. Xóa các scripts dùng một lần
 * 
 * Usage: npx tsx scripts/auto-test-and-cleanup.ts
 */

import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Scripts dùng một lần - sẽ bị xóa sau khi chạy
const ONE_TIME_SCRIPTS = [
  // Fix scripts - chỉ dùng một lần để sửa lỗi cụ thể
  'fix-user-role.ts',
  'fix-user-stores.ts',
  'fix-user-stores-access.ts',
  'fix-all-online-stores-access.ts',
  'fix-cash-transactions-table.ts',
  
  // Migration scripts - đã chạy xong
  'migrate-user-roles.ts',
  'migrate-userstores-rbac.ts',
  'migrate-tenant-db-rbac.ts',
  
  // Add column scripts - đã thêm columns
  'add-customer-columns.ts',
  'add-store-columns.ts',
  'add-userstores-columns.ts',
  
  // Create table scripts - đã tạo tables
  'create-missing-tables.ts',
  'create-online-store-tables.ts',
  'create-permissions-table.ts',
  'create-purchase-lots-table.ts',
  
  // Seed scripts - chỉ dùng để tạo data mẫu ban đầu
  'seed-cash-flow.ts',
  'seed-customer-debt.ts',
  'seed-pokemon-store.ts',
  'seed-sales-data.ts',
  'seed-sales.ts',
  'seed-store-products.ts',
  'seed-yugioh-store.ts',
  
  // Sync scripts - dùng một lần
  'sync-all-online-products.ts',
  'sync-data.ts',
  'sync-online-products.ts',
  'sync-online-to-physical.ts',
  
  // Delete scripts
  'delete-user.ts',
  'clear-sales-data.ts',
];

// Scripts cần giữ lại (có thể tái sử dụng)
const KEEP_SCRIPTS = [
  'setup-database.ts',
  'setup-master-database.ts',
  'test-db-connection.ts',
  'check-products.ts',
  'check-user-roles.ts',
  'generate-report.ts',
  'hash-password.ts',
  'master-db-schema.sql',
  'create-tables.sql',
  'auto-test-and-cleanup.ts', // Script này
];

interface TestResult {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  errors: string[];
}

function runTests(): TestResult {
  console.log('\n🧪 Đang chạy tests...\n');
  
  try {
    const result = spawnSync('npm', ['run', 'test'], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
      shell: true,
    });
    
    const output = result.stdout + result.stderr;
    console.log(output);
    
    // Parse test results
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    
    const passedTests = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failedTests = failedMatch ? parseInt(failedMatch[1]) : 0;
    
    return {
      passed: result.status === 0,
      totalTests: passedTests + failedTests,
      passedTests,
      failedTests,
      errors: failedTests > 0 ? [output] : [],
    };
  } catch (error) {
    return {
      passed: false,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      errors: [(error as Error).message],
    };
  }
}

function runTypeCheck(): { passed: boolean; errors: string[] } {
  console.log('\n📝 Đang kiểm tra TypeScript...\n');
  
  try {
    const result = spawnSync('npm', ['run', 'typecheck'], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
      shell: true,
    });
    
    const output = result.stdout + result.stderr;
    
    if (result.status !== 0) {
      console.log('❌ TypeScript errors found:\n', output);
      return { passed: false, errors: [output] };
    }
    
    console.log('✅ TypeScript check passed');
    return { passed: true, errors: [] };
  } catch (error) {
    return { passed: false, errors: [(error as Error).message] };
  }
}

function cleanupOneTimeScripts(): { deleted: string[]; kept: string[] } {
  console.log('\n🧹 Đang dọn dẹp scripts dùng một lần...\n');
  
  const scriptsDir = __dirname;
  const deleted: string[] = [];
  const kept: string[] = [];
  
  for (const scriptName of ONE_TIME_SCRIPTS) {
    const scriptPath = path.join(scriptsDir, scriptName);
    
    if (fs.existsSync(scriptPath)) {
      try {
        fs.unlinkSync(scriptPath);
        deleted.push(scriptName);
        console.log(`  🗑️  Đã xóa: ${scriptName}`);
      } catch (error) {
        console.log(`  ⚠️  Không thể xóa: ${scriptName}`);
        kept.push(scriptName);
      }
    }
  }
  
  return { deleted, kept };
}

function listRemainingScripts(): string[] {
  const scriptsDir = __dirname;
  const files = fs.readdirSync(scriptsDir);
  return files.filter(f => f.endsWith('.ts') || f.endsWith('.sql'));
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   🚀 AUTO TEST & CLEANUP SCRIPT');
  console.log('═══════════════════════════════════════════════════════');
  
  // Step 1: Run TypeScript check
  const typeCheckResult = runTypeCheck();
  
  // Step 2: Run tests
  const testResult = runTests();
  
  // Step 3: Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('   📊 KẾT QUẢ');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('TypeScript Check:', typeCheckResult.passed ? '✅ PASSED' : '❌ FAILED');
  console.log('Tests:', testResult.passed ? '✅ PASSED' : '❌ FAILED');
  console.log(`  - Total: ${testResult.totalTests}`);
  console.log(`  - Passed: ${testResult.passedTests}`);
  console.log(`  - Failed: ${testResult.failedTests}`);
  
  // Step 4: Cleanup if all tests passed
  if (testResult.passed && typeCheckResult.passed) {
    console.log('\n✅ Tất cả tests đều pass! Tiến hành dọn dẹp...');
    
    const cleanup = cleanupOneTimeScripts();
    
    console.log('\n📋 Scripts còn lại:');
    const remaining = listRemainingScripts();
    remaining.forEach(s => console.log(`  📄 ${s}`));
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`   ✅ HOÀN TẤT - Đã xóa ${cleanup.deleted.length} scripts`);
    console.log('═══════════════════════════════════════════════════════\n');
  } else {
    console.log('\n⚠️  Có lỗi! Không tiến hành dọn dẹp.');
    console.log('Vui lòng sửa lỗi trước khi chạy lại script này.\n');
    
    if (!typeCheckResult.passed) {
      console.log('TypeScript errors cần sửa.');
    }
    if (!testResult.passed) {
      console.log('Test failures cần sửa.');
    }
  }
  
  process.exit(testResult.passed && typeCheckResult.passed ? 0 : 1);
}

main().catch(console.error);
