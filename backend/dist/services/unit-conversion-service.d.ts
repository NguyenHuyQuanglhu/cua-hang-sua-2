export interface UnitConversion {
    fromUnitId: string;
    fromUnitName: string;
    toUnitId: string;
    toUnitName: string;
    conversionFactor: number;
    fromQuantity: number;
    toQuantity: number;
}
export interface ProductUnit {
    id: string;
    name: string;
    isBase: boolean;
    conversionFactor: number;
}
export declare class UnitConversionService {
    /**
     * Get all available units for a product
     */
    getProductUnits(productId: string): Promise<{
        baseUnit: ProductUnit;
        availableUnits: ProductUnit[];
    }>;
    /**
     * Convert quantity from one unit to another
     */
    convertQuantity(productId: string, fromUnitId: string, toUnitId: string, quantity: number): Promise<UnitConversion>;
    /**
     * Calculate price in different units
     */
    calculatePrice(productId: string, unitId: string, quantity: number, priceType: 'cost' | 'selling'): Promise<{
        unitPrice: number;
        baseUnitPrice: number;
        quantity: number;
        baseQuantity: number;
        totalAmount: number;
    }>;
    /**
     * Convert purchase order item to base unit
     */
    convertPurchaseItem(productId: string, unitId: string, quantity: number, unitPrice: number): Promise<{
        quantity: number;
        unitId: string;
        unitPrice: number;
        baseQuantity: number;
        baseUnitPrice: number;
        totalAmount: number;
    }>;
}
export declare const unitConversionService: UnitConversionService;
//# sourceMappingURL=unit-conversion-service.d.ts.map