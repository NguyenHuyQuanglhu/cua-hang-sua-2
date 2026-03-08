const fs = require('fs');
const content = fs.readFileSync('ts_errors.txt', 'utf16le');
const lines = content.split('\n');
let capturing = false;
for (const line of lines) {
    if (line.includes('src/app/pos/page.tsx')) {
        capturing = true;
        console.log(line);
    } else if (capturing && line.startsWith('src/')) {
        capturing = false;
    } else if (capturing) {
        console.log(line);
    }
}
