# WhatsApp Add-on Server

This service is the single WhatsApp connection and message-sending engine for both the web and desktop apps. The Next.js app authenticates users and proxies authorized requests here; it does not keep a separate Baileys session.

## Railway configuration

- `API_KEY`: a private secret matching Vercel's `WHATSAPP_ADDON_API_KEY`.
- Keep the existing persistent Railway Volume mount; do not move it while it contains the linked WhatsApp session.
- Set `SESSION_DIR` to a directory inside that volume. Both Mount Path `/data` with `SESSION_DIR=/data/sessions` and Mount Path `/data/sessions` with `SESSION_DIR=/data/sessions` persist the session and idempotency ledger.
- Keep one running replica for the volume-backed idempotency store.

Vercel uses `WHATSAPP_ADDON_URL` and `WHATSAPP_ADDON_API_KEY` to reach this service. Never place either secret in client-side variables or source control.

## Send de-duplication

Every `POST /api/messages/send-text` and `POST /api/messages/send-media` request must include an `Idempotency-Key`. The service persists the key and request fingerprint before sending, then stores the result. Reusing the key with the same payload replays the stored result; reusing it with a different payload returns `409`.

When the service confirms WhatsApp sending never started, the scheduled notification job may retry with the same key, up to three attempts. Once the send call starts, any missing or unsuccessful confirmation is `unknown`: the key stays blocked from resending to avoid duplicates. Baileys does not provide an authoritative lookup proving that an unconfirmed message was not delivered, so unresolved unknown outcomes require review; a 5xx response is not proof of failure.

The key ledger is stored in the persistent `SESSION_DIR` volume. Do not remove or move that volume while requests may be retried.
