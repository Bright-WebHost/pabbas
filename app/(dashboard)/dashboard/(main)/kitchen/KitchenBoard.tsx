"use client";

import React, { useMemo, useEffect, useRef } from "react";
import { useOrderManager } from "../../OrderManagerProvider";
import { formatDistanceToNow } from "date-fns";
import { useStaff } from "@/components/providers/StaffProvider";
import SlideButton from "@/components/ui/SlideButton";

export default function KitchenBoard() {
  const { orders, isLoading, error } = useOrderManager();
  const { hasPerm } = useStaff();
  const seenOrderIds = useRef(new Set<string>());

  // Kitchen only sees "preparing" orders
  const preparingOrders = useMemo(() => {
    return orders
      .filter((o) => o.status === "preparing")
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [orders]);

  useEffect(() => {
    let hasNew = false;
    preparingOrders.forEach(order => {
      if (!seenOrderIds.current.has(order.id)) {
        hasNew = true;
        seenOrderIds.current.add(order.id);
      }
    });

    if (hasNew) {
      try {
        const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
        audio.play().catch(console.warn);
      } catch (err) {
        console.warn("Audio play failed", err);
      }
    }
  }, [preparingOrders]);

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

      <div className="flex flex-col gap-4">
        {preparingOrders.map((order) => {
          const timeAgo = formatDistanceToNow(new Date(order.created_at), { addSuffix: true });
          const ageMs = new Date().getTime() - new Date(order.created_at).getTime();
          const isUrgent = ageMs > 15 * 60 * 1000;
          const isNew = ageMs < 60 * 1000; // Less than 1 minute old is "new"

          // New items get a subtle green background, urgent gets red, else white
          let bgClass = "bg-white";
          let borderClass = "border-gray-200";

          if (isUrgent) {
            bgClass = "bg-red-50";
            borderClass = "border-red-400";
          } else if (isNew) {
            bgClass = "bg-emerald-50";
            borderClass = "border-emerald-400 border-2";
          }

          return (
            <div 
              key={order.id} 
              className={`flex flex-col md:flex-row border ${bgClass} ${borderClass} rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md`}
            >
              {/* Order Info Sidebar */}
              <div className={`p-4 md:w-64 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col justify-between ${isUrgent ? 'bg-red-100' : isNew ? 'bg-emerald-100' : 'bg-gray-50'}`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-2xl font-black tracking-tight text-gray-900">
                      {order.order_number}
                    </span>
                    {isNew && <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase animate-pulse">New</span>}
                  </div>
                  
                  <span className={`text-xs font-bold px-2 py-1 rounded-full inline-block mb-3 ${order.order_type === 'pos' ? 'bg-purple-100 text-purple-700' : order.order_type === 'takeaway' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                    {order.order_type.toUpperCase()}
                  </span>

                  <div className="text-sm text-gray-600 font-medium mb-1">Time: {timeAgo}</div>
                  
                  {order.table_number && (
                    <div className="mt-2 text-lg text-gray-900 font-black bg-white/60 px-3 py-1 rounded-md inline-block border border-gray-300">
                      Table {order.table_number}
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div className="p-4 flex-1">
                <ul className="space-y-3">
                  {(order.items_json || []).map((item: any, idx: number) => (
                    <li key={idx} className="flex gap-4 text-gray-900 items-center">
                      <span className="font-bold min-w-[32px] h-8 flex items-center justify-center bg-gray-100 border border-gray-200 rounded-md text-lg text-gray-700 shadow-sm">
                        {item.quantity}
                      </span>
                      <span className="font-bold text-xl leading-tight">{item.item_name}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              {hasPerm("mark_ready") && (
                <div className="p-4 bg-white/50 border-t md:border-t-0 md:border-l border-gray-200 md:w-64 flex items-center justify-center">
                  <div className="w-full">
                    <SlideButton 
                      text="Slide to mark Ready" 
                      successText="Ready!"
                      onSuccess={async () => {
                        try {
                          const { updateOrderInDb } = await import("@/lib/orders/actions");
                          await updateOrderInDb(order.id, { status: "ready_for_pickup" });
                        } catch (e) {
                          console.error(e);
                        }
                      }} 
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {preparingOrders.length === 0 && (
          <div className="w-full py-24 flex flex-col items-center justify-center text-gray-400 bg-white border border-gray-200 border-dashed rounded-2xl">
            <div className="w-16 h-16 mb-4 opacity-20 text-4xl flex items-center justify-center">🍳</div>
            <p className="text-xl font-medium text-gray-500">No active orders</p>
            <p className="text-md">Kitchen is caught up!</p>
          </div>
        )}
      </div>

      {/* History Section */}
      <div className="mt-12 space-y-4">
        <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Recent History</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders
            .filter((o) => ["ready_for_pickup", "out_for_delivery", "delivered", "cancelled"].includes(o.status))
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .slice(0, 12)
            .map(order => (
              <div key={order.id} className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex justify-between items-center opacity-80 hover:opacity-100 transition-opacity">
                <div>
                  <div className="font-mono font-bold text-lg">{order.order_number}</div>
                  <div className="text-sm text-gray-500 uppercase font-semibold">{order.status.replace(/_/g, " ")}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{Array.isArray(order.items_json) ? order.items_json.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) : 0} items</div>
                  <div className="text-xs text-gray-400">{formatDistanceToNow(new Date(order.updated_at), { addSuffix: true })}</div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
