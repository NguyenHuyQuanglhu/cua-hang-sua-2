"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionRepository = exports.BaseRepository = void 0;
const db_1 = require("../db");
const transaction_1 = require("../db/transaction");
/**
 * Base repository class with CRUD operations
 * Implements automatic storeId filtering and pagination support
 * Uses snake_case column names to match database schema
 */
class BaseRepository {
    tableName;
    idColumn;
    constructor(tableName, idColumn = 'id') {
        this.tableName = tableName;
        this.idColumn = idColumn;
    }
    /**
     * Map database record to entity (override in subclass for custom mapping)
     */
    mapToEntity(record) {
        return record;
    }
    /**
     * Map entity to database record (override in subclass for custom mapping)
     */
    mapToRecord(entity) {
        return entity;
    }
    /**
     * Build WHERE clause with storeId filtering (using snake_case)
     */
    buildWhereClause(storeId, additionalConditions) {
        const conditions = ['store_id = @storeId'];
        const params = { storeId };
        if (additionalConditions) {
            Object.entries(additionalConditions).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    conditions.push(`${key} = @${key}`);
                    params[key] = value;
                }
            });
        }
        return {
            clause: conditions.join(' AND '),
            params,
        };
    }
    /**
     * Find all records for a store with optional filtering and ordering
     */
    async findAll(storeId, options) {
        const { clause, params } = this.buildWhereClause(storeId, options?.where);
        let queryString = `SELECT * FROM ${this.tableName} WHERE ${clause}`;
        if (options?.orderBy) {
            const direction = options.orderDirection || 'ASC';
            queryString += ` ORDER BY ${options.orderBy} ${direction}`;
        }
        const results = await (0, db_1.query)(queryString, params);
        return results.map((record) => this.mapToEntity(record));
    }
    /**
     * Find all records with pagination support
     */
    async findAllPaginated(storeId, options) {
        const page = options?.page || 1;
        const pageSize = options?.pageSize || 20;
        const offset = (page - 1) * pageSize;
        const { clause, params } = this.buildWhereClause(storeId, options?.where);
        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE ${clause}`;
        const countResult = await (0, db_1.queryOne)(countQuery, params);
        const total = countResult?.total ?? 0;
        // Build paginated query
        let queryString = `SELECT * FROM ${this.tableName} WHERE ${clause}`;
        const orderBy = options?.orderBy || 'created_at';
        const direction = options?.orderDirection || 'DESC';
        queryString += ` ORDER BY ${orderBy} ${direction}`;
        queryString += ` OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;
        const results = await (0, db_1.query)(queryString, {
            ...params,
            offset,
            pageSize,
        });
        return {
            data: results.map((record) => this.mapToEntity(record)),
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }
    /**
     * Find a single record by ID with storeId filtering
     */
    async findById(id, storeId) {
        const queryString = `
      SELECT * FROM ${this.tableName} 
      WHERE ${this.idColumn} = @id AND store_id = @storeId
    `;
        const result = await (0, db_1.queryOne)(queryString, {
            id,
            storeId,
        });
        return result ? this.mapToEntity(result) : null;
    }
    /**
     * Find records by a specific field value
     */
    async findBy(field, value, storeId, options) {
        const { clause, params } = this.buildWhereClause(storeId, {
            ...options?.where,
            [field]: value,
        });
        let queryString = `SELECT * FROM ${this.tableName} WHERE ${clause}`;
        if (options?.orderBy) {
            const direction = options.orderDirection || 'ASC';
            queryString += ` ORDER BY ${options.orderBy} ${direction}`;
        }
        const results = await (0, db_1.query)(queryString, params);
        return results.map((record) => this.mapToEntity(record));
    }
    /**
     * Find a single record by a specific field value
     */
    async findOneBy(field, value, storeId) {
        const queryString = `
      SELECT * FROM ${this.tableName} 
      WHERE ${field} = @value AND store_id = @storeId
    `;
        const result = await (0, db_1.queryOne)(queryString, {
            value,
            storeId,
        });
        return result ? this.mapToEntity(result) : null;
    }
    /**
     * Create a new record with automatic storeId assignment
     */
    async create(data, storeId) {
        const record = this.mapToRecord({
            ...data,
            storeId,
        });
        // Add id if not provided (generate UUID)
        if (!record.id) {
            record.id = crypto.randomUUID();
        }
        // Ensure store_id is set
        record.store_id = storeId;
        // Add timestamps
        const now = new Date();
        if (!record.created_at) {
            record.created_at = now;
        }
        if (!record.updated_at) {
            record.updated_at = now;
        }
        const result = await (0, db_1.insert)(this.tableName, record);
        if (!result) {
            throw new Error(`Failed to create record in ${this.tableName}`);
        }
        return this.mapToEntity(result);
    }
    /**
     * Update an existing record with storeId verification
     */
    async update(id, data, storeId) {
        // Verify record belongs to store
        const existing = await this.findById(id, storeId);
        if (!existing) {
            return null;
        }
        const record = this.mapToRecord(data);
        // Remove storeId from update data (shouldn't be changed)
        delete record.store_id;
        delete record.storeId;
        // Update timestamp
        record.updated_at = new Date();
        const result = await (0, db_1.update)(this.tableName, id, record, this.idColumn);
        if (!result) {
            throw new Error(`Failed to update record in ${this.tableName}`);
        }
        return this.mapToEntity(result);
    }
    /**
     * Delete a record with storeId verification
     */
    async delete(id, storeId) {
        // Verify record belongs to store
        const existing = await this.findById(id, storeId);
        if (!existing) {
            throw new Error(`Record not found or access denied`);
        }
        return (0, db_1.remove)(this.tableName, id, this.idColumn);
    }
    /**
     * Check if a record exists
     */
    async exists(id, storeId) {
        const queryString = `
      SELECT 1 FROM ${this.tableName} 
      WHERE ${this.idColumn} = @id AND store_id = @storeId
    `;
        const result = await (0, db_1.queryOne)(queryString, { id, storeId });
        return result !== null;
    }
    /**
     * Count records for a store
     */
    async count(storeId, where) {
        const { clause, params } = this.buildWhereClause(storeId, where);
        const queryString = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE ${clause}`;
        const result = await (0, db_1.queryOne)(queryString, params);
        return result?.total ?? 0;
    }
    /**
     * Search records with LIKE query
     */
    async search(storeId, searchField, searchTerm, options) {
        const page = options?.page || 1;
        const pageSize = options?.pageSize || 20;
        const offset = (page - 1) * pageSize;
        const { clause, params } = this.buildWhereClause(storeId, options?.where);
        const searchClause = `${clause} AND ${searchField} LIKE @searchTerm`;
        const searchParams = { ...params, searchTerm: `%${searchTerm}%` };
        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE ${searchClause}`;
        const countResult = await (0, db_1.queryOne)(countQuery, searchParams);
        const total = countResult?.total ?? 0;
        // Build paginated query
        let queryString = `SELECT * FROM ${this.tableName} WHERE ${searchClause}`;
        const orderBy = options?.orderBy || 'created_at';
        const direction = options?.orderDirection || 'DESC';
        queryString += ` ORDER BY ${orderBy} ${direction}`;
        queryString += ` OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;
        const results = await (0, db_1.query)(queryString, {
            ...searchParams,
            offset,
            pageSize,
        });
        return {
            data: results.map((record) => this.mapToEntity(record)),
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }
    /**
     * Execute operations within a transaction
     */
    async withTransaction(callback) {
        return (0, transaction_1.withTransaction)(async (transaction) => {
            const transactionRepo = new TransactionRepository(this.tableName, this.idColumn, transaction, this.mapToEntity.bind(this), this.mapToRecord.bind(this));
            return callback(transactionRepo);
        });
    }
}
exports.BaseRepository = BaseRepository;
/**
 * Transaction-aware repository for use within withTransaction callback
 */
class TransactionRepository {
    tableName;
    idColumn;
    transaction;
    mapToEntity;
    mapToRecord;
    constructor(tableName, idColumn, transaction, mapToEntity, mapToRecord) {
        this.tableName = tableName;
        this.idColumn = idColumn;
        this.transaction = transaction;
        this.mapToEntity = mapToEntity;
        this.mapToRecord = mapToRecord;
    }
    async findById(id, storeId) {
        const queryString = `
      SELECT * FROM ${this.tableName} 
      WHERE ${this.idColumn} = @id AND store_id = @storeId
    `;
        const result = await (0, transaction_1.transactionQueryOne)(this.transaction, queryString, { id, storeId });
        return result ? this.mapToEntity(result) : null;
    }
    async create(data, storeId) {
        const record = this.mapToRecord({
            ...data,
            storeId,
        });
        if (!record.id) {
            record.id = crypto.randomUUID();
        }
        record.store_id = storeId;
        const now = new Date();
        if (!record.created_at) {
            record.created_at = now;
        }
        if (!record.updated_at) {
            record.updated_at = now;
        }
        const result = await (0, transaction_1.transactionInsert)(this.transaction, this.tableName, record);
        if (!result) {
            throw new Error(`Failed to create record in ${this.tableName}`);
        }
        return this.mapToEntity(result);
    }
    async update(id, data, storeId) {
        const existing = await this.findById(id, storeId);
        if (!existing) {
            throw new Error(`Record not found or access denied`);
        }
        const record = this.mapToRecord(data);
        delete record.store_id;
        delete record.storeId;
        record.updated_at = new Date();
        const result = await (0, transaction_1.transactionUpdate)(this.transaction, this.tableName, id, record, this.idColumn);
        if (!result) {
            throw new Error(`Failed to update record in ${this.tableName}`);
        }
        return this.mapToEntity(result);
    }
    async query(queryString, params) {
        return (0, transaction_1.transactionQuery)(this.transaction, queryString, params);
    }
    async queryOne(queryString, params) {
        return (0, transaction_1.transactionQueryOne)(this.transaction, queryString, params);
    }
}
exports.TransactionRepository = TransactionRepository;
//# sourceMappingURL=base-repository.js.map