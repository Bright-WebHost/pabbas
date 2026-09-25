import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchProductionMenuItems } from '@/lib/menu/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAdminClient();
    console.info('[GET /api/menu] Fetching menu items');
    const items = await fetchProductionMenuItems(supabase);

    if (items === null) {
      console.error('[GET /api/menu] Menu fetch failed.');
      return NextResponse.json(
        { error: 'MENU_FETCH_FAILED', message: 'Unable to load menu' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (items.length === 0) {
      console.info('[GET /api/menu] Menu fetch succeeded with zero active items.');
      return NextResponse.json({ items: [] }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    console.info(`[GET /api/menu] Menu fetch succeeded: ${items.length} items.`);
    return NextResponse.json({ items }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    console.error('[GET /api/menu] Unexpected error:', error instanceof Error ? { message: error.message } : 'Unknown error');
    return NextResponse.json(
      { error: 'MENU_FETCH_FAILED', message: 'Unable to load menu' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
