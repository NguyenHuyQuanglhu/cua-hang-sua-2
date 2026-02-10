"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sql = void 0;
exports.getConnection = getConnection;
exports.closeConnection = closeConnection;
const mssql_1 = __importDefault(require("mssql"));
exports.sql = mssql_1.default;
function getConfig() {
    return {
        server: process.env.DB_SERVER || 'localhost',
        database: process.env.DB_NAME || 'SmartInventory',
        user: process.env.DB_USER || 'sa',
        password: process.env.DB_PASSWORD || '',
        port: parseInt(process.env.DB_PORT || '1433'),
        options: {
            encrypt: false,
            trustServerCertificate: true,
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000,
        },
        connectionTimeout: 30000,
        requestTimeout: 30000,
    };
}
let pool = null;
let connectionRetries = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;
/**
 * Get or create a connection pool to SQL Server
 */
async function getConnection() {
    if (pool && pool.connected) {
        return pool;
    }
    const config = getConfig();
    console.log('Connecting to database:', config.server, config.database);
    try {
        pool = await mssql_1.default.connect(config);
        connectionRetries = 0;
        console.log('✅ Connected to SQL Server');
        return pool;
    }
    catch (error) {
        connectionRetries++;
        if (connectionRetries < MAX_RETRIES) {
            console.error(`Database connection failed. Retrying in ${RETRY_DELAY / 1000}s... (Attempt ${connectionRetries}/${MAX_RETRIES})`);
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
            return getConnection();
        }
        connectionRetries = 0;
        throw new Error(`Failed to connect to database after ${MAX_RETRIES} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Close the connection pool
 */
async function closeConnection() {
    if (pool) {
        await pool.close();
        pool = null;
    }
}
//# sourceMappingURL=connection.js.map