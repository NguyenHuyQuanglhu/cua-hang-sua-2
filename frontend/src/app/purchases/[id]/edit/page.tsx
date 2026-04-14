'use client'

import { useEffect, useState, use } from "react";
import { Product, Unit, SalesItem, PurchaseOrder, Supplier, Contractor } from "@/lib/types";
import { PurchaseOrderForm } from "../../components/purchase-order-form";
import { notFound } from "next/navigation";
import { useStore } from "@/contexts/store-context";
import { Button } from "@/components/ui/button";

export default function EditPurchasePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const { currentStore } = useStore();
    
    const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [contractors, setContractors] = useState<Contractor[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [allSalesItems, setAllSalesItems] = useState<SalesItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notFoundState, setNotFoundState] = useState(false);

    useEffect(() => {
        async function fetchData() {
            if (!currentStore?.id) return;
            
            setIsLoading(true);
            try {
                const token = localStorage.getItem('auth_token');
                const headers: Record<string, string> = {
                    'X-Store-Id': currentStore.id,
                };
                
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                
                // Fetch purchase order
                const orderResponse = await fetch(`/api/purchases/${resolvedParams.id}`, {
                    headers,
                });
                
                if (!orderResponse.ok) {
                    if (orderResponse.status === 404) {
                        setNotFoundState(true);
                        return;
                    }
                    throw new Error('Failed to fetch purchase order');
                }
                
                const orderResult = await orderResponse.json();
                console.log('Purchase order data:', orderResult);
                setPurchaseOrder(orderResult.purchaseOrder);
                
                // Fetch products
                const productsResponse = await fetch('/api/products?pageSize=1000', {
                    headers,
                });
                if (productsResponse.ok) {
                    const productsResult = await productsResponse.json();
                    console.log('Products data:', productsResult);
                    setProducts(productsResult.data || []);
                }
                
                // Fetch suppliers
                const suppliersResponse = await fetch('/api/suppliers', {
                    headers,
                });
                if (suppliersResponse.ok) {
                    const suppliersResult = await suppliersResponse.json();
                    // Backend returns { success: true, data: [...] }
                    setSuppliers(suppliersResult.data || suppliersResult.suppliers || []);
                }

                // Fetch contractors
                const contractorsResponse = await fetch('/api/proxy/contractors', {
                    headers,
                });
                if (contractorsResponse.ok) {
                    const contractorsResult = await contractorsResponse.json();
                    setContractors(contractorsResult.data || []);
                }
                
                // Fetch units
                const unitsResponse = await fetch('/api/units', {
                    headers,
                });
                if (unitsResponse.ok) {
                    const unitsResult = await unitsResponse.json();
                    console.log('Units data:', unitsResult);
                    // Backend returns array directly
                    const unitsList = Array.isArray(unitsResult) ? unitsResult : (unitsResult.units || []);
                    console.log('Units list:', unitsList);
                    setUnits(unitsList);
                }
                
                // Sales items are not needed for edit, set empty array
                setAllSalesItems([]);
                
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoading(false);
            }
        }
        
        fetchData();
    }, [currentStore?.id, resolvedParams.id]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    if (notFoundState || !purchaseOrder) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Không tìm thấy đơn nhập hàng</h2>
                    <p className="text-muted-foreground mb-4">Đơn nhập hàng này không tồn tại hoặc đã bị xóa.</p>
                    <Button onClick={() => window.location.href = '/purchases'}>
                        Quay lại danh sách
                    </Button>
                </div>
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
            purchaseOrder={purchaseOrder}
        />
    );
}
