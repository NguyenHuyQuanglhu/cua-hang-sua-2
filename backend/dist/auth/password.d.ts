/**
 * Hash a password using bcrypt with minimum 10 salt rounds
 * @param password - Plain text password to hash
 * @returns Hashed password string
 */
export declare function hashPassword(password: string): Promise<string>;
/**
 * Verify a password against a hash
 * @param password - Plain text password to verify
 * @param hash - Hashed password to compare against
 * @returns True if password matches, false otherwise
 */
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
//# sourceMappingURL=password.d.ts.map