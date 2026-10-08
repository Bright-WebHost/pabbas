with open('app/(dashboard)/dashboard/(main)/stats/AnalyticsBoard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update OrderRow type
content = content.replace(
    '''  items_json: Array<{ item_name: string; quantity: number }> | null;
};''',
    '''  items_json: Array<{ item_name: string; quantity: number }> | null;
  cancel_reason?: string;
  cancelled_by?: string;
  cancelled_at?: string;
};'''
)

# 2. Update select query
content = content.replace(
    '''.select("id, order_number, status, total, created_at, items_json")''',
    '''.select("id, order_number, status, total, created_at, items_json, cancel_reason, cancelled_by, cancelled_at")'''
)

# 3. Compute cancelledOrders in stats
content = content.replace(
    '''    return { totalOrders, totalRevenue, avgOrder, topItems, dailySales, heatmap, maxHeat };''',
    '''    const cancelledOrdersList = orders.filter((o) => o.status === "cancelled").map(o => ({
      order_number: o.order_number,
      created_at: o.created_at,
      total: o.total,
      reason: o.cancel_reason || 'No reason provided',
      cancelled_by: o.cancelled_by || 'Unknown',
      items: o.items_json ? o.items_json.map((i: any) => `${i.quantity}x ${i.item_name}`).join(', ') : 'No items'
    }));

    return { totalOrders, totalRevenue, avgOrder, topItems, dailySales, heatmap, maxHeat, cancelledOrders: cancelledOrdersList };'''
)

# 4. Add the Cancelled Orders section before the end of the file
new_section = '''
          {/* Cancelled Orders */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col mt-6">
            <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
              <h3 className="font-bold text-lg">Cancelled Orders</h3>
            </div>
            <div className="p-0 overflow-auto max-h-[400px]">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Order</th>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Items</th>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Total</th>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Reason</th>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.cancelledOrders.length > 0 ? (
                    stats.cancelledOrders.map((co, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition cursor-pointer" title={co.items}>
                        <td className="px-6 py-3 font-medium text-gray-900">{co.order_number}</td>
                        <td className="px-6 py-3 text-gray-600 max-w-[200px] truncate">{co.items}</td>
                        <td className="px-6 py-3 font-bold text-gray-600">₹{co.total}</td>
                        <td className="px-6 py-3 text-red-600 font-medium">{co.reason}</td>
                        <td className="px-6 py-3 text-gray-500 capitalize">{co.cancelled_by}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                        No cancelled orders in this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
'''

content = content.replace(
    '''        </>
      )}
    </div>
  );
}''',
    new_section + '''        </>
      )}
    </div>
  );
}'''
)

with open('app/(dashboard)/dashboard/(main)/stats/AnalyticsBoard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated AnalyticsBoard.tsx')
