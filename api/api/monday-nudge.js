// This script sends a personalized goal based on last week's performance
// "Last week you did 150k. Let's aim for 160k! Log your first sale of Monday now."

export default async function handler(req, res) {
  // Logic: 
  // 1. Get user's total from last week.
  // 2. Add 10% to create a "Growth Goal."
  // 3. Send: "Happy Monday! Your goal this week is [Goal] CFA. Type your first sale to start!"
  
  // (The code structure is nearly identical to the weekly-push, just with a different message)
  return res.status(200).send("Monday Nudge Sent");
}
