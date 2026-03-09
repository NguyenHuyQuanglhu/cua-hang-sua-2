'use client'

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { useStore } from "@/contexts/store-context"
import { useToast } from "@/hooks/use-toast"

const quickImportSchema = z.object({
  supplierId: z.string().min(1, "Vui lòng chọn nhà cung cấp"),
  unitId: z.string().min(1, "Vui lòng chọn đơn vị"),
  quantity: z.coerce.number().min(1, "Số lượng phải lớn hơn 0"),
  cost: z.coerce.number().min(0, "Giá nhập không được âm"),
  importDate: z.string().min(1, "Vui lòng chọn ngày nhập"),
})

type QuickImportFormValues = z.infer<typeof quickImportSchema>

interface Supplier {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  name: string;
}

interface ProductUnitConfig {
  id: string;
  productId: string;
  baseUnitId: string;
  baseUnitName?: string;
  conversionUnitId: string;
  conversionUnitName?: string;
  conversionRate: number;
  baseUnitPrice: number;
  conversionUnitPrice: number;
}

interface QuickImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    sku: string;
    costPrice: number;
    unitId: string;
    unitName: string;
    currentStock: number;
  };
  onSuccess: () => void;
}

export function QuickImportDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: QuickImportDialogProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [productUnitConfig, setProductUnitConfig] = useState<ProductUnitConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { currentStore } = useStore();
  const { toast } = useToast();

  const form = useForm<QuickImportFormValues>({
    resolver: zodResolver(quickImportSchema),
    defaultValues: {
      supplierId: "",
      unitId: product.unitId || "",
      quantity: 10,
      cost: product.costPrice || 0,
      importDate: new Date().toISOString().split('T')[0],
    },
  })

  // Fetch suppliers, units, and product unit configuration
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
          setSuppliers(suppliersResult.suppliers || []);
        }

        // Fetch units
        const unitsResponse = await fetch('/api/units', { headers });
        if (unitsResponse.ok) {
          const unitsResult = await unitsResponse.json();
          setUnits(unitsResult.units || []);
        }

        // Fetch product unit configuration
        const productUnitsResponse = await fetch(`/api/products/${product.id}/units`, { headers });
        if (productUnitsResponse.ok) {
          const productUnitsResult = await productUnitsResponse.json();
          setProductUnitConfig(productUnitsResult.productUnit || null);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      fetchData();
      // Reset form with product data
      form.reset({
        supplierId: "",
        unitId: product.unitId || "",
        quantity: 10,
        cost: product.costPrice || 0,
        importDate: new Date().toISOString().split('T')[0],
      });
    }
  }, [open, currentStore?.id, product, form]);

  const onSubmit = async (data: QuickImportFormValues) => {
    if (!currentStore?.id) return;
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Store-Id': currentStore.id,
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Calculate base quantity and cost if using conversion unit
      let baseQuantity = data.quantity;
      let baseCost = data.cost;
      let baseUnitId = data.unitId;

      if (productUnitConfig) {
        // Check if selected unit is the conversion unit
        if (data.unitId === productUnitConfig.conversionUnitId) {
          // Convert to base unit
          baseQuantity = data.quantity * productUnitConfig.conversionRate;
          baseCost = data.cost / productUnitConfig.conversionRate;
          baseUnitId = productUnitConfig.baseUnitId;
          
          console.log('Unit conversion:', {
            selectedUnit: data.unitId,
            quantity: data.quantity,
            cost: data.cost,
            conversionRate: productUnitConfig.conversionRate,
            baseQuantity,
            baseCost,
            baseUnitId
          });
        }
      }

      const payload = {
        supplierId: data.supplierId,
        productId: product.id,
        quantity: data.quantity,
        cost: data.cost,
        unitId: data.unitId,
        importDate: data.importDate,
        // Include base values for unit conversion
        baseQuantity,
        baseCost,
        baseUnitId,
      };

      console.log('Quick import payload:', payload);

      const response = await fetch('/api/purchases/quick', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const selectedUnit = units.find(u => u.id === data.unitId);
        const unitName = selectedUnit?.name || product.unitName;
        toast({
          title: "Thành công!",
          description: `Đã nhập ${data.quantity} ${unitName} cho sản phẩm "${product.name}"`,
        });
        onSuccess();
        onOpenChange(false);
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: error.error || "Không thể nhập hàng",
        });
      }
    } catch (error) {
      console.error('Error creating quick purchase:', error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể nhập hàng",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const quantity = form.watch("quantity");
  const cost = form.watch("cost");
  const totalAmount = quantity * cost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nhập Hàng Nhanh</DialogTitle>
          <DialogDescription>
            Nhập hàng cho sản phẩm: <strong>{product.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2 text-sm border rounded-lg p-3 bg-muted/50">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mã SKU:</span>
            <code className="bg-background px-2 py-0.5 rounded">{product.sku || 'N/A'}</code>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Đơn vị cơ bản:</span>
            <span className="font-medium">{product.unitName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tồn kho hiện tại:</span>
            <span className="font-medium text-destructive">{product.currentStock} {product.unitName}</span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nhà cung cấp *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn nhà cung cấp" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Đơn vị nhập *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn đơn vị nhập hàng" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name}
                          {unit.id === product.unitId && (
                            <span className="ml-2 text-xs text-muted-foreground">(Đơn vị cơ bản)</span>
                          )}
                          {productUnitConfig && unit.id === productUnitConfig.conversionUnitId && (
                            <span className="ml-2 text-xs text-green-600">
                              (1 = {productUnitConfig.conversionRate} {productUnitConfig.baseUnitName})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ví dụ: Thùng, Hộp, Cái, Lốc... Chọn đơn vị bạn đang nhập
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="importDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ngày nhập *</FormLabel>
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
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số lượng *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Nhập số lượng"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {form.watch("unitId") && units.find(u => u.id === form.watch("unitId"))?.name 
                        ? `Số lượng ${units.find(u => u.id === form.watch("unitId"))?.name}` 
                        : "Chọn đơn vị trước"}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giá nhập *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="1000"
                        placeholder="Giá nhập"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {form.watch("unitId") && units.find(u => u.id === form.watch("unitId"))?.name 
                        ? `Giá/${units.find(u => u.id === form.watch("unitId"))?.name}` 
                        : "VNĐ"}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Tổng tiền nhập:</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(totalAmount)}</span>
              </div>
              {form.watch("unitId") && form.watch("quantity") > 0 && (
                <p className="text-xs text-muted-foreground text-right">
                  {form.watch("quantity")} {units.find(u => u.id === form.watch("unitId"))?.name} × {formatCurrency(form.watch("cost"))}
                </p>
              )}
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang xử lý..." : "Nhập hàng"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
