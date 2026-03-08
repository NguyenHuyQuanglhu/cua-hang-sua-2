import { config } from 'dotenv';
config();
import { query } from './src/db';
import fs from 'fs';

async function test() {
    try {
        const sql = fs.readFileSync('scripts/stored-procedures/sp_Products_GetById.sql', 'utf8');

        // Split by GO since mssql npm package can't handle GO keywords natively
        const batches = sql.split(/\bGO\b/i).map(s => s.trim()).filter(s => s.length > 0);

        for (const batch of batches) {
            if (!batch.toLowerCase().startsWith('print')) {
                await query(batch);
                console.log('Executed batch successfully.');
            }
        }
        console.log('sp_Products_GetById updated successfully!');
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
test();
