const fs = require('fs');

const mappings = {
  'app/(dashboard)/dashboard/(main)/page.tsx': '/dashboard/orders',
  'app/(dashboard)/dashboard/(main)/orders/page.tsx': '/dashboard/orders',
  'app/(dashboard)/dashboard/(main)/pos/page.tsx': '/dashboard/pos',
  'app/(dashboard)/dashboard/(main)/tables/page.tsx': '/dashboard/tables',
  'app/(dashboard)/dashboard/(main)/kitchen/page.tsx': '/dashboard/kitchen',
  'app/(dashboard)/dashboard/(main)/riders/page.tsx': '/dashboard/riders',
  'app/(dashboard)/dashboard/(main)/menu/page.tsx': '/dashboard/menu',
  'app/(dashboard)/dashboard/(main)/chat/page.tsx': '/dashboard/chat',
  'app/(dashboard)/dashboard/(main)/contacts/page.tsx': '/dashboard/contacts',
  'app/(dashboard)/dashboard/(main)/blast/page.tsx': '/dashboard/blast',
  'app/(dashboard)/dashboard/(main)/stats/page.tsx': '/dashboard/stats'
};

for (const [file, route] of Object.entries(mappings)) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('import { requirePage }')) {
    content = 'import { requirePage } from "@/lib/auth/staff";\n' + content;
  }
  
  content = content.replace(/export default function (\w+)\((.*?)\) \{/g, `export default async function $1($2) {\n  await requirePage("${route}");\n`);
  content = content.replace(/export default async function (\w+)\((.*?)\) \{\n  await requirePage/g, `export default async function $1($2) {\n  await requirePage`); // Cleanup double replace if ran twice
  fs.writeFileSync(file, content);
}
console.log('Added requirePage to all pages');
