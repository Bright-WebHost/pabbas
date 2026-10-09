const fs = require('fs');

const mappings = {
  'app/(dashboard)/dashboard/(main)/tables/actions.ts': 'tables',
  'app/(dashboard)/dashboard/(main)/pos/actions.ts': 'pos',
  'app/(dashboard)/dashboard/(main)/contacts/actions.ts': 'contacts',
  'app/(dashboard)/dashboard/(main)/orders/actions.ts': 'collect_cash',
  'app/(dashboard)/dashboard/(main)/chat/actions.ts': 'chat',
  'app/(dashboard)/dashboard/(main)/blast/actions.ts': 'blast'
};

for (const [file, perm] of Object.entries(mappings)) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/export async function 1\(2\) \{/g, 'export async function ___FIX_ME___() {');
  fs.writeFileSync(file, content);
}
console.log('Fixed broken functions to easily fix');
