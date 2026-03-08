export { getConnection, closeConnection, sql } from './connection';
export { query, queryOne, insert, update, remove, queryPaginated } from './query';
export type { SqlValue, QueryParams } from './query';

// Transaction support
export { 
  withTransaction, 
  transactionQuery, 
  transactionQueryOne, 
  transactionInsert,
  transactionUpdate
} from './transaction';

// Multi-tenant support
export { 
  TenantRouter, 
  tenantRouter,
  type TenantConnection,
  type TenantInfo,
  type TenantRouterConfig,
} from './tenant-router';

// Database error handling
export {
  withDatabaseErrorHandling,
  handleSqlServerError,
  isRetryableError,
  retryDatabaseOperation,
  withTransaction as withTransactionErrorHandling,
  logDatabaseQuery,
} from './errorHandler';
