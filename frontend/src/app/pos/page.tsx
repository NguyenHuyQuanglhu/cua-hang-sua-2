'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import {
  Barcode,
  Check,
  ChevronsUpDown,
  MinusCircle,
  PlusCircle,
  Search,
  Trash2,
  Undo2,
  XCircle,
  PanelLeft,
  UserPlus,
  Lock,
  QrCode,
  Banknote,
  RefreshCw,
  Clock,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useReactToPrint } from 'react-to-print';

import { useStore } from '@/contexts/store-context'
import { getPostShiftRedirectPath } from '@/lib/navigation'
import {
  Customer,
  Payment,
  Product,
  Sale,
  SalesItem,
  ThemeSettings,
  Unit,
  Shift,
  UserRole,
} from '@/lib/types'
import { upsertSaleTransaction, updateSaleStatus } from '@/app/sales/actions'
import {
  getProducts,
  getProductByBarcode,
  getCustomers,
  getUnits,
  getStoreSettings,
  getActiveShift,
  getProductUnits,
  ProductUnitInfo,
} from './actions'
import { useToast } from '@/hooks/use-toast'
import { cn, formatCurrency } from '@/lib/utils'
import { useUserRole } from '@/hooks/use-user-role'
import { apiClient } from '@/lib/api-client'
import { safeStorage } from '@/lib/error-handling'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useSidebar } from '@/components/ui/sidebar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CustomerForm } from '@/app/customers/components/customer-form'
import { StartShiftDialog } from './components/start-shift-dialog'
import { ShiftControls } from './components/shift-controls'
import { ThermalReceipt } from '../sales/[id]/components/thermal-receipt'
import { InvoicePrintDialog } from '@/components/invoice-print-dialog'
import { VoucherInput } from './components/voucher-input'
import { PaymentMethodSelector, PaymentMethod } from './components/payment-method-selector'
import { QRPaymentDialog } from './components/qr-payment-dialog'
import { PrintInvoiceCheckbox, loadPrintPreference } from './components/PrintInvoiceCheckbox'

// Extended product type with stock info from SQL Server
interface ProductWithStock extends Product {
  currentStock: number;
  averageCost: number;
  categoryName?: string;
  unitName?: string;
}

// Extended customer type with debt info
interface CustomerWithDebt extends Customer {
  currentDebt?: number;
}

type CartItem = {
  productId: string
  productName: string
  quantity: number // This is in the selected sale unit
  price: number // This is the price per BASE unit
  saleUnitId: string // ID of selected unit
  saleUnitName: string
  availableUnits: ProductUnitInfo[] // All available units for this product
  stockInfo: {
    stockInBaseUnit: number
    baseUnitName: string
    conversionFactor: number // Conversion factor of selected unit
  }
}

const WALK_IN_CUSTOMER_ID = 'walk-in-customer'

const FormattedNumberInput = ({ value, onChange, ...props }: { value: number; onChange: (value: number) => void;[key: string]: any }) => {
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

export default function POSPage() {
  const { user, isLoading: isStoreLoading, currentStore } = useStore()
  const router = useRouter()
  const { toast } = useToast()
  const { toggleSidebar } = useSidebar();
  const { permissions, isLoading: isRoleLoading } = useUserRole();

  // Data state
  const [products, setProducts] = useState<ProductWithStock[]>([])
  const [customers, setCustomers] = useState<CustomerWithDebt[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [settings, setSettings] = useState<ThemeSettings | null>(null)
  const [activeShift, setActiveShift] = useState<Shift | null>(null)

  // Loading states
  const [productsLoading, setProductsLoading] = useState(true)
  const [customersLoading, setCustomersLoading] = useState(true)
  const [unitsLoading, setUnitsLoading] = useState(true)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [shiftsLoading, setShiftsLoading] = useState(true)

  // Cart and UI state
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(WALK_IN_CUSTOMER_ID)
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false)
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [customerPayment, setCustomerPayment] = useState(0)
  const [includeDebtPayment, setIncludeDebtPayment] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('amount');
  const [discountValue, setDiscountValue] = useState(0);
  const [printInvoice, setPrintInvoice] = useState(() => loadPrintPreference());
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [pointsUsed, setPointsUsed] = useState(0);
  const [paymentSuggestions, setPaymentSuggestions] = useState<number[]>([]);
  const [isChangeReturned, setIsChangeReturned] = useState(true);
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
  const [showQRPaymentDialog, setShowQRPaymentDialog] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const cartStorageKey = useMemo(
    () => (currentStore?.id ? `pos-cart-${currentStore.id}` : 'pos-cart'),
    [currentStore?.id]
  );

  // Load cart from localStorage on mount with error handling
  useEffect(() => {
    const savedCart = safeStorage.getItem(cartStorageKey);
    const savedCustomerId = safeStorage.getItem('pos-customer-id');
    const savedDiscountType = safeStorage.getItem('pos-discount-type');
    const savedDiscountValue = safeStorage.getItem('pos-discount-value');
    const savedPointsUsed = safeStorage.getItem('pos-points-used');

    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse saved cart:', e);
      }
    } else {
      setCart([]);
    }
    if (savedCustomerId) setSelectedCustomerId(savedCustomerId);
    if (savedDiscountType) setDiscountType(savedDiscountType as 'percentage' | 'amount');
    if (savedDiscountValue) setDiscountValue(Number(savedDiscountValue));
    if (savedPointsUsed) setPointsUsed(Number(savedPointsUsed));
  }, [cartStorageKey]);

  // Update cart items with latest stock info when products data changes
  useEffect(() => {
    if (cart.length > 0 && products.length > 0) {
      const tempProductsMap = new Map(products.map((p) => [p.id, p]));

      let removedCount = 0;
      setCart(prevCart => prevCart.flatMap(item => {
        const product = tempProductsMap.get(item.productId);
        if (!product) {
          console.log('[Update cart] Product not found:', item.productId);
          removedCount += 1;
          return [];
        }

        // Get stock from product
        const stockInBaseUnit = (product as any).stockQuantity || (product as any).currentStock || 0;
        console.log('[Update cart]', product.name, 'updating stock to:', stockInBaseUnit, 'from product:', product);
        
        return [{
          ...item,
          stockInfo: {
            ...item.stockInfo,
            stockInBaseUnit: stockInBaseUnit,
          }
        }];
      }));

      if (removedCount > 0) {
        toast({
          variant: 'destructive',
          title: 'Đã làm mới giỏ hàng',
          description: `${removedCount} sản phẩm không thuộc cửa hàng hiện tại đã được gỡ khỏi giỏ.`,
        });
      }
    }
  }, [products, cart.length, toast]);

  // Save cart to localStorage whenever it changes with error handling
  useEffect(() => {
    if (cart.length > 0) {
      safeStorage.setItem(cartStorageKey, JSON.stringify(cart));
    } else {
      safeStorage.removeItem(cartStorageKey);
    }
  }, [cart, cartStorageKey]);

  // Save other state to localStorage with error handling
  useEffect(() => {
    safeStorage.setItem('pos-customer-id', selectedCustomerId);
  }, [selectedCustomerId]);

  useEffect(() => {
    safeStorage.setItem('pos-discount-type', discountType);
  }, [discountType]);

  useEffect(() => {
    safeStorage.setItem('pos-discount-value', String(discountValue));
  }, [discountValue]);

  useEffect(() => {
    safeStorage.setItem('pos-points-used', String(pointsUsed));
  }, [pointsUsed]);

  // Invoice print dialog state
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<{
    saleId: string;
    invoiceNumber: string;
    transactionDate: Date;
    items: CartItem[];
    totalAmount: number;
    discount: number;
    vatAmount: number;
    finalAmount: number;
    customerPayment: number;
    customerName?: string;
    customerPhone?: string;
  } | null>(null);

  // Fetch products from SQL Server
  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      // First, sync inventory to ensure ProductInventory is up-to-date
      try {
        await apiClient.request('/sync-data/inventory', { method: 'POST' });
        console.log('[fetchProducts] Inventory synced successfully');
      } catch (syncError) {
        console.warn('[fetchProducts] Inventory sync failed (non-critical):', syncError);
        // Continue even if sync fails
      }

      const result = await getProducts({ pageSize: 1000, storeId: currentStore?.id }); // Get products of current store only
      if (result.success && result.data) {
        console.log('[fetchProducts] First 3 products:', result.data.slice(0, 3));
        setProducts(result.data as unknown as ProductWithStock[]);
      } else {
        toast({
          variant: 'destructive',
          title: 'Lỗi tải sản phẩm',
          description: result.error,
        });
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  }, [toast, currentStore?.id]);

  // Fetch customers from SQL Server
  const fetchCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const result = await getCustomers({ pageSize: 1000 });
      if (result.success && result.data) {
        setCustomers(result.data as unknown as CustomerWithDebt[]);
      } else {
        toast({
          variant: 'destructive',
          title: 'Lỗi tải khách hàng',
          description: result.error,
        });
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setCustomersLoading(false);
    }
  }, [toast]);

  // Fetch units from SQL Server
  const fetchUnits = useCallback(async () => {
    setUnitsLoading(true);
    try {
      const result = await getUnits();
      if (result.success && result.data) {
        setUnits(result.data as Unit[]);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setUnitsLoading(false);
    }
  }, []);

  // Fetch store settings from SQL Server
  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const result = await getStoreSettings();
      if (result.success && result.settings) {
        setSettings(result.settings as ThemeSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  // Fetch active shift from SQL Server
  const fetchActiveShift = useCallback(async () => {
    if (!user?.id) return;
    setShiftsLoading(true);
    try {
      const result = await getActiveShift();
      console.log('[POS] Active shift result:', result);
      if (result.success && result.shift) {
        console.log('[POS] Setting active shift:', result.shift);
        setActiveShift(result.shift as Shift);
      } else {
        console.log('[POS] No active shift found');
        setActiveShift(null);
      }
    } catch (error) {
      console.error('Error fetching active shift:', error);
      setActiveShift(null);
    } finally {
      setShiftsLoading(false);
    }
  }, [user?.id]);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchCustomers();
      fetchUnits();
      fetchSettings();
      fetchActiveShift();
    }
  }, [user, fetchProducts, fetchCustomers, fetchUnits, fetchSettings, fetchActiveShift]);

  // Memos for data mapping
  const unitsMap = useMemo(() => new Map(units?.map((u) => [u.id, u])), [units])
  const productsMap = useMemo(() => new Map(products?.map((p) => [p.id, p])), [products])
  const productsByBarcode = useMemo(() => {
    const map = new Map<string, ProductWithStock>()
    products?.forEach((p) => {
      if (p.barcode) {
        map.set(p.barcode, p)
      }
    })
    return map
  }, [products])

  const walkInCustomer: CustomerWithDebt = {
    id: WALK_IN_CUSTOMER_ID,
    name: 'Khách lẻ',
    customerType: 'personal',
    creditLimit: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
    currentDebt: 0,
  }

  const allCustomers = useMemo(() => (customers ? [walkInCustomer, ...customers] : [walkInCustomer]), [customers])
  const selectedCustomer = useMemo(() => allCustomers.find(c => c.id === selectedCustomerId), [allCustomers, selectedCustomerId]);

  // Unit info helper
  const getUnitInfo = useCallback((unitId: string): { baseUnit?: Unit; conversionFactor: number; name: string } => {
    const unit = unitsMap.get(unitId)
    if (!unit) return { conversionFactor: 1, name: '' }

    if (unit.baseUnitId && unit.conversionFactor) {
      const baseUnit = unitsMap.get(unit.baseUnitId)
      return { baseUnit, conversionFactor: unit.conversionFactor, name: unit.name }
    }

    return { baseUnit: unit, conversionFactor: 1, name: unit.name }
  }, [unitsMap])

  // Get stock from SQL Server (already calculated in ProductWithStock)
  const getStockInBaseUnit = useCallback((productId: string): number => {
    const product = productsMap.get(productId)
    if (!product) {
      console.log('[getStockInBaseUnit] Product not found:', productId)
      return 0
    }
    // API returns 'stockQuantity', not 'currentStock'
    const stock = (product as any).stockQuantity || (product as ProductWithStock).currentStock || 0
    console.log('[getStockInBaseUnit]', product.name, 'stock:', stock, 'raw product:', {
      stockQuantity: (product as any).stockQuantity,
      currentStock: (product as ProductWithStock).currentStock,
      allKeys: Object.keys(product)
    })
    return stock
  }, [productsMap])

  // Cart Management
  const addProductToCart = useCallback(async (product: ProductWithStock) => {
    const existingItemIndex = cart.findIndex((item) => item.productId === product.id)

    if (existingItemIndex > -1) {
      const newCart = [...cart]
      const currentItem = newCart[existingItemIndex]
      const stockInBaseUnit = getStockInBaseUnit(product.id)
      const maxQuantity = Math.floor(stockInBaseUnit / (currentItem.stockInfo?.conversionFactor || 1))

      // Only increment if we haven't reached max stock (allow 0 stock for pre-orders)
      if (stockInBaseUnit === 0 || currentItem.quantity < maxQuantity) {
        newCart[existingItemIndex].quantity += 1
        // Update stock info
        newCart[existingItemIndex].stockInfo.stockInBaseUnit = stockInBaseUnit
        setCart(newCart)
      } else {
        toast({
          variant: "destructive",
          title: "Không đủ hàng",
          description: `Chỉ còn ${maxQuantity} ${currentItem.saleUnitName || 'đơn vị'} trong kho`,
        })
      }
    } else {
      // Fetch available units for this product
      const unitsResult = await getProductUnits(product.id);
      let availableUnits: ProductUnitInfo[] = [];
      let baseUnitInfo: ProductUnitInfo | undefined;

      if (unitsResult.success && unitsResult.availableUnits) {
        availableUnits = unitsResult.availableUnits;
        baseUnitInfo = unitsResult.baseUnit;
      }

      // If no units from API, create default from product's unit
      if (availableUnits.length === 0) {
        const { name: saleUnitName, baseUnit, conversionFactor } = getUnitInfo(product.unitId)
        const displayUnitName = product.unitName || saleUnitName || 'Cái';
        availableUnits = [{
          id: product.unitId,
          name: displayUnitName,
          isBase: true,
          conversionFactor: 1
        }];
        baseUnitInfo = availableUnits[0];
      }

      const stockInBaseUnit = getStockInBaseUnit(product.id)
      // Use 'price' from API (not 'sellingPrice' from old type)
      const productPrice = (product as unknown as { price?: number }).price || product.sellingPrice || 0;

      // Default to base unit
      const defaultUnit = baseUnitInfo || availableUnits[0];

      setCart([
        ...cart,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          price: productPrice,
          saleUnitId: defaultUnit.id,
          saleUnitName: defaultUnit.name,
          availableUnits: availableUnits,
          stockInfo: {
            stockInBaseUnit: stockInBaseUnit,
            baseUnitName: baseUnitInfo?.name || defaultUnit.name,
            conversionFactor: defaultUnit.conversionFactor,
          },
        },
      ])

      // Show warning if stock is 0
      if (stockInBaseUnit === 0) {
        toast({
          title: "Cảnh báo",
          description: `Sản phẩm "${product.name}" hiện tại hết hàng. Vui lòng nhập thêm trước khi bán.`,
        })
      }
    }
  }, [cart, getStockInBaseUnit, getUnitInfo, toast])

  // Update cart item unit
  const updateCartItemUnit = (productId: string, newUnitId: string) => {
    setCart(prevCart => prevCart.map((item) => {
      if (item.productId !== productId) return item;

      const newUnit = item.availableUnits.find(u => u.id === newUnitId);
      if (!newUnit) return item;

      return {
        ...item,
        saleUnitId: newUnitId,
        saleUnitName: newUnit.name,
        stockInfo: {
          ...item.stockInfo,
          conversionFactor: newUnit.conversionFactor,
        },
      };
    }));
  }

  const updateCartItem = (productId: string, newQuantity: number) => {
    const newCart = cart.map((item) => {
      if (item.productId !== productId) return item;

      // Check stock limit
      const stockInBaseUnit = item.stockInfo?.stockInBaseUnit || 0;
      const conversionFactor = item.stockInfo?.conversionFactor || 1;
      const maxQuantity = Math.floor(stockInBaseUnit / conversionFactor);

      // Allow 0 stock for pre-orders, but show warning
      if (stockInBaseUnit === 0 && newQuantity > 0) {
        toast({
          title: "Cảnh báo",
          description: `Sản phẩm "${item.productName}" hiện tại hết hàng. Đơn hàng này sẽ được xử lý sau khi nhập thêm hàng.`,
        })
        return { ...item, quantity: newQuantity };
      }

      // Limit quantity to available stock
      const limitedQuantity = Math.min(Math.max(0, newQuantity), maxQuantity);

      // Show toast if user tried to exceed stock
      if (newQuantity > maxQuantity && maxQuantity > 0) {
        toast({
          variant: "destructive",
          title: "Không đủ hàng",
          description: `Chỉ còn ${maxQuantity} ${item.saleUnitName || 'đơn vị'} trong kho`,
        })
      }

      return { ...item, quantity: limitedQuantity };
    })
    setCart(newCart.filter((item) => item.quantity > 0))
  }

  // Barcode scanning with SQL Server lookup
  const handleBarcodeScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (!barcode) return

      // First try local lookup
      const localProduct = productsByBarcode.get(barcode)
      if (localProduct) {
        addProductToCart(localProduct)
        setBarcode('')
        return
      }

      // If not found locally, try SQL Server API
      const result = await getProductByBarcode(barcode, currentStore?.id)
      if (result.success && result.product) {
        const product = result.product as unknown as ProductWithStock
        // Add to local products cache
        setProducts(prev => {
          const exists = prev.some(p => p.id === product.id)
          if (!exists) return [...prev, product]
          return prev
        })
        addProductToCart(product)
        setBarcode('')
      } else {
        toast({
          variant: 'destructive',
          title: 'Không tìm thấy sản phẩm',
          description: result.error || `Không có sản phẩm nào khớp với mã vạch "${barcode}".`,
        })
      }
    }
  }

  // Financial Calculations
  const totalAmount = useMemo(() =>
    cart.reduce((acc, item) => {
      const quantityInBase = item.quantity * item.stockInfo.conversionFactor
      return acc + quantityInBase * item.price
    }, 0),
    [cart])

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

  const calculatedDiscount = useMemo(() =>
    discountType === 'percentage' ? (totalAmount * discountValue) / 100 : discountValue,
    [totalAmount, discountType, discountValue]
  );

  // Voucher handlers
  const handleVoucherApplied = useCallback((voucher: any, discount: number) => {
    setAppliedVoucher(voucher);
    setVoucherDiscount(discount);
  }, []);

  const handleVoucherRemoved = useCallback(() => {
    setAppliedVoucher(null);
    setVoucherDiscount(0);
  }, []);

  const pointsToVndRate = settings?.loyalty?.pointsToVndRate || 0;
  const pointsDiscount = pointsUsed * pointsToVndRate;

  // Auto-apply promotions
  const [autoPromotionDiscount, setAutoPromotionDiscount] = useState(0);
  const [appliedPromotions, setAppliedPromotions] = useState<any[]>([]);

  useEffect(() => {
    const calculateAutoPromotions = async () => {
      if (cart.length === 0 || totalAmount === 0) {
        setAutoPromotionDiscount(0);
        setAppliedPromotions([]);
        return;
      }

      try {
        const items = cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        }));

        const response = await apiClient.request('/promotions/calculate', {
          method: 'POST',
          body: {
            items,
            customerId: selectedCustomerId !== WALK_IN_CUSTOMER_ID ? selectedCustomerId : undefined,
            subtotal: totalAmount,
          },
        }) as any;

        if (response.success) {
          setAutoPromotionDiscount(response.totalDiscount || 0);
          setAppliedPromotions(response.appliedPromotions || []);
        }
      } catch (error) {
        console.error('Calculate promotions error:', error);
      }
    };

    calculateAutoPromotions();
  }, [cart, totalAmount, selectedCustomerId]);

  // Calculate points that will be earned from this purchase
  const pointsPerAmount = settings?.loyalty?.pointsPerAmount || 0;
  const earnedPoints = useMemo(() => {
    // Only calculate for registered customers (not walk-in)
    if (!selectedCustomerId || selectedCustomerId === WALK_IN_CUSTOMER_ID) return 0;
    if (!settings?.loyalty?.enabled || pointsPerAmount <= 0) return 0;
    // Points are calculated on final amount (after discounts, before VAT)
    const amountForPoints = totalAmount - tierDiscountAmount - calculatedDiscount - pointsDiscount - autoPromotionDiscount;
    return Math.floor(amountForPoints / pointsPerAmount);
  }, [selectedCustomerId, settings?.loyalty?.enabled, pointsPerAmount, totalAmount, tierDiscountAmount, calculatedDiscount, pointsDiscount, autoPromotionDiscount]);

  const totalDiscount = tierDiscountAmount + calculatedDiscount + pointsDiscount + voucherDiscount + autoPromotionDiscount;
  const amountAfterDiscount = totalAmount - totalDiscount;

  const vatRate = settings?.vatRate || 0;
  const vatAmount = (amountAfterDiscount * vatRate) / 100;
  const finalAmount = amountAfterDiscount + vatAmount;

  // Previous debt from SQL Server (stored in customer.currentDebt)
  const previousDebt = useMemo(() => {
    if (!selectedCustomerId || selectedCustomerId === WALK_IN_CUSTOMER_ID) return 0;
    return selectedCustomer?.currentDebt || 0;
  }, [selectedCustomerId, selectedCustomer]);

  // Calculate total payable based on whether debt payment is included
  const totalPayable = includeDebtPayment ? finalAmount + previousDebt : finalAmount;
  const remainingDebt = totalPayable - customerPayment;
  const changeAmount = customerPayment - totalPayable;

  // Check if customer exceeds credit limit
  const exceedsCreditLimit = useMemo(() => {
    if (!selectedCustomer || selectedCustomerId === WALK_IN_CUSTOMER_ID) return false;
    const creditLimit = selectedCustomer.creditLimit || 0;
    if (creditLimit === 0) return false; // No limit set
    return remainingDebt > creditLimit;
  }, [selectedCustomer, selectedCustomerId, remainingDebt]);

  // Auto-fill customer payment based on total payable
  useEffect(() => {
    if (totalPayable > 0) {
      setCustomerPayment(totalPayable);
    } else {
      setCustomerPayment(0);
    }
  }, [totalPayable]);

  // Form Submission - Create sale via SQL Server API
  const handleCreateSale = async () => {
    // Allow payment if either has items OR paying debt
    if (cart.length === 0 && !includeDebtPayment) {
      toast({
        variant: 'destructive',
        title: 'Đơn hàng trống',
        description: 'Vui lòng thêm sản phẩm vào đơn hàng hoặc chọn thanh toán nợ.',
      })
      return
    }

    // If only paying debt (no items), process debt payment directly
    if (cart.length === 0 && includeDebtPayment && previousDebt > 0) {
      await processDebtPaymentOnly();
      return;
    }

    // Check credit limit
    if (exceedsCreditLimit) {
      const creditLimit = selectedCustomer?.creditLimit || 0;
      toast({
        variant: 'destructive',
        title: 'Vượt quá hạn mức tín dụng',
        description: `Khách hàng "${selectedCustomer?.name}" có hạn mức ${formatCurrency(creditLimit)}. Nợ hiện tại sẽ là ${formatCurrency(remainingDebt)}. Vui lòng thu thêm tiền hoặc liên hệ quản lý để tăng hạn mức.`,
      })
      return
    }

    // Show payment method selector
    setShowPaymentMethodDialog(true);
  }

  const handlePaymentMethodSelected = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);

    // Check if this is debt-only payment
    const isDebtOnly = cart.length === 0 && includeDebtPayment;

    if (method === 'qr') {
      // Show QR payment dialog
      setShowQRPaymentDialog(true);
    } else if (method === 'cash') {
      // Process payment directly
      if (isDebtOnly) {
        processDebtPaymentOnly('cash');
      } else {
        processSale('cash');
      }
    } else {
      // For card and transfer, process directly
      if (isDebtOnly) {
        processDebtPaymentOnly(method);
      } else {
        processSale(method);
      }
    }
  }

  // Process debt payment only (no sale items) - Create a sale record for tracking
  const processDebtPaymentOnly = async (paymentMethod: PaymentMethod = 'cash') => {
    if (!selectedCustomerId || selectedCustomerId === WALK_IN_CUSTOMER_ID) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Vui lòng chọn khách hàng để thanh toán nợ.',
      });
      return;
    }

    if (previousDebt <= 0) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Khách hàng không có nợ cần thanh toán.',
      });
      return;
    }

    if (customerPayment < previousDebt) {
      toast({
        variant: 'destructive',
        title: 'Số tiền không đủ',
        description: `Vui lòng nhập số tiền ít nhất ${formatCurrency(previousDebt)}`,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create a sale record with no items (debt payment only)
      const saleData: Partial<Sale> & { isChangeReturned?: boolean; items?: any[] } = {
        customerId: selectedCustomerId,
        shiftId: activeShift?.id,
        transactionDate: new Date().toISOString(),
        totalAmount: 0, // No products
        discount: 0,
        discountType: 'amount',
        discountValue: 0,
        vatAmount: 0,
        finalAmount: 0, // No products
        customerPayment: customerPayment,
        previousDebt: previousDebt, // The debt being paid
        remainingDebt: 0, // After payment, debt should be 0
        paymentMethod: paymentMethod,
        status: 'printed', // Mark as finalized for debt payment
        isChangeReturned: customerPayment > previousDebt ? true : false,
        items: [], // Empty items array
      };

      const result = await upsertSaleTransaction(saleData as Record<string, unknown>);

      if (result.success && result.saleData) {
        const invoiceNumber = result.saleData.invoiceNumber as string;
        console.log('[POS] Debt payment sale created:', invoiceNumber);

        toast({
          title: '💰 Thanh toán nợ thành công!',
          description: (
            <div className="space-y-1">
              <p>Mã giao dịch: <strong>{invoiceNumber}</strong></p>
              <p>Đã thanh toán: <strong>{formatCurrency(previousDebt)}</strong></p>
              <p className="text-xs text-muted-foreground">
                Phương thức: {paymentMethod === 'cash' ? 'Tiền mặt' :
                  paymentMethod === 'card' ? 'Thẻ' :
                    paymentMethod === 'transfer' ? 'Chuyển khoản' :
                      paymentMethod === 'qr' ? 'QR Code' : 'Khác'}
              </p>
              {customerPayment > previousDebt && (
                <p className="text-xs text-green-600">
                  Tiền thối lại: {formatCurrency(customerPayment - previousDebt)}
                </p>
              )}
            </div>
          ),
        });

        // Reset state
        setCustomerPayment(0);
        setIncludeDebtPayment(false);
        setSelectedCustomerId(WALK_IN_CUSTOMER_ID);
        setSelectedPaymentMethod(null);

        // Refresh customer data to update debt
        await fetchCustomers();
      } else {
        throw new Error(result.error || 'Không thể tạo giao dịch thanh toán nợ');
      }
    } catch (error) {
      console.error('[POS] Error recording debt payment:', error);
      toast({
        variant: 'destructive',
        title: 'Lỗi thanh toán',
        description: error instanceof Error ? error.message : 'Không thể ghi nhận thanh toán nợ. Vui lòng thử lại.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const processSale = async (paymentMethod: PaymentMethod = 'cash') => {

    setIsSubmitting(true)
    const itemsData = cart.map((item) => ({
      productId: item.productId,
      quantity: item.quantity, // Send quantity in selected sale unit (backend validates by unitId)
      price: item.price,
      unitId: item.saleUnitId, // Include the selected unit ID
    }))

    const saleData: Partial<Sale> & { isChangeReturned?: boolean; items?: typeof itemsData } = {
      customerId: selectedCustomerId === WALK_IN_CUSTOMER_ID ? undefined : selectedCustomerId,
      shiftId: activeShift?.id,
      transactionDate: new Date().toISOString(),
      totalAmount: totalAmount,
      discount: calculatedDiscount,
      discountType,
      discountValue,
      tierDiscountPercentage,
      tierDiscountAmount,
      pointsUsed,
      pointsDiscount,
      vatAmount: vatAmount,
      finalAmount: finalAmount,
      customerPayment: customerPayment,
      previousDebt: includeDebtPayment ? previousDebt : 0, // Only include debt if checkbox is checked
      remainingDebt: remainingDebt,
      paymentMethod: paymentMethod,
      status: 'printed', // Mark as finalized after payment
      isChangeReturned: isChangeReturned,
      items: itemsData,
    }

    const result = await upsertSaleTransaction(saleData as Record<string, unknown>)

    if (result.success && result.saleData) {
      const invoiceNumber = result.saleData.invoiceNumber as string;
      const saleId = result.saleData.id as string;
      console.log('[POS] Sale created successfully');
      console.log('[POS] Invoice Number:', invoiceNumber);
      console.log('[POS] Sale ID:', saleId);
      console.log('[POS] Full saleData:', result.saleData);

      if (!saleId) {
        console.error('[POS] ERROR: saleId is undefined!', result);
        toast({
          variant: 'destructive',
          title: 'Lỗi',
          description: 'Không thể lấy ID đơn hàng. Vui lòng kiểm tra lại trong danh sách đơn hàng.',
        });
        return;
      }

      setLastSaleId(saleId);

      // Nếu có thanh toán nợ cũ, tạo payment record
      if (includeDebtPayment && previousDebt > 0 && selectedCustomerId && selectedCustomerId !== WALK_IN_CUSTOMER_ID) {
        try {
          const paymentData = {
            customerId: selectedCustomerId,
            amount: previousDebt,
            paymentDate: new Date().toISOString(),
            paymentMethod: paymentMethod,
            notes: `Thanh toán nợ cũ cùng đơn hàng ${invoiceNumber}`,
          };

          const paymentResult = await apiClient.createPayment(paymentData);

          if (paymentResult) {
            console.log('[POS] Debt payment recorded successfully:', paymentResult);
            toast({
              title: '💰 Đã ghi nhận thanh toán nợ',
              description: `Thanh toán ${formatCurrency(previousDebt)} cho nợ cũ`,
            });
          }
        } catch (error) {
          console.error('[POS] Error recording debt payment:', error);
          toast({
            variant: 'destructive',
            title: 'Cảnh báo',
            description: 'Đơn hàng đã tạo nhưng không ghi nhận được thanh toán nợ. Vui lòng kiểm tra lại.',
          });
        }
      }

      // Save sale data for invoice dialog
      const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
      setLastSaleData({
        saleId: result.saleData.id as string,
        invoiceNumber,
        transactionDate: new Date(),
        items: [...cart],
        totalAmount,
        discount: totalDiscount,
        vatAmount,
        finalAmount,
        customerPayment,
        customerName: selectedCustomer?.name,
        customerPhone: selectedCustomer?.phone,
      });

      // Show success toast with print button
      toast({
        title: '✅ Thanh toán thành công!',
        description: (
          <div className="space-y-1">
            <p>Đơn hàng <strong>{invoiceNumber}</strong> đã được tạo</p>
            <p className="text-xs text-muted-foreground">
              Phương thức: {paymentMethod === 'cash' ? 'Tiền mặt' :
                paymentMethod === 'card' ? 'Thẻ' :
                  paymentMethod === 'transfer' ? 'Chuyển khoản' :
                    paymentMethod === 'qr' ? 'QR Code' : 'Khác'}
            </p>
            {includeDebtPayment && previousDebt > 0 && (
              <p className="text-xs text-green-600 font-semibold">
                ✓ Đã thanh toán nợ cũ: {formatCurrency(previousDebt)}
              </p>
            )}
          </div>
        ),
        action: (
          <button
            onClick={() => setShowInvoiceDialog(true)}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            In hóa đơn
          </button>
        ),
      });

      // Auto-open invoice dialog if print checkbox is checked
      // Requirements: 1.3, 1.4 - Show dialog only if checkbox is checked
      if (printInvoice) {
        setShowInvoiceDialog(true);
      }

      // Reset state for new sale
      setCart([])
      setCustomerPayment(0)
      setIncludeDebtPayment(false)
      setSelectedCustomerId(WALK_IN_CUSTOMER_ID)
      setDiscountValue(0)
      setDiscountType('amount')
      setAppliedVoucher(null)
      setVoucherDiscount(0)
      setPointsUsed(0);
      setSelectedPaymentMethod(null);

      // Clear localStorage with error handling
      safeStorage.removeItem('pos-cart');
      safeStorage.removeItem('pos-customer-id');
      safeStorage.removeItem('pos-discount-type');
      safeStorage.removeItem('pos-discount-value');
      safeStorage.removeItem('pos-points-used');

      // Refresh data to get updated stock and customer debt
      fetchProducts();
      fetchCustomers();
      fetchActiveShift();

    } else {
      toast({
        variant: 'destructive',
        title: 'Ôi! Đã có lỗi xảy ra.',
        description: result.error,
      })
    }
    setIsSubmitting(false)
  }

  // Auto-focus barcode input
  useEffect(() => {
    barcodeInputRef.current?.focus();
    // Fallback focus with timeout for when the component first mounts
    const timer = setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, [cart]);

  // Redirect if not logged in
  useEffect(() => {
    if (!isStoreLoading && !user) {
      router.push('/login');
    }
  }, [isStoreLoading, user, router]);

  const handleCustomerPaymentChange = (value: number) => {
    setCustomerPayment(value);
    if (value > 0) {
      const s = value.toString();
      const suggestions = [
        parseInt(s + '000'),
        parseInt(s.slice(0, -1) + '0000'),
        parseInt(s.slice(0, -2) + '00000'),
      ].filter(n => n > value && n.toString().length <= 9);

      const amountToPayStr = Math.ceil(totalPayable).toString();
      const len = amountToPayStr.length;
      const powerOf10 = Math.pow(10, len - 1);
      const firstDigit = parseInt(amountToPayStr[0]);

      const nextRoundUp = (firstDigit + 1) * powerOf10;
      if (nextRoundUp > value) suggestions.push(nextRoundUp);

      setPaymentSuggestions([...new Set(suggestions)].sort((a, b) => a - b));
    } else {
      setPaymentSuggestions([]);
    }
  };

  const handleNewCustomerCreated = (isOpen: boolean, newCustomerId?: string) => {
    setIsCustomerFormOpen(isOpen);
    if (!isOpen) {
      fetchCustomers(); // Refresh customers list
      if (newCustomerId) {
        setSelectedCustomerId(newCustomerId);
      }
    }
  }

  const handleShiftStarted = () => {
    fetchActiveShift();
  }

  const handleShiftClosed = () => {
    setActiveShift(null);
    // Chuyển hướng dựa trên role của user
    const redirectPath = user?.role ? getPostShiftRedirectPath(user.role as UserRole) : '/login'
    router.push(redirectPath);
  }

  const isLoading = customersLoading || productsLoading || unitsLoading || settingsLoading || shiftsLoading || isStoreLoading || isRoleLoading;

  if (isLoading || (!user && !isStoreLoading)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Đang tải dữ liệu cho quầy POS...</p>
      </div>
    );
  }

  if (!activeShift) {
    return <StartShiftDialog
      userId={user!.id}
      userName={user!.displayName || user!.email}
      userRole={user!.role}
      onShiftStarted={handleShiftStarted}
    />;
  }

  // Lock POS if no active shift OR if worked more than 12 hours (critical overtime)
  const CRITICAL_OVERTIME_HOURS = 12;
  const isCriticalOvertime = activeShift && activeShift.hoursWorked && activeShift.hoursWorked >= CRITICAL_OVERTIME_HOURS;
  const isLocked = !activeShift || !!isCriticalOvertime;

  const canViewCustomers = permissions?.customers?.includes('view');
  const canAddCustomers = permissions?.customers?.includes('add');

  return (
    <>
      {canAddCustomers && (
        <CustomerForm
          isOpen={isCustomerFormOpen}
          onOpenChange={handleNewCustomerCreated}
        />
      )}
      <div className="flex flex-col h-[calc(100vh-5rem)] w-full -m-6 bg-muted/30 overflow-x-hidden">
        <header className="p-4 border-b bg-background flex items-center gap-3 flex-wrap shrink-0 w-full">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className='shrink-0'>
            <PanelLeft />
          </Button>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              ref={barcodeInputRef}
              placeholder="Quét mã vạch..."
              className="pl-10 h-12 text-lg w-full"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={handleBarcodeScan}
              disabled={isSubmitting || isLocked}
              autoFocus
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 shrink-0"
            onClick={() => {
              fetchProducts();
              fetchCustomers();
              toast({
                title: 'Đã cập nhật',
                description: 'Dữ liệu sản phẩm và khách hàng đã được làm mới.',
              });
            }}
            disabled={isLocked}
            title="Làm mới dữ liệu"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
          <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="h-12 shrink-0" disabled={isLocked}>
                <PlusCircle className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Thêm thủ công</span>
                <span className="sm:hidden">Thêm</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Tìm kiếm sản phẩm..." />
                <CommandList>
                  <CommandEmpty>Không tìm thấy sản phẩm.</CommandEmpty>
                  <CommandGroup>
                    {products?.map((product) => {
                      const stock = product.currentStock || (product as any).stockQuantity || 0;
                      const isOutOfStock = stock <= 0;
                      return (
                        <CommandItem
                          key={product.id}
                          value={product.name}
                          onSelect={() => {
                            if (isOutOfStock) return;
                            addProductToCart(product);
                            setProductSearchOpen(false);
                          }}
                          className={cn(isOutOfStock && "opacity-50 cursor-default grayscale")}
                        >
                          <div className="flex items-center w-full justify-between">
                            <div className="flex items-center">
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  cart.some(i => i.productId === product.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {product.name}
                            </div>
                            {isOutOfStock && (
                              <span className="text-xs text-destructive font-medium ml-2">Hết hàng</span>
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Popover
            open={customerSearchOpen}
            onOpenChange={setCustomerSearchOpen}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                disabled={isLocked || !canViewCustomers}
                className={cn(
                  'min-w-[150px] max-w-[250px] justify-between h-12 shrink-0',
                  !selectedCustomerId && 'text-muted-foreground'
                )}
              >
                <span className="truncate">
                  {selectedCustomerId
                    ? allCustomers.find((c) => c.id === selectedCustomerId)?.name
                    : 'Chọn khách hàng...'}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Tìm khách hàng..." />
                <CommandList>
                  <CommandEmpty>Không tìm thấy khách hàng.</CommandEmpty>
                  <CommandGroup>
                    {allCustomers.map((customer) => {
                      const debt = customer.currentDebt || 0;
                      return (
                        <CommandItem
                          value={`${customer.name} ${customer.phone}`}
                          key={customer.id}
                          onSelect={() => {
                            setSelectedCustomerId(customer.id)
                            setIncludeDebtPayment(false) // Reset checkbox when changing customer
                            setCustomerSearchOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              customer.id === selectedCustomerId
                                ? 'opacity-100'
                                : 'opacity-0'
                            )}
                          />
                          <div>
                            <p>{customer.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {customer.phone}
                            </p>
                            {debt > 0 && (
                              <p className="text-xs text-destructive">Nợ: {formatCurrency(debt)}</p>
                            )}
                          </div>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                  {canAddCustomers && (
                    <>
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
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {activeShift && <ShiftControls activeShift={activeShift} onShiftClosed={handleShiftClosed} />}
        </header>

        {/* Overtime Warning Banner */}
        {activeShift && activeShift.isOvertime && (
          <div className="bg-orange-100 dark:bg-orange-950 border-b border-orange-300 dark:border-orange-800 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-orange-900 dark:text-orange-100">
                    ⚠️ Đã vượt giờ làm việc quy định
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Bạn đã làm việc {activeShift.hoursWorked?.toFixed(1)} giờ (giới hạn: {activeShift.maxShiftHours} giờ).
                    Vui lòng đóng ca để nghỉ ngơi.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="bg-orange-500 hover:bg-orange-600 text-white border-orange-600"
                onClick={() => {
                  // Trigger close shift dialog
                  const closeButton = document.querySelector('[data-shift-close-button]') as HTMLButtonElement;
                  if (closeButton) closeButton.click();
                }}
              >
                Đóng ca ngay
              </Button>
            </div>
          </div>
        )}

        <main className="flex-1 w-full overflow-hidden">
          <div className="h-full w-full grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-y-auto overflow-x-hidden">
            {/* Cart Items */}
            <div className="lg:col-span-2 flex flex-col h-full overflow-hidden max-w-full">
            {isLocked && (
              <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-10">
                <Lock className="h-16 w-16 text-muted-foreground mb-4" />
                {isCriticalOvertime ? (
                  <>
                    <p className="text-lg font-semibold text-red-600">🚨 Đã làm việc quá lâu!</p>
                    <p className="text-sm text-muted-foreground text-center max-w-md mt-2">
                      Bạn đã làm việc {activeShift?.hoursWorked?.toFixed(1)} giờ (vượt quá {CRITICAL_OVERTIME_HOURS} giờ).
                      Vui lòng đóng ca ngay để nghỉ ngơi. Sức khỏe của bạn rất quan trọng!
                    </p>
                    <Button
                      className="mt-4"
                      variant="destructive"
                      onClick={() => {
                        const closeButton = document.querySelector('[data-shift-close-button]') as HTMLButtonElement;
                        if (closeButton) closeButton.click();
                      }}
                    >
                      Đóng ca ngay
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-muted-foreground">Giao diện bán hàng đã khóa</p>
                    <p className="text-sm text-muted-foreground">Vui lòng bắt đầu ca làm việc để mở khóa.</p>
                  </>
                )}
              </div>
            )}
            <h2 className="text-xl font-semibold mb-4 shrink-0">Đơn hàng hiện tại ({cart.length})</h2>
            <div className="flex-1 overflow-auto border rounded-lg w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">STT</TableHead>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Đơn giá</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Số lượng</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Thành tiền</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center h-48 text-muted-foreground"
                      >
                        Quét mã vạch hoặc tìm kiếm để thêm sản phẩm vào đơn
                        hàng.
                      </TableCell>
                    </TableRow>
                  ) : (
                    cart.map((item, index) => {
                      const lineTotal = item.quantity * item.stockInfo.conversionFactor * item.price;
                      // Only show conversion if both unit names exist and are different
                      const showConversion = item.saleUnitName && item.stockInfo.baseUnitName &&
                        item.saleUnitName !== item.stockInfo.baseUnitName &&
                        item.stockInfo.baseUnitName !== 'N/A' &&
                        item.stockInfo.conversionFactor > 1;
                      return (
                        <TableRow key={item.productId}>
                          <TableCell className="font-medium text-center">{index + 1}</TableCell>
                          <TableCell className="font-medium">
                            {item.productName}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.price * item.stockInfo.conversionFactor)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => updateCartItem(item.productId, item.quantity - 1)}>
                                <MinusCircle className="h-5 w-5" />
                              </Button>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  updateCartItem(item.productId, isNaN(val) ? 0 : val);
                                }}
                                className="w-16 text-center font-bold text-lg h-10 px-1"
                              />
                              {item.availableUnits.length > 1 ? (
                                <Select
                                  value={item.saleUnitId}
                                  onValueChange={(value) => updateCartItemUnit(item.productId, value)}
                                >
                                  <SelectTrigger className="w-20 h-10">
                                    <SelectValue placeholder="Đơn vị" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {item.availableUnits.map((unit) => (
                                      <SelectItem key={unit.id} value={unit.id}>
                                        {unit.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-sm text-muted-foreground w-12">{item.saleUnitName}</span>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => updateCartItem(item.productId, item.quantity + 1)}
                                disabled={(() => {
                                  const stockInBaseUnit = item.stockInfo?.stockInBaseUnit || 0;
                                  const conversionFactor = item.stockInfo?.conversionFactor || 1;
                                  const maxQuantity = Math.floor(stockInBaseUnit / conversionFactor);
                                  return item.quantity >= maxQuantity;
                                })()}
                              >
                                <PlusCircle className="h-5 w-5" />
                              </Button>
                            </div>
                            {showConversion && (
                              <p className="text-xs text-muted-foreground mt-1">
                                (1 {item.saleUnitName} = {item.stockInfo.conversionFactor} {item.stockInfo.baseUnitName})
                              </p>
                            )}
                            {/* Show available stock */}
                            {(() => {
                              const stockInBaseUnit = item.stockInfo?.stockInBaseUnit || 0;
                              const conversionFactor = item.stockInfo?.conversionFactor || 1;
                              const maxQuantity = Math.floor(stockInBaseUnit / conversionFactor);
                              const isLowStock = maxQuantity <= 5;
                              const isOutOfStock = maxQuantity === 0;

                              return (
                                <p className={cn(
                                  "text-xs mt-1",
                                  isOutOfStock ? "text-destructive font-semibold" :
                                    isLowStock ? "text-orange-500 font-medium" :
                                      "text-muted-foreground"
                                )}>
                                  Tồn kho: {maxQuantity} {item.saleUnitName || 'đơn vị'}
                                </p>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-right font-bold text-lg">
                            {formatCurrency(lineTotal)}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Payment and Summary */}
          <div className="lg:col-span-1 bg-card border rounded-lg p-6 flex flex-col h-full w-full max-w-full overflow-x-hidden">
            <h2 className="text-xl font-semibold mb-6 shrink-0">Thanh toán</h2>
            <div className="flex-1 flex flex-col gap-4 overflow-hidden w-full max-w-full">
              <div className="space-y-2 text-sm w-full flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
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

                <div className="space-y-2 pt-2">
                  <Label>Giảm giá</Label>
                  <div className="flex gap-4">
                    <RadioGroup value={discountType} onValueChange={(value) => setDiscountType(value as 'percentage' | 'amount')} className="flex items-center">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="amount" id="d_amount" />
                        <Label htmlFor="d_amount">VNĐ</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="percentage" id="d_percent" />
                        <Label htmlFor="d_percent">%</Label>
                      </div>
                    </RadioGroup>
                    <FormattedNumberInput
                      value={discountValue}
                      onChange={setDiscountValue}
                      className="h-9 text-right"
                    />
                  </div>
                </div>

                {calculatedDiscount > 0 && (
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Số tiền giảm:</span>
                    <span className="font-semibold">-{formatCurrency(calculatedDiscount)}</span>
                  </div>
                )}

                {/* Voucher Input */}
                <div className="space-y-2 pt-2">
                  <Label>Mã giảm giá</Label>
                  <VoucherInput
                    subtotal={totalAmount}
                    customerId={selectedCustomerId !== WALK_IN_CUSTOMER_ID ? selectedCustomerId : undefined}
                    onVoucherApplied={handleVoucherApplied}
                    onVoucherRemoved={handleVoucherRemoved}
                    appliedVoucher={appliedVoucher}
                  />
                  {voucherDiscount > 0 && (
                    <div className="flex justify-between items-center text-xs text-green-600">
                      <span>Giảm từ voucher:</span>
                      <span className="font-semibold">-{formatCurrency(voucherDiscount)}</span>
                    </div>
                  )}
                </div>

                {selectedCustomer && selectedCustomer.id !== 'walk-in-customer' && settings?.loyalty?.enabled && (
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="pointsUsed">Sử dụng điểm ({selectedCustomer.loyaltyPoints || 0} điểm khả dụng)</Label>
                    <div className="flex items-center gap-2">
                      <FormattedNumberInput
                        id="pointsUsed"
                        value={pointsUsed}
                        onChange={setPointsUsed}
                        className="h-9 text-right"
                        max={selectedCustomer.loyaltyPoints || 0}
                      />
                    </div>
                    {pointsDiscount > 0 && (
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Giảm giá điểm thưởng ({pointsUsed} điểm):</span>
                        <span className="font-semibold">-{formatCurrency(pointsDiscount)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Auto-applied promotions */}
                {appliedPromotions.length > 0 && (
                  <div className="space-y-1 pt-2 bg-green-50 dark:bg-green-950/20 p-2 rounded">
                    <Label className="text-green-700 dark:text-green-400">Khuyến mãi tự động</Label>
                    {appliedPromotions.map((promo, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-green-600">
                        <span>• {promo.name}</span>
                        <span className="font-semibold">-{formatCurrency(promo.discount)}</span>
                      </div>
                    ))}
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
                    <Label>Thuế VAT ({vatRate}%):</Label>
                    <span className="font-semibold">{formatCurrency(vatAmount)}</span>
                  </div>
                )}

                <Separator className="my-2" />

                <div className="flex justify-between items-center">
                  <Label className="font-bold">Khách cần trả</Label>
                  <p className="font-bold text-base text-primary">{formatCurrency(finalAmount)}</p>
                </div>

                {/* Display points that will be earned */}
                {earnedPoints > 0 && (
                  <div className="flex justify-between items-center text-sm text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded">
                    <Label className="text-green-600">Điểm sẽ nhận được</Label>
                    <p className="font-semibold">+{earnedPoints.toLocaleString()} điểm</p>
                  </div>
                )}

                {previousDebt > 0 && (
                  <>
                    <div className="flex justify-between items-center text-sm text-destructive">
                      <Label>Nợ cũ</Label>
                      <p className="font-semibold">{formatCurrency(previousDebt)}</p>
                    </div>

                    {/* Checkbox to include debt payment */}
                    <div className="flex items-center space-x-2 p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-800">
                      <Checkbox
                        id="includeDebtPayment"
                        checked={includeDebtPayment}
                        onCheckedChange={(checked) => {
                          setIncludeDebtPayment(checked as boolean);
                          // Auto-update payment amount when checkbox changes
                          if (checked) {
                            setCustomerPayment(finalAmount + previousDebt);
                          } else {
                            setCustomerPayment(finalAmount);
                          }
                        }}
                      />
                      <label
                        htmlFor="includeDebtPayment"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Thanh toán cả nợ cũ ({formatCurrency(previousDebt)})
                      </label>
                    </div>
                  </>
                )}

                <div className="flex justify-between items-center font-bold text-base">
                  <Label>Tổng phải trả</Label>
                  <p className="">{formatCurrency(totalPayable)}</p>
                </div>

                {/* Credit limit warning */}
                {selectedCustomer && selectedCustomerId !== WALK_IN_CUSTOMER_ID && selectedCustomer.creditLimit > 0 && (
                  <div className={cn(
                    "p-2 rounded text-xs",
                    exceedsCreditLimit ? "bg-destructive/10 text-destructive" :
                      remainingDebt > selectedCustomer.creditLimit * 0.8 ? "bg-orange-50 dark:bg-orange-950/20 text-orange-600" :
                        "bg-muted text-muted-foreground"
                  )}>
                    <div className="flex justify-between items-center">
                      <span>Hạn mức tín dụng:</span>
                      <span className="font-semibold">{formatCurrency(selectedCustomer.creditLimit)}</span>
                    </div>
                    {remainingDebt > 0 && (
                      <div className="flex justify-between items-center mt-1">
                        <span>Nợ sau giao dịch:</span>
                        <span className="font-semibold">{formatCurrency(remainingDebt)}</span>
                      </div>
                    )}
                    {exceedsCreditLimit && (
                      <p className="mt-1 font-semibold">⚠️ Vượt quá hạn mức!</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="customerPayment">
                    Tiền khách đưa
                  </Label>
                  <FormattedNumberInput
                    id="customerPayment"
                    value={customerPayment}
                    onChange={handleCustomerPaymentChange}
                    className="h-12 text-xl font-bold text-right"
                  />
                </div>
                {paymentSuggestions.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {paymentSuggestions.map((s) => {
                      const numString = s.toLocaleString('en-US');
                      const len = numString.length;
                      let textSize = 'text-sm';
                      if (len > 11) textSize = 'text-[10px]';
                      else if (len > 7) textSize = 'text-xs';

                      return (
                        <Button
                          key={s}
                          variant="outline"
                          size="sm"
                          onClick={() => handleCustomerPaymentChange(s)}
                          className={cn('h-auto py-1 px-2 flex-grow', textSize)}
                        >
                          {numString}
                        </Button>
                      )
                    })}
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <Label className={`font-semibold ${remainingDebt <= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {remainingDebt <= 0 ? 'Tiền thối lại' : 'Còn thiếu'}
                  </Label>
                  <p className={`font-bold text-base ${remainingDebt <= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {formatCurrency(Math.abs(remainingDebt))}
                  </p>
                </div>
                {changeAmount > 0 && (
                  <div className="flex items-center justify-end space-x-2 pt-2">
                    <Checkbox
                      id="isChangeReturned"
                      checked={isChangeReturned}
                      onCheckedChange={(checked) => setIsChangeReturned(Boolean(checked))}
                    />
                    <Label htmlFor="isChangeReturned" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Đã thối tiền
                    </Label>
                  </div>
                )}

                <PrintInvoiceCheckbox
                  checked={printInvoice}
                  onChange={setPrintInvoice}
                  disabled={isSubmitting || isLocked}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t shrink-0 w-full">
              <Button
                variant="outline"
                className="w-full h-14"
                onClick={() => {
                  setCart([])
                  setCustomerPayment(0)
                  setIncludeDebtPayment(false)
                  setDiscountValue(0)
                  setAppliedVoucher(null)
                  setVoucherDiscount(0)
                  setPointsUsed(0);
                  setPrintInvoice(loadPrintPreference());
                  // Clear localStorage with error handling
                  safeStorage.removeItem('pos-cart');
                  safeStorage.removeItem('pos-customer-id');
                  safeStorage.removeItem('pos-discount-type');
                  safeStorage.removeItem('pos-discount-value');
                  safeStorage.removeItem('pos-points-used');
                }}
                disabled={isSubmitting || isLocked}
              >
                <XCircle className="mr-2 h-5 w-5" />
                Hủy
              </Button>
              <Button
                className="w-full h-14 text-lg"
                onClick={handleCreateSale}
                disabled={isSubmitting || (cart.length === 0 && !includeDebtPayment) || isLocked || exceedsCreditLimit}
              >
                {selectedPaymentMethod === 'qr' && <QrCode className="mr-2 h-5 w-5" />}
                {selectedPaymentMethod === 'cash' && <Banknote className="mr-2 h-5 w-5" />}
                {exceedsCreditLimit ? 'Vượt hạn mức' : !selectedPaymentMethod ? (includeDebtPayment && cart.length === 0 ? 'Thanh toán nợ' : 'Thanh toán') : ''}
                {!exceedsCreditLimit && selectedPaymentMethod === 'qr' && 'QR Code'}
                {!exceedsCreditLimit && selectedPaymentMethod === 'cash' && 'Tiền mặt'}
                {!exceedsCreditLimit && selectedPaymentMethod === 'card' && 'Thẻ'}
                {!exceedsCreditLimit && selectedPaymentMethod === 'transfer' && 'Chuyển khoản'}
              </Button>
            </div>
          </div>
          </div>
        </main>
      </div>

      {/* Invoice Print Dialog */}
      {lastSaleData && (
        <InvoicePrintDialog
          saleId={lastSaleData.saleId}
          open={showInvoiceDialog}
          onClose={() => setShowInvoiceDialog(false)}
          invoiceNumber={lastSaleData.invoiceNumber}
          transactionDate={lastSaleData.transactionDate}
          items={lastSaleData.items.map(item => ({
            id: item.productId,
            name: item.productName,
            price: item.price,
            quantity: item.quantity,
            unitName: item.saleUnitName,
          }))}
          totalAmount={lastSaleData.totalAmount}
          discount={lastSaleData.discount}
          vatAmount={lastSaleData.vatAmount}
          finalAmount={lastSaleData.finalAmount}
          customerPayment={lastSaleData.customerPayment}
          customerName={lastSaleData.customerName}
          customerPhone={lastSaleData.customerPhone}
          settings={settings}
          storeName={currentStore?.name}
        />
      )}

      {/* Payment Method Selector */}
      <PaymentMethodSelector
        open={showPaymentMethodDialog}
        onClose={() => setShowPaymentMethodDialog(false)}
        onSelectMethod={handlePaymentMethodSelected}
        amount={finalAmount}
      />

      {/* QR Payment Dialog */}
      <QRPaymentDialog
        open={showQRPaymentDialog}
        onClose={() => setShowQRPaymentDialog(false)}
        onSuccess={() => processSale('qr')}
        amount={finalAmount}
        orderInfo={`Thanh toán đơn hàng - ${new Date().toLocaleString('vi-VN')}`}
      />
    </>
  )
}
