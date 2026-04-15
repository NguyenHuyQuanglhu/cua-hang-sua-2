"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unitConversionService = exports.UnitConversionService = void 0;
const db_1 = require("../db");
class UnitConversionService {
    /**
     * Get all available units for a product
     */
    async getProductUnits(productId) {
        // Get product's base unit
        const productResult = await (0, db_1.query)(`SELECT p.unit_id, u.name as unit_name
       FROM Products p
       JOIN Units u ON p.unit_id = u.id
       WHERE p.id = @productId`, { productId });
        if (productResult.length === 0) {
            throw new Error('Product not found');
        }
        const baseUnitId = productResult[0].unit_id;
        const baseUnitName = productResult[0].unit_name;
        // Get all units that can convert to this base unit
        const unitsResult = await (0, db_1.query)(`SELECT id, name,
              CASE WHEN base_unit_id IS NULL THEN 1 ELSE 0 END as is_base,
              ISNULL(conversion_factor, 1) as conversion_factor
       FROM Units
       WHERE (base_unit_id = @baseUnitId OR id = @baseUnitId)
         AND store_id = (SELECT store_id FROM Products WHERE id = @productId)
       ORDER BY conversion_factor`, { baseUnitId, productId });
        const baseUnit = {
            id: baseUnitId,
            name: baseUnitName,
            isBase: true,
            conversionFactor: 1,
        };
        const availableUnits = unitsResult.map((u) => ({
            id: u.id,
            name: u.name,
            isBase: u.is_base === 1,
            conversionFactor: Number(u.conversion_factor),
        }));
        return { baseUnit, availableUnits };
    }
    /**
     * Convert quantity from one unit to another
     */
    async convertQuantity(productId, fromUnitId, toUnitId, quantity) {
        // Get conversion factors
        const fromUnitResult = await (0, db_1.query)(`SELECT name, ISNULL(conversion_factor, 1) as conversion_factor
       FROM Units WHERE id = @fromUnitId`, { fromUnitId });
        const toUnitResult = await (0, db_1.query)(`SELECT name, ISNULL(conversion_factor, 1) as conversion_factor
       FROM Units WHERE id = @toUnitId`, { toUnitId });
        if (fromUnitResult.length === 0 || toUnitResult.length === 0) {
            throw new Error('Unit not found');
        }
        const fromFactor = Number(fromUnitResult[0].conversion_factor);
        const toFactor = Number(toUnitResult[0].conversion_factor);
        // Convert: quantity * fromFactor / toFactor
        const convertedQuantity = (quantity * fromFactor) / toFactor;
        return {
            fromUnitId,
            fromUnitName: fromUnitResult[0].name,
            toUnitId,
            toUnitName: toUnitResult[0].name,
            conversionFactor: fromFactor / toFactor,
            fromQuantity: quantity,
            toQuantity: convertedQuantity,
        };
    }
    /**
     * Calculate price in different units
     */
    async calculatePrice(productId, unitId, quantity, priceType) {
        // Get product's base unit price
        const productResult = await (0, db_1.query)(`SELECT unit_id, 
              ${priceType === 'cost' ? 'cost_price' : 'price'} as base_price
       FROM Products WHERE id = @productId`, { productId });
        if (productResult.length === 0) {
            throw new Error('Product not found');
        }
        const baseUnitPrice = Number(productResult[0].base_price) || 0;
        // Get conversion factor
        const unitResult = await (0, db_1.query)(`SELECT ISNULL(conversion_factor, 1) as conversion_factor
       FROM Units WHERE id = @unitId`, { unitId });
        const conversionFactor = Number(unitResult[0]?.conversion_factor || 1);
        // Calculate
        const unitPrice = baseUnitPrice * conversionFactor;
        const baseQuantity = quantity * conversionFactor;
        const totalAmount = unitPrice * quantity;
        return {
            unitPrice,
            baseUnitPrice,
            quantity,
            baseQuantity,
            totalAmount,
        };
    }
    /**
     * Convert purchase order item to base unit
     */
    async convertPurchaseItem(productId, unitId, quantity, unitPrice) {
        // Get product's base unit
        const productResult = await (0, db_1.query)(`SELECT unit_id FROM Products WHERE id = @productId`, { productId });
        if (productResult.length === 0) {
            throw new Error('Product not found');
        }
        const baseUnitId = productResult[0].unit_id;
        // Get conversion factor
        const unitResult = await (0, db_1.query)(`SELECT ISNULL(conversion_factor, 1) as conversion_factor
       FROM Units WHERE id = @unitId`, { unitId });
        const conversionFactor = Number(unitResult[0]?.conversion_factor || 1);
        // Calculate
        const baseQuantity = quantity * conversionFactor;
        const baseUnitPrice = unitPrice / conversionFactor;
        const totalAmount = quantity * unitPrice;
        return {
            quantity,
            unitId,
            unitPrice,
            baseQuantity,
            baseUnitPrice,
            totalAmount,
        };
    }
}
exports.UnitConversionService = UnitConversionService;
exports.unitConversionService = new UnitConversionService();
//# sourceMappingURL=unit-conversion-service.js.map