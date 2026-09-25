import { NextResponse } from 'next/server'
import { getSessionCookie } from '@/lib/session/cookies'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_CART_ITEMS = 50
const MAX_QUANTITY_PER_ITEM = 20

function normalizeOrderType(value: unknown): 'delivery' | 'takeaway' | 'dine-in' | null {
  if (value === 'delivery' || value === 'dine-in') return value
  if (value === 'pickup') return 'takeaway'
  return null
}

function isValidPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

export async function POST(request: Request) {
  try {
    const session = await getSessionCookie()
    if (!session || !session.customerId) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 })
    }

    const body = await request.json()
    const {
      order_type,
      customer_name,
      customer_phone,
      delivery_address,
      landmark,
      pincode,
      scheduled_time,
      payment_method,
      idempotency_key,
      cart_items,
      table_id,
      party_size,
    } = body

    const normalizedOrderType = normalizeOrderType(order_type)
    if (!normalizedOrderType) {
      return NextResponse.json({ error: 'Invalid order type' }, { status: 400 })
    }

    if (!Array.isArray(cart_items) || cart_items.length === 0 || cart_items.length > MAX_CART_ITEMS) {
      return NextResponse.json({ error: 'Cart cannot be empty' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data: customerData } = await adminClient
      .from('app_customers')
      .select('name, phone')
      .eq('id', session.customerId)
      .single()

    const resolvedName = typeof customer_name === 'string' && customer_name.trim() ? customer_name.trim() : customerData?.name || 'Valued Customer'
    const resolvedPhone = typeof customer_phone === 'string' && customer_phone.trim() ? customer_phone.trim() : customerData?.phone || ''

    if (!resolvedPhone) {
      return NextResponse.json({ error: 'Customer phone is required' }, { status: 400 })
    }

    if (normalizedOrderType === 'dine-in' && (!table_id || typeof table_id !== 'string')) {
      return NextResponse.json({ error: 'Table selection is required for dine-in orders' }, { status: 400 })
    }

    if (normalizedOrderType === 'delivery' && (!delivery_address || typeof delivery_address !== 'string' || !delivery_address.trim())) {
      return NextResponse.json({ error: 'Delivery address is required for delivery orders' }, { status: 400 })
    }

    const validatedItems: Array<{ menu_item_id: string; quantity: number }> = []
    for (const item of cart_items) {
      if (!item || typeof item !== 'object') {
        return NextResponse.json({ error: 'Invalid cart item' }, { status: 400 })
      }

      const menuItemId = typeof item.menu_item_id === 'string' ? item.menu_item_id : null
      const itemQuantity = typeof item.quantity === 'number' ? item.quantity : Number(item.quantity)

      if (!menuItemId) {
        return NextResponse.json({ error: 'Each cart item requires a menu_item_id.' }, { status: 400 })
      }

      if (!Number.isInteger(itemQuantity) || itemQuantity <= 0 || itemQuantity > MAX_QUANTITY_PER_ITEM) {
        return NextResponse.json({ error: 'Invalid item quantity' }, { status: 400 })
      }

      validatedItems.push({ menu_item_id: menuItemId, quantity: itemQuantity })
    }

    const menuItemIds = validatedItems.map((item) => item.menu_item_id)
    const { data: liveMenuItems, error: menuError } = await adminClient
      .from('menu_items')
      .select('id, item_name, price, available')
      .in('id', menuItemIds)

    if (menuError) {
      console.error('[POST /api/orders] Menu lookup failed:', menuError.message)
      return NextResponse.json({ error: 'Unable to load menu items' }, { status: 500 })
    }

    const menuLookup = new Map<string, { id: string; item_name: string; price: number; available: boolean }>()
    for (const row of liveMenuItems ?? []) {
      menuLookup.set(row.id, {
        id: row.id,
        item_name: row.item_name,
        price: Number(row.price),
        available: Boolean(row.available),
      })
    }

    const orderedItems: Array<{ menu_item_id: string; item_name: string; quantity: number; unit_price: number; line_total: number }> = []
    let total = 0

    for (const item of validatedItems) {
      const menuItem = menuLookup.get(item.menu_item_id)
      if (!menuItem || menuItem.available !== true) {
        return NextResponse.json({ error: 'One or more menu items are unavailable' }, { status: 400 })
      }

      const unitPrice = Number(menuItem.price)
      if (!Number.isFinite(unitPrice)) {
        return NextResponse.json({ error: 'Invalid menu item price' }, { status: 400 })
      }

      const lineTotal = unitPrice * item.quantity
      total += lineTotal
      orderedItems.push({
        menu_item_id: item.menu_item_id,
        item_name: menuItem.item_name,
        quantity: item.quantity,
        unit_price: unitPrice,
        line_total: lineTotal,
      })
    }

    let tableNumber: string | null = null
    if (normalizedOrderType === 'dine-in' && table_id) {
      const { data: tableRow, error: tableError } = await adminClient
        .from('restaurant_tables')
        .select('table_number')
        .eq('id', table_id)
        .maybeSingle()

      if (tableError) {
        console.error('[POST /api/orders] Table lookup failed:', tableError.message)
        return NextResponse.json({ error: 'Invalid table selection' }, { status: 400 })
      }

      tableNumber = tableRow?.table_number ?? null
    }

    const orderNumberResult = await adminClient.rpc('next_order_number', { src: 'pwa' })
    if (orderNumberResult.error) {
      console.error('[POST /api/orders] next_order_number failed:', orderNumberResult.error.message)
      return NextResponse.json({ error: 'Unable to generate order number' }, { status: 500 })
    }

    const orderNumber = typeof orderNumberResult.data === 'string' ? orderNumberResult.data : null
    if (!orderNumber) {
      return NextResponse.json({ error: 'Unable to generate order number' }, { status: 500 })
    }

    const liveOrderType = normalizedOrderType === 'takeaway' ? 'takeaway' : normalizedOrderType
    const orderInsertPayload = {
      order_number: orderNumber,
      customer_phone: resolvedPhone,
      customer_name: resolvedName,
      items: orderedItems.map((item) => `${item.item_name} x ${item.quantity}`).join(', '),
      total: Number(total.toFixed(2)),
      status: 'new',
      order_type: liveOrderType,
      source: 'pwa',
      address: normalizedOrderType === 'delivery' ? (typeof delivery_address === 'string' ? delivery_address.trim() : null) : null,
      landmark: normalizedOrderType === 'delivery' ? (typeof landmark === 'string' ? landmark.trim() : null) : null,
      city: null,
      pincode: normalizedOrderType === 'delivery' ? (typeof pincode === 'string' ? pincode.trim() : null) : null,
      table_number: normalizedOrderType === 'dine-in' ? tableNumber : null,
      items_json: orderedItems.map((item) => ({
        menu_item_id: item.menu_item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    }

    const { data: createdOrder, error: createdOrderError } = await adminClient
      .from('orders')
      .insert(orderInsertPayload)
      .select('id, order_number, status, order_type')
      .single()

    if (createdOrderError || !createdOrder) {
      console.error('[POST /api/orders] Order insert failed:', createdOrderError?.message || 'No order returned')
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    const orderItemsPayload = orderedItems.map((item) => ({
      order_id: createdOrder.id,
      menu_item_id: item.menu_item_id,
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      size: null,
      notes: null,
    }))

    const { error: orderItemsError } = await adminClient.from('order_items').insert(orderItemsPayload)

    if (orderItemsError) {
      console.error('[POST /api/orders] Order item insert failed:', orderItemsError.message)

      const { error: cleanupError } = await adminClient.from('orders').delete().eq('id', createdOrder.id)
      if (cleanupError) {
        console.error('[POST /api/orders] Failed to clean up orphaned order after item insert failure:', cleanupError.message)
      }

      return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      order: {
        order_number: createdOrder.order_number,
        order_type: createdOrder.order_type,
        order_status: createdOrder.status,
        is_duplicate: false,
      },
    })
  } catch (err: any) {
    console.error('[POST /api/orders] Internal error:', err?.message || 'Failed to place order')
    return NextResponse.json({ error: err?.message || 'Failed to place order' }, { status: 500 })
  }
}

