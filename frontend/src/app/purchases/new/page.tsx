'use client'

import { useEffect, useState } from "react";
import { Product, Unit, SalesItem, PurchaseOrderItem, Supplier, Contractor } from "@/lib/types";
import { PurchaseOrderForm } from "../components/purchase-order-form";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/contexts/store-context";

export default function NewPurchasePage() {
    const { currentStore } = useStore();
    const searchParams = useSearchParams();
    
    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [contractors, setContractors] = useState<Contractor[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [allSalesItems, setAllSalesItems] = useState<SalesItem[]>([]);
    const [draftItems, setDraftItems] = useState<PurchaseOrderItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!currentStore?.id) return;
            
            setIsLoading(true);
            try {
                // Get auth token from localStorage
                const token = localStorage.getItem('auth_token');
                const headers: Record<string, string> = {
                    'X-Store-Id': currentStore.id,
                };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                
                // Fetch products
                const productsResponse = await fetch('/api/products?pageSize=1000', { headers });
                if (productsResponse.ok) {
                    const productsResult = await productsResponse.json();
                    console.log('Products response:', productsResult);
                    console.log('Is array?', Array.isArray(productsResult));
                    console.log('Products count:', Array.isArray(productsResult) ? productsResult.length : 'not array');
                    // Backend returns array directly, not wrapped in data property
                    const productsList = Array.isArray(productsResult) ? productsResult : (productsResult.data || []);
                    console.log('Setting products:', productsList.length, 'items');
                    setProducts(productsList);
                } else {
                    console.error('Products fetch failed:', productsResponse.status, productsResponse.statusText);
                }
                
                // Fetch suppliers
                const suppliersResponse = await fetch('/api/suppliers', { headers });
                if (suppliersResponse.ok) {
                    const suppliersResult = await suppliersResponse.json();
                    console.log('Suppliers response:', suppliersResult);
                    // Backend returns { success: true, data: [...] }
                    const suppliersList = Array.isArray(suppliersResult) ? suppliersResult : (suppliersResult.data || suppliersResult.suppliers || []);
                    console.log('Setting suppliers:', suppliersList.length, 'items');
                    setSuppliers(suppliersList);
                } else {
                    console.error('Suppliers fetch failed:', suppliersResponse.status, suppliersResponse.statusText);
                }

                // Fetch contractors
                const contractorsResponse = await fetch('/api/proxy/contractors', { headers });
                if (contractorsResponse.ok) {
                    const contractorsResult = await contractorsResponse.json();
                    const contractorsList = Array.isArray(contractorsResult) ? contractorsResult : (contractorsResult.data || []);
                    console.log('Setting contractors:', contractorsList.length, 'items');
                    setContractors(contractorsList);
                } else {
                    console.error('Contractors fetch failed:', contractorsResponse.status, contractorsResponse.statusText);
                }
                
                // Fetch units
                const unitsResponse = await fetch('/api/units', { headers });
                if (unitsResponse.ok) {
                    const unitsResult = await unitsResponse.json();
                    console.log('Units response:', unitsResult);
                    // Backend returns array directly
                    const unitsList = Array.isArray(unitsResult) ? unitsResult : (unitsResult.units || []);
                    console.log('Setting units:', unitsList.length, 'items');
                    setUnits(unitsList);
                } else {
                    console.error('Units fetch failed:', unitsResponse.status, unitsResponse.statusText);
                }
                
                // Sales items are not needed for new purchase, set empty array
                setAllSalesItems([]);
                
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoading(false);
            }
        }
        
        fetchData();
    }, [currentStore?.id]);

    useEffect(() => {
        if (searchParams.get('draft') === 'true') {
            const storedItems = localStorage.getItem('draftPurchaseOrderItems');
            if (storedItems) {
                try {
                    const parsedItems = JSON.parse(storedItems);
                    setDraftItems(parsedItems);
                    // Clear the local storage after reading to avoid re-using old data
                    localStorage.removeItem('draftPurchaseOrderItems');
                } catch (error) {
                    console.error("Failed to parse draft items from localStorage:", error);
                }
            }
        }
    }, [searchParams]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p>Đang tải dữ liệu...</p>
            </div>
        );
    }

    return (
        <PurchaseOrderForm 
            products={products}
            units={units}
            allSalesItems={allSalesItems}
            suppliers={suppliers}
            contractors={contractors}
            draftItems={draftItems}
        />
    );
}
