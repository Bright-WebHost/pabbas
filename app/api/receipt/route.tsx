import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { gstBreakup } from '@/lib/settings'
import { getSettings } from '@/lib/settings/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderNumber = searchParams.get('order_number')

    if (!orderNumber) {
      return new Response('Order number is required', { status: 400 })
    }

    const adminClient = createAdminClient()
    const [{ data: order, error }, settings] = await Promise.all([
      adminClient.from('orders').select('*, order_items(*)').eq('order_number', orderNumber).single(),
      getSettings(),
    ])

    if (error || !order) {
      return new Response('Order not found', { status: 404 })
    }

    const rawItems = (order.order_items && order.order_items.length > 0)
      ? order.order_items
      : (Array.isArray(order.items_json) ? order.items_json : [])
    const items = rawItems.map((item: any, idx: number) => ({
      id: item.id || `item-${idx}`,
      item_name: item.item_name || item.name || 'Item',
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price || item.price || 0)
    }))
    
    const itemsSubtotal = items.reduce((sum: number, item: any) => sum + item.unit_price * item.quantity, 0)
    const deliveryFee = Number(order.delivery_fee || 0)
    const gst = gstBreakup(itemsSubtotal, settings.gstPercent)
    const summaryRows: Array<[string, string]> = [
      ['Item Total', `₹${itemsSubtotal.toFixed(2)}`],
      ...(deliveryFee > 0 ? [['Delivery Fee', `₹${deliveryFee.toFixed(2)}`] as [string, string]] : []),
      ...(gst ? [[`Incl. CGST ${gst.halfRate}% + SGST ${gst.halfRate}%`, `₹${(gst.cgst + gst.sgst).toFixed(2)}`] as [string, string]] : []),
    ]

    // Format date nicely
    const date = new Date(order.created_at).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#ffffff',
            fontFamily: 'sans-serif',
            padding: '40px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '2px dashed #e5e7eb', paddingBottom: '30px', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '42px', fontWeight: 800, color: '#ef4f5f', margin: 0 }}>{settings.restaurantName.toUpperCase()}</h1>
            {settings.tagline ? <p style={{ fontSize: '18px', color: '#6b7280', marginTop: '10px', marginBottom: '5px' }}>{settings.tagline}</p> : null}
            {settings.address ? <p style={{ fontSize: '16px', color: '#9ca3af', margin: 0 }}>{settings.address}</p> : null}
            {settings.gstin ? <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '6px', marginBottom: 0 }}>GSTIN: {settings.gstin}</p> : null}
          </div>

          {/* Order Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '14px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>Order No</span>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>{order.order_number}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '14px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>Date</span>
              <span style={{ fontSize: '18px', fontWeight: 600, color: '#374151' }}>{date}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '14px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>Customer</span>
              <span style={{ fontSize: '20px', fontWeight: 600, color: '#374151' }}>{order.customer_name || 'Guest'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '14px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>Type</span>
              <span style={{ fontSize: '20px', fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>
                {order.order_type === 'dine-in' && order.table_number ? `Table ${order.table_number}` : order.order_type}
              </span>
            </div>
          </div>

          {/* Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '40px' }}>
            {items.map((item: any) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#374151', minWidth: '30px' }}>{item.quantity}x</span>
                  <span style={{ fontSize: '18px', fontWeight: 500, color: '#111827' }}>{item.item_name}</span>
                </div>
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                  ₹{(Number(item.unit_price) * Number(item.quantity)).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed #e5e7eb', paddingTop: '16px', marginBottom: '10px' }}>
            {summaryRows.map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '16px', color: '#6b7280' }}>{label}</span>
                <span style={{ fontSize: '16px', fontWeight: 600, color: '#374151' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #111827', paddingTop: '25px', marginTop: '10px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#111827' }}>Total Amount</span>
            <span style={{ fontSize: '32px', fontWeight: 800, color: '#ef4f5f' }}>₹{Number(order.total).toFixed(2)}</span>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '60px' }}>
            <p style={{ fontSize: '20px', fontWeight: 600, color: '#374151', margin: 0 }}>Thank you for your order!</p>
            <p style={{ fontSize: '16px', color: '#9ca3af', marginTop: '8px' }}>We hope to serve you again soon.</p>
          </div>
        </div>
      ),
      {
        width: 600,
        height: 640 + (items.length * 40) + (summaryRows.length * 32) + (settings.gstin ? 24 : 0),
      }
    )
  } catch (e: any) {
    console.error(e)
    return new Response('Failed to generate receipt', { status: 500 })
  }
}
