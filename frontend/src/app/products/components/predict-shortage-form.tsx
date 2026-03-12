'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Bot, AlertTriangle, FilePlus2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { getSalesForecast } from '@/app/actions'
import { type ForecastSalesOutput, type ForecastedProduct } from '@/ai/flows/forecast-sales'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useStore } from '@/contexts/store-context'
import { apiClient } from '@/lib/api-client'
import { Product, Sale, SalesItem, Unit } from '@/lib/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { toast } from '@/hooks/use-toast'

export function PredictShortageForm() {
  const [open, setOpen] = useState(false)
  const [prediction, setPrediction] = useState<ForecastSalesOutput | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [marketContext, setMarketContext] = useState('');
  const { currentStore } = useStore();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(true);
  const [unitsLoading, setUnitsLoading] = useState(true);

  useEffect(() => {
    if (!currentStore) return;

    const fetchData = async () => {
      try {
        setProductsLoading(true);
        const productsData = await apiClient.getProducts();
        setProducts((productsData as any).data || productsData || []);
        setProductsLoading(false);

        setSalesLoading(true);
        const salesData = await apiClient.getSales({ pageSize: 1000 }); // Get all sales for accurate prediction
        setSales((salesData.data as unknown as Sale[]) || []);
        setSalesLoading(false);

        setUnitsLoading(true);
        const unitsData = await apiClient.getUnits();
        setUnits((unitsData as any).data || unitsData || []);
        setUnitsLoading(false);
      } catch (error) {
        console.error('Error fetching predict shortage data:', error);
        setProductsLoading(false);
        setSalesLoading(false);
        setUnitsLoading(false);
      }
    };

    fetchData();
  }, [currentStore]);

  const productsMap = useMemo(() => new Map(products?.map(p => [p.id, p])), [products]);
  const unitsMap = useMemo(() => new Map(units?.map(u => [u.id, u])), [units]);

  const [allSalesItems, setAllSalesItems] = useState<SalesItem[]>([]);
  const [salesItemsLoading, setSalesItemsLoading] = useState(true);

  const getUnitInfo = useCallback((unitId: string): { baseUnit?: Unit; conversionFactor: number, name: string } => {
    const unit = unitsMap.get(unitId);
    if (!unit) return { conversionFactor: 1, name: '' };

    if (unit.baseUnitId && unit.conversionFactor) {
      const baseUnit = unitsMap.get(unit.baseUnitId);
      return { baseUnit, conversionFactor: unit.conversionFactor, name: unit.name };
    }

    return { baseUnit: unit, conversionFactor: 1, name: unit.name };
  }, [unitsMap]);

  const getStockInBaseUnit = useCallback((product: Product): number => {
    let totalImportedInBaseUnit = 0;
    product.purchaseLots?.forEach(lot => {
      const { conversionFactor } = getUnitInfo(lot.unitId);
      totalImportedInBaseUnit += lot.quantity * conversionFactor;
    });

    const totalSoldInBaseUnit = allSalesItems
      .filter(item => item.productId === product.id)
      .reduce((acc, item) => acc + item.quantity, 0);

    return totalImportedInBaseUnit - totalSoldInBaseUnit;
  }, [allSalesItems, getUnitInfo]);


  useEffect(() => {
    if (!sales || sales.length === 0) {
      if (!salesLoading) setSalesItemsLoading(false);
      return;
    }

    const fetchSalesItems = async () => {
      setSalesItemsLoading(true);
      try {
        // Fetch all sales items from dedicated endpoint
        const response = await apiClient.request('/sales/items/all');
        const items = (response as any).data || response || [];
        
        // Map items to include salesTransactionId
        const mappedItems = items.map((item: any) => ({
          ...item,
          salesTransactionId: item.sales_transaction_id || item.salesTransactionId,
          productId: item.product_id || item.productId,
        }));
        
        setAllSalesItems(mappedItems);
      } catch (error) {
        console.error('Error fetching sales items: ', error);
        setAllSalesItems([]);
      } finally {
        setSalesItemsLoading(false);
      }
    };

    fetchSalesItems();
  }, [sales, salesLoading]);


  const handlePredict = async () => {
    setIsLoading(true)
    setError(null)
    setPrediction(null)

    if (!products || !sales || !allSalesItems) {
      setError('Không thể tải dữ liệu cần thiết để dự báo.');
      setIsLoading(false);
      return;
    }

    const historicalSalesData = allSalesItems.map(item => {
      const sale = sales.find(s => s.id === item.salesTransactionId);
      const product = products.find(p => p.id === item.productId);
      return {
        productId: item.productId,
        productName: product?.name,
        quantity: item.quantity,
        date: sale?.transactionDate,
      }
    });

    const currentInventoryLevels = products.map(p => ({
      productId: p.id,
      productName: p.name,
      quantityInStock: getStockInBaseUnit(p)
    }));

    const result = await getSalesForecast({
      historicalSalesData: JSON.stringify(historicalSalesData),
      currentInventoryLevels: JSON.stringify(currentInventoryLevels),
      forecastPeriodDays: 30,
      marketContext: marketContext,
    })

    if (result.success && result.data) {
      setPrediction({
        ...result.data,
        forecastedProducts: (result.data as any).forecastedProducts?.map((p: any) => ({
          ...p,
          forecastedDemand: p.forecastedDemand ?? p.forecastedSales ?? 0
        })) || [],
        totalForecastedDemand: (result.data as any).totalForecastedDemand ?? 0,
        confidence: (result.data as any).confidence ?? 'medium'
      })
    } else {
      setError(result.error || 'Đã xảy ra lỗi không xác định.')
    }
    setIsLoading(false)
  }

  const handleCreateDraftPurchaseOrder = () => {
    if (!prediction) return;

    const itemsToOrder = prediction.forecastedProducts
      .filter(p => p.suggestedReorderQuantity > 0)
      .map(p => {
        const product = productsMap.get(p.productId);
        const { baseUnit } = getUnitInfo(product?.unitId || '');
        return {
          productId: p.productId,
          productName: p.productName,
          quantity: p.suggestedReorderQuantity,
          cost: 0, // Default cost, user will fill this
          unitId: baseUnit?.id || product?.unitId || '' // Use base unit for ordering
        };
      });

    if (itemsToOrder.length === 0) {
      toast({
        title: "Không có sản phẩm nào cần nhập",
        description: "AI không đề xuất nhập thêm sản phẩm nào vào lúc này.",
      });
      return;
    }

    // Store in localStorage to pass to the new page
    localStorage.setItem('draftPurchaseOrderItems', JSON.stringify(itemsToOrder));

    // Close the dialog and navigate
    setOpen(false);
    router.push('/purchases/new?draft=true');
  };


  const dataIsLoading = productsLoading || salesLoading || unitsLoading || salesItemsLoading;
  const hasReorderSuggestion = prediction?.forecastedProducts.some(p => p.suggestedReorderQuantity > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1">
          <Bot className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Dự báo & Đề xuất
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Dự báo doanh số và Đề xuất nhập hàng</DialogTitle>
          <DialogDescription>
            Sử dụng AI để phân tích dữ liệu bán hàng, dự báo nhu cầu và đưa ra khuyến nghị nhập hàng cho 30 ngày tới.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-4">
            <div className="grid w-full gap-1.5">
              <Label htmlFor="market-context">Thêm bối cảnh thị trường (Tùy chọn)</Label>
              <Textarea
                id="market-context"
                placeholder="Ví dụ: Sắp có đợt khuyến mãi lớn cho sản phẩm X, Tuần tới dự báo mưa nhiều, nhu cầu phân bón lá sẽ tăng..."
                value={marketContext}
                onChange={(e) => setMarketContext(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-sm text-muted-foreground">
                Cung cấp thông tin về khuyến mãi, thời tiết, dịch bệnh... để AI dự báo chính xác hơn.
              </p>
            </div>
            {!prediction && !isLoading && !error && (
              <div className="flex items-center justify-center space-x-2 p-4 h-48 border rounded-md bg-muted/50">
                <p className="text-center text-muted-foreground">Nhấp vào nút "Chạy phân tích" để bắt đầu.</p>
              </div>
            )}

            {isLoading && <div className="flex justify-center items-center p-8 h-48 border rounded-md"><Bot className="h-8 w-8 animate-spin" /> <span className="ml-2">Đang phân tích dữ liệu...</span></div>}

            {error && <div className="text-destructive p-4 bg-destructive/10 rounded-md h-48">{error}</div>}

            {prediction && (
              <div className='space-y-4'>
                <div>
                  <h4 className="font-semibold mb-2">Tóm tắt phân tích</h4>
                  <p className='text-sm text-muted-foreground bg-muted p-3 rounded-md'>{prediction.analysisSummary}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold">Kết quả dự báo & Đề xuất</h4>
            {prediction ? (
              <ScrollArea className="h-[400px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead className="text-right">Tồn kho</TableHead>
                      <TableHead className="text-right">Dự báo bán</TableHead>
                      <TableHead className="text-center">Đề xuất</TableHead>
                      <TableHead className="text-right">SL cần nhập</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prediction.forecastedProducts.map(p => {
                      const product = productsMap.get(p.productId);
                      const mainUnit = product ? unitsMap.get(product.unitId) : undefined;
                      const baseUnit = mainUnit?.baseUnitId ? unitsMap.get(mainUnit.baseUnitId) : mainUnit;
                      return (
                        <TableRow key={p.productId}>
                          <TableCell className="font-medium">{p.productName}</TableCell>
                          <TableCell className="text-right">{p.currentStock.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            {p.forecastedSales || 0}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={p.suggestion === 'Re-order' || p.suggestion === 'Cần nhập' ? 'destructive' : 'default'}>
                              {p.suggestion === 'Re-order' ? 'Cần nhập' : p.suggestion}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {p.suggestedReorderQuantity > 0 ? `${p.suggestedReorderQuantity.toLocaleString()} ${baseUnit?.name || ''}` : '-'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-[400px] border rounded-md bg-muted/50">
                <p className="text-muted-foreground">Kết quả sẽ hiển thị ở đây.</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between pt-4">
          <div>
            {hasReorderSuggestion && (
              <Button type="button" variant="outline" onClick={handleCreateDraftPurchaseOrder}>
                <FilePlus2 className="mr-2 h-4 w-4" />
                Tạo đơn nhập hàng brouillon
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Đóng
            </Button>
            <Button type="button" onClick={handlePredict} disabled={isLoading || dataIsLoading}>
              {isLoading ? 'Đang dự đoán...' : 'Chạy lại phân tích'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
