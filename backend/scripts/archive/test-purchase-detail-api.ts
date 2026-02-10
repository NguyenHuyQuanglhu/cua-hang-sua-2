import { purchaseOrderRepository } from '../src/repositories/purchase-order-repository';

async function testAPI() {
  try {
    const purchaseOrderId = '49A84088-9277-4D1F-95E5-FD6F08BC247C';
    const storeId = '59B9720A-FA71-4736-863B-7E0BFD4BBD07'; // cửa hàng sữa
    
    console.log('Testing purchaseOrderRepository.findByIdWithDetails...');
    console.log('Purchase Order ID:', purchaseOrderId);
    console.log('Store ID:', storeId);
    
    const result = await purchaseOrderRepository.findByIdWithDetails(purchaseOrderId, storeId);
    
    if (!result) {
      console.log('\n❌ Purchase order not found');
      return;
    }
    
    console.log('\n✅ Purchase order found:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

testAPI();
