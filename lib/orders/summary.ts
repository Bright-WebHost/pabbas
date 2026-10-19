"use server";

import { authorize } from "@/lib/auth/staff";
import { createAdminClient } from "@/lib/supabase/admin";

export interface TodaySummary {
  date: string;
  orders: number;
  revenue: number;
  averageOrder: number;
  cancelled: number;
  waitingToAccept: number;
  byType: Record<string, number>;
  topItems: Array<{ name: string; quantity: number }>;
  cashWithRiders: { amount: number; orders: number };
}

/** Today's numbers (India time) for the dashboard summary card. */
export async function getTodaySummary(): Promise<{ success: true; summary: TodaySummary } | { success: false; error: string }> {
  try {
    await authorize("analytics");
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
    const start = new Date(`${today}T00:00:00+05:30`).toISOString();

    const { data, error } = await createAdminClient()
      .from("orders")
      .select("total, status, order_type, source, items_json, is_collected")
      .gte("created_at", start)
      .neq("status", "draft");
    if (error) return { success: false, error: "Could not load today's orders." };

    type Row = { total: number; status: string; order_type: string; source: string | null; items_json: Array<{ item_name?: string; name?: string; quantity?: number }> | null; is_collected: boolean | null };
    const rows = (data ?? []) as Row[];
    const live = rows.filter((o) => o.status !== "cancelled");

    const byType: Record<string, number> = {};
    const items = new Map<string, number>();
    for (const o of live) {
      const type = o.source === "pos" ? "POS" : o.order_type === "dine-in" ? "Dine-in" : o.order_type === "delivery" ? "Delivery" : "Takeaway";
      byType[type] = (byType[type] || 0) + 1;
      for (const it of Array.isArray(o.items_json) ? o.items_json : []) {
        const name = String(it.item_name || it.name || "").trim();
        if (name) items.set(name, (items.get(name) || 0) + (Number(it.quantity) || 1));
      }
    }

    const revenue = live.reduce((s, o) => s + Number(o.total || 0), 0);
    const pendingCash = live.filter((o) => o.order_type === "delivery" && o.status === "delivered" && !o.is_collected);

    return {
      success: true,
      summary: {
        date: today,
        orders: live.length,
        revenue,
        averageOrder: live.length ? revenue / live.length : 0,
        cancelled: rows.length - live.length,
        waitingToAccept: live.filter((o) => o.status === "new").length,
        byType,
        topItems: [...items.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, quantity]) => ({ name, quantity })),
        cashWithRiders: { amount: pendingCash.reduce((s, o) => s + Number(o.total || 0), 0), orders: pendingCash.length },
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Could not load the summary." };
  }
}
