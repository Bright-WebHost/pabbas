import type { SupabaseClient } from '@supabase/supabase-js'
import type { MenuItem } from '@/lib/types'
import type { Database, SupabaseMenuRow, MenuItemRow } from '@/lib/supabase/types'
import { menuItems as localMenuItems, categories as localCategories, featuredItems as localFeaturedItems, displayCategory } from '@/lib/menu-data'

// ---------------------------------------------------------------------------
// Helpers — transform a Supabase row into the frontend MenuItem shape
// ---------------------------------------------------------------------------

/**
 * Generates a deterministic placeholder image URL from a menu item name.
 */
function placeholderImage(name: string): string {
  const photos = [
    'photo-1579954115545-a95591f28bfc',
    'photo-1551024601-bec78aea704b',
    'photo-1497034825429-c343d7c6a68f',
    'photo-1560008581-09826d1de69e',
    'photo-1572490122747-3968b75cc699',
    'photo-1563805042-7684c019e1cb',
    'photo-1570197788417-0e82375c9371',
  ]
  const idx = name.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % photos.length
  return `https://images.unsplash.com/${photos[idx]}?auto=format&fit=crop&w=900&q=85`
}

/**
 * Converts a Supabase legacy `menu` row to the frontend `MenuItem` type.
 */
function rowToMenuItem(row: SupabaseMenuRow): MenuItem {
  return {
    id: String(row.id),
    name: row.name,
    category: row.category,
    description: row.description,
    price: row.price,
    image: placeholderImage(row.name),
    vegetarian: row.vegetarian,
  }
}

/**
 * Converts a production `menu_items` row (with category name) to the frontend `MenuItem` type.
 * Converts integer price_paise to Rupee amount strictly at the UI display boundary.
 */
function rowToProductionMenuItem(row: MenuItemRow & { menu_categories?: { name: string } }): MenuItem {
  return {
    id: row.id,
    name: row.name,
    category: row.menu_categories?.name || 'Desserts',
    description: row.description || '',
    price: Math.round(row.price_paise / 100),
    image: row.image || placeholderImage(row.name),
    vegetarian: row.vegetarian,
    badge: row.badge || undefined,
    featured: row.featured,
  }
}

// ---------------------------------------------------------------------------
// Query functions (server-side)
// ---------------------------------------------------------------------------

type SupabaseServerClient = SupabaseClient<Database>

/**
 * Fetches all active production menu items from Supabase menu_items table.
 */
export async function fetchProductionMenuItems(client: SupabaseServerClient): Promise<MenuItem[] | null> {
  const { data, error } = await client
    .from('menu_items')
    .select('*, menu_categories(name)')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('[menu/queries] Failed to fetch production menu items:', error.message)
    return null
  }

  return (data as any[]).map(rowToProductionMenuItem)
}

/**
 * Legacy query: Fetches all menu items from practice `menu` table.
 */
export async function fetchMenuItems(client: SupabaseServerClient): Promise<MenuItem[] | null> {
  const { data, error } = await client
    .from('menu')
    .select('*')
    .order('id', { ascending: true })

  if (error) {
    console.error('[menu/queries] Failed to fetch menu items:', error.message)
    return null
  }

  return data.map(rowToMenuItem)
}

/**
 * Legacy query: Fetches a single menu item by its database id.
 */
export async function fetchMenuItemById(client: SupabaseServerClient, id: number): Promise<MenuItem | null> {
  const { data, error } = await client
    .from('menu')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('[menu/queries] Failed to fetch menu item:', error.message)
    return null
  }

  return rowToMenuItem(data)
}

// ---------------------------------------------------------------------------
// Local fallback accessors
// ---------------------------------------------------------------------------

export function getLocalMenuItems(): MenuItem[] {
  return localMenuItems
}

export function getLocalCategories(): string[] {
  return localCategories
}

export function getLocalFeaturedItems(): MenuItem[] {
  return localFeaturedItems
}

export { displayCategory }

