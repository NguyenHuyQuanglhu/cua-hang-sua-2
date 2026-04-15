'use client'

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { useStore } from "@/contexts/store-context"
import { useToast } from "@/hooks/use-toast"
import { ShoppingCart } from "lucide-react"

interface Supplier {
  id: string;
  name: string;
}

interface Contractor {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  name: string;
}

interface ProductToImport {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
  unitId: string;
  unitName: string;
  currentStock: number;
}

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ProductToImport[];
  onSuccess: (count: number) => void;
}

export function BulkImportDialog({
  open,
  onOpenChange,
  products,
  onSuccess,
}: BulkImportDialogProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Default values for bulk import
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [selectedContractorId, setSelectedContractorId] = useState<string>("");
  const [defaultQuantity, setDefaultQuantity] = useState<number>(10);
  
  const { currentStore } = useStore();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
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
        
        // Fetch suppliers
        const suppliersResponse = await fetch('/api/suppliers', { headers });
        if (suppliersResponse.ok) {
          const suppliersResult = await suppliersResponse.json();
          setSuppliers(suppliersResult.data || []);
        }

        // Fetch contractors
        const contractorsResponse = await fetch('/api/proxy/contractors', { headers });
        if (contractorsResponse.ok) {
          const contractorsResult = await contractorsResponse.json();
          setContractors(contractorsResult.data || []);
        }

        // Fetch units
        const unitsResponse = await fetch('/api/units', { headers });
        if (unitsResponse.ok) {
          const unitsResult = await unitsResponse.json();
          if (Array.isArray(unitsResult)) {
            setUnits(unitsResult);
          } else {
            setUnits(unitsResult.data || unitsResult.units || []);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      fetchData();
      setSelectedSupplierId("");
      setSelectedContractorId("");
      setDefaultQuantity(10);
    }
  }, [open, currentStore?.id]);

  const onSubmit = async () => {
    if (!currentStore?.id) return;
    
    if (!selectedSupplierId) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Vui lòng chọn nhà cung cấp chung cho lô hàng",
      });
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    
    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Store-Id': currentStore.id,
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Tạo mảng items gộp tất cả sản phẩm
      const items = products.map(product => ({
        productId: product.id,
        quantity: defaultQuantity,
        cost: product.costPrice || 0,
        unitId: product.unitId,
        baseQuantity: defaultQuantity,
        baseCost: product.costPrice || 0,
        baseUnitId: product.unitId,
      }));

      const payload = {
        supplierId: selectedSupplierId,
        contractorId: selectedContractorId || undefined,
        importDate: new Date().toISOString().split('T')[0],
        notes: "Nhập hàng hàng loạt (Bulk Import)",
        items: items
      };

      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        successCount = products.length;
      }

      if (successCount > 0) {
        toast({
          title: "Thành công!",
          description: `Đã nhập hàng thành công chung 1 mã phiếu nhập cho ${successCount} sản phẩm`,
        });
        onSuccess(successCount);
        onOpenChange(false);
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Không có sản phẩm nào được nhập thành công",
        });
      }
    } catch (error) {
      console.error('Error creating bulk purchases:', error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Lỗi hệ thống khi nhập hàng hàng loạt",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const totalCost = products.reduce((sum, p) => sum + (p.costPrice || 0) * defaultQuantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Nhập nhanh {products.length} sản phẩm
          </DialogTitle>
          <DialogDescription>
            Thiết lập cấu hình chung để nhập tự động cho tất cả {products.length} sản phẩm đã chọn.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nhà cung cấp chung *</label>
            <select
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              disabled={isLoading || isSubmitting}
            >
              <option value="" disabled>Chọn nhà cung cấp</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nhà thầu chung</label>
            <select
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedContractorId}
              onChange={(e) => setSelectedContractorId(e.target.value)}
              disabled={isLoading || isSubmitting}
            >
              <option value="">Không chọn</option>
              {contractors.map((contractor) => (
                <option key={contractor.id} value={contractor.id}>{contractor.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Số lượng nhập mỗi sản phẩm *</label>
            <input
              type="number"
              min="1"
              value={defaultQuantity}
              onChange={(e) => setDefaultQuantity(parseInt(e.target.value) || 1)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading || isSubmitting}
            />
          </div>

          <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">Tổng số sản phẩm:</span>
              <span>{products.length}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-t pt-2 border-primary/20">
              <span className="font-medium">Tổng tiền dự kiến:</span>
              <span className="font-bold text-primary">{formatCurrency(totalCost)}</span>
            </div>
            <p className="text-xs text-muted-foreground italic mt-2">
              *Hệ thống sẽ tạo ra DUY NHẤT 1 phiếu nhập hàng gom nhóm cho tất cả sản phẩm được chọn trên đây.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Đang xử lý..." : "Bắt đầu Nhập"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
