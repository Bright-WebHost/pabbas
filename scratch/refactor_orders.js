const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/dashboard/(main)/orders/OrdersBoard.tsx', 'utf8');

if (!content.includes('import { useStaff }')) {
  content = content.replace('import { useOrderManager }', 'import { useStaff } from "@/components/providers/StaffProvider";\nimport { useOrderManager }');
}

// Update OrderDetails to use useStaff
if (!content.includes('const { hasPerm } = useStaff()')) {
  content = content.replace(
    'function OrderDetails({ order, onClose, now, onStatusChange }: { order: DashboardOrder; onClose: () => void; now: number; onStatusChange: (order: DashboardOrder, nextStatus: OrderStatus, reason?: string) => void }) {\n  const items = buildItemList(order);',
    'function OrderDetails({ order, onClose, now, onStatusChange }: { order: DashboardOrder; onClose: () => void; now: number; onStatusChange: (order: DashboardOrder, nextStatus: OrderStatus, reason?: string) => void }) {\n  const { hasPerm } = useStaff();\n  const isBasic = !hasPerm("view_orders_full") && hasPerm("view_orders_basic");\n  const items = buildItemList(order);'
  );
  
  // Hide phone
  content = content.replace(
    '<a href={	el:} className="text-[#0051C3] font-semibold text-lg hover:underline">\n                    {order.customer_phone}\n                  </a>',
    '{isBasic ? <span className="text-gray-500 italic">Hidden</span> : <a href={	el:} className="text-[#0051C3] font-semibold text-lg hover:underline">\n                    {order.customer_phone}\n                  </a>}'
  );
  
  // Hide address
  content = content.replace(
    '{order.address && (\n                <div className="flex gap-2.5 items-start bg-gray-50 p-3 rounded-lg border border-gray-100">\n                  <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-gray-400 mt-0.5">??</div>\n                  <div>\n                    <p className="text-gray-900 leading-snug">{order.address}</p>\n                    {order.landmark && <p className="text-gray-500 mt-1 text-sm italic">Near: {order.landmark}</p>}\n                  </div>\n                </div>\n              )}',
    '{!isBasic && order.address && (\n                <div className="flex gap-2.5 items-start bg-gray-50 p-3 rounded-lg border border-gray-100">\n                  <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-gray-400 mt-0.5">??</div>\n                  <div>\n                    <p className="text-gray-900 leading-snug">{order.address}</p>\n                    {order.landmark && <p className="text-gray-500 mt-1 text-sm italic">Near: {order.landmark}</p>}\n                  </div>\n                </div>\n              )}'
  );
  
  // Update slide action based on permission
  // Waiters only see 'served' button. We can just hide the slide action if it's not 'delivered' for waiters
  content = content.replace(
    '{slideAction && (\n              <div className="mt-8">',
    '{slideAction && (!isBasic || slideAction.nextStatus === "delivered") && (\n              <div className="mt-8">'
  );
}

fs.writeFileSync('app/(dashboard)/dashboard/(main)/orders/OrdersBoard.tsx', content);
console.log('Refactored OrdersBoard');
