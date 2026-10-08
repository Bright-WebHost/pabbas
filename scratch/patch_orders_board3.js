const fs = require('fs');
let file = fs.readFileSync('app/(dashboard)/dashboard/(main)/orders/OrdersBoard.tsx', 'utf8');

file = file.replace(
  'function canTransitionStatus(current: OrderStatus, next: OrderStatus, userRole: string = "admin") {\\n  if (userRole === "kitchen") {\\n    if (current === "new" && next === "preparing") return true;\\n    if (current === "preparing" && (next === "ready_for_pickup" || next === "out_for_delivery")) return true;\\n    return false;\\n  }',
  'function canTransitionStatus(current: OrderStatus, next: OrderStatus) {'
);

file = file.replace(
  'function canTransitionStatus(current: OrderStatus, next: OrderStatus) {',
  `function canTransitionStatus(current: OrderStatus, next: OrderStatus, userRole: string = "admin") {
  if (userRole === "kitchen") {
    if (current === "new" && next === "preparing") return true;
    if (current === "preparing" && (next === "ready_for_pickup" || next === "out_for_delivery")) return true;
    return false;
  }`
);

fs.writeFileSync('app/(dashboard)/dashboard/(main)/orders/OrdersBoard.tsx', file);
