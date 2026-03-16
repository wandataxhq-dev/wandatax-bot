import { createClient } from '@supabase/supabase-js';

// I have added .trim() to ensure NO spaces mess this up
const ACCESS_TOKEN = "EAAYkJd8MRZBMBQ3Bs3XStEZBgS0sJ8IDztIRp0xGyXcdOZBNihkJRNEdUe6CNoq7A3RxyFBWcJeF2z3xx6ZBqiBIco7kzCetf4EQ7w5S8wqTpaoxdjGhlxR6AgVYVJudTZBMz1ZBqdTJr77a0gFGI9nbh0NGHIfJAKpRSxEactZBQ9BZA6AOukt5LvQNPEl5EZCkQWmaFCcFE0ZAN8ZAQuA79ZB5a47ZAzVZAelnp2EEM1HXvn0brh8zpj5Xjd4Vw03f5qVo8Fpm4YZBGMHes8eGN45RuZBSsJeYQJYZD".trim();
const PHONE_NUMBER_ID = "567083076495287".trim();
const VERIFY_TOKEN = "WandaVerify123";

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
        const customerNumber = message.from;
        const text = message.text.body;
        const amount = parseFloat(text.replace(/[^0-9.]/g, ''));

        if (!isNaN(amount)) {
          const tax = amount * 0.05;

          // Save to Supabase
          await supabase.from('weekly_summaries').insert([
            {
              phone_number: customerNumber,
              turnover: amount,
              tax_amount: tax,
              business_id: "WandaTax"
            }
          ]);

          // Reply via WhatsApp - Using v21.0
          const response = await fetch(
            `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
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
                  body: `✅ *WandaTax Record*\n\nTurnover: ${amount.toLocaleString()} CFA\nTax (5%): ${tax.toLocaleString()} CFA`
                },
              }),
            }
          );

          const result = await response.json();
          console.log("WhatsApp API Response:", JSON.stringify(result, null, 2));
        }
      }
      return res.status(200).json({ status: 'ok' });
    } catch (error) {
      console.error("Internal Error:", error);
      return res.status(200).json({ status: 'ok' });
    }
  }
  res.status(405).end();
}
