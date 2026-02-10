import { salesSPRepository } from '../src/repositories/sales-sp-repository';
import dotenv from 'dotenv';

dotenv.config();

async function check() {
  const storeId = '59B9720A-FA71-4736-863B-7E0BFD4BBD07';
  
  const sales = await salesSPRepository.getByStore(storeId, {});
  
  console.log('Total sales:', sales.length);
  console.log('\nFirst 5 sales:');
  sales.slice(0, 5).forEach((s, i) => {
    console.log(`${i + 1}. ${s.invoiceNumber}`);
    console.log(`   customerId: ${s.customerId}`);
    console.log(`   customerName: ${s.customerName}`);
    console.log(`   finalAmount: ${s.finalAmount}`);
    console.log(`   transactionDate: ${s.transactionDate}`);
    console.log('');
  });
  
  // Check sales with customers
  const salesWithCustomers = sales.filter(s => s.customerId);
  console.log('Sales with customerId:', salesWithCustomers.length);
  
  // Sum by customer
  const customerTotals = new Map<string, number>();
  salesWithCustomers.forEach(s => {
    const current = customerTotals.get(s.customerId!) || 0;
    customerTotals.set(s.customerId!, current + (s.finalAmount || 0));
  });
  
  console.log('\nCustomer totals:');
  customerTotals.forEach((total, customerId) => {
    const sale = salesWithCustomers.find(s => s.customerId === customerId);
    console.log(`${sale?.customerName}: ${total.toLocaleString()}`);
  });
}

check().catch(console.error);
