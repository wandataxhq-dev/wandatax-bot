import { createClient } from '@supabase/supabase-js';

const ACCESS_TOKEN = "EAAYkJd8MRZBMBQ34vt7DJgIEITskdtg6FaXHSRKtCbvBIc1j1Yzda9tw8ZAmoTiP1OSZCI9lmcWdn0lOiMw0C5ez2pGN41DTezZCrGP08Ikia6UPRiNJp1xenZCQcxRrHLzMDpLxNkc9jZAi3pEVdyo6ADT9TtzdMMXZAGnBfdZCnGzZAixO4enBZAoYUzX8ikidhZCN36IEwi5TxASHQEGSj4gNDMMs1cheirBEdbP4lCZB8J1OjZAWX4qIvaAgIAjrD6gEZAMtBXbcpMShgV3VfL1Eq5wbRE";
const PHONE_NUMBER_ID = "1071558242701625";

const supabase = createClient('https://itfwpvjscosvofgocvpx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZndwdmpzY29zdm9mZ29jdnB4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTk1OTI0MSwiZXhwIjoyMDU3NTM1MjQxfQ.mHn_YlA-0q_SAnq2Xw8667iJ00K2Kj81_rD-uM6Ym6s');

export default async function handler(req, res) {
  // Only allow Vercel Crons to trigger this, or manual check with a secret
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // 1. Get all unique phone numbers who logged this week
    const { data: users } = await supabase
      .from('weekly_summaries')
      .select('phone_number')
      .gte('created_at', oneWeekAgo.toISOString());

    const uniqueNumbers = [...new Set(users.map(u => u.phone_number))];

    for (const phone of uniqueNumbers) {
      // 2. Fetch data for this specific user
      const { data: records } = await supabase
        .from('weekly_summaries')
        .select('turnover, category')
        .eq('phone_number', phone)
        .gte('created_at', oneWeekAgo.toISOString());

      const totalSales = records.reduce((sum, r) => sum + r.turnover, 0);
      const totalTax = totalSales * 0.05;

      // Group by category
      const catMap = {};
      records.forEach(r => {
        catMap[r.category] = (catMap[r.category] || 0) + r.turnover;
      });

      let catBreakdown = Object.entries(catMap)
        .map(([cat, val]) => `• ${cat}: ${((val / totalSales) * 100).toFixed(0)}%`)
        .join('\n');

      // 3. Construct the Weekly "Nudge" Message
      const message = `📈 *WandaTax Weekly Report*\n\n` +
                      `Total Sales: *${totalSales.toLocaleString()} CFA*\n` +
                      `Tax to Reserve: *${totalTax.toLocaleString()} CFA*\n\n` +
                      `*Sector Performance:*\n${catBreakdown}\n\n` +
                      `Bravo for keeping your records clean this week! 🇨🇲\n` +
                      `Reply with your first sale of the new week to keep going!`;

      // 4. Send the Push
      await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: { body: message }
        })
      });
    }

    return res.status(200).json({ success: true, processed: uniqueNumbers.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
