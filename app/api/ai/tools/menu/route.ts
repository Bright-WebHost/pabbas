/**
 * GET /api/ai/tools/menu
 *
 * Secure server-side tool endpoint for the Pabbas AI Agent.
 * Returns the full active Pabbas menu with categories and variants.
 *
 * This endpoint is called by n8n (not by the browser).
 * It uses the Supabase admin client server-side — no credentials are exposed.
 *
 * Security: This is a read-only, public menu endpoint. Menu data is not
 * customer-specific and does not require customer authentication.
 * However, it is only intended to be called by the n8n AI tool, not directly
 * by end users.
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()

    // Fetch active menu items with their category names
    const { data: items, error: itemsError } = await supabase
      .from('menu_items')
      .select('id, name, description, price_paise, vegetarian, badge, featured, is_active, menu_categories(name)')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (itemsError) {
      console.error('[AI Tool: get_menu] Failed to fetch menu items:', itemsError.message)
      return NextResponse.json({ error: 'Failed to fetch menu.' }, { status: 500 })
    }

    // Fetch active variants
    const { data: variants, error: variantsError } = await supabase
      .from('menu_item_variants')
      .select('id, menu_item_id, name, price_paise, is_active')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (variantsError) {
      console.error('[AI Tool: get_menu] Failed to fetch variants:', variantsError.message)
      // Continue without variants — not a fatal error
    }

    // Group variants by menu_item_id
    const variantsByItem: Record<string, Array<{ name: string; price: number }>> = {}
    if (variants) {
      for (const v of variants as any[]) {
        const itemId = v.menu_item_id
        if (!variantsByItem[itemId]) variantsByItem[itemId] = []
        variantsByItem[itemId].push({
          name: v.name,
          price: Math.round(v.price_paise / 100),
        })
      }
    }

    // Build the AI-friendly menu response
    const menu = (items as any[]).map((item) => ({
      id: item.id,
      name: item.name,
      category: item.menu_categories?.name || 'Uncategorized',
      description: item.description || '',
      price: Math.round(item.price_paise / 100),
      vegetarian: item.vegetarian,
      badge: item.badge || null,
      featured: item.featured,
      variants: variantsByItem[item.id] || [],
    }))

    return NextResponse.json({ menu })
  } catch (err: any) {
    console.error('[AI Tool: get_menu] Error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
