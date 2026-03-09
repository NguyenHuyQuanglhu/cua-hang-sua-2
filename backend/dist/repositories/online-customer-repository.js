"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onlineCustomerRepository = exports.OnlineCustomerRepository = void 0;
const db_1 = require("../db");
/**
 * Online Customer repository for managing online store customers
 */
class OnlineCustomerRepository {
    /**
     * Map database record to OnlineCustomer entity
     */
    mapCustomerToEntity(record) {
        return {
            id: record.id,
            onlineStoreId: record.online_store_id,
            email: record.email,
            passwordHash: record.password_hash,
            firstName: record.first_name,
            lastName: record.last_name,
            phone: record.phone || undefined,
            defaultAddressId: record.default_address_id || undefined,
            isActive: record.is_active,
            isVerified: record.is_verified,
            createdAt: record.created_at instanceof Date
                ? record.created_at.toISOString()
                : String(record.created_at),
            updatedAt: record.updated_at instanceof Date
                ? record.updated_at.toISOString()
                : String(record.updated_at),
            lastLoginAt: record.last_login_at instanceof Date
                ? record.last_login_at.toISOString()
                : record.last_login_at ? String(record.last_login_at) : undefined,
        };
    }
    /**
     * Map database record to CustomerAddress entity
     */
    mapAddressToEntity(record) {
        return {
            id: record.id,
            customerId: record.customer_id,
            label: record.label,
            fullName: record.full_name,
            phone: record.phone,
            province: record.province,
            district: record.district,
            ward: record.ward,
            addressLine: record.address_line,
            isDefault: record.is_default,
            createdAt: record.created_at instanceof Date
                ? record.created_at.toISOString()
                : String(record.created_at),
            updatedAt: record.updated_at instanceof Date
                ? record.updated_at.toISOString()
                : String(record.updated_at),
        };
    }
    /**
     * Find customer by ID
     */
    async findById(id, onlineStoreId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM OnlineCustomers WHERE id = @id AND online_store_id = @onlineStoreId`, { id, onlineStoreId });
        return result ? this.mapCustomerToEntity(result) : null;
    }
    /**
     * Find customer by email (for authentication)
     */
    async findByEmail(email, onlineStoreId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM OnlineCustomers WHERE email = @email AND online_store_id = @onlineStoreId`, { email, onlineStoreId });
        return result ? this.mapCustomerToEntity(result) : null;
    }
    /**
     * Check if email exists
     */
    async emailExists(email, onlineStoreId, excludeId) {
        let queryString = `SELECT 1 FROM OnlineCustomers WHERE email = @email AND online_store_id = @onlineStoreId`;
        const params = { email, onlineStoreId };
        if (excludeId) {
            queryString += ` AND id != @excludeId`;
            params.excludeId = excludeId;
        }
        const result = await (0, db_1.queryOne)(queryString, params);
        return result !== null;
    }
    /**
     * Create a new customer (registration)
     */
    async create(data) {
        // Check if email already exists
        const exists = await this.emailExists(data.email, data.onlineStoreId);
        if (exists) {
            throw new Error('Email already exists');
        }
        const id = crypto.randomUUID();
        await (0, db_1.query)(`INSERT INTO OnlineCustomers (
        id, online_store_id, email, password_hash, first_name, last_name, phone,
        is_active, is_verified, created_at, updated_at
      ) VALUES (
        @id, @onlineStoreId, @email, @passwordHash, @firstName, @lastName, @phone,
        1, 0, GETDATE(), GETDATE()
      )`, {
            id,
            onlineStoreId: data.onlineStoreId,
            email: data.email,
            passwordHash: data.passwordHash,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone || null,
        });
        const created = await this.findById(id, data.onlineStoreId);
        if (!created) {
            throw new Error('Failed to create customer');
        }
        return created;
    }
    /**
     * Update customer profile
     */
    async update(id, data, onlineStoreId) {
        const existing = await this.findById(id, onlineStoreId);
        if (!existing) {
            throw new Error('Customer not found');
        }
        await (0, db_1.query)(`UPDATE OnlineCustomers SET
        first_name = @firstName,
        last_name = @lastName,
        phone = @phone,
        updated_at = GETDATE()
      WHERE id = @id AND online_store_id = @onlineStoreId`, {
            id,
            onlineStoreId,
            firstName: data.firstName ?? existing.firstName,
            lastName: data.lastName ?? existing.lastName,
            phone: data.phone ?? existing.phone ?? null,
        });
        const updated = await this.findById(id, onlineStoreId);
        if (!updated) {
            throw new Error('Failed to update customer');
        }
        return updated;
    }
    /**
     * Update password
     */
    async updatePassword(id, passwordHash, onlineStoreId) {
        const existing = await this.findById(id, onlineStoreId);
        if (!existing) {
            throw new Error('Customer not found');
        }
        await (0, db_1.query)(`UPDATE OnlineCustomers SET password_hash = @passwordHash, updated_at = GETDATE() WHERE id = @id AND online_store_id = @onlineStoreId`, { id, onlineStoreId, passwordHash });
        return true;
    }
    /**
     * Update last login timestamp
     */
    async updateLastLogin(id, onlineStoreId) {
        await (0, db_1.query)(`UPDATE OnlineCustomers SET last_login_at = GETDATE() WHERE id = @id AND online_store_id = @onlineStoreId`, { id, onlineStoreId });
        return true;
    }
    /**
     * Verify customer email
     */
    async verifyEmail(id, onlineStoreId) {
        await (0, db_1.query)(`UPDATE OnlineCustomers SET is_verified = 1, updated_at = GETDATE() WHERE id = @id AND online_store_id = @onlineStoreId`, { id, onlineStoreId });
        return true;
    }
    /**
     * Deactivate customer
     */
    async deactivate(id, onlineStoreId) {
        await (0, db_1.query)(`UPDATE OnlineCustomers SET is_active = 0, updated_at = GETDATE() WHERE id = @id AND online_store_id = @onlineStoreId`, { id, onlineStoreId });
        return true;
    }
    /**
     * Get customer with addresses
     */
    async getCustomerWithAddresses(id, onlineStoreId) {
        const customer = await this.findById(id, onlineStoreId);
        if (!customer)
            return null;
        const addresses = await this.getAddresses(id);
        return { ...customer, addresses };
    }
    // ==================== Address Management ====================
    /**
     * Get all addresses for a customer
     */
    async getAddresses(customerId) {
        const results = await (0, db_1.query)(`SELECT * FROM CustomerAddresses WHERE customer_id = @customerId ORDER BY is_default DESC, created_at DESC`, { customerId });
        return results.map((r) => this.mapAddressToEntity(r));
    }
    /**
     * Get address by ID
     */
    async getAddressById(addressId, customerId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM CustomerAddresses WHERE id = @addressId AND customer_id = @customerId`, { addressId, customerId });
        return result ? this.mapAddressToEntity(result) : null;
    }
    /**
     * Get default address
     */
    async getDefaultAddress(customerId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM CustomerAddresses WHERE customer_id = @customerId AND is_default = 1`, { customerId });
        return result ? this.mapAddressToEntity(result) : null;
    }
    /**
     * Create a new address
     */
    async createAddress(data) {
        const id = crypto.randomUUID();
        // If this is the first address or marked as default, clear other defaults
        if (data.isDefault) {
            await (0, db_1.query)(`UPDATE CustomerAddresses SET is_default = 0 WHERE customer_id = @customerId`, { customerId: data.customerId });
        }
        // Check if this is the first address
        const existingCount = await (0, db_1.queryOne)(`SELECT COUNT(*) as count FROM CustomerAddresses WHERE customer_id = @customerId`, { customerId: data.customerId });
        const isFirstAddress = (existingCount?.count ?? 0) === 0;
        await (0, db_1.query)(`INSERT INTO CustomerAddresses (
        id, customer_id, label, full_name, phone, province, district, ward,
        address_line, is_default, created_at, updated_at
      ) VALUES (
        @id, @customerId, @label, @fullName, @phone, @province, @district, @ward,
        @addressLine, @isDefault, GETDATE(), GETDATE()
      )`, {
            id,
            customerId: data.customerId,
            label: data.label,
            fullName: data.fullName,
            phone: data.phone,
            province: data.province,
            district: data.district,
            ward: data.ward,
            addressLine: data.addressLine,
            isDefault: data.isDefault || isFirstAddress,
        });
        // Update customer's default address if this is default
        if (data.isDefault || isFirstAddress) {
            await (0, db_1.query)(`UPDATE OnlineCustomers SET default_address_id = @addressId WHERE id = @customerId`, { addressId: id, customerId: data.customerId });
        }
        const created = await this.getAddressById(id, data.customerId);
        if (!created) {
            throw new Error('Failed to create address');
        }
        return created;
    }
    /**
     * Update an address
     */
    async updateAddress(addressId, customerId, data) {
        const existing = await this.getAddressById(addressId, customerId);
        if (!existing) {
            throw new Error('Address not found');
        }
        // If setting as default, clear other defaults
        if (data.isDefault) {
            await (0, db_1.query)(`UPDATE CustomerAddresses SET is_default = 0 WHERE customer_id = @customerId`, { customerId });
        }
        await (0, db_1.query)(`UPDATE CustomerAddresses SET
        label = @label,
        full_name = @fullName,
        phone = @phone,
        province = @province,
        district = @district,
        ward = @ward,
        address_line = @addressLine,
        is_default = @isDefault,
        updated_at = GETDATE()
      WHERE id = @addressId AND customer_id = @customerId`, {
            addressId,
            customerId,
            label: data.label ?? existing.label,
            fullName: data.fullName ?? existing.fullName,
            phone: data.phone ?? existing.phone,
            province: data.province ?? existing.province,
            district: data.district ?? existing.district,
            ward: data.ward ?? existing.ward,
            addressLine: data.addressLine ?? existing.addressLine,
            isDefault: data.isDefault ?? existing.isDefault,
        });
        // Update customer's default address if this is now default
        if (data.isDefault) {
            await (0, db_1.query)(`UPDATE OnlineCustomers SET default_address_id = @addressId WHERE id = @customerId`, { addressId, customerId });
        }
        const updated = await this.getAddressById(addressId, customerId);
        if (!updated) {
            throw new Error('Failed to update address');
        }
        return updated;
    }
    /**
     * Delete an address
     */
    async deleteAddress(addressId, customerId) {
        const existing = await this.getAddressById(addressId, customerId);
        if (!existing) {
            throw new Error('Address not found');
        }
        await (0, db_1.query)(`DELETE FROM CustomerAddresses WHERE id = @addressId AND customer_id = @customerId`, { addressId, customerId });
        // If deleted address was default, set another as default
        if (existing.isDefault) {
            const remaining = await this.getAddresses(customerId);
            if (remaining.length > 0) {
                await this.setDefaultAddress(remaining[0].id, customerId);
            }
            else {
                // Clear default address from customer
                await (0, db_1.query)(`UPDATE OnlineCustomers SET default_address_id = NULL WHERE id = @customerId`, { customerId });
            }
        }
        return true;
    }
    /**
     * Set address as default
     */
    async setDefaultAddress(addressId, customerId) {
        // Clear all defaults
        await (0, db_1.query)(`UPDATE CustomerAddresses SET is_default = 0 WHERE customer_id = @customerId`, { customerId });
        // Set new default
        await (0, db_1.query)(`UPDATE CustomerAddresses SET is_default = 1, updated_at = GETDATE() WHERE id = @addressId AND customer_id = @customerId`, { addressId, customerId });
        // Update customer's default address
        await (0, db_1.query)(`UPDATE OnlineCustomers SET default_address_id = @addressId WHERE id = @customerId`, { addressId, customerId });
        return true;
    }
}
exports.OnlineCustomerRepository = OnlineCustomerRepository;
// Export singleton instance
exports.onlineCustomerRepository = new OnlineCustomerRepository();
//# sourceMappingURL=online-customer-repository.js.map