'use client'

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, AlertTriangle, Package, ShoppingCart, CheckSquare, Square } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useStore } from "@/contexts/store-context"
import { QuickImportDialog } from "../components/quick-import-dialog"
import { BulkImportDialog } from "../components/bulk-import-dialog"

interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  costPrice: number;
  stockQuantity: number;
  currentStock: number;
  unitId: string;
  unitName: string;
  categoryName: string;
  categoryId: string;
}

export default function QuickImportPage() {
  const [products, setProducts] = useState<LowStockProduct[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [threshold, setThreshold] = useState(10);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<LowStockProduct | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [importHistory, setImportHistory] = useState<any[]>([]);
  
  const { currentStore } = useStore();
  const { toast } = useToast();

  const fetchLowStockProducts = useCallback(async () => {
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
      
      const response = await fetch(`/api/products/low-stock?threshold=${threshold}`, {
        headers,
      });
      
      if (response.ok) {
        const result = await response.json();
        setProducts(result.data || []);
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Không thể tải danh sách sản phẩm tồn kho thấp",
        });
      }
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể tải danh sách sản phẩm",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentStore?.id, threshold, toast]);

  const fetchCategories = useCallback(async () => {
    if (!currentStore?.id) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Store-Id': currentStore.id,
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/categories', {
        headers,
      });
      
      if (response.ok) {
        const result = await response.json();
        setCategories(result.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, [currentStore?.id]);

  useEffect(() => {
    fetchLowStockProducts();
    fetchCategories();
    loadImportHistory();
  }, [fetchLowStockProducts, fetchCategories]);

  // Load import history from localStorage
  const loadImportHistory = () => {
    try {
      const history = localStorage.getItem('quick_import_history');
      if (history) {
        setImportHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading import history:', error);
    }
  };

  // Save import to history
  const saveToHistory = (productId: string, productName: string, supplierId: string, supplierName: string, quantity: number, cost: number, unitName: string) => {
    try {
      const history = JSON.parse(localStorage.getItem('quick_import_history') || '[]');
      const newEntry = {
        productId,
        productName,
        supplierId,
        supplierName,
        quantity,
        cost,
        unitName,
        timestamp: new Date().toISOString(),
      };
      
      // Keep only last 50 entries
      const updatedHistory = [newEntry, ...history].slice(0, 50);
      localStorage.setItem('quick_import_history', JSON.stringify(updatedHistory));
      setImportHistory(updatedHistory);
    } catch (error) {
      console.error('Error saving import history:', error);
    }
  };

  // Get last import for a product
  const getLastImport = (productId: string) => {
    return importHistory.find(h => h.productId === productId);
  };

  const handleQuickImport = (product: LowStockProduct) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleImportSuccess = (productId: string, productName: string, supplierId: string, supplierName: string, quantity: number, cost: number, unitName: string) => {
    saveToHistory(productId, productName, supplierId, supplierName, quantity, cost, unitName);
    toast({
      title: "Thành công!",
      description: "Đã nhập hàng thành công",
    });
    fetchLowStockProducts();
    loadImportHistory();
  };

  // Toggle product selection
  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  // Select all products
  const selectAllProducts = () => {
    const validProducts = filteredProducts.filter(p => p.unitId);
    setSelectedProducts(new Set(validProducts.map(p => p.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedProducts(new Set());
  };

  const getStockBadgeVariant = (stock: number) => {
    if (stock === 0) return "destructive";
    if (stock <= 5) return "destructive";
    if (stock <= 10) return "default";
    return "secondary";
  };

  // Filter products by category
  const filteredProducts = selectedCategory === "all" 
    ? products 
    : products.filter(p => p.categoryId === selectedCategory);

  // Group products by category for display
  const productsByCategory = filteredProducts.reduce((acc, product) => {
    const categoryName = product.categoryName || 'Chưa phân loại';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(product);
    return acc;
  }, {} as Record<string, LowStockProduct[]>);

  return (
    <>
      {selectedProduct && (
        <QuickImportDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          product={selectedProduct}
          onSuccess={handleImportSuccess}
        />
      )}

      {showBulkImportDialog && (
        <BulkImportDialog
          open={showBulkImportDialog}
          onOpenChange={setShowBulkImportDialog}
          products={Array.from(selectedProducts).map(id => products.find(p => p.id === id)!).filter(Boolean)}
          onSuccess={(count) => {
            fetchLowStockProducts();
            clearSelection();
          }}
        />
      )}

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Link href="/purchases">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Nhập Nhanh - Sản Phẩm Tồn Kho Thấp</h1>
            <p className="text-sm text-muted-foreground">
              Nhập hàng nhanh cho các sản phẩm có tồn kho dưới ngưỡng
            </p>
          </div>
        </div>

        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <strong>Lưu ý:</strong> Danh sách này hiển thị các sản phẩm có tồn kho ≤ {threshold} đơn vị. 
            Sản phẩm chưa có đơn vị tính sẽ không thể nhập hàng (cần cấu hình đơn vị trước).
          </AlertDescription>
        </Alert>

        {products.some(p => !p.unitId) && (
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-900">
              <strong>Cảnh báo:</strong> Có {products.filter(p => !p.unitId).length} sản phẩm chưa có đơn vị tính. 
              Vui lòng vào trang Sản phẩm để cấu hình đơn vị cho các sản phẩm này.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Sản phẩm cần nhập hàng
                </CardTitle>
                <CardDescription>
                  {filteredProducts.length} sản phẩm có tồn kho thấp
                  {selectedCategory !== "all" && ` trong danh mục đã chọn`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Ngưỡng:</span>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value) || 10)}
                  className="w-20"
                />
                <Button onClick={fetchLowStockProducts} size="sm">
                  Làm mới
                </Button>
                {selectedProducts.size > 0 && (
                  <>
                    <Badge variant="secondary" className="ml-2">
                      {selectedProducts.size} đã chọn
                    </Badge>
                    <Button 
                      onClick={clearSelection} 
                      variant="outline" 
                      size="sm"
                    >
                      Bỏ chọn
                    </Button>
                    <Button 
                      onClick={() => setShowBulkImportDialog(true)} 
                      size="sm"
                      className="gap-1"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Nhập tất cả ({selectedProducts.size})
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            {/* Category Filter */}
            <div className="flex items-center gap-2 pt-4">
              <span className="text-sm font-medium">Danh mục:</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory("all")}
                >
                  Tất cả ({products.length})
                </Button>
                {categories.map((category) => {
                  const count = products.filter(p => p.categoryId === category.id).length;
                  if (count === 0) return null;
                  return (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      {category.name} ({count})
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {Object.keys(productsByCategory).length > 0 ? (
              Object.entries(productsByCategory).map(([categoryName, categoryProducts]) => (
                <div key={categoryName} className="border-b last:border-b-0">
                  <div className="bg-muted/50 px-6 py-3 font-medium text-sm sticky top-0">
                    {categoryName} ({categoryProducts.length})
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={categoryProducts.every(p => p.unitId && selectedProducts.has(p.id))}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                const newSelection = new Set(selectedProducts);
                                categoryProducts.filter(p => p.unitId).forEach(p => newSelection.add(p.id));
                                setSelectedProducts(newSelection);
                              } else {
                                const newSelection = new Set(selectedProducts);
                                categoryProducts.forEach(p => newSelection.delete(p.id));
                                setSelectedProducts(newSelection);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead className="w-16">STT</TableHead>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead>Mã SKU</TableHead>
                        <TableHead>Đơn vị</TableHead>
                        <TableHead className="text-right">Tồn kho</TableHead>
                        <TableHead className="text-right">Giá nhập</TableHead>
                        <TableHead className="text-right">Giá bán</TableHead>
                        <TableHead className="text-center">Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryProducts.map((product, index) => {
                        const lastImport = getLastImport(product.id);
                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              {product.unitId && (
                                <Checkbox
                                  checked={selectedProducts.has(product.id)}
                                  onCheckedChange={() => toggleProductSelection(product.id)}
                                />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>
                              <div className="font-medium">{product.name}</div>
                              {lastImport && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Lần trước: {lastImport.quantity} {lastImport.unitName} × {formatCurrency(lastImport.cost)}
                                  <br />
                                  NCC: {lastImport.supplierName}
                                </div>
                              )}
                            </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">
                              {product.sku || 'N/A'}
                            </code>
                          </TableCell>
                          <TableCell>
                            {product.unitName ? (
                              <span className="text-sm">{product.unitName}</span>
                            ) : (
                              <span className="text-xs text-destructive">Chưa có</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={getStockBadgeVariant(product.currentStock)}>
                              {product.currentStock}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(product.costPrice)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(product.price)}
                          </TableCell>
                          <TableCell className="text-center">
                            {!product.unitId ? (
                              <div className="flex flex-col items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled
                                  className="gap-1"
                                >
                                  <ShoppingCart className="h-3.5 w-3.5" />
                                  Nhập hàng
                                </Button>
                                <span className="text-xs text-destructive">
                                  Chưa có đơn vị
                                </span>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleQuickImport(product)}
                                className="gap-1"
                              >
                                <ShoppingCart className="h-3.5 w-3.5" />
                                Nhập hàng
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    </TableBody>
                  </Table>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {isLoading ? "Đang tải..." : "Không có sản phẩm nào"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
