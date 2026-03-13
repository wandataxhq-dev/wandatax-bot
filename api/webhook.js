import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  // 1. Handle Meta's Verification (The Handshake)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token === 'WandaVerify123') {
      return res.status(200).send(challenge);
    } else {
      return res.status(403).end();
    }
  }

  // 2. Handle Incoming WhatsApp Messages
  if (req.method === 'POST') {
    try {
      const body = req.body;
      const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

      if (message?.type === 'text') {
        const senderPhone = message.from;
        const text = message.text.body;

        // Extract numbers only (e.g., "35000" from "I made 35000")
        const amount = parseFloat(text.replace(/[^0-9.]/g, ''));

        if (!isNaN(amount)) {
          const tax = amount * 0.05; // 5% Calculation

          // Save to Supabase
          await supabase.from('weekly_summaries').insert([
            { total_turnover: amount, tax_due: tax, merchant_phone: senderPhone, raw_text: text }
          ]);

          // Send WhatsApp Reply
          await fetch(`https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: senderPhone,
              type: "text",
              text: { body: `✅ *WandaTax Record*\n\nTurnover: ${amount} CFA\nTax (5%): ${tax} CFA\n\nSaved to your dashboard!` }
            }),
          });
        }
      }
      return res.status(200).json({ status: 'ok' });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
