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
  if (!content.includes('import { authorize }')) {
    content = content.replace('"use server";', '"use server";\n\nimport { authorize } from "@/lib/auth/staff";');
  }
  
  content = content.replace(/export async function (\w+)\((.*?)\) \{/g, `export async function $1($2) {\n  await authorize("${perm}");\n`);
  fs.writeFileSync(file, content);
}

// Riders needs specific permissions per function
let ridersContent = fs.readFileSync('app/(dashboard)/dashboard/(main)/riders/actions.ts', 'utf8');
if (!ridersContent.includes('import { authorize }')) {
  ridersContent = ridersContent.replace('"use server";', '"use server";\n\nimport { authorize } from "@/lib/auth/staff";');
}
ridersContent = ridersContent.replace(/export async function fetchRiders\(\) \{/g, 'export async function fetchRiders() {\n  await authorize("view_riders");\n');
ridersContent = ridersContent.replace(/export async function addRider\((.*?)\) \{/g, 'export async function addRider($1) {\n  await authorize("manage_riders");\n');
ridersContent = ridersContent.replace(/export async function toggleRiderStatus\((.*?)\) \{/g, 'export async function toggleRiderStatus($1) {\n  await authorize("manage_riders");\n');
ridersContent = ridersContent.replace(/export async function settlePendingCash\((.*?)\) \{/g, 'export async function settlePendingCash($1) {\n  await authorize("manage_riders");\n');
fs.writeFileSync('app/(dashboard)/dashboard/(main)/riders/actions.ts', ridersContent);

console.log('Done securing server actions');
