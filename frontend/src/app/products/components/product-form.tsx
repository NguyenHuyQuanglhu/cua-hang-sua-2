



'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import React from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Category, Unit } from '@/lib/types'

// Product type for the form (without purchaseLots since they're managed separately in SQL Server)
interface Product {
  id: string;
  name: string;
  barcode?: string;
  description?: string;
  categoryId: string;
  unitId: string;
  costPrice?: number; // Added costPrice field
  sellingPrice?: number;
  status: 'active' | 'draft' | 'archived';
  lowStockThreshold?: number;
  purchaseLots?: PurchaseLot[]; // Added purchaseLots field
}

interface PurchaseLot {
  importDate: string;
  quantity: number;
  cost: number;
  unitId: string;
}
import { upsertProduct } from '../actions'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { PlusCircle, Trash2, Wrench, Sparkles, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getProductInfoSuggestion } from '@/app/actions'
import { Textarea } from '@/components/ui/textarea'

// Helper component for formatted number input
const FormattedNumberInput = React.forwardRef<HTMLInputElement, { value: number; onChange: (value: number) => void; [key: string]: any }>(
  ({ value, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(value?.toLocaleString('en-US') || '');

    useEffect(() => {
      // Update display value when the underlying form value changes
      setDisplayValue(value?.toLocaleString('en-US') || '');
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/,/g, '');
      const numberValue = parseInt(rawValue, 10);

      if (!isNaN(numberValue)) {
        setDisplayValue(numberValue.toLocaleString('en-US'));
        onChange(numberValue);
      } else if (rawValue === '') {
        setDisplayValue('');
        onChange(0); // Or handle as needed
      }
    };

    return <Input ref={ref} type="text" value={displayValue} onChange={handleChange} {...props} />;
  }
);

FormattedNumberInput.displayName = 'FormattedNumberInput';


const purchaseLotSchema = z.object({
    importDate: z.string().min(1, "Ngày nhập không được để trống."),
    quantity: z.coerce.number().min(0, "Số lượng phải là số dương."),
    cost: z.coerce.number().min(0, "Giá phải là số dương."),
    unitId: z.string().min(1, "Đơn vị tính không được để trống."),
});

const productFormSchema = z.object({
  name: z.string().min(1, "Tên sản phẩm không được để trống."),
  barcode: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Danh mục là bắt buộc."),
  unitId: z.string().min(1, "Đơn vị tính là bắt buộc."),
  costPrice: z.coerce.number().optional(),
  sellingPrice: z.coerce.number().optional(),
  status: z.enum(['active', 'draft', 'archived']),
  lowStockThreshold: z.coerce.number().optional(),
  purchaseLots: z.array(purchaseLotSchema).optional(),
});


type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  product?: Product;
  categories: Category[];
  units: Unit[];
}

export function ProductForm({ isOpen, onOpenChange, product, categories, units }: ProductFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSuggesting, startSuggestionTransition] = useTransition();

  const unitsMap = useMemo(() => {
    const map = new Map<string, Unit>();
    units?.forEach(u => map.set(u.id, u));
    return map;
  }, [units]);
  
  const categoriesMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories?.forEach(c => map.set(c.id, c));
    return map;
  }, [categories]);

  const getBaseUnitInfo = (unitId: string): { baseUnit?: Unit; conversionFactor: number } => {
    const unit = unitsMap.get(unitId);
    if (!unit) return { conversionFactor: 1 };
    
    if (unit.baseUnitId && unit.conversionFactor) {
      const baseUnit = unitsMap.get(unit.baseUnitId);
      return { baseUnit, conversionFactor: unit.conversionFactor };
    }
    
    return { baseUnit: unit, conversionFactor: 1 };
  };

  const defaultValues: Partial<ProductFormValues> = product
    ? { 
        name: product.name, 
        barcode: product.barcode,
        description: product.description,
        categoryId: product.categoryId || '',
        unitId: product.unitId || '',
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        status: product.status,
        lowStockThreshold: product.lowStockThreshold,
        purchaseLots: (product.purchaseLots || []).map((lot) => ({
          ...lot,
          importDate: lot.importDate ? (typeof lot.importDate === 'string' ? lot.importDate.split('T')[0] : new Date(lot.importDate).toISOString().split('T')[0]) : new Date().toISOString().split('T')[0], // Format date for input
        }))
      }
    : { 
        name: '', 
        barcode: '',
        description: '',
        categoryId: '',
        unitId: '',
        costPrice: 0,
        sellingPrice: 0,
        status: 'draft',
        purchaseLots: []
      };
  
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "purchaseLots",
  });
  
  const purchaseLotsValues = form.watch('purchaseLots');
  const selectedUnitId = form.watch('unitId');
  const selectedUnit = unitsMap.get(selectedUnitId);
  const { baseUnit: mainProductBaseUnit } = getBaseUnitInfo(selectedUnitId);


  useEffect(() => {
    if (isOpen) {
        const formData = product
                ? {
                    name: product.name,
                    barcode: product.barcode || '',
                    description: product.description || '',
                    categoryId: product.categoryId || '',
                    unitId: product.unitId || '',
                    costPrice: product.costPrice || 0,
                    sellingPrice: product.sellingPrice || 0,
                    status: product.status,
                    lowStockThreshold: product.lowStockThreshold,
                    purchaseLots: product.purchaseLots && product.purchaseLots.length > 0 
                      ? product.purchaseLots.map(lot => ({...lot, importDate: lot.importDate.split('T')[0], unitId: lot.unitId })) 
                      : []
                  }
                : {
                    name: '',
                    barcode: '',
                    description: '',
                    categoryId: '',
                    unitId: '',
                    costPrice: 0,
                    sellingPrice: 0,
                    status: 'draft',
                    purchaseLots: []
                  };
        
        form.reset(formData);
    }
  }, [product, isOpen, form, units]);


  const onSubmit = async (data: ProductFormValues) => {
    console.log('[ProductForm] Form data before submit:', data);
    console.log('[ProductForm] unitId value:', data.unitId);
    
    const dataToSubmit = {
      ...data,
      id: product?.id,
    };

    console.log('[ProductForm] Data to submit:', dataToSubmit);

    const result = await upsertProduct(dataToSubmit);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã ${product ? 'cập nhật' : 'tạo'} sản phẩm thành công.`,
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
  
  const onError = (errors: any) => {
    console.log('[ProductForm] Validation errors:', errors);
    toast({
      variant: "destructive",
      title: "Lỗi validation",
      description: "Vui lòng kiểm tra lại các trường bắt buộc",
    });
  };
  
  const handleGetSuggestion = () => {
    const { name, categoryId, unitId, purchaseLots } = form.getValues();

    if (!name) {
      toast({
        variant: "destructive",
        title: "Thiếu thông tin",
        description: "Vui lòng nhập Tên sản phẩm trước khi lấy gợi ý.",
      });
      return;
    }

    startSuggestionTransition(async () => {
      let totalCost = 0;
      let totalQuantityInBaseUnit = 0;
      purchaseLots?.forEach(lot => {
          const { conversionFactor } = getBaseUnitInfo(lot.unitId);
          const quantityInBaseUnit = lot.quantity * conversionFactor;
          if (lot.cost > 0) {
            totalCost += lot.cost * quantityInBaseUnit;
            totalQuantityInBaseUnit += quantityInBaseUnit;
          }
      });
      const avgCost = totalQuantityInBaseUnit > 0 ? totalCost / totalQuantityInBaseUnit : 0;

      const result = await getProductInfoSuggestion({
        productName: name,
        categoryName: categoriesMap.get(categoryId)?.name || '',
        unitName: unitsMap.get(unitId)?.name || '',
        avgCost: avgCost,
      });

      if (result.success && result.data) {
        form.setValue('description', result.data.description, { shouldValidate: true, shouldDirty: true });
        form.setValue('sellingPrice', result.data.suggestedSellingPrice, { shouldValidate: true, shouldDirty: true });
        toast({
          title: "Đã nhận được gợi ý từ AI!",
          description: "Mô tả và giá bán đã được cập nhật.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: result.error || "Không thể lấy gợi ý từ AI.",
        });
      }
    });
  };
  
  const hasExistingLots = !!product?.purchaseLots && product.purchaseLots.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl grid-rows-[auto,1fr,auto] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</DialogTitle>
          <DialogDescription>
            {product ? 'Cập nhật chi tiết cho sản phẩm này.' : 'Tạo một sản phẩm mới trong kho của bạn.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onError)} className="grid grid-rows-[1fr_auto] gap-4 overflow-hidden">
            <div className='space-y-4 overflow-y-auto pr-6'>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên sản phẩm</FormLabel>
                      <FormControl>
                        <Input placeholder="Ví dụ: Laptop Pro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mã vạch (Barcode)</FormLabel>
                      <FormControl>
                        <Input placeholder="Nhập hoặc quét mã vạch" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleGetSuggestion} disabled={isSuggesting}>
                  {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Gợi ý bằng AI
                </Button>
                 <p className="text-xs text-muted-foreground">Tự động điền mô tả và giá bán.</p>
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả sản phẩm</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Mô tả chi tiết về sản phẩm..." {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Danh mục</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn một danh mục" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
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
                      <FormLabel>Đơn vị tính</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={hasExistingLots && !!product?.unitId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn đơn vị tính chính" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           {units.map(unit => {
                              const baseUnit = unit.baseUnitId ? unitsMap.get(unit.baseUnitId) : null;
                              const displayValue = baseUnit 
                                ? `${unit.name} (${unit.conversionFactor} ${baseUnit.name})` 
                                : unit.name;
                              return (
                                <SelectItem key={unit.id} value={unit.id}>{displayValue}</SelectItem>
                              )
                            })}
                        </SelectContent>
                      </Select>
                      {hasExistingLots && !!product?.unitId ? (
                        <FormDescription className="text-amber-600">
                          Không thể thay đổi đơn vị khi đã có lô nhập hàng.
                        </FormDescription>
                      ) : !field.value ? (
                        <FormDescription className="text-red-600">
                          Vui lòng chọn đơn vị tính để có thể nhập hàng.
                        </FormDescription>
                      ) : (
                        <FormDescription>
                          Đơn vị tính cơ bản của sản phẩm.
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

               <div className="grid grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giá nhập (trên 1 {mainProductBaseUnit?.name || 'đơn vị'})</FormLabel>
                      <FormControl>
                        <FormattedNumberInput {...field} />
                      </FormControl>
                      <FormDescription>Giá nhập trung bình cho sản phẩm này.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                    control={form.control}
                    name="sellingPrice"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Giá bán (trên 1 {mainProductBaseUnit?.name || 'đơn vị'})</FormLabel>
                            <FormControl>
                                <FormattedNumberInput {...field} />
                            </FormControl>
                             <FormDescription>Giá bán đề xuất khi tạo đơn hàng.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trạng thái</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn trạng thái" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Bản nháp</SelectItem>
                            <SelectItem value="active">Hoạt động</SelectItem>
                            <SelectItem value="archived">Lưu trữ</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                  control={form.control}
                  name="lowStockThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngưỡng tồn kho tối thiểu ({selectedUnit?.name || 'ĐVT'})</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ví dụ: 10" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormDescription>Để trống để dùng ngưỡng chung.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
               </div>

              <Separator className='my-6'/>
              
              <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Các đợt nhập hàng</h3>
                    <p className="text-sm text-muted-foreground">
                        Thêm hoặc xóa các đợt nhập hàng cho sản phẩm này.
                    </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ importDate: new Date().toISOString().split('T')[0], quantity: 0, cost: 0, unitId: selectedUnitId || '' })}
                  disabled={!selectedUnitId}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Thêm đợt nhập
                </Button>
              </div>
            
              <div className="space-y-4">
                  {fields.map((field, index) => {
                    const lot = purchaseLotsValues?.[index];
                    const selectedLotUnit = lot ? unitsMap.get(lot.unitId) : undefined;
                    const { baseUnit, conversionFactor } = selectedLotUnit ? getBaseUnitInfo(selectedLotUnit.id) : { conversionFactor: 1 };
                    const convertedQuantity = lot ? lot.quantity * conversionFactor : 0;
                    const isAdjustment = lot?.cost === 0;

                    return (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border rounded-md relative">
                           <FormField
                              control={form.control}
                              name={`purchaseLots.${index}.importDate`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2">
                                    Ngày nhập
                                    {isAdjustment && (
                                       <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger type="button">
                                              <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Lô hàng điều chỉnh tồn kho</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                    )}
                                  </FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`purchaseLots.${index}.unitId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Đơn vị</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Chọn ĐVT" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {units.map(unit => {
                                        const base = unit.baseUnitId ? unitsMap.get(unit.baseUnitId) : null;
                                        const display = base ? `${unit.name} (${unit.conversionFactor} ${base.name})` : unit.name;
                                        return <SelectItem key={unit.id} value={unit.id}>{display}</SelectItem>
                                      })}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`purchaseLots.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Số lượng ({selectedLotUnit?.name || 'ĐVT'})</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} />
                                  </FormControl>
                                  {baseUnit && baseUnit.name !== selectedLotUnit?.name && (
                                      <FormDescription>
                                          ~ {convertedQuantity.toLocaleString()} {baseUnit.name}
                                      </FormDescription>
                                  )}
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                             <FormField
                              control={form.control}
                              name={`purchaseLots.${index}.cost`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Giá nhập (trên 1 {baseUnit?.name || selectedLotUnit?.name || 'ĐVT'})</FormLabel>
                                  <FormControl>
                                    <FormattedNumberInput {...field} disabled={isAdjustment} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    )
                  })}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button 
                type="submit" 
                disabled={form.formState.isSubmitting}
                onClick={(e) => {
                  console.log('[ProductForm] Submit button clicked');
                  alert('Button clicked! Check console for logs');
                  console.log('[ProductForm] Form values:', form.getValues());
                  console.log('[ProductForm] Form errors:', form.formState.errors);
                }}
              >
                {form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
