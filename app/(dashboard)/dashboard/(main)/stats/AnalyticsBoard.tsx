"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calendar, Filter, Loader2, TrendingUp, ShoppingBag, IndianRupee } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, startOfWeek, startOfMonth, parseISO, getDay, getHours } from "date-fns";

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  items_json: Array<{ item_name: string; quantity: number }> | null;
  cancel_reason?: string;
  cancelled_by?: string;
  cancelled_at?: string;
};

export default function AnalyticsBoard() {
  const [range, setRange] = useState<"today" | "yesterday" | "week" | "month" | "all" | "custom">("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient() as any;

  const fetchStats = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("orders")
        .select("id, order_number, status, total, created_at, items_json, cancel_reason, cancelled_by, cancelled_at")
        .neq("status", "draft");

      const now = new Date();
      let start: Date | null = null;
      let end: Date | null = null;

      if (range === "today") {
        start = startOfDay(now);
        end = endOfDay(now);
      } else if (range === "yesterday") {
        start = startOfDay(subDays(now, 1));
        end = endOfDay(subDays(now, 1));
      } else if (range === "week") {
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfDay(now);
      } else if (range === "month") {
        start = startOfMonth(now);
        end = endOfDay(now);
      } else if (range === "custom" && customStart && customEnd) {
        start = startOfDay(new Date(customStart));
        end = endOfDay(new Date(customEnd));
      }

      if (start && end) {
        query = query.gte("created_at", start.toISOString()).lte("created_at", end.toISOString());
      }

      const { data, error } = await query.order("created_at", { ascending: false }).limit(5000);
      if (!error && data) {
        setOrders(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (range === "custom" && (!customStart || !customEnd)) return;
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, customStart, customEnd]);

  const stats = useMemo(() => {
    const validOrders = orders.filter((o) => o.status !== "cancelled");
    const totalOrders = validOrders.length;
    const totalRevenue = validOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Most ordered items
    const itemCounts: Record<string, number> = {};
    validOrders.forEach((o) => {
      if (o.items_json && Array.isArray(o.items_json)) {
        o.items_json.forEach((it) => {
          if (it.item_name) {
            itemCounts[it.item_name] = (itemCounts[it.item_name] || 0) + (it.quantity || 1);
          }
        });
      }
    });
    const topItems = Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // By day sales
    const byDayMap: Record<string, { orders: number; revenue: number }> = {};
    validOrders.forEach((o) => {
      const d = format(parseISO(o.created_at), "MMM dd, yyyy");
      if (!byDayMap[d]) byDayMap[d] = { orders: 0, revenue: 0 };
      byDayMap[d].orders += 1;
      byDayMap[d].revenue += Number(o.total);
    });
    const dailySales = Object.entries(byDayMap).map(([day, data]) => ({
      day,
      orders: data.orders,
      revenue: data.revenue,
      avg: Math.round(data.revenue / data.orders),
    }));

    // Hourly Heatmap (Day of Week vs Hour)
    // 0 = Sun, 1 = Mon, etc.
    const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
    let maxHeat = 0;
    validOrders.forEach((o) => {
      const date = parseISO(o.created_at);
      const day = getDay(date); // 0-6
      const hr = getHours(date); // 0-23
      heatmap[day][hr] += 1;
      if (heatmap[day][hr] > maxHeat) maxHeat = heatmap[day][hr];
    });

    const cancelledOrdersList = orders.filter((o) => o.status === "cancelled").map(o => ({
      order_number: o.order_number,
      created_at: o.created_at,
      total: o.total,
      reason: o.cancel_reason || 'No reason provided',
      cancelled_by: o.cancelled_by || 'Unknown',
      items: o.items_json ? o.items_json.map((i: any) => `${i.quantity}x ${i.item_name}`).join(', ') : 'No items'
    }));

    return { totalOrders, totalRevenue, avgOrder, topItems, dailySales, heatmap, maxHeat, cancelledOrders: cancelledOrdersList };
  }, [orders]);

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2 text-gray-500 font-medium">
          <Filter className="h-5 w-5" />
          <span>Filter:</span>
        </div>
        <div className="flex flex-wrap gap-2 flex-1">
          {[
            { id: "today", label: "Today" },
            { id: "yesterday", label: "Yesterday" },
            { id: "week", label: "This Week" },
            { id: "month", label: "This Month" },
            { id: "all", label: "All Time" },
            { id: "custom", label: "Custom Date" },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id as any)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                range === r.id
                  ? "bg-red-600 text-white shadow-md"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {range === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-gray-500 mb-2 font-bold uppercase tracking-wider text-xs">
                <ShoppingBag className="h-4 w-4" /> Orders
              </div>
              <div className="text-4xl font-black tracking-tight">{stats.totalOrders}</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-gray-500 mb-2 font-bold uppercase tracking-wider text-xs">
                <IndianRupee className="h-4 w-4" /> Revenue
              </div>
              <div className="text-4xl font-black tracking-tight text-red-600">
                ₹{stats.totalRevenue.toLocaleString("en-IN")}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-gray-500 mb-2 font-bold uppercase tracking-wider text-xs">
                <TrendingUp className="h-4 w-4" /> Average Order
              </div>
              <div className="text-4xl font-black tracking-tight text-blue-600">
                ₹{stats.avgOrder.toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Items */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
              <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                <h3 className="font-bold text-lg">Most Ordered Items</h3>
              </div>
              <div className="p-0 overflow-auto max-h-[400px]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Item</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs text-right">Times Ordered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.topItems.length > 0 ? (
                      stats.topItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition">
                          <td className="px-6 py-3 font-medium text-gray-900">{item.name}</td>
                          <td className="px-6 py-3 text-right font-bold text-gray-600">{item.count}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="px-6 py-8 text-center text-gray-400">
                          No items ordered in this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Daily Sales */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
              <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                <h3 className="font-bold text-lg">Sales by Day</h3>
              </div>
              <div className="p-0 overflow-auto max-h-[400px]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Day</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs text-right">Orders</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.dailySales.length > 0 ? (
                      stats.dailySales.map((day, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition">
                          <td className="px-6 py-3 font-medium text-gray-900">{day.day}</td>
                          <td className="px-6 py-3 text-right font-bold text-gray-600">{day.orders}</td>
                          <td className="px-6 py-3 text-right font-bold text-green-600">₹{day.revenue.toLocaleString("en-IN")}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                          No orders in this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Hourly Heatmap */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
              <h3 className="font-bold text-lg">Hourly Order Heatmap</h3>
              <p className="text-sm text-gray-500">Number of orders placed by hour of the day</p>
            </div>
            <div className="p-6 overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-[auto_repeat(24,1fr)] gap-1 mb-1">
                  <div className="w-12"></div>
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div key={h} className="text-center text-[10px] font-bold text-gray-400">
                      {h}
                    </div>
                  ))}
                </div>
                {daysOfWeek.map((dayName, dayIndex) => (
                  <div key={dayName} className="grid grid-cols-[auto_repeat(24,1fr)] gap-1 mb-1">
                    <div className="w-12 text-xs font-semibold text-gray-600 flex items-center justify-end pr-2">
                      {dayName}
                    </div>
                    {stats.heatmap[dayIndex].map((count, hour) => {
                      // Calculate opacity based on max heat
                      const intensity = stats.maxHeat > 0 ? Math.max(0.1, count / stats.maxHeat) : 0;
                      return (
                        <div
                          key={hour}
                          title={`${dayName} at ${hour}:00 - ${count} orders`}
                          className="h-8 rounded-md transition hover:ring-2 hover:ring-gray-300 flex items-center justify-center cursor-default"
                          style={{
                            backgroundColor: count > 0 ? `rgba(226, 55, 68, ${intensity})` : "#f3f4f6",
                          }}
                        >
                          {count > 0 && (
                            <span className={`text-[10px] font-bold ${intensity > 0.5 ? 'text-white' : 'text-gray-700'}`}>
                              {count}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

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
        </>
      )}
    </div>
  );
}
