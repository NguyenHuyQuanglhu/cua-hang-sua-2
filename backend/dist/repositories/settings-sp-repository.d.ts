/**
 * Settings SP Repository
 *
 * Repository for settings operations using stored procedures.
 * Implements get and upsert operations via sp_Settings_* stored procedures.
 * Requirements: 7.1, 7.2
 */
import { SPBaseRepository } from './sp-base-repository';
/**
 * Settings entity interface
 */
export interface Settings {
    [key: string]: unknown;
}
/**
 * Settings repository using stored procedures
 */
export declare class SettingsSPRepository extends SPBaseRepository<Settings> {
    protected tableName: string;
    /**
     * Get settings for a store using sp_Settings_GetByStore
     * Requirements: 7.1
     *
     * @param storeId - Store ID
     * @returns Settings object or empty object if not found
     */
    getByStore(storeId: string): Promise<Settings>;
    /**
     * Upsert settings for a store using sp_Settings_Upsert
     * Requirements: 7.2
     *
     * @param storeId - Store ID
     * @param settings - Settings object to save
     * @returns True if successful
     */
    upsert(storeId: string, settings: Settings): Promise<boolean>;
    /**
     * Update specific settings keys while preserving others
     *
     * @param storeId - Store ID
     * @param partialSettings - Partial settings to merge
     * @returns Updated settings
     */
    updatePartial(storeId: string, partialSettings: Settings): Promise<Settings>;
    /**
     * Get a specific setting value
     *
     * @param storeId - Store ID
     * @param key - Setting key
     * @returns Setting value or undefined if not found
     */
    getSetting<T = unknown>(storeId: string, key: string): Promise<T | undefined>;
    /**
     * Set a specific setting value
     *
     * @param storeId - Store ID
     * @param key - Setting key
     * @param value - Setting value
     * @returns True if successful
     */
    setSetting(storeId: string, key: string, value: unknown): Promise<boolean>;
    /**
     * Delete a specific setting key
     *
     * @param storeId - Store ID
     * @param key - Setting key to delete
     * @returns True if successful
     */
    deleteSetting(storeId: string, key: string): Promise<boolean>;
}
export declare const settingsSPRepository: SettingsSPRepository;
//# sourceMappingURL=settings-sp-repository.d.ts.map