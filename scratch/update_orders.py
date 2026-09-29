import sys

with open('app/(dashboard)/dashboard/(main)/orders/OrdersBoard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update onStatusChange type signature
content = content.replace(
    'onStatusChange: (order: DashboardOrder, nextStatus: OrderStatus) => void',
    'onStatusChange: (order: DashboardOrder, nextStatus: OrderStatus, reason?: string) => void'
)

# 2. Update OrderDetails Cancel button
content = content.replace(
    '''onClick={() => onStatusChange(order, "cancelled")}''',
    '''onClick={() => {
                  const reason = window.prompt("Please enter a reason for cancellation (sent to customer):");
                  if (reason !== null) onStatusChange(order, "cancelled", reason);
                }}'''
)

# 3. Update OrderCard Cancel button
content = content.replace(
    '''onClick={(event) => {
              event.stopPropagation();
              onStatusChange(order, "cancelled");
            }}''',
    '''onClick={(event) => {
              event.stopPropagation();
              const reason = window.prompt("Please enter a reason for cancellation (sent to customer):");
              if (reason !== null) onStatusChange(order, "cancelled", reason);
            }}'''
)

# 4. Highlight order_type in OrderCard
content = content.replace(
    '''<span className="rounded-[6px] bg-[#F1F3F6] px-[7px] py-[3px] text-[10.5px] font-bold uppercase tracking-[0.3px] text-[var(--muted)]">{normalizeOrderType(order.order_type)}</span>''',
    '''<span className={`rounded-[6px] px-[7px] py-[3px] text-[10.5px] font-bold uppercase tracking-[0.3px] ${order.order_type === 'delivery' ? 'bg-[#EBF5FF] text-[#1A5FA8]' : order.order_type === 'dine-in' ? 'bg-[#F3E8FF] text-[#6B21A8]' : 'bg-[#FFF7E6] text-[#9A6700]'}`}>{normalizeOrderType(order.order_type)}</span>'''
)

# 5. Update handleStatusChange signature
content = content.replace(
    '''const handleStatusChange = useCallback(async (order: DashboardOrder, nextStatus: OrderStatus) => {''',
    '''const handleStatusChange = useCallback(async (order: DashboardOrder, nextStatus: OrderStatus, reason?: string) => {'''
)

# 6. Update cancel reason assignment
content = content.replace(
    '''updates.cancel_reason = "staff_cancelled";''',
    '''updates.cancel_reason = reason || "staff_cancelled";'''
)

# 7. Update notifyStatusWebhook call
content = content.replace(
    '''const notifyResult = await notifyStatusWebhook(order.order_number, nextStatus);''',
    '''const notifyResult = await notifyStatusWebhook(order.order_number, nextStatus, nextStatus === "cancelled" ? updates.cancel_reason : undefined);'''
)

with open('app/(dashboard)/dashboard/(main)/orders/OrdersBoard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated OrdersBoard.tsx')
