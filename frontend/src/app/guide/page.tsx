
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  BarChart3,
  Boxes,
  Briefcase,
  ClipboardList,
  Cog,
  Database,
  FileBarChart,
  Home,
  Layers,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Wallet,
} from "lucide-react"

export default function GuidePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">Hướng dẫn sử dụng Hệ thống</h1>
      <p className="text-muted-foreground mb-8">
        Tài liệu này được cập nhật theo đúng cấu trúc dự án hiện tại, bao gồm các
        module đang có trong hệ thống và luồng vận hành thực tế tại cửa hàng.
      </p>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Luồng thiết lập ban đầu</CardTitle>
            <CardDescription>
              Thứ tự khuyến nghị để triển khai cửa hàng mới đúng chuẩn dữ liệu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="setup-1">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    <span>Bước 1: Danh mục và Đơn vị tính</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                  <ul>
                    <li>Tạo Danh mục sản phẩm trước để phân loại hàng hóa.</li>
                    <li>
                      Tạo Đơn vị cơ sở (cái, chai, hộp...) và đơn vị quy đổi (thùng,
                      lốc...) nếu cần.
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="setup-2">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    <span>Bước 2: Nhà cung cấp và sản phẩm</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                  <ul>
                    <li>Tạo Nhà cung cấp để phục vụ nhập hàng và công nợ NCC.</li>
                    <li>
                      Khai báo Sản phẩm đầy đủ mã, giá bán, đơn vị, tồn kho ban đầu
                      (nếu có).
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="setup-3">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span>Bước 3: Khách hàng và người dùng</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                  <ul>
                    <li>Tạo danh sách khách hàng cơ bản và nhóm khách hàng.</li>
                    <li>
                      Tạo tài khoản nhân sự, gán vai trò và quyền theo bộ phận.
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Nghiệp vụ vận hành hằng ngày</CardTitle>
            <CardDescription>
              Các module chính đang hoạt động trong menu của hệ thống.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="ops-1">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-primary" />
                    <span>Bảng điều khiển</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                  <p>
                    Tổng quan doanh thu, công nợ, tồn kho và các chỉ số quan trọng
                    theo thời gian.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ops-2">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    <span>POS bán tại quầy và Bán hàng</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                  <ul>
                    <li>POS: tạo đơn nhanh, quét mã, chọn khách, thanh toán.</li>
                    <li>
                      Bán hàng: quản lý danh sách hóa đơn, xem lại chi tiết từng đơn.
                    </li>
                    <li>
                      Khi bán xong hệ thống tự động cập nhật tồn kho và công nợ liên quan.
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ops-3">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    <span>Nhập hàng và quản lý kho</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                  <ul>
                    <li>Tạo phiếu nhập, ghi nhận số lượng và giá nhập.</li>
                    <li>Đồng bộ tồn kho theo từng giao dịch nhập/xuất.</li>
                    <li>Theo dõi công nợ nhà cung cấp.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ops-4">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    <span>Sổ quỹ và dòng tiền</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                  <p>
                    Ghi nhận phiếu thu/chi ngoài hóa đơn bán hàng để quản trị dòng tiền
                    chính xác theo ngày.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Danh mục module theo cấu trúc menu</CardTitle>
            <CardDescription>
              Danh sách tính năng đúng với hệ thống hiện tại.
            </CardDescription>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none text-muted-foreground">
            <ul>
              <li>
                <strong>Danh mục:</strong> Danh mục sản phẩm, Đơn vị tính, Khách hàng,
                Nhà cung cấp.
              </li>
              <li>
                <strong>Sản phẩm:</strong> quản lý SKU, giá, tồn kho, trạng thái sản phẩm.
              </li>
              <li>
                <strong>Nhập hàng:</strong> phiếu nhập, lịch sử nhập, nhà cung cấp.
              </li>
              <li>
                <strong>Bán hàng:</strong> hóa đơn, chi tiết đơn, lịch sử bán.
              </li>
              <li>
                <strong>Sổ quỹ:</strong> phiếu thu/chi, theo dõi phát sinh dòng tiền.
              </li>
              <li>
                <strong>Báo cáo & Quản lý:</strong> doanh thu, lợi nhuận, tồn kho,
                công nợ KH/NCC, lịch sử giao dịch, báo cáo ca.
              </li>
              <li>
                <strong>Hệ thống:</strong> người dùng, phân quyền, cài đặt, thông tin cửa hàng.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Báo cáo và phân tích</CardTitle>
            <CardDescription>
              Nhóm báo cáo đang có trong dự án để phục vụ vận hành và ra quyết định.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div className="rounded-md border p-4">
                <div className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <FileBarChart className="h-4 w-4 text-primary" />
                  Báo cáo tài chính - vận hành
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Doanh thu theo thời gian</li>
                  <li>Lợi nhuận</li>
                  <li>Thu - chi / dòng tiền</li>
                  <li>Báo cáo ca làm việc</li>
                </ul>
              </div>
              <div className="rounded-md border p-4">
                <div className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Báo cáo kho và công nợ
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Tồn kho chi tiết</li>
                  <li>Công nợ khách hàng</li>
                  <li>Công nợ nhà cung cấp</li>
                  <li>Lịch sử giao dịch công nợ</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Quản trị hệ thống và mở rộng</CardTitle>
            <CardDescription>
              Chức năng quản trị cho mô hình nhiều cửa hàng và bán hàng online.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="admin-1">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Cog className="h-5 w-5 text-primary" />
                    <span>Người dùng, phân quyền, cài đặt</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                  <ul>
                    <li>Tạo/sửa tài khoản người dùng theo vai trò.</li>
                    <li>Cấp quyền theo module và thao tác (xem/thêm/sửa/xóa).</li>
                    <li>Tùy chỉnh thông tin doanh nghiệp, VAT, cấu hình vận hành.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="admin-2">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" />
                    <span>Online Stores và storefront</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                  <p>
                    Dự án có sẵn module bán hàng online gồm cấu hình cửa hàng,
                    sản phẩm online, đơn online và trang storefront cho khách mua.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="admin-3">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    <span>Vận hành kỹ thuật</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                  <ul>
                    <li>Backend chạy tại cổng 3001, frontend chạy tại cổng 3000.</li>
                    <li>
                      Migration và script bảo trì nằm trong thư mục
                      <code> backend/scripts </code>.
                    </li>
                    <li>
                      Cần backup dữ liệu định kỳ trước khi chạy các script cập nhật lớn.
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Khuyến nghị sử dụng theo vai trò</CardTitle>
            <CardDescription>
              Áp dụng để vận hành đúng quyền và giảm sai sót dữ liệu.
            </CardDescription>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none text-muted-foreground">
            <ul>
              <li>
                <strong>Nhân viên bán hàng:</strong> tập trung POS, không cấp quyền cấu hình hệ thống.
              </li>
              <li>
                <strong>Quản lý kho:</strong> quản lý nhập hàng, tồn kho, công nợ NCC.
              </li>
              <li>
                <strong>Kế toán:</strong> theo dõi sổ quỹ, công nợ, báo cáo tài chính.
              </li>
              <li>
                <strong>Chủ cửa hàng/Quản trị:</strong> quản trị user, cài đặt, tổng hợp báo cáo.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ghi chú cập nhật tài liệu</CardTitle>
            <CardDescription>
              Tài liệu hướng dẫn này nên được cập nhật cùng lúc khi thêm hoặc đổi module.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground flex items-start gap-2">
            <Boxes className="h-4 w-4 mt-0.5 text-primary" />
            <p>
              Khi có route hoặc menu mới, cập nhật trang này để luôn phản ánh đúng cấu trúc thực tế của dự án.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-xs text-muted-foreground flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Phiên bản tài liệu: đồng bộ theo kiến trúc hiện tại của workspace.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
