const fs = require('fs');
const content = fs.readFileSync('ts_errors.txt', 'utf16le');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('src/app/pos/page.tsx')) {
        console.log(lines[i].trim());
        if (lines[i + 1]) console.log('  ' + lines[i + 1].trim());
        if (lines[i + 2]) console.log('  ' + lines[i + 2].trim());
    }
}
