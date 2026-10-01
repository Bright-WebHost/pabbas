import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function formatCartResponse(items: any[]) {
  if (!items || items.length === 0) return { empty: true, items: [], total: 0 }
  const total = items.reduce((sum: number, item: any) => sum + ((item.price || 0) * item.quantity), 0)
  return { empty: false, items, total }
}

export async function POST(request: Request) {
  const secretHeader = request.headers.get('x-pabbas-ai-secret')?.trim()
  const expectedSecret = process.env.PABBAS_AI_WEBHOOK_SECRET?.trim()

  if (!expectedSecret || secretHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { channel_user_id, action, menu_item_id, quantity } = body

  if (!channel_user_id) {
    return NextResponse.json({ error: 'channel_user_id is required' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Ensure cart exists
  const { data: cartData, error: cartError } = await adminClient
    .from('ai_carts')
    .select('items')
    .eq('channel_user_id', channel_user_id)
    .single()

  let currentItems: any[] = []
  if (!cartError && cartData?.items) {
    currentItems = Array.isArray(cartData.items) ? cartData.items : []
  }

  if (action === 'get') {
    return NextResponse.json(formatCartResponse(currentItems))
  }

  if (action === 'clear') {
    await adminClient
      .from('ai_carts')
      .upsert({ channel_user_id, items: [] }, { onConflict: 'channel_user_id' })
    return NextResponse.json(formatCartResponse([]))
  }

  if (!menu_item_id) {
    return NextResponse.json({ error: 'menu_item_id is required for modify actions' }, { status: 400 })
  }

  // Fetch menu item details to ensure validity and get price
  const { data: menuItem, error: menuError } = await adminClient
    .from('menu_items')
    .select('id, item_name, price, available')
    .eq('id', menu_item_id)
    .single()

  if (menuError || !menuItem) {
    return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
  }

  if (!menuItem.available) {
    return NextResponse.json({ error: `Menu item ${menuItem.item_name} is currently unavailable` }, { status: 400 })
  }

  const existingItemIndex = currentItems.findIndex(i => i.menu_item_id === menu_item_id)
  
  if (action === 'add' || action === 'update') {
    const qty = Number(quantity) || 1
    if (qty <= 0) {
      if (existingItemIndex > -1) currentItems.splice(existingItemIndex, 1)
    } else {
      if (existingItemIndex > -1) {
        currentItems[existingItemIndex].quantity = action === 'add' ? currentItems[existingItemIndex].quantity + qty : qty
      } else {
        currentItems.push({
          menu_item_id: menuItem.id,
          name: menuItem.item_name,
          price: menuItem.price,
          quantity: qty
        })
      }
    }
  } else if (action === 'remove') {
    if (existingItemIndex > -1) currentItems.splice(existingItemIndex, 1)
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { error: upsertError } = await adminClient
    .from('ai_carts')
    .upsert({ channel_user_id, items: currentItems, updated_at: new Date().toISOString() }, { onConflict: 'channel_user_id' })

  if (upsertError) {
    return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 })
  }

  return NextResponse.json(formatCartResponse(currentItems))
}
