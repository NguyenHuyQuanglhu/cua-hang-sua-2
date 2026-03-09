"use strict";
/**
 * Transaction Support for SQL Server
 *
 * Provides transaction management utilities for atomic database operations.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sql = void 0;
exports.withTransaction = withTransaction;
exports.transactionQuery = transactionQuery;
exports.transactionQueryOne = transactionQueryOne;
exports.transactionInsert = transactionInsert;
exports.transactionUpdate = transactionUpdate;
const mssql_1 = __importDefault(require("mssql"));
exports.sql = mssql_1.default;
const connection_1 = require("./connection");
/**
 * Execute a function within a database transaction
 * Automatically commits on success or rolls back on error
 */
async function withTransaction(fn) {
    const pool = await (0, connection_1.getConnection)();
    const transaction = new mssql_1.default.Transaction(pool);
    try {
        await transaction.begin();
        const result = await fn(transaction);
        await transaction.commit();
        return result;
    }
    catch (error) {
        await transaction.rollback();
        throw error;
    }
}
/**
 * Execute a query within a transaction
 */
async function transactionQuery(transaction, queryString, params) {
    const request = new mssql_1.default.Request(transaction);
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            request.input(key, value);
        }
    }
    const result = await request.query(queryString);
    return result.recordset;
}
/**
 * Execute a query and return single result within a transaction
 */
async function transactionQueryOne(transaction, queryString, params) {
    const results = await transactionQuery(transaction, queryString, params);
    return results.length > 0 ? results[0] : null;
}
/**
 * Execute an insert within a transaction
 * Can accept either a query string or table name with data
 */
async function transactionInsert(transaction, tableNameOrQuery, dataOrParams) {
    const request = new mssql_1.default.Request(transaction);
    // Check if it's a table name (no spaces) or a query
    const isTableName = !tableNameOrQuery.includes(' ');
    let finalQuery;
    if (isTableName && dataOrParams) {
        // Table-based insert
        const columns = Object.keys(dataOrParams);
        const paramNames = columns.map(col => `@${col}`);
        for (const [key, value] of Object.entries(dataOrParams)) {
            request.input(key, value);
        }
        finalQuery = `
      INSERT INTO ${tableNameOrQuery} (${columns.join(', ')})
      OUTPUT INSERTED.*
      VALUES (${paramNames.join(', ')})
    `;
    }
    else {
        // Query-based insert
        if (dataOrParams) {
            for (const [key, value] of Object.entries(dataOrParams)) {
                request.input(key, value);
            }
        }
        finalQuery = tableNameOrQuery;
        if (!tableNameOrQuery.toLowerCase().includes('output inserted')) {
            finalQuery = tableNameOrQuery.replace(/\)\s*values/i, ') OUTPUT INSERTED.* VALUES');
        }
    }
    const result = await request.query(finalQuery);
    return result.recordset?.[0] || null;
}
/**
 * Execute an update within a transaction
 * Can accept either a query string or table name with data
 */
async function transactionUpdate(transaction, tableNameOrQuery, idOrParams, dataOrIdColumn, idColumn = 'id') {
    const request = new mssql_1.default.Request(transaction);
    // Check if it's a table name (no spaces) or a query
    const isTableName = !tableNameOrQuery.includes(' ');
    let finalQuery;
    if (isTableName && typeof idOrParams === 'string' && typeof dataOrIdColumn === 'object') {
        // Table-based update: transactionUpdate(tx, 'TableName', id, data, idColumn)
        const id = idOrParams;
        const data = dataOrIdColumn;
        const actualIdColumn = typeof arguments[4] === 'string' ? arguments[4] : 'id';
        const setClauses = Object.keys(data)
            .filter(key => key !== actualIdColumn && key !== 'id')
            .map(col => `${col} = @${col}`)
            .join(', ');
        for (const [key, value] of Object.entries(data)) {
            request.input(key, value);
        }
        request.input('_id', id);
        finalQuery = `
      UPDATE ${tableNameOrQuery}
      SET ${setClauses}
      OUTPUT INSERTED.*
      WHERE ${actualIdColumn} = @_id
    `;
    }
    else if (typeof idOrParams === 'object') {
        // Query-based update with params
        for (const [key, value] of Object.entries(idOrParams)) {
            request.input(key, value);
        }
        finalQuery = tableNameOrQuery;
    }
    else {
        finalQuery = tableNameOrQuery;
    }
    const result = await request.query(finalQuery);
    return result.recordset?.[0] || null;
}
//# sourceMappingURL=transaction.js.map