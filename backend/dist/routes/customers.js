"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const validate_uuid_1 = require("../middleware/validate-uuid");
const customers_sp_repository_1 = require("../repositories/customers-sp-repository");
const settings_sp_repository_1 = require("../repositories/settings-sp-repository");
const db_1 = require("../db");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
const DEFAULT_STORE_CUSTOMER_SEGMENTS = [
    { key: 'personal', label: 'Cá nhân', baseCustomerType: 'personal', defaultDiscountRate: 0 },
    { key: 'business', label: 'Doanh nghiệp', baseCustomerType: 'business', defaultDiscountRate: 10 },
    { key: 'wholesaler', label: 'Đại lý sỉ', baseCustomerType: 'business', defaultDiscountRate: 12 },
    { key: 'agency', label: 'Nhà phân phối', baseCustomerType: 'business', defaultDiscountRate: 15 },
    { key: 'vip', label: 'VIP', baseCustomerType: 'personal', defaultDiscountRate: 8 },
];
function sanitizeSegmentKey(input) {
    const raw = String(input || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    return raw
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50);
}
function isCustomerSegmentManager(role) {
    return ['owner', 'company_manager', 'store_manager', 'admin'].includes(String(role || '').toLowerCase());
}
async function ensureStoreCustomerSegmentTable() {
    await (0, db_1.query)(`
    IF OBJECT_ID('StoreCustomerSegments', 'U') IS NULL
    BEGIN
      CREATE TABLE StoreCustomerSegments (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        store_id UNIQUEIDENTIFIER NOT NULL,
        segment_key NVARCHAR(50) NOT NULL,
        segment_label NVARCHAR(100) NOT NULL,
        base_customer_type NVARCHAR(20) NOT NULL DEFAULT 'personal',
        default_discount_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
        is_active BIT NOT NULL DEFAULT 1,
        is_system BIT NOT NULL DEFAULT 0,
        created_by UNIQUEIDENTIFIER NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
      );

      CREATE UNIQUE INDEX UX_StoreCustomerSegments_StoreSegment
      ON StoreCustomerSegments(store_id, segment_key);

      CREATE INDEX IX_StoreCustomerSegments_StoreActive
      ON StoreCustomerSegments(store_id, is_active);
    END
  `);
}
async function seedDefaultStoreCustomerSegments(storeId, userId) {
    await ensureStoreCustomerSegmentTable();
    for (const item of DEFAULT_STORE_CUSTOMER_SEGMENTS) {
        await (0, db_1.query)(`IF NOT EXISTS (
         SELECT 1
         FROM StoreCustomerSegments
         WHERE store_id = @storeId AND segment_key = @segmentKey
       )
       BEGIN
         INSERT INTO StoreCustomerSegments
           (id, store_id, segment_key, segment_label, base_customer_type, default_discount_rate, is_active, is_system, created_by, created_at, updated_at)
         VALUES
           (NEWID(), @storeId, @segmentKey, @segmentLabel, @baseCustomerType, @defaultDiscountRate, 1, 1, @createdBy, GETDATE(), GETDATE())
       END`, {
            storeId,
            segmentKey: item.key,
            segmentLabel: item.label,
            baseCustomerType: item.baseCustomerType,
            defaultDiscountRate: item.defaultDiscountRate,
            createdBy: userId || null,
        });
    }
    // Cua hang sua khong su dung nhom "tho"; an khoi danh sach loai khach hang.
    await (0, db_1.query)(`UPDATE StoreCustomerSegments
     SET is_active = 0,
         updated_at = GETDATE()
     WHERE store_id = @storeId
       AND segment_key = 'worker'
       AND is_active = 1`, { storeId });
}
async function resolveStoreCustomerSegmentConfig(storeId, segmentInput, userId) {
    await seedDefaultStoreCustomerSegments(storeId, userId);
    const segmentKey = sanitizeSegmentKey(segmentInput) || 'personal';
    const segmentConfig = await (0, db_1.queryOne)(`SELECT TOP 1 segment_key, base_customer_type, default_discount_rate
     FROM StoreCustomerSegments
     WHERE store_id = @storeId AND segment_key = @segmentKey AND is_active = 1`, { storeId, segmentKey });
    if (segmentConfig) {
        return {
            segmentKey: segmentConfig.segment_key,
            baseCustomerType: String(segmentConfig.base_customer_type).toLowerCase() === 'business' ? 'business' : 'personal',
            defaultDiscountRate: Number(segmentConfig.default_discount_rate || 0),
        };
    }
    const fallbackConfig = await (0, db_1.queryOne)(`SELECT TOP 1 segment_key, base_customer_type, default_discount_rate
     FROM StoreCustomerSegments
     WHERE store_id = @storeId AND segment_key = 'personal' AND is_active = 1`, { storeId });
    return {
        segmentKey: fallbackConfig?.segment_key || 'personal',
        baseCustomerType: String(fallbackConfig?.base_customer_type || 'personal').toLowerCase() === 'business' ? 'business' : 'personal',
        defaultDiscountRate: Number(fallbackConfig?.default_discount_rate || 0),
    };
}
async function ensureCustomerDiscountTables() {
    await (0, db_1.query)(`
    IF OBJECT_ID('CustomerDiscountProfiles', 'U') IS NULL
    BEGIN
      CREATE TABLE CustomerDiscountProfiles (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        customer_id UNIQUEIDENTIFIER NOT NULL,
        store_id UNIQUEIDENTIFIER NOT NULL,
        customer_segment NVARCHAR(50) NOT NULL DEFAULT 'personal',
        discount_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
      );

      CREATE UNIQUE INDEX UX_CustomerDiscountProfiles_CustomerStore
      ON CustomerDiscountProfiles(customer_id, store_id);
    END
  `);
    await (0, db_1.query)(`
    IF OBJECT_ID('CustomerDiscountTransactions', 'U') IS NULL
    BEGIN
      CREATE TABLE CustomerDiscountTransactions (
        id UNIQUEIDENTIFIER PRIMARY KEY,
        customer_id UNIQUEIDENTIFIER NOT NULL,
        store_id UNIQUEIDENTIFIER NOT NULL,
        amount DECIMAL(18,2) NOT NULL,
        description NVARCHAR(500) NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'pending',
        paid_at DATETIME2 NULL,
        payment_note NVARCHAR(500) NULL,
        created_by UNIQUEIDENTIFIER NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
      );

      CREATE INDEX IX_CustomerDiscountTransactions_CustomerStore
      ON CustomerDiscountTransactions(customer_id, store_id, status, created_at DESC);
    END
  `);
    await (0, db_1.query)(`
    IF COL_LENGTH('CustomerDiscountTransactions', 'source_sale_id') IS NULL
    BEGIN
      ALTER TABLE CustomerDiscountTransactions
      ADD source_sale_id UNIQUEIDENTIFIER NULL;
    END
  `);
    await (0, db_1.query)(`
    IF COL_LENGTH('CustomerDiscountTransactions', 'invoice_number') IS NULL
    BEGIN
      ALTER TABLE CustomerDiscountTransactions ADD invoice_number NVARCHAR(50) NULL;
    END
    IF COL_LENGTH('CustomerDiscountTransactions', 'invoice_date') IS NULL
    BEGIN
      ALTER TABLE CustomerDiscountTransactions ADD invoice_date DATETIME2 NULL;
    END
    IF COL_LENGTH('CustomerDiscountTransactions', 'invoice_total_amount') IS NULL
    BEGIN
      ALTER TABLE CustomerDiscountTransactions ADD invoice_total_amount DECIMAL(18,2) NULL;
    END
    IF COL_LENGTH('CustomerDiscountTransactions', 'invoice_final_amount') IS NULL
    BEGIN
      ALTER TABLE CustomerDiscountTransactions ADD invoice_final_amount DECIMAL(18,2) NULL;
    END
    IF COL_LENGTH('CustomerDiscountTransactions', 'discount_rate') IS NULL
    BEGIN
      ALTER TABLE CustomerDiscountTransactions ADD discount_rate DECIMAL(7,4) NULL;
    END
    IF COL_LENGTH('CustomerDiscountTransactions', 'discount_percent_of_invoice') IS NULL
    BEGIN
      ALTER TABLE CustomerDiscountTransactions ADD discount_percent_of_invoice DECIMAL(7,4) NULL;
    END
    IF COL_LENGTH('CustomerDiscountTransactions', 'paid_amount') IS NULL
    BEGIN
      ALTER TABLE CustomerDiscountTransactions ADD paid_amount DECIMAL(18,2) NULL;
    END
    IF COL_LENGTH('CustomerDiscountTransactions', 'paid_by') IS NULL
    BEGIN
      ALTER TABLE CustomerDiscountTransactions ADD paid_by UNIQUEIDENTIFIER NULL;
    END
    IF COL_LENGTH('CustomerDiscountTransactions', 'payout_id') IS NULL
    BEGIN
      ALTER TABLE CustomerDiscountTransactions ADD payout_id UNIQUEIDENTIFIER NULL;
    END
  `);
    await (0, db_1.query)(`
    IF OBJECT_ID('CustomerDiscountPayouts', 'U') IS NULL
    BEGIN
      CREATE TABLE CustomerDiscountPayouts (
        id UNIQUEIDENTIFIER PRIMARY KEY,
        customer_id UNIQUEIDENTIFIER NOT NULL,
        store_id UNIQUEIDENTIFIER NOT NULL,
        total_amount DECIMAL(18,2) NOT NULL,
        transaction_count INT NOT NULL,
        payout_method NVARCHAR(30) NOT NULL DEFAULT 'cash',
        transfer_reference NVARCHAR(120) NULL,
        transfer_note NVARCHAR(500) NULL,
        transfer_account_name NVARCHAR(150) NULL,
        transfer_account_number NVARCHAR(50) NULL,
        transfer_bank_name NVARCHAR(150) NULL,
        customer_bank_name NVARCHAR(150) NULL,
        customer_bank_account_number NVARCHAR(50) NULL,
        customer_bank_branch NVARCHAR(150) NULL,
        paid_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        created_by UNIQUEIDENTIFIER NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
      );

      CREATE INDEX IX_CustomerDiscountPayouts_CustomerStore
      ON CustomerDiscountPayouts(customer_id, store_id, paid_at DESC);
    END
  `);
    await (0, db_1.query)(`
    IF NOT EXISTS (
      SELECT * FROM sys.indexes WHERE name = 'UX_CustomerDiscountTransactions_SourceSale'
    )
    BEGIN
      CREATE UNIQUE INDEX UX_CustomerDiscountTransactions_SourceSale
      ON CustomerDiscountTransactions(source_sale_id)
      WHERE source_sale_id IS NOT NULL;
    END
  `);
    await (0, db_1.query)(`
    IF OBJECT_ID('CustomerDiscountDefaultRates', 'U') IS NULL
    BEGIN
      CREATE TABLE CustomerDiscountDefaultRates (
        customer_segment NVARCHAR(50) PRIMARY KEY,
        bronze_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
        silver_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
        gold_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
        diamond_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
      );
    END
  `);
    const defaultRateSeeds = [
        { segment: 'personal', bronze: 0, silver: 0, gold: 0, diamond: 0 },
        { segment: 'business', bronze: 10, silver: 11, gold: 12, diamond: 13 },
        { segment: 'wholesaler', bronze: 12, silver: 13, gold: 14, diamond: 15 },
        { segment: 'agency', bronze: 15, silver: 16, gold: 17, diamond: 18 },
        { segment: 'vip', bronze: 8, silver: 9, gold: 10, diamond: 12 },
    ];
    for (const rate of defaultRateSeeds) {
        await (0, db_1.query)(`IF NOT EXISTS (SELECT 1 FROM CustomerDiscountDefaultRates WHERE customer_segment = @segment)
       BEGIN
         INSERT INTO CustomerDiscountDefaultRates
           (customer_segment, bronze_rate, silver_rate, gold_rate, diamond_rate, updated_at)
         VALUES
           (@segment, @bronze, @silver, @gold, @diamond, GETDATE())
       END`, {
            segment: rate.segment,
            bronze: rate.bronze,
            silver: rate.silver,
            gold: rate.gold,
            diamond: rate.diamond,
        });
    }
}
async function getDefaultDiscountRate(segment, loyaltyTier) {
    await ensureCustomerDiscountTables();
    const tier = String(loyaltyTier || 'bronze').toLowerCase();
    const row = await (0, db_1.queryOne)(`SELECT bronze_rate, silver_rate, gold_rate, diamond_rate
     FROM CustomerDiscountDefaultRates
     WHERE customer_segment = @segment`, { segment });
    if (!row)
        return 0;
    if (tier === 'diamond')
        return Number(row.diamond_rate || 0);
    if (tier === 'gold')
        return Number(row.gold_rate || 0);
    if (tier === 'silver')
        return Number(row.silver_rate || 0);
    return Number(row.bronze_rate || 0);
}
function normalizeCustomerSegment(input) {
    const raw = sanitizeSegmentKey(input);
    return raw || 'personal';
}
const DEFAULT_LOYALTY_TIER_RULES = [
    { name: 'diamond', threshold: 10000 },
    { name: 'gold', threshold: 5000 },
    { name: 'silver', threshold: 1000 },
    { name: 'bronze', threshold: 0 },
];
const LOYALTY_TIER_ALIAS_MAP = {
    bronze: 'bronze',
    dong: 'bronze',
    hangdong: 'bronze',
    silver: 'silver',
    bac: 'silver',
    hangbac: 'silver',
    gold: 'gold',
    vang: 'gold',
    hangvang: 'gold',
    diamond: 'diamond',
    kimcuong: 'diamond',
    hangkimcuong: 'diamond',
};
function normalizeLoyaltyTierName(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) {
        return null;
    }
    const compactRaw = raw.replace(/\s+/g, '');
    const ascii = compactRaw
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z]/g, '');
    return LOYALTY_TIER_ALIAS_MAP[compactRaw] || LOYALTY_TIER_ALIAS_MAP[ascii] || null;
}
async function getConfiguredLoyaltyTierRules(storeId) {
    try {
        const settings = await settings_sp_repository_1.settingsSPRepository.getByStore(storeId);
        const tierThresholdMap = new Map();
        for (const tier of settings?.loyalty?.tiers || []) {
            const sourceName = tier.name ?? tier.vietnameseName;
            const normalizedName = normalizeLoyaltyTierName(sourceName);
            const threshold = Number(tier.threshold ?? 0);
            if (!normalizedName || !Number.isFinite(threshold)) {
                continue;
            }
            const currentThreshold = tierThresholdMap.get(normalizedName);
            if (currentThreshold === undefined || threshold > currentThreshold) {
                tierThresholdMap.set(normalizedName, threshold);
            }
        }
        if (tierThresholdMap.size === 0) {
            return DEFAULT_LOYALTY_TIER_RULES;
        }
        if (!tierThresholdMap.has('bronze')) {
            tierThresholdMap.set('bronze', 0);
        }
        return Array.from(tierThresholdMap.entries())
            .map(([name, threshold]) => ({ name, threshold }))
            .sort((a, b) => b.threshold - a.threshold);
    }
    catch {
        return DEFAULT_LOYALTY_TIER_RULES;
    }
}
async function upsertCustomerDiscountProfile(customerId, storeId, customerSegment, discountRate) {
    await ensureCustomerDiscountTables();
    await (0, db_1.query)(`MERGE CustomerDiscountProfiles AS target
     USING (SELECT @customerId AS customer_id, @storeId AS store_id) AS source
     ON target.customer_id = source.customer_id AND target.store_id = source.store_id
     WHEN MATCHED THEN
       UPDATE SET
         customer_segment = @customerSegment,
         discount_rate = @discountRate,
         updated_at = GETDATE()
     WHEN NOT MATCHED THEN
       INSERT (id, customer_id, store_id, customer_segment, discount_rate, created_at, updated_at)
       VALUES (NEWID(), @customerId, @storeId, @customerSegment, @discountRate, GETDATE(), GETDATE());`, {
        customerId,
        storeId,
        customerSegment,
        discountRate,
    });
}
// GET /api/customers/segment-types - list configured customer segments by store
router.get('/segment-types', async (req, res) => {
    try {
        const storeId = req.storeId;
        const userId = req.user?.id;
        await seedDefaultStoreCustomerSegments(storeId, userId);
        const rows = await (0, db_1.query)(`SELECT segment_key, segment_label, base_customer_type, default_discount_rate, is_active, is_system
       FROM StoreCustomerSegments
       WHERE store_id = @storeId
         AND is_active = 1
         AND segment_key NOT IN ('worker', 'tho')
       ORDER BY is_system DESC, segment_label ASC`, { storeId });
        res.json({
            success: true,
            data: rows.map((row) => ({
                segmentKey: row.segment_key,
                segmentLabel: row.segment_label,
                baseCustomerType: String(row.base_customer_type || 'personal').toLowerCase() === 'business' ? 'business' : 'personal',
                defaultDiscountRate: Number(row.default_discount_rate || 0),
                isActive: Boolean(row.is_active),
                isSystem: Boolean(row.is_system),
            })),
        });
    }
    catch (error) {
        console.error('Get customer segment types error:', error);
        res.status(500).json({ error: 'Failed to get customer segment types' });
    }
});
// POST /api/customers/segment-types - add/update a customer segment for the current store
router.post('/segment-types', async (req, res) => {
    try {
        const storeId = req.storeId;
        const userId = req.user?.id || null;
        const role = req.user?.role;
        if (!isCustomerSegmentManager(role)) {
            return res.status(403).json({ error: 'Bạn không có quyền quản lý loại khách hàng của cửa hàng' });
        }
        const segmentLabel = String(req.body.segmentLabel || '').trim();
        if (!segmentLabel) {
            return res.status(400).json({ error: 'Tên loại khách hàng không được để trống' });
        }
        const segmentKey = normalizeCustomerSegment(req.body.segmentKey || segmentLabel);
        if (!segmentKey) {
            return res.status(400).json({ error: 'Mã loại khách hàng không hợp lệ' });
        }
        if (segmentKey === 'worker' || segmentKey === 'tho') {
            return res.status(400).json({ error: 'Loại khách hàng "Thợ" đã bị tắt cho mô hình cửa hàng sữa' });
        }
        const baseCustomerType = String(req.body.baseCustomerType || 'personal').toLowerCase() === 'business' ? 'business' : 'personal';
        const defaultDiscountRate = Math.max(0, Math.min(100, Number(req.body.defaultDiscountRate ?? 0)));
        await seedDefaultStoreCustomerSegments(storeId, req.user?.id);
        await (0, db_1.query)(`MERGE StoreCustomerSegments AS target
       USING (SELECT @storeId AS store_id, @segmentKey AS segment_key) AS source
       ON target.store_id = source.store_id AND target.segment_key = source.segment_key
       WHEN MATCHED THEN
         UPDATE SET
           segment_label = @segmentLabel,
           base_customer_type = @baseCustomerType,
           default_discount_rate = @defaultDiscountRate,
           is_active = 1,
           updated_at = GETDATE()
       WHEN NOT MATCHED THEN
         INSERT (id, store_id, segment_key, segment_label, base_customer_type, default_discount_rate, is_active, is_system, created_by, created_at, updated_at)
         VALUES (NEWID(), @storeId, @segmentKey, @segmentLabel, @baseCustomerType, @defaultDiscountRate, 1, 0, @userId, GETDATE(), GETDATE());`, {
            storeId,
            segmentKey,
            segmentLabel,
            baseCustomerType,
            defaultDiscountRate,
            userId,
        });
        res.status(201).json({
            success: true,
            data: {
                segmentKey,
                segmentLabel,
                baseCustomerType,
                defaultDiscountRate,
                isActive: true,
                isSystem: false,
            },
        });
    }
    catch (error) {
        console.error('Create customer segment type error:', error);
        res.status(500).json({ error: 'Failed to create customer segment type' });
    }
});
function calculateLoyaltyTier(lifetimePoints, tierRules) {
    for (const tier of tierRules) {
        if (lifetimePoints >= tier.threshold) {
            return tier.name;
        }
    }
    return 'bronze';
}
// GET /api/customers
// Requirements: 3.4 - Uses sp_Customers_GetByStore
router.get('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { page = '1', pageSize = '50', search, status, customerType } = req.query;
        await ensureCustomerDiscountTables();
        await seedDefaultStoreCustomerSegments(storeId, req.user?.id);
        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);
        // Use SP Repository instead of inline query
        let customers = await customers_sp_repository_1.customersSPRepository.getByStore(storeId);
        // Apply filters
        if (search) {
            const searchLower = search.toLowerCase();
            customers = customers.filter((c) => c.name?.toLowerCase().includes(searchLower) ||
                c.phone?.toLowerCase().includes(searchLower) ||
                c.email?.toLowerCase().includes(searchLower));
        }
        if (status && status !== 'all') {
            customers = customers.filter((c) => c.status === status);
        }
        if (customerType && customerType !== 'all') {
            customers = customers.filter((c) => c.customerType === customerType);
        }
        // Calculate pagination
        const total = customers.length;
        const totalPages = Math.ceil(total / pageSizeNum);
        const offset = (pageNum - 1) * pageSizeNum;
        const paginatedCustomers = customers.slice(offset, offset + pageSizeNum);
        const customerIds = paginatedCustomers.map((c) => c.id).filter(Boolean);
        const profiles = customerIds.length
            ? await (0, db_1.query)(`SELECT p.customer_id, p.customer_segment, p.discount_rate, s.segment_label
           FROM CustomerDiscountProfiles p
           LEFT JOIN StoreCustomerSegments s
             ON s.store_id = p.store_id AND s.segment_key = p.customer_segment
           WHERE p.store_id = @storeId AND p.customer_id IN (${customerIds.map((_, i) => `@id${i}`).join(',')})`, {
                storeId,
                ...Object.fromEntries(customerIds.map((id, i) => [`id${i}`, id])),
            })
            : [];
        const discountSummary = customerIds.length
            ? await (0, db_1.query)(`SELECT
             customer_id,
             SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS total_pending,
             SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS total_paid,
             SUM(amount) AS total_all
           FROM CustomerDiscountTransactions
           WHERE store_id = @storeId AND customer_id IN (${customerIds.map((_, i) => `@sid${i}`).join(',')})
           GROUP BY customer_id`, {
                storeId,
                ...Object.fromEntries(customerIds.map((id, i) => [`sid${i}`, id])),
            })
            : [];
        const profileMap = new Map(profiles.map((p) => [p.customer_id, p]));
        const summaryMap = new Map(discountSummary.map((s) => [s.customer_id, s]));
        const tierRules = await getConfiguredLoyaltyTierRules(storeId);
        res.json({
            success: true,
            data: paginatedCustomers.map((c) => {
                const profile = profileMap.get(c.id);
                const summary = summaryMap.get(c.id);
                const lifetimePoints = c.lifetimePoints ?? 0;
                const debt = c.calculatedDebt ?? c.totalDebt ?? 0;
                return {
                    id: c.id,
                    storeId: c.storeId,
                    email: c.email,
                    name: c.name,
                    phone: c.phone,
                    address: c.address,
                    customerType: c.customerType,
                    customerSegment: profile?.customer_segment || c.customerType || 'personal',
                    customerSegmentLabel: profile?.segment_label || null,
                    discountRate: Number(profile?.discount_rate || 0),
                    totalDiscountPending: Number(summary?.total_pending || 0),
                    totalDiscountPaid: Number(summary?.total_paid || 0),
                    totalDiscountAll: Number(summary?.total_all || 0),
                    customerGroup: c.customerGroup,
                    gender: c.gender,
                    birthday: c.birthday,
                    zalo: c.zalo,
                    bankName: c.bankName,
                    bankAccountNumber: c.bankAccountNumber,
                    bankBranch: c.bankBranch,
                    creditLimit: c.creditLimit ?? 0,
                    status: c.status,
                    loyaltyTier: calculateLoyaltyTier(lifetimePoints, tierRules),
                    loyaltyPoints: c.loyaltyPoints ?? 0,
                    lifetimePoints: lifetimePoints,
                    notes: c.notes,
                    totalDebt: debt,
                    totalPaid: c.totalPaid ?? 0,
                    calculatedDebt: debt,
                    currentDebt: debt,
                    totalPayments: c.totalPaid ?? 0,
                    createdAt: c.createdAt,
                    updatedAt: c.updatedAt,
                };
            }),
            total,
            page: pageNum,
            pageSize: pageSizeNum,
            totalPages,
        });
    }
    catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ error: 'Failed to get customers' });
    }
});
// GET /api/customers/:id
router.get('/:id', (0, validate_uuid_1.validateUUID)(), validate_uuid_1.debugRequest, async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        await ensureCustomerDiscountTables();
        // Use SP Repository instead of inline query
        const customer = await customers_sp_repository_1.customersSPRepository.getById(id, storeId);
        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        const tierRules = await getConfiguredLoyaltyTierRules(storeId);
        // Calculate tier based on configured thresholds
        const lifetimePoints = customer.lifetimePoints ?? 0;
        const calculatedTier = calculateLoyaltyTier(lifetimePoints, tierRules);
        const debt = customer.calculatedDebt ?? customer.totalDebt ?? 0;
        const profile = await (0, db_1.queryOne)(`SELECT p.customer_segment, p.discount_rate, s.segment_label
       FROM CustomerDiscountProfiles p
       LEFT JOIN StoreCustomerSegments s
         ON s.store_id = p.store_id AND s.segment_key = p.customer_segment
       WHERE p.customer_id = @customerId AND p.store_id = @storeId`, { customerId: id, storeId });
        const discountSummary = await (0, db_1.queryOne)(`SELECT
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS total_pending,
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS total_paid,
         SUM(amount) AS total_all
       FROM CustomerDiscountTransactions
       WHERE customer_id = @customerId AND store_id = @storeId`, { customerId: id, storeId });
        res.json({
            id: customer.id,
            storeId: customer.storeId,
            email: customer.email,
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            customerType: customer.customerType,
            customerSegment: profile?.customer_segment || customer.customerType || 'personal',
            customerSegmentLabel: profile?.segment_label || null,
            discountRate: Number(profile?.discount_rate || 0),
            totalDiscountPending: Number(discountSummary?.total_pending || 0),
            totalDiscountPaid: Number(discountSummary?.total_paid || 0),
            totalDiscountAll: Number(discountSummary?.total_all || 0),
            customerGroup: customer.customerGroup,
            gender: customer.gender,
            birthday: customer.birthday,
            zalo: customer.zalo,
            bankName: customer.bankName,
            bankAccountNumber: customer.bankAccountNumber,
            bankBranch: customer.bankBranch,
            creditLimit: customer.creditLimit ?? 0,
            status: customer.status,
            loyaltyTier: calculatedTier, // Use calculated tier instead of stored
            loyaltyPoints: customer.loyaltyPoints ?? 0,
            lifetimePoints: lifetimePoints,
            notes: customer.notes,
            totalDebt: debt,
            currentDebt: debt, // Alias for frontend
            calculatedDebt: debt,
            totalPaid: customer.totalPaid ?? 0,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt,
        });
    }
    catch (error) {
        console.error('Get customer error:', error);
        res.status(500).json({ error: 'Failed to get customer' });
    }
});
// POST /api/customers
// Requirements: 3.1 - Uses sp_Customers_Create
router.post('/', validate_uuid_1.debugRequest, async (req, res) => {
    try {
        const storeId = req.storeId;
        const canEditDiscountRate = isCustomerSegmentManager(req.user?.role);
        const { name, email, phone, address, customerType, customerSegment, discountRate, customerGroup, gender, birthday, zalo, bankName, bankAccountNumber, bankBranch, creditLimit, loyaltyTier, loyaltyPoints, lifetimePoints, status, notes, } = req.body;
        // Validate required fields
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Customer name is required' });
        }
        if ((discountRate ?? '') !== '' && !canEditDiscountRate) {
            return res.status(403).json({ error: 'Chỉ tài khoản quản lý mới được sửa chiết khấu theo %' });
        }
        const customerId = (0, uuid_1.v4)();
        console.log(`🔄 Creating customer with ID: ${customerId}`);
        // Use SP Repository instead of inline query
        const selectedSegmentConfig = await resolveStoreCustomerSegmentConfig(storeId, customerSegment || customerType || 'personal', req.user?.id);
        const normalizedSegment = selectedSegmentConfig.segmentKey;
        const finalCustomerType = selectedSegmentConfig.baseCustomerType;
        const customer = await customers_sp_repository_1.customersSPRepository.create({
            id: customerId,
            storeId,
            name,
            email: email || null,
            phone: phone || null,
            address: address || null,
            customerType: finalCustomerType,
            customerGroup: customerGroup || null,
            gender: gender || null,
            birthday: birthday || null,
            zalo: zalo || null,
            bankName: bankName || null,
            bankAccountNumber: bankAccountNumber || null,
            bankBranch: bankBranch || null,
            creditLimit: creditLimit ?? 0,
            loyaltyTier: loyaltyTier || 'bronze',
            loyaltyPoints: loyaltyPoints ?? 0,
            lifetimePoints: lifetimePoints ?? 0,
            status: status || 'active',
            notes: notes || null,
        });
        const normalizedDiscountRate = !canEditDiscountRate || discountRate === undefined || discountRate === null || discountRate === ''
            ? Number(selectedSegmentConfig.defaultDiscountRate || await getDefaultDiscountRate(normalizedSegment, 'bronze'))
            : Math.max(0, Number(discountRate || 0));
        await upsertCustomerDiscountProfile(customer.id, storeId, normalizedSegment, normalizedDiscountRate);
        res.status(201).json({ id: customer.id, success: true });
    }
    catch (error) {
        console.error('❌ Create customer error:', error);
        // Handle specific database errors
        if (error.message?.includes('UNIQUE KEY constraint')) {
            return res.status(409).json({ error: 'Customer with this information already exists' });
        }
        if (error.message?.includes('Conversion failed')) {
            return res.status(400).json({ error: 'Invalid data format provided' });
        }
        res.status(500).json({ error: 'Failed to create customer', details: error.message });
    }
});
// PUT /api/customers/:id
// Requirements: 3.2 - Uses sp_Customers_Update
router.put('/:id', (0, validate_uuid_1.validateUUID)(), validate_uuid_1.debugRequest, async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const canEditDiscountRate = isCustomerSegmentManager(req.user?.role);
        const { name, email, phone, address, customerType, customerSegment, discountRate, customerGroup, gender, birthday, zalo, bankName, bankAccountNumber, bankBranch, creditLimit, loyaltyTier, loyaltyPoints, lifetimePoints, status, notes, } = req.body;
        console.log(`🔄 Updating customer ${id} for store ${storeId}`);
        console.log('📊 Update data:', JSON.stringify(req.body, null, 2));
        if ((discountRate ?? '') !== '' && !canEditDiscountRate) {
            return res.status(403).json({ error: 'Chỉ tài khoản quản lý mới được sửa chiết khấu theo %' });
        }
        // Use SP Repository instead of inline query
        const selectedSegmentConfig = customerType !== undefined || customerSegment !== undefined
            ? await resolveStoreCustomerSegmentConfig(storeId, customerSegment || customerType || 'personal', req.user?.id)
            : null;
        const normalizedSegment = selectedSegmentConfig?.segmentKey || normalizeCustomerSegment(customerSegment || customerType || 'personal');
        const finalCustomerType = selectedSegmentConfig?.baseCustomerType || 'personal';
        const customer = await customers_sp_repository_1.customersSPRepository.update(id, storeId, {
            name,
            email: email !== undefined ? email : undefined,
            phone: phone !== undefined ? phone : undefined,
            address: address !== undefined ? address : undefined,
            customerType: customerType !== undefined || customerSegment !== undefined ? finalCustomerType : undefined,
            customerGroup: customerGroup !== undefined ? customerGroup : undefined,
            gender: gender !== undefined ? gender : undefined,
            birthday: birthday !== undefined ? birthday : undefined,
            zalo: zalo !== undefined ? zalo : undefined,
            bankName: bankName !== undefined ? bankName : undefined,
            bankAccountNumber: bankAccountNumber !== undefined ? bankAccountNumber : undefined,
            bankBranch: bankBranch !== undefined ? bankBranch : undefined,
            creditLimit: creditLimit !== undefined ? creditLimit : undefined,
            loyaltyTier: loyaltyTier !== undefined ? loyaltyTier : undefined,
            loyaltyPoints: loyaltyPoints !== undefined ? loyaltyPoints : undefined,
            lifetimePoints: lifetimePoints !== undefined ? lifetimePoints : undefined,
            status: status !== undefined ? status : undefined,
            notes: notes !== undefined ? notes : undefined,
        });
        if (!customer) {
            console.log('❌ Customer not found');
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        if (customerSegment !== undefined || discountRate !== undefined) {
            const existingProfile = await (0, db_1.queryOne)(`SELECT customer_segment
         FROM CustomerDiscountProfiles
         WHERE customer_id = @customerId AND store_id = @storeId`, { customerId: id, storeId });
            const activeSegmentConfig = selectedSegmentConfig
                ? selectedSegmentConfig
                : await resolveStoreCustomerSegmentConfig(storeId, existingProfile?.customer_segment || 'personal', req.user?.id);
            const normalizedDiscountRate = !canEditDiscountRate || discountRate === undefined || discountRate === null || discountRate === ''
                ? Number(activeSegmentConfig.defaultDiscountRate || await getDefaultDiscountRate(activeSegmentConfig.segmentKey, customer.loyaltyTier))
                : Math.max(0, Number(discountRate || 0));
            await upsertCustomerDiscountProfile(id, storeId, activeSegmentConfig.segmentKey, normalizedDiscountRate);
        }
        console.log('✅ Customer updated successfully');
        res.json(customer);
    }
    catch (error) {
        console.error('❌ Update customer error:', error);
        console.error('📊 Request body:', JSON.stringify(req.body, null, 2));
        console.error('📊 Customer ID:', req.params.id);
        console.error('📊 Store ID:', req.storeId);
        // Handle specific database errors
        if (error.message?.includes('Conversion failed')) {
            return res.status(400).json({ error: 'Invalid data format provided', details: error.message });
        }
        res.status(500).json({ error: 'Failed to update customer', details: error.message });
    }
});
// DELETE /api/customers/:id
// Requirements: 3.3 - Uses sp_Customers_Delete
router.delete('/:id', (0, validate_uuid_1.validateUUID)(), validate_uuid_1.debugRequest, async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const user = req.user;
        // Check if force delete is requested (admin only)
        const forceDelete = req.query.force === 'true' || req.body.force === true;
        // Only admin/owner can force delete
        const canForceDelete = ['admin', 'owner'].includes(user.role) && forceDelete;
        console.log(`🔄 Deleting customer ${id} (force: ${canForceDelete})`);
        // Use SP Repository instead of inline query
        const deleted = await customers_sp_repository_1.customersSPRepository.delete(id, storeId, canForceDelete);
        if (!deleted) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        console.log('✅ Customer deleted successfully');
        res.json({ success: true });
    }
    catch (error) {
        console.error('❌ Delete customer error:', error);
        // Handle specific database errors
        if (error.message?.includes('Cannot delete customer with existing transactions')) {
            return res.status(409).json({
                error: 'Cannot delete customer with existing transactions',
                details: 'This customer has sales or payment records. Only admins can force delete.',
                canForceDelete: ['admin', 'owner'].includes(req.user?.role || '')
            });
        }
        if (error.message?.includes('FOREIGN KEY constraint')) {
            return res.status(409).json({
                error: 'Cannot delete customer with existing transactions',
                details: 'Please remove all sales and payments for this customer first'
            });
        }
        res.status(500).json({ error: 'Failed to delete customer', details: error.message });
    }
});
// PUT /api/customers/:id/debt
// Requirements: 3.5 - Uses sp_Customers_UpdateDebt
router.put('/:id/debt', (0, validate_uuid_1.validateUUID)(), validate_uuid_1.debugRequest, async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const { spentAmount, paidAmount } = req.body;
        // Use SP Repository for debt update
        const newDebt = await customers_sp_repository_1.customersSPRepository.updateDebt(id, storeId, spentAmount || 0, paidAmount || 0);
        res.json({ success: true, totalDebt: newDebt });
    }
    catch (error) {
        console.error('Update customer debt error:', error);
        res.status(500).json({ error: 'Failed to update customer debt' });
    }
});
// GET /api/customers/:id/history
// Requirements: 3.6 - Uses sp_Customers_GetDebtHistory
router.get('/:id/history', (0, validate_uuid_1.validateUUID)(), validate_uuid_1.debugRequest, async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        // Get customer to validate it exists
        const customer = await customers_sp_repository_1.customersSPRepository.getById(id, storeId);
        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        // Get debt history
        const history = await customers_sp_repository_1.customersSPRepository.getDebtHistory(id, storeId);
        res.json({
            success: true,
            customerId: id,
            history,
        });
    }
    catch (error) {
        console.error('Get customer debt history error:', error);
        res.status(500).json({ error: 'Failed to get customer debt history' });
    }
});
// GET /api/customers/:id/discounts - Detail discount transactions for customer
router.get('/:id/discounts', (0, validate_uuid_1.validateUUID)(), async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        await ensureCustomerDiscountTables();
        const rows = await (0, db_1.query)(`SELECT id, amount, description, status, paid_at, paid_amount,
              discount_rate, discount_percent_of_invoice,
              source_sale_id, invoice_number, invoice_date, invoice_total_amount, invoice_final_amount,
              payout_id, payment_note, created_at
       FROM CustomerDiscountTransactions
       WHERE customer_id = @customerId AND store_id = @storeId
       ORDER BY created_at DESC`, { customerId: id, storeId });
        res.json({ success: true, data: rows });
    }
    catch (error) {
        console.error('Get customer discounts error:', error);
        res.status(500).json({ error: 'Failed to get customer discounts' });
    }
});
// POST /api/customers/:id/discounts - Add discount transaction
router.post('/:id/discounts', (0, validate_uuid_1.validateUUID)(), async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const userId = req.user?.id || null;
        const amount = Number(req.body.amount || 0);
        const description = req.body.description ? String(req.body.description) : null;
        const discountRate = req.body.discountRate !== undefined ? Math.max(0, Number(req.body.discountRate || 0)) : null;
        const discountPercentOfInvoice = req.body.discountPercentOfInvoice !== undefined
            ? Math.max(0, Number(req.body.discountPercentOfInvoice || 0))
            : null;
        const sourceSaleId = req.body.sourceSaleId ? String(req.body.sourceSaleId) : null;
        const invoiceNumber = req.body.invoiceNumber ? String(req.body.invoiceNumber) : null;
        const invoiceDate = req.body.invoiceDate ? new Date(req.body.invoiceDate) : null;
        const invoiceTotalAmount = req.body.invoiceTotalAmount !== undefined
            ? Math.max(0, Number(req.body.invoiceTotalAmount || 0))
            : null;
        const invoiceFinalAmount = req.body.invoiceFinalAmount !== undefined
            ? Math.max(0, Number(req.body.invoiceFinalAmount || 0))
            : null;
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }
        if (discountRate !== null && (!Number.isFinite(discountRate) || discountRate <= 0)) {
            return res.status(400).json({ error: 'Discount rate must be greater than 0%' });
        }
        if (discountPercentOfInvoice !== null &&
            (!Number.isFinite(discountPercentOfInvoice) || discountPercentOfInvoice <= 0)) {
            return res.status(400).json({ error: 'Discount percent of invoice must be greater than 0%' });
        }
        await ensureCustomerDiscountTables();
        await (0, db_1.query)(`INSERT INTO CustomerDiscountTransactions
         (id, customer_id, store_id, amount, description, status, created_by,
          discount_rate, discount_percent_of_invoice,
          source_sale_id, invoice_number, invoice_date, invoice_total_amount, invoice_final_amount,
          created_at, updated_at)
       VALUES
         (@id, @customerId, @storeId, @amount, @description, 'pending', @createdBy,
          @discountRate, @discountPercentOfInvoice,
          @sourceSaleId, @invoiceNumber, @invoiceDate, @invoiceTotalAmount, @invoiceFinalAmount,
          GETDATE(), GETDATE())`, {
            id: (0, uuid_1.v4)(),
            customerId: id,
            storeId,
            amount,
            description,
            createdBy: userId,
            discountRate,
            discountPercentOfInvoice,
            sourceSaleId,
            invoiceNumber,
            invoiceDate,
            invoiceTotalAmount,
            invoiceFinalAmount,
        });
        res.status(201).json({ success: true });
    }
    catch (error) {
        console.error('Create customer discount error:', error);
        res.status(500).json({ error: 'Failed to create customer discount' });
    }
});
// PUT /api/customers/:id/discounts/:discountId - Update pending discount transaction
router.put('/:id/discounts/:discountId', (0, validate_uuid_1.validateUUID)(), async (req, res) => {
    try {
        const { id, discountId } = req.params;
        const storeId = req.storeId;
        const amount = Number(req.body.amount || 0);
        const description = req.body.description ? String(req.body.description) : null;
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }
        await ensureCustomerDiscountTables();
        await (0, db_1.query)(`UPDATE CustomerDiscountTransactions
       SET amount = @amount,
           description = @description,
           updated_at = GETDATE()
       WHERE id = @discountId AND customer_id = @customerId AND store_id = @storeId AND status = 'pending'`, {
            discountId,
            customerId: id,
            storeId,
            amount,
            description,
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Update customer discount error:', error);
        res.status(500).json({ error: 'Failed to update customer discount' });
    }
});
// DELETE /api/customers/:id/discounts/:discountId - Delete pending discount transaction
router.delete('/:id/discounts/:discountId', (0, validate_uuid_1.validateUUID)(), async (req, res) => {
    try {
        const { id, discountId } = req.params;
        const storeId = req.storeId;
        await ensureCustomerDiscountTables();
        await (0, db_1.query)(`DELETE FROM CustomerDiscountTransactions
       WHERE id = @discountId AND customer_id = @customerId AND store_id = @storeId AND status = 'pending'`, {
            discountId,
            customerId: id,
            storeId,
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete customer discount error:', error);
        res.status(500).json({ error: 'Failed to delete customer discount' });
    }
});
// GET /api/customers/:id/discounts/payouts - payout history with transfer details
router.get('/:id/discounts/payouts', (0, validate_uuid_1.validateUUID)(), async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        await ensureCustomerDiscountTables();
        const rows = await (0, db_1.query)(`SELECT id, total_amount, transaction_count, payout_method,
              transfer_reference, transfer_note,
              transfer_account_name, transfer_account_number, transfer_bank_name,
              customer_bank_name, customer_bank_account_number, customer_bank_branch,
              paid_at, created_by, created_at
       FROM CustomerDiscountPayouts
       WHERE customer_id = @customerId AND store_id = @storeId
       ORDER BY paid_at DESC`, { customerId: id, storeId });
        res.json({ success: true, data: rows });
    }
    catch (error) {
        console.error('Get customer discount payouts error:', error);
        res.status(500).json({ error: 'Failed to get customer discount payouts' });
    }
});
// POST /api/customers/:id/discounts/pay - Mark pending discounts as paid
router.post('/:id/discounts/pay', (0, validate_uuid_1.validateUUID)(), async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const userId = req.user?.id || null;
        const paymentNote = req.body.paymentNote ? String(req.body.paymentNote) : null;
        const payoutMethod = req.body.payoutMethod ? String(req.body.payoutMethod).toLowerCase() : 'cash';
        const transferReference = req.body.transferReference ? String(req.body.transferReference) : null;
        const transferAccountName = req.body.transferAccountName ? String(req.body.transferAccountName) : null;
        const transferAccountNumber = req.body.transferAccountNumber ? String(req.body.transferAccountNumber) : null;
        const transferBankName = req.body.transferBankName ? String(req.body.transferBankName) : null;
        const requiresCustomerBankAccount = payoutMethod === 'bank_transfer' || payoutMethod === 'transfer' || payoutMethod === 'bank';
        await ensureCustomerDiscountTables();
        const customerBankInfo = await (0, db_1.queryOne)(`SELECT full_name AS name, bank_name, bank_account_number, bank_branch
       FROM Customers
       WHERE id = @customerId AND store_id = @storeId`, { customerId: id, storeId });
        if (!customerBankInfo) {
            return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
        }
        if (requiresCustomerBankAccount && !String(customerBankInfo.bank_account_number || '').trim()) {
            return res.status(400).json({
                error: `Khách hàng ${customerBankInfo.name || id} không có số tài khoản ngân hàng. Vui lòng cập nhật trước khi thanh toán chuyển khoản.`,
            });
        }
        const pending = await (0, db_1.queryOne)(`SELECT SUM(amount) AS total
       FROM CustomerDiscountTransactions
       WHERE customer_id = @customerId AND store_id = @storeId AND status = 'pending'`, { customerId: id, storeId });
        const pendingCount = await (0, db_1.queryOne)(`SELECT COUNT(*) AS total
       FROM CustomerDiscountTransactions
       WHERE customer_id = @customerId AND store_id = @storeId AND status = 'pending'`, { customerId: id, storeId });
        const totalPaidAmount = Number(pending?.total || 0);
        const transactionCount = Number(pendingCount?.total || 0);
        if (transactionCount <= 0 || totalPaidAmount <= 0) {
            return res.status(400).json({ error: 'Không có chiết khấu chờ thanh toán' });
        }
        const payoutId = (0, uuid_1.v4)();
        // Save payout into cash flow so it appears in So quy / Thu-Chi / Tat ca giao dich.
        await (0, db_1.query)(`IF OBJECT_ID('CashTransactions', 'U') IS NOT NULL
       BEGIN
         INSERT INTO CashTransactions
           (id, store_id, type, transaction_date, amount, reason, category, related_invoice_id, created_by, created_at)
         VALUES
           (@id, @storeId, 'chi', GETDATE(), @amount, @reason, @category, @relatedInvoiceId, @createdBy, GETDATE())
       END`, {
            id: (0, uuid_1.v4)(),
            storeId,
            amount: totalPaidAmount,
            reason: `Thanh toán chiết khấu khách hàng ${customerBankInfo?.name || id}`,
            category: 'customer_discount_payout',
            relatedInvoiceId: payoutId,
            createdBy: userId,
        });
        await (0, db_1.query)(`INSERT INTO CustomerDiscountPayouts
         (id, customer_id, store_id, total_amount, transaction_count,
          payout_method, transfer_reference, transfer_note,
          transfer_account_name, transfer_account_number, transfer_bank_name,
          customer_bank_name, customer_bank_account_number, customer_bank_branch,
          paid_at, created_by, created_at)
       VALUES
         (@id, @customerId, @storeId, @totalAmount, @transactionCount,
          @payoutMethod, @transferReference, @transferNote,
          @transferAccountName, @transferAccountNumber, @transferBankName,
          @customerBankName, @customerBankAccountNumber, @customerBankBranch,
          GETDATE(), @createdBy, GETDATE())`, {
            id: payoutId,
            customerId: id,
            storeId,
            totalAmount: totalPaidAmount,
            transactionCount,
            payoutMethod,
            transferReference,
            transferNote: paymentNote,
            transferAccountName,
            transferAccountNumber,
            transferBankName,
            customerBankName: customerBankInfo.bank_name,
            customerBankAccountNumber: customerBankInfo.bank_account_number,
            customerBankBranch: customerBankInfo.bank_branch,
            createdBy: userId,
        });
        await (0, db_1.query)(`UPDATE CustomerDiscountTransactions
       SET status = 'paid',
           paid_at = GETDATE(),
           paid_amount = amount,
           paid_by = @paidBy,
           payout_id = @payoutId,
           payment_note = COALESCE(@paymentNote, payment_note),
           updated_at = GETDATE()
       WHERE customer_id = @customerId AND store_id = @storeId AND status = 'pending'`, { customerId: id, storeId, paymentNote, paidBy: userId, payoutId });
        res.json({ success: true, paidAmount: totalPaidAmount, payoutId });
    }
    catch (error) {
        console.error('Pay customer discounts error:', error);
        res.status(500).json({ error: 'Failed to pay customer discounts' });
    }
});
// GET /api/customers/discount-defaults - default discount rate by segment and loyalty tier
router.get('/discount-defaults/list', async (_req, res) => {
    try {
        await ensureCustomerDiscountTables();
        const rows = await (0, db_1.query)(`SELECT customer_segment, bronze_rate, silver_rate, gold_rate, diamond_rate
       FROM CustomerDiscountDefaultRates
       ORDER BY customer_segment`);
        res.json({ success: true, data: rows });
    }
    catch (error) {
        console.error('Get discount default rates error:', error);
        res.status(500).json({ error: 'Failed to get discount default rates' });
    }
});
// PUT /api/customers/discount-defaults/:segment - update default discount rates
router.put('/discount-defaults/:segment', async (req, res) => {
    try {
        if (!isCustomerSegmentManager(req.user?.role)) {
            return res.status(403).json({ error: 'Chỉ tài khoản quản lý mới được sửa mức chiết khấu mặc định' });
        }
        const segment = normalizeCustomerSegment(req.params.segment);
        const bronze = Math.max(0, Number(req.body.bronzeRate || 0));
        const silver = Math.max(0, Number(req.body.silverRate || 0));
        const gold = Math.max(0, Number(req.body.goldRate || 0));
        const diamond = Math.max(0, Number(req.body.diamondRate || 0));
        await ensureCustomerDiscountTables();
        await (0, db_1.query)(`MERGE CustomerDiscountDefaultRates AS target
       USING (SELECT @segment AS customer_segment) AS source
       ON target.customer_segment = source.customer_segment
       WHEN MATCHED THEN
         UPDATE SET
           bronze_rate = @bronze,
           silver_rate = @silver,
           gold_rate = @gold,
           diamond_rate = @diamond,
           updated_at = GETDATE()
       WHEN NOT MATCHED THEN
         INSERT (customer_segment, bronze_rate, silver_rate, gold_rate, diamond_rate, updated_at)
         VALUES (@segment, @bronze, @silver, @gold, @diamond, GETDATE());`, {
            segment,
            bronze,
            silver,
            gold,
            diamond,
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Update discount default rates error:', error);
        res.status(500).json({ error: 'Failed to update discount default rates' });
    }
});
exports.default = router;
//# sourceMappingURL=customers.js.map