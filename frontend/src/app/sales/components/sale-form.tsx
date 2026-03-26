





'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from "@/components/ui/input"
import { Customer, Product, Unit, SalesItem, Sale, Payment, ThemeSettings } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Check, ChevronsUpDown, PlusCircle, Trash2, Barcode, Sparkles, AlertTriangle, UserPlus } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { upsertSaleTransaction } from '../actions'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getRelatedProductsSuggestion } from '@/app/actions'
import type { SuggestRelatedProductsOutput } from '@/ai/flows/suggest-related-products-flow'
import { Checkbox } from '@/components/ui/checkbox'
import { CustomerForm } from '@/app/customers/components/customer-form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'


const saleItemSchema = z.object({
  productId: z.string().min(1, "Vui lòng chọn sản phẩm."),
  quantity: z.coerce.number().refine(val => val !== 0, "Số lượng không được bằng 0."),
  price: z.coerce.number().min(0, "Giá phải là số không âm."),
});

const saleFormSchema = z.object({
  customerId: z.string().min(1, "Vui lòng chọn khách hàng."),
  transactionDate: z.string().min(1, "Ngày giao dịch là bắt buộc."),
  items: z.array(saleItemSchema).min(1, "Đơn hàng phải có ít nhất một sản phẩm."),
  discountType: z.enum(['percentage', 'amount']).default('amount'),
  discountValue: z.coerce.number().optional(),
  customerPayment: z.coerce.number().optional(),
  pointsUsed: z.coerce.number().optional(),
  status: z.enum(['pending', 'unprinted', 'printed']),
  isChangeReturned: z.boolean().default(true),
});

type SaleFormValues = z.infer<typeof saleFormSchema>;

interface SaleFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  customers: Customer[];
  products: Product[];
  units: Unit[];
  allSalesItems: SalesItem[];
  sales: Sale[];
  payments: Payment[];
  settings: ThemeSettings | null;
  sale?: Sale;
}

const FormattedNumberInput = ({ value, onChange, ...props }: { value: number; onChange: (value: number) => void; [key: string]: any }) => {
  const [displayValue, setDisplayValue] = useState(value?.toLocaleString('en-US') || '');

  useEffect(() => {
    setDisplayValue(value?.toLocaleString('en-US') || '0');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, '');
    // Allow negative sign
    const numberValue = parseFloat(rawValue);

    if (!isNaN(numberValue)) {
      setDisplayValue(numberValue.toLocaleString('en-US'));
      onChange(numberValue);
    } else if (e.target.value === '' || e.target.value === '-') {
      setDisplayValue(e.target.value);
      onChange(0);
    }
  };

  return <Input type="text" value={displayValue} onChange={handleChange} {...props} />;
};


export function SaleForm({ isOpen, onOpenChange, customers, products, units, allSalesItems, sales, payments, settings, sale }: SaleFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [saleItemsForEdit, setSaleItemsForEdit] = useState<SalesItem[]>([]);
  const [barcode, setBarcode] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<SuggestRelatedProductsOutput['suggestions']>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);

  const unitsMap = useMemo(() => new Map(units.map(u => [u.id, u])), [units]);
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

  const getUnitInfo = useCallback((unitId: string): { baseUnit?: Unit; conversionFactor: number, name: string } => {
    const unit = unitsMap.get(unitId);
    if (!unit) return { conversionFactor: 1, name: '' };
    
    if (unit.baseUnitId && unit.conversionFactor) {
      const baseUnit = unitsMap.get(unit.baseUnitId);
      return { baseUnit, conversionFactor: unit.conversionFactor, name: unit.name };
    }
    
    return { baseUnit: unit, conversionFactor: 1, name: unit.name };
  }, [unitsMap]);
  
  const salesItemsWithoutCurrent = useMemo(() => {
    if (!sale) return allSalesItems;
    return allSalesItems.filter(item => item.salesTransactionId !== sale.id);
  }, [allSalesItems, sale]);

  const getStockInfo = useCallback((productId: string) => {
    const product = productsMap.get(productId);
    if (!product || !product.unitId) return { stock: 0, stockInBaseUnit: 0, mainUnit: undefined, baseUnit: undefined };

    const { name: mainUnitName, baseUnit: mainBaseUnit, conversionFactor: mainConversionFactor } = getUnitInfo(product.unitId);
    
    let totalImportedInBaseUnit = 0;
    product.purchaseLots?.forEach(lot => {
        const { conversionFactor } = getUnitInfo(lot.unitId);
        totalImportedInBaseUnit += lot.quantity * conversionFactor;
    });
    
    const totalSoldInBaseUnit = salesItemsWithoutCurrent
      .filter(item => item.productId === productId)
      .reduce((acc, item) => acc + item.quantity, 0);

    const stockInBaseUnit = totalImportedInBaseUnit - totalSoldInBaseUnit;
    const stockInMainUnit = stockInBaseUnit / (mainConversionFactor || 1);
    const mainUnit = unitsMap.get(product.unitId);
    const baseUnit = mainBaseUnit || mainUnit;

    return { stock: stockInMainUnit, stockInBaseUnit, mainUnit, baseUnit };
  }, [productsMap, salesItemsWithoutCurrent, getUnitInfo, unitsMap]);
  
  const getAverageCost = useCallback((productId: string) => {
    const product = productsMap.get(productId);
    if (!product || !product.purchaseLots || product.purchaseLots.length === 0 || !product.unitId) return { avgCost: 0, baseUnit: undefined};

    let totalCost = 0;
    let totalQuantityInBaseUnit = 0;
    let costBaseUnit: Unit | undefined;

    product.purchaseLots.forEach(lot => {
        const { baseUnit, conversionFactor } = getUnitInfo(lot.unitId);
        const quantityInBaseUnit = lot.quantity * conversionFactor;
        totalCost += lot.cost * quantityInBaseUnit;
        totalQuantityInBaseUnit += quantityInBaseUnit;
        costBaseUnit = baseUnit || unitsMap.get(lot.unitId);
    });
    
    if (totalQuantityInBaseUnit === 0) return { avgCost: 0, baseUnit: costBaseUnit };
    
    return { avgCost: totalCost / totalQuantityInBaseUnit, baseUnit: costBaseUnit };
  }, [productsMap, getUnitInfo, unitsMap]);
  
  const customerDebts = useMemo(() => {
    if (!customers || !sales || !payments) return new Map<string, number>();

    const debtMap = new Map<string, number>();
    
    customers.forEach(customer => {
        const customerSales = sales.filter(s => s.customerId === customer.id && (!sale || s.id !== sale.id));
        const customerPayments = payments.filter(p => {
          if (p.customerId !== customer.id) return false;
          // If editing, exclude payment associated with this sale
          if (sale && p.notes?.includes(sale.invoiceNumber)) return false;
          return true;
        });
        
        const totalRevenue = customerSales.reduce((sum, s) => sum + (s.finalAmount || 0), 0);
        const totalPaid = customerPayments.reduce((sum, p) => sum + p.amount, 0);
        
        debtMap.set(customer.id, totalRevenue - totalPaid);
    });
    return debtMap;
  }, [customers, sales, payments, sale]);


  const refinedSaleFormSchema = useMemo(() => saleFormSchema.superRefine((data, ctx) => {
    data.items.forEach((item, index) => {
      if (!item.productId) return;
      const product = productsMap.get(item.productId);
      if (!product) return;
      
      // For returns (negative quantity), we don't check stock
      if (item.quantity <= 0) return;

      const { stockInBaseUnit } = getStockInfo(item.productId);
      const { conversionFactor } = getUnitInfo(product.unitId);
      const requestedQuantityInBase = item.quantity * (conversionFactor || 1);

      if (requestedQuantityInBase > stockInBaseUnit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [`items`, index, `quantity`],
          message: `Vượt quá tồn kho`,
        });
      }
    });
  }), [getStockInfo, productsMap, getUnitInfo]);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(refinedSaleFormSchema),
    defaultValues: {
      customerId: '',
      transactionDate: new Date().toISOString().split('T')[0],
      items: [],
      discountType: 'amount',
      discountValue: 0,
      customerPayment: 0,
      pointsUsed: 0,
      status: 'unprinted',
      isChangeReturned: true,
    },
    mode: "onChange"
  });
  
  const { fields, append, remove, replace, update } = useFieldArray({
    control: form.control,
    name: "items"
  });

  useEffect(() => {
    if(isOpen && sale){
      const saleItems = allSalesItems.filter(item => item.salesTransactionId === sale.id);
      setSaleItemsForEdit(saleItems);

      const formItems = saleItems.map(item => {
        const product = productsMap.get(item.productId);
        if (!product) return null;
        const { conversionFactor } = getUnitInfo(product.unitId);
        // Convert from base unit back to sale unit for display
        return {
          productId: item.productId,
          quantity: item.quantity / (conversionFactor || 1),
          price: item.price
        }
      }).filter(Boolean) as { productId: string; quantity: number; price: number; }[];

      replace(formItems);

      form.reset({
        customerId: sale.customerId,
        transactionDate: new Date(sale.transactionDate).toISOString().split('T')[0],
        items: formItems,
        discountType: sale.discountType || 'amount',
        discountValue: sale.discountValue || 0,
        customerPayment: sale.customerPayment || 0,
        pointsUsed: sale.pointsUsed || 0,
        status: sale.status || 'unprinted',
        isChangeReturned: true, // Default to true on open
      });

    } else if (isOpen && !sale) {
      form.reset({
        customerId: '',
        transactionDate: new Date().toISOString().split('T')[0],
        items: [],
        discountType: 'amount',
        discountValue: 0,
        customerPayment: 0,
        pointsUsed: 0,
        status: 'unprinted',
        isChangeReturned: true,
      })
      replace([]);
    }
  }, [isOpen, sale, allSalesItems, form, replace, productsMap, getUnitInfo])


  const watchedItems = form.watch("items");
  const discountType = form.watch('discountType');
  const discountValue = form.watch('discountValue') || 0;
  const customerPayment = form.watch('customerPayment') || 0;
  const selectedCustomerId = form.watch('customerId');
  const pointsUsed = form.watch('pointsUsed') || 0;
  
  const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedCustomerId), [customers, selectedCustomerId]);

  const { trigger } = form;
  useEffect(() => {
      trigger('items');
  }, [watchedItems, trigger, salesItemsWithoutCurrent]);
  
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const totalAmount = watchedItems.reduce((acc, item) => {
    if (!item.productId || !item.price || !item.quantity) {
        return acc;
    }
    const product = productsMap.get(item.productId)!;
    const { conversionFactor } = getUnitInfo(product.unitId);
    const quantityInBaseUnit = (item.quantity || 0) * (conversionFactor || 1);

    return acc + quantityInBaseUnit * (item.price || 0);
  }, 0);
  
  const { tierDiscountPercentage, tierDiscountAmount } = useMemo(() => {
    if (!selectedCustomer || !settings?.loyalty?.enabled) {
      return { tierDiscountPercentage: 0, tierDiscountAmount: 0 };
    }
    const customerTier = settings.loyalty.tiers.find(t => t.name === selectedCustomer.loyaltyTier);
    if (!customerTier || !customerTier.discountPercentage) {
      return { tierDiscountPercentage: 0, tierDiscountAmount: 0 };
    }
    return {
      tierDiscountPercentage: customerTier.discountPercentage,
      tierDiscountAmount: (totalAmount * customerTier.discountPercentage) / 100,
    };
  }, [selectedCustomer, totalAmount, settings]);
  
  const pointsToVndRate = settings?.loyalty?.pointsToVndRate || 0;
  const pointsDiscount = pointsUsed * pointsToVndRate;

  const calculatedDiscount = discountType === 'percentage'
    ? (totalAmount * discountValue) / 100
    : discountValue;
    
  const totalDiscount = tierDiscountAmount + calculatedDiscount + pointsDiscount;
  const amountAfterDiscount = totalAmount - totalDiscount;

  const vatRate = settings?.vatRate || 0;
  const vatAmount = (amountAfterDiscount * vatRate) / 100;
  const finalAmount = amountAfterDiscount + vatAmount;
  
  const previousDebt = useMemo(() => {
    if (!selectedCustomerId) return 0;
    // For editing a sale, the "previous debt" is the customer's total debt *excluding* the sale being edited.
    // For a new sale, it's just the customer's current total debt.
    return customerDebts.get(selectedCustomerId) || 0;
  }, [selectedCustomerId, customerDebts]);


  const totalPayable = finalAmount + previousDebt;
  const remainingDebt = totalPayable - (customerPayment || 0);
  const isChange = remainingDebt < 0;

  const onSubmit = async (data: SaleFormValues) => {
    const itemsData = data.items.map(item => {
        const product = productsMap.get(item.productId)!;
        const { conversionFactor } = getUnitInfo(product.unitId);
        // Quantity needs to be stored in the base unit
        return {
            productId: item.productId,
            quantity: item.quantity * (conversionFactor || 1),
            price: item.price,
        };
    });

    const saleData: Partial<Sale> & { isChangeReturned?: boolean; items?: typeof itemsData } = {
        id: sale?.id, // Important for updates
        customerId: data.customerId,
        transactionDate: new Date(data.transactionDate).toISOString(),
        totalAmount: totalAmount,
        vatAmount: vatAmount,
        finalAmount: finalAmount,
        discount: calculatedDiscount,
        discountType: data.discountType,
        discountValue: data.discountValue,
        tierDiscountPercentage,
        tierDiscountAmount,
        pointsUsed: data.pointsUsed,
        pointsDiscount: pointsDiscount,
        customerPayment: data.customerPayment,
        previousDebt: previousDebt,
        remainingDebt: remainingDebt,
        status: data.status,
        isChangeReturned: data.isChangeReturned,
        items: itemsData,
    };

    const result = await upsertSaleTransaction(saleData as Record<string, unknown>);

    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã ${sale ? 'cập nhật' : 'tạo'} đơn hàng thành công.`,
      });
      onOpenChange(false);
      form.reset();
      router.refresh();
      if (result.sale && !sale) {
        router.push(`/sales/${result.sale.id}`);
      }
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
  };
  
  const addProductToSale = (productId: string) => {
    const existingItemIndex = watchedItems.findIndex(item => item.productId === productId);
    
    if (existingItemIndex > -1) {
      const existingItem = watchedItems[existingItemIndex];
      update(existingItemIndex, {
        ...existingItem,
        quantity: existingItem.quantity + 1,
      });
    } else {
      const product = productsMap.get(productId);
      if (product) {
        append({ 
          productId: product.id, 
          quantity: 1, 
          price: product.sellingPrice || 0,
          unitId: product.defaultSalesUnitId || product.unitId, // Ưu tiên default sales unit
        });
      }
    }
  }

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!barcode) return;

      const product = productsByBarcode.get(barcode);
      
      if (product) {
        addProductToSale(product.id);
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
  
  const handleGetSuggestions = async () => {
    if (watchedItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Chưa có sản phẩm",
        description: "Vui lòng thêm ít nhất một sản phẩm vào đơn hàng để nhận gợi ý.",
      });
      return;
    }
    setIsSuggesting(true);
    setSuggestions([]);
    
    const transactionsWithProductIds = sales.map(sale => {
      const itemsForSale = allSalesItems
        .filter(item => item.salesTransactionId === sale.id)
        .map(item => item.productId);
      return {
        transactionId: sale.id,
        products: itemsForSale,
      };
    }).filter(t => t.products.length > 1);

    const result = await getRelatedProductsSuggestion({
      salesHistory: JSON.stringify(transactionsWithProductIds),
      currentCartProductIds: watchedItems.map(item => item.productId),
      allProducts: JSON.stringify(Array.from(productsMap.entries()).map(([id, product]) => ({ id, name: product.name }))),
    });

    if (result.success && result.suggestions) {
      if (result.suggestions.length === 0) {
        toast({
          title: "Không tìm thấy gợi ý",
          description: "AI không tìm thấy sản phẩm nào thường được mua kèm.",
        });
      }
      setSuggestions(result.suggestions);
    } else {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: result.error || "Không thể lấy gợi ý từ AI.",
      });
    }
    setIsSuggesting(false);
  };
  
  const handleNewCustomerCreated = (isOpen: boolean, newCustomerId?: string) => {
    setIsCustomerFormOpen(isOpen);
    if(!isOpen && newCustomerId){
        form.setValue("customerId", newCustomerId);
    }
  }


  return (
    <>
      <CustomerForm 
        isOpen={isCustomerFormOpen} 
        onOpenChange={handleNewCustomerCreated} 
      />
      <Dialog open={isOpen} onOpenChange={(open) => { onOpenChange(open); if(!open) form.reset(); }}>
        <DialogContent className="sm:max-w-7xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{sale ? 'Sửa đơn hàng' : 'Tạo đơn hàng mới'}</DialogTitle>
            <DialogDescription>
              Điền thông tin chi tiết của đơn hàng dưới đây.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid md:grid-cols-4 gap-x-8 flex-grow overflow-hidden">
              {/* Left Column */}
              <div className="md:col-span-3 flex flex-col gap-4 overflow-hidden">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Khách hàng</FormLabel>
                        <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value
                                  ? customers.find(
                                      (c) => c.id === field.value
                                    )?.name
                                  : "Chọn khách hàng..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                  <CommandInput placeholder="Tìm khách hàng theo tên hoặc SĐT..." />
                                  <CommandList>
                                  <CommandEmpty>Không tìm thấy khách hàng.</CommandEmpty>
                                  <CommandGroup>
                                      {customers.map((customer) => {
                                        const debt = customerDebts.get(customer.id) || 0;
                                        return (
                                          <CommandItem
                                              value={`${customer.name} ${customer.phone}`}
                                              key={customer.id}
                                              onSelect={() => {
                                                  form.setValue("customerId", customer.id)
                                                  setCustomerSearchOpen(false)
                                              }}
                                          >
                                              <Check
                                              className={cn(
                                                  "mr-2 h-4 w-4",
                                                  customer.id === field.value
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              )}
                                              />
                                              <div className="flex justify-between w-full">
                                                  <div>
                                                    <p>{customer.name}</p>
                                                    <p className="text-xs text-muted-foreground">{customer.phone}</p>
                                                  </div>
                                                  {debt > 0 && <p className="text-xs text-destructive">Nợ: {formatCurrency(debt)}</p>}
                                              </div>
                                          </CommandItem>
                                        )
                                      })}
                                  </CommandGroup>
                                  <CommandSeparator />
                                   <CommandItem
                                      onSelect={() => {
                                        setCustomerSearchOpen(false);
                                        setIsCustomerFormOpen(true);
                                      }}
                                    >
                                      <UserPlus className="mr-2 h-4 w-4" />
                                      Thêm khách hàng mới
                                    </CommandItem>
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
                    name="transactionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ngày bán</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                                              addProductToSale(product.id);
                                              setProductSearchOpen(false);
                                          }}
                                      >
                                          <Check
                                              className={cn(
                                                  "mr-2 h-4 w-4",
                                                  watchedItems.some(i => i.productId === product.id) ? "opacity-100" : "opacity-0"
                                              )}
                                          />
                                          {product.name}
                                      </CommandItem>
                                      ))}
                                  </CommandGroup>
                              </CommandList>
                          </Command>
                      </PopoverContent>
                  </Popover>
                  <Button type="button" variant="outline" size="sm" onClick={handleGetSuggestions} disabled={isSuggesting}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      {isSuggesting ? 'Đang tìm...' : 'Gợi ý sản phẩm'}
                    </Button>
                </div>

                {suggestions.length > 0 && (
                  <div className="p-3 border rounded-md bg-muted/50">
                    <h4 className="text-sm font-semibold mb-2">Gợi ý từ AI</h4>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map(s => (
                        <Button key={s.productId} variant="outline" size="sm" className="h-auto py-1" onClick={() => addProductToSale(s.productId)}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          <div>
                            <p>{s.productName}</p>
                            <p className="text-xs text-muted-foreground font-normal">{s.reason}</p>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div className='flex-grow space-y-4 overflow-y-auto pr-6 -mr-6'>
                  <h3 className="text-md font-medium">Chi tiết đơn hàng</h3>
                  <div className="space-y-3">
                    {fields.map((field, index) => {
                      const product = productsMap.get(watchedItems[index]?.productId);
                      if (!product) return null;

                      const saleUnitInfo = getUnitInfo(product.unitId);
                      const baseUnit = saleUnitInfo.baseUnit || unitsMap.get(product.unitId);
                      
                      const itemValues = watchedItems[index];
                      const quantityInBaseUnit = (itemValues?.quantity || 0) * (saleUnitInfo.conversionFactor || 1);
                      const lineTotal = quantityInBaseUnit * (itemValues?.price || 0);

                      const stockInfo = getStockInfo(product.id);
                      const avgCostInfo = getAverageCost(product.id);
                      
                      return (
                          <div key={field.id} className="p-3 border rounded-md relative">
                              <p className="font-medium mb-2">{product?.name || 'Sản phẩm không xác định'}</p>
                              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <FormField
                                    control={form.control}
                                    name={`items.${index}.quantity`}
                                    render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>SL ({saleUnitInfo.name || 'ĐVT'})</FormLabel>
                                          <FormControl>
                                              <Input type="number" step="any" {...field} />
                                          </FormControl>
                                          <FormDescription>
                                              Tồn: {stockInfo.stock.toLocaleString('en-US', { maximumFractionDigits: 2 })} {stockInfo.mainUnit?.name}
                                          </FormDescription>
                                          <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <div className="space-y-2">
                                    <FormLabel>SL ({baseUnit?.name || 'ĐVT cơ sở'})</FormLabel>
                                    <Input value={quantityInBaseUnit.toLocaleString()} readOnly />
                                    <FormDescription>&nbsp;</FormDescription>
                                  </div>
                                <FormField
                                    control={form.control}
                                    name={`items.${index}.price`}
                                    render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Giá bán (VNĐ / {baseUnit?.name || saleUnitInfo.name})</FormLabel>
                                          <FormControl>
                                              <FormattedNumberInput {...field} />
                                          </FormControl>
                                          <FormDescription>
                                              Giá nhập TB: {formatCurrency(avgCostInfo.avgCost)}
                                          </FormDescription>
                                          <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <div className="space-y-2">
                                    <FormLabel>Thành tiền</FormLabel>
                                    <Input value={formatCurrency(lineTotal)} readOnly className="font-semibold" />
                                    <FormDescription>&nbsp;</FormDescription>
                                  </div>
                              </div>
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
                  <FormMessage>{form.formState.errors.items?.message || form.formState.errors.items?.root?.message}</FormMessage>

                </div>
              </div>

              {/* Right Column */}
              <div className='md:col-span-1 flex flex-col justify-between border-l pl-8'>
                <div className="space-y-4 overflow-y-auto pr-2 -mr-2">
                    <h3 className="text-md font-medium">Tóm tắt thanh toán</h3>
                      <div className="space-y-4 text-sm">
                          <div className="flex justify-between items-center">
                              <Label>Tổng tiền hàng</Label>
                              <p className="font-semibold text-base">{formatCurrency(totalAmount)}</p>
                          </div>
                           {tierDiscountAmount > 0 && (
                            <div className="flex justify-between items-center text-primary">
                                <Label>Ưu đãi hạng {selectedCustomer?.loyaltyTier && settings?.loyalty?.tiers.find(t => t.name === selectedCustomer.loyaltyTier)?.vietnameseName} ({tierDiscountPercentage}%)</Label>
                                <p className="font-semibold">-{formatCurrency(tierDiscountAmount)}</p>
                            </div>
                           )}
                           <FormField
                              control={form.control}
                              name="discountValue"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Giảm giá</FormLabel>
                                  <div className="flex gap-2">
                                    <FormField
                                      control={form.control}
                                      name="discountType"
                                      render={({ field: typeField }) => (
                                        <FormControl>
                                          <RadioGroup
                                            value={typeField.value}
                                            onValueChange={typeField.onChange}
                                            className="flex items-center"
                                          >
                                            <FormItem className="flex items-center space-x-1 space-y-0">
                                              <FormControl>
                                                <RadioGroupItem value="amount" id="d_amount" />
                                              </FormControl>
                                              <FormLabel className="font-normal">VNĐ</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-1 space-y-0">
                                              <FormControl>
                                                <RadioGroupItem value="percentage" id="d_percent" />
                                              </FormControl>
                                              <FormLabel className="font-normal">%</FormLabel>
                                            </FormItem>
                                          </RadioGroup>
                                        </FormControl>
                                      )}
                                    />
                                    <FormattedNumberInput {...field} id="discountValue" />
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                          {settings?.loyalty?.enabled && selectedCustomer && selectedCustomer.id !== 'walk-in-customer' && (
                              <FormField
                                  control={form.control}
                                  name="pointsUsed"
                                  render={({ field }) => (
                                      <FormItem>
                                          <div className="flex justify-between items-center">
                                              <FormLabel>Sử dụng điểm</FormLabel>
                                              <FormattedNumberInput {...field} id="pointsUsed" className="w-32"/>
                                          </div>
                                          <FormDescription>
                                              Có thể dùng: {selectedCustomer.loyaltyPoints || 0} điểm
                                          </FormDescription>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                          )}
                          {pointsDiscount > 0 && (
                              <div className="flex justify-between items-center text-xs text-muted-foreground">
                                  <span>Giảm giá điểm thưởng ({pointsUsed} điểm):</span>
                                  <span className="font-semibold">-{formatCurrency(pointsDiscount)}</span>
                              </div>
                          )}
                          
                           {totalDiscount > 0 && (
                            <div className="flex justify-between items-center font-semibold text-primary mt-2">
                                <Label>Tổng giảm giá</Label>
                                <p>-{formatCurrency(totalDiscount)}</p>
                            </div>
                           )}

                          {vatRate > 0 && (
                          <div className="flex justify-between items-center">
                              <span>Thuế VAT ({vatRate}%):</span>
                              <span className="font-semibold">{formatCurrency(vatAmount)}</span>
                          </div>
                          )}
                          <div className="flex justify-between items-center font-bold text-lg text-primary">
                            <span>Tổng cộng:</span>
                            <span>{formatCurrency(finalAmount)}</span>
                        </div>
                      </div>
                    <Separator/>
                    <div className="space-y-4 text-sm">
                        <div className="flex justify-between items-center">
                            <Label>Nợ cũ:</Label>
                            <span className="font-semibold">{formatCurrency(previousDebt)}</span>
                        </div>
                        <div className="flex justify-between items-center font-bold text-base">
                            <span>Tổng phải trả:</span>
                            <span>{formatCurrency(totalPayable)}</span>
                        </div>
                        <FormField
                              control={form.control}
                              name="customerPayment"
                              render={({ field }) => (
                                  <FormItem>
                                      <div className="flex justify-between items-center">
                                          <FormLabel>Khách thanh toán:</FormLabel>
                                          <FormattedNumberInput {...field} id="customerPayment" className="w-32"/>
                                      </div>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                        <Separator/>
                        <div className={`flex justify-between items-center font-bold text-base ${isChange ? 'text-green-600' : 'text-destructive'}`}>
                            <span>{isChange ? 'Tiền thối lại:' : 'Còn nợ lại:'}</span>
                            <span>{formatCurrency(Math.abs(remainingDebt))}</span>
                        </div>
                        {isChange && (
                          <FormField
                              control={form.control}
                              name="isChangeReturned"
                              render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                      <div className="space-y-0.5">
                                          <FormLabel>Đã thối tiền</FormLabel>
                                          <FormDescription>
                                              Bỏ chọn nếu muốn ghi nợ âm.
                                          </FormDescription>
                                      </div>
                                      <FormControl>
                                          <Checkbox
                                              checked={field.value}
                                              onCheckedChange={field.onChange}
                                          />
                                      </FormControl>
                                  </FormItem>
                              )}
                          />
                        )}
                    </div>
                    {sale && (
                      <>
                        <Separator />
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Trạng thái</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Chọn trạng thái" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="pending">Chờ xử lý</SelectItem>
                                  <SelectItem value="unprinted">Chưa in</SelectItem>
                                  <SelectItem value="printed">Đã in</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                </div>
                <DialogFooter className="pt-4 border-t mt-4 flex-col gap-2">
                  <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                    {form.formState.isSubmitting ? (sale ? 'Đang cập nhật...' : 'Đang tạo...') : (sale ? 'Cập nhật đơn hàng' : 'Tạo đơn hàng')}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full">Hủy</Button>
                </DialogFooter>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
