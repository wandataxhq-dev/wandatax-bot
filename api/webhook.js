import { createClient } from '@supabase/supabase-js';

const ACCESS_TOKEN = "EAAYkJd8MRZBMBQ3Bs3XStEZBgS0sJ8IDztIRp0xGyXcdOZBNihkJRNEdUe6CNoq7A3RxyFBWcJeF2z3xx6ZBqiBIco7kzCetf4EQ7w5S8wqTpaoxdjGhlxR6AgVYVJudTZBMz1ZBqdTJr77a0gFGI9nbh0NGHIfJAKpRSxEactZBQ9BZA6AOukt5LvQNPEl5EZCkQWmaFCcFE0ZAN8ZAQuA79ZB5a47ZAzVZAelnp2EEM1HXvn0brh8zpj5Xjd4Vw03f5qVo8Fpm4YZBGMHes8eGN45RuZBSsJeYQJYZD";
const PHONE_NUMBER_ID = "1071558242701625";
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
        const amount = parseFloat(message.text.body.replace(/[^0-9.]/g, ''));

        if (!isNaN(amount)) {
          const tax = amount * 0.05;

          // 1. Supabase Logic (Already working)
          await supabase.from('weekly_summaries').insert([
            {
              phone_number: customerNumber,
              turnover: amount,
              tax_amount: tax,
              business_id: "WandaTax"
            }
          ]);

          // 2. WhatsApp Reply Logic - Explicitly formatted
          const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;
          
          const whatsappRequest = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${ACCESS_TOKEN.trim()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: customerNumber,
              type: "text",
              text: {
                body: `✅ *WandaTax Record*\n\nTurnover: ${amount.toLocaleString()} CFA\nTax (5%): ${tax.toLocaleString()} CFA`
              }
            })
          });

          const result = await whatsappRequest.json();
          console.log("Meta API Detail:", result);
        }
      }
      return res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      console.error("Critical Error:", error);
      return res.status(200).send('EVENT_RECEIVED');
    }
  }
  return res.status(405).end();
}
