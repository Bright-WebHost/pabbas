# 5. WhatsApp Simulator

The WhatsApp Simulator (`app/dev/whatsapp/page.tsx`) is a vital development tool used to demonstrate and test the "WhatsApp-first" flow without requiring a live Meta Developer account, approved phone numbers, or paid templates.

> **Note:** The simulator is strictly for local development and demo purposes. It is blocked in production.

## Why it Exists
Testing a real WhatsApp flow requires ngrok/tunnels, live webhooks, and strict adherence to Meta's 24-hour session rules. The simulator allows rapid iteration of the core Pabbas logic by mocking the interaction locally.

## How it Works

### 1. Simulated Customer Selection
The UI allows the developer to act as "Customer A" or "Customer B". These are mapped to real UUIDs in the `app_customers` table via a seed script or database state.

### 2. The "Hi" Flow
- The developer types "Hi" and taps Send.
- The UI immediately renders a mock reply from Pabbas containing a "View Menu & Order" button.
- *Note: This initial interaction is purely local React state. No API fetch is made.*

### 3. Secure Session Creation
- When the developer clicks **View Menu & Order**, the simulator makes a `POST` request to `/api/dev/whatsapp/session`.
- The API securely generates a cryptographically random token, hashes it, stores the hash in `ordering_sessions`, and returns the raw token.
- The simulator opens a new tab and navigates to the returned URL (`/auth/whatsapp?token=...`).

### 4. Mobile/LAN Support
To ensure the simulator works when a developer tests it on a mobile phone via a local network IP (`http://192.168.x.x:3000`):
- The session API returns a relative URL to prevent hardcoding `localhost`.
- The `window.open` call bypasses aggressive mobile popup blockers by opening the tab synchronously during the click event, resolving the absolute URL based on the mobile device's actual origin.
- Forms are used for inputs to guarantee reliable native mobile keyboard support.

### 5. Polling for Notifications
Once an order is placed on the website, the database creates an `order_event`. The n8n automation engine processes this event and inserts a mock text message into the `dev_whatsapp_messages` table. 

The Simulator uses a React `useEffect` to poll the `/api/dev/whatsapp/messages` endpoint every 3 seconds, looking for new messages linked to the active customer's Supabase UUID. When found, the confirmation message appears in the chat UI.
