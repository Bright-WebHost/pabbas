const fs = require('fs');
const code = fs.readFileSync('app/api/webhooks/ycloud/whatsapp/route.ts', 'utf8');
const lines = code.split('\n');
const start = lines.findIndex(l => l.includes('messages.push'));
if (start > -1) {
  console.log(lines.slice(start - 10, start + 10).join('\n'));
} else {
  console.log('Not found');
}
