# Rasoi Feature Parity Rollout

This update ports features visible in Rasoi production and documented as
deployed: dashboard, order-management, WhatsApp inbound reliability, stock,
reporting, and customer-management views. It deliberately
does not replace PubBaz's menu catalog, menu seed, restaurant defaults, branding,
or credentials.

## Candidate migrations — not ready to apply

**Do not run these yet.** The sequence below is only a dependency-order draft.
The actual Pabbas Supabase schema has not been inspected, and the repository
contains conflicting schema definitions:

- [`pabbas_oceana_compatible_schema.sql`](../../supabase/pabbas_oceana_compatible_schema.sql)
  identifies itself as a design migration that is not applied and describes
  tables without the `app_customers` / `menu_item_variants` contract used by the
  new order RPC.
- The older [`phase5_orders.sql`](../../supabase/phase5_orders.sql) uses a
  different UUID/paise order model, with fields unlike the numeric-rupee
  `orders` columns assumed by the ported RPC.

For example, `20261029_ycloud_inbound_atomic_orders.sql` expects
`app_customers`, `menu_item_variants`, `orders.customer_id`, `orders.total_amount`,
`orders.delivery_address`, and other Oceana-style fields. A passing build cannot
confirm those objects exist in the target database. Before any migration is
approved, compare a **read-only** schema inventory from the actual Pabbas
project with every migration's tables, columns, functions, triggers, and RLS
policies; then adapt the SQL to that schema and review the resulting diff.

### Read-only target inventory (2026-11-11)

The configured Pabbas Supabase PostgREST schema metadata was queried without
reading customer/order rows or making writes. It exposes `orders` without
`customer_id`, `total_amount`, `delivery_address`, `idempotency_key`, or
`party_size`; `menu_items` has a `variants` JSON column but no exposed
`menu_item_variants` table; `order_items` has no `variant_id`; and
`restaurant_tables` has no exposed `capacity` column. The exposed RPC list also
does not include `create_customer_order_atomic`,
`create_customer_order_with_notes_atomic`, `claim_ycloud_events`, or
`finish_ycloud_event`.

This directly conflicts with the assumptions in the candidate order, notes,
table, and inbox migrations. PostgREST metadata does not expose database
triggers or RLS policy definitions, so those still need a separate schema-only
inspection. **Do not apply any candidate migration or deploy the dependent
ordering changes until these mismatches are resolved.**

### Compatibility matrix from the live API inventory

This is a read-only compatibility check against the live public schema. It
does not prove that a migration is safe to apply because PostgREST does not
expose triggers, indexes, constraints, grants, or policy definitions.

| Candidate migration | Result | Reason |
| --- | --- | --- |
| `20261028_ycloud_event_inbox.sql` | **Conditionally compatible** | The new inbox table and indexes are additive, but RLS and grants still require database-level review. |
| `20261029_inbound_bundle.sql` | **Blocked** | Existing `messages`, `orders`, `menu_items`, `ai_carts`, `reviews`, `settings`, and `delivery_pincodes` resources exist, but the migration depends on function definitions and constraints not visible through the API. |
| `20261029_ycloud_event_claims.sql` | **Blocked** | Requires the inbox table and creates RPCs not currently exposed; function security and grants need review. |
| `20261029_ycloud_inbound_atomic_orders.sql` | **Incompatible** | References missing `app_customers`, `menu_item_variants`, `orders.customer_id`, `orders.total_amount`, `orders.delivery_address`, `orders.payment_method`, `orders.idempotency_key`, `orders.party_size`, and `order_items.variant_id`. |
| `20261029_zz_order_item_special_notes.sql` | **Incompatible** | `order_items.notes` exists, but its wrapper calls the unavailable atomic-order RPC and updates the missing `order_items.variant_id` column. |
| `20261029_zzz_table_qr_bill.sql` | **Compatible by exposed columns** | Both bill columns are additive to `orders`; trigger, grant, and policy impact still needs database-level review. |
| `20261030_dinein_pos_table_tracking.sql` | **Incompatible** | `restaurant_tables.updated_at` is additive, but `create_pos_order` inserts missing order columns and `order_items.variant_name`, which are not part of the live API contract. |
| `20261031_stock_pnl.sql` | **Conditionally compatible** | Stock tables and menu stock columns are additive, but existing `riders`, RBAC functions, policies, and order triggers must be checked before applying. |
| `20261031_zz_guest_pwa_orders.sql` | **Blocked** | Explicitly requires the unavailable atomic-order RPC and its Oceana-style schema. |
| `20261102_enforce_customer_order_settings.sql` | **Conditionally compatible** | The live `orders` and `settings` resources expose the referenced fields, but the trigger could reject existing application paths and needs a database-level review. |

The live contract uses `customers` rather than the candidate
`app_customers` model, stores menu variants in `menu_items.variants`, and
stores order totals in `orders.total`. The candidate migrations must therefore
be redesigned around the existing Pabbas schema rather than applying the
Oceana-compatible order model.

### Implemented compatibility slice

The checkout path now uses the live Pabbas contract directly:

- `lib/orders/create.ts` reads customers, menu items, and JSON variants from
  their live tables.
- Orders are written using `orders.total`, `orders.address`, `orders.items_json`,
  and the existing order columns; order lines use the live `size` and `notes`
  fields.
- `20261111_pabbas_customer_order_compatibility.sql` adds only
  `orders.payment_method` and a partial unique `orders.idempotency_key` index.
- `/api/session/me` now resolves session customer details from `customers`.

The migration was applied to the live Pabbas project on 2026-11-11 and
verified through PostgREST: both new columns are exposed by `orders` and the
orders endpoint accepts them. The direct checkout path is intentionally not
described as fully atomic: the order and order-line inserts are separate
writes, so a database RPC should be introduced only after a staging schema
test confirms the exact live constraints.

### Safe migration batch prepared

The following migrations are now reconciled with the exposed Pabbas contract
and may be run individually, in this order, after a database backup:

1. `20261028_ycloud_event_inbox.sql`
2. `20261029_inbound_bundle.sql`
3. `20261029_ycloud_event_claims.sql`
4. `20261029_zzz_table_qr_bill.sql`
5. `20261030_dinein_pos_table_tracking.sql`
6. `20261031_stock_pnl.sql`
7. `20261102_enforce_customer_order_settings.sql`

The POS migration was adapted to use live `orders.total`, `orders.address`,
and `order_items.size`; it no longer references `total_amount`,
`delivery_address`, or `order_items.variant_name`. The inbound bundle no
longer recreates the idempotency index already applied by the compatibility
migration.

These seven migrations were **not applied** from this environment because the
Supabase dashboard session is signed out and no SQL execution connection is
available. Run them one at a time in Supabase SQL Editor and stop on the first
error. The following remain intentionally blocked and must not be run:
`20261029_ycloud_inbound_atomic_orders.sql`,
`20261029_zz_order_item_special_notes.sql`, and
`20261031_zz_guest_pwa_orders.sql`.

### Table capacity follow-up

The live `restaurant_tables` rows exist, but the original table migration did
not add `capacity`. The dashboard therefore received an empty result when its
capacity-select query failed, while duplicate checks correctly reported that
table numbers such as `1` already existed. Run
`20261112_restaurant_table_capacity.sql` once; the UI also has a two-seat
fallback so existing tables remain visible before that migration is applied.

### POS RPC correction

The first live POS RPC adaptation contained two extra values in the
`orders` insert, causing `INSERT has more expressions than target columns`.
Run `20261112_fix_create_pos_order_rpc.sql` once in Supabase SQL Editor to
replace the function. It does not create an order or modify existing data.

Tentative order after schema reconciliation:

1. `supabase/migrations/20261028_ycloud_event_inbox.sql`
2. `supabase/migrations/20261029_inbound_bundle.sql`
3. `supabase/migrations/20261029_ycloud_event_claims.sql`
4. `supabase/migrations/20261029_ycloud_inbound_atomic_orders.sql`
5. `supabase/migrations/20261029_zz_order_item_special_notes.sql`
6. `supabase/migrations/20261029_zzz_table_qr_bill.sql`
7. `supabase/migrations/20261030_dinein_pos_table_tracking.sql`
8. `supabase/migrations/20261031_stock_pnl.sql`
9. `supabase/migrations/20261031_zz_guest_pwa_orders.sql`
10. `supabase/migrations/20261102_enforce_customer_order_settings.sql`

If compatible after review, these migrations update the existing PubBaz ordering schema and add stock,
recipe, expense, rider-payment, inbox, and order-tracking support. Do **not**
run Rasoi initialization or menu SQL against PubBaz. The feature migrations do
not insert menu items or alter existing menu prices.

## Configure WhatsApp forwarding

The durable YCloud inbox forwards when the URL and shared secret are
configured. Set `PABBAS_WHATSAPP_FORWARDING_ENABLED=false` to explicitly
disable forwarding; otherwise forwarding requires these deployment settings:

- `PABBAS_WHATSAPP_FORWARDING_ENABLED=true`
- `N8N_WHATSAPP_INBOUND_WEBHOOK_URL` set to the Pabbas inbound workflow URL
- `PABBAS_WHATSAPP_INBOUND_SECRET` set to the same secret used by the protected
  Pabbas API routes and n8n Header Auth credential

Keep `YCLOUD_WEBHOOK_SECRET` configured for signature verification. Add a
scheduled POST once per minute to
`/api/internal/ycloud-inbox/drain`, authenticated with the Pabbas shared-secret
header (`x-pabbas-whatsapp-secret`). The webhook also makes a small
post-response forwarding attempt; the scheduled call retries events when n8n
is unavailable. Do not copy Rasoi workflow credentials or secrets.

## Stock and P&L setup

The Stock and P&L pages require the stock migration and staff permissions from
the existing PubBaz RBAC setup. After applying migrations:

1. Configure stock tracking, ingredient units, recipes, and opening balances.
2. Review and enter operating expenses.
3. Verify stock and report totals against a physical count and known orders.
4. Confirm recipe coverage before using P&L profit figures. The UI flags
   incomplete recipe costs rather than treating missing costs as zero.

The migration does not add ingredient or menu seed data. Recipe costs are based
on the currently configured ingredient costs; they are not historical
cost-of-goods snapshots.

## Deferred or not verified as operational

- **WhatsApp contact blocking:** excluded because Rasoi's status record labels
  it migration-pending; it is not verified as live.
- **YCloud status callbacks:** excluded because production is not subscribed to
  `whatsapp.message.updated`.
- **Tables:** the live page exists, but currently shows zero configured tables.
  Configure tables and verify dine-in workflows before relying on them.
- **WhatsApp ordering:** inbound forwarding has prior production evidence, but
  a fresh post-unpause end-to-end order and reply were not tested in this audit.
- **P&L accuracy:** the live report warns recipe coverage is incomplete. Do not
  treat displayed profit as complete until recipes and costs are entered and
  reconciled.
- **Blast campaigns and delivery fulfillment:** Rasoi's status record notes
  that no approved WhatsApp templates or active riders are currently available.

## Verification

From the repository root:

```powershell
npx tsc --noEmit
node --test test/*.test.mjs
npm run build
```

The opt-in inbox database concurrency test additionally requires a dedicated
test database and `RUN_DB_TESTS=1`. Do not point that test at production.
