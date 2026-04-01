"use strict";
/**
 * Backend Type Definitions
 *
 * This file contains shared type definitions for the backend.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_HIERARCHY = void 0;
exports.hasRoleAuthority = hasRoleAuthority;
exports.getManageableRoles = getManageableRoles;
/**
 * Role hierarchy levels (higher number = more permissions)
 */
exports.ROLE_HIERARCHY = {
    owner: 4,
    company_manager: 3,
    store_manager: 2,
    salesperson: 1,
};
/**
 * Check if a role has higher or equal authority than another role
 */
function hasRoleAuthority(userRole, requiredRole) {
    return exports.ROLE_HIERARCHY[userRole] >= exports.ROLE_HIERARCHY[requiredRole];
}
/**
 * Get roles that a user can manage (roles below their own)
 */
function getManageableRoles(userRole) {
    const userLevel = exports.ROLE_HIERARCHY[userRole];
    return Object.keys(exports.ROLE_HIERARCHY).filter(role => exports.ROLE_HIERARCHY[role] < userLevel);
}
//# sourceMappingURL=types.js.map