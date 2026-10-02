const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.clqzctntkwzahdfjeqlx:XGqW6oW8f3l2V0eP@aws-0-ap-south-1.pooler.supabase.com:6543/postgres' });
async function main() {
  await client.connect();
  await client.query(`
CREATE OR REPLACE FUNCTION public.chat_context(p_phone text, p_order text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
select jsonb_build_object(
  'is_open', public.is_open(),
  'customer', (select to_jsonb(c) from customers c where c.phone = normalize_phone(p_phone)),
  'session', (select to_jsonb(s) from chat_sessions s where s.phone = normalize_phone(p_phone)),
  'history', coalesce((select jsonb_agg(h order by h.created_at) from (select direction, sender, content, created_at from messages where phone = normalize_phone(p_phone) order by created_at desc limit 12) h), '[]'::jsonb),
  'settings', coalesce((select jsonb_object_agg(key, value) from settings), '{}'::jsonb),
  'pincodes', coalesce((select jsonb_agg(pincode) from delivery_pincodes where active), '[]'::jsonb),
  'promos', coalesce((select jsonb_agg(jsonb_build_object('title', title, 'price', promo_price)) from promotions where active), '[]'::jsonb),
  'menu', coalesce((select string_agg(id::text || '|' || item_name || '|' || case when price > 0 then round(price)::text else 'ASK' end, E'\\n' order by category, item_number) from menu_items where available), ''),
  'open_order', (select to_jsonb(o) from orders o where o.customer_phone = normalize_phone(p_phone)
                   and ((o.status = 'draft' and o.created_at > now() - interval '45 minutes') or (o.status in ('new', 'confirmed') and o.created_at > now() - interval '2 hours'))
                 order by o.created_at desc limit 1),
  'target_order', (select to_jsonb(o) from orders o where p_order is not null and o.order_number = upper(p_order) and o.customer_phone = normalize_phone(p_phone)),
  'active_order', (select to_jsonb(o) from orders o where o.customer_phone = normalize_phone(p_phone) and o.status in ('preparing', 'ready_for_pickup', 'out_for_delivery') and o.created_at > now() - interval '3 hours' order by o.created_at desc limit 1)
);
$function$;
  `);
  console.log('Success');
  await client.end();
}
main().catch(console.error);
