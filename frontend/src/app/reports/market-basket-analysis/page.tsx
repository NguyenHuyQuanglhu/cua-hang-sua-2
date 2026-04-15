
'use client'

import { useState } from "react"
import { Bot, Sparkles, PackagePlus } from "lucide-react"

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useStore } from "@/contexts/store-context"
import { getMarketBasketAnalysis } from "@/app/actions"

type ProductPair = {
  productA_name: string;
  productB_name: string;
  frequency: number;
  support: number;
  confidence: number;
  lift: number;
  suggestion: string;
};

type ProductCluster = {
  products: string[];
  frequency: number;
  suggestion: string;
};

type AnalysisResult = {
  productPairs: ProductPair[];
  productClusters: ProductCluster[];
  analysisSummary: string;
};

export default function MarketBasketAnalysisPage() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currentStore } = useStore();

  const handleAnalyze = async () => {
    if (!currentStore) {
      setError("Vui lòng chọn cửa hàng trước khi phân tích.");
      return;
    }
    setIsAnalyzing(true);
    setError(null);

    const result = await getMarketBasketAnalysis();

    if (result.success && result.data) {
      setAnalysisResult(result.data as AnalysisResult);
    } else {
      setError(result.error || "Đã xảy ra lỗi không xác định khi phân tích.");
    }
    setIsAnalyzing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Phân tích Rổ hàng hóa</CardTitle>
                <CardDescription>
                Khám phá sản phẩm nào thường được mua cùng nhau và nhận gợi ý marketing.
                </CardDescription>
            </div>
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? (
                    <>
                        <Bot className="mr-2 h-4 w-4 animate-spin" />
                        Đang phân tích...
                    </>
                ) : (
                    <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Chạy phân tích
                    </>
                )}
            </Button>
        </div>
        
        {/* Phần giải thích các chỉ số */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-3">📊 Giải thích các chỉ số:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-blue-800 mb-1">🎯 Độ tin cậy (Confidence)</h5>
              <p className="text-blue-700">
                <strong>Ví dụ: 68%</strong> có nghĩa là trong 100 khách mua sản phẩm A, 
                có 68 khách cũng mua sản phẩm B. Càng cao càng tốt (tối đa 100%).
              </p>
            </div>
            <div>
              <h5 className="font-medium text-blue-800 mb-1">📈 Lift</h5>
              <p className="text-blue-700">
                <strong>Ví dụ: 1.19</strong> có nghĩa là mua sản phẩm A làm tăng khả năng mua sản phẩm B lên 19%. 
                Lift {'>'}1 = có liên quan, Lift = 1 = không liên quan.
              </p>
            </div>
            <div>
              <h5 className="font-medium text-blue-800 mb-1">🔢 Tần suất</h5>
              <p className="text-blue-700">
                Số lần 2 sản phẩm được mua cùng nhau trong các đơn hàng. 
                Số càng lớn thì mối liên hệ càng mạnh.
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isAnalyzing && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
                <Bot className="h-12 w-12 animate-pulse" />
                <p>Đang phân tích dữ liệu bán hàng...</p>
            </div>
        )}
        {error && <div className="text-destructive text-center p-4">{error}</div>}
        {!isAnalyzing && !analysisResult && !error && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center text-muted-foreground">
                <PackagePlus className="h-12 w-12" />
                <p>Bạn muốn biết khách hàng thường mua những gì cùng nhau? <br/> Nhấn nút "Chạy phân tích" để khám phá.</p>
            </div>
        )}
        {analysisResult && (
            <div className="space-y-6">
                 <div className="p-4 mb-6 border bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-2">Tóm tắt phân tích</h4>
                    <p className="text-sm text-muted-foreground">{analysisResult.analysisSummary}</p>
                </div>
                <Tabs defaultValue="pairs">
                    <TabsList>
                        <TabsTrigger value="pairs">Cặp sản phẩm ({analysisResult.productPairs.length})</TabsTrigger>
                        <TabsTrigger value="clusters">Cụm sản phẩm ({analysisResult.productClusters.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pairs" className="mt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cặp sản phẩm</TableHead>
                                    <TableHead className="text-center">
                                      Tần suất
                                      <div className="text-xs text-muted-foreground font-normal">Số lần mua cùng</div>
                                    </TableHead>
                                    <TableHead className="text-center">
                                      Độ tin cậy
                                      <div className="text-xs text-muted-foreground font-normal">% khách mua A cũng mua B</div>
                                    </TableHead>
                                    <TableHead className="text-center">
                                      Lift
                                      <div className="text-xs text-muted-foreground font-normal">Mức độ liên quan ({'>'}1 = có liên quan)</div>
                                    </TableHead>
                                    <TableHead>Gợi ý Marketing</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analysisResult.productPairs.map((pair, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">
                                          <div>{pair.productA_name}</div>
                                          <div className="text-muted-foreground">&</div>
                                          <div>{pair.productB_name}</div>
                                        </TableCell>
                                        <TableCell className="text-center"><Badge variant="secondary">{pair.frequency}</Badge></TableCell>
                                        <TableCell className="text-center">
                                          <Badge 
                                            variant={pair.confidence > 0.7 ? "default" : pair.confidence > 0.5 ? "secondary" : "outline"}
                                            className={pair.confidence > 0.7 ? "bg-green-500" : pair.confidence > 0.5 ? "bg-yellow-500" : ""}
                                          >
                                            {Math.round(pair.confidence * 100)}%
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Badge 
                                            variant={pair.lift > 2 ? "default" : pair.lift > 1.5 ? "secondary" : "outline"}
                                            className={pair.lift > 2 ? "bg-green-500" : pair.lift > 1.5 ? "bg-yellow-500" : ""}
                                          >
                                            {pair.lift.toFixed(2)}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-xs">{pair.suggestion}</TableCell>
                                    </TableRow>
                                ))}
                                {analysisResult.productPairs.length === 0 && (
                                  <TableRow>
                                      <TableCell colSpan={5} className="text-center h-24">Không tìm thấy cặp sản phẩm nào nổi bật.</TableCell>
                                  </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TabsContent>
                    <TabsContent value="clusters" className="mt-4">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cụm sản phẩm</TableHead>
                                    <TableHead className="text-center">Tần suất</TableHead>
                                    <TableHead>Gợi ý Marketing</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analysisResult.productClusters.map((cluster, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">
                                          <ul className="list-disc list-inside">
                                            {cluster.products.map(p => <li key={p}>{p}</li>)}
                                          </ul>
                                        </TableCell>
                                        <TableCell className="text-center"><Badge variant="secondary">{cluster.frequency}</Badge></TableCell>
                                        <TableCell className="max-w-xs">{cluster.suggestion}</TableCell>
                                    </TableRow>
                                ))}
                                 {analysisResult.productClusters.length === 0 && (
                                  <TableRow>
                                      <TableCell colSpan={3} className="text-center h-24">Không tìm thấy cụm sản phẩm nào nổi bật.</TableCell>
                                  </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TabsContent>
                </Tabs>
                
                {/* Phần giải thích chi tiết */}
                <div className="mt-8 p-6 bg-gray-50 border rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4">📚 Hướng dẫn đọc kết quả chi tiết:</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">🎯 Độ tin cậy (Confidence) - Tỷ lệ mua kèm:</h5>
                      <ul className="text-sm text-gray-700 space-y-1 ml-4">
                        <li>• <strong>68%</strong> = Trong 100 khách mua "Bơ Anchor", có 68 khách cũng mua "Phô mai Anchor"</li>
                        <li>• <span className="inline-block w-4 h-4 bg-green-500 rounded mr-2"></span><strong>Xanh lá ({'>'}70%)</strong>: Rất tốt - Nên tạo combo khuyến mãi</li>
                        <li>• <span className="inline-block w-4 h-4 bg-yellow-500 rounded mr-2"></span><strong>Vàng (50-70%)</strong>: Khá tốt - Có thể đặt gần nhau</li>
                        <li>• <span className="inline-block w-4 h-4 bg-gray-400 rounded mr-2"></span><strong>Xám ({'<'}50%)</strong>: Yếu - Cần xem xét thêm</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">📈 Lift - Mức độ ảnh hưởng:</h5>
                      <ul className="text-sm text-gray-700 space-y-1 ml-4">
                        <li>• <strong>1.19</strong> = Mua "Bơ Anchor" làm tăng khả năng mua "Phô mai Anchor" lên 19%</li>
                        <li>• <span className="inline-block w-4 h-4 bg-green-500 rounded mr-2"></span><strong>Xanh lá ({'>'}2.0)</strong>: Liên quan rất mạnh</li>
                        <li>• <span className="inline-block w-4 h-4 bg-yellow-500 rounded mr-2"></span><strong>Vàng (1.5-2.0)</strong>: Liên quan khá mạnh</li>
                        <li>• <span className="inline-block w-4 h-4 bg-gray-400 rounded mr-2"></span><strong>Xám (1.0-1.5)</strong>: Liên quan yếu</li>
                        <li>• <strong>= 1.0</strong>: Không liên quan gì</li>
                        <li>• <strong>{'<'} 1.0</strong>: Ảnh hưởng tiêu cực (hiếm gặp)</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">💡 Cách áp dụng vào kinh doanh:</h5>
                      <ul className="text-sm text-gray-700 space-y-1 ml-4">
                        <li>• <strong>Bố trí cửa hàng:</strong> Đặt các sản phẩm có Lift cao gần nhau</li>
                        <li>• <strong>Khuyến mãi combo:</strong> Tạo gói ưu đãi cho các cặp có Confidence cao</li>
                        <li>• <strong>Gợi ý bán hàng:</strong> Khi khách mua A, nhân viên gợi ý mua B</li>
                        <li>• <strong>Quản lý tồn kho:</strong> Nhập hàng đồng bộ cho các sản phẩm liên quan</li>
                      </ul>
                    </div>
                  </div>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  )
}
