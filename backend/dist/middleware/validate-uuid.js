"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUUID = validateUUID;
exports.debugRequest = debugRequest;
/**
 * Middleware to validate UUID format in route parameters
 */
function validateUUID(paramName = 'id') {
    return (req, res, next) => {
        const uuid = req.params[paramName];
        if (!uuid) {
            return res.status(400).json({
                error: `Missing ${paramName} parameter`
            });
        }
        // UUID v4 regex pattern
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(uuid)) {
            console.error(`❌ Invalid UUID format for ${paramName}:`, uuid);
            return res.status(400).json({
                error: `Invalid ${paramName} format. Expected UUID format.`,
                received: uuid,
                expected: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
            });
        }
        next();
    };
}
/**
 * Middleware to validate and log request data for debugging
 */
function debugRequest(req, res, next) {
    console.log(`🔍 ${req.method} ${req.path}`);
    console.log('📊 Params:', req.params);
    console.log('📊 Query:', req.query);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('📊 Body:', JSON.stringify(req.body, null, 2));
    }
    next();
}
//# sourceMappingURL=validate-uuid.js.map