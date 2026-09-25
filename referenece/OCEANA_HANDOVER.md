# OCEANA — Handover

Paste this into a new chat, and upload the 9 workflow JSONs + 2 HTML files alongside it.

---

## 1. What this is

WhatsApp-first ordering system for **Oceana Hotel**, a multi-cuisine restaurant in Mangalore.
Customers order by WhatsApp (typed or voice) or through a PWA menu; staff run it from a
Kanban dashboard. Built by Bright Media Tech. It replaced the Marrouche system entirely —
Marrouche's WhatsApp bot was deactivated and its webhook path handed over to Oceana.

**Client facts**
- Oceana Hotel, Janapriya Complex, State Bank, Mangalore 575001
- +91 96634 28354 (also the WhatsApp Business number)
- Open 7:00 AM – 11:30 PM IST daily
- Minimum delivery order ₹200, free delivery, ~3 km radius
- Cash on delivery only (UPI planned)
- Branding: Zomato red `#E23744`, logo is a red/orange circular "OCEANA — Indian & Chinese"

⚠️ **Unresolved:** three addresses have appeared for this client — Coimbatore (on the printed
menu artwork), Mangalore (confirmed by the client, and what is built), Brookefield Bangalore
(a JustDial listing). Everything is built for Mangalore.

---

## 2. Infrastructure

| Thing | Value |
|---|---|
| n8n | `https://n8n.brightmedia.tech` on Hostinger VPS `srv1628802` |
| Supabase project | `mvyeccwomwsgtzuxddye` · ap-southeast-1 |
| Supabase URL | `https://mvyeccwomwsgtzuxddye.supabase.co` |
| PWA | `https://oceanamenunew.netlify.app` |
| Dashboard | `https://oceanadashboard.netlify.app` |
| Meta Phone Number ID | `1057952097409620` |
| WABA | `1460054592341610` |
| Meta webhook path | `marrouche-wa` (inherited — renaming needs a Meta change) |

### n8n credential IDs (hardcoded in every workflow — no manual selection on import)

| Credential | Type | ID |
|---|---|---|
| `Oceana Supabase Key` | Header Auth, `apikey` = secret key | `tBotvgQ8GwWeQ5WO` |
| `whatsapp token` | Header Auth | `1vNIxOEoQUki4NdE` |
| `Groq API` | Header Auth, `Authorization: Bearer gsk_…` | `h7IFU2kzlQ8foJ1m` |
| `HCTI API` | Basic Auth | `ofxhVtjdHtnsqIQ8` |
| `OpenAI account` | OpenAI | `9xE7IBelUtLtDEJt` |

Dashboard staff login: `staff@oceanahotel.in` / `Oceana@2026` (Supabase Auth)

**All secrets below have been exposed in chat and should be rotated:** Supabase secret key,
Supabase anon/publishable key, Meta token, Groq key, HCTI key/ID, Pexels key, staff password.

---

## 3. Database (Supabase, live)

**Tables:** `menu_items` (358 items, 35 categories) · `customers` · `orders` · `order_items` ·
`messages` · `chat_sessions` · `memory` · `promotions` · `settings` · `delivery_pincodes` ·
`reviews` · `carts` · `blast_log`

**Views:** `daily_sales` · `top_items` · `pending_ratings` · `abandoned_carts`

**Key functions**
- `chat_context(phone)` — returns customer, session, history, settings, pincodes, promos,
  compact menu digest and the open order in ONE call. Replaced six chained HTTP calls.
  ~1.4s vs ~4.1s.
- `normalize_phone(text)` — India rules. A leading 0 is a trunk prefix and IS stripped
  (the opposite of Côte d'Ivoire). Applied by trigger on customers/orders/messages/sessions.
- `next_order_number(src)` + `set_order_number()` — `OCN-W-1042` (whatsapp) / `OCN-P-` (pwa)
  / `OCN-S-` (staff), sequence-backed so they cannot collide.
- `increment_customer_orders()` — upserts the customer on order insert, so the first order
  from a new customer is never lost.
- `touch_chat_session()` — keeps `chat_sessions` in step with `messages`.
- `stamp_confirm_window()` — legacy, no longer used (the `confirmed` status is retired).
- **Phase 1 (Sept 2026):**
  - `is_open()` reads `settings.open_time` / `close_time` and is used by WhatsApp, the PWA and the receiver.
  - `chat_context(phone, order)` also returns `is_open`, `target_order` (only if it belongs to that phone) and `active_order` (already with the kitchen).
  - `customer_confirm` / `customer_cancel` / `customer_amend` are atomic, status-checked and callable by service_role only.
  - `order_context()` gives the receiver server-side prices.
  - `save_cart()` is the only way the browser can write a cart.
  - `staff_check()` / `is_staff()` implement the staff allow-list.
  - `stamp_cancel` trigger fills `cancelled_at` / `cancelled_by`.
  - New order columns: `cancel_reason`, `cancelled_by`, `cancelled_at`, `cancel_requested_at`.

**RLS model**
- publishable/anon key: reads `menu_items`, `promotions`, `settings` and `delivery_pincodes` only.
  It can call `save_cart` and `is_open`, and nothing else. No table writes. Views are revoked
  (they used to bypass RLS and leaked sales and rating data).
- `authenticated`: full access **only if the email is in `staff_members`**. Supabase sign-up
  was found open, so a login alone is not enough.
  Add staff with `insert into staff_members(email,name) values (...)`.
- `service_role` (n8n): full access.
- Verified: signed out, `orders`/`customers`/`messages`/`chat_sessions` all return 0 rows.

**Storage:** public bucket `menu` — 28 Pexels dish photos (`d-<type>.jpg`), `logo.png`,
`oceana-offer.png` (blast creative), `menu-card-1.png` / `menu-card-2.png`.

---

## 4. Workflows (9)

| Workflow | Nodes | Trigger | Status |
|---|---|---|---|
| **Oceana Main** | 50 | webhook `marrouche-wa` | active |
| Oceana PWA Order Receiver | 18 | webhook `oceana-order` | active |
| Oceana Status Notifier | 13 | webhook `oceana-status` (staff token) | active |
| Oceana Agent Reply Sender | 11 | webhook `oceana-agent-reply` (staff token) | active |
| Oceana AI Toggle | 9 | webhook `oceana-ai-toggle` (staff token) | active |
| Oceana AI Auto-Resume | 4 | schedule, 2 min | active |
| Oceana Blast Sender | 17 | webhook `oceana-blast` (staff token) | active |
| Oceana Abandoned Cart | 10 | schedule, 10 min | activate |
| Oceana Rating Request | 9 | schedule, 10 min | **keep OFF until Main records ratings** |

The four dashboard webhooks start with **Verify Staff**. It calls `rpc/staff_check` using the
publishable key plus the caller's `Authorization` header. Any caller who is not on the staff
list gets 401.

### Oceana Main — how it routes

```
Webhook → Extract Message ID → status-callback branch
        → Dedupe & Save Inbound (409 = duplicate, stops)
        → voice branch: Get Media URL → Download → Whisper → Update Transcript
        → Transcription OK?  (failed transcript gets a canned "please type it")
        → Get Context (ONE Supabase RPC)
        → Route  (checks in this order)
                  ► staff     : silent, human has taken over
                  ► canned    : CLOSED (nothing accepted, not even Confirm) or PRIVACY refusal
                  ► button    : Confirm → customer_confirm | cancel reason → customer_cancel
                                | modify / reason list / keep / wrong → Build Button Reply
                  ► greeting  : canned welcome + Browse Menu CTA, NO AI
                  ► ai        : Build Prompt → AI Agent → Parse → Order Decision
        → every reply → Prepare Send → Send WhatsApp → Save Outbound (real text logged)
```

- **Button IDs carry the order number:** `btn_confirm:OCN-W-1042`, `btn_cancel:…`, `cr_wrong:…`.
  An ID for an order that is not this phone's resolves to "no longer open". Old IDs without a
  number fall back to the latest order.
- **Order Decision** prices the cart from the menu digest and ignores AI prices. It produces
  one of: `new` · `amend` · `unknown` (dish not on menu) · `empty_cart` · `unchanged` · `reply`.
- **Amend Result** routes:
  - `updated_draft` → confirm summary again
  - `amended` → invoice
  - `locked` → reply

### The amendment rule (important)

An order can be changed **only until the kitchen accepts it**.

| Order status | Add | Remove |
|---|---|---|
| `draft`, `new` — not yet accepted | ✅ same order number | ✅ |
| `confirmed`, `preparing`, `out_for_delivery` | ❌ becomes a NEW order | ❌ locked |

There is no time window; status is the only test. The lifecycle is:
customer taps Confirm → status `new` → lands in the **New** column → kitchen slides it
→ `preparing`. **`confirmed` is retired.**

**The AI returns the COMPLETE cart**, not a diff, so "make it 4" means x4.

| Change made to… | What happens |
|---|---|
| A draft | Items are replaced and the confirm summary is sent again |
| A `new` order | Same order number; `original_items` is saved once and `amendment_count` goes up; the invoice shows `+ NEW`, `(was xN)` and the removed items; the dashboard shows **Amended ×n** |

**Cancel:**
- The customer picks a reason. "Wrong items" offers **Fix my order** first.
- `draft` / `new` orders are cancelled.
- Later statuses are **flagged** (`cancel_requested_at`), shown on the dashboard, and the customer is asked to call.

---

## 5. PWA (`menu-index.html`)

Zomato-style. Reads `menu_items` / `settings` / `delivery_pincodes` with the publishable key.
Orders POST to `oceana-order` — the browser cannot insert orders directly (RLS blocks it).

8 nav groups over 35 categories · search · veg/non-veg markers · ADD → −/+ stepper ·
sticky cart · ₹200 minimum blocked at cart level with a "add ₹X more" nudge · checkout with
pincode validated against `delivery_pincodes` · COD · order number on success · cart survives
refresh · details remembered in localStorage · accepts `?ph=` to prefill the phone.

---

## 6. Dashboard (`dashboard-index.html`)

Supabase Auth login. Amore-style: dark sidebar, red logo badge, sticky header with live pills,
Today/Yesterday/Week/Month/All Time chips, coloured stat cards.

**Orders** — 4-column Kanban with a **slide control in every column**:

| Column | Tint | Slide → |
|---|---|---|
| New | red | preparing (legacy `confirmed` rows also show here) |
| Preparing | blue | out_for_delivery (delivery) / ready_for_pickup (takeaway) |
| Ready / Out | purple | delivered |
| Delivered | green | — |

- Age timer from order placed (amber at 15 min, red at 30).
- Badges: Amended, "Customer asked to cancel", and who cancelled and why.
- Cancelled orders sit in a collapsed drawer; staff Cancel asks for confirmation first.
- Realtime chime and card flash on a new order, a WhatsApp confirm, an amendment or a cancel request.
- Thermal print receipt.
- Every n8n call goes through `hook()`, which attaches the staff access token.

**Other tabs:** Live Chat (AI on/off per customer, staff reply) · Menu (sold-out toggles) ·
Analytics · **Contacts** (CSV/paste import, number normalisation, multi-select) · Blast.

---

## 7. Invoices

HCTI renders a thermal-receipt style image — torn zigzag edges, JetBrains Mono, red payment
banner, boxed total. Same design in Main and the PWA receiver. If HCTI fails, a full text
confirmation is sent instead, never silence.

---

## 8. Blasts

Template `oceana_promo_en` — Marketing, English, **approved**, "Active – Quality pending".
Image header + static URL button. No body variables.

**Image-header templates require an image link on EVERY send** — the picture uploaded in
WhatsApp Manager is only a reviewer sample. Current creative:
`https://mvyeccwomwsgtzuxddye.supabase.co/storage/v1/object/public/menu/oceana-offer.png`
stored in `settings.blast_header_image`, editable from the Blast tab.

Sends ~1/second. Every attempt writes to `blast_log` with a `run_id`; the summary counts that
run and surfaces the real Meta error. **Oceana's own number `919663428354` is excluded** —
a business cannot WhatsApp itself, Meta returns `(#100) Invalid parameter`.

⚠️ The creative advertises Burgers, Pizzas, Loaded Wraps and Fries. **None are on the menu.**

---

## 9. Bugs found and fixed (do not reintroduce)

1. **n8n splits array responses into separate items** — `$('Get Menu').first()` returned 1 row
   of 358, so the AI believed the whole menu was one dish. Always `.all()`.
2. **Supabase needs the `apikey` header.** n8n's built-in Supabase credential sends only
   `Authorization` → 401. Use Header Auth with `apikey`.
3. **n8n auto-assigned `Groq API` to all 11 Supabase nodes** on import. Credential IDs are now
   hardcoded.
4. **SwitchV3 `fallbackOutput` must be the string `"extra"`**, never a numeric index.
5. **`alwaysOutputData` on every HTTP node** — an empty Supabase response otherwise halts the
   branch. But `{}` is truthy, so empty-object guards are needed too.
6. **Never raw JSON body for WhatsApp sends** — newlines break it. Always `JSON.stringify`.
7. **Whisper was authenticating to Groq with the Meta token** (inherited from Marrouche).
8. **Dedupe fails open** — only a 409 stops the run; any other error still replies.
9. **Blast per-item bug** — reading `.first()` inside a loop wrote every result to customer #1.
10. `Log Confirmation` referenced a node that only runs on one branch.
11. **Save Outbound logged the literal word "sent"**, so the AI had no memory of its own replies.
    All sends now pass through `Prepare Send`.
12. **The amend path never ran:** live Confirm set `confirmed`, Order Decision used an old
    2-minute window, and `chat_context` only returned draft/new. Every change created a new draft.
13. **A bare `btn_cancel` cancelled the newest draft**, not the order the customer tapped.
14. **The PWA receiver trusted browser prices.** A ₹1 order was possible.
15. **Views bypass RLS.** `daily_sales` and `pending_ratings` were readable with the public key.
    Always use `security_invoker = true` and revoke from anon.
16. **n8n Code nodes behind a new gate node must read `$('Webhook')`, not `$input`.**

**Tooling (Phase 1 package, `tooling/`):**
- `validate.py`: syntax, arrow functions, staticData, raw JSON bodies, Switch outputs,
  credential/domain match, reachability, upstream `$('Node')` references.
- `sim/*.test.js`: 171 scenario checks, including the tester's exact phrases and WhatsApp limits.
- `build.py`: regenerates every workflow from the live exports plus `js/`.

---

## 10. Outstanding

**Phase 1b (needs a Main edit):**
- Meta `X-Hub-Signature-256` check on `marrouche-wa`. Needs the Meta App Secret.
- Rating capture — the Rating Request workflow sends `rate_5` / `rate_4` / `rate_3` buttons,
  but Main's router does not handle them yet, so replies are not recorded and 4–5 star raters
  are never nudged to Google.
- `86` sold-out command — staff text `86 chicken biryani` from an authorised number.

**Not built:** nightly owner summary (needs an approved template — deferred) · UPI payments ·
"Order the usual" one-tap reorder · scheduled/pre-orders · loyalty on every 5th order ·
Kannada/Hindi/Malayalam replies (prompt supports it, canned greeting is English only).

**Known issues:**
- ~~PWA cart 42501~~: fixed in Phase 1 via `save_cart()`. The abandoned-cart view now only
  lists numbers with an inbound message in the last 23h (the Meta 24h window).
- Supabase sign-up must be switched **off**. Staff password and keys must be rotated.
- Phases 2–4 are planned: session tokens instead of `?ph=`, order-mode display, saved addresses,
  veg filter, cancel analytics, escalation, draft reminders, rate limits, individual logins,
  tracking page and reorder. **Dine-in handling is deferred.**
- Google review link points at **Bright Media Tech**, not Oceana (client said use it anyway).
- Menu prices came from the Coimbatore artwork and are unverified for Mangalore.
- Offer creative is 2.5 MB — should be compressed to under 500 KB.
- Free-tier Supabase auto-pauses after ~7 days idle. If it pauses, blast images 404.

---

## 11. Working style for whoever picks this up

- Plan before executing; show the plan and wait.
- Ask 1–3 clarifying questions on anything ambiguous rather than guessing.
- Commands fully filled in, ready to paste, no placeholders.
- Structured output — tables, bullets, files.
- Validate before handing over. Several bugs here reached production because a workflow was
  shipped on the assumption it worked.
