"use client";

import React, { useMemo } from "react";
import { useOrderManager } from "../../OrderManagerProvider";
import { formatDistanceToNow } from "date-fns";
import { useStaff } from "@/components/providers/StaffProvider";

export default function KitchenBoard() {
  const { orders, updateOrderStatus, isLoading, error } = useOrderManager();
  const { hasPerm } = useStaff();

  // Kitchen only sees "preparing" orders
  const preparingOrders = useMemo(() => {
    return orders
      .filter((o) => o.status === "preparing")
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [orders]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] gap-4">
        <div className="text-red-500 font-medium">Failed to load orders: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0A1017]">Kitchen Display System</h1>
        <div className="flex gap-4 text-sm font-semibold">
          <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg shadow-sm border border-yellow-200">
            Preparing: {preparingOrders.length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {preparingOrders.map((order) => {
          const timeAgo = formatDistanceToNow(new Date(order.created_at), { addSuffix: true });
          // Red highlight if older than 15 minutes
          const isUrgent = new Date().getTime() - new Date(order.created_at).getTime() > 15 * 60 * 1000;

          return (
            <div 
              key={order.id} 
              className={`flex flex-col bg-white border ${isUrgent ? 'border-red-500 shadow-md shadow-red-50' : 'border-gray-200 shadow-sm'} rounded-xl overflow-hidden transition-all hover:shadow-md`}
            >
              <div className={`p-4 border-b ${isUrgent ? 'bg-red-50' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xl font-black tracking-tight text-gray-900">
                    {order.order_number}
                  </span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${order.order_type === 'pos' ? 'bg-purple-100 text-purple-700' : order.order_type === 'takeaway' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                    {order.order_type.toUpperCase()}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm text-gray-500">
                  <span className="font-semibold">{timeAgo}</span>
                  {order.table_number && (
                    <span className="text-gray-900 font-bold bg-gray-200 px-2 rounded-md">Table {order.table_number}</span>
                  )}
                </div>
              </div>

              <div className="p-4 flex-1">
                <ul className="space-y-3">
                  {(order.items_json || []).map((item, idx) => (
                    <li key={idx} className="flex gap-3 text-gray-900 items-start">
                      <span className="font-bold min-w-[24px] h-6 flex items-center justify-center bg-gray-100 rounded text-sm text-gray-600">
                        {item.quantity}x
                      </span>
                      <div className="flex flex-col">
                        <span className="font-bold text-[15px] leading-tight">{item.item_name}</span>
                        {/* {item.size && <span className="text-xs text-gray-500 mt-0.5">{item.size}</span>}
                        {item.notes && <span className="text-xs text-red-500 mt-0.5 italic">Note: {item.notes}</span>} */}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {hasPerm("mark_ready") && (
                <div className="p-3 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={() => updateOrderStatus(order, "ready_for_pickup")}
                    className="w-full py-3 bg-[#E23744] hover:bg-[#B0202B] text-white font-bold rounded-lg shadow-sm transition-colors uppercase tracking-wide text-sm flex justify-center items-center gap-2"
                  >
                    Mark as Ready
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {preparingOrders.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 bg-white border border-gray-100 border-dashed rounded-2xl">
            <div className="w-16 h-16 mb-4 opacity-20">🍳</div>
            <p className="text-lg font-medium text-gray-500">No active orders</p>
            <p className="text-sm">Kitchen is caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
}
