"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sql = void 0;
exports.query = query;
exports.queryOne = queryOne;
exports.insert = insert;
exports.update = update;
exports.remove = remove;
exports.queryPaginated = queryPaginated;
const connection_1 = require("./connection");
Object.defineProperty(exports, "sql", { enumerable: true, get: function () { return connection_1.sql; } });
/**
 * Execute a parameterized query and return results
 */
async function query(queryString, params) {
    const conn = await (0, connection_1.getConnection)();
    const request = conn.request();
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            request.input(key, value);
        });
    }
    const result = await request.query(queryString);
    return result.recordset;
}
/**
 * Execute a parameterized query and return a single result
 */
async function queryOne(queryString, params) {
    const results = await query(queryString, params);
    return results.length > 0 ? results[0] : null;
}
/**
 * Execute an INSERT query and return the inserted record
 */
async function insert(tableName, data, returnColumns = ['*']) {
    const columns = Object.keys(data);
    const paramNames = columns.map(col => `@${col}`);
    const returnClause = returnColumns.join(', ');
    const queryString = `
    INSERT INTO ${tableName} (${columns.join(', ')})
    OUTPUT INSERTED.${returnClause}
    VALUES (${paramNames.join(', ')})
  `;
    return queryOne(queryString, data);
}
/**
 * Execute an UPDATE query and return the updated record
 */
async function update(tableName, id, data, idColumn = 'Id', returnColumns = ['*']) {
    const setClauses = Object.keys(data)
        .filter(key => key !== idColumn)
        .map(col => `${col} = @${col}`)
        .join(', ');
    const returnClause = returnColumns.join(', ');
    const queryString = `
    UPDATE ${tableName}
    SET ${setClauses}
    OUTPUT INSERTED.${returnClause}
    WHERE ${idColumn} = @${idColumn}
  `;
    return queryOne(queryString, { ...data, [idColumn]: id });
}
/**
 * Execute a DELETE query
 */
async function remove(tableName, id, idColumn = 'Id') {
    const queryString = `DELETE FROM ${tableName} WHERE ${idColumn} = @id`;
    const conn = await (0, connection_1.getConnection)();
    const request = conn.request();
    request.input('id', id);
    const result = await request.query(queryString);
    return (result.rowsAffected[0] ?? 0) > 0;
}
/**
 * Execute a query with pagination support
 */
async function queryPaginated(queryString, params = {}, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const countQuery = `SELECT COUNT(*) as total FROM (${queryString}) as countQuery`;
    const countResult = await queryOne(countQuery, params);
    const total = countResult?.total ?? 0;
    const paginatedQuery = `
    ${queryString}
    ORDER BY (SELECT NULL)
    OFFSET @offset ROWS
    FETCH NEXT @pageSize ROWS ONLY
  `;
    const data = await query(paginatedQuery, {
        ...params,
        offset,
        pageSize,
    });
    return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    };
}
//# sourceMappingURL=query.js.map