'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Zap, Store } from 'lucide-react'
import { useStore } from '@/contexts/store-context'
import { Alert, AlertDescription } from "@/components/ui/alert"

const quickPurchaseSchema = z.object({
  supplierId: z.string().min(1, "Vui lòng chọn nhà cung cấp."),
  productId: z.string().min(1, "Vui lòng chọn sản phẩm."),
  quantity: z.coerce.number().min(0.01, "Số lượng phải lớn hơn 0."),
  cost: z.coerce.number().min(0, "Giá phải là số không âm."),
  unitId: z.string().min(1, "Đơn vị tính không được để trống."),
  importDate: z.string().min(1, "Ngày nhập là bắt buộc."),
});

type QuickPurchaseFormValues = z.infer<typeof quickPurchaseSchema>;

interface Product {
  id: string;
  name: string;
  unitId: string;
  costPrice?: number;
  supplierName?: string;
}

interface Unit {
  id: string;
  name: string;
  baseUnitId?: string;
  conversionFactor?: number;
}

interface Supplier {
  id: string;
  name: string;
  phone?: string;
}

interface QuickPurchaseDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  products: Product[];
  units: Unit[];
  suppliers: Supplier[];
  preselectedProductId?: string;
  onSuccess?: () => void; // Add callback for successful purchase
}

export function QuickPurchaseDialog({ 
  isOpen, 
  onOpenChange, 
  products, 
  units,
  suppliers,
  preselectedProductId,
  onSuccess
}: QuickPurchaseDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { currentStore } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supplierProducts, setSupplierProducts] = useState<string[]>([]); // Product IDs for selected supplier
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const unitsMap = new Map(units.map(u => [u.id, u]));

  const form = useForm<QuickPurchaseFormValues>({
    resolver: zodResolver(quickPurchaseSchema),
    defaultValues: {
      supplierId: '',
      productId: preselectedProductId || '',
      quantity: 1,
      cost: 0,
      unitId: '',
      importDate: new Date().toISOString().split('T')[0],
    },
  });

  const selectedProductId = form.watch('productId');
  const selectedSupplierId = form.watch('supplierId');
  const selectedProduct = products.find(p => p.id === selectedProductId);

  // Fetch products for selected supplier
  useEffect(() => {
    if (!selectedSupplierId || !currentStore?.id) {
      setSupplierProducts([]);
      return;
    }

    const fetchSupplierProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const token = localStorage.getItem('auth_token');
        const headers: Record<string, string> = {
          'X-Store-Id': currentStore.id,
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Fetch purchase orders for this supplier to get product list
        const response = await fetch(`/api/purchases?supplierId=${selectedSupplierId}&pageSize=1000`, {
          headers,
        });

        if (response.ok) {
          const result = await response.json();
          const purchases = result.data || [];
          
          // Extract unique product IDs from purchase items
          const productIds = new Set<string>();
          for (const purchase of purchases) {
            if (purchase.items && Array.isArray(purchase.items)) {
              purchase.items.forEach((item: any) => {
                if (item.productId) {
                  productIds.add(item.productId);
                }
              });
            }
          }
          
          setSupplierProducts(Array.from(productIds));
        }
      } catch (error) {
        console.error('Error fetching supplier products:', error);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchSupplierProducts();
  }, [selectedSupplierId, currentStore]);

  // Auto-select unit and fill cost when product changes
  useEffect(() => {
    if (selectedProduct) {
      // Auto-select unit
      if (selectedProduct.unitId) {
        form.setValue('unitId', selectedProduct.unitId);
      }
      
      // Auto-fill cost price
      if (selectedProduct.costPrice && selectedProduct.costPrice > 0) {
        form.setValue('cost', selectedProduct.costPrice);
      }
    }
  }, [selectedProduct, form]);

  // Reset product selection when supplier changes
  useEffect(() => {
    if (selectedSupplierId) {
      form.setValue('productId', '');
    }
  }, [selectedSupplierId, form]);

  // Filter products based on selected supplier
  const filteredProducts = selectedSupplierId && supplierProducts.length > 0
    ? products.filter(p => supplierProducts.includes(p.id))
    : products;

  const onSubmit = async (data: QuickPurchaseFormValues) => {
    // Check if store is selected
    if (!currentStore?.id) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Vui lòng chọn cửa hàng trước khi nhập hàng.",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Get unit info for conversion
      const unit = unitsMap.get(data.unitId);
      let baseQuantity = data.quantity;
      let baseCost = data.cost;
      let baseUnitId = data.unitId;
      
      // If unit has conversion factor, calculate base values
      if (unit && unit.baseUnitId && unit.conversionFactor) {
        baseQuantity = data.quantity * unit.conversionFactor;
        baseCost = data.cost / unit.conversionFactor;
        baseUnitId = unit.baseUnitId;
      }
      
      // Call API to create quick purchase
      const token = localStorage.getItem('auth_token');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Store-Id': currentStore.id,
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/purchases/quick', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          supplierId: data.supplierId,
          productId: data.productId,
          quantity: data.quantity,        // Original quantity
          cost: data.cost,                // Original cost
          unitId: data.unitId,            // Original unit
          baseQuantity,                   // Converted quantity
          baseCost,                       // Converted cost
          baseUnitId,                     // Base unit
          importDate: data.importDate,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Thành công!",
          description: "Đã nhập hàng nhanh thành công.",
        });
        onOpenChange(false);
        form.reset();
        
        // Call success callback to refresh products list
        if (onSuccess) {
          onSuccess();
        }
        
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: result.error || "Không thể nhập hàng.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Đã xảy ra lỗi khi nhập hàng.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Nhập hàng nhanh
          </DialogTitle>
          <DialogDescription>
            Nhập nhanh một sản phẩm mà không cần tạo đơn nhập hàng.
          </DialogDescription>
        </DialogHeader>
        
        {/* Display current store */}
        {currentStore && (
          <Alert className="bg-blue-50 border-blue-200">
            <Store className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              Nhập hàng cho: <strong>{currentStore.name}</strong>
            </AlertDescription>
          </Alert>
        )}
        
        {!currentStore && (
          <Alert variant="destructive">
            <AlertDescription>
              Vui lòng chọn cửa hàng trước khi nhập hàng.
            </AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nhà cung cấp</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn nhà cung cấp" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Chưa có nhà cung cấp. Vui lòng thêm nhà cung cấp trước.
                        </div>
                      ) : (
                        suppliers.map(supplier => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {suppliers.length === 0 && (
                    <p className="text-sm text-amber-600">
                      Bạn cần tạo nhà cung cấp trước. Vào menu "Nhà cung cấp" để thêm.
                    </p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sản phẩm</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={!selectedSupplierId || isLoadingProducts}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !selectedSupplierId 
                            ? "Chọn nhà cung cấp trước" 
                            : isLoadingProducts 
                            ? "Đang tải..." 
                            : "Chọn sản phẩm"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredProducts.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          {selectedSupplierId 
                            ? "Chưa có sản phẩm nào từ NCC này. Hãy nhập lần đầu bằng form đầy đủ."
                            : "Vui lòng chọn nhà cung cấp trước"
                          }
                        </div>
                      ) : (
                        filteredProducts.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            <div className="flex flex-col">
                              <span>{product.name}</span>
                              {product.supplierName && (
                                <span className="text-xs text-muted-foreground">
                                  NCC: {product.supplierName}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {selectedSupplierId && filteredProducts.length === 0 && !isLoadingProducts && (
                    <p className="text-sm text-amber-600">
                      Nhà cung cấp này chưa có sản phẩm nào. Vui lòng tạo đơn nhập hàng đầy đủ trước.
                    </p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="importDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ngày nhập</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Đơn vị tính</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn ĐVT" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {units.map(unit => {
                          const baseUnit = unit.baseUnitId ? unitsMap.get(unit.baseUnitId) : null;
                          const displayValue = baseUnit 
                            ? `${unit.name} (${unit.conversionFactor} ${baseUnit.name})` 
                            : unit.name;
                          return (
                            <SelectItem key={unit.id} value={unit.id}>
                              {displayValue}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số lượng</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Giá nhập (trên 1 đơn vị)</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting || !currentStore}>
                {isSubmitting ? 'Đang lưu...' : 'Nhập hàng'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
