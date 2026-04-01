"use strict";
/**
 * Base Repository for Stored Procedures
 *
 * Provides methods to execute stored procedures with proper parameter binding
 * and support for multiple result sets.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPBaseRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const connection_1 = require("../db/connection");
const transaction_1 = require("../db/transaction");
// UUID regex pattern for detecting UUID strings
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/**
 * Check if a value is a valid UUID string
 */
function isUUID(value) {
    return typeof value === 'string' && UUID_REGEX.test(value);
}
/**
 * Bind a parameter with proper SQL type detection
 */
function bindParameter(request, key, value) {
    if (value === null || value === undefined) {
        request.input(key, value);
    }
    else if (isUUID(value)) {
        // Explicitly bind UUID strings as UniqueIdentifier
        request.input(key, mssql_1.default.UniqueIdentifier, value);
    }
    else if (typeof value === 'number') {
        // Check if it's a decimal/float or integer
        if (Number.isInteger(value)) {
            request.input(key, mssql_1.default.Int, value);
        }
        else {
            request.input(key, mssql_1.default.Decimal(18, 6), value);
        }
    }
    else if (typeof value === 'boolean') {
        request.input(key, mssql_1.default.Bit, value);
    }
    else if (value instanceof Date) {
        request.input(key, mssql_1.default.DateTime2, value);
    }
    else {
        // Default: let mssql infer the type
        request.input(key, value);
    }
}
/**
 * Base repository class for stored procedure operations
 * Provides executeSP and executeSPSingle methods with proper SQL Server parameter binding
 */
class SPBaseRepository {
    /**
     * Execute a stored procedure and return all results
     * Handles parameter binding for SQL Server
     *
     * @param spName - Name of the stored procedure (e.g., 'sp_Products_Create')
     * @param params - Parameters to pass to the stored procedure
     * @returns Array of results from the stored procedure
     */
    async executeSP(spName, params) {
        const conn = await (0, connection_1.getConnection)();
        const request = conn.request();
        // Bind parameters
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                if (value !== undefined) {
                    bindParameter(request, key, value);
                }
            }
        }
        const result = await request.execute(spName);
        return result.recordset;
    }
    /**
     * Execute a stored procedure and return a single result
     *
     * @param spName - Name of the stored procedure
     * @param params - Parameters to pass to the stored procedure
     * @returns Single result or null if no results
     */
    async executeSPSingle(spName, params) {
        const results = await this.executeSP(spName, params);
        return results.length > 0 ? results[0] : null;
    }
    /**
     * Execute a stored procedure and return multiple result sets
     * Useful for procedures that return related data (e.g., sale with items)
     *
     * @param spName - Name of the stored procedure
     * @param params - Parameters to pass to the stored procedure
     * @returns Object containing all result sets and metadata
     */
    async executeSPMultiple(spName, params) {
        const conn = await (0, connection_1.getConnection)();
        const request = conn.request();
        // Bind parameters
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                if (value !== undefined) {
                    bindParameter(request, key, value);
                }
            }
        }
        const result = await request.execute(spName);
        return {
            recordsets: result.recordsets,
            recordset: result.recordset,
            rowsAffected: result.rowsAffected,
            output: result.output,
        };
    }
    /**
     * Execute a stored procedure within a transaction
     *
     * @param transaction - SQL Server transaction object
     * @param spName - Name of the stored procedure
     * @param params - Parameters to pass to the stored procedure
     * @returns Array of results from the stored procedure
     */
    async executeSPInTransaction(transaction, spName, params) {
        const request = new mssql_1.default.Request(transaction);
        // Bind parameters
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                if (value !== undefined) {
                    bindParameter(request, key, value);
                }
            }
        }
        const result = await request.execute(spName);
        return result.recordset;
    }
    /**
     * Execute a stored procedure within a transaction and return single result
     *
     * @param transaction - SQL Server transaction object
     * @param spName - Name of the stored procedure
     * @param params - Parameters to pass to the stored procedure
     * @returns Single result or null if no results
     */
    async executeSPSingleInTransaction(transaction, spName, params) {
        const results = await this.executeSPInTransaction(transaction, spName, params);
        return results.length > 0 ? results[0] : null;
    }
    /**
     * Execute multiple stored procedures within a single transaction
     * Automatically commits on success or rolls back on error
     *
     * @param callback - Function that receives transaction and executes SPs
     * @returns Result from the callback function
     */
    async withSPTransaction(callback) {
        return (0, transaction_1.withTransaction)(async (transaction) => {
            const helpers = {
                executeSP: (spName, params) => this.executeSPInTransaction(transaction, spName, params),
                executeSPSingle: (spName, params) => this.executeSPSingleInTransaction(transaction, spName, params),
                executeSPMultiple: async (spName, params) => {
                    const request = new mssql_1.default.Request(transaction);
                    if (params) {
                        for (const [key, value] of Object.entries(params)) {
                            if (value !== undefined) {
                                request.input(key, value);
                            }
                        }
                    }
                    const result = await request.execute(spName);
                    return {
                        recordsets: result.recordsets,
                        recordset: result.recordset,
                        rowsAffected: result.rowsAffected,
                        output: result.output,
                    };
                },
                transaction,
            };
            return callback(helpers);
        });
    }
}
exports.SPBaseRepository = SPBaseRepository;
//# sourceMappingURL=sp-base-repository.js.map