"use strict";
/**
 * Fast-check configuration for property-based testing
 * Feature: pos-sales-ui-improvements
 *
 * All property tests should run with at least 100 iterations
 * as specified in the design document.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultPropertyTestConfig = exports.PROPERTY_TEST_CONFIG = void 0;
exports.PROPERTY_TEST_CONFIG = {
    numRuns: 100,
    verbose: false,
    seed: undefined, // Use random seed by default
};
/**
 * Default configuration for property tests
 */
exports.defaultPropertyTestConfig = {
    ...exports.PROPERTY_TEST_CONFIG,
};
//# sourceMappingURL=fast-check.config.js.map