"use strict";
/**
 * Fast-check setup verification test
 * Feature: pos-sales-ui-improvements
 *
 * This test verifies that fast-check is properly installed and configured.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fast_check_1 = __importDefault(require("fast-check"));
const fast_check_config_1 = require("./fast-check.config");
(0, vitest_1.describe)('Fast-check Setup', () => {
    (0, vitest_1.it)('should be properly installed and working', () => {
        // Simple property: adding zero to any number returns the same number
        fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.integer(), (n) => {
            (0, vitest_1.expect)(n + 0).toBe(n);
        }), { numRuns: 100 });
    });
    (0, vitest_1.it)('should use the configured number of runs', () => {
        (0, vitest_1.expect)(fast_check_config_1.PROPERTY_TEST_CONFIG.numRuns).toBe(100);
    });
    (0, vitest_1.it)('should generate boolean values', () => {
        fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.boolean(), (value) => {
            (0, vitest_1.expect)(typeof value).toBe('boolean');
        }), fast_check_config_1.PROPERTY_TEST_CONFIG);
    });
    (0, vitest_1.it)('should generate string values', () => {
        fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.string(), (value) => {
            (0, vitest_1.expect)(typeof value).toBe('string');
        }), fast_check_config_1.PROPERTY_TEST_CONFIG);
    });
});
//# sourceMappingURL=fast-check-setup.test.js.map