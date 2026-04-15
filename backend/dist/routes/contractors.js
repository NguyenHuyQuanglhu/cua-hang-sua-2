"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
function mapContractor(record) {
    return {
        id: record.id,
        storeId: record.store_id,
        name: record.name,
        contactPerson: record.contact_person,
        email: record.email,
        phone: record.phone,
        address: record.address,
        taxCode: record.tax_code,
        identityNumber: record.identity_number,
        description: record.description,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
    };
}
router.get('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { page = '1', pageSize = '50', search } = req.query;
        const pageNum = parseInt(page, 10) || 1;
        const pageSizeNum = parseInt(pageSize, 10) || 50;
        let contractors = await (0, db_1.query)('SELECT * FROM Contractors WHERE store_id = @storeId ORDER BY name', { storeId });
        if (search) {
            const term = search.toLowerCase();
            contractors = contractors.filter((contractor) => String(contractor.name || '').toLowerCase().includes(term) ||
                String(contractor.contact_person || '').toLowerCase().includes(term) ||
                String(contractor.phone || '').toLowerCase().includes(term) ||
                String(contractor.email || '').toLowerCase().includes(term) ||
                String(contractor.identity_number || '').toLowerCase().includes(term));
        }
        const total = contractors.length;
        const totalPages = Math.ceil(total / pageSizeNum);
        const offset = (pageNum - 1) * pageSizeNum;
        const paginatedContractors = contractors.slice(offset, offset + pageSizeNum);
        res.json({
            success: true,
            data: paginatedContractors.map(mapContractor),
            total,
            page: pageNum,
            pageSize: pageSizeNum,
            totalPages,
        });
    }
    catch (error) {
        console.error('Get contractors error:', error);
        res.status(500).json({ error: 'Failed to get contractors' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const contractor = await (0, db_1.queryOne)('SELECT * FROM Contractors WHERE id = @id AND store_id = @storeId', { id, storeId });
        if (!contractor) {
            res.status(404).json({ error: 'Không tìm thấy nhà thầu' });
            return;
        }
        res.json(mapContractor(contractor));
    }
    catch (error) {
        console.error('Get contractor error:', error);
        res.status(500).json({ error: 'Failed to get contractor' });
    }
});
router.post('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { name, contactPerson, email, phone, address, taxCode, identityNumber, description } = req.body;
        if (!name) {
            res.status(400).json({ error: 'Tên nhà thầu là bắt buộc' });
            return;
        }
        const result = await (0, db_1.query)(`INSERT INTO Contractors (
        id, store_id, name, contact_person, email, phone, address, tax_code, identity_number, description, created_at, updated_at
      )
      OUTPUT INSERTED.*
      VALUES (
        NEWID(), @storeId, @name, @contactPerson, @email, @phone, @address, @taxCode, @identityNumber, @description, GETDATE(), GETDATE()
      )`, {
            storeId,
            name,
            contactPerson: contactPerson || null,
            email: email || null,
            phone: phone || null,
            address: address || null,
            taxCode: taxCode || null,
            identityNumber: identityNumber || null,
            description: description || null,
        });
        res.status(201).json(mapContractor(result[0]));
    }
    catch (error) {
        console.error('Create contractor error:', error);
        res.status(500).json({ error: 'Failed to create contractor' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const { name, contactPerson, email, phone, address, taxCode, identityNumber, description } = req.body;
        const existing = await (0, db_1.queryOne)('SELECT id FROM Contractors WHERE id = @id AND store_id = @storeId', { id, storeId });
        if (!existing) {
            res.status(404).json({ error: 'Không tìm thấy nhà thầu' });
            return;
        }
        const updated = await (0, db_1.queryOne)(`UPDATE Contractors SET
        name = COALESCE(@name, name),
        contact_person = COALESCE(@contactPerson, contact_person),
        email = COALESCE(@email, email),
        phone = COALESCE(@phone, phone),
        address = COALESCE(@address, address),
        tax_code = COALESCE(@taxCode, tax_code),
        identity_number = COALESCE(@identityNumber, identity_number),
        description = COALESCE(@description, description),
        updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id AND store_id = @storeId`, {
            id,
            storeId,
            name: name || null,
            contactPerson: contactPerson || null,
            email: email || null,
            phone: phone || null,
            address: address || null,
            taxCode: taxCode || null,
            identityNumber: identityNumber || null,
            description: description || null,
        });
        if (!updated) {
            res.status(500).json({ error: 'Failed to update contractor' });
            return;
        }
        res.json(mapContractor(updated));
    }
    catch (error) {
        console.error('Update contractor error:', error);
        res.status(500).json({ error: 'Failed to update contractor' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const existing = await (0, db_1.queryOne)('SELECT id FROM Contractors WHERE id = @id AND store_id = @storeId', { id, storeId });
        if (!existing) {
            res.status(404).json({ error: 'Không tìm thấy nhà thầu' });
            return;
        }
        const usage = await (0, db_1.queryOne)('SELECT COUNT(*) as count FROM PurchaseOrders WHERE contractor_id = @id AND store_id = @storeId', { id, storeId });
        if ((usage?.count || 0) > 0) {
            res.status(400).json({ error: 'Không thể xóa nhà thầu đã được gắn vào hóa đơn nhập hàng' });
            return;
        }
        await (0, db_1.query)('DELETE FROM Contractors WHERE id = @id AND store_id = @storeId', { id, storeId });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete contractor error:', error);
        res.status(500).json({ error: 'Failed to delete contractor' });
    }
});
exports.default = router;
//# sourceMappingURL=contractors.js.map