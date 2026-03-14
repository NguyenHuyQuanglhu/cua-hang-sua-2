

export type Permission = 'view' | 'add' | 'edit' | 'delete';

export type Module = 
  | 'dashboard'
  | 'categories'
  | 'units'
  | 'products'
  | 'purchases'
  | 'suppliers'
  | 'sales'
  | 'customers'
  | 'cash-flow'
  | 'reports_shifts'
  | 'reports_income_statement'
  | 'reports_profit'
  | 'reports_debt'
  | 'reports_supplier_debt'
  | 'reports_transactions'
  | 'reports_supplier_debt_tracking'
  | 'reports_revenue'
  | 'reports_sold_products'
  | 'reports_inventory'
  | 'reports_ai_segmentation'
  | 'reports_ai_basket_analysis'
  | 'users'
  | 'settings'
  | 'pos'
  | 'ai_forecast';

export type Permissions = {
  [key in Module]?: Permission[];
};


export type Category = {
  id: string
  name: string
  description?: string
}

export type Unit = {
  id: string
  name: string
  description?: string
  baseUnitId?: string;
  conversionFactor?: number;
}

export type PurchaseLot = {
  importDate: string; // ISO 8601 date string
  quantity: number;
  cost: number;
  unitId: string;
}

export type Product = {
  id: string
  name: string
  barcode?: string;
  description?: string;
  categoryId: string
  unitId: string;
  sellingPrice?: number;
  purchaseLots: PurchaseLot[]
  status: 'active' | 'draft' | 'archived'
  lowStockThreshold?: number;
}

export type Supplier = {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type Customer = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  customerType: 'personal' | 'business';
  customerGroup?: string;
  gender?: 'male' | 'female' | 'other';
  birthday?: string; // ISO 8601 date string
  zalo?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  creditLimit: number;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
  status: 'active' | 'inactive';
  loyaltyPoints?: number; // Spendable points
  lifetimePoints?: number; // Total earned points for tier calculation
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'diamond';
}

export type SalesItem = {
  id: string;
  salesTransactionId: string;
  productId: string
  quantity: number
  price: number
}

export type Sale = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  shiftId?: string; // Add shiftId to Sale
  transactionDate: string; // ISO 8601 date string
  status: 'pending' | 'unprinted' | 'printed';
  totalAmount: number; // Gross total before discount and VAT
  vatAmount?: number; // VAT amount
  finalAmount: number; // Net total after discount and VAT
  discount?: number;
  discountType?: 'percentage' | 'amount';
  discountValue?: number;
  tierDiscountPercentage?: number; // New field
  tierDiscountAmount?: number; // New field
  pointsUsed?: number;
  pointsDiscount?: number;
  customerPayment?: number;
  previousDebt?: number;
  remainingDebt?: number;
  paymentMethod?: 'cash' | 'qr' | 'card' | 'transfer'; // Payment method
}

export type Payment = {
  id: string
  customerId: string
  paymentDate: string
  amount: number
  notes?: string
}

export type SupplierPayment = {
  id: string;
  supplierId: string;
  paymentDate: string; // ISO 8601 date string
  amount: number;
  notes?: string;
  createdAt: any;
}


// Role hierarchy for Multi-tenant RBAC
// owner > company_manager > store_manager > salesperson
export type UserRole = 'owner' | 'company_manager' | 'store_manager' | 'salesperson';

// Role hierarchy levels (higher number = more permissions)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 4,
  company_manager: 3,
  store_manager: 2,
  salesperson: 1,
};

// Get roles that a user can manage (roles below their own)
export function getManageableRoles(userRole: UserRole): UserRole[] {
  const userLevel = ROLE_HIERARCHY[userRole];
  // Owner can manage all roles including other owners
  if (userRole === 'owner') {
    return ['owner', 'company_manager', 'store_manager', 'salesperson'];
  }
  // Company Manager can manage same level and below
  if (userRole === 'company_manager') {
    return ['company_manager', 'store_manager', 'salesperson'];
  }
  return (Object.keys(ROLE_HIERARCHY) as UserRole[]).filter(
    role => ROLE_HIERARCHY[role] < userLevel
  );
}

// Check if current user can manage target role
// - Owner can manage all roles including other owners
// - Company Manager can manage other company managers and below
// - Store Manager can only manage salesperson
export function canManageRole(currentUserRole: UserRole, targetRole: UserRole): boolean {
  // Owner can manage everyone
  if (currentUserRole === 'owner') {
    return true;
  }
  // Company Manager can manage same level (other company managers) and below
  if (currentUserRole === 'company_manager') {
    return ROLE_HIERARCHY[currentUserRole] >= ROLE_HIERARCHY[targetRole];
  }
  // Other roles can only manage roles below them
  return ROLE_HIERARCHY[currentUserRole] > ROLE_HIERARCHY[targetRole];
}

// Get Vietnamese name for role
export function getRoleVietnamese(role: UserRole | string): string {
  switch (role) {
    case 'owner': return 'Chủ sở hữu';
    case 'company_manager': return 'Quản lý công ty';
    case 'store_manager': return 'Quản lý cửa hàng';
    case 'salesperson': return 'Nhân viên bán hàng';
    // Legacy roles for backward compatibility
    case 'admin': return 'Quản trị viên';
    case 'accountant': return 'Kế toán';
    case 'inventory_manager': return 'Quản lý kho';
    case 'custom': return 'Tùy chỉnh';
    default: return role;
  }
}

export type AppUser = {
  id?: string;
  email: string;
  displayName?: string;
  role: UserRole;
  permissions?: Permissions;
}

export type LoyaltyTierConfig = {
  name: 'bronze' | 'silver' | 'gold' | 'diamond';
  vietnameseName: string;
  threshold: number;
  discountPercentage: number; // New field for tier-based discount
};

export type LoyaltySettings = {
  enabled: boolean;
  pointsPerAmount: number; // How much money to spend to get 1 point
  pointsToVndRate: number; // How much 1 point is worth in VND
  tiers: LoyaltyTierConfig[];
}

export type SoftwarePackage = 'basic' | 'standard' | 'advanced';

export type ThemeSettings = {
  primary: string;
  primaryForeground: string;
  background: string;
  foreground: string;
  accent: string;
  accentForeground: string;
  lowStockThreshold: number;
  vatRate?: number;
  invoiceFormat?: 'A4' | 'A5' | '80mm' | '58mm' | 'none';
  companyName?: string;
  companyBusinessLine?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyLogo?: string;
  loyalty?: LoyaltySettings;
  softwarePackage?: SoftwarePackage;
}

export type PurchaseOrderItem = {
  id: string;
  purchaseOrderId: string;
  productId: string;
  productName?: string;
  quantity: number;
  cost: number;
  unitId: string;
}

export type PurchaseOrder = {
  id: string;
  orderNumber: string;
  supplierId?: string;
  importDate: string; // ISO date string
  items: PurchaseOrderItem[];
  totalAmount: number;
  paidAmount?: number;
  remainingDebt?: number;
  notes?: string;
  createdAt: any; // server timestamp
}

// Alias for backward compatibility
export type Purchase = PurchaseOrder & {
  purchaseDate: string; // Alias for importDate
  invoiceNumber: string; // Alias for orderNumber
  supplierName?: string;
};

export type CashTransaction = {
    id: string;
    type: 'thu' | 'chi';
    transactionDate: string; // ISO date string
    amount: number;
    reason: string;
    category?: string;
    relatedInvoiceId?: string; // e.g., sale.id or purchase_order.id
    createdBy?: string; // user.uid
    createdAt: any; // server timestamp
}

export type Shift = {
  id: string;
  userId: string;
  userName: string;
  status: 'active' | 'closed';
  startTime: string; // ISO date string
  endTime?: string; // ISO date string
  startingCash: number;
  endingCash?: number;
  cashSales?: number; // Total cash from sales
  cashPayments?: number; // Total cash from debt payments
  totalCashInDrawer?: number; // Theoretical cash
  cashDifference?: number; // Difference between theoretical and actual
  totalRevenue: number;
  salesCount: number;
  hourlyRate?: number; // Lương theo giờ
  maxShiftHours?: number; // Giới hạn giờ làm việc
  hoursWorked?: number; // Số giờ đã làm
  isOvertime?: boolean; // Đã vượt giờ quy định
}


// ==================== Online Store Types ====================

export type OnlineStoreConfig = {
  id: string;
  storeId: string;
  slug: string;
  customDomain?: string;
  isActive: boolean;
  
  // Branding
  storeName: string;
  logo?: string;
  favicon?: string;
  description?: string;
  
  // Theme
  themeId: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  
  // Contact
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  
  // Social
  facebookUrl?: string;
  instagramUrl?: string;
  
  // Settings
  currency: string;
  timezone: string;
  
  createdAt: string;
  updatedAt: string;
}

export type OnlineCategory = {
  id: string;
  onlineStoreId: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OnlineProduct = {
  id: string;
  onlineStoreId: string;
  productId: string;
  categoryId?: string;
  
  isPublished: boolean;
  onlinePrice?: number;
  onlineDescription?: string;
  displayOrder: number;
  
  // SEO
  seoTitle?: string;
  seoDescription?: string;
  seoSlug: string;
  
  // Images (JSON array)
  images: string[];
  
  createdAt: string;
  updatedAt: string;
}

export type OnlineCustomer = {
  id: string;
  onlineStoreId: string;
  
  email: string;
  passwordHash?: string; // Not exposed in API responses
  
  firstName: string;
  lastName: string;
  phone?: string;
  
  defaultAddressId?: string;
  
  isActive: boolean;
  isVerified: boolean;
  
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export type CustomerAddress = {
  id: string;
  customerId: string;
  label: string;
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ShoppingCart = {
  id: string;
  onlineStoreId: string;
  sessionId?: string;
  customerId?: string;
  
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  total: number;
  
  couponCode?: string;
  
  items?: CartItem[];
  
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export type CartItem = {
  id: string;
  cartId: string;
  onlineProductId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type PaymentMethod = 'cod' | 'bank_transfer';

export type ShippingAddress = {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
  note?: string;
}

export type OnlineOrder = {
  id: string;
  orderNumber: string;
  onlineStoreId: string;
  
  // Customer info
  customerId?: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  
  // Shipping
  shippingAddress: ShippingAddress;
  shippingMethod?: string;
  shippingFee: number;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  
  // Order details
  items?: OnlineOrderItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  
  // Status
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  
  // Notes
  customerNote?: string;
  internalNote?: string;
  
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
}

export type OnlineOrderItem = {
  id: string;
  orderId: string;
  onlineProductId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
}

export type ShippingZone = {
  id: string;
  onlineStoreId: string;
  name: string;
  provinces: string[];
  
  flatRate?: number;
  freeShippingThreshold?: number;
  
  isActive: boolean;
  
  createdAt: string;
  updatedAt: string;
}
