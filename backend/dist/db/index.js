"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantRouter = exports.TenantRouter = exports.transactionUpdate = exports.transactionInsert = exports.transactionQueryOne = exports.transactionQuery = exports.withTransaction = exports.queryPaginated = exports.remove = exports.update = exports.insert = exports.queryOne = exports.query = exports.sql = exports.closeConnection = exports.getConnection = void 0;
var connection_1 = require("./connection");
Object.defineProperty(exports, "getConnection", { enumerable: true, get: function () { return connection_1.getConnection; } });
Object.defineProperty(exports, "closeConnection", { enumerable: true, get: function () { return connection_1.closeConnection; } });
Object.defineProperty(exports, "sql", { enumerable: true, get: function () { return connection_1.sql; } });
var query_1 = require("./query");
Object.defineProperty(exports, "query", { enumerable: true, get: function () { return query_1.query; } });
Object.defineProperty(exports, "queryOne", { enumerable: true, get: function () { return query_1.queryOne; } });
Object.defineProperty(exports, "insert", { enumerable: true, get: function () { return query_1.insert; } });
Object.defineProperty(exports, "update", { enumerable: true, get: function () { return query_1.update; } });
Object.defineProperty(exports, "remove", { enumerable: true, get: function () { return query_1.remove; } });
Object.defineProperty(exports, "queryPaginated", { enumerable: true, get: function () { return query_1.queryPaginated; } });
// Transaction support
var transaction_1 = require("./transaction");
Object.defineProperty(exports, "withTransaction", { enumerable: true, get: function () { return transaction_1.withTransaction; } });
Object.defineProperty(exports, "transactionQuery", { enumerable: true, get: function () { return transaction_1.transactionQuery; } });
Object.defineProperty(exports, "transactionQueryOne", { enumerable: true, get: function () { return transaction_1.transactionQueryOne; } });
Object.defineProperty(exports, "transactionInsert", { enumerable: true, get: function () { return transaction_1.transactionInsert; } });
Object.defineProperty(exports, "transactionUpdate", { enumerable: true, get: function () { return transaction_1.transactionUpdate; } });
// Multi-tenant support
var tenant_router_1 = require("./tenant-router");
Object.defineProperty(exports, "TenantRouter", { enumerable: true, get: function () { return tenant_router_1.TenantRouter; } });
Object.defineProperty(exports, "tenantRouter", { enumerable: true, get: function () { return tenant_router_1.tenantRouter; } });
//# sourceMappingURL=index.js.map