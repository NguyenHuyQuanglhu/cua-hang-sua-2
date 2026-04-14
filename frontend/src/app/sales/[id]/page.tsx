import { notFound } from "next/navigation"
import { cookies } from "next/headers"
import type { Customer, Product, Unit, ThemeSettings } from "@/lib/types"
import { SaleInvoice } from "./components/sale-invoice";
import { ThermalReceipt } from "./components/thermal-receipt";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function getAuthHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value || cookieStore.get('auth-token')?.value;
  const storeId = cookieStore.get('store_id')?.value || cookieStore.get('store-id')?.value;
  
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(storeId && { 'X-Store-Id': storeId }),
  };
}

async function getSaleData(saleId: string) {
  try {
    const headers = await getAuthHeaders();
    const cookieStore = await cookies();
    const storeId = cookieStore.get('store_id')?.value || cookieStore.get('store-id')?.value;

    // Fetch sale with details
    const saleResponse = await fetch(`${API_BASE_URL}/sales/${saleId}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!saleResponse.ok) {
      return { sale: null, items: [], customer: null, productsMap: new Map(), unitsMap: new Map(), settings: null, storeName: undefined };
    }

    const saleData = await saleResponse.json();
    const sale = saleData.sale;
    const items = sale?.items || [];

    // Fetch customer if exists
    let customer: Customer | null = null;
    if (sale?.customerId) {
      const customerResponse = await fetch(`${API_BASE_URL}/customers/${sale.customerId}`, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });
      if (customerResponse.ok) {
        const customerData = await customerResponse.json();
        customer = (customerData.customer || customerData) as Customer;
      }
    }

    // Fetch products for items
    const productsMap = new Map<string, Product>();
    const productIds = [...new Set(items.map((item: any) => item.productId))];
    
    for (const productId of productIds) {
      const productResponse = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });
      if (productResponse.ok) {
        const productData = await productResponse.json();
        productsMap.set(productId as string, (productData.product || productData) as Product);
      }
    }

    // Fetch units
    const unitsMap = new Map<string, Unit>();
    const unitsResponse = await fetch(`${API_BASE_URL}/units`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
    if (unitsResponse.ok) {
      const unitsData = await unitsResponse.json();
      const unitsArray = Array.isArray(unitsData) ? unitsData : (unitsData.data || unitsData.units || []);
      unitsArray.forEach((unit: Unit) => {
        unitsMap.set(unit.id, unit);
      });
    }

    // Fetch settings
    let settings: ThemeSettings | null = null;
    const settingsResponse = await fetch(`${API_BASE_URL}/settings`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
    if (settingsResponse.ok) {
      const settingsData = await settingsResponse.json();
      settings = settingsData.settings;
    }

    // Fetch store information
    let storeName: string | undefined = undefined;
    if (storeId) {
      const storeResponse = await fetch(`${API_BASE_URL}/stores/${storeId}`, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });
      if (storeResponse.ok) {
        const storeData = await storeResponse.json();
        storeName = storeData.name;
      }
    }

    // Map items to expected format
    const mappedItems = items.map((item: any) => ({
      id: item.id,
      salesTransactionId: item.salesId,
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
    }));

    // Map sale to expected format
    const mappedSale = {
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      customerId: sale.customerId,
      projectName: sale.projectName,
      shiftId: sale.shiftId,
      transactionDate: sale.transactionDate,
      status: sale.status,
      totalAmount: sale.totalAmount,
      vatAmount: sale.vatAmount,
      finalAmount: sale.finalAmount,
      discount: sale.discount,
      discountType: sale.discountType,
      discountValue: sale.discountValue,
      tierDiscountPercentage: sale.tierDiscountPercentage,
      tierDiscountAmount: sale.tierDiscountAmount,
      pointsUsed: sale.pointsUsed,
      pointsDiscount: sale.pointsDiscount,
      customerPayment: sale.customerPayment,
      previousDebt: sale.previousDebt,
      remainingDebt: sale.remainingDebt,
    };

    return { sale: mappedSale, items: mappedItems, customer, productsMap, unitsMap, settings, storeName };
  } catch (error) {
    console.error('Error fetching sale data:', error);
    return { sale: null, items: [], customer: null, productsMap: new Map(), unitsMap: new Map(), settings: null, storeName: undefined };
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SaleDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const search = await searchParams;
  
  const { sale, items, customer, productsMap, unitsMap, settings, storeName } = await getSaleData(id);

  if (!sale) {
    notFound()
  }

  const isPrintView = search.print === 'true';
  const invoiceFormat = settings?.invoiceFormat || 'A4';

  if (isPrintView) {
    if (invoiceFormat === '80mm' || invoiceFormat === '58mm') {
      return (
        <div className="flex justify-center bg-gray-100 min-h-screen p-4">
          <ThermalReceipt
            sale={sale}
            items={items}
            customer={customer}
            productsMap={productsMap}
            unitsMap={unitsMap}
            settings={settings}
            storeName={storeName}
          />
        </div>
      );
    }
  }

  return <SaleInvoice sale={sale} items={items} customer={customer} productsMap={productsMap} unitsMap={unitsMap} settings={settings} autoPrint={isPrintView} />
}
