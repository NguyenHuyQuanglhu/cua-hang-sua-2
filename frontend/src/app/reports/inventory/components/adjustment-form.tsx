'use client'

import { useEffect, useMemo, useState } from 'react'
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
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { upsertProduct } from '@/app/products/actions'
import { useStore } from '@/contexts/store-context'
import { Product, PurchaseLot, Unit } from '@/lib/types'
import { apiClient } from '@/lib/api-client'

const adjustmentFormSchema = z.object({
  actualStock: z.coerce.number().min(0, "Số lượng phải là số không âm.").optional(),
  notes: z.string().optional(),
});

type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>;

interface InventoryAdjustmentFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  productInfo: {
    productId: string;
    productName: string;
    closingStock: number; // in base units
    mainUnit?: Unit;
    baseUnit?: Unit;
  }
}

export function InventoryAdjustmentForm({ isOpen, onOpenChange, productInfo }: InventoryAdjustmentFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { currentStore } = useStore();

  const [productData, setProductData] = useState<Product | null>(null);

  useEffect(() => {
    if (!isOpen || !productInfo?.productId) return;

    const fetchProduct = async () => {
      try {
        const response = await apiClient.getProduct(productInfo.productId);
        setProductData((response as any).data || response as Product);
      } catch (error) {
        console.error('Error fetching product:', error);
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Không thể tải thông tin sản phẩm."
        });
      }
    };

    fetchProduct();
  }, [isOpen, productInfo?.productId, toast]);
  
  const conversionFactor = productInfo.mainUnit?.conversionFactor || 1;

  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: { actualStock: 0, notes: '' },
  });

  useEffect(() => {
    if (isOpen) {
      const stockInMainUnit = productInfo.closingStock / conversionFactor;

      form.reset({
        actualStock: stockInMainUnit,
        notes: `Điều chỉnh tồn kho cho ${productInfo.productName}`,
      });
    }
  }, [isOpen, productInfo, form, conversionFactor]);

  const onSubmit = async (data: AdjustmentFormValues) => {
    if (!productData) {
        toast({ variant: "destructive", title: "Lỗi", description: "Không tìm thấy dữ liệu sản phẩm." });
        return;
    }
    
    const actualStockInMainUnits = data.actualStock || 0;
    
    // We calculate the difference in the MAIN unit of the product
    const currentStockInMainUnits = productInfo.closingStock / conversionFactor;
    const differenceInMainUnits = actualStockInMainUnits - currentStockInMainUnits;

    if (Math.abs(differenceInMainUnits) < 0.001) {
        toast({ title: "Thông báo", description: "Không có sự thay đổi nào về tồn kho." });
        onOpenChange(false);
        return;
    }

    // The adjustment lot should represent the difference in the product's main unit
    const adjustmentLot: PurchaseLot = {
        importDate: new Date().toISOString(),
        quantity: differenceInMainUnits,
        cost: 0, 
        unitId: productInfo.mainUnit?.id || productData.unitId, // Use MAIN unit ID
    };

    const result = await upsertProduct({
        id: productData.id,
        purchaseLots: [adjustmentLot],
    });


    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã điều chỉnh tồn kho cho sản phẩm ${productInfo.productName}.`,
      });
      onOpenChange(false);
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
  };

  const { mainUnit, baseUnit } = productInfo;
  
  const displayUnitName = mainUnit?.name || baseUnit?.name || '';
  
  const systemStockInMainUnit = productInfo.closingStock / conversionFactor;


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Điều chỉnh tồn kho</DialogTitle>
          <DialogDescription>
            Cập nhật số lượng tồn kho thực tế cho sản phẩm <span className="font-semibold">{productInfo.productName}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm">
            Tồn kho trên hệ thống: <span className="font-bold">{systemStockInMainUnit.toLocaleString(undefined, {maximumFractionDigits: 2})} {mainUnit?.name}</span>
            {mainUnit?.id !== baseUnit?.id && ` (tương đương ${productInfo.closingStock.toLocaleString(undefined, {maximumFractionDigits: 2})} ${baseUnit?.name})`}
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="actualStock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tồn kho thực tế ({displayUnitName})</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" {...field} />
                  </FormControl>
                  <FormDescription>
                    Nhập số lượng thực tế theo đơn vị chính của sản phẩm.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Lý do điều chỉnh..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu điều chỉnh'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
