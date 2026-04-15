import { notFound } from "next/navigation"
import { cookies } from "next/headers"
import type { Customer, Product, Unit, ThemeSettings } from "@/lib/types"
import { SaleInvoice } from "../sales/[id]/components/sale-invoice"
import { ThermalReceipt } from "../sales/[id]/components/thermal-receipt"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function getAuthHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  const storeId = cookieStore.get('store-id')?.value;
  
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(storeId && { 'X-Store-Id': storeId }),
  };
}

async function getSaleData(saleId: string) {
  try {
    const headers = await getAuthHeaders();
    const storeId = (await cookies()).get('store-id')?.value;

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

    let customer: Customer | null = null;
    if (sale?.customerId) {
      const customerResponse = await fetch(`${API_BASE_URL}/customers/${sale.customerId}`, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });
      if (customerResponse.ok) {
        const customerData = await customerResponse.json();
        customer = customerData.customer;
      }
    }

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
        productsMap.set(productId as string, productData.product);
      }
    }

    const unitsMap = new Map<string, Unit>();
    const unitsResponse = await fetch(`${API_BASE_URL}/units`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
    if (unitsResponse.ok) {
      const unitsData = await unitsResponse.json();
      (unitsData.data || []).forEach((unit: Unit) => {
        unitsMap.set(unit.id, unit);
      });
    }

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

    const mappedItems = items.map((item: any) => ({
      id: item.id,
      salesTransactionId: item.salesId,
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
    }));

    const mappedSale = {
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      customerId: sale.customerId,
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
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PrintInvoicePage({ searchParams }: PageProps) {
  const search = await searchParams;
  const saleId = search.id as string;
  
  if (!saleId) {
    notFound()
  }
  
  const { sale, items, customer, productsMap, unitsMap, settings, storeName } = await getSaleData(saleId);

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
