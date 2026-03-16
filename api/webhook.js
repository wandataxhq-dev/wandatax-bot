import { createClient } from '@supabase/supabase-js';

const ACCESS_TOKEN = "EAAYkJd8MRZBMBQ34vt7DJgIEITskdtg6FaXHSRKtCbvBIc1j1Yzda9tw8ZAmoTiP1OSZCI9lmcWdn0lOiMw0C5ez2pGN41DTezZCrGP08Ikia6UPRiNJp1xenZCQcxRrHLzMDpLxNkc9jZAi3pEVdyo6ADT9TtzdMMXZAGnBfdZCnGzZAixO4enBZAoYUzX8ikidhZCN36IEwi5TxASHQEGSj4gNDMMs1cheirBEdbP4lCZB8J1OjZAWX4qIvaAgIAjrD6gEZAMtBXbcpMShgV3VfL1Eq5wbRE";
const PHONE_NUMBER_ID = "1071558242701625"; 
const VERIFY_TOKEN = "WandaVerify123";

const supabase = createClient('https://itfwpvjscosvofgocvpx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZndwdmpzY29zdm9mZ29jdnB4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTk1OTI0MSwiZXhwIjoyMDU3NTM1MjQxfQ.mHn_YlA-0q_SAnq2Xw8667iJ00K2Kj81_rD-uM6Ym6s');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (token === VERIFY_TOKEN) return res.status(200).send(challenge);
    return res.status(403).end();
  }

  if (req.method === 'POST') {
    const body = req.body;
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    
    if (!message || message.type !== 'text') return res.status(200).send('OK');

    const customerNumber = message.from; // e.g., "237670791352"
    const amount = parseFloat(message.text.body.replace(/[^0-9.]/g, ''));

    if (!isNaN(amount)) {
      const tax = amount * 0.05;
      const responseText = `✅ *WandaTax Record*\n\nTurnover: ${amount.toLocaleString()} CFA\nTax (5%): ${tax.toLocaleString()} CFA`;

      try {
        // 1. Save to Supabase
        await supabase.from('weekly_summaries').insert([{
          phone_number: customerNumber,
          turnover: amount,
          tax_amount: tax,
          business_id: "WandaTax"
        }]);

        // 2. Define the two formats
        const formats = [
          customerNumber,             // Format 1: "2376..."
          `+${customerNumber}`        // Format 2: "+2376..."
        ];

        console.log(`Attempting replies for ${customerNumber}...`);

        // 3. Try both formats until one works
        for (const targetNumber of formats) {
          const metaResponse = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${ACCESS_TOKEN.trim()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: targetNumber,
              type: "text",
              text: { body: responseText }
            })
          });

          const result = await metaResponse.json();
          
          if (result.error) {
            console.log(`Format ${targetNumber} failed: ${result.error.message}`);
          } else {
            console.log(`Format ${targetNumber} SUCCEEDED!`);
            break; // Stop if one format works
          }
        }

      } catch (err) {
        console.error("System Error:", err.message);
      }
    }
    return res.status(200).send('OK');
  }
}
