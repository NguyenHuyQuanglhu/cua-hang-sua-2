'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PurchaseOrderForm } from './purchase-order-form'
import { Product, Unit, Supplier, Contractor, PurchaseOrder } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { useStore } from '@/contexts/store-context'

interface EditPurchaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchaseOrderId: string
  onSuccess?: () => void
}

export function EditPurchaseDialog({ 
  open, 
  onOpenChange, 
  purchaseOrderId,
  onSuccess 
}: EditPurchaseDialogProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const { currentStore } = useStore()
  const { toast } = useToast()

  useEffect(() => {
    if (open && purchaseOrderId && currentStore?.id) {
      fetchData()
    }
  }, [open, purchaseOrderId, currentStore?.id])

  const fetchData = async () => {
    if (!currentStore?.id) {
      console.error('No current store ID');
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không tìm thấy cửa hàng hiện tại",
      });
      onOpenChange(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Store-Id': currentStore.id,
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log('Fetching purchase order:', purchaseOrderId);
      console.log('Store ID:', currentStore.id);
      console.log('Headers:', headers);

      // Fetch purchase order, products, suppliers, contractors, and units in parallel
      const [purchaseRes, productsRes, suppliersRes, contractorsRes, unitsRes] = await Promise.all([
        fetch(`/api/purchases/${purchaseOrderId}`, { headers }),
        fetch('/api/products', { headers }),
        fetch('/api/suppliers', { headers }),
          fetch('/api/proxy/contractors', { headers }),
        fetch('/api/units', { headers }),
      ])

      console.log('Purchase response status:', purchaseRes.status);

      if (!purchaseRes.ok) {
        const errorText = await purchaseRes.text()
        console.error('Purchase fetch error:', purchaseRes.status, errorText)
        throw new Error(`Không thể tải đơn nhập hàng (${purchaseRes.status}): ${errorText}`)
      }

      const purchaseData = await purchaseRes.json()
      console.log('Purchase data received:', purchaseData)
      console.log('Purchase order:', purchaseData.purchaseOrder)
      console.log('Items:', purchaseData.purchaseOrder?.items)
      
      // Backend returns arrays directly, not wrapped in objects
      const productsData = productsRes.ok ? await productsRes.json() : { data: [] }
      const suppliersData = suppliersRes.ok ? await suppliersRes.json() : { suppliers: [] }
      const contractorsData = contractorsRes.ok ? await contractorsRes.json() : { data: [] }
      const unitsData = unitsRes.ok ? await unitsRes.json() : []

      console.log('Products response:', productsData);
      console.log('Suppliers response:', suppliersData);
      console.log('Contractors response:', contractorsData);
      console.log('Units response:', unitsData);

      // Handle different response formats
      const productsArray = productsData.data || productsData || [];
      const suppliersArray = suppliersData.data || suppliersData.suppliers || suppliersData || [];
      const contractorsArray = contractorsData.data || contractorsData || [];
      const unitsArray = Array.isArray(unitsData) ? unitsData : [];

      console.log('Products:', productsArray.length);
      console.log('Suppliers:', suppliersArray.length);
      console.log('Contractors:', contractorsArray.length);
      console.log('Units:', unitsArray.length);

      const purchaseOrderData = purchaseData.purchaseOrder || purchaseData;
      console.log('Setting purchase order:', purchaseOrderData);

      setPurchaseOrder(purchaseOrderData)
      setProducts(productsArray)
      setSuppliers(suppliersArray)
      setContractors(contractorsArray)
      setUnits(unitsArray)
    } catch (error) {
      console.error('Error fetching data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Không thể tải dữ liệu đơn nhập hàng';
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: errorMessage,
      })
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuccess = () => {
    onOpenChange(false)
    if (onSuccess) {
      onSuccess()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa đơn nhập hàng</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
              </div>
            </div>
          ) : purchaseOrder ? (
            <PurchaseOrderForm
              products={products}
              suppliers={suppliers}
              contractors={contractors}
              units={units}
              allSalesItems={[]}
              purchaseOrder={purchaseOrder}
              isDialog={true}
              onSuccess={handleSuccess}
            />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-destructive">Không tìm thấy đơn nhập hàng</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
