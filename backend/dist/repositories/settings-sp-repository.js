"use strict";
/**
 * Settings SP Repository
 *
 * Repository for settings operations using stored procedures.
 * Implements get and upsert operations via sp_Settings_* stored procedures.
 * Requirements: 7.1, 7.2
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsSPRepository = exports.SettingsSPRepository = void 0;
const sp_base_repository_1 = require("./sp-base-repository");
/**
 * Settings repository using stored procedures
 */
class SettingsSPRepository extends sp_base_repository_1.SPBaseRepository {
    tableName = 'Settings';
    /**
     * Get settings for a store using sp_Settings_GetByStore
     * Requirements: 7.1
     *
     * @param storeId - Store ID
     * @returns Settings object or empty object if not found
     */
    async getByStore(storeId) {
        const params = {
            storeId,
        };
        const result = await this.executeSPSingle('sp_Settings_GetByStore', params);
        if (!result || !result.settings) {
            return {};
        }
        // Parse settings JSON if stored as string
        if (typeof result.settings === 'string') {
            try {
                return JSON.parse(result.settings);
            }
            catch {
                return {};
            }
        }
        return result.settings;
    }
    /**
     * Upsert settings for a store using sp_Settings_Upsert
     * Requirements: 7.2
     *
     * @param storeId - Store ID
     * @param settings - Settings object to save
     * @returns True if successful
     */
    async upsert(storeId, settings) {
        const params = {
            storeId,
            settings: JSON.stringify(settings),
        };
        const result = await this.executeSPSingle('sp_Settings_Upsert', params);
        return result?.Success === 1;
    }
    /**
     * Update specific settings keys while preserving others
     *
     * @param storeId - Store ID
     * @param partialSettings - Partial settings to merge
     * @returns Updated settings
     */
    async updatePartial(storeId, partialSettings) {
        const currentSettings = await this.getByStore(storeId);
        const mergedSettings = { ...currentSettings, ...partialSettings };
        await this.upsert(storeId, mergedSettings);
        return mergedSettings;
    }
    /**
     * Get a specific setting value
     *
     * @param storeId - Store ID
     * @param key - Setting key
     * @returns Setting value or undefined if not found
     */
    async getSetting(storeId, key) {
        const settings = await this.getByStore(storeId);
        return settings[key];
    }
    /**
     * Set a specific setting value
     *
     * @param storeId - Store ID
     * @param key - Setting key
     * @param value - Setting value
     * @returns True if successful
     */
    async setSetting(storeId, key, value) {
        const settings = await this.getByStore(storeId);
        settings[key] = value;
        return this.upsert(storeId, settings);
    }
    /**
     * Delete a specific setting key
     *
     * @param storeId - Store ID
     * @param key - Setting key to delete
     * @returns True if successful
     */
    async deleteSetting(storeId, key) {
        const settings = await this.getByStore(storeId);
        delete settings[key];
        return this.upsert(storeId, settings);
    }
}
exports.SettingsSPRepository = SettingsSPRepository;
// Export singleton instance
exports.settingsSPRepository = new SettingsSPRepository();
//# sourceMappingURL=settings-sp-repository.js.map