import sql from 'mssql';
/**
 * Get or create a connection pool to SQL Server
 */
export declare function getConnection(): Promise<sql.ConnectionPool>;
/**
 * Close the connection pool
 */
export declare function closeConnection(): Promise<void>;
export { sql };
//# sourceMappingURL=connection.d.ts.map