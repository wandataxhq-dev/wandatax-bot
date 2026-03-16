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
    const entry = body.entry?.[0]?.changes?.[0]?.value;
    const message = entry?.messages?.[0];
    if (!message) return res.status(200).send('OK');

    const customerNumber = message.from;

    // --- CASE 1: USER TYPES 'PDF' ---
    if (message.type === 'text' && message.text.body.toLowerCase().trim() === 'pdf') {
      const pdfLink = `https://wandatax-bot.vercel.app/api/generate-pdf?phone=${customerNumber}`;
      await sendMsg(customerNumber, `📄 *WandaTax Official Statement*\n\nClick below to download your business report for this month. Use this for bank loans or tax records:\n\n${pdfLink}`);
      return res.status(200).send('OK');
    }

    // --- CASE 2: USER TYPES AN AMOUNT ---
    if (message.type === 'text') {
      let text = message.text.body.toLowerCase();
      if (text.includes('k')) text = text.replace(/(\d+)k/g, (m, p1) => p1 + "000");
      const amount = parseFloat(text.replace(/[^0-9]/g, ''));

      if (!isNaN(amount) && amount > 0) {
        await sendCategoryList(customerNumber, amount);
      }
    }

    // --- CASE 3: USER SELECTS CATEGORY ---
    if (message.type === 'interactive' && message.interactive.type === 'list_reply') {
      const responseId = message.interactive.list_reply.id;
      const [ , category, amountStr] = responseId.split('_');
      const amount = parseFloat(amountStr);
      const tax = amount * 0.05;

      try {
        await supabase.from('weekly_summaries').insert([{
          phone_number: customerNumber,
          turnover: amount,
          tax_amount: tax,
          category: category,
          business_id: "WandaTax"
        }]);

        await sendMsg(customerNumber, `✅ *Record Saved!*\nAmount: ${amount.toLocaleString()} CFA\nCategory: ${category}\n\n_Type "PDF" anytime to download your full statement._`);
      } catch (err) { console.error(err); }
    }

    return res.status(200).send('OK');
  }
}

// --- HELPER FUNCTIONS ---
async function sendMsg(to, text) {
  await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ACCESS_TOKEN.trim()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } })
  });
}

async function sendCategoryList(to, amount) {
  await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ACCESS_TOKEN.trim()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        header: { type: "text", text: "Category Selection" },
        body: { text: `Select the category for ${amount.toLocaleString()} CFA:` },
        action: {
          button: "Select Category",
          sections: [
            { title: "Retail", rows: [{id:`cat_Provision_${amount}`, title:"Boutique"}, {id:`cat_Clothing_${amount}`, title:"Clothing"}] },
            { title: "Food", rows: [{id:`cat_Resto_${amount}`, title:"Restaurant"}, {id:`cat_Bar_${amount}`, title:"Snack-Bar"}] },
            { title: "Services", rows: [{id:`cat_Momo_${amount}`, title:"MoMo/Call Box"}, {id:`cat_Other_${amount}`, title:"Other"}] }
          ]
        }
      }
    })
  });
}
