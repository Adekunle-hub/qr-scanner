# WhatsApp QR bot

Send it a link → it replies with a QR code. Send it a photo of a QR code → it replies with the text inside.

## Layout

| File | Job |
|---|---|
| `src/webhook/webhook.controller.ts` | `GET /webhook` (Meta verification) and `POST /webhook` (incoming messages, answers 200 at once) |
| `src/webhook/signature.ts` | Checks `X-Hub-Signature-256` with your app secret |
| `src/whatsapp/whatsapp.service.ts` | `sendText`, `sendImage`, `uploadMedia`, `downloadMedia` against the Graph API |
| `src/qr/qr.service.ts` | `encode` (qrcode) and `decode` (sharp + jsQR, several clean-up passes for blurry photos) |
| `src/bot/bot.service.ts` | Routing: text link → QR image, image → decoded text, anything else → help; drops duplicate deliveries |

## Run locally

1. `cp .env.example .env` and fill in the values from the Meta dashboard (WhatsApp → API Setup, and App settings → Basic for the app secret).
2. `npm install`
3. `npm run start:dev`
4. In another terminal: `ngrok http 3000`
5. Meta dashboard → WhatsApp → Configuration → Webhook: callback URL `https://<ngrok-id>.ngrok-free.app/webhook`, verify token = your `WEBHOOK_VERIFY_TOKEN`. Then subscribe to the `messages` field.
6. Add your phone as a test recipient and message the test number.

Test cases: `https://example.com`, `example.com`, a clear QR screenshot, a blurry photo, a non-QR picture, a voice note (should get the help text).

## Deploy

Any Node host with HTTPS (Railway, Render, a VPS). Set the same env vars there, run `npm run build && npm start`, and point the Meta webhook at the new URL. For production, swap `WHATSAPP_TOKEN` for a System User token and `WHATSAPP_PHONE_NUMBER_ID` for your verified number's id.
