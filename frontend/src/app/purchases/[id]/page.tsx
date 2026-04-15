'use client'

import { useEffect, useState } from "react"
import { notFound, useParams } from "next/navigation"
import type { PurchaseOrder, PurchaseOrderItem, Product, Unit, ThemeSettings, Supplier, Contractor } from "@/lib/types"
import { PurchaseOrderInvoice } from "./components/purchase-order-invoice";
import { useStore } from "@/contexts/store-context"

interface PurchaseOrderWithDetails extends PurchaseOrder {
  supplierName?: string;
  contractorName?: string;
}

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { currentStore } = useStore();
  
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderWithDetails | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [productsMap, setProductsMap] = useState<Map<string, Product>>(new Map());
  const [unitsMap, setUnitsMap] = useState<Map<string, Unit>>(new Map());
  const [settings, setSettings] = useState<ThemeSettings | null>(null);
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
        const orderResponse = await fetch(`/api/purchases/${params.id}`, {
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
        setPurchaseOrder(orderResult.purchaseOrder);
        
        // Fetch supplier if exists
        if (orderResult.purchaseOrder?.supplierId) {
          const supplierResponse = await fetch(`/api/suppliers/${orderResult.purchaseOrder.supplierId}`, {
            headers,
          });
          if (supplierResponse.ok) {
            const supplierResult = await supplierResponse.json();
            setSupplier((supplierResult.supplier || supplierResult) as Supplier);
          }
        }

        if (orderResult.purchaseOrder?.contractorId) {
          const contractorResponse = await fetch(`/api/contractors/${orderResult.purchaseOrder.contractorId}`, {
            headers,
          });
          if (contractorResponse.ok) {
            const contractorResult = await contractorResponse.json();
            setContractor(contractorResult as Contractor);
          }
        }
        
        // Fetch products for items
        const productIds = [...new Set(orderResult.purchaseOrder?.items?.map((item: PurchaseOrderItem) => item.productId) || [])];
        if (productIds.length > 0) {
          const productsResponse = await fetch('/api/products', {
            headers,
          });
          if (productsResponse.ok) {
            const productsResult = await productsResponse.json();
            const map = new Map<string, Product>();
            const products = Array.isArray(productsResult) ? productsResult : (productsResult.data || []);
            products.forEach((p: Product) => {
              if (productIds.includes(p.id)) {
                map.set(p.id, p);
              }
            });
            setProductsMap(map);
          }
        }
        
        // Fetch units
        const unitsResponse = await fetch('/api/units', {
          headers,
        });
        if (unitsResponse.ok) {
          const unitsResult = await unitsResponse.json();
          const map = new Map<string, Unit>();
          const units = Array.isArray(unitsResult) ? unitsResult : (unitsResult.units || []);
          units.forEach((u: Unit) => map.set(u.id, u));
          setUnitsMap(map);
        }
        
        // TODO: Fetch settings when settings API is implemented
        // For now, use default settings
        setSettings(null);
        
      } catch (error) {
        console.error('Error fetching purchase order data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [currentStore?.id, params.id]);

  if (notFoundState) {
    notFound();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (!purchaseOrder) {
    notFound();
  }

  return (
    <PurchaseOrderInvoice 
      purchaseOrder={purchaseOrder} 
      items={purchaseOrder.items || []} 
      productsMap={productsMap} 
      unitsMap={unitsMap} 
      settings={settings} 
      supplier={supplier} 
      contractor={contractor}
    />
  );
}
