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

file = file.replace(
  'if (!canTransitionStatus(order.status, nextStatus)) {',
  'if (!canTransitionStatus(order.status, nextStatus, role)) {'
);

file = file.replace(
  'BOARD_COLUMNS.map((column) => {',
  'BOARD_COLUMNS.filter(col => role === "kitchen" ? (col.key === "preparing" || col.key === "ready") : true).map((column) => {'
);

fs.writeFileSync('app/(dashboard)/dashboard/(main)/orders/OrdersBoard.tsx', file);
console.log('OrdersBoard patched correctly');
