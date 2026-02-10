"use strict";
/**
 * Tenant Registration Routes
 *
 * Handles tenant registration, provisioning status, and tenant management.
 *
 * Requirements: 1.1, 1.4
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tenant_repository_1 = require("../repositories/tenant-repository");
const tenant_user_repository_1 = require("../repositories/tenant-user-repository");
const tenant_provisioning_service_1 = require("../services/tenant-provisioning-service");
const tenant_router_1 = require("../db/tenant-router");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
/**
 * Registration request validation schema
 */
const registrationSchema = zod_1.z.object({
    // Business info
    businessName: zod_1.z.string().min(2, 'Tên doanh nghiệp phải có ít nhất 2 ký tự').max(255),
    businessEmail: zod_1.z.string().email('Email không hợp lệ'),
    businessPhone: zod_1.z.string().optional(),
    // Owner info
    ownerName: zod_1.z.string().min(2, 'Tên chủ sở hữu phải có ít nhất 2 ký tự').max(255),
    ownerEmail: zod_1.z.string().email('Email không hợp lệ'),
    ownerPassword: zod_1.z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
    // Optional
    subscriptionPlan: zod_1.z.enum(['basic', 'standard', 'premium']).optional().default('basic'),
    defaultStoreName: zod_1.z.string().optional(),
});
/**
 * POST /api/tenants/register
 *
 * Register a new tenant with business info.
 * Creates tenant record, provisions database, and creates owner account.
 *
 * Requirements: 1.1, 1.4
 */
router.post('/register', async (req, res) => {
    try {
        // Validate request body
        const validationResult = registrationSchema.safeParse(req.body);
        if (!validationResult.success) {
            const errors = validationResult.error.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message,
            }));
            res.status(400).json({ error: 'Dữ liệu không hợp lệ', errors });
            return;
        }
        const data = validationResult.data;
        // Ensure tenant router is initialized
        await tenant_router_1.tenantRouter.initialize();
        // Check if business email already exists
        const existingTenant = await tenant_repository_1.tenantRepository.findByEmail(data.businessEmail);
        if (existingTenant) {
            res.status(400).json({
                error: 'Email đã được sử dụng',
                errorCode: 'TENANT001',
            });
            return;
        }
        // Check if owner email already exists in any tenant
        const existingUser = await tenant_user_repository_1.tenantUserRepository.findByEmail(data.ownerEmail);
        if (existingUser) {
            res.status(400).json({
                error: 'Email chủ sở hữu đã được sử dụng',
                errorCode: 'TENANT002',
            });
            return;
        }
        // Generate unique slug and database name
        const slug = generateUniqueSlug(data.businessName);
        const databaseName = `SmartInventory_${slug.replace(/-/g, '_')}`;
        const databaseServer = process.env.DB_SERVER || 'localhost';
        // Check if slug is unique
        if (await tenant_repository_1.tenantRepository.slugExists(slug)) {
            res.status(400).json({
                error: 'Tên doanh nghiệp đã được sử dụng, vui lòng chọn tên khác',
                errorCode: 'TENANT003',
            });
            return;
        }
        // Create tenant record in Master DB
        const tenantInput = {
            name: data.businessName,
            slug,
            email: data.businessEmail,
            phone: data.businessPhone,
            subscriptionPlan: data.subscriptionPlan,
            databaseName,
            databaseServer,
        };
        const tenant = await tenant_repository_1.tenantRepository.create(tenantInput);
        // Start async provisioning
        // Return immediately with tenant ID for progress tracking
        res.status(202).json({
            success: true,
            message: 'Đang tạo tài khoản...',
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
        });
        // Provision database asynchronously
        provisionTenantAsync(tenant.id, {
            tenantId: tenant.id,
            databaseName,
            databaseServer,
            ownerEmail: data.ownerEmail,
            ownerPassword: data.ownerPassword,
            ownerDisplayName: data.ownerName,
            defaultStoreName: data.defaultStoreName,
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            error: `Đăng ký thất bại: ${errorMessage}`,
            errorCode: 'TENANT_ERROR',
        });
    }
});
/**
 * Async provisioning function
 */
async function provisionTenantAsync(tenantId, input) {
    try {
        const result = await tenant_provisioning_service_1.tenantProvisioningService.provisionTenant(input);
        if (result.success && result.ownerId) {
            // Create TenantUser record in Master DB for authentication
            await tenant_user_repository_1.tenantUserRepository.create({
                tenantId: input.tenantId,
                email: input.ownerEmail,
                password: input.ownerPassword,
                isOwner: true,
            });
            console.log(`✅ Tenant ${tenantId} provisioned successfully`);
        }
        else {
            // Mark tenant as failed
            await tenant_repository_1.tenantRepository.update(tenantId, { status: 'suspended' });
            console.error(`❌ Tenant ${tenantId} provisioning failed:`, result.error);
        }
    }
    catch (error) {
        console.error(`❌ Tenant ${tenantId} provisioning error:`, error);
        // Mark tenant as failed
        try {
            await tenant_repository_1.tenantRepository.update(tenantId, { status: 'suspended' });
        }
        catch {
            // Ignore cleanup errors
        }
    }
}
/**
 * GET /api/tenants/register/status/:tenantId
 *
 * Get provisioning status for a tenant.
 * Used for progress indicator during registration.
 *
 * Requirements: 1.5
 */
router.get('/register/status/:tenantId', async (req, res) => {
    try {
        const { tenantId } = req.params;
        // Get provisioning progress
        const progress = tenant_provisioning_service_1.tenantProvisioningService.getProgress(tenantId);
        if (!progress) {
            // Check if tenant exists and is active (provisioning completed)
            const tenant = await tenant_repository_1.tenantRepository.findById(tenantId);
            if (!tenant) {
                res.status(404).json({ error: 'Không tìm thấy tenant' });
                return;
            }
            if (tenant.status === 'active') {
                res.json({
                    status: 'completed',
                    progress: 100,
                    message: 'Hoàn tất!',
                    tenant: {
                        id: tenant.id,
                        name: tenant.name,
                        slug: tenant.slug,
                    },
                });
                return;
            }
            if (tenant.status === 'suspended') {
                res.json({
                    status: 'failed',
                    progress: 0,
                    message: 'Đăng ký thất bại',
                    error: 'Vui lòng liên hệ hỗ trợ',
                });
                return;
            }
        }
        res.json(progress);
    }
    catch (error) {
        console.error('Get status error:', error);
        res.status(500).json({ error: 'Không thể lấy trạng thái' });
    }
});
/**
 * POST /api/tenants/check-email
 *
 * Check if email is available for registration.
 */
router.post('/check-email', async (req, res) => {
    try {
        const { email, type } = req.body;
        if (!email) {
            res.status(400).json({ error: 'Email là bắt buộc' });
            return;
        }
        await tenant_router_1.tenantRouter.initialize();
        if (type === 'business') {
            const exists = await tenant_repository_1.tenantRepository.emailExists(email);
            res.json({ available: !exists });
        }
        else {
            // Check owner email
            const existingUser = await tenant_user_repository_1.tenantUserRepository.findByEmail(email);
            res.json({ available: !existingUser });
        }
    }
    catch (error) {
        console.error('Check email error:', error);
        res.status(500).json({ error: 'Không thể kiểm tra email' });
    }
});
/**
 * POST /api/tenants/check-slug
 *
 * Check if business name/slug is available.
 */
router.post('/check-slug', async (req, res) => {
    try {
        const { businessName } = req.body;
        if (!businessName) {
            res.status(400).json({ error: 'Tên doanh nghiệp là bắt buộc' });
            return;
        }
        await tenant_router_1.tenantRouter.initialize();
        const slug = generateUniqueSlug(businessName);
        const exists = await tenant_repository_1.tenantRepository.slugExists(slug);
        res.json({
            available: !exists,
            suggestedSlug: slug,
        });
    }
    catch (error) {
        console.error('Check slug error:', error);
        res.status(500).json({ error: 'Không thể kiểm tra tên doanh nghiệp' });
    }
});
/**
 * Generate unique slug from business name
 */
function generateUniqueSlug(name) {
    const baseSlug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
    // Add timestamp suffix for uniqueness
    const timestamp = Date.now().toString(36).slice(-4);
    return `${baseSlug}-${timestamp}`;
}
exports.default = router;
//# sourceMappingURL=tenants.js.map