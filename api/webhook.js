import { createClient } from '@supabase/supabase-js';

// --- DIRECT HARD-CODED CREDENTIALS ---
const ACCESS_TOKEN = "EAAY9ZCQ1jP9oBOZBZB0ZA0YQvVshG2DAnN8pE58ZBS7ZB7zE6LqB2U9xKZA6O6S37ZAz3pQ3ZC4XvN17904ZBZCQ5MZA4M9A7ZAZC0ZB5yQzZB497nZA1M3VZC7ZA8DpxW6qRkY0Y6ZAfh4tMhG87ZCPD0S0lE9yZA7O8Hic7ZAy5H3fZA8V29ZCZB0uY907PzDREH5UvAizN2PZBZCAZD";
const PHONE_NUMBER_ID = "567083076495287";
const VERIFY_TOKEN = "WandaVerify123";

// Your verified Supabase credentials
const supabaseUrl = 'https://itfwpvjscosvofgocvpx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZndwdmpzY29zdm9mZ29jdnB4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTk1OTI0MSwiZXhwIjoyMDU3NTM1MjQxfQ.mHn_YlA-0q_SAnq2Xw8667iJ00K2Kj81_rD-uM6Ym6s';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).end();
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

      if (message?.type === 'text') {
        const businessNumber = body.entry[0].changes[0].value.metadata.display_phone_number;
        const customerNumber = message.from;
        const text = message.text.body;
        const amount = parseFloat(text);

        if (!isNaN(amount)) {
          const tax = amount * 0.05;

          // 1. Save to Supabase
          await supabase.from('weekly_summaries').insert([
            {
              phone_number: customerNumber,
              turnover: amount,
              tax_amount: tax,
              business_id: businessNumber
            }
          ]);

          // 2. Reply via WhatsApp
          const response = await fetch(
            `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: customerNumber,
                type: "text",
                text: {
                  body: `✅ *WandaTax Record*\n\nTurnover: ${amount.toLocaleString()} CFA\nTax (5%): ${tax.toLocaleString()} CFA\n\n_Data saved to your dashboard._`
                },
              }),
            }
          );

          const result = await response.json();
          console.log("WhatsApp API Response:", result);
        }
      }
      return res.status(200).json({ status: 'ok' });
    } catch (error) {
      console.error("Internal Error:", error);
      return res.status(200).json({ status: 'ok' }); // Always return 200 to Meta
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
