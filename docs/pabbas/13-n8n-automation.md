# 13. n8n Automation

**n8n** is the automation and orchestration engine for Pabbas. It bridges
Pabbas events and external systems such as WhatsApp.

## Durable YCloud Inbox

The YCloud route verifies the provider signature and stores supported inbound
events in `ycloud_event_inbox` before returning. Unique provider event IDs and
lease-based claims allow transient n8n or network failures to be retried
without accepting the same event twice.

The active Pabbas n8n entry points are:

- `/webhook/pabbas-whatsapp-inbound` for forwarded YCloud inbound messages.
- `/webhook/pabbas-order-created` for non-dine-in order notifications.
- `/webhook/pabbas-status` for staff status updates.

The older `pabbas-order-event`, `claim_order_event`, `complete_order_event`,
and `fail_order_event` design is historical and is not the current Pabbas
inbox architecture. Do not configure new workflows around those RPCs.

YCloud status callbacks are not part of this rollout because Rasoi production
does not currently subscribe to them. Add them only after that subscription
and end-to-end handling are verified.

## Configuration

Enable forwarding only after the matching Pabbas inbox migrations and n8n
endpoint are ready:

- Set `N8N_WHATSAPP_INBOUND_WEBHOOK_URL` and
  `PABBAS_WHATSAPP_INBOUND_SECRET` in the deployment environment. Forwarding
  is enabled when these values are present unless
  `PABBAS_WHATSAPP_FORWARDING_ENABLED=false` is set explicitly.
- Configure a scheduled POST to `/api/internal/ycloud-inbox/drain` with Header
  Auth using that same Pabbas secret. The webhook also attempts a short
  post-response drain; the schedule is the retry path for claimed events.
- Keep secrets in environment variables or n8n credentials; do not put them in
  workflow exports.

The rollout sequence and required Supabase migrations are documented in
[`27-rasoi-parity-rollout.md`](./27-rasoi-parity-rollout.md).
