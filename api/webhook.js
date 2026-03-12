import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  // 1. Handle GET (Meta's Verification Handshake)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Verification failed' });
  }

  // 2. Handle POST (Incoming WhatsApp Messages)
  if (req.method === 'POST') {
    try {
      const body = req.body;
      const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

      if (message && message.type === 'text') {
        const from = message.from; 
        const text = message.text.body.trim();

        // If the message is just a number, log the weekly sale
        if (!isNaN(text)) {
          const amount = parseFloat(text);
          
          const { error } = await supabase
            .from('weekly_summaries')
            .insert([{ 
              merchant_phone: from, 
              total_turnover: amount 
            }]);

          if (error) console.error('Supabase Error:', error);
        }
      }
      return res.status(200).json({ status: 'ok' });
    } catch (err) {
      console.error('Webhook Error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
