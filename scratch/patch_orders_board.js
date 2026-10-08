const fs = require('fs');
let file = fs.readFileSync('app/(dashboard)/dashboard/(main)/orders/OrdersBoard.tsx', 'utf8');

file = file.replace(
  'export default function OrdersBoard() {',
  'export default function OrdersBoard({ role = "admin" }: { role?: string }) {'
);

file = file.replace(
  '<StatCard label="Revenue" value={money(totalRevenue)} tone="red" />',
  '{role !== "kitchen" && <StatCard label="Revenue" value={money(totalRevenue)} tone="red" />}'
);

file = file.replace(
  'function canTransitionStatus(current: OrderStatus, next: OrderStatus) {',
  'function canTransitionStatus(current: OrderStatus, next: OrderStatus, userRole: string = "admin") {\\n  if (userRole === "kitchen") {\\n    if (current === "new" && next === "preparing") return true;\\n    if (current === "preparing" && (next === "ready_for_pickup" || next === "out_for_delivery")) return true;\\n    return false;\\n  }'
);

file = file.replace(/canTransitionStatus\(([^,]+),([^)]+)\)/g, 'canTransitionStatus(, , role)');

// The user said: "kitchen people should not see analytics page and the amounts which are coming in orders on top they can only see and access 2 states one is preparing and they can just move to ready/out and they cant move to delivery state only admin can do it"
// This means they should NOT see the "Delivered" column in the dashboard!
// Let's filter the columns inside the component.
// Find: BOARD_COLUMNS.map((col) => {
file = file.replace(
  'BOARD_COLUMNS.map((col) => {',
  'BOARD_COLUMNS.filter(col => role === "kitchen" ? (col.key === "preparing" || col.key === "ready") : true).map((col) => {'
);

fs.writeFileSync('app/(dashboard)/dashboard/(main)/orders/OrdersBoard.tsx', file);
console.log('OrdersBoard successfully patched for kitchen role constraints');
