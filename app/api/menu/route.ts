import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchProductionMenuItems } from '@/lib/menu/queries';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const items = await fetchProductionMenuItems(supabase);
    
    if (!items) {
      return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 });
    }

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('[GET /api/menu] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
