
'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from "@/components/ui/button"
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from '@/components/ui/textarea'
import { Product, Unit, PurchaseOrderItem, PurchaseOrder, SalesItem, Supplier, Contractor } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Check, ChevronsUpDown, PlusCircle, Trash2, ChevronLeft, Barcode } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { createPurchaseOrder, updatePurchaseOrder } from '../actions'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { UnitConversionDisplay } from '@/components/unit-conversion-display'

const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1, "Vui lòng chọn sản phẩm."),
  productName: z.string().optional(),
  quantity: z.coerce.number().min(0.01, "Số lượng phải lớn hơn 0."),
  cost: z.coerce.number().min(0, "Giá phải là số không âm."),
  unitId: z.string().min(1, "Đơn vị tính không được để trống."),
});

const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Vui lòng chọn nhà cung cấp."),
  contractorId: z.string().optional(),
  importDate: z.string().min(1, "Ngày nhập là bắt buộc."),
  items: z.array(purchaseOrderItemSchema).min(1, "Đơn nhập phải có ít nhất một sản phẩm."),
  notes: z.string().optional(),
});

type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;

interface PurchaseOrderFormProps {
  products: Product[];
  suppliers: Supplier[];
  contractors: Contractor[];
  units: Unit[];
  allSalesItems: SalesItem[];
  purchaseOrder?: PurchaseOrder;
  draftItems?: PurchaseOrderItem[];
  isDialog?: boolean;
  onSuccess?: () => void;
}

const FormattedNumberInput = ({ value, onChange, ...props }: { value: number; onChange: (value: number) => void; [key: string]: any }) => {
  const [displayValue, setDisplayValue] = useState(value?.toLocaleString('en-US') || '');

  useEffect(() => {
    setDisplayValue(value?.toLocaleString('en-US') || '0');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, '');
    const numberValue = parseInt(rawValue, 10);

    if (!isNaN(numberValue)) {
      setDisplayValue(numberValue.toLocaleString('en-US'));
      onChange(numberValue);
    } else if (rawValue === '') {
      setDisplayValue('');
      onChange(0);
    }
  };

  return <Input type="text" value={displayValue} onChange={handleChange} {...props} />;
};


export function PurchaseOrderForm({ products, suppliers, contractors, units, allSalesItems, purchaseOrder, draftItems, isDialog = false, onSuccess }: PurchaseOrderFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [supplierSearchOpen, setSupplierSearchOpen] = useState(false);
  const [contractorSearchOpen, setContractorSearchOpen] = useState(false);
  const isEditMode = !!purchaseOrder;
  
  // Debug logging
  useEffect(() => {
    console.log('PurchaseOrderForm received units:', units?.length || 0, 'items');
    console.log('Units:', units);
    console.log('Units with id:', units?.filter(u => u && u.id).length || 0);
  }, [units]);
  
  const [barcode, setBarcode] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const unitsMap = useMemo(() => {
    const map = new Map();
    units.filter(u => u && u.id).forEach(u => map.set(u.id, u));
    return map;
  }, [units]);
  const productsMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const productsByBarcode = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach(p => {
      if (p.barcode) {
        map.set(p.barcode, p);
      }
    });
    return map;
  }, [products]);

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: isEditMode ? {
        supplierId: purchaseOrder.supplierId,
        contractorId: purchaseOrder.contractorId || '',
        importDate: new Date(purchaseOrder.importDate).toISOString().split('T')[0],
        notes: purchaseOrder.notes || '',
        items: purchaseOrder.items || []
    } : {
      supplierId: '',
      contractorId: '',
      importDate: new Date().toISOString().split('T')[0],
      items: draftItems || [],
      notes: '',
    },
  });
  
  const { fields, append, prepend, remove, replace } = useFieldArray({
    control: form.control,
    name: "items"
  });

  useEffect(() => {
    if (isEditMode && purchaseOrder) {
      console.log('Resetting form with purchase order:', purchaseOrder);
      console.log('Purchase order items:', purchaseOrder.items);
      
      form.reset({
        supplierId: purchaseOrder.supplierId || '',
        contractorId: purchaseOrder.contractorId || '',
        importDate: new Date(purchaseOrder.importDate).toISOString().split('T')[0],
        notes: purchaseOrder.notes || '',
        items: (purchaseOrder.items || []).map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          cost: item.cost,
          unitId: item.unitId || '',
        })),
      });
    } else if (draftItems && draftItems.length > 0) {
      form.reset({
        supplierId: '',
        contractorId: '',
        importDate: new Date().toISOString().split('T')[0],
        notes: 'Đơn hàng nháp tạo từ đề xuất của AI',
        items: draftItems,
      });
    }
  }, [purchaseOrder, isEditMode, draftItems, form]);
  
  const watchedItems = form.watch("items");
  
  // Auto-fill unitId for items that don't have one
  useEffect(() => {
    watchedItems.forEach((item, index) => {
      if (item.productId && !item.unitId) {
        const product = productsMap.get(item.productId);
        console.log(`Item ${index} missing unitId. Product:`, product?.name, 'Unit:', product?.unitId);
        if (product && product.unitId) {
          console.log(`Auto-filling unitId for item ${index}:`, product.unitId);
          form.setValue(`items.${index}.unitId`, product.unitId, {
            shouldValidate: false,
            shouldDirty: false,
          });
        }
      }
    });
  }, [watchedItems, productsMap, form]);
  
  const getUnitInfo = useCallback((unitId: string): { baseUnit?: Unit; conversionFactor: number, name: string } => {
    const unit = unitsMap.get(unitId);
    if (!unit) return { conversionFactor: 1, name: '' };
    
    if (unit.baseUnitId && unit.conversionFactor) {
      const baseUnit = unitsMap.get(unit.baseUnitId);
      return { baseUnit, conversionFactor: unit.conversionFactor, name: unit.name };
    }
    
    return { baseUnit: unit, conversionFactor: 1, name: unit.name };
  }, [unitsMap]);

  const getAverageCost = useCallback((product: Product) => {
    if (!product.purchaseLots || product.purchaseLots.length === 0 || !product.unitId) return { avgCost: 0, baseUnit: undefined};

    let totalCost = 0;
    let totalQuantityInBaseUnit = 0;
    let costBaseUnit: Unit | undefined;

    product.purchaseLots.forEach(lot => {
        const { baseUnit, conversionFactor } = getUnitInfo(lot.unitId);
        const quantityInBaseUnit = lot.quantity * conversionFactor;
        totalCost += lot.cost * quantityInBaseUnit;
        totalQuantityInBaseUnit += quantityInBaseUnit;
        if (baseUnit) {
          costBaseUnit = baseUnit;
        } else if(unitsMap.has(lot.unitId)) {
          costBaseUnit = unitsMap.get(lot.unitId);
        }
    });
    
    if (totalQuantityInBaseUnit === 0) return { avgCost: 0, baseUnit: costBaseUnit };
    
    return { avgCost: totalCost / totalQuantityInBaseUnit, baseUnit: costBaseUnit };
  }, [getUnitInfo, unitsMap]);

  
  const totalAmount = watchedItems.reduce((acc, item) => {
    if (!item.productId || item.cost === undefined || item.quantity === undefined) {
        return acc;
    }
    const { conversionFactor } = getUnitInfo(item.unitId);
    const quantityInBaseUnit = (item.quantity || 0) * (conversionFactor || 1);

    return acc + quantityInBaseUnit * (item.cost || 0);
  }, 0);


  const onSubmit = async (data: PurchaseOrderFormValues) => {
    const itemsData: PurchaseOrderItem[] = data.items.map(item => {
        const product = productsMap.get(item.productId);
        const { conversionFactor, baseUnit } = getUnitInfo(item.unitId);
        
        // Calculate base values for inventory tracking
        const baseQuantity = item.quantity * conversionFactor;
        const baseCost = item.cost / conversionFactor;
        const baseUnitId = baseUnit?.id || item.unitId;
        
        return {
            id: item.productId, // This is not correct but we need something here. Will be replaced by server
            purchaseOrderId: purchaseOrder?.id || '', // same here
            productId: item.productId,
            productName: product?.name,
            quantity: item.quantity,        // Original quantity (e.g., 1 thùng)
            cost: item.cost,                // Original cost (e.g., 240,000đ/thùng)
            unitId: item.unitId,            // Original unit (e.g., Thùng)
            baseQuantity,                   // Converted quantity (e.g., 24 cái)
            baseCost,                       // Converted cost (e.g., 10,000đ/cái)
            baseUnitId,                     // Base unit (e.g., Cái)
        };
    });
    
    const orderData = {
        supplierId: data.supplierId,
        contractorId: data.contractorId || undefined,
        importDate: data.importDate,
        notes: data.notes,
        totalAmount: totalAmount,
    };
    
    const result = isEditMode
      ? await updatePurchaseOrder(purchaseOrder.id, orderData, itemsData)
      : await createPurchaseOrder(orderData, itemsData);


    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã ${isEditMode ? 'cập nhật' : 'tạo'} đơn nhập hàng thành công.`,
      });
      
      if (onSuccess) {
        onSuccess();
      } else {
        const targetPath = isEditMode ? `/purchases/${purchaseOrder.id}` : '/purchases';
        // Use window.location to force full page reload
        window.location.href = targetPath;
      }
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
  };
  
  const addProductToOrder = async (productId: string) => {
    const product = productsMap.get(productId);
    if (product) {
      console.log('Adding product:', product.name, 'Unit ID:', product.unitId);
      
      if (watchedItems.some(item => item.productId === productId)) {
        toast({
          variant: "destructive",
          title: "Sản phẩm đã tồn tại",
          description: "Sản phẩm này đã có trong đơn hàng.",
        });
        return;
      }
      
      // Auto-select the product's base unit
      const productUnitId = product.unitId || '';
      console.log('Selected unit ID:', productUnitId);
      
      // Get last purchase cost from selected supplier
      let lastCost = 0;
      const selectedSupplierId = form.getValues('supplierId');
      
      if (selectedSupplierId) {
        try {
          const token = localStorage.getItem('auth_token');
          const storeId = localStorage.getItem('store_id');
          const headers: Record<string, string> = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;
          if (storeId) headers['X-Store-Id'] = storeId;

          // Fetch last purchase from this supplier for this product
          const response = await fetch(`/api/purchases?supplierId=${selectedSupplierId}&pageSize=100`, {
            headers,
          });

          if (response.ok) {
            const result = await response.json();
            const purchases = result.data || [];
            
            // Find the most recent purchase with this product
            for (const purchase of purchases) {
              if (purchase.items && Array.isArray(purchase.items)) {
                const item = purchase.items.find((i: any) => i.productId === productId);
                if (item && item.cost) {
                  lastCost = item.cost;
                  console.log(`Found last cost for ${product.name} from supplier: ${lastCost}`);
                  break;
                }
              }
            }
          }
        } catch (error) {
          console.error('Error fetching last cost:', error);
        }
      }
      
      // Get the current length before prepend
      const currentLength = 0; // Will be at index 0 after prepend
      
      prepend({ 
        productId: product.id, 
        productName: product.name,
        quantity: 1, 
        cost: lastCost, // Use last cost from supplier
        unitId: productUnitId
      });
      
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        console.log('Setting unitId for item', currentLength, 'to', productUnitId);
        form.setValue(`items.${currentLength}.unitId`, productUnitId, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true
        });
        
        // Scroll to top of items list
        const itemsList = document.querySelector('[data-items-list]');
        if (itemsList) {
          itemsList.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  }

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!barcode) return;

      const product = productsByBarcode.get(barcode);
      
      if (product) {
        addProductToOrder(product.id);
        setBarcode(''); // Clear input after adding
      } else {
        toast({
          variant: "destructive",
          title: "Không tìm thấy sản phẩm",
          description: `Không có sản phẩm nào khớp với mã vạch "${barcode}".`,
        });
      }
    }
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {!isDialog && (
          <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                  <Link href={isEditMode ? `/purchases/${purchaseOrder.id}` : '/purchases'}>
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only">Quay lại</span>
                  </Link>
              </Button>
              <div className="flex-1">
                  <h1 className="text-2xl font-semibold tracking-tight">
                      {isEditMode ? 'Chỉnh sửa đơn nhập hàng' : 'Nhập hàng theo đơn'}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                      {isEditMode ? 'Cập nhật thông tin đơn nhập hàng.' : 'Tạo đơn nhập hàng mới với nhiều sản phẩm cùng lúc.'}
                  </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                   <Button type="button" variant="outline" onClick={() => router.push(isEditMode ? `/purchases/${purchaseOrder.id}` : '/purchases')}>
                      Hủy
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Đang lưu...' : (isEditMode ? 'Cập nhật đơn' : 'Lưu đơn nhập')}
                  </Button>
              </div>
          </div>
        )}
        
        <div className={cn("grid gap-6", isDialog ? "grid-cols-1" : "md:grid-cols-4")}>
            <div className={cn("space-y-6", isDialog ? "order-1" : "md:col-span-1")}>
                <Card>
                    <CardHeader>
                        <CardTitle>Thông tin chung</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="supplierId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Nhà cung cấp</FormLabel>
                                    <Popover open={supplierSearchOpen} onOpenChange={setSupplierSearchOpen}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                            >
                                                {field.value ? suppliers.find((s) => s.id === field.value)?.name : "Chọn nhà cung cấp"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command>
                                                <CommandInput placeholder="Tìm nhà cung cấp..." />
                                                <CommandList>
                                                    <CommandEmpty>Không tìm thấy.</CommandEmpty>
                                                    <CommandGroup>
                                                        <CommandItem
                                                            key="clear"
                                                            value=""
                                                            onSelect={() => {
                                                                form.setValue("supplierId", "")
                                                                setSupplierSearchOpen(false)
                                                            }}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", !field.value ? "opacity-100" : "opacity-0")}/>
                                                            Không chọn (Tự sản xuất/Nhập lẻ)
                                                        </CommandItem>
                                                    {suppliers.map((supplier) => (
                                                        <CommandItem
                                                            value={supplier.name}
                                                            key={supplier.id}
                                                            onSelect={() => {
                                                                form.setValue("supplierId", supplier.id)
                                                                setSupplierSearchOpen(false)
                                                            }}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", supplier.id === field.value ? "opacity-100" : "opacity-0")}/>
                                                            {supplier.name}
                                                        </CommandItem>
                                                    ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="contractorId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Nhà thầu</FormLabel>
                                    <Popover open={contractorSearchOpen} onOpenChange={setContractorSearchOpen}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                            >
                                                {field.value ? contractors.find((c) => c.id === field.value)?.name : "Chọn nhà thầu"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command>
                                                <CommandInput placeholder="Tìm nhà thầu..." />
                                                <CommandList>
                                                    <CommandEmpty>Không tìm thấy.</CommandEmpty>
                                                    <CommandGroup>
                                                        <CommandItem
                                                            key="clear-contractor"
                                                            value=""
                                                            onSelect={() => {
                                                                form.setValue("contractorId", "")
                                                                setContractorSearchOpen(false)
                                                            }}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", !field.value ? "opacity-100" : "opacity-0")}/>
                                                            Không chọn
                                                        </CommandItem>
                                                    {contractors.map((contractor) => (
                                                        <CommandItem
                                                            value={contractor.name}
                                                            key={contractor.id}
                                                            onSelect={() => {
                                                                form.setValue("contractorId", contractor.id)
                                                                setContractorSearchOpen(false)
                                                            }}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", contractor.id === field.value ? "opacity-100" : "opacity-0")}/>
                                                            {contractor.name}
                                                        </CommandItem>
                                                    ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="importDate"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Ngày nhập hàng</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
                                </FormControl>
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
                                    <Textarea placeholder="Thêm ghi chú..." {...field} rows={3} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                         />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Thanh toán</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center text-lg">
                            <span className="font-medium">Tổng cộng</span>
                            <span className="font-bold text-primary">{formatCurrency(totalAmount)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className={cn("space-y-6", isDialog ? "order-2" : "md:col-span-3")}>
                <Card>
                    <CardHeader>
                        <CardTitle>Chi tiết đơn nhập</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Thêm nhiều sản phẩm vào đơn nhập hàng. Quét mã vạch hoặc thêm thủ công.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="flex items-center gap-4">
                            <div className="relative flex-grow">
                                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    ref={barcodeInputRef}
                                    placeholder="Quét mã vạch sản phẩm..."
                                    className="pl-10"
                                    value={barcode}
                                    onChange={(e) => setBarcode(e.target.value)}
                                    onKeyDown={handleBarcodeScan}
                                />
                            </div>
                            <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                                <PopoverTrigger asChild>
                                    <Button type="button" variant="outline" size="sm" className="shrink-0">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Thêm thủ công
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Tìm kiếm sản phẩm..." />
                                        <CommandList>
                                            <CommandEmpty>Không tìm thấy sản phẩm.</CommandEmpty>
                                            <CommandGroup>
                                                {products.map((product) => (
                                                <CommandItem
                                                    key={product.id}
                                                    value={product.name}
                                                    onSelect={() => {
                                                        addProductToOrder(product.id);
                                                        setProductSearchOpen(false);
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", watchedItems.some(i => i.productId === product.id) ? "opacity-100" : "opacity-0")} />
                                                    {product.name}
                                                </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        
                        {fields.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>Chưa có sản phẩm nào. Hãy thêm sản phẩm vào đơn nhập hàng.</p>
                          </div>
                        ) : (
                          <>
                            <Separator />
                            <div className="text-xs text-muted-foreground mb-2">
                              Có {fields.length} sản phẩm trong đơn
                            </div>
                            <div className="space-y-4" data-items-list>
                            {fields.map((field, index) => {
                                const item = watchedItems[index];
                                const product = productsMap.get(item?.productId);
                                
                                console.log(`Item ${index}:`, {
                                  productId: item?.productId,
                                  productFound: !!product,
                                  productName: product?.name || item?.productName,
                                  unitId: item?.unitId,
                                  item: item
                                });
                                
                                // If product not found in map, try to use productName from item
                                const productName = product?.name || item?.productName || 'Sản phẩm không xác định';

                                const itemUnitInfo = getUnitInfo(item?.unitId);
                                const baseUnit = itemUnitInfo.baseUnit || (product ? unitsMap.get(product.unitId) : null);
                                
                                const avgCostInfo = product ? getAverageCost(product) : { avgCost: 0, baseUnit: undefined };
                                
                                const lineTotal = (item?.quantity || 0) * (itemUnitInfo.conversionFactor || 1) * (item?.cost || 0);

                                return (
                                    <div key={field.id} className="p-4 border rounded-lg relative space-y-3 bg-muted/30">
                                        <div className="flex items-start justify-between">
                                          <div>
                                            <p className="font-semibold text-base">{productName}</p>
                                            {!product && item?.productId && (
                                              <p className="text-xs text-muted-foreground">ID: {item.productId.substring(0, 8)}...</p>
                                            )}
                                          </div>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 -mt-1 -mr-1"
                                            onClick={() => remove(index)}
                                          >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                          </Button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.unitId`}
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
                                                                {units.filter(u => u.id).length === 0 ? (
                                                                  <div className="p-2 text-sm text-muted-foreground">Không có đơn vị tính</div>
                                                                ) : (
                                                                  units.filter(u => u.id).map(unit => {
                                                                    const baseUnit = unit.baseUnitId ? unitsMap.get(unit.baseUnitId) : null;
                                                                    const displayValue = baseUnit 
                                                                        ? `${unit.name} (${unit.conversionFactor} ${baseUnit.name})` 
                                                                        : unit.name;
                                                                    return (
                                                                        <SelectItem key={unit.id} value={unit.id}>{displayValue}</SelectItem>
                                                                    )
                                                                  })
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.quantity`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Số lượng</FormLabel>
                                                        <FormControl><Input type="number" step="any" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.cost`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Giá nhập / {itemUnitInfo.name || 'đơn vị'}</FormLabel>
                                                        <FormControl><FormattedNumberInput {...field} /></FormControl>
                                                        {avgCostInfo.avgCost > 0 && (
                                                          <FormDescription className="text-xs">
                                                            TB: {formatCurrency(avgCostInfo.avgCost)}
                                                          </FormDescription>
                                                        )}
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                             <div className="space-y-2">
                                                <FormLabel>Thành tiền</FormLabel>
                                                <div className="h-10 px-3 py-2 rounded-md border bg-muted font-semibold flex items-center">
                                                  {formatCurrency(lineTotal)}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Unit Conversion Display */}
                                        {itemUnitInfo.conversionFactor > 1 && baseUnit && (
                                          <UnitConversionDisplay
                                            quantity={item?.quantity || 0}
                                            unitPrice={item?.cost || 0}
                                            selectedUnit={unitsMap.get(item?.unitId)}
                                            baseUnit={baseUnit}
                                            conversionFactor={itemUnitInfo.conversionFactor}
                                          />
                                        )}
                                    </div>
                                )
                            })}
                            </div>
                          </>
                        )}
                         <FormMessage>{form.formState.errors.items?.message || form.formState.errors.items?.root?.message}</FormMessage>
                    </CardContent>
                </Card>
            </div>
        </div>
        
        {isDialog && (
          <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background">
            <Button type="button" variant="outline" onClick={() => onSuccess && onSuccess()}>
              Hủy
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Đang lưu...' : (isEditMode ? 'Cập nhật đơn' : 'Lưu đơn nhập')}
            </Button>
          </div>
        )}
      </form>
    </Form>
  )
}
