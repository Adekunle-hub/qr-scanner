// Sends Meta's "hello_world" template to a phone number to prove the token and phone number id work.
// Usage: npm run send-test -- 2348012345678   (country code, no + or spaces)
const to = process.argv[2];
if (!to) {
  console.error('Usage: npm run send-test -- <your phone number with country code, e.g. 2348012345678>');
  process.exit(1);
}

const { WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, GRAPH_API_VERSION = 'v23.0' } = process.env;
if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
  console.error('WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID must be set in .env');
  process.exit(1);
}

const response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: { name: 'hello_world', language: { code: 'en_US' } },
  }),
});
const data = await response.json();
console.log(response.ok ? 'Sent! Check your WhatsApp.' : 'Meta returned an error:', JSON.stringify(data, null, 2));
process.exitCode = response.ok ? 0 : 1;
