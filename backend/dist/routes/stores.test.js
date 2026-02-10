"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// Test the generateSlug function logic
(0, vitest_1.describe)('Store API - Slug Generation', () => {
    // Replicate the generateSlug function for testing
    function generateSlug(name) {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'd')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
    (0, vitest_1.it)('should convert name to lowercase slug', () => {
        (0, vitest_1.expect)(generateSlug('My Store')).toBe('my-store');
    });
    (0, vitest_1.it)('should handle Vietnamese characters', () => {
        (0, vitest_1.expect)(generateSlug('Cửa hàng Việt Nam')).toBe('cua-hang-viet-nam');
    });
    (0, vitest_1.it)('should handle đ character', () => {
        (0, vitest_1.expect)(generateSlug('Đồng hồ')).toBe('dong-ho');
    });
    (0, vitest_1.it)('should remove special characters', () => {
        (0, vitest_1.expect)(generateSlug('Store @#$% Name!')).toBe('store-name');
    });
    (0, vitest_1.it)('should handle multiple spaces', () => {
        (0, vitest_1.expect)(generateSlug('Store   Name')).toBe('store-name');
    });
    (0, vitest_1.it)('should handle leading/trailing spaces', () => {
        (0, vitest_1.expect)(generateSlug('  Store Name  ')).toBe('store-name');
    });
    (0, vitest_1.it)('should handle numbers', () => {
        (0, vitest_1.expect)(generateSlug('Store 123')).toBe('store-123');
    });
});
(0, vitest_1.describe)('Store API - Validation', () => {
    // Validation logic tests
    function validateStoreName(name) {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return { valid: false, error: 'Tên cửa hàng là bắt buộc' };
        }
        if (name.length > 255) {
            return { valid: false, error: 'Tên cửa hàng không được quá 255 ký tự' };
        }
        return { valid: true };
    }
    (0, vitest_1.it)('should reject empty name', () => {
        const result = validateStoreName('');
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.error).toBe('Tên cửa hàng là bắt buộc');
    });
    (0, vitest_1.it)('should reject null name', () => {
        const result = validateStoreName(null);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.error).toBe('Tên cửa hàng là bắt buộc');
    });
    (0, vitest_1.it)('should reject undefined name', () => {
        const result = validateStoreName(undefined);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.error).toBe('Tên cửa hàng là bắt buộc');
    });
    (0, vitest_1.it)('should reject whitespace-only name', () => {
        const result = validateStoreName('   ');
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.error).toBe('Tên cửa hàng là bắt buộc');
    });
    (0, vitest_1.it)('should reject name longer than 255 characters', () => {
        const longName = 'a'.repeat(256);
        const result = validateStoreName(longName);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.error).toBe('Tên cửa hàng không được quá 255 ký tự');
    });
    (0, vitest_1.it)('should accept valid name', () => {
        const result = validateStoreName('My Store');
        (0, vitest_1.expect)(result.valid).toBe(true);
        (0, vitest_1.expect)(result.error).toBeUndefined();
    });
    (0, vitest_1.it)('should accept name with exactly 255 characters', () => {
        const maxName = 'a'.repeat(255);
        const result = validateStoreName(maxName);
        (0, vitest_1.expect)(result.valid).toBe(true);
    });
});
(0, vitest_1.describe)('Store API - Status Validation', () => {
    function validateStatus(status) {
        if (status === undefined)
            return true;
        return ['active', 'inactive'].includes(status);
    }
    (0, vitest_1.it)('should accept active status', () => {
        (0, vitest_1.expect)(validateStatus('active')).toBe(true);
    });
    (0, vitest_1.it)('should accept inactive status', () => {
        (0, vitest_1.expect)(validateStatus('inactive')).toBe(true);
    });
    (0, vitest_1.it)('should accept undefined status', () => {
        (0, vitest_1.expect)(validateStatus(undefined)).toBe(true);
    });
    (0, vitest_1.it)('should reject invalid status', () => {
        (0, vitest_1.expect)(validateStatus('deleted')).toBe(false);
    });
    (0, vitest_1.it)('should reject empty string status', () => {
        (0, vitest_1.expect)(validateStatus('')).toBe(false);
    });
});
(0, vitest_1.describe)('Store API - Permanent Delete Validation', () => {
    function validatePermanentDeleteRequest(confirm, userRole) {
        if (confirm !== 'true') {
            return { valid: false, error: 'Vui lòng xác nhận xóa vĩnh viễn' };
        }
        if (!userRole || userRole !== 'owner') {
            return { valid: false, error: 'Chỉ chủ cửa hàng mới có quyền xóa vĩnh viễn' };
        }
        return { valid: true };
    }
    (0, vitest_1.it)('should reject request without confirm param', () => {
        const result = validatePermanentDeleteRequest(undefined, 'owner');
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.error).toBe('Vui lòng xác nhận xóa vĩnh viễn');
    });
    (0, vitest_1.it)('should reject request with confirm=false', () => {
        const result = validatePermanentDeleteRequest('false', 'owner');
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.error).toBe('Vui lòng xác nhận xóa vĩnh viễn');
    });
    (0, vitest_1.it)('should reject request from non-owner user', () => {
        const result = validatePermanentDeleteRequest('true', 'member');
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.error).toBe('Chỉ chủ cửa hàng mới có quyền xóa vĩnh viễn');
    });
    (0, vitest_1.it)('should reject request when user has no role', () => {
        const result = validatePermanentDeleteRequest('true', undefined);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.error).toBe('Chỉ chủ cửa hàng mới có quyền xóa vĩnh viễn');
    });
    (0, vitest_1.it)('should accept valid request from owner with confirm=true', () => {
        const result = validatePermanentDeleteRequest('true', 'owner');
        (0, vitest_1.expect)(result.valid).toBe(true);
        (0, vitest_1.expect)(result.error).toBeUndefined();
    });
});
(0, vitest_1.describe)('Store API - Response Mapping', () => {
    function mapStoreToResponse(s) {
        return {
            id: s.id,
            ownerId: s.owner_id,
            name: s.name,
            slug: s.slug,
            description: s.description,
            logoUrl: s.logo_url,
            address: s.address,
            phone: s.phone,
            businessType: s.business_type,
            domain: s.domain,
            status: s.status,
            settings: s.settings,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
        };
    }
    (0, vitest_1.it)('should map database record to API response format', () => {
        const dbRecord = {
            id: '123',
            owner_id: '456',
            name: 'Test Store',
            slug: 'test-store',
            description: 'A test store',
            logo_url: 'http://example.com/logo.png',
            address: '123 Main St',
            phone: '0123456789',
            business_type: 'retail',
            domain: 'test.example.com',
            status: 'active',
            settings: { theme: 'dark' },
            created_at: new Date('2024-01-01'),
            updated_at: new Date('2024-01-02'),
        };
        const response = mapStoreToResponse(dbRecord);
        (0, vitest_1.expect)(response.id).toBe('123');
        (0, vitest_1.expect)(response.ownerId).toBe('456');
        (0, vitest_1.expect)(response.name).toBe('Test Store');
        (0, vitest_1.expect)(response.slug).toBe('test-store');
        (0, vitest_1.expect)(response.description).toBe('A test store');
        (0, vitest_1.expect)(response.logoUrl).toBe('http://example.com/logo.png');
        (0, vitest_1.expect)(response.address).toBe('123 Main St');
        (0, vitest_1.expect)(response.phone).toBe('0123456789');
        (0, vitest_1.expect)(response.businessType).toBe('retail');
        (0, vitest_1.expect)(response.domain).toBe('test.example.com');
        (0, vitest_1.expect)(response.status).toBe('active');
        (0, vitest_1.expect)(response.settings).toEqual({ theme: 'dark' });
    });
    (0, vitest_1.it)('should handle null values', () => {
        const dbRecord = {
            id: '123',
            owner_id: '456',
            name: 'Test Store',
            slug: 'test-store',
            description: null,
            logo_url: null,
            address: null,
            phone: null,
            business_type: null,
            domain: null,
            status: 'active',
            settings: null,
            created_at: new Date('2024-01-01'),
            updated_at: new Date('2024-01-02'),
        };
        const response = mapStoreToResponse(dbRecord);
        (0, vitest_1.expect)(response.description).toBeNull();
        (0, vitest_1.expect)(response.logoUrl).toBeNull();
        (0, vitest_1.expect)(response.address).toBeNull();
        (0, vitest_1.expect)(response.phone).toBeNull();
        (0, vitest_1.expect)(response.businessType).toBeNull();
    });
});
//# sourceMappingURL=stores.test.js.map