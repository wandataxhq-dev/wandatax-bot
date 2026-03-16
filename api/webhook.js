import { createClient } from '@supabase/supabase-js';

// --- NEWEST TOKEN UPDATED ---
const ACCESS_TOKEN = "EAAYkJd8MRZBMBQ34vt7DJgIEITskdtg6FaXHSRKtCbvBIc1j1Yzda9tw8ZAmoTiP1OSZCI9lmcWdn0lOiMw0C5ez2pGN41DTezZCrGP08Ikia6UPRiNJp1xenZCQcxRrHLzMDpLxNkc9jZAi3pEVdyo6ADT9TtzdMMXZAGnBfdZCnGzZAixO4enBZAoYUzX8ikidhZCN36IEwi5TxASHQEGSj4gNDMMs1cheirBEdbP4lCZB8J1OjZAWX4qIvaAgIAjrD6gEZAMtBXbcpMShgV3VfL1Eq5wbRE";
const PHONE_NUMBER_ID = "1071558242701625"; 
const VERIFY_TOKEN = "WandaVerify123";

const supabase = createClient('https://itfwpvjscosvofgocvpx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZndwdmpzY29zdm9mZ29jdnB4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTk1OTI0MSwiZXhwIjoyMDU3NTM1MjQxfQ.mHn_YlA-0q_SAnq2Xw8667iJ00K2Kj81_rD-uM6Ym6s');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) return res.status(200).send(challenge);
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

          // 1. Supabase Record
          await supabase.from('weekly_summaries').insert([{
              phone_number: customerNumber,
              turnover: amount,
              tax_amount: tax,
              business_id: "WandaTax"
          }]);

          // 2. WhatsApp Reply - Force Sandbox format
          const response = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${ACCESS_TOKEN.trim()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: customerNumber, // Sandbox often prefers no '+' here
              type: "text",
              text: { body: `✅ *WandaTax Record*\nTurnover: ${amount.toLocaleString()} CFA\nTax: ${tax.toLocaleString()} CFA` }
            })
          });

          const result = await response.json();
          console.log("Log: Replying to", customerNumber, "Result:", JSON.stringify(result));
        }
      }
      return res.status(200).send('OK');
    } catch (e) {
      return res.status(200).send('OK');
    }
  }
}
