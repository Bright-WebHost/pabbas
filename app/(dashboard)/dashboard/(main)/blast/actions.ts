"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function sendBlast(filter: string, templateName: string, headerImage: string, phones: string[] = []) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.access_token) {
      return { success: false, error: "Unauthorized" };
    }

    const adminClient = createAdminClient();
    const { data: staffData } = await adminClient
      .from("staff_members")
      .select("name")
      .eq("email", session.user.email)
      .maybeSingle();

    if (!staffData) {
      return { success: false, error: "Not a staff member" };
    }

    const webhookUrl = process.env.N8N_BLAST_WEBHOOK_URL || "https://staff.brightmedia.tech/webhook/pabbas-blast";

    const payload = {
      filter,
      template_name: templateName,
      language: "en",
      header_image: headerImage,
      phones,
      headers: {
        authorization: `Bearer ${session.access_token}`
      }
    };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(`Blast webhook failed: ${res.status}`);
      return { success: false, error: "Failed to dispatch blast via webhook" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err: any) {
    console.error("sendBlast error:", err);
    return { success: false, error: err.message || "Failed to send blast" };
  }
}
