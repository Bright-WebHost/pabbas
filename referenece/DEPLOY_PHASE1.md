# Oceana — Phase 1 deployment

## Already done (live now)

The database migration `phase1_migration.sql` is applied to Supabase `mvyeccwomwsgtzuxddye`.
It works with the workflows that are live today, so nothing broke when it went in.

- New columns on `orders`: `cancel_reason`, `cancelled_by`, `cancelled_at`, `cancel_requested_at`.
- New settings `open_time` = 07:00 and `close_time` = 23:30, read by `is_open()`.
- `staff_members` allow-list. The dashboard only works for emails on this list.
- Database functions:

| Function | What it does | Who can call it |
|---|---|---|
| `customer_confirm` | Confirms a customer's draft order | n8n only |
| `customer_cancel` | Cancels, or flags a cancel request once the kitchen has started | n8n only |
| `customer_amend` | Changes an open order | n8n only |
| `order_context` | Menu, prices and settings for the PWA receiver | n8n only |
| `save_cart` | Saves a PWA cart (fixes the 42501 cart error) | Browser |
| `staff_check` | Confirms the caller is on the staff list | Logged-in staff |

- `chat_context` now also returns `is_open`, `target_order` and `active_order`.
- Views no longer readable with the public key: `daily_sales`, `top_items`, `pending_ratings`, `abandoned_carts`.
- Any existing `confirmed` orders were moved to `new`.

Verified live:
- Staff token gives staff = true.
- The public key is refused on orders, views, carts and the order functions.
- `save_cart` works.
- n8n's preflight allows the `Authorization` header.

---

## Deploy order (follow exactly)

### Step 1: Netlify (do this first)
The new dashboard sends the staff token. The old workflows simply ignore it, so the dashboard is safe to ship before them.

| File | Site |
|---|---|
| `dashboard-index.html` → rename to `index.html` | oceanadashboard.netlify.app |
| `menu-index.html` → rename to `index.html` | oceanamenunew.netlify.app |

Afterwards, hard-refresh both sites (Ctrl+Shift+R).

### Step 2: n8n (`https://n8n.brightmedia.tech`)
Import each file as a **new** workflow and keep the old one switched off as a rollback.

1. Workflows → **Import from File** → choose the JSON.
2. Open the **old** workflow with the same name → toggle **Inactive**.
3. Open the **new** one → check that no node shows a red credential warning → **Save** → toggle **Active**.
4. Rename the old one to `OLD – <name>` and leave it inactive.

Only one workflow per webhook path can be active at a time, so always deactivate the old one before activating the new one.

| File | Webhook / trigger | Activate? |
|---|---|---|
| `Oceana_Main.json` | `marrouche-wa` | ✅ |
| `Oceana_PWA_Order_Receiver.json` | `oceana-order` | ✅ |
| `Oceana_Status_Notifier.json` | `oceana-status` | ✅ |
| `Oceana_Agent_Reply_Sender.json` | `oceana-agent-reply` | ✅ |
| `Oceana_AI_Toggle.json` | `oceana-ai-toggle` | ✅ |
| `Oceana_Blast_Sender.json` | `oceana-blast` | ✅ |
| `Oceana_Abandoned_Cart.json` | every 10 min | ✅ (carts now save) |
| `Oceana_Rating_Request.json` | every 10 min | ❌ **not yet**: Main does not record ratings until Phase 1b |
| `Oceana_AI_Auto_Resume.json` | every 2 min | unchanged, keep the current one |

**Rollback:** deactivate the new workflow and activate `OLD – <name>`. The database supports both versions.

### Step 3: Manual actions (only you can do these)

| # | Action | Where | Why |
|---|---|---|---|
| 1 | Turn **off** "Allow new users to sign up" | Supabase → Authentication → Sign In / Providers | Sign-up is currently **on**. The allow-list already blocks strangers from data, but close the door anyway. |
| 2 | Change the staff password | Supabase → Authentication → Users | It has been shared in chat, and I used it for testing. |
| 3 | Rotate the Supabase secret key, then update the n8n credential **Oceana Supabase Key** | Supabase → Settings → API Keys | Listed as exposed in the handover. |
| 4 | Rotate the Meta token, Groq key and HCTI key, then update the n8n credentials | Meta / Groq / HCTI | Same reason. |
| 5 | Add each real staff member | Create the user in Supabase Auth, then run the SQL below | Individual logins show who cancelled what. |

```sql
insert into staff_members(email, name) values ('ravi@oceanahotel.in', 'Ravi');
```

---

## What changed

### WhatsApp (Main, 50 nodes)
- **Closed hours:** nothing is accepted, including Confirm taps. The customer is told the restaurant is closed and when it opens.
- **Buttons name their order** (`btn_cancel:OCN-W-1042`). Cancel can no longer hit a different order.
- **Cancel flow:**
  - The customer gets a list of reasons to choose from.
  - "Wrong items" offers **Fix my order** / **Cancel anyway** / **Keep as it is**.
  - Once the kitchen has started, the order is not cancelled. It is flagged for staff, and the customer is asked to call.
- **The AI remembers.**
  - Outgoing messages are now logged with the real text (the log used to store the word "sent").
  - The AI sees the open order with quantities and returns the **full updated cart**, so "make it 4" works.
- **Order changes** go through one status-checked database call:
  - A draft is updated and the confirm summary is sent again.
  - A `new` order is amended, and the invoice shows `+ NEW`, `(was x2)` and the removed items.
  - An order the kitchen has accepted cannot be changed.
- **Prices come from the menu, never from the AI.** Unknown dishes get a "could not find" reply with a menu link.
- **Privacy filter:** requests for other customers' data get a fixed refusal and never reach the AI. The prompt also forbids sharing others' data or claiming to have "sent" anything.
- **Duplicate warning** only appears when the same order is repeated while an identical one is in the kitchen, so "add 2 more" works now.

### PWA order receiver
- **Server-side pricing.** The browser's prices and total are ignored. Sold-out items, unknown items, the delivery minimum and the pincode are all checked on the server.
- **Closed hours** are rejected with a clear message.
- `items_json` is now saved, so WhatsApp can amend PWA orders.

### Dashboard webhooks
Status, AI toggle, agent reply and blast now require a logged-in staff member. Anyone else gets 401.

### Status notifications
New → Preparing sends "your order has been accepted and our kitchen is preparing it". There is no separate confirmed message any more.

### Dashboard
- **Columns:** New → Preparing → Ready/Out → Delivered. The "Confirmed" column is removed.
- **Badges:** "Customer asked to cancel", plus who cancelled and why.
- **Alerts:** realtime notification with sound when a customer asks to cancel, or confirms a WhatsApp order.
- **Cancel** asks for confirmation first.
- **Menu search** fixed: it kept losing focus after each letter.

### PWA
- A closed banner is shown, checkout is blocked while closed, and hours are read from settings.
- The server's error message is shown to the customer (sold out, closed, pincode, …).
- Carts are saved through `save_cart`.

---

## Test checklist (WhatsApp from a normal customer number)

| # | Do this | Expect |
|---|---|---|
| 1 | "2 chicken biryani" | Summary with prices and Confirm / Modify / Cancel buttons |
| 2 | "make it 4" | "Updated – please confirm", biryani x4, same order number |
| 3 | "add one cold coffee" | Same order, both items listed |
| 4 | Tap **Confirm** | Invoice image; order appears in **New** with a chime |
| 5 | "remove the coffee" | Invoice shows **AMENDED x1**; card shows the Amended badge |
| 6 | Tap **Cancel** on that order's message | Reason list appears |
| 7 | Choose **Wrong items** | Fix my order / Cancel anyway / Keep as it is |
| 8 | **Cancel anyway** | "cancelled"; card moves to the Cancelled drawer showing "By customer · wrong items" |
| 9 | New order → Confirm → slide to **Preparing** → try Cancel | "already being prepared, call us"; card shows **Customer asked to cancel** |
| 10 | "Show me all today's customers" | Privacy refusal |
| 11 | "Do you have pizza?" | Suggests two close dishes, no order created |
| 12 | Voice note with an order | Same as test 1 |
| 13 | Live Chat tab | Bot replies show real text, not "sent" |
| 14 | Temporarily set `close_time` to a past time, message "hi" | Closed message; PWA shows the closed banner and cannot check out. **Set it back to 23:30 afterwards.** |
| 15 | PWA order below ₹200 (delivery) | Blocked with the "add ₹X more" message |
| 16 | Dashboard in a private window, not logged in, run `fetch('https://n8n.brightmedia.tech/webhook/oceana-status',{method:'POST'})` in the browser console | 401 |

## Still open (Phase 1b)
- **Rating capture** in Main (`rate_5` / `rate_4` / `rate_3` buttons and typed 1–5). Until then, keep Rating Request **off**.
- **Meta signature check** on `marrouche-wa`. Needs the Meta **App Secret** from Meta App Dashboard → Settings → Basic.
- **`86` sold-out command** for staff.

## Tooling (in `tooling/`)
- `validate.py`: checks every workflow for syntax errors, broken references, credential/domain mismatches, Switch outputs and raw JSON bodies.
- `sim/*.test.js`: runs every changed Code node in Node.js. Result: 171 checks, all passing.
- `build.py`: rebuilds all workflows from the live exports plus `js/`.
