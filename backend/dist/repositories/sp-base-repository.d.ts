/**
 * Base Repository for Stored Procedures
 *
 * Provides methods to execute stored procedures with proper parameter binding
 * and support for multiple result sets.
 */
import sql from 'mssql';
export type SPParamValue = string | number | boolean | Date | Buffer | null | undefined;
export type SPParams = Record<string, SPParamValue | unknown>;
/**
 * Result from stored procedure execution with multiple result sets
 */
export interface SPMultipleResults<T = Record<string, unknown>> {
    recordsets: T[][];
    recordset: T[];
    rowsAffected: number[];
    output: Record<string, unknown>;
}
/**
 * Base repository class for stored procedure operations
 * Provides executeSP and executeSPSingle methods with proper SQL Server parameter binding
 */
export declare abstract class SPBaseRepository<T = Record<string, unknown>> {
    protected abstract tableName: string;
    /**
     * Execute a stored procedure and return all results
     * Handles parameter binding for SQL Server
     *
     * @param spName - Name of the stored procedure (e.g., 'sp_Products_Create')
     * @param params - Parameters to pass to the stored procedure
     * @returns Array of results from the stored procedure
     */
    protected executeSP<R = T>(spName: string, params?: SPParams): Promise<R[]>;
    /**
     * Execute a stored procedure and return a single result
     *
     * @param spName - Name of the stored procedure
     * @param params - Parameters to pass to the stored procedure
     * @returns Single result or null if no results
     */
    protected executeSPSingle<R = T>(spName: string, params?: SPParams): Promise<R | null>;
    /**
     * Execute a stored procedure and return multiple result sets
     * Useful for procedures that return related data (e.g., sale with items)
     *
     * @param spName - Name of the stored procedure
     * @param params - Parameters to pass to the stored procedure
     * @returns Object containing all result sets and metadata
     */
    protected executeSPMultiple<R = T>(spName: string, params?: SPParams): Promise<SPMultipleResults<R>>;
    /**
     * Execute a stored procedure within a transaction
     *
     * @param transaction - SQL Server transaction object
     * @param spName - Name of the stored procedure
     * @param params - Parameters to pass to the stored procedure
     * @returns Array of results from the stored procedure
     */
    protected executeSPInTransaction<R = T>(transaction: sql.Transaction, spName: string, params?: SPParams): Promise<R[]>;
    /**
     * Execute a stored procedure within a transaction and return single result
     *
     * @param transaction - SQL Server transaction object
     * @param spName - Name of the stored procedure
     * @param params - Parameters to pass to the stored procedure
     * @returns Single result or null if no results
     */
    protected executeSPSingleInTransaction<R = T>(transaction: sql.Transaction, spName: string, params?: SPParams): Promise<R | null>;
    /**
     * Execute multiple stored procedures within a single transaction
     * Automatically commits on success or rolls back on error
     *
     * @param callback - Function that receives transaction and executes SPs
     * @returns Result from the callback function
     */
    protected withSPTransaction<R>(callback: (helpers: SPTransactionHelpers) => Promise<R>): Promise<R>;
}
/**
 * Helper functions available within SP transactions
 */
export interface SPTransactionHelpers {
    executeSP: <T = Record<string, unknown>>(spName: string, params?: SPParams) => Promise<T[]>;
    executeSPSingle: <T = Record<string, unknown>>(spName: string, params?: SPParams) => Promise<T | null>;
    executeSPMultiple: <T = Record<string, unknown>>(spName: string, params?: SPParams) => Promise<SPMultipleResults<T>>;
    transaction: sql.Transaction;
}
//# sourceMappingURL=sp-base-repository.d.ts.map