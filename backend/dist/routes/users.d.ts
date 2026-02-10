/**
 * User Management API Routes
 *
 * Implements CRUD endpoints for user management with RBAC support.
 *
 * Requirements:
 * - 4.1: Owner/Company Manager can create users with roles below their own
 * - 4.2: Store Manager can only create Salesperson for their managed stores
 * - 4.3: Unique email per tenant
 * - 4.4: Deactivated users immediately lose access
 * - 4.5: All user management actions are logged for audit
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=users.d.ts.map