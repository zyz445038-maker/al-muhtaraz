# WhatsApp Add-on Server

This service is the single WhatsApp connection and message-sending engine for both the web and desktop apps. The Next.js app authenticates users and proxies authorized requests here; it does not keep a separate Baileys session.

## Railway configuration

- `API_KEY`: a private secret matching Vercel's `WHATSAPP_ADDON_API_KEY`.
- Mount a persistent Railway Volume at `/data`.
- Set `SESSION_DIR=/data/sessions` so both Baileys credentials and send-idempotency records survive restarts.
- Keep one running replica for the volume-backed idempotency store.

Vercel uses `WHATSAPP_ADDON_URL` and `WHATSAPP_ADDON_API_KEY` to reach this service. Never place either secret in client-side variables or source control.

## Send de-duplication

Every `POST /api/messages/send-text` and `POST /api/messages/send-media` request must include an `Idempotency-Key`. The service persists the key and request fingerprint before sending, then stores the result. Reusing the key with the same payload replays the stored result; reusing it with a different payload returns `409`. A pending key is never sent again, since a connection failure can leave delivery uncertain.

The key ledger is stored in the persistent `SESSION_DIR` volume. Do not remove that volume while requests may be retried.
