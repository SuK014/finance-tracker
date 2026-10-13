export const SLIP_PROMPT = `You are reading a Thai bank transfer slip (e-slip).
Extract the following fields and return ONLY valid JSON, nothing else:
{
  "amount": <number or null>,
  "type": "income" or "expense" or null,
  "date": "<ISO 8601 datetime string or null>",
  "description": "<sender/receiver name or note, or null>"
}
Rules:
- amount: the transferred amount as a number (no currency symbol)
- type: "income" if money is received, "expense" if money is sent — if unclear, return null
- date: combine date + time from the slip into ISO format (e.g. "2026-07-26T14:30:00")
- description: use the sender/receiver name or any memo/note on the slip`
