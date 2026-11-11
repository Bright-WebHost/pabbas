# 16. Local Development

This guide outlines how to run the entire Pabbas architecture (Next.js, Supabase, n8n, WhatsApp Simulator) on your local machine.

## Prerequisites
- Node.js (v18+)
- npm
- Supabase CLI (optional, but recommended)
- Docker (optional, if running n8n locally)
- ngrok (optional, if exposing local n8n webhooks to external services)

## 1. Environment Variables
Ensure you have a `.env.local` file in the root directory.
**Never commit this file.**

```env
# Next.js
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_WHATSAPP_NUMBER=<YOUR_PUBLIC_WHATSAPP_NUMBER>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=<YOUR_SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_ANON_KEY>
SUPABASE_SECRET_KEY=<YOUR_SERVICE_ROLE_KEY>

# YCloud and n8n inbound forwarding (optional for local development)
YCLOUD_WEBHOOK_SECRET=<YOUR_YCLOUD_SIGNING_SECRET>
PABBAS_WHATSAPP_INBOUND_SECRET=<YOUR_SHARED_WEBHOOK_SECRET>
N8N_WHATSAPP_INBOUND_WEBHOOK_URL=https://<YOUR_N8N_HOST>/webhook/<YOUR_PABBAS_INBOUND_PATH>
PABBAS_WHATSAPP_FORWARDING_ENABLED=false
```

## 2. Supabase Setup
1. Create a Supabase project and apply the schema verified for that project.
2. Do **not** apply the candidate parity migrations until the target database schema has been compared with the preconditions in the [Rasoi parity rollout guide](./27-rasoi-parity-rollout.md).
3. Keep the existing PubBaz `menu_items` rows and menu seed. The parity migrations do not seed or replace the catalog.

## 3. n8n Setup
1. Start n8n (via Desktop app, Docker, or Cloud).
2. Keep the existing Pabbas order and WhatsApp workflows configured with their Pabbas credentials.
3. To enable durable YCloud forwarding, set `PABBAS_WHATSAPP_FORWARDING_ENABLED=true` only after the inbound URL, shared secret, and inbox migrations are configured. Add a scheduled POST to `/api/internal/ycloud-inbox/drain` using Header Auth with the same shared secret so queued events are retried.

## 4. Running the Next.js Application
Install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

To test on a mobile device across your Local Area Network (LAN):
```bash
npm run dev -- --hostname 0.0.0.0
```
Then access the app on your phone via `http://<YOUR_PC_IP>:3000/dev/whatsapp`.

## 5. Using the WhatsApp Simulator
Navigate to `http://localhost:3000/dev/whatsapp`.
1. Type "Hi" and press Send.
2. Click "View Menu & Order".
3. Place an order.
4. Verify the confirmation message appears in the simulator chat.
