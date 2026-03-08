import { config } from 'dotenv';
config();
import { query } from './src/db';
import fs from 'fs';

async function test() {
    try {
        const q1 = await query(`SELECT top 1 id, store_id FROM Products WHERE name LIKE N'%Bơ Président%'`);
        if (q1.length) {
            const product = q1[0] as any;

            const q2 = await query(`EXEC sp_Products_GetByStore @storeId = '${product.store_id}', @searchTerm = N'Bơ Président'`);
            fs.writeFileSync('test_products.txt', JSON.stringify(q2, null, 2));
        }
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
test();
